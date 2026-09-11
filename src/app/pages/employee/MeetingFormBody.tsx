import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
    Alert, Autocomplete, Avatar, Box, Button, Chip, Grid, InputAdornment, Stack, TextField, Typography, alpha, useTheme,
} from '@mui/material';
import { RootState } from '@redux/store';
import { createMeetings, updateMeeting, fetchAllEmployees, getMyMeetingReminders, setMyMeetingReminders } from '@services/employee';
import { getAllCompanyTypes, getAllClientCompanies } from '@services/companies';
import { getAllProjects } from '@services/projects';
// The projects this person is on the INTERNAL TEAM of (or manages). Its own endpoint, not
// the task board's: that one is gated behind a `tasks.view` scope and also includes projects
// of tasks merely assigned to you, so it both hid projects from people without task
// permissions and offered ones they are not really on.
import { getMeetingProjects } from '@services/employee';
import { getLeadById } from '@services/leadService';
import { openingRange, type SelectedDateTimeInfo } from './meetingOpening';
import { ToneChip, WtDateField, WtSwitch } from '@app/modules/common/components/ui';
import { TimeWheelField } from '@app/modules/common/components/TimeWheelField';
import { KTIcon } from '@metronic/helpers';
import { TRIO, menuOptionSx, type Trio } from '@app/modules/common/components/ui/patterns';
import { ReminderChips } from './MeetingRemindersDialog';
import { joinAddress } from './meetingAddress';
import { TITLE_MAX_CHARS, AGENDA_MAX_WORDS, countWords } from './meetingLimits';

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
    /**
      * The meeting to edit. Absent → this is a new meeting.
      *
      * Passed as the ROW the list already holds rather than an id to fetch: the caller opened
      * this dialog from a meeting it was already displaying, so a round trip would only fetch
      * what is on screen. `updateMeeting` is organizer-only server-side, which is why the
      * caller decides whether to offer editing at all.
      */
     editing?: {
         id: string; title: string; description?: string; isOnline: boolean;
         meetingLink?: string | null; location?: string | null;
         startDate: string; endDate: string; projectId?: string | null;
         participantIds?: string[]; externalParticipantIds?: string[];
     } | null;
     defaultProjectId?: string;
    /** Hides the project cascade entirely — the caller has already decided the project. */
    lockProject?: boolean;
    /**
     * The linked row is a LEAD, not a project — and this is its name.
     *
     * Set only by the Leads table, which is the sole place a meeting may be booked against a
     * lead that has not become a project. It does two things a bare `defaultProjectId` cannot:
     *
     * 1. NAMES the row. `projectOptions` only lists projects you are on the internal team of,
     *    and a fresh lead is on nobody's — so the locked line would read "Selected project"
     *    until the detail fetch landed, and the Autocomplete would render EMPTY.
     * 2. Says WHICH KIND it is, so the form does not call a lead a project. Presence is the
     *    signal; there is no matching `projectName`, because a project needs no announcement.
     */
    leadName?: string;
    /**
     * Calendar drag-selection, so a meeting drawn on the grid opens on those times.
     *
     * Typed loosely on purpose: what the calendar hands over is FullCalendar's own selection
     * object, which carries `startStr`/`endStr` alongside the Date pair. Both spellings are
     * accepted here rather than making the caller reshape it at every call site.
     */
    selectedDateTimeInfo?: SelectedDateTimeInfo | null;
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

