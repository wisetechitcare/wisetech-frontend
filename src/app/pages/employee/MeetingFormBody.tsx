import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
    Alert, Autocomplete, Avatar, Box, Button, Chip, Grid, InputAdornment, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { RootState } from '@redux/store';
import { createMeetings, fetchAllEmployees } from '@services/employee';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getAllProjects } from '@services/projects';
import { getLeadById } from '@services/leadService';
import { WtDateField } from '@app/modules/common/components/ui';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { KTIcon } from '@metronic/helpers';
import { TRIO, menuOptionSx, type Trio } from '@app/modules/common/components/ui/patterns';

/**
 * The meeting form's FIELDS, with no shell of its own.
 *
 * ─── ONE BODY, TWO SHELLS ────────────────────────────────────────────────────
 * A meeting is created from two places — the task dialog's "Meeting" choice and the calendar's
 * own button — and both must look and behave identically. So the fields live here and each
 * caller supplies its own dialog, header and footer. The alternative (a modal that knows how
 * to be two different modals) is how the app ended up with two task forms.
 *
 * Submission is exposed through the ref rather than a button inside these fields: the shell
 * already owns a footer, and a body that painted its own would leave two "Create" buttons on
 * screen in the task dialog.
 *
 * ─── STYLED LIKE THE TASK FORM, DELIBERATELY ─────────────────────────────────
 * Same `FormSectionHead` headings, same `Grid` rhythm, same `size="small"` MUI fields, same
 * Autocomplete-with-avatar-chips as "Assign to". The previous form was react-bootstrap markup
 * with hand-styled section boxes, so a meeting looked like a different product from the task
 * it sits beside in the same picker.
 *
 * ─── THE PROJECT IS THE LINK, AND THERE IS NOTHING ELSE TO WIRE ──────────────
 * A meeting already stores `projectId`, and both the project's Meetings section and the
 * calendar read meetings by it. So a meeting created here shows up in both places with no new
 * column and no join table: opened from a project the id is passed in and locked, opened from
 * the calendar the picker asks for it.
 */

export interface MeetingFormBodyHandle {
    /** Validates and posts. Resolves true when the meeting was created. */
    submit: () => Promise<boolean>;
}

export interface MeetingFormBodyProps {
    /** Preselects the project. Passed by the task dialog, which already knows the context. */
    defaultProjectId?: string;
    /** Hides the project cascade entirely — the caller has already decided the project. */
    lockProject?: boolean;
    /**
     * Calendar drag-selection, so a meeting drawn on the grid opens on those times.
     *
     * Typed loosely on purpose: what the calendar hands over is FullCalendar's own selection
     * object, which carries `startStr`/`endStr` alongside the Date pair. Both spellings are
     * accepted here rather than making the caller reshape it at every call site.
     */
    selectedDateTimeInfo?: {
        start?: string | Date; end?: string | Date; allDay?: boolean;
        startStr?: string; endStr?: string;
    } | null;
    onSaved?: () => void;
    /**
     * Publishes the fields the availability panel reads — times, the internal roster, and the
     * names to label it with.
     *
     * A callback rather than lifting the whole form into the dialog: the panel needs four values
     * out of about fifteen, and hoisting all of them would make every keystroke in Title a
     * re-render of a timeline that does not care about titles.
     */
    onScheduleChange?: (s: {
        startIso: string; endIso: string; participantIds: string[];
        nameById: Record<string, { name: string; avatar: string | null }>;
    }) => void;
}

interface Option { value: string; label: string; avatar?: string | null }


/** The two halves the pickers speak: a wire date and a 24h clock time, off one ISO value. */
const datePart = (iso: string) => (iso ? dayjs(iso).format('YYYY-MM-DD') : '');
const timePart = (iso: string) => (iso ? dayjs(iso).format('HH:mm') : '');

/** …and back. Either half missing leaves the value untouched rather than inventing one. */
const combineDateTime = (date: string, time: string) =>
    (date && time ? dayjs(`${date}T${time}`).toISOString() : '');

const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

