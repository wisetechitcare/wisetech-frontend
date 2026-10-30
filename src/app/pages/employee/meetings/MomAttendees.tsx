import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import { AppIcon, WtButton, WtIconButton, WtSelect } from '@app/modules/common/components/ui';
import {
  fetchPage as searchContacts,
  projectContactOptions,
  type ContactOption,
} from '@app/modules/common/components/ui/ContactPicker';
import { useEmployeeDirectory } from '@app/modules/common/components/EmployeePickerField';
import { getLeadById } from '@services/leadService';
import { updateMeetingMinutesDraft } from '@services/meetingAgendaMom';
import { apiErrorMessage } from '@utils/apiError';
import { getAvatar } from '@utils/avatar';
import { rosterFirst, sectioned, type PickOption } from './momAttendeeOptions';

// Heavy (the full contact wizard) — only downloaded when someone clicks "Add to contacts".
const ClientContactsForm = lazy(() => import('../companies/contacts/components/ClientContactsForm'));

export type MomAttendee = {
  side: 'INTERNAL' | 'EXTERNAL';
  employeeId?: string | null;
  contactId?: string | null;
  name: string;
  /** Display only — the server reads contact photos fresh; never saved. */
  avatar?: string | null;
  gender?: string | null;
};

type Side = MomAttendee['side'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** A typed request every ~4 letters is plenty; the server pages 25 at a time. */
const SEARCH_DEBOUNCE_MS = 250;

const C = {
  ink: '#0F172A',
  mute: '#64748B',
  line: '#E2E8F0',
  paper: '#FFFFFF',
  slate: '#F1F5F9',
};

/**
 * MoM → Attendees: Internal Team | External Team.
 *
 * Starts as the meeting's invitees (the server derives them until the first edit). Adding
 * someone who was not invited: internal offers the project team first, then every active
 * employee; external offers the project's external team first, then the address book —
 * searched on the server, never loaded whole. Anybody not on record can be typed in by name.
 */
export default function MomAttendees({
  meetingId,
  projectId,
  attendees,
  editable,
  teamIds,
  onError,
}: {
  meetingId: string;
  projectId: string | null;
  attendees: MomAttendee[];
  editable: boolean;
  /** Project's internal team (employee ids), when the meeting has a project. */
  teamIds: Set<string> | null;
  onError: (m: string) => void;
}) {
  const [list, setList] = useState<MomAttendee[]>(attendees);
  const savedKey = JSON.stringify(attendees);
  useEffect(() => {
    setList(JSON.parse(savedKey));
  }, [savedKey]);

  const save = async (next: MomAttendee[]) => {
    const prev = list;
    setList(next);
    try {
      await updateMeetingMinutesDraft(meetingId, { attendees: next });
    } catch (e: any) {
      setList(prev);
      onError(apiErrorMessage(e, 'Could not save attendees'));
    }
  };

  const add = (side: Side, opt: PickOption | null) => {
    if (!opt) return;
    const person: MomAttendee = opt.__isNew__
      ? { side, name: String(opt.value).trim() }
      : side === 'INTERNAL'
        ? { side, employeeId: opt.value, name: opt.label }
        : { side, contactId: opt.value, name: opt.name || opt.label, avatar: opt.avatar };
    if (!person.name) return;
    const dup = list.some(
      (a) =>
        a.side === side &&
        ((person.employeeId && a.employeeId === person.employeeId) ||
          (person.contactId && a.contactId === person.contactId) ||
          (!person.employeeId && !person.contactId && a.name.toLowerCase() === person.name.toLowerCase())),
    );
    if (!dup) void save([...list, person]);
  };

  const remove = (index: number) => void save(list.filter((_, i) => i !== index));

  // A typed-in external name being saved to Contacts; once created, the row links to it.
  const [contactFor, setContactFor] = useState<number | null>(null);
  const linkContact = (index: number, contact: any) => {
    if (!contact?.id) return;
    void save(
      list.map((a, i) =>
        i === index
          ? { side: 'EXTERNAL', contactId: contact.id, name: contact.fullName || a.name, avatar: contact.profilePhoto }
          : a,
      ),
    );
  };

  // Employee photos and designations come from the directory the app already caches.
  const { data: directory = [] } = useEmployeeDirectory();
  const employeeById = useMemo(() => new Map(directory.map((e) => [e.id, e])), [directory]);

  const column = (side: Side, title: string, picker: React.ReactNode) => {
    // A–Z; `i` stays the index in `list` so removing a row removes the right person.
    const rows = list
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => a.side === side)
      .sort((x, y) => x.a.name.localeCompare(y.a.name, undefined, { sensitivity: 'base' }));
    return (
      <Box sx={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Typography
          sx={{
            px: 1.5,
            py: 1.1,
            fontSize: 11.5,
            fontWeight: 700,
            color: C.mute,
            bgcolor: C.slate,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          {title} ({rows.length})
        </Typography>
        {rows.length === 0 ? (
          <Typography sx={{ px: 1.5, py: 1.5, fontSize: 13, color: C.mute }}>
            {side === 'INTERNAL' ? 'No one from the team recorded.' : 'No external attendees recorded.'}
          </Typography>
        ) : (
          <ScrollRows count={rows.length}>
          {rows.map(({ a, i }, n) => {
            const emp = a.employeeId ? employeeById.get(a.employeeId) : undefined;
            const typed = !a.employeeId && !a.contactId;
            const caption = typed
              ? 'Not on record'
              : emp?.designation || (side === 'INTERNAL' ? 'Employee' : 'Contact');
            return (
              <Stack
                key={`${a.employeeId || a.contactId || a.name}:${i}`}
                direction="row"
                alignItems="center"
                spacing={1.25}
                sx={{ px: 1.5, height: ROW_H, borderBottom: `1px solid ${C.line}` }}
              >
                <Typography sx={{ width: 18, fontSize: 12, color: C.mute, textAlign: 'right', flexShrink: 0 }}>
                  {n + 1}
                </Typography>
                <Avatar
                  // Contacts without a photo get the same silhouette employees do.
                  src={emp?.avatar || (a.contactId ? getAvatar(a.avatar || '', (a.gender ?? 0) as any) : undefined)}
                  alt=""
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: typed ? C.paper : C.slate,
                    color: C.mute,
                    border: typed ? `1px dashed ${C.mute}` : `1px solid ${C.line}`,
                  }}
                >
                  {initials(a.name)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>
                    {a.name}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 11.5, color: C.mute, fontStyle: typed ? 'italic' : 'normal' }}>
                    {caption}
                  </Typography>
                </Box>
                {editable && typed && side === 'EXTERNAL' && (
                  <WtButton size="small" inverted onClick={() => setContactFor(i)} sx={{ flexShrink: 0 }}>
                    + Add to contacts
                  </WtButton>
                )}
                {editable && (
                  <WtIconButton
                    title={`Remove ${a.name}`}
                    color="#DC2626"
                    onClick={() => remove(i)}
                    sx={{ width: 30, height: 30, borderRadius: '10px', flexShrink: 0 }}
                  >
                    <AppIcon name="bi-trash" fallbackSize={13} />
                  </WtIconButton>
                )}
              </Stack>
            );
          })}
          </ScrollRows>
        )}
        {editable && <Box sx={{ p: 1.5, mt: 'auto' }}>{picker}</Box>}
      </Box>
    );
  };

  return (
    <Box sx={{ bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5, overflow: 'hidden' }}>
      {contactFor !== null && list[contactFor] && (
        <Suspense fallback={null}>
          <ClientContactsForm
            show
            initialData={{ fullName: list[contactFor].name }}
            onCreated={(contact) => linkContact(contactFor, contact)}
            onClose={() => setContactFor(null)}
          />
        </Suspense>
      )}
      <Typography sx={{ px: 1.5, pt: 1.5, pb: 1, fontWeight: 800, fontSize: 14, color: C.ink }}>
        Attendees
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          borderTop: `1px solid ${C.line}`,
          '& > :first-of-type': {
            borderRight: { md: `1px solid ${C.line}` },
            borderBottom: { xs: `1px solid ${C.line}`, md: 0 },
          },
        }}
      >
        {column(
          'INTERNAL',
          'Internal Team',
          <InternalPicker
            presentIds={new Set(list.filter((a) => a.employeeId).map((a) => String(a.employeeId)))}
            teamIds={teamIds}
            onPick={(o) => add('INTERNAL', o)}
          />,
        )}
        {column(
          'EXTERNAL',
          'External Team',
          <ExternalPicker
            projectId={projectId}
            presentIds={new Set(list.filter((a) => a.contactId).map((a) => String(a.contactId)))}
            onPick={(o) => add('EXTERNAL', o)}
          />,
        )}
      </Box>
    </Box>
  );
}

