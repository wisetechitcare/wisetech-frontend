import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Avatar, Box, Checkbox, CircularProgress, Collapse, LinearProgress,
    Stack, TextField, Typography,
} from '@mui/material';
import { KTIcon } from '@metronic/helpers';
import {
    GlassDialog, GlassHeader, WtButton, ToneChip, InlineNotice, WtEmptyState,
    SegmentedControl, toneAlpha, TRIO, disclosureSx, DISCLOSURE,
} from '@app/modules/common/components/ui';
import { tonePair, type SemanticTone } from '@app/theme/tokens';
import { formatMaybeDate } from '@utils/dateFormats';
import { fetchGoogleContacts, importGoogleContacts, startGoogleContactsAuth } from '@services/googleContacts';
import { toContactCreatePayload, type GoogleContactCandidate } from './googleContactPrefill';

/**
 * Pick contacts out of the admin's own Google account.
 *
 * ─── BUILT ON THE LEGACY-MIGRATION SCREEN'S VOCABULARY, ON PURPOSE ───────────────────
 * `leads/lead/legacy-migration/MatchReviewTable` already answers this exact question for
 * leads — "here are rows from somewhere else, here is what each one collides with, decide" —
 * and it has been through the argument about how to present it. Same accent bar in the
 * verdict's tone, same tagged identity lines so neither side of a comparison is implicit,
 * same filter track, same label/value column rule. A second visual language for the same idea
 * would mean whoever learns one screen learns nothing about the other.
 *
 * ─── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────────────
 * It never sees a token, and the raw People API payload never reaches the browser. It also
 * does not reset when hidden: reviewing one contact in the contact form hides this dialog, and
 * cancelling that form brings it back untouched. Resetting on `open === false` meant a
 * cancelled review cost a fresh Google authorization, for a misclick.
 */

type Phase = 'idle' | 'connecting' | 'loading' | 'ready' | 'error';
type Filter = 'all' | 'new' | 'same_number' | 'same_email' | 'same_name';

/**
 * Every label names the EVIDENCE, not a conclusion.
 *
 * These used to read New / Possible duplicate / Same name / Already in CRM — two of them
 * naming what was matched on, one naming an outcome, one naming a guess. So "Possible
 * duplicate" gave the reader nothing to check: possible on what basis? And "Already in CRM"
 * hid the fact that it IS the same-number filter, which made it look as though matching by
 * number was missing altogether.
 *
 * Saying what matched lets someone decide for themselves. Whether a row can be imported is
 * already carried by the checkbox being disabled and by the collision panel underneath it —
 * it does not need to be said twice, in the one place a label could instead be useful.
 */
const VERDICT: Record<GoogleContactCandidate['verdict'], { label: string; tone: SemanticTone; blurb: string }> = {
    NEW: {
        label: 'New',
        tone: 'success',
        blurb: 'No contact in the CRM shares this number, email or name.',
    },
    LIKELY: {
        label: 'Same email',
        tone: 'warning',
        blurb: 'The email address already belongs to a CRM contact, but the number differs. Shared family and team addresses are real, so this is yours to judge.',
    },
    POSSIBLE: {
        label: 'Same name',
        tone: 'cyan',
        blurb: 'A CRM contact has this name and no matching number or email. Two people genuinely share a name often enough that this never blocks an import.',
    },
    EXACT: {
        label: 'Same number',
        tone: 'danger',
        blurb: 'The phone number already belongs to a CRM contact, compared digits-only so formatting cannot hide a match. These cannot be imported again.',
    },
};

const FILTERS: Array<{ value: Filter; label: string; blurb?: string; match: (c: GoogleContactCandidate) => boolean }> = [
    { value: 'all', label: 'Everything', match: () => true },
    { value: 'new', label: VERDICT.NEW.label, blurb: VERDICT.NEW.blurb, match: (c) => c.verdict === 'NEW' },
    { value: 'same_number', label: VERDICT.EXACT.label, blurb: VERDICT.EXACT.blurb, match: (c) => c.verdict === 'EXACT' },
    { value: 'same_email', label: VERDICT.LIKELY.label, blurb: VERDICT.LIKELY.blurb, match: (c) => c.verdict === 'LIKELY' },
    { value: 'same_name', label: VERDICT.POSSIBLE.label, blurb: VERDICT.POSSIBLE.blurb, match: (c) => c.verdict === 'POSSIBLE' },
];

