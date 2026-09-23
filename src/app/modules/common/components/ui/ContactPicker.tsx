import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Autocomplete, Avatar, Box, Chip, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { getAllClientContacts, getClientContactById } from '@services/companies';
import { SkeletonList } from '@app/modules/common/components/Skeleton';
import { menuOptionSx } from './patterns';
import { AppIcon } from './AppIcon';
import { contactLabel, missingEmailNotice } from './contactLabel';
import { useDropdownBoundary } from './dropdownBoundary';
import { InlineNotice } from './InlineNotice';
import { WtTooltip } from './WtTooltip';
import { TRIO } from './tw/tokens';

/**
 * Pick CRM contacts out of an address book too big to load.
 *
 * ─── WHY THIS IS SHARED AND NOT A FIELD INSIDE A FORM ────────────────────────────────
 * "Choose some contacts" is asked by the meeting form, and will be asked by the next screen
 * that needs an outside guest. It had been answered twice already in one file — a roster picker
 * fed from a project and a global search — which is how the same question came to have two
 * behaviours on two tabs of one dialog. The searching, the paging, the chip resolution and the
 * label are one thing here, so a screen consumes it rather than rebuilding three quarters of it.
 *
 * ─── THE SERVER SEARCHES; THIS DOES NOT RE-FILTER IT ─────────────────────────────────
 * Six thousand rows cannot be shipped to filter in the browser, so the term goes to the API and
 * comes back as a page. `filterOptions` is therefore the identity for those rows: matching again
 * here would DROP contacts the server found by phone number, email or service, none of which is
 * in the label a client-side filter can see.
 *
 * `extraOptions` is the exception and IS filtered locally. Those rows (a project's own roster)
 * never went through the search, so leaving them unfiltered pinned a stale block to the top of
 * every result — you typed a name, the first rows did not change, and the search read as broken.
 *
 * ─── THE COUNT IS THE SEARCH'S COUNT ─────────────────────────────────────────────────
 * "25 of 1,059" is read as "there are 1,059 of these", so it has to mean the CURRENT term and
 * not the whole table. The API computes `total` over the same `where` as the rows, so this
 * passes it straight through; the thing to not do is keep showing an earlier one.
 */

export interface ContactOption {
    value: string;
    label: string;
    /**
     * The bare full name, without the company in brackets.
     *
     * The label reads "Manish (A2O Realty)", which is right on a row and wrong in a sentence —
     * the missing-email notice below names people, and a list of labels there is mostly
     * parentheses. Falls back to the label when a caller does not supply it.
     */
    name?: string;
    caption?: string;
    avatar?: string | null;
    /**
     * Whether this contact has an email address. UNDEFINED means NOT KNOWN, which is not the
     * same as `false`: a caller whose own source does not carry the column must not have its
     * rows flagged as unreachable on the strength of a field it never fetched.
     */
    hasEmail?: boolean;
}

/** One page. 25 fills the dropdown twice over and keeps the payload small. */
const PAGE_SIZE = 25;

/** A request per keystroke on a six-letter name is five wasted round trips. */
const DEBOUNCE_MS = 250;

export const toContactOption = (c: any): ContactOption => ({
    value: c.id,
    // Name AND company — the company is what tells nine people called Manish apart, and it is
    // what the search can now be narrowed by. See `contactLabel`.
    label: contactLabel(c),
    name: c.fullName || undefined,
    // KNOWN either way here: the API's light projection selects `email`, so an absent one is
    // an absence on the record rather than a column this caller did not ask for.
    hasEmail: !!c.email,
    avatar: c.profilePhoto ?? null,
    // The number and the email: how somebody confirms the right row once the company has got
    // them close.
    caption: [c.phone, c.email].filter(Boolean).join('  ·  ') || undefined,
});

const fetchPage = async (query: string, page: number) => {
    const res: any = await getAllClientContacts({
        search: query.trim() || undefined,
        pageSize: PAGE_SIZE,
        page,
        // The endpoint's default is newest-first, which is right for a table of recent activity
        // and wrong for a list somebody is scanning for a name they already know.
        sortBy: 'fullName',
        sortOrder: 'asc',
    }, true);
    const body = res?.data ?? res ?? {};
    return {
        rows: (body.contacts ?? []).map(toContactOption) as ContactOption[],
        total: Number(body.total ?? 0),
    };
};

export interface ContactPickerProps {
    /** Contact ids. The single source of truth — the chips are resolved from it. */
    value: string[];
    onChange: (ids: string[]) => void;
    label: string;
    required?: boolean;
    error?: boolean;
    /** Replaces the row count. A count is not worth saying over an error. */
    helperText?: string;
    placeholder?: string;
    /**
     * Rows to offer ABOVE the search results — a project's own stakeholders, say. Filtered
     * locally on the label, because they never went through the server's search.
     */
    extraOptions?: ContactOption[];
    /** Anything else still loading, so the skeleton covers it too. */
    loading?: boolean;
    disabled?: boolean;
}