const ROW_H = 52;
const VISIBLE_ROWS = 5;

/**
 * Caps a column at five people and scrolls the rest. While anyone is hidden below, the last
 * row fades out and a "N more" pill sits on it — clicking it scrolls down.
 */
function ScrollRows({ count, children }: { count: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hiddenBelow, setHiddenBelow] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const below = el.scrollHeight - el.scrollTop - el.clientHeight;
    setHiddenBelow(below > 4 ? Math.ceil(below / ROW_H) : 0);
  }, []);

  useEffect(measure, [count, measure]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        ref={ref}
        onScroll={measure}
        sx={{ maxHeight: ROW_H * VISIBLE_ROWS, overflowY: 'auto', overscrollBehavior: 'contain' }}
      >
        {children}
      </Box>
      {hiddenBelow > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 44,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            pb: 0.75,
            pointerEvents: 'none',
            background: (t) =>
              `linear-gradient(to bottom, transparent, ${t.palette.background.paper} 85%)`,
          }}
        >
          <Box
            component="button"
            type="button"
            aria-label={`Scroll to see ${hiddenBelow} more`}
            onClick={() => ref.current?.scrollBy({ top: ROW_H * 3, behavior: 'smooth' })}
            sx={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              border: '1px solid',
              borderColor: 'primary.light',
              bgcolor: 'background.paper',
              color: 'primary.main',
              borderRadius: 999,
              px: 1.25,
              py: 0.25,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(29,78,216,0.15)',
              '&:focus-visible': { outline: '2px solid #1D4ED8', outlineOffset: 2 },
            }}
          >
            {hiddenBelow} more
            <KeyboardArrowDownRounded sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      )}
    </Box>
  );
}