/** Stable identity for a row. `resourceName` is unique per Google contact. */
const keyOf = (c: GoogleContactCandidate) => c.googleResourceId ?? c.displayLabel;

const initialsOf = (label: string) =>
    label.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';

/**
 * The label column, shared by every line that has one, so values start on the same x.
 *
 * "Align phone number, name and email properly" is this constant. Without it each line sets
 * its own indent and the column of values zig-zags down the card.
 */
const COL_LABEL = { xs: 78, sm: 104 };

/** Every field the import would write, in the order a person reads a contact. */
const FIELD_ORDER: Array<[keyof GoogleContactCandidate['fields'], string]> = [
    ['phone', 'Phone'],
    ['phone2', 'Alt phone'],
    ['email', 'Email'],
    ['roleInCompany', 'Designation'],
    ['address', 'Address'],
    ['area', 'Area'],
    ['city', 'City'],
    ['state', 'State'],
    ['country', 'Country'],
    ['zipCode', 'Postal code'],
    ['gender', 'Gender'],
    ['dateOfBirth', 'Date of birth'],
    ['anniversary', 'Anniversary'],
    ['note', 'Note'],
];

const DATE_FIELDS = new Set(['dateOfBirth', 'anniversary']);

/** "a, b and c" — a list a person would say aloud. Mirrors the migration screen's own helper. */
const listSentence = (parts: string[]): string =>
    parts.length <= 1 ? parts[0] ?? '' : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;

/** One label/value pair, on the shared column. */
function FieldLine({ label, value, tone }: { label: string; value: string; tone?: SemanticTone }) {
    return (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 1.5 }} alignItems={{ sm: 'baseline' }}>
            <Typography sx={{
                fontSize: 11.5, fontWeight: 700, color: 'text.secondary',
                width: COL_LABEL, flex: 'none',
            }}>
                {label}
            </Typography>
            <Typography sx={{
                fontSize: 13, minWidth: 0, flex: 1, wordBreak: 'break-word',
                fontWeight: tone ? 700 : 500,
                color: tone ? tonePair(tone).fg : 'text.primary',
                fontVariantNumeric: 'tabular-nums',
            }}>
                {value}
            </Typography>
        </Stack>
    );
}

/** One side of a comparison, with the side it came from named on it. */
function IdentityLine({ tag, tone, name, details }: {
    tag: string; tone: SemanticTone; name: string; details: string;
}) {
    const fg = tonePair(tone).fg;
    return (
        <Stack direction="row" spacing={1.5} alignItems="baseline" sx={{ minWidth: 0 }}>
            <Box sx={{
                flex: 'none', width: COL_LABEL, textAlign: 'center', borderRadius: '4px',
                fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase',
                lineHeight: 1.8, bgcolor: toneAlpha(fg, 0.12), color: fg,
            }}>
                {tag}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }} noWrap>{name}</Typography>
                {details && (
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }} noWrap>
                        {details}
                    </Typography>
                )}
            </Box>
        </Stack>
    );
}