/** Opening times. A meeting drawn on the calendar keeps its slot; anything else starts in an
 *  hour, because a meeting scheduled for the moment it was created is nobody's intent. */
const openingRange = (info?: MeetingFormBodyProps['selectedDateTimeInfo']) => {
    const now = dayjs();
    const rawStart = info?.start ?? info?.startStr;
    const rawEnd = info?.end ?? info?.endStr;
    let start = rawStart ? dayjs(rawStart) : null;
    if (!start || start.isBefore(now)) start = now.add(1, 'hour');
    else if (info?.allDay) start = start.isSame(now, 'day') ? now.add(1, 'hour') : start.hour(9).minute(0);

    let end = rawEnd && !info?.allDay ? dayjs(rawEnd) : null;
    if (!end || end.isBefore(start)) end = start.add(1, 'hour');
    return { start: start.toISOString(), end: end.toISOString() };
};

export const MeetingFormBody = forwardRef<MeetingFormBodyHandle, MeetingFormBodyProps>(
    ({ defaultProjectId, lockProject = false, selectedDateTimeInfo, onSaved, onScheduleChange }, ref) => {
        const theme = useTheme();
        const employeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);

        const opening = useMemo(() => openingRange(selectedDateTimeInfo), [selectedDateTimeInfo]);

        const [isOnline, setIsOnline] = useState(true);
        const [title, setTitle] = useState('');
        const [meetingLink, setMeetingLink] = useState('');
        const [location, setLocation] = useState('');
        const [companyTypeId, setCompanyTypeId] = useState('');
        const [companyId, setCompanyId] = useState('');
        const [projectId, setProjectId] = useState(defaultProjectId ?? '');
        const [internal, setInternal] = useState<string[]>([]);
        const [external, setExternal] = useState<string[]>([]);
        const [startDate, setStartDate] = useState(opening.start);
        const [endDate, setEndDate] = useState(opening.end);
        const [description, setDescription] = useState('');

        const [companyTypes, setCompanyTypes] = useState<any[]>([]);
        const [companies, setCompanies] = useState<any[]>([]);
        const [projects, setProjects] = useState<any[]>([]);
        const [employeeById, setEmployeeById] = useState<Record<string, { name: string; avatar: string | null }>>({});
        const [projectDetail, setProjectDetail] = useState<any>(null);
        const [teamLoading, setTeamLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [touched, setTouched] = useState(false);

        useEffect(() => { setProjectId(defaultProjectId ?? ''); }, [defaultProjectId]);

        useEffect(() => {
            (async () => {
                try {
                    const [types, comps, projs, emps] = await Promise.all([
                        getAllCompanyTypes(), getAllClientCompanies(), getAllProjects(), fetchAllEmployees(),
                    ]);
                    setCompanyTypes(types?.companyTypes || []);
                    setCompanies(comps?.data?.companies || []);
                    setProjects(projs?.data?.projects || projs?.projects || []);
                    const map: Record<string, { name: string; avatar: string | null }> = {};
                    (emps?.data?.employees || []).forEach((e: any) => {
                        const name = `${e.users?.firstName || ''} ${e.users?.lastName || ''}`.trim();
                        if (e.id && name) map[e.id] = { name, avatar: e.avatar || e.users?.avatar || null };
                    });
                    setEmployeeById(map);
                } catch (e) {
                    console.error('Failed to load meeting reference data', e);
                    setError('Could not load projects and people. Close and reopen to try again.');
                }
            })();
        }, []);

        /**
         * A chosen project BACKFILLS the two selects above it.
         *
         * They exist to narrow a long list down to one project, but a project can also be picked
         * straight from the search — and then they sat on "All types / All companies", describing
         * nothing, while the field below them named a specific project. Read off the project's
         * own `fileLocationCompanyType` / `fileLocationCompany`, the same columns the filter
         * below already reads, so it is the project's answer rather than a guess.
         *
         * One rule, not a handler plus a seed path: it covers a manual pick and a project passed
         * in from the task dialog alike, and it cannot fight the user — changing either select
         * clears the project, so this only ever runs when there is a project to describe.
         */
        useEffect(() => {
            if (!projectId || !projects.length) return;
            const row = projects.find((p: any) => p.id === projectId);
            if (!row) return;
            setCompanyTypeId(row.fileLocationCompanyType || '');
            setCompanyId(row.fileLocationCompany || '');
        }, [projectId, projects]);

        // The list endpoint carries no roster, so the detail is fetched when a project is picked.
        // That is also what fills the participants below — the hint under the picker is a promise
        // this makes good on.
        useEffect(() => {
            if (!projectId) { setProjectDetail(null); return; }
            let cancelled = false;
            setTeamLoading(true);
            getLeadById(projectId)
                .then((res: any) => { if (!cancelled) setProjectDetail(res?.data?.lead || res?.lead || res?.data || null); })
                .catch((e: any) => console.error('Failed to load project team', e))
                .finally(() => { if (!cancelled) setTeamLoading(false); });
            return () => { cancelled = true; };
        }, [projectId]);

        /**
         * Internal roster: the persisted per-project list wins, else the live execution team.
         *
         * With NO project chosen the list is everybody, because the project is what narrows it —
         * without one there is nothing to narrow by, and an empty picker would make a
         * project-less meeting impossible to staff.
         */
        const internalOptions: Option[] = useMemo(() => {
            if (!projectId) {
                return Object.entries(employeeById)
                    .map(([value, info]) => ({ value, label: info.name, avatar: info.avatar }))
                    .sort((a, b) => a.label.localeCompare(b.label));
            }
            if (!projectDetail) return [];
            const persisted = (projectDetail.internalMembers || []).filter((m: any) => m.isActive !== false);
            const roster = persisted.length ? persisted : (projectDetail.execution?.team?.members || []);
            const seen = new Set<string>();
            return roster
                .filter((m: any) => m.employeeId && !seen.has(m.employeeId) && seen.add(m.employeeId))
                .map((m: any) => ({
                    value: m.employeeId,
                    label: employeeById[m.employeeId]?.name || `Employee ${m.employeeId}`,
                    avatar: employeeById[m.employeeId]?.avatar || null,
                }))
                .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        }, [projectId, projectDetail, employeeById]);

        /**
         * The addresses an offline meeting could actually happen at, each named by whose it is.
         *
         * Three sources, all already on the project detail this form fetches for its
         * participants: the project's own client company, the stakeholders on its team, and its
         * referrals. "Location" was a free-text box, so the address of the place everyone was
         * about to drive to had to be looked up elsewhere and retyped — with the typos that
         * implies on the one field a courier or a visitor actually uses.
         *
         * Labelled by OWNER, not by address ("Project address", "Zafar Iqbal address"), because
         * that is how somebody picks: they know whose office they are meeting at before they
         * know the street.
         *
         * Still free text underneath (`freeSolo`) — a meeting at a café is a real meeting, and
         * a picker that refuses to accept one is worse than the box it replaced.
         */
        const addressOptions: Option[] = useMemo(() => {
            if (!projectDetail) return [];
            const out: Option[] = [];
            const seen = new Set<string>();
            const push = (owner: string, parts: Array<string | null | undefined>) => {
                const address = parts.filter(Boolean).join(', ').trim();
                if (!address || seen.has(address)) return;
                seen.add(address);
                out.push({ value: address, label: `${owner} — ${address}` });
            };

            const co = projectDetail.company;
            if (co) push('Project address', [co.address, co.area, co.city, co.state]);
            if (projectDetail.contact) {
                push(`${projectDetail.contact.fullName || 'Primary contact'} address`,
                    [projectDetail.contact.address, projectDetail.contact.city, projectDetail.contact.state]);
            }

            for (const t of projectDetail.leadTeams || []) {
                if (t.contact) push(`${t.contact.fullName || 'Stakeholder'} address`, [t.contact.address, t.contact.city, t.contact.state]);
                if (t.company) push(`${t.company.companyName || 'Company'} address`, [t.company.address, t.company.area, t.company.city, t.company.state]);
            }

            for (const r of projectDetail.referrals || []) {
                const c = r.referredByContact;
                if (c) push(`${c.fullName || 'Referral'} address`, [c.address, c.city, c.state]);
                const rc = r.referringCompany;
                if (rc) push(`${rc.companyName || 'Referring company'} address`, [rc.address, rc.area, rc.city, rc.state]);
            }

            return out;
        }, [projectDetail]);

        // Opening value for a newly-offline meeting: the project's own address, which is where
        // most of them happen. Only when the field is still empty — never over a typed one.
        useEffect(() => {
            if (isOnline || location || !addressOptions.length) return;
            setLocation(addressOptions[0].value);
        }, [isOnline, location, addressOptions]);

        /** External roster: the project's client stakeholders. */
        const externalOptions: Option[] = useMemo(() => {
            if (!projectDetail) return [];
            const fromTeams = (projectDetail.leadTeams || [])
                .filter((t: any) => t.contact?.id)
                .map((t: any) => ({
                    value: t.contact.id,
                    label: t.contact.fullName || t.company?.companyName || 'Unknown',
                    avatar: t.contact.profilePhoto || t.contact.avatar || null,
                }));
            const fromMembers = (projectDetail.externalMembers || [])
                .filter((m: any) => m.contactId)
                .map((m: any) => ({ value: m.contactId, label: m.name || 'Unknown', avatar: null }));
            const seen = new Set<string>();
            return [...fromTeams, ...fromMembers]
                .filter((o: Option) => !seen.has(o.value) && seen.add(o.value))
                .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        }, [projectDetail]);

        const filteredCompanies = companies.filter((c: any) => !companyTypeId || c.companyTypeId === companyTypeId);
        const projectOptions: Option[] = projects
            .filter((p: any) => {
                if (lockProject) return true;
                if (!p.fileLocationCompanyType && !p.fileLocationCompany) return false;
                if (companyTypeId && p.fileLocationCompanyType !== companyTypeId) return false;
                if (companyId && p.fileLocationCompany !== companyId) return false;
                return true;
            })
            .map((p: any) => ({ value: p.id, label: p.projectNumber ? `${p.projectNumber} — ${p.title || ''}`.trim() : (p.title || p.id) }));

        /**
         * Moving the start CARRIES the meeting: the end shifts with it and the duration holds.
         * Editing both by hand to move a one-hour meeting half an hour later is two edits for one
         * intention, and the second is the one people forget.
         */
        const setStart = (next: string) => {
            if (!next) { setStartDate(''); return; }
            const held = startDate && endDate ? dayjs(endDate).diff(dayjs(startDate), 'minute') : 60;
            setStartDate(next);
            setEndDate(dayjs(next).add(held > 0 ? held : 60, 'minute').toISOString());
        };

        // Kept in an effect rather than called from each setter, so there is one place it can
        // go out of date instead of five.
        useEffect(() => {
            onScheduleChange?.({ startIso: startDate, endIso: endDate, participantIds: internal, nameById: employeeById });
        }, [startDate, endDate, internal, employeeById, onScheduleChange]);

        const endsBeforeStart = !!startDate && !!endDate && !dayjs(endDate).isAfter(dayjs(startDate));

        /** e.g. "Asia/Calcutta (UTC+5:30)" — resolved, never assumed. */
        const timeZoneLabel = useMemo(() => {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const mins = -new Date().getTimezoneOffset();
            const sign = mins >= 0 ? '+' : '-';
            const abs = Math.abs(mins);
            return `${zone} (UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')})`;
        }, []);

        /**
         * Mirrors the schema the previous form validated with, minus one rule: a meeting no
         * longer NEEDS a project.
         *
         * Plenty of real meetings have no project — an internal catch-up, a vendor call, an
         * interview. Requiring one made those unrecordable, and the workaround is somebody
         * filing them against an unrelated project, which is worse than not filing them at all.
         * `projectId` is still sent when there is one, so the project's Meetings tab is
         * unaffected.
         */
        const validate = (): string | null => {
            if (!title.trim()) return 'Title is required';
            if (title.trim().length < 10) return 'Title must be at least 10 characters';
            if (title.trim().length > 100) return 'Title cannot exceed 100 characters';
            if (isOnline && !meetingLink.trim()) return 'Meeting link is required for online meetings';
            if (!isOnline && !location.trim()) return 'Location is required for offline meetings';
            if (!internal.length) return 'At least one team member is required';
            if (!startDate) return 'Start date is required';
            if (!endDate) return 'End date is required';
            if (!dayjs(startDate).isAfter(dayjs().subtract(1, 'minute'))) return 'Meeting cannot be scheduled in the past';
            if (!dayjs(endDate).isAfter(dayjs(startDate))) return 'End date must be after start date';
            if (!description.trim()) return 'Description is required';
            return null;
        };

        useImperativeHandle(ref, () => ({
            submit: async () => {
                setTouched(true);
                const problem = validate();
                if (problem) { setError(problem); return false; }
                setError(null);
                try {
                    const response = await createMeetings({
                        employeeId,
                        title: title.trim(),
                        description: description.trim(),
                        startDate: dayjs(startDate).toISOString(),
                        endDate: dayjs(endDate).toISOString(),
                        isOnline,
                        meetingLink: isOnline ? meetingLink.trim() : undefined,
                        location: isOnline ? undefined : location.trim(),
                        participants: internal.length ? internal.join(',') : undefined,
                        externalParticipants: external.length ? external.join(',') : undefined,
                        projectId: projectId || undefined,
                    });
                    if (response?.statusCode !== 201) { setError('Failed to create meeting'); return false; }
                    // The calendar listens for this to drop the new meeting onto the grid without
                    // a refetch — kept from the old form, since its listener is still there.
                    document.dispatchEvent(new CustomEvent('meetingAdded', { detail: response.data }));
                    onSaved?.();
                    return true;
                } catch (e) {
                    console.error('Error creating meeting', e);
                    setError('Failed to create meeting');
                    return false;
                }
            },
        }));

        const chipAvatar = (o: Option) => (
            <Avatar src={o.avatar || undefined} sx={{ width: 24, height: 24, fontSize: 10, fontWeight: 700 }}>
                {initialsOf(o.label)}
            </Avatar>
        );

        const peoplePicker = (
            label: string, options: Option[], selected: string[], onPick: (v: string[]) => void,
            helper: string, required: boolean,
        ) => (
            <Autocomplete
                multiple size="small" fullWidth disableCloseOnSelect
                options={options}
                value={options.filter((o) => selected.includes(o.value))}
                onChange={(_, picked) => onPick(picked.map((p) => p.value))}
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(o, v) => o.value === v.value}
                loading={teamLoading}
                noOptionsText={projectId ? 'Nobody on this project' : 'No one matches'}
                // Same accent-tinted rows as the task form's pickers. `ListboxProps`, not
                // `slotProps.listbox`: this MUI version has no `listbox` slot, and passing one
                // is silently ignored rather than rejected.
                ListboxProps={{ sx: menuOptionSx }}
                renderTags={(picked, getTagProps) => picked.map((o, i) => (
                    <Chip {...getTagProps({ index: i })} key={o.value} size="small" avatar={chipAvatar(o)} label={o.label} />
                ))}
                renderOption={(props, o) => (
                    <Box component="li" {...props} key={o.value} sx={{ gap: 1 }}>
                        <Avatar
                            src={o.avatar || undefined}
                            sx={{
                                width: 24, height: 24, fontSize: 10, fontWeight: 700,
                                bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.3 : 0.16),
                                color: 'primary.main',
                            }}
                        >
                            {initialsOf(o.label)}
                        </Avatar>
                        <Typography variant="body2" noWrap>{o.label}</Typography>
                    </Box>
                )}
                renderInput={(params) => (
                    <TextField {...params} label={label} required={required} helperText={helper} />
                )}
            />
        );

        /**
         * The flat label every field in this column carries, with a small tinted glyph.
         *
         * Colour at LABEL scale, not card scale: enough to give the eye something to land on
         * down a long column, without the coloured plates and bordered panels that turned this
         * form into a stack of separate things. The tones are the kit's shared trios, so a blue
         * here is the same blue as everywhere else in the product.
         */
        const L = ({ text, icon, trio }: { text: string; icon: string; trio: Trio }) => (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
                <Box sx={{ color: trio.c, lineHeight: 0 }}>
                    <KTIcon iconName={icon} className="fs-6" />
                </Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                    {text}
                </Typography>
            </Stack>
        );

        const projectLabel = projectOptions.find((o) => o.value === projectId)?.label;

        return (
            <Box>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {/* TITLE FIRST, and big. It is the meeting's identifier — the string every list,
                    invite and calendar cell shows — so it leads rather than sharing a row. */}
                <TextField
                    fullWidth
                    placeholder="Meeting title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={touched && title.trim().length > 0 && title.trim().length < 10}
                    helperText={title.trim() && title.trim().length < 10 ? 'At least 10 characters' : ' '}
                    inputProps={{ 'aria-label': 'Meeting title' }}
                    sx={{ '& .MuiInputBase-input': { fontSize: 15, fontWeight: 600, py: 1.25 } }}
                />

                {/* The project, stated rather than asked, when the screen already decided it. */}
                {lockProject && projectLabel ? (
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: -1, mb: 2 }}>
                        <Box sx={{ color: TRIO.purple.c, lineHeight: 0 }}>
                            <KTIcon iconName="briefcase" className="fs-6" />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                            {projectLabel}
                        </Typography>
                    </Stack>
                ) : (
                    <Box sx={{ mb: 2 }}>
                        <L text="Project" icon="briefcase" trio={TRIO.purple} />
                        <Autocomplete
                            size="small" fullWidth
                            options={projectOptions}
                            value={projectOptions.find((o) => o.value === projectId) || null}
                            onChange={(_, picked) => setProjectId(picked?.value || '')}
                            getOptionLabel={(o) => o.label}
                            isOptionEqualToValue={(o, v) => o.value === v.value}
                            ListboxProps={{ sx: menuOptionSx }}
                            renderInput={(params) => <TextField {...params} placeholder="Search project" />}
                        />
                    </Box>
                )}

                {/* Online / In person, each carrying its own glyph. Two same-sized buttons whose
                    only difference is a word are read by shape first and word second — and this
                    choice decides which field appears underneath them. */}
                <Box role="radiogroup" aria-label="Meeting type" sx={{ display: 'flex', gap: 1.25, mb: 2 }}>
                    {[
                        { label: 'Online', on: true, icon: 'video' },
                        { label: 'In person', on: false, icon: 'geolocation' },
                    ].map((opt) => {
                        const active = isOnline === opt.on;
                        return (
                            <Box
                                key={opt.label}
                                component="button"
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => setIsOnline(opt.on)}
                                sx={{
                                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
                                    height: 42, borderRadius: 1.5, cursor: 'pointer',
                                    fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                                    border: '1px solid',
                                    borderColor: active ? 'primary.main' : 'divider',
                                    bgcolor: active
                                        ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.28 : 0.1)
                                        : 'background.paper',
                                    color: active ? 'primary.main' : 'text.secondary',
                                    transition: 'background-color .15s, border-color .15s, color .15s',
                                    '&:hover': { borderColor: 'primary.main' },
                                }}
                            >
                                <KTIcon iconName={opt.icon} className="fs-5" />
                                {opt.label}
                            </Box>
                        );
                    })}
                </Box>

                <Box sx={{ mb: 2 }}>
                    {isOnline ? (
                        <TextField
                            fullWidth size="small"
                            placeholder="meet.google.com/… or a Teams/Zoom link"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            inputProps={{ 'aria-label': 'Meeting link' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start" sx={{ color: TRIO.blue.c }}>
                                        <KTIcon iconName="video" className="fs-5" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    ) : (
                        <Autocomplete
                            freeSolo
                            size="small" fullWidth
                            options={addressOptions}
                            value={addressOptions.find((o) => o.value === location) ?? location}
                            onChange={(_, picked) => setLocation(typeof picked === 'string' ? picked : picked?.value ?? '')}
                            onInputChange={(_, text, reason) => { if (reason === 'input') setLocation(text); }}
                            getOptionLabel={(o) => (typeof o === 'string' ? o : o.value)}
                            isOptionEqualToValue={(o, v) => o.value === (typeof v === 'string' ? v : v.value)}
                            ListboxProps={{ sx: menuOptionSx }}
                            renderOption={(props, o) => (
                                <Box component="li" {...props} key={o.value} sx={{ display: 'block !important' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{o.label.split(' — ')[0]}</Typography>
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>{o.value}</Typography>
                                </Box>
                            )}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Location"
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <InputAdornment position="start" sx={{ color: TRIO.rose.c }}>
                                                <KTIcon iconName="geolocation" className="fs-5" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                        />
                    )}
                </Box>

                {/* The day, then From and To. The mockup shows only the clock because its day is
                    the calendar cell you clicked; the date stays visible here so a meeting can be
                    put on another day without leaving the form. */}
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={4}>
                        <L text="Date" icon="calendar" trio={TRIO.blue} />
                        <WtDateField
                            value={datePart(startDate)}
                            onChange={(d) => setStart(combineDateTime(d, timePart(startDate) || '09:00'))}
                            // Stated rather than assumed, so the date box and the two wheels
                            // beside it are the same 40px whatever the theme does to inputs.
                            sx={{ '& .MuiOutlinedInput-root': { height: 40 } }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <L text="From" icon="time" trio={TRIO.blue} />
                        <TimeWheelField
                            tone={TRIO.blue}
                            value={timePart(startDate)}
                            onChange={(t) => setStart(combineDateTime(datePart(startDate), t))}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <L text="To" icon="time" trio={TRIO.amber} />
                        <TimeWheelField
                            tone={TRIO.amber}
                            value={timePart(endDate)}
                            invalid={endsBeforeStart}
                            onChange={(t) => setEndDate(combineDateTime(datePart(endDate) || datePart(startDate), t))}
                        />
                    </Grid>
                    {endsBeforeStart && (
                        <Grid item xs={12}>
                            <Typography variant="caption" sx={{ color: 'error.main' }}>
                                To must be after From
                            </Typography>
                        </Grid>
                    )}
                </Grid>

                {/* Participants as FACES, with the pickers underneath: the chip row says who is
                    coming at a glance, the fields say how to change it. */}
                <L text="Participants" icon="profile-user" trio={TRIO.green} />
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
                    {internal.map((id) => {
                        const o = internalOptions.find((x) => x.value === id);
                        return (
                            <Chip
                                key={id}
                                size="small"
                                avatar={<Avatar src={o?.avatar || undefined}>{initialsOf(o?.label || '?')}</Avatar>}
                                label={o?.label || 'Someone'}
                                onDelete={() => setInternal(internal.filter((x) => x !== id))}
                            />
                        );
                    })}
                    {internalOptions.length > 0 && internal.length < internalOptions.length && (
                        <Button
                            size="small"
                            onClick={() => setInternal(internalOptions.map((o) => o.value))}
                            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0 }}
                        >
                            + Team
                        </Button>
                    )}
                    {internal.length === 0 && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Nobody added yet
                        </Typography>
                    )}
                </Stack>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                        {peoplePicker('Team members', internalOptions, internal, setInternal, '', true)}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {peoplePicker('Client stakeholders', externalOptions, external, setExternal, '', false)}
                    </Grid>
                </Grid>

                <L text="Agenda" icon="notepad-edit" trio={TRIO.cyan} />
                <TextField
                    fullWidth size="small" multiline minRows={3}
                    placeholder="Optional"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    inputProps={{ 'aria-label': 'Agenda' }}
                />

                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
                    Times shown in {timeZoneLabel} · stored in UTC
                </Typography>
            </Box>
        );
    },
);

MeetingFormBody.displayName = 'MeetingFormBody';

export default MeetingFormBody;