const typedLabel = (input: string) => `Add “${input}” (not on record)`;

function InternalPicker({
  presentIds,
  teamIds,
  onPick,
}: {
  presentIds: Set<string>;
  teamIds: Set<string> | null;
  onPick: (o: PickOption | null) => void;
}) {
  const { data: directory = [], isLoading } = useEmployeeDirectory();
  const everyone = useMemo<PickOption[]>(
    () =>
      directory
        .map((e) => ({ value: e.id, label: e.name, avatar: e.avatar, description: e.designation }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [directory],
  );
  const presentKey = [...presentIds].join('|');
  const options = useMemo(
    () => rosterFirst(everyone, teamIds, new Set(presentKey ? presentKey.split('|') : []), [
      'Project team',
      'All employees',
    ]),
    [everyone, teamIds, presentKey],
  );
  return (
    <WtSelect
      size="sm"
      options={options}
      value={null}
      isLoading={isLoading}
      isSearchable
      isCreatable
      formatCreateLabel={typedLabel}
      optionVariant="avatar"
      placeholder="Add someone who attended…"
      ariaLabel="Add internal attendee"
      onChange={onPick}
    />
  );
}

function ExternalPicker({
  projectId,
  presentIds,
  onPick,
}: {
  projectId: string | null;
  presentIds: Set<string>;
  onPick: (o: PickOption | null) => void;
}) {
  const [roster, setRoster] = useState<ContactOption[]>([]);
  const [rosterFor, setRosterFor] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<ContactOption[]>([]);
  const [searching, setSearching] = useState(false);

  // The project's external team, fetched once — the first time the menu opens.
  useEffect(() => {
    if (!projectId || !open || rosterFor === projectId) return;
    let cancelled = false;
    getLeadById(projectId)
      .then((res: any) => {
        if (cancelled) return;
        setRoster(projectContactOptions(res?.data?.data?.lead ?? res?.data?.lead));
        setRosterFor(projectId);
      })
      .catch(() => {
        if (!cancelled) setRoster([]);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, open, rosterFor]);

  // Address-book search: server side, one page, only while the menu is open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchContacts(query, 1);
        if (!cancelled) setFound(res.rows);
      } catch {
        if (!cancelled) setFound([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, open]);

  const options = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const rosterIds = new Set(roster.map((r) => r.value));
    const toOpt = (c: ContactOption): PickOption => ({
      value: c.value,
      label: c.label,
      name: c.name,
      avatar: c.avatar ?? null,
      description: c.caption,
    });
    // The roster never went through the server search, so it is narrowed here.
    const rosterMatches = roster
      .filter((r) => !presentIds.has(r.value))
      .filter((r) => words.every((w) => r.label.toLowerCase().includes(w)))
      .map(toOpt);
    const contacts = found
      .filter((c) => !presentIds.has(c.value) && !rosterIds.has(c.value))
      .map(toOpt);
    const out = sectioned([
      ['Project external team', rosterMatches],
      ['Contacts', contacts],
    ]);
    // A row, not WtSelect's `isLoading` — that disables the control mid-typing.
    return searching
      ? [...out, { value: '__searching', label: 'Searching contacts…', isDisabled: true }]
      : out;
  }, [roster, found, query, presentIds, searching]);

  return (
    <WtSelect
      size="sm"
      options={options}
      value={null}
      isSearchable
      isCreatable
      formatCreateLabel={typedLabel}
      optionVariant="avatar"
      placeholder="Add someone who attended…"
      ariaLabel="Add external attendee"
      // The server already matched on name, company, phone and email; re-filtering on the
      // label here would drop the rows it found by phone or email.
      filterOption={() => true}
      onInputChange={setQuery}
      onMenuOpen={() => setOpen(true)}
      onMenuClose={() => setOpen(false)}
      onChange={onPick}
    />
  );
}