function ContactCard({ candidate, checked, onToggle, onReview }: {
    candidate: GoogleContactCandidate;
    checked: boolean;
    onToggle: () => void;
    onReview: () => void;
}) {
    const [open, setOpen] = useState(false);
    const v = VERDICT[candidate.verdict];
    const accent = tonePair(v.tone).fg;
    const f = candidate.fields;

    const brings = FIELD_ORDER
        .map(([key, label]) => {
            const raw = f[key];
            if (!raw) return null;
            return { label, value: DATE_FIELDS.has(key) ? formatMaybeDate(String(raw)) : String(raw) };
        })
        .filter((x): x is { label: string; value: string } => !!x);

    const headline = [f.phone, f.email].filter(Boolean).join('   ·   ');

    return (
        <Box sx={{
            position: 'relative', borderRadius: '12px', overflow: 'hidden', mb: 1,
            border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
            opacity: candidate.importBlocked ? 0.62 : 1,
        }}>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />

            <Stack spacing={1.1} sx={{ p: { xs: 1.25, sm: 1.75 }, pl: { xs: 1.75, sm: 2.25 } }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Checkbox
                        size="small"
                        checked={checked}
                        onChange={onToggle}
                        disabled={candidate.importBlocked}
                        sx={{ p: 0.5, flex: 'none' }}
                    />
                    {/*
                      * Shown, and — since the photo import landed — actually kept: the server
                      * copies the bytes into our own storage on save. What it never does is
                      * write Google's URL into `profile_photo`, which would 404 the day the
                      * contact is deleted over there.
                      *
                      * `no-referrer` is load-bearing: Google 403s some requests carrying a
                      * Referer it does not expect, and MUI's Avatar falls back to initials
                      * without a word, so the symptom is a correct URL that never appears.
                      */}
                    <Avatar
                        src={candidate.photoUrl ?? undefined}
                        imgProps={{ referrerPolicy: 'no-referrer', loading: 'lazy' }}
                        sx={{ width: 40, height: 40, flex: 'none', fontSize: '0.85rem', bgcolor: toneAlpha(accent, 0.18), color: accent, fontWeight: 700 }}
                    >
                        {initialsOf(candidate.displayLabel)}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: 14.5, fontWeight: 700, minWidth: 0 }} noWrap>
                                {candidate.displayLabel}
                            </Typography>
                            <ToneChip dense tone={v.tone} label={v.label} />
                        </Stack>
                        {headline && (
                            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }} noWrap>
                                {headline}
                            </Typography>
                        )}
                        {candidate.organizationName && (
                            <Typography sx={{ fontSize: 12, color: 'text.disabled' }} noWrap>
                                {candidate.organizationName}
                                {f.roleInCompany ? ` — ${f.roleInCompany}` : ''}
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ flex: 'none' }}>
                        <WtButton ghost size="small" onClick={() => setOpen((o) => !o)}>
                            {open ? 'Hide' : `Details (${brings.length})`}
                        </WtButton>
                        <WtButton ghost size="small" onClick={onReview} disabled={candidate.importBlocked}>
                            Open form
                        </WtButton>
                    </Stack>
                </Stack>

                {/* The collision, both sides named. A duplicate warning that names no details
                    asks the reader to take it on trust. */}
                {candidate.matchedContact && (
                    <Stack spacing={0.5} sx={{ borderRadius: '10px', bgcolor: toneAlpha(accent, 0.05), p: 1 }}>
                        <IdentityLine
                            tag="From Google"
                            tone={v.tone}
                            name={candidate.displayLabel}
                            details={[f.phone, f.email].filter(Boolean).join('  ·  ')}
                        />
                        <IdentityLine
                            tag="In the CRM"
                            tone="neutral"
                            name={candidate.matchedContact.fullName}
                            details={[candidate.matchedContact.phone, candidate.matchedContact.email].filter(Boolean).join('  ·  ')}
                        />
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: accent, pt: 0.25 }}>
                            {candidate.reason}
                        </Typography>
                    </Stack>
                )}

                {/* What importing this contact actually writes — answered here rather than by
                    sending somebody into a form to find out.

                    Collapse owns the height; `disclosureSx` scales the contents up into the
                    space being made for them, so the two read as one movement instead of a
                    shutter sliding off finished content. Children stay mounted (no
                    `unmountOnExit`) — that is what gives the inner transition a `false` frame
                    to start from, so the first open animates like every one after it. */}
                <Collapse in={open} timeout={DISCLOSURE.duration} easing={DISCLOSURE.easing} unmountOnExit={false}>
                    <Box sx={{ borderRadius: '10px', bgcolor: 'action.hover', px: 1.25, py: 1, ...disclosureSx(open) }}>
                        <Typography sx={{
                            fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em',
                            textTransform: 'uppercase', color: 'text.secondary', pb: 0.75,
                        }}>
                            Imports {brings.length} {brings.length === 1 ? 'field' : 'fields'}
                        </Typography>
                        <Stack spacing={0.4}>
                            <FieldLine label="Name" value={f.fullName || '—'} tone={v.tone} />
                            {brings.map((b) => <FieldLine key={b.label} label={b.label} value={b.value} />)}
                        </Stack>

                        {candidate.unmapped.length > 0 && (
                            <Typography sx={{ fontSize: 11.5, color: 'text.disabled', pt: 1, lineHeight: 1.6 }}>
                                Not imported — {candidate.unmapped.join('; ')}
                            </Typography>
                        )}
                    </Box>
                </Collapse>
            </Stack>
        </Box>
    );
}