export function ContactPicker({
    value, onChange, label, required = false, error = false, helperText,
    placeholder = 'Search by name, company, number or email',
    extraOptions, loading = false, disabled = false,
}: ContactPickerProps) {
    const theme = useTheme();
    /**
     * The list stays inside whatever sheet this picker is dropped into.
     *
     * Self-contained rather than a prop, so a consumer gets it without knowing to ask: the ref
     * goes on the Autocomplete's own root and finds the scroll port by walking up. MUI portals
     * the list to `document.body`, and its default boundary is the viewport — which is how a
     * dropdown ends up floating over a modal's header with its field scrolled out of sight.
     */
    const dropdown = useDropdownBoundary();
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState<ContactOption[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [busy, setBusy] = useState(false);

    /**
     * Every option this picker has ever been able to name, by id.
     *
     * The chips must outlive the search that found them: `rows` is whatever the last term
     * returned, so picking Manish and then searching "Priya" would otherwise leave a chip MUI
     * cannot render. A ref rather than state because it is a cache read during render, with one
     * counter below to say when it has actually gained something worth re-rendering for.
     */
    const known = useRef(new Map<string, ContactOption>());
    const [resolved, setResolved] = useState(0);

    const remember = useCallback((list: ContactOption[]) => {
        let added = false;
        for (const o of list) {
            if (known.current.get(o.value)?.label !== o.label) {
                known.current.set(o.value, o);
                added = true;
            }
        }
        if (added) setResolved((n) => n + 1);
    }, []);

    /**
     * A caller that passes no roster passes no array either, rather than a fresh `[]` every
     * render — which would re-run every effect below on each keystroke of the form around it.
     */
    const extras = useMemo(() => extraOptions ?? [], [extraOptions]);
    useEffect(() => { remember(extras); }, [extras, remember]);

    /** First page, on mount and on every change of the term. */
    useEffect(() => {
        let cancelled = false;
        setBusy(true);
        const timer = setTimeout(async () => {
            try {
                const res = await fetchPage(query, 1);
                if (cancelled) return;
                remember(res.rows);
                setRows(res.rows);
                setTotal(res.total);
                setPage(1);
            } catch {
                if (!cancelled) { setRows([]); setTotal(0); }
            } finally {
                if (!cancelled) setBusy(false);
            }
        }, DEBOUNCE_MS);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [query, remember]);

    /**
     * Names for ids that arrived already selected — a record being edited.
     *
     * BY ID, one call each. The first version asked for a page of the address book and filtered
     * it for these ids, which on a list sorted A-Z across thousands of rows would almost never
     * contain them. Only ids nothing already names, so a project's roster costs no requests.
     */
    useEffect(() => {
        const missing = value.filter((id) => !known.current.has(id));
        if (!missing.length) return;
        let cancelled = false;
        void (async () => {
            const found = await Promise.all(missing.map(async (id) => {
                try {
                    const res: any = await getClientContactById(id);
                    const c = res?.data?.contact ?? res?.contact ?? null;
                    return c ? toContactOption(c) : null;
                } catch {
                    // A contact since deleted. Its id is still on the record, so it keeps its
                    // place as a chip rather than vanishing without explanation.
                    return { value: id, label: 'Contact no longer in the CRM' } as ContactOption;
                }
            }));
            if (cancelled) return;
            remember(found.filter((f): f is ContactOption => !!f));
        })();
        return () => { cancelled = true; };
        // `resolved` re-runs this once the roster has been remembered, so a roster member is
        // never fetched by id just because the effect happened to run first.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value.join(','), resolved, remember]);

    const loadMore = async () => {
        if (busy || rows.length >= total) return;
        const next = page + 1;
        setBusy(true);
        try {
            const res = await fetchPage(query, next);
            remember(res.rows);
            setRows((prev) => {
                // De-duplicated on append: a contact created between two page requests shifts
                // every later row, which otherwise shows one of them twice.
                const seen = new Set(prev.map((o) => o.value));
                return [...prev, ...res.rows.filter((r) => !seen.has(r.value))];
            });
            setTotal(res.total);
            setPage(next);
        } catch {
            /* Leave what is already listed; the next scroll tries again. */
        } finally {
            setBusy(false);
        }
    };

    /** The chips. One per picked id, in the order they were picked. */
    const picked: ContactOption[] = useMemo(
        // `resolved` is the dependency that matters — `known` is a ref, so nothing else tells
        // React that an id has just acquired a name.
        () => value.map((id) => known.current.get(id) ?? { value: id, label: 'Loading…' }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [value, resolved],
    );

    const options: ContactOption[] = useMemo(() => {
        const term = query.trim().toLowerCase();
        const offered = term
            ? extras.filter((o) => o.label.toLowerCase().includes(term))
            : extras;
        const seen = new Set<string>();
        return [...picked, ...offered, ...rows]
            .filter((o) => !seen.has(o.value) && seen.add(o.value));
    }, [picked, extras, rows, query]);

    /**
     * How much of the list you are looking at, FOR THE CURRENT TERM.
     *
     * Without it a dropdown that stops at 25 of 6,266 looks like the whole address book, and
     * somebody concludes their contact is not in the CRM.
     */
    const countText = rows.length === 0
        ? (query.trim() && !busy ? 'No contact matches' : ' ')
        : rows.length >= total
            ? `${total} contact${total === 1 ? '' : 's'}`
            : `${rows.length} of ${total} — scroll for more`;

    /**
     * The picked guests we KNOW cannot be emailed.
     *
     * `=== false` deliberately: `undefined` is "not known", which is what a caller whose own
     * source does not carry the column supplies. Flagging those would tell somebody their
     * contact is unreachable on the strength of a field nobody fetched.
     */
    const unreachable = picked.filter((o) => o.hasEmail === false);

    return (
        <Box>
            <Autocomplete
                ref={dropdown.ref}
                slotProps={dropdown.slotProps}
                multiple size="small" fullWidth disableCloseOnSelect disabled={disabled}
                options={options}
                value={picked}
                onChange={(_, next) => {
                    remember(next as ContactOption[]);
                    onChange((next as ContactOption[]).map((o) => o.value));
                }}
                inputValue={query}
                onInputChange={(_, v, reason) => {
                    // `reset` fires when a chip is picked, and letting it through would wipe the
                    // term the person is still narrowing with. Only what was typed counts.
                    if (reason === 'input') setQuery(v);
                    else if (reason === 'clear') setQuery('');
                }}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(o, v) => o.value === v.value}
                filterOptions={(x) => x}
                loading={busy || loading}
                // The skeleton stands in for the rows about to arrive, rather than a spinner that
                // says only "something is happening".
                loadingText={<SkeletonList items={5} showAvatar />}
                noOptionsText={query.trim() ? 'No contact matches' : 'Type a name, company, number or email'}
                ListboxProps={{
                    sx: menuOptionSx,
                    /*
                     * Load the next page as the list nears its end, instead of fetching six thousand
                     * rows to fill a box that shows seven. 120px of runway so the rows are there by
                     * the time the scroll reaches them, rather than after a visible stall.
                     */
                    onScroll: (e: React.SyntheticEvent) => {
                        const el = e.currentTarget as HTMLElement;
                        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) void loadMore();
                    },
                }}
                renderTags={(chips, getTagProps) => chips.map((o, i) => {
                    const unreachable = o.hasEmail === false;
                    return (
                        /*
                         * A guest with no email is marked ON THE CHIP, not only in the line below.
                         * The chip is what the eye is on while picking, and it is the only place
                         * that says WHICH of five names is the problem one — the notice names them
                         * too, but a glance at the row should be enough.
                         *
                         * Red and outlined, plus a glyph: colour alone is not a signal everybody
                         * receives, and these chips already come in one colour.
                         */
                        <WtTooltip
                            key={o.value}
                            title={unreachable
                                ? `${o.name || o.label} has no email address on file. The invitation will not reach them.`
                                : ''}
                        >
                            <Chip
                                {...getTagProps({ index: i })}
                                key={o.value}
                                size="small"
                                color={unreachable ? 'error' : 'default'}
                                variant={unreachable ? 'outlined' : 'filled'}
                                label={unreachable ? (
                                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                                        <AppIcon name="warning" className="fs-8" />
                                        {o.label}
                                    </Box>
                                ) : o.label}
                                avatar={(
                                    <Avatar src={o.avatar || undefined} sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 700 }}>
                                        {o.label.charAt(0).toUpperCase()}
                                    </Avatar>
                                )}
                            />
                        </WtTooltip>
                    );
                })}
                renderOption={(props, o) => (
                    <Box component="li" {...props} key={o.value} sx={{ gap: 1.25 }}>
                        <Avatar
                            src={o.avatar || undefined}
                            sx={{
                                width: 26, height: 26, fontSize: 11, fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                                color: 'primary.main',
                            }}
                        >
                            {o.label.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap>{o.label}</Typography>
                            {o.caption && (
                                <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }} noWrap>{o.caption}</Typography>
                            )}
                        </Box>
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={label}
                        required={required}
                        error={error}
                        placeholder={picked.length ? '' : placeholder}
                        helperText={helperText || countText}
                    />
                )}
            />
            {/* Under the field, because the chips can only carry a marker and this carries the
                consequence: the meeting saves, the toggle says the invitation went, and the one
                person who most needed telling never hears. There is no bounce to notice later —
                the recipient list is built from whoever HAS an address. */}
            {unreachable.length > 0 && (
                <InlineNotice trio={TRIO.rose} icon="warning">
                    {missingEmailNotice(unreachable.map((o) => o.name || o.label))}
                </InlineNotice>
            )}
        </Box>
    );
}