export const MeetingFormBody = forwardRef<MeetingFormBodyHandle, MeetingFormBodyProps>(
    ({ editing, defaultProjectId, lockProject = false, leadName, selectedDateTimeInfo, onSaved, onScheduleChange }, ref) => {
        const theme = useTheme();
        const employeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id);
        // Already in the store from sign-in, so the office costs no fetch.
        const myBranch = useSelector((s: RootState) => s.employee?.currentEmployee?.branches);

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
        const [myProjectIds, setMyProjectIds] = useState<Set<string>>(new Set());
        const [employeeById, setEmployeeById] = useState<Record<string, { name: string; avatar: string | null }>>({});
        const [projectDetail, setProjectDetail] = useState<any>(null);
        const [teamLoading, setTeamLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        /**
         * Whether to send the notice, and to whom.
         *
         * Both were previously decided for the organizer: every save mailed every participant.
         * That is right for a new meeting and wrong for a typo fix, so a NEW meeting defaults
         * to sending and an EDIT defaults to not — the common case for each, with the other
         * one click away.
         *
         * `notifyIds === null` means "everyone on the meeting" and is what a fresh invitation
         * wants; once the organizer touches the picker it becomes an explicit list.
         */
        const [notify, setNotify] = useState(!editing);
        const [notifyIds, setNotifyIds] = useState<string[] | null>(null);

        /**
         * Load the meeting being edited into the form.
         *
         * Keyed on its id, so opening the dialog on a DIFFERENT meeting refills rather than
         * showing the previous one's values — the dialog is mounted once and reused.
         */
        useEffect(() => {
            if (!editing) return;
            setTitle(editing.title || '');
            setDescription(editing.description || '');
            setIsOnline(!!editing.isOnline);
            setMeetingLink(editing.meetingLink || '');
            setLocation(editing.location || '');
            setStartDate(dayjs(editing.startDate).format('YYYY-MM-DDTHH:mm'));
            setEndDate(dayjs(editing.endDate).format('YYYY-MM-DDTHH:mm'));
            setProjectId(editing.projectId || '');
            setInternal(editing.participantIds || []);
            setExternal(editing.externalParticipantIds || []);

            // Mine only, and best-effort: a meeting that will not tell us its reminders is
            // still a meeting somebody came here to edit, so a failure leaves the row empty
            // rather than blocking the form.
            getMyMeetingReminders(editing.id, employeeId)
                .then((res: any) => {
                    const rows = (res?.data ?? []) as Array<{ minutesBefore: number; sent: boolean }>;
                    setReminders(rows.map((r) => r.minutesBefore));
                    setRemindersSent(rows.filter((r) => r.sent).map((r) => r.minutesBefore));
                })
                .catch(() => { setReminders([]); setRemindersSent([]); });
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [editing?.id]);
        /**
         * MY reminders on this meeting. Everyone on a meeting sets their own, so what is
         * ticked here is the caller's alone and saving it changes nobody else's.
         *
         * Asked HERE rather than only behind the bell on the list, because the moment a person
         * decides a meeting matters is the moment they are booking it — an action parked on
         * another screen is one most people never go and find. `sent` offsets are already out
         * and cannot be un-ticked; re-arming one would buzz somebody twice.
         */
        const [reminders, setReminders] = useState<number[]>([]);
        const [remindersSent, setRemindersSent] = useState<number[]>([]);

        const [touched, setTouched] = useState(false);

        /**
         * The caller's default project, for a NEW meeting only.
         *
         * This effect is declared after the one that prefills an edit, so on an edit it ran
         * second and overwrote the meeting's own project with the caller's default — which is
         * `undefined` when the dialog is opened from a board card, i.e. it blanked it. An
         * existing meeting's project comes from the meeting; nothing else may set it.
         */
        useEffect(() => {
            if (editing) return;
            setProjectId(defaultProjectId ?? '');
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [defaultProjectId, editing?.id]);

        useEffect(() => {
            (async () => {
                try {
                    const [types, comps, projs, mine, emps] = await Promise.all([
                        getAllCompanyTypes(), getAllClientCompanies(), getAllProjects(),
                        getMeetingProjects(), fetchAllEmployees(),
                    ]);
                    setCompanyTypes(types?.companyTypes || []);
                    setCompanies(comps?.data?.companies || []);
                    // Intersected, not swapped: the full row carries fileLocationCompany /
                    // fileLocationCompanyType, which the company filters below read and the
                    // board's lighter list does not have. So the shape comes from one and the
                    // MEMBERSHIP from the other.
                    const myIds = new Set<string>(
                        ((mine?.data || []) as any[]).map((p) => String(p.id)),
                    );
                    setMyProjectIds(myIds);
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
                // `res.data.data.lead`. apiClient does NOT unwrap (its response interceptor is
                // the identity), so `res.data` is the API ENVELOPE — which the old fallback
                // chain reached and accepted as the project. Every read off projectDetail was
                // therefore undefined: no internal roster, no addresses, and an External Team
                // picker that said "Nobody on this project" for a project that had one.
                .then((res: any) => { if (!cancelled) setProjectDetail(res?.data?.data?.lead ?? res?.data?.lead ?? null); })
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
         *
         * A LEAD is that same case wearing a different hat. Internal teams are staffed when a
         * lead becomes a project, so a lead has none — narrowing by it would leave the picker
         * empty and make the first meeting anyone books on a lead unstaffable, which is the
         * one meeting a lead actually needs. Scoped to `leadName` so the project rule, which
         * exists to stop people inviting colleagues onto work they are not on, is untouched.
         */
        const internalOptions: Option[] = useMemo(() => {
            if (!projectId || leadName) {
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
                    label: employeeById[m.employeeId]?.name || '',
                    avatar: employeeById[m.employeeId]?.avatar || null,
                }))
                // A person we cannot NAME yet is left out rather than labelled with their id.
                //
                // The roster arrives with employeeId only; the names come from the directory,
                // which is a separate request finishing at its own pace. The label used to fall
                // back to `Employee <uuid>`, so for the moment between the two responses the
                // picker showed raw ids — a database key in front of a user, which is never the
                // right answer to "who is coming". They appear, named, a moment later.
                .filter((o: Option) => !!o.label)
                .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        }, [projectId, projectDetail, employeeById, leadName]);

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
            const out: Option[] = [];
            const seen = new Set<string>();
            const push = (owner: string, parts: Array<string | null | undefined>) => {
                const address = joinAddress(parts);
                if (!address || seen.has(address)) return;
                seen.add(address);
                out.push({ value: address, label: `${owner} — ${address}` });
            };

            /**
             * The SITE — where the thing is actually being built.
             *
             * This is what "project address" means on an MEP project, and it was the one
             * address the picker could not offer. What it labelled "Project address" was the
             * CLIENT COMPANY's address, which is a different place entirely: the client's
             * office is where you meet the client, the site is where you meet the building.
             * On a project with no client company attached — plenty of internal ones — that
             * mislabelled option was also simply absent, which is how a project with a site
             * address on its own detail page offered nothing but a referral's address.
             *
             * First in the list, so it is what an empty in-person field opens on. It is the
             * likeliest answer for a project meeting, and the list is ordered by likelihood.
             *
             * `additionalDetails` arrives as an object today and as a one-element array on
             * legacy rows — the repository's own parser accepts both, so this does too.
             */
            const ad = Array.isArray(projectDetail?.additionalDetails)
                ? projectDetail?.additionalDetails[0]
                : projectDetail?.additionalDetails;
            if (ad) {
                push('Project site', [ad.projectAddress, ad.locality, ad.city, ad.state, ad.zipCode, ad.country]);
            }

            const co = projectDetail?.company;
            // Named for what it is. "Project address" on the client's office was the label
            // that hid the absence of the real one.
            if (co) push(`${co.companyName || 'Client company'} address`, [co.address, co.area, co.city, co.state]);
            if (projectDetail?.contact) {
                push(`${projectDetail.contact.fullName || 'Primary contact'} address`,
                    [projectDetail.contact.address, projectDetail.contact.city, projectDetail.contact.state]);
            }

            // Both rosters: the lead form's Address To (leadTeams) AND the project's own
            // External Team (projectExternalTeams), which the Teams tab writes and which is
            // deliberately decoupled from the lead. Reading only the first meant a meeting at
            // a stakeholder added on the Teams tab could not offer their address.
            for (const t of [...(projectDetail?.leadTeams || []), ...(projectDetail?.projectExternalTeams || [])]) {
                if (t.contact) push(`${t.contact.fullName || 'Stakeholder'} address`, [t.contact.address, t.contact.city, t.contact.state]);
                if (t.company) push(`${t.company.companyName || 'Company'} address`, [t.company.address, t.company.area, t.company.city, t.company.state]);
            }

            for (const r of projectDetail?.referrals || []) {
                const c = r.referredByContact;
                if (c) push(`${c.fullName || 'Referral'} address`, [c.address, c.city, c.state]);
                const rc = r.referringCompany;
                if (rc) push(`${rc.companyName || 'Referring company'} address`, [rc.address, rc.area, rc.city, rc.state]);
            }

            /**
             * Our own office, LAST.
             *
             * The list used to be the client's addresses or nothing: a project with no client
             * company and no contact — which plenty of internal projects are — offered only
             * whichever stakeholder happened to be attached, and a meeting with no project at
             * all offered nothing whatsoever. But an in-person meeting still happens
             * somewhere, and when there is no client that somewhere is the office.
             *
             * Last on purpose. The first option is what an empty field opens on, and for a
             * project that HAS a client address that address is the better guess; the office
             * becomes the default only when nothing more specific exists.
             *
             * ponytail: the signed-in person's own branch, which is already in the store. Fetch
             * the full branch list if people start booking at offices they do not work from —
             * until then it is a request for a case nobody has hit, and the field is freeSolo,
             * so any address can still be typed.
             */
            if (myBranch?.address) {
                push(myBranch.name ? `${myBranch.name} office` : 'Our office', [myBranch.address]);
            }

            return out;
        }, [projectDetail, myBranch]);

        // Opening value for a newly-offline meeting: the first option, which the list orders as
        // the project's own address where there is one and our office where there is not.
        // Only when the field is still empty — never over a typed one.
        useEffect(() => {
            if (isOnline || location || !addressOptions.length) return;
            setLocation(addressOptions[0].value);
        }, [isOnline, location, addressOptions]);

        /**
         * External roster: the project's client stakeholders.
         *
         * THREE sources, not two. `projectExternalTeams` is the roster the entity's Teams tab
         * writes, and it is deliberately decoupled from the lead form's Address To
         * (`leadTeams`) — so a stakeholder added there appeared nowhere in this picker and
         * the field read "Nobody on this project" for a project that plainly had one.
         *
         * Inactive rows are dropped: somebody whose engagement has ended is not a person to
         * invite to next week's meeting.
         */
        const externalOptions: Option[] = useMemo(() => {
            if (!projectDetail) return [];
            const contactOption = (t: any) => ({
                value: t.contact.id,
                label: t.contact.fullName || t.company?.companyName || 'Unknown',
                avatar: t.contact.profilePhoto || t.contact.avatar || null,
            });
            const fromTeams = (projectDetail.leadTeams || [])
                .filter((t: any) => t.contact?.id)
                .map(contactOption);
            const fromProjectTeams = (projectDetail.projectExternalTeams || [])
                .filter((t: any) => t.contact?.id && t.isActive !== false)
                .map(contactOption);
            const fromMembers = (projectDetail.externalMembers || [])
                .filter((m: any) => m.contactId)
                .map((m: any) => ({ value: m.contactId, label: m.name || 'Unknown', avatar: null }));
            const seen = new Set<string>();
            return [...fromTeams, ...fromProjectTeams, ...fromMembers]
                .filter((o: Option) => !seen.has(o.value) && seen.add(o.value))
                .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        }, [projectDetail]);

        const filteredCompanies = companies.filter((c: any) => !companyTypeId || c.companyTypeId === companyTypeId);
        /**
         * The project's CODE and its name — "WT/OFFER/24-25/515 — Tunga Hotel at Vashi".
         *
         * The code was meant to be here all along and never appeared, because this read
         * `projectNumber` and the rows it is given carry it as `prefix`. Two other endpoints
         * rename that column to `projectNumber` on the way out because that is what it means to
         * a user; the list this picker is fed spreads the lead row untouched, so the field kept
         * its database name and the lookup quietly missed every time. So the picker showed nine
         * projects called "Baggit @ …" with nothing to tell them apart.
         *
         * Both spellings are accepted rather than one being picked, because both shapes really
         * do reach this function depending on which list resolved the project.
         *
         * Never the uuid: a project with no title is "Untitled project", not a database key.
         * Same rule as the people pickers.
         */
        const projectLabelOf = (p: any): string => {
            const code = String(p.projectNumber ?? p.prefix ?? '').trim();
            const title = String(p.title ?? '').trim();
            if (code && title) return `${code} — ${title}`;
            return code || title || 'Untitled project';
        };

        /**
         * The projects offerable here — and, always, the one already chosen.
         *
         * THE INVARIANT: whatever the filters say, the SELECTED project is in this list. An
         * Autocomplete renders its value by finding it among the options, so a selected project
         * that any filter excludes does not render as "filtered" — it renders as EMPTY, and the
         * form silently claims no project is set while holding one. That is what emptied the
         * project on an edit, and on a new meeting opened from a project's own board.
         *
         * `lockProject` used to hide this by returning every project when set, so the value was
         * always findable. Unlocking the field so people can change it took that away and
         * exposed the real bug underneath, which this fixes at the cause rather than by locking
         * the field again.
         */
        const projectOptions: Option[] = useMemo(() => {
            const opts = projects
                .filter((p: any) => {
                    // You can only schedule on a project you are on. An EMPTY set means the list
                    // has not arrived yet; filtering on it would blank the picker for a moment
                    // and read as "you are on nothing".
                    if (myProjectIds.size && !myProjectIds.has(String(p.id))) return false;
                    // Only narrow by company once a company is actually chosen. This used to
                    // drop every project with no file-location metadata even when nothing was
                    // being filtered by, which hid most of the list for no stated reason.
                    if (companyTypeId && p.fileLocationCompanyType !== companyTypeId) return false;
                    if (companyId && p.fileLocationCompany !== companyId) return false;
                    return true;
                })
                .map((p: any) => ({ value: p.id, label: projectLabelOf(p) }));

            if (projectId && !opts.some((o) => o.value === projectId)) {
                const known = projects.find((p: any) => String(p.id) === String(projectId));
                opts.unshift({
                    value: projectId,
                    // The caller's own name for the row wins — it is on screen already and
                    // needs no fetch. Otherwise the lead detail this form fetches for its
                    // roster names the project, even when the picker's list has not loaded
                    // or does not contain it.
                    label: leadName || (known ? projectLabelOf(known) : (projectDetail?.title || 'Selected project')),
                });
            }
            return opts;
        }, [projects, myProjectIds, companyTypeId, companyId, projectId, projectDetail, leadName]);

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

        /** Recomputed per render — the agenda is short and this is cheaper than memoising it. */
        const agendaWords = countWords(description);

        /** e.g. "Asia/Calcutta (UTC+5:30)" — resolved, never assumed. */
        const timeZoneLabel = useMemo(() => {
            const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const mins = -new Date().getTimezoneOffset();
            const sign = mins >= 0 ? '+' : '-';
            const abs = Math.abs(mins);
            return `${zone} (UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')})`;
        }, []);

        /**
         * What the form insists on before it will save.
         *
         * A project IS required — every meeting belongs to one. This was briefly relaxed on
         * the reasoning that an internal catch-up or a vendor call has no project and the
         * workaround would be filing it against an unrelated one; the call since has been
         * that a meeting nobody can attribute is worth less than that risk, because the
         * project's cost is built from meetings and one filed nowhere is invisible to it.
         *
         * The live consequence to know about: the picker offers only the projects you are on,
         * so somebody on none cannot book at all. The field says that rather than repeating
         * "required" at a person who has nothing to choose from.
         */
        const validate = (): string | null => {
            if (!title.trim()) return 'Title is required';
            // Every meeting belongs to a project. This reverses an earlier decision that let
            // a meeting stand alone — see the note above `projectOptions` for the cases that
            // choice was protecting, which are now expected to be filed against a project
            // like everything else.
            if (!projectId) return 'Project is required';
            if (title.trim().length > TITLE_MAX_CHARS) {
                return `Title cannot exceed ${TITLE_MAX_CHARS} characters`;
            }
            // A ten-character MINIMUM asked people to pad a name that was already clear —
            // "Standup" and "1:1" are both perfectly good titles and neither could be saved.
            if (countWords(description) > AGENDA_MAX_WORDS) {
                return `Agenda cannot exceed ${AGENDA_MAX_WORDS} words`;
            }
            if (!startDate) return 'Start date is required';
            if (!endDate) return 'End date is required';
            if (!dayjs(startDate).isAfter(dayjs().subtract(1, 'minute'))) return 'Meeting cannot be scheduled in the past';
            if (!dayjs(endDate).isAfter(dayjs(startDate))) return 'End date must be after start date';
            // Link, location, participants and the agenda are all optional — see the note on
            // TITLE_MAX_CHARS. Each was a wall between somebody and a booked slot for a
            // detail they routinely do not have yet, and none of them is a thing the record
            // is meaningless without.
            return null;
        };

        useImperativeHandle(ref, () => ({
            submit: async () => {
                setTouched(true);
                const problem = validate();
                if (problem) { setError(problem); return false; }
                setError(null);
                const payload = {
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
                    // `undefined` = everyone (the server's own default), `[]` = nobody.
                    notifyIds: notify ? (notifyIds ?? undefined) : [],
                };
                /**
                 * Reminders are saved AFTER the meeting, and a failure here does not fail the
                 * save: the meeting is the thing that must not be lost, and a reminder that
                 * did not stick is recoverable from the bell on the list. It is a separate
                 * call because reminders are per person — they are not a property of the
                 * meeting the organizer is writing.
                 */
                const saveReminders = async (meetingId: string) => {
                    try {
                        await setMyMeetingReminders(meetingId, employeeId, reminders);
                    } catch (e) {
                        console.error('Meeting saved, but your reminders were not', e);
                    }
                };

                try {
                    if (editing) {
                        await updateMeeting(editing.id, employeeId, payload);
                        await saveReminders(editing.id);
                        onSaved?.();
                        return true;
                    }
                    const response = await createMeetings(payload);
                    if (response?.statusCode !== 201) { setError('Failed to create meeting'); return false; }
                    if (reminders.length && response?.data?.id) await saveReminders(response.data.id);
                    // The calendar listens for this to drop the new meeting onto the grid without
                    // a refetch — kept from the old form, since its listener is still there.
                    document.dispatchEvent(new CustomEvent('meetingAdded', { detail: response.data }));
                    onSaved?.();
                    return true;
                } catch (e) {
                    console.error(editing ? 'Error updating meeting' : 'Error creating meeting', e);
                    // The API refuses anyone but the organizer, and that is the failure a person
                    // is most likely to hit here — so say which it was.
                    // The server says why; guessing here turned every failed save into a
                    // permission complaint, including the ones that were not.
                    const detail = (e as any)?.response?.data?.message;
                    setError(detail || (editing ? 'Could not save the meeting' : 'Failed to create meeting'));
                    return false;
                }
            },
        }));

        /**
         * Who can be written to: the people ON this meeting, internal and external.
         *
         * Not the whole directory — a notice about a meeting has exactly one audience, and
         * offering more would let somebody mail a person who is not invited. External contacts
         * are included because they receive these mails today; leaving them out of the picker
         * would mean the one group that cannot be un-selected is the one outside the company.
         */
        const notifyOptions: Option[] = useMemo(() => {
            const picked = new Set([...internal, ...external]);
            return [...internalOptions, ...externalOptions].filter((o) => picked.has(o.value));
        }, [internal, external, internalOptions, externalOptions]);

        // Selecting nobody is a real answer, so the toggle carries "send at all" and the
        // picker carries "to whom" — collapsing the two would make an empty picker ambiguous.
        const notifySelection = notifyIds ?? notifyOptions.map((o) => o.value);

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
                    error={touched && !title.trim()}
                    // The count only appears once it is worth knowing about. A counter sitting
                    // under an empty field is a limit announced before anyone has approached
                    // it, and `maxLength` means most people never see this at all — typing
                    // simply stops, which is a kinder ceiling than an error after the fact.
                    helperText={title.length >= TITLE_MAX_CHARS - 5
                        ? `${title.length} / ${TITLE_MAX_CHARS} characters`
                        : ' '}
                    inputProps={{ 'aria-label': 'Meeting title', maxLength: TITLE_MAX_CHARS }}
                    sx={{ '& .MuiInputBase-input': { fontSize: 15, fontWeight: 600, py: 1.25 } }}
                />

                {/* The project — or the LEAD — stated rather than asked, when the screen already
                    decided it. The chip is not decoration: this same line otherwise reads as
                    "some project", and a lead that has not become one is a different thing to
                    everybody downstream of the booking. */}
                {lockProject && projectLabel ? (
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: -1, mb: 2 }}>
                        <Box sx={{ color: leadName ? TRIO.amber.c : TRIO.purple.c, lineHeight: 0 }}>
                            <KTIcon iconName={leadName ? 'abstract-26' : 'briefcase'} className="fs-6" />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                            {projectLabel}
                        </Typography>
                        {leadName && <ToneChip dense tone="warning" label="Lead" />}
                    </Stack>
                ) : (
                    <Box sx={{ mb: 2 }}>
                        <L text="Project *" icon="briefcase" trio={TRIO.purple} />
                        <Autocomplete
                            size="small" fullWidth
                            options={projectOptions}
                            value={projectOptions.find((o) => o.value === projectId) || null}
                            onChange={(_, picked) => setProjectId(picked?.value || '')}
                            getOptionLabel={(o) => o.label}
                            isOptionEqualToValue={(o, v) => o.value === v.value}
                            ListboxProps={{ sx: menuOptionSx }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Search project"
                                    error={touched && !projectId}
                                    // Named rather than left to the banner: the picker only
                                    // offers projects you are ON, so "required" and "empty"
                                    // can mean you have nothing to pick, which is a different
                                    // problem from not having picked.
                                    helperText={touched && !projectId
                                        ? (projectOptions.length
                                            ? 'Choose the project this meeting belongs to'
                                            : 'You are not on any project yet — ask to be added to one')
                                        : ' '}
                                />
                            )}
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

                {/* The pickers ARE the chip row. There used to be a summary row of faces
                    above them, which rendered the same people the Internal Team field was
                    already rendering — so every participant appeared twice and the form read
                    as if each of them had been added twice over. What the summary uniquely
                    offered was the shortcut, so that is what is kept. */}
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <L text="Participants" icon="profile-user" trio={TRIO.green} />
                    </Box>
                    {internalOptions.length > 0 && internal.length < internalOptions.length && (
                        <Button
                            size="small"
                            onClick={() => setInternal(internalOptions.map((o) => o.value))}
                            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0, mb: 0.75 }}
                        >
                            Add whole team
                        </Button>
                    )}
                </Stack>
                <Grid container spacing={1.5} sx={{ mb: 2 }}>
                    <Grid item xs={12} sm={6}>
                        {peoplePicker('Internal Team', internalOptions, internal, setInternal, '', false)}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        {peoplePicker('External Team', externalOptions, external, setExternal, '', false)}
                    </Grid>
                </Grid>

                <L text="Agenda" icon="notepad-edit" trio={TRIO.cyan} />
                <TextField
                    fullWidth size="small" multiline minRows={3}
                    placeholder="Optional"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    error={agendaWords > AGENDA_MAX_WORDS}
                    // Words cannot be capped by `maxLength` the way characters can — you would
                    // be cutting somebody off mid-word — so this one is counted and refused at
                    // save, and the count appears in the last quarter so the wall is visible
                    // before it is hit.
                    helperText={agendaWords > AGENDA_MAX_WORDS * 0.75
                        ? `${agendaWords} / ${AGENDA_MAX_WORDS} words`
                        : ' '}
                    inputProps={{ 'aria-label': 'Agenda' }}
                />

                {/* ── the two things that happen after you save ──
                    This one is about YOU, the next is about them. Paired on purpose: both are
                    decisions you make once the meeting itself is right, and neither belongs
                    among the fields that describe the meeting. */}
                <Box sx={{ mt: 2 }}>
                    <L text="Remind me" icon="notification-bing" trio={TRIO.amber} />
                    <ReminderChips picked={reminders} onChange={setReminders} sent={remindersSent} />
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
                        {remindersSent.length
                            ? 'Only you get these. Ticked ones have already been sent.'
                            : 'Only you get these. Everyone on the meeting sets their own.'}
                    </Typography>
                </Box>

                {/* ── who hears about this ──
                    Placed last on purpose: it is the decision you make once the meeting itself
                    is right, and putting it above the details invited people to send a notice
                    about something they were still editing. */}
                <Box sx={{ mt: 2.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ color: TRIO.blue.c, lineHeight: 0 }}>
                            <KTIcon iconName="sms" className="fs-6" />
                        </Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', flex: 1 }}>
                            {editing ? 'Send an update email' : 'Send the invitation email'}
                        </Typography>
                        <WtSwitch
                            size="sm"
                            tone={TRIO.blue.c}
                            checked={notify}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotify(e.target.checked)}
                            inputProps={{ 'aria-label': 'Send email' }}
                        />
                    </Stack>

                    {notify && (
                        notifyOptions.length === 0 ? (
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                                Add people to the meeting and they can be notified here.
                            </Typography>
                        ) : (
                            <Box sx={{ mt: 1.25 }}>
                                <Autocomplete
                                    multiple size="small" fullWidth disableCloseOnSelect
                                    options={notifyOptions}
                                    value={notifyOptions.filter((o) => notifySelection.includes(o.value))}
                                    onChange={(_, picked) => setNotifyIds(picked.map((p) => p.value))}
                                    getOptionLabel={(o) => o.label}
                                    isOptionEqualToValue={(o, v) => o.value === v.value}
                                    ListboxProps={{ sx: menuOptionSx }}
                                    renderTags={(picked, getTagProps) => picked.map((o, i) => (
                                        <Chip {...getTagProps({ index: i })} key={o.value} size="small" avatar={chipAvatar(o)} label={o.label} />
                                    ))}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Email goes to" placeholder="Nobody selected" />
                                    )}
                                />
                                {notifySelection.length === 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main' }}>
                                        Nobody selected — no email will be sent.
                                    </Typography>
                                )}
                            </Box>
                        )
                    )}
                </Box>

                <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'text.secondary' }}>
                    Times shown in {timeZoneLabel} · stored in UTC
                </Typography>
            </Box>
        );
    },
);

MeetingFormBody.displayName = 'MeetingFormBody';

export default MeetingFormBody;