/**
 * The last screen before anything is written.
 *
 * ─── IT SHOWS THE DATA, NOT A HEADCOUNT ──────────────────────────────────────────────
 * "Import 12 contacts?" is a question nobody can answer — a number is not checkable. What is
 * checkable is the values themselves, so every field that will be saved is on screen: a wrong
 * tick, a number that belongs to somebody else, a note you did not mean to copy across are all
 * visible HERE rather than afterwards in the contacts table, where undoing means twelve deletes.
 *
 * Read-only on purpose. The way out is Back, into the list where ticking already works — a
 * second set of controls for de-selecting would be a second place that logic lives.
 */
function ConfirmList({ chosen, organizationName }: {
    chosen: GoogleContactCandidate[];
    organizationName: string | null;
}) {
    const withEmail = chosen.filter((c) => c.fields.email).length;
    const withPhoto = chosen.filter((c) => c.photoUrl).length;
    const matched = chosen.filter((c) => c.verdict !== 'NEW').length;
    const noContactDetail = chosen.filter((c) => !c.fields.phone && !c.fields.email).length;

    /** Only the counts worth stating. A line of zeroes is noise pretending to be a summary. */
    const notes = [
        withEmail > 0 && `${withEmail} with an email address`,
        withPhoto > 0 && `${withPhoto} with a photo`,
        matched > 0 && `${matched} that already resemble an existing contact`,
        noContactDetail > 0 && `${noContactDetail} with no phone or email at all`,
    ].filter(Boolean) as string[];

    return (
        <Box sx={{ pt: 0.5 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.4 }}>
                Import {chosen.length} contact{chosen.length === 1 ? '' : 's'}
            </Typography>
            {/* Naming the owner, rather than asserting it. The ownership rule is the point of
                this feature, and it matters most to anyone who belongs to more than one org. */}
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6, pt: 0.25, maxWidth: '70ch' }}>
                They become ordinary CRM contacts owned by{' '}
                <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {organizationName || 'your organization'}
                </Box>
                {' '}— searchable, editable, and usable in meetings.
                {notes.length > 0 ? ` Including ${listSentence(notes)}.` : ''}
            </Typography>

            <Stack spacing={1} sx={{ pt: 1.75 }}>
                {chosen.map((c) => {
                    const tone = VERDICT[c.verdict].tone;
                    const accent = tonePair(tone).fg;
                    const f = c.fields;
                    const writes = FIELD_ORDER
                        .map(([key, label]) => {
                            const raw = f[key];
                            if (!raw) return null;
                            return { label, value: DATE_FIELDS.has(key) ? formatMaybeDate(String(raw)) : String(raw) };
                        })
                        .filter((x): x is { label: string; value: string } => !!x);

                    return (
                        <Box
                            key={keyOf(c)}
                            sx={{
                                position: 'relative', borderRadius: '10px', overflow: 'hidden',
                                border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }} />
                            <Stack spacing={0.75} sx={{ p: 1.25, pl: 2 }}>
                                <Stack direction="row" spacing={1.25} alignItems="center">
                                    <Avatar
                                        src={c.photoUrl ?? undefined}
                                        imgProps={{ referrerPolicy: 'no-referrer', loading: 'lazy' }}
                                        sx={{
                                            width: 32, height: 32, flex: 'none', fontSize: '0.75rem', fontWeight: 700,
                                            bgcolor: toneAlpha(accent, 0.18), color: accent,
                                        }}
                                    >
                                        {initialsOf(c.displayLabel)}
                                    </Avatar>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1, minWidth: 0 }} noWrap>
                                        {f.fullName || c.displayLabel}
                                    </Typography>
                                    {c.verdict !== 'NEW' && <ToneChip dense tone={tone} label={VERDICT[c.verdict].label} />}
                                </Stack>

                                {/* Every value that will be written, on the same label column the
                                    picker's Details panel uses — so the confirmation and the thing
                                    it confirms read identically. */}
                                <Stack spacing={0.3} sx={{ pl: { sm: 5.5 } }}>
                                    {writes.length > 0 ? (
                                        writes.map((w) => <FieldLine key={w.label} label={w.label} value={w.value} />)
                                    ) : (
                                        <Typography sx={{ fontSize: 12.5, color: tonePair('warning').fg, fontWeight: 600 }}>
                                            Name only — no other details to save.
                                        </Typography>
                                    )}
                                    {c.matchedContact && (
                                        <Typography sx={{ fontSize: 12, color: accent, fontWeight: 600, pt: 0.25 }}>
                                            {c.reason} Importing creates a second, separate record.
                                        </Typography>
                                    )}
                                </Stack>
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}

export interface GoogleContactsImportDialogProps {
    open: boolean;
    onClose: () => void;
    onReview: (candidate: GoogleContactCandidate) => void;
    onImported: () => void;
}

export const GoogleContactsImportDialog = ({ open, onClose, onReview, onImported }: GoogleContactsImportDialogProps) => {
    const [phase, setPhase] = useState<Phase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [contacts, setContacts] = useState<GoogleContactCandidate[]>([]);
    const [truncated, setTruncated] = useState(false);
    const [account, setAccount] = useState<string | null>(null);
    const [organizationName, setOrganizationName] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    /**
     * The confirmation step.
     *
     * `Import 12` used to write immediately. Creating twelve company records is not an action
     * to discover you have taken — and a checkbox in a list of two hundred is easy to nudge
     * while scrolling. This holds the selection up and states exactly what is about to be
     * written, before anything is.
     */
    const [confirming, setConfirming] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<{ imported: number; skipped: Array<{ fullName: string; reason: string }> } | null>(null);
    const popupRef = useRef<Window | null>(null);

    const reset = useCallback(() => {
        setPhase('idle'); setError(null); setContacts([]); setTruncated(false); setAccount(null); setOrganizationName(null);
        setSearch(''); setFilter('all'); setSelected(new Set()); setResult(null); setConfirming(false);
    }, []);

    const dismiss = useCallback(() => { reset(); onClose(); }, [reset, onClose]);

    useEffect(() => {
        if (!open) return;
        const onMessage = async (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (popupRef.current && event.source !== popupRef.current) return;
            const data = event.data as { source?: string; code?: string; state?: string; error?: string };
            if (data?.source !== 'wisetech-google-contacts') return;

            if (data.error || !data.code || !data.state) {
                setPhase('idle');
                setError(data.error === 'access_denied'
                    ? 'Google authorization was cancelled. Nothing was imported.'
                    : 'Google did not return an authorization. Please try again.');
                return;
            }
            setPhase('loading'); setError(null);
            try {
                const res = await fetchGoogleContacts(data.code, data.state);
                setContacts(res.contacts); setTruncated(res.truncated);
                setAccount(res.googleAccountEmail); setOrganizationName(res.organizationName); setPhase('ready');
            } catch (err: any) {
                setPhase('error');
                setError(err?.response?.data?.detail || err?.response?.data?.message
                    || 'Could not read your Google Contacts. Please try again.');
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [open]);

    const connect = async () => {
        setPhase('connecting'); setError(null);
        try {
            const { authUrl } = await startGoogleContactsAuth();
            const popup = window.open(authUrl, 'wisetech-google-consent', 'width=520,height=640');
            popupRef.current = popup;
            if (!popup) {
                setPhase('idle');
                setError('Your browser blocked the Google window. Allow pop-ups for this site and try again.');
            }
        } catch (err: any) {
            setPhase('error');
            setError(err?.response?.data?.detail || err?.response?.data?.message || 'Could not start Google authorization.');
        }
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const byTab = FILTERS.find((t) => t.value === filter)?.match ?? (() => true);
        return contacts.filter((c) => byTab(c) && (!q
            || c.displayLabel.toLowerCase().includes(q)
            || (c.fields.email ?? '').toLowerCase().includes(q)
            || (c.fields.phone ?? '').includes(q)
            || (c.organizationName ?? '').toLowerCase().includes(q)));
    }, [contacts, search, filter]);

    const tabs = useMemo(
        () => FILTERS.map((t) => ({ value: t.value, label: t.label, count: contacts.filter(t.match).length })),
        [contacts],
    );

    const activeBlurb = FILTERS.find((t) => t.value === filter)?.blurb;
    /** Exactly what will be written — the confirm screen lists these, `runImport` sends these. */
    const chosen = useMemo(
        () => contacts.filter((c) => selected.has(keyOf(c)) && !c.importBlocked),
        [contacts, selected],
    );
    const selectableInView = useMemo(() => filtered.filter((c) => !c.importBlocked), [filtered]);
    const allInViewSelected = selectableInView.length > 0 && selectableInView.every((c) => selected.has(keyOf(c)));

    const toggle = (c: GoogleContactCandidate) => setSelected((prev) => {
        const next = new Set(prev); const k = keyOf(c);
        if (next.has(k)) next.delete(k); else next.add(k);
        return next;
    });

    /** Acts on the FILTERED view, so "select all" after a search or tab means what it says. */
    const toggleAllInView = () => setSelected((prev) => {
        const next = new Set(prev);
        if (allInViewSelected) selectableInView.forEach((c) => next.delete(keyOf(c)));
        else selectableInView.forEach((c) => next.add(keyOf(c)));
        return next;
    });

    const runImport = async () => {
        if (!chosen.length) return;
        setImporting(true); setError(null);
        try {
            const res = await importGoogleContacts(chosen.map(toContactCreatePayload));
            setResult({ imported: res.imported.length, skipped: res.skipped });
            const landed = new Set(res.imported.map((i) => i.fullName));
            setSelected((prev) => {
                const next = new Set(prev);
                chosen.forEach((c) => { if (landed.has(c.fields.fullName)) next.delete(keyOf(c)); });
                return next;
            });
            if (res.imported.length) onImported();
        } catch (err: any) {
            setError(err?.response?.data?.detail || err?.response?.data?.message || 'Import failed.');
        } finally {
            setImporting(false);
            // Back to the list either way. The result panel names anything refused, and those
            // rows stay ticked so they can be dealt with rather than hunted for.
            setConfirming(false);
        }
    };

    const selectedCount = selected.size;

    return (
        <GlassDialog
            open={open} onClose={dismiss} maxWidth="md" fullWidth plain
            header={(
                <GlassHeader
                    title="Import from Google Contacts"
                    subtitle={account ? `Signed in as ${account}` : 'Add contacts to the company CRM'}
                    icon={<KTIcon iconName="address-book" className="fs-1" />}
                    onClose={dismiss}
                />
            )}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: { xs: 'none', sm: '74vh' } }}>
                <Stack spacing={1.5} sx={{ p: { xs: 1.75, sm: 2.25 }, pb: 1.25 }}>
                    {error && <InlineNotice trio={TRIO.rose} icon="information-5">{error}</InlineNotice>}

                    {result && (
                        <InlineNotice trio={result.skipped.length ? TRIO.amber : TRIO.green} icon="check-circle">
                            <Box>
                                <strong>{result.imported} contact{result.imported === 1 ? '' : 's'} imported.</strong>
                                {result.skipped.length > 0 && (
                                    <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                                        {result.skipped.slice(0, 5).map((sk, i) => (
                                            <li key={i}><strong>{sk.fullName}</strong> — {sk.reason}</li>
                                        ))}
                                        {result.skipped.length > 5 && <li>and {result.skipped.length - 5} more</li>}
                                    </Box>
                                )}
                            </Box>
                        </InlineNotice>
                    )}

                    {(phase === 'idle' || phase === 'connecting' || phase === 'error') && (
                        <Stack spacing={2} sx={{ py: 1 }}>
                            <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.7, maxWidth: '62ch' }}>
                                Your Google Contacts stay yours. Nothing is synchronised and nothing is imported
                                automatically — you choose who to add, and we do not keep access to your Google
                                account afterwards.
                            </Typography>
                            <Box>
                                <WtButton onClick={connect} disabled={phase === 'connecting'}>
                                    {phase === 'connecting' ? 'Opening Google…' : 'Connect Google account'}
                                </WtButton>
                            </Box>
                        </Stack>
                    )}

                    {phase === 'loading' && (
                        <Stack alignItems="center" spacing={1.5} sx={{ py: 6 }}>
                            <CircularProgress size={28} />
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Reading your contacts…</Typography>
                        </Stack>
                    )}

                    {/* Browsing chrome is hidden on the confirm step — filtering a list you are
                        no longer choosing from is just something else to click by mistake. */}
                    {phase === 'ready' && !confirming && (
                        <>
                            <SegmentedControl
                                options={tabs}
                                value={filter}
                                onChange={setFilter}
                                ariaLabel="Filter contacts by match"
                            />
                            {/* What the chosen tab actually means, in the place the question
                                gets asked. A tab whose name is a matching rule needs to say
                                what it matched on somewhere, and a tooltip is a hint. */}
                            {activeBlurb && (
                                <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6, maxWidth: '78ch' }}>
                                    {activeBlurb}
                                </Typography>
                            )}
                            <TextField
                                size="small" fullWidth
                                placeholder="Search name, phone, email or company"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{ startAdornment: <KTIcon iconName="magnifier" className="fs-3 me-2" /> }}
                            />
                            {truncated && (
                                <InlineNotice icon="information-5">
                                    This account has more contacts than we load at once. Search narrows what is
                                    below, but it may not cover everything.
                                </InlineNotice>
                            )}
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <Checkbox
                                    size="small" sx={{ p: 0.5 }}
                                    checked={allInViewSelected}
                                    indeterminate={!allInViewSelected && selectableInView.some((c) => selected.has(keyOf(c)))}
                                    onChange={toggleAllInView}
                                    disabled={!selectableInView.length}
                                />
                                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                    Select all {selectableInView.length} shown
                                </Typography>
                            </Stack>
                        </>
                    )}
                </Stack>

                {phase === 'ready' && (
                    <>
                        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 1.5, sm: 2.25 }, pb: 1 }}>
                            {confirming ? (
                                <ConfirmList chosen={chosen} organizationName={organizationName} />
                            ) : filtered.length === 0 ? (
                                <WtEmptyState
                                    title="Nothing here"
                                    hint="Try another tab, or a different name, number or company."
                                    variant="no-match"
                                />
                            ) : filtered.map((c) => (
                                <ContactCard
                                    key={keyOf(c)}
                                    candidate={c}
                                    checked={selected.has(keyOf(c))}
                                    onToggle={() => toggle(c)}
                                    onReview={() => onReview(c)}
                                />
                            ))}
                        </Box>

                        {importing && <LinearProgress />}
                        <Stack
                            direction="row" alignItems="center" justifyContent="space-between" spacing={1}
                            sx={{ p: { xs: 1.5, sm: 2 }, borderTop: '1px solid', borderColor: 'divider' }}
                        >
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                {confirming
                                    ? 'Nothing is saved until you confirm.'
                                    : selectedCount
                                        ? `${selectedCount} selected`
                                        : 'Tick contacts to import, or open one in the form'}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                                {confirming ? (
                                    <>
                                        <WtButton ghost onClick={() => setConfirming(false)} disabled={importing}>
                                            Back
                                        </WtButton>
                                        {/* The button names the act it performs, and the count it
                                            performs it on — so the last thing read before a write
                                            is the size of the write. */}
                                        <WtButton onClick={runImport} disabled={importing}>
                                            {importing
                                                ? 'Importing…'
                                                : `Import ${chosen.length} contact${chosen.length === 1 ? '' : 's'}`}
                                        </WtButton>
                                    </>
                                ) : (
                                    <>
                                        <WtButton ghost onClick={dismiss} disabled={importing}>Close</WtButton>
                                        <WtButton onClick={() => setConfirming(true)} disabled={!selectedCount}>
                                            {`Review ${selectedCount || ''}`.trim()}
                                        </WtButton>
                                    </>
                                )}
                            </Stack>
                        </Stack>
                    </>
                )}
            </Box>
        </GlassDialog>
    );
};

export default GoogleContactsImportDialog;
