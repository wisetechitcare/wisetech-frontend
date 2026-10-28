import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import FlagRounded from '@mui/icons-material/FlagRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import dayjs from 'dayjs';
import { hasPermission } from '@utils/authAbac';
import { apiErrorMessage } from '@utils/apiError';
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from '@constants/statistics';
import {
  AppIcon,
  WtButton,
  WtCheckbox,
  WtDateField,
  WtIconButton,
  WtSelect,
  type WtSelectOption,
} from '@app/modules/common/components/ui';
import { useEmployeeDirectory } from '@app/modules/common/components/EmployeePickerField';
import MeetingDialog from '../../MeetingDialog';
import MomAttendees from '../MomAttendees';
import TaskPathSelect, { buildTaskPathOptions } from '../../tasks/components/TaskPathSelect';
import { usePresetTasks } from '../../tasks/useTaskQueries';
import { useProjectDeliverables } from '../../tasks/useProjectDeliverables';
import { getPresetSubtreeIds } from '@utils/presetTaskHierarchy';
import type { PresetTask } from '../../tasks/taskDomain';
import { getProjectTeam } from '@services/tasks';
import {
  convertAgendaToMom,
  createAgendaItem,
  createAgendaItemsBulk,
  createMeetingMinutesDraft,
  deleteAgendaItem,
  downloadMeetingMinutesPdf,
  getAgendaItems,
  getCompanyAgendaStatuses,
  getMeetingDetail,
  getMeetingMinutes,
  getMeetingsAgendaHub,
  updateAgendaItem,
  updateMeetingPurpose,
} from '@services/meetingAgendaMom';

type HubMeeting = {
  id: string;
  title: string;
  startDate?: string | Date;
  endDate?: string | Date;
  location?: string | null;
  meetingLink?: string | null;
  meetingMode?: string | null;
  isOnline?: boolean;
  purposeLabel?: string | null;
  purposeCodes?: string[];
  purposeLabels?: string[];
  projectId?: string | null;
  description?: string | null;
  agendaCount: number;
  hasAgenda: boolean;
  isOverdue: boolean;
  isUpcoming: boolean;
  isPast: boolean;
};

type DetailCache = {
  meeting: any;
  permissions: any;
  items: any[];
  minutes: any | null;
  purposeOptions: Array<{ code: string; label: string; requiresOther?: boolean }>;
};

type FilterKey = 'all' | 'upcoming' | 'past' | 'withAgenda' | 'noAgenda' | 'overdue';

const C = {
  ink: '#0F172A',
  mute: '#64748B',
  line: '#E2E8F0',
  paper: '#FFFFFF',
  page: '#F8FAFC',
  blue: '#1D4ED8',
  blueSoft: '#EFF6FF',
  blueEdge: '#2563EB',
  green: '#159A5A',
  greenWash: '#DCFCE7',
  amber: '#D97706',
  amberWash: '#FFEDD5',
  slate: '#F1F5F9',
};

/** Clear (X) collapses until hover/focus so the assignee name + avatar stay readable. */
const assigneeSelectSx = {
  minWidth: 168,
  '& .react-select__clear-indicator': {
    opacity: 0,
    width: 0,
    padding: 0,
    overflow: 'hidden',
    transition: 'opacity .12s ease',
  },
  '&:hover .react-select__clear-indicator, &:focus-within .react-select__clear-indicator': {
    opacity: 1,
    width: 'auto',
    padding: '6px',
  },
  '& .react-select__single-value': {
    maxWidth: '100%',
  },
} as const;

const fmtDate = (v?: string | Date | null) => (v ? dayjs(v).format('DD MMM YYYY') : '—');
const fmtTime = (v?: string | Date | null) => (v ? dayjs(v).format('HH:mm') : '—');
const errMsg = (e: unknown) => apiErrorMessage(e);

/** Every word in the query must appear somewhere in the haystack. */
const matchesQuery = (haystack: string, query: string) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = haystack.toLowerCase();
  return words.every((w) => hay.includes(w));
};

const placeLabel = (m: HubMeeting | any) => {
  if (m?.location) return m.location;
  if (m?.meetingLink || m?.isOnline || m?.meetingMode === 'ONLINE' || m?.meetingMode === 'HYBRID') {
    return 'Online Meeting';
  }
  return '—';
};

/** Shared by the Agenda and Minutes of Meeting tables. */
const agendaTableSx = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
  '& th': {
    textAlign: 'left',
    px: 1.5,
    py: 1.1,
    color: C.mute,
    fontWeight: 700,
    fontSize: 11.5,
    bgcolor: C.slate,
    borderBottom: `1px solid ${C.line}`,
    whiteSpace: 'nowrap',
  },
  '& td': {
    px: 1.5,
    py: 1.25,
    borderBottom: `1px solid ${C.line}`,
    verticalAlign: 'middle',
    color: C.ink,
  },
  '& tbody tr:last-of-type td': { borderBottom: 0 },
} as const;

/**
 * Meetings → Agenda: master–detail hub.
 * Left list stays mounted; selection is instant; detail is cached + prefetched.
 */
export default function MeetingsAgendaHubTab() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const [searchParams, setSearchParams] = useSearchParams();
  const canCreate = hasPermission(
    resourceNameMapWithCamelCase.meeting,
    permissionConstToUseWithHasPermission.create,
  );

  const [meetings, setMeetings] = useState<HubMeeting[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    upcoming: 0,
    past: 0,
    withAgenda: 0,
    noAgenda: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelParam = searchParams.get('panel');
  const [detailTab, setDetailTab] = useState<'overview' | 'agenda' | 'mom'>(
    panelParam === 'mom' ? 'mom' : panelParam === 'overview' ? 'overview' : 'agenda',
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, DetailCache>>({});
  const [showNew, setShowNew] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);

  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadHub = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await getMeetingsAgendaHub();
      const list: HubMeeting[] = res.meetings || [];
      setMeetings(list);
      setCounts(res.counts || {
        all: list.length,
        upcoming: 0,
        past: 0,
        withAgenda: 0,
        noAgenda: 0,
        overdue: 0,
      });
      return list;
    } catch (e: any) {
      if (!opts?.silent) {
        setError(apiErrorMessage(e, 'Could not load meetings'));
      }
      return [] as HubMeeting[];
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await loadHub();
      if (cancelled) return;
      const fromUrl = searchParams.get('meeting');
      const pick =
        (fromUrl && list.some((m) => m.id === fromUrl) && fromUrl)
        || (!isMobile ? list[0]?.id : null)
        || null;
      if (pick) {
        setSelectedId(pick);
        if (isMobile && fromUrl) setMobileDetail(true);
      }
      const panel = searchParams.get('panel');
      if (panel === 'mom' || panel === 'agenda' || panel === 'overview') {
        setDetailTab(panel);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reloadToken drives refresh
  }, [loadHub, reloadToken, isMobile]);

  const filtered = useMemo(() => {
    return meetings.filter((m) => {
      if (filter === 'upcoming' && !m.isUpcoming) return false;
      if (filter === 'past' && !m.isPast) return false;
      if (filter === 'withAgenda' && !m.hasAgenda) return false;
      if (filter === 'noAgenda' && m.hasAgenda) return false;
      if (filter === 'overdue' && !m.isOverdue) return false;
      if (!query.trim()) return true;
      const hay = [
        m.title,
        m.purposeLabel,
        m.location,
        placeLabel(m),
        m.startDate ? dayjs(m.startDate).format('DD MMM YYYY ddd') : '',
        m.agendaCount ? `${m.agendaCount} agenda` : 'no agenda',
      ].filter(Boolean).join(' ');
      return matchesQuery(hay, query);
    });
  }, [meetings, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, HubMeeting[]>();
    for (const m of filtered) {
      const key = dayjs(m.startDate).format('MMMM YYYY');
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  const selectedMeeting = useMemo(
    () => meetings.find((m) => m.id === selectedId) || null,
    [meetings, selectedId],
  );
  const cached = selectedId ? cache[selectedId] : undefined;

  const loadDetail = useCallback(async (
    meetingId: string,
    opts?: { silent?: boolean; force?: boolean },
  ) => {
    if (!opts?.force && cacheRef.current[meetingId]) {
      if (!opts?.silent) setDetailLoading(false);
      return cacheRef.current[meetingId];
    }
    // Only a foreground load (the meeting on screen) supersedes the previous foreground load.
    // A background prefetch must never cancel it — that left the spinner on forever, because
    // the cancelled load skipped clearing it and a silent prefetch never clears it.
    const ac = new AbortController();
    if (!opts?.silent) {
      abortRef.current?.abort();
      abortRef.current = ac;
      setDetailLoading(true);
    }
    try {
      const [d, agenda, mom] = await Promise.all([
        getMeetingDetail(meetingId),
        getAgendaItems(meetingId),
        getMeetingMinutes(meetingId).catch(() => ({ minutes: null })),
      ]);
      // A superseded load still fetched good data — keep it, it is this meeting's detail.
      const next: DetailCache = {
        meeting: d.data?.meeting,
        permissions: d.data?.permissions,
        items: agenda.items || [],
        minutes: mom?.minutes ?? null,
        purposeOptions: d.purposeOptions || [],
      };
      setCache((prev) => ({ ...prev, [meetingId]: next }));
      return next;
    } catch (e: any) {
      // Prefetch failures stay quiet; the meeting will load (and report) when opened.
      if (!opts?.silent && !ac.signal.aborted) {
        setError(apiErrorMessage(e, 'Could not load meeting detail'));
      }
      return null;
    } finally {
      // The newest foreground load owns the spinner.
      if (!opts?.silent && abortRef.current === ac) setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
    if (searchParams.get('meeting') === selectedId) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('meeting', selectedId);
        return next;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync URL when selection changes
  }, [selectedId, loadDetail]);

  // Prefetch neighbors for lag-free switching
  useEffect(() => {
    if (!selectedId || filtered.length === 0) return;
    const idx = filtered.findIndex((m) => m.id === selectedId);
    const neighbors = [filtered[idx - 1]?.id, filtered[idx + 1]?.id].filter(Boolean) as string[];
    const t = window.setTimeout(() => {
      neighbors.forEach((id) => {
        if (!cacheRef.current[id]) void loadDetail(id, { silent: true });
      });
    }, 180);
    return () => window.clearTimeout(t);
  }, [selectedId, filtered, loadDetail]);

  const selectMeeting = (id: string) => {
    if (id !== selectedId) {
      setSelectedId(id);
      setDetailTab('agenda');
      if (!cacheRef.current[id]) setDetailLoading(true);
    }
    if (isMobile) setMobileDetail(true);
  };

  const backToList = () => setMobileDetail(false);

  /** Soft refresh — never flips hub `loading` (that unmounted the whole page). */
  const refreshSelected = async () => {
    if (!selectedId) return;
    await loadDetail(selectedId, { force: true, silent: true });
    await loadHub({ silent: true });
  };

  /** Patch one agenda row in cache — no hub reload, no full-page spinner. */
  const patchCachedItem = useCallback((meetingId: string, itemId: string, patch: Record<string, unknown>) => {
    setCache((prev) => {
      const cur = prev[meetingId];
      if (!cur) return prev;
      return {
        ...prev,
        [meetingId]: {
          ...cur,
          items: cur.items.map((it: any) => (it.id === itemId ? { ...it, ...patch } : it)),
        },
      };
    });
  }, []);

  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'upcoming', label: 'Upcoming', count: counts.upcoming },
    { key: 'past', label: 'Past', count: counts.past },
    { key: 'withAgenda', label: 'With Agenda', count: counts.withAgenda },
    { key: 'noAgenda', label: 'No Agenda', count: counts.noAgenda },
    { key: 'overdue', label: 'Overdue', count: counts.overdue },
  ];

  if (loading) {
    return (
      <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const showList = !isMobile || !mobileDetail;
  const showDetail = !isMobile || mobileDetail;

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, 380px) minmax(0, 1fr)' },
        gap: 0,
        minHeight: { lg: 'calc(100vh - 220px)' },
        borderTop: `1px solid ${C.line}`,
        bgcolor: C.page,
        position: 'relative',
      }}
    >
      {error && (
        <Alert
          severity="error"
          sx={{ gridColumn: '1 / -1', m: 1.5, mb: 0 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* ── Left: meetings list ── */}
      <Box
        sx={{
          borderRight: { lg: `1px solid ${C.line}` },
          bgcolor: C.paper,
          display: showList ? 'flex' : 'none',
          flexDirection: 'column',
          minHeight: 0,
          maxHeight: { lg: 'calc(100vh - 220px)' },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, pt: 2, pb: 1.25 }}
        >
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: C.ink }}>
            Meetings ({counts.all})
          </Typography>
          {canCreate && !isMobile && (
            <WtButton size="small" onClick={() => setShowNew(true)}>
              + New Meeting
            </WtButton>
          )}
        </Stack>

        <Box sx={{ px: 2, pb: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search meetings…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ fontSize: 18, color: C.mute }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: C.slate,
                borderRadius: 2,
                fontSize: 13,
              },
            }}
          />
        </Box>

        <Stack
          direction="row"
          flexWrap="wrap"
          useFlexGap
          spacing={0.75}
          sx={{ px: 2, pb: 1.5 }}
        >
          {filterChips.map((chip) => {
            const active = filter === chip.key;
            return (
              <Box
                key={chip.key}
                component="button"
                type="button"
                onClick={() => setFilter(chip.key)}
                sx={{
                  border: `1px solid ${active ? C.blueEdge : C.line}`,
                  bgcolor: active ? C.blueSoft : C.paper,
                  color: active ? C.blue : C.mute,
                  borderRadius: 999,
                  px: 1.1,
                  py: 0.35,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  lineHeight: 1.4,
                }}
              >
                {chip.label} ({chip.count})
              </Box>
            );
          })}
        </Stack>

        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: 2 }}>
          {grouped.length === 0 ? (
            <Alert severity="info" sx={{ mx: 0.75 }}>
              No meetings match this filter.
            </Alert>
          ) : (
            grouped.map(([month, rows]) => (
              <Box key={month} sx={{ mb: 1.5 }}>
                <Typography
                  sx={{
                    px: 1,
                    py: 0.75,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: C.mute,
                  }}
                >
                  {month}
                </Typography>
                <Stack spacing={0.75}>
                  {rows.map((m) => (
                    <MeetingListCard
                      key={m.id}
                      meeting={m}
                      selected={m.id === selectedId}
                      onSelect={() => selectMeeting(m.id)}
                    />
                  ))}
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Box>

      {/* ── Right: detail — height follows content (no empty stretch). ── */}
      <Box
        sx={{
          minWidth: 0,
          alignSelf: { lg: 'start' },
          width: '100%',
          maxHeight: { lg: 'calc(100vh - 220px)' },
          overflowY: 'auto',
          bgcolor: C.page,
          p: { xs: 1.5, md: 2 },
          pb: { xs: 2, md: 2.5 },
          display: showDetail ? 'block' : 'none',
        }}
      >
        {!selectedMeeting ? (
          <Alert severity="info">Select a meeting to view its agenda.</Alert>
        ) : (
          <DetailPane
            listMeeting={selectedMeeting}
            cached={cached}
            loading={detailLoading && !cached}
            detailTab={detailTab}
            setDetailTab={setDetailTab}
            onBack={isMobile ? backToList : undefined}
            onRefresh={refreshSelected}
            onPatchItem={patchCachedItem}
            onError={setError}
          />
        )}
      </Box>

      {canCreate && isMobile && showList && (
        <Fab
          color="primary"
          aria-label="New meeting"
          onClick={() => setShowNew(true)}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 24,
            bgcolor: C.blue,
            '&:hover': { bgcolor: C.blueEdge },
            zIndex: 8,
          }}
        >
          <AddRounded />
        </Fab>
      )}

      <MeetingDialog
        key="agenda-hub-new"
        open={showNew}
        onClose={() => setShowNew(false)}
        onSaved={() => {
          setShowNew(false);
          setReloadToken((n) => n + 1);
        }}
        selectedDateTimeInfo={{ startStr: dayjs().toISOString() }}
      />
    </Box>
  );
}

function MeetingListCard({
  meeting: m,
  selected,
  onSelect,
}: {
  meeting: HubMeeting;
  selected: boolean;
  onSelect: () => void;
}) {
  const start = dayjs(m.startDate);
  return (
    <Box
      component="button"
      type="button"
      onClick={onSelect}
      sx={{
        textAlign: 'left',
        width: '100%',
        display: 'flex',
        gap: 1.25,
        alignItems: 'stretch',
        p: 1.15,
        borderRadius: 2,
        border: `1px solid ${selected ? C.blueEdge : C.line}`,
        bgcolor: selected ? C.blueSoft : C.paper,
        borderLeft: selected ? `3px solid ${C.blue}` : `3px solid transparent`,
        cursor: 'pointer',
        transition: 'background-color .15s ease, border-color .15s ease',
        '&:hover': { bgcolor: selected ? C.blueSoft : C.slate },
      }}
    >
      <Box
        sx={{
          width: 46,
          borderRadius: 1.5,
          bgcolor: selected ? '#DBEAFE' : C.slate,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          py: 0.6,
        }}
      >
        <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.blue, lineHeight: 1 }}>
          {start.format('D')}
        </Typography>
        <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: C.mute, letterSpacing: 0.4 }}>
          {start.format('MMM').toUpperCase()}
        </Typography>
        <Typography sx={{ fontSize: 9, fontWeight: 600, color: C.mute }}>
          {start.format('ddd')}
        </Typography>
      </Box>

      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13.5,
            color: C.ink,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {m.title}
        </Typography>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.35 }}>
          <AccessTimeRounded sx={{ fontSize: 13, color: C.mute }} />
          <Typography sx={{ fontSize: 11.5, color: C.mute }}>
            {fmtTime(m.startDate)}–{fmtTime(m.endDate)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.2 }}>
          {m.isOnline || m.meetingLink ? (
            <VideocamOutlined sx={{ fontSize: 13, color: C.mute }} />
          ) : (
            <PlaceOutlined sx={{ fontSize: 13, color: C.mute }} />
          )}
          <Typography
            sx={{
              fontSize: 11.5,
              color: C.mute,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {placeLabel(m)}
          </Typography>
        </Stack>
        <Box sx={{ mt: 0.75 }}>
          {m.hasAgenda && m.agendaCount > 0 ? (
            <Chip
              size="small"
              label={`${m.agendaCount} agenda item${m.agendaCount === 1 ? '' : 's'}`}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: C.greenWash,
                color: C.green,
              }}
            />
          ) : (
            <Chip
              size="small"
              label="No agenda"
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: C.amberWash,
                color: C.amber,
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

function DetailPane({
  listMeeting,
  cached,
  loading,
  detailTab,
  setDetailTab,
  onBack,
  onRefresh,
  onPatchItem,
  onError,
}: {
  listMeeting: HubMeeting;
  cached?: DetailCache;
  loading: boolean;
  detailTab: 'overview' | 'agenda' | 'mom';
  setDetailTab: (t: 'overview' | 'agenda' | 'mom') => void;
  onBack?: () => void;
  onRefresh: () => Promise<void>;
  onPatchItem: (meetingId: string, itemId: string, patch: Record<string, unknown>) => void;
  onError: (m: string) => void;
}) {
  const meeting = cached?.meeting || listMeeting;
  const items = cached?.items || [];
  // Topics written straight into the MoM were never on the agenda.
  const agendaItems = items.filter((it: any) => !it.addedInMom);
  const minutes = cached?.minutes;
  const perms = cached?.permissions;
  const purposeOptions = cached?.purposeOptions || [];
  const purposeLabels: string[] = meeting.purposeLabels || listMeeting.purposeLabels || [];
  const agendaCount = cached ? agendaItems.length : listMeeting.agendaCount;
  const permsLoaded = perms != null;
  const canEditMom = !!perms?.canEditMom;
  const canEditAgenda = !!perms?.canEditAgenda;
  const accessBadge = (() => {
    if (!permsLoaded) return null;
    if (!canEditMom && !canEditAgenda) {
      return {
        label: 'View only',
        tip: 'Only the meeting organizer or a project manager can edit the agenda and minutes.',
        bg: C.slate,
        fg: C.mute,
      };
    }
    if (!canEditMom) {
      return {
        label: 'View only',
        tip: 'Only the organizer or a project manager can edit the minutes.',
        bg: C.slate,
        fg: C.mute,
      };
    }
    if (!canEditAgenda) {
      return {
        label: 'View only',
        tip: 'Only the organizer or a project manager can add or edit agenda items.',
        bg: C.slate,
        fg: C.mute,
      };
    }
    return null;
  })();

  return (
    <Stack spacing={1.75} sx={{ opacity: loading ? 0.72 : 1, transition: 'opacity .18s ease' }}>
      <Box
        sx={{
          bgcolor: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          {onBack && (
            <IconButton
              aria-label="Back to meetings"
              onClick={onBack}
              size="small"
              sx={{ mt: 0.25, border: `1px solid ${C.line}` }}
            >
              <ArrowBackRounded fontSize="small" />
            </IconButton>
          )}
          <DateBadge date={meeting.startDate} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 22 }, color: C.ink, letterSpacing: '-0.02em' }}>
              {meeting.title}
            </Typography>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mt: 0.75, color: C.mute, fontSize: 13 }}>
              <span>{fmtDate(meeting.startDate)}</span>
              <Stack direction="row" alignItems="center" gap={0.4}>
                <AccessTimeRounded sx={{ fontSize: 15 }} />
                {fmtTime(meeting.startDate)}–{fmtTime(meeting.endDate)}
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.4}>
                <PlaceOutlined sx={{ fontSize: 15 }} />
                {placeLabel(meeting)}
              </Stack>
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1.25 }}>
              {purposeLabels.length ? (
                purposeLabels.map((label: string) => (
                  <Chip
                    key={label}
                    size="small"
                    icon={<FlagRounded sx={{ fontSize: 15 }} />}
                    label={label}
                    title="Purpose"
                    sx={{
                      fontWeight: 700,
                      bgcolor: C.blueSoft,
                      color: C.blue,
                      border: `1px solid #BFDBFE`,
                      '& .MuiChip-icon': { color: C.blue },
                    }}
                  />
                ))
              ) : perms?.canManage ? (
                <Chip
                  size="small"
                  variant="outlined"
                  icon={<FlagRounded sx={{ fontSize: 15 }} />}
                  label="Set purpose"
                  onClick={() => setDetailTab('overview')}
                  sx={{ borderStyle: 'dashed', color: C.mute }}
                />
              ) : null}
              {meeting.projectName && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={[meeting.projectNumber, meeting.projectName].filter(Boolean).join(' — ')}
                />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={`${agendaCount} agenda item${agendaCount === 1 ? '' : 's'}`}
              />
            </Stack>
          </Box>
          {accessBadge && (
            <Tooltip title={accessBadge.tip} arrow placement="left">
              <Chip
                size="small"
                label={accessBadge.label}
                tabIndex={0}
                sx={{
                  flexShrink: 0,
                  height: 26,
                  fontWeight: 700,
                  fontSize: 12,
                  bgcolor: accessBadge.bg,
                  color: accessBadge.fg,
                  cursor: 'help',
                  border: `1px solid ${accessBadge.fg}22`,
                }}
              />
            </Tooltip>
          )}
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 2, borderBottom: `1px solid ${C.line}`, overflowX: 'auto' }}
        >
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'agenda', label: `Agenda (${agendaCount})` },
              { key: 'mom', label: 'Minutes of Meeting' },
            ] as const
          ).map((t) => {
            const active = detailTab === t.key;
            return (
              <Box
                key={t.key}
                component="button"
                type="button"
                onClick={() => setDetailTab(t.key)}
                sx={{
                  border: 0,
                  bgcolor: 'transparent',
                  px: 1.5,
                  py: 1,
                  fontSize: 13,
                  fontWeight: active ? 800 : 600,
                  color: active ? C.blue : C.mute,
                  borderBottom: active ? `2px solid ${C.blue}` : '2px solid transparent',
                  cursor: 'pointer',
                  mb: '-1px',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </Box>
            );
          })}
        </Stack>
      </Box>

      {loading && !cached ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={26} />
        </Box>
      ) : detailTab === 'overview' ? (
        <OverviewPanel
          meetingId={listMeeting.id}
          meeting={meeting}
          listMeeting={listMeeting}
          items={agendaItems}
          purposeOptions={purposeOptions}
          canEdit={!!perms?.canManage}
          onRefresh={onRefresh}
          onError={onError}
        />
      ) : detailTab === 'mom' ? (
        <MomPanel
          meetingId={listMeeting.id}
          meeting={meeting}
          items={items}
          minutes={minutes}
          canEdit={!!perms?.canEditMom}
          canExport={!!perms?.canExportPdf}
          onRefresh={onRefresh}
          onPatchItem={onPatchItem}
          onError={onError}
        />
      ) : (
        <AgendaPanel
          key={listMeeting.id}
          meetingId={listMeeting.id}
          meeting={meeting}
          items={agendaItems}
          canEdit={!!perms?.canEditAgenda}
          permsLoaded={perms != null}
          onRefresh={onRefresh}
          onConverted={() => setDetailTab('mom')}
          onError={onError}
        />
      )}
    </Stack>
  );
}

function DateBadge({ date }: { date?: string | Date | null }) {
  const d = dayjs(date);
  return (
    <Box
      sx={{
        width: 64,
        borderRadius: 2,
        bgcolor: C.blueSoft,
        border: `1px solid #BFDBFE`,
        textAlign: 'center',
        py: 0.85,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.blue, lineHeight: 1 }}>
        {d.isValid() ? d.format('D') : '—'}
      </Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.mute, letterSpacing: 0.5 }}>
        {d.isValid() ? d.format('MMM').toUpperCase() : ''}
      </Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: C.mute }}>
        {d.isValid() ? d.format('YYYY') : ''}
      </Typography>
    </Box>
  );
}

function OverviewPanel({
  meetingId,
  meeting,
  listMeeting,
  items,
  purposeOptions,
  canEdit,
  onRefresh,
  onError,
}: {
  meetingId: string;
  meeting: any;
  listMeeting: HubMeeting;
  items: any[];
  purposeOptions: Array<{ code: string; label: string; requiresOther?: boolean }>;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const savedCodes: string[] = meeting?.purposeCodes || listMeeting.purposeCodes || [];
  const savedKey = savedCodes.join(',');
  const [codes, setCodes] = useState<string[]>(savedCodes);
  const [other, setOther] = useState(meeting?.purposeOtherText || '');
  const saveTimer = useRef<number | undefined>(undefined);
  const requiresOther = (list: string[]) =>
    list.some((code) => purposeOptions.find((o) => o.code === code)?.requiresOther || code === 'OTHER');
  const needsOther = requiresOther(codes);

  const purposeSelectOptions: WtSelectOption[] = useMemo(
    () =>
      purposeOptions
        .map((o) => ({ value: o.code, label: o.label }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
    [purposeOptions],
  );

  useEffect(() => {
    setCodes(savedKey ? savedKey.split(',') : []);
    setOther(meeting?.purposeOtherText || '');
  }, [savedKey, meeting?.purposeOtherText]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const savePurpose = async (list: string[], otherText: string | null) => {
    try {
      await updateMeetingPurpose(meetingId, { purposeCodes: list, purposeOtherText: otherText });
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  // Picks save together once you pause, so three quick picks are one request, in order.
  // A purpose that needs details ("Other") waits for them instead.
  const pickPurposes = (list: string[]) => {
    setCodes(list);
    window.clearTimeout(saveTimer.current);
    if (requiresOther(list) && !other.trim()) return;
    saveTimer.current = window.setTimeout(
      () => void savePurpose(list, requiresOther(list) ? other.trim() : null),
      600,
    );
  };

  const saveOther = () => {
    const text = other.trim();
    if (text && text !== (meeting?.purposeOtherText || '')) void savePurpose(codes, text);
  };

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1, color: C.ink }}>Purpose</Typography>
        {canEdit ? (
          <Stack spacing={1.25}>
            <WtSelect
              isMulti
              options={purposeSelectOptions}
              value={purposeSelectOptions.filter((o) => codes.includes(o.value))}
              isSearchable
              isClearable
              placeholder="Search or pick one or more purposes…"
              ariaLabel="Meeting purposes"
              onChange={(next) =>
                pickPurposes(((next as WtSelectOption[] | null) || []).map((o) => o.value))
              }
            />
            {needsOther && (
              <TextField
                size="small"
                label="Please specify"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                onBlur={saveOther}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveOther();
                }}
                helperText="Saved when you press Enter or leave this field."
                fullWidth
              />
            )}
          </Stack>
        ) : (
          <Typography fontWeight={700}>
            {(meeting.purposeLabels || listMeeting.purposeLabels || []).join(', ') || 'Not set'}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        }}
      >
        <InfoCard title="Agenda items" body={`${items.length || listMeeting.agendaCount} item(s)`} />
        <InfoCard title="Location" body={placeLabel(meeting)} />
        <InfoCard title="Meeting type" body={placeLabel(meeting)} />
        <InfoCard
          title="Project"
          body={
            [meeting.projectNumber, meeting.projectName].filter(Boolean).join(' — ') || '—'
          }
        />
      </Box>
    </Stack>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.mute, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontWeight: 700, color: C.ink }}>{body}</Typography>
    </Box>
  );
}

function MomPanel({
  meetingId,
  meeting,
  items,
  minutes,
  canEdit,
  canExport,
  onRefresh,
  onPatchItem,
  onError,
}: {
  meetingId: string;
  meeting: any;
  items: any[];
  minutes: any;
  canEdit: boolean;
  canExport: boolean;
  onRefresh: () => Promise<void>;
  onPatchItem: (meetingId: string, itemId: string, patch: Record<string, unknown>) => void;
  onError: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [topicPickerKey, setTopicPickerKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [teamIds, setTeamIds] = useState<Set<string> | null>(null);
  // Company statuses from Configure → Agenda statuses, A–Z.
  const [statusOptions, setStatusOptions] = useState<WtSelectOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    getCompanyAgendaStatuses()
      .then((res) => {
        if (cancelled) return;
        setStatusOptions(
          (res?.statuses || [])
            .filter((st: any) => st.isActive !== false && st.code)
            .map((st: any) => ({ value: st.code, label: st.name || st.code, color: st.color || '#64748B' }))
            .sort((a: WtSelectOption, b: WtSelectOption) =>
              a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
            ),
        );
      })
      .catch(() => {
        if (!cancelled) setStatusOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const { data: directory = [], isLoading: directoryLoading } = useEmployeeDirectory();
  const momItems = useMemo(() => items.filter((it: any) => it.inMom), [items]);
  const { options: taskOptions, loading: topicOptionsLoading } = useAgendaTaskOptions(
    meeting?.projectId || null,
  );
  // Same source as the agenda; anything already on the agenda or in the MoM is left out.
  const topicOptions = useMemo(() => {
    const taken = new Set(items.map((i: any) => String(i.description || '')));
    return taskOptions.filter((o) => !taken.has(o.name));
  }, [taskOptions, items]);
  const projectId = meeting?.projectId || null;
  const rowsEditable = canEdit && !!minutes;

  useEffect(() => {
    if (!projectId || !rowsEditable) {
      setTeamIds(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getProjectTeam(projectId);
        const list = res?.members || [];
        const ids = new Set(
          (Array.isArray(list) ? list : [])
            .map((m: any) => String(m.id || m.employeeId || ''))
            .filter(Boolean),
        );
        if (!cancelled) setTeamIds(ids);
      } catch {
        if (!cancelled) setTeamIds(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, rowsEditable]);

  const assigneeOptions: WtSelectOption[] = useMemo(() => {
    const list = projectId && teamIds
      ? directory.filter((e) => teamIds.has(e.id))
      : directory;
    return list
      .map((e) => ({
        value: e.id,
        label: e.name,
        avatar: e.avatar,
        description: e.designation,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [directory, projectId, teamIds]);

  /** Optimistic row update — avoid full hub reload (that spun the whole page). */
  const patchItem = async (
    itemId: string,
    payload: Record<string, unknown>,
    displayPatch?: Record<string, unknown>,
  ) => {
    setRowBusyId(itemId);
    onPatchItem(meetingId, itemId, { ...payload, ...displayPatch });
    try {
      await updateAgendaItem(meetingId, itemId, payload);
    } catch (e) {
      onError(errMsg(e));
      await onRefresh();
    } finally {
      setRowBusyId(null);
    }
  };

  /** A topic discussed in the meeting that was never on the agenda. */
  const addTopic = async (description: string) => {
    setAdding(true);
    try {
      await createAgendaItem(meetingId, { description, itemMode: 'DISCUSSION', addedInMom: true });
      setTopicPickerKey((n) => n + 1);
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setAdding(false);
    }
  };

  const removeTopic = async (itemId: string) => {
    setRowBusyId(itemId);
    try {
      await deleteAgendaItem(meetingId, itemId);
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setRowBusyId(null);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      await createMeetingMinutesDraft(meetingId);
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    setBusy(true);
    try {
      const res = await downloadMeetingMinutesPdf(meetingId);
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${minutes?.documentNo || 'minutes-of-meeting'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (!minutes) {
    return (
      <Stack spacing={1.5} alignItems="flex-start">
        <Alert severity="info" sx={{ width: '100%' }}>
          No Minutes of Meeting yet. Tick agenda items on the Agenda tab and choose Convert to MoM,
          or start the minutes here and add the topics discussed.
        </Alert>
        {canEdit && (
          <WtButton size="small" disabled={busy} onClick={generate}>
            Start minutes
          </WtButton>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Typography sx={{ fontSize: 13, color: C.mute }}>
              Document No. {minutes.documentNo || '—'}
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {canExport && (
              <WtButton size="small" disabled={busy} onClick={exportPdf}>
                Download PDF
              </WtButton>
            )}
          </Stack>
        </Stack>
      </Box>

      <MomAttendees
        meetingId={meetingId}
        projectId={projectId}
        attendees={minutes.attendees || []}
        editable={rowsEditable}
        teamIds={teamIds}
        onError={onError}
      />

      <Box sx={{ bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5, overflow: 'hidden' }}>
        {momItems.length === 0 ? (
          <Alert severity="info" sx={{ m: 1.5 }}>
            Nothing in these minutes yet. Convert items from the Agenda tab
            {rowsEditable ? ', or add a topic discussed below.' : '.'}
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={agendaTableSx}>
              <Box component="thead">
                <Box component="tr">
                  {['#', 'Agenda item', 'Assignee', 'Due date', 'Status', 'Note'].map((h) => (
                    <Box component="th" key={h}>
                      {h}
                    </Box>
                  ))}
                  {rowsEditable && <Box component="th" sx={{ width: 44 }} />}
                </Box>
              </Box>
              <Box component="tbody">
                {momItems.map((item: any, idx: number) => {
                  const rowBusy = rowBusyId === item.id;
                  const dueVal = item.targetCompletionDate
                    ? dayjs(item.targetCompletionDate).format('YYYY-MM-DD')
                    : '';
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ color: C.mute, width: 36 }}>
                        {idx + 1}
                      </Box>
                      <Box component="td" sx={{ minWidth: 180, fontWeight: 600 }}>
                        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                          <span>{item.description}</span>
                          {item.addedInMom && (
                            <Chip
                              size="small"
                              label="Not on agenda"
                              sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: C.slate, color: C.mute }}
                            />
                          )}
                        </Stack>
                      </Box>
                      <Box component="td" sx={{ minWidth: 200 }}>
                        {rowsEditable ? (
                          <Box sx={assigneeSelectSx}>
                            <WtSelect
                              size="sm"
                              options={assigneeOptions}
                              value={assigneeOptions.find((a) => a.value === item.responsibleUserId) || null}
                              isDisabled={rowBusy}
                              isLoading={directoryLoading}
                              isClearable
                              isSearchable
                              optionVariant="avatar"
                              placeholder="Assignee"
                              ariaLabel="Assignee"
                              onChange={(next) => {
                                const opt = next as WtSelectOption | null;
                                void patchItem(
                                  item.id,
                                  { responsibleUserId: opt?.value || null },
                                  { responsibleName: opt?.label || null },
                                );
                              }}
                            />
                          </Box>
                        ) : (
                          item.responsibleName || '—'
                        )}
                      </Box>
                      <Box component="td" sx={{ whiteSpace: 'nowrap', minWidth: 150 }}>
                        {rowsEditable ? (
                          <WtDateField
                            label=""
                            value={dueVal}
                            disabled={rowBusy}
                            onChange={(v) => {
                              void patchItem(item.id, { targetCompletionDate: v || null });
                            }}
                          />
                        ) : (
                          fmtDate(item.targetCompletionDate)
                        )}
                      </Box>
                      <Box component="td" sx={{ minWidth: 160 }}>
                        {rowsEditable && statusOptions.length ? (
                          <WtSelect
                            size="sm"
                            options={statusOptions}
                            value={statusOptions.find((o) => o.value === item.status) || null}
                            isDisabled={rowBusy}
                            optionVariant="colour"
                            accentColor={statusOptions.find((o) => o.value === item.status)?.color}
                            placeholder="Status"
                            ariaLabel={`Status of ${item.description}`}
                            onChange={(next) => {
                              const opt = next as WtSelectOption | null;
                              if (!opt) return;
                              void patchItem(
                                item.id,
                                { status: opt.value },
                                { statusLabel: opt.label, statusColor: opt.color },
                              );
                            }}
                          />
                        ) : (
                          <Stack direction="row" alignItems="center" gap={0.75}>
                            <Box
                              aria-hidden
                              sx={{
                                width: 9,
                                height: 9,
                                borderRadius: '50%',
                                flexShrink: 0,
                                bgcolor: item.statusColor || C.mute,
                              }}
                            />
                            <span>{item.statusLabel || item.status || '—'}</span>
                          </Stack>
                        )}
                      </Box>
                      <Box component="td" sx={{ minWidth: 220 }}>
                        {rowsEditable ? (
                          <TextField
                            // Re-seed when the saved note changes (refresh / another tab).
                            key={`${item.id}:${item.remarks ?? ''}`}
                            size="small"
                            fullWidth
                            multiline
                            maxRows={4}
                            placeholder="Note"
                            defaultValue={item.remarks || ''}
                            disabled={rowBusy}
                            inputProps={{ 'aria-label': `Note for ${item.description}` }}
                            onBlur={(e) => {
                              const remarks = e.target.value.trim() || null;
                              if (remarks === (item.remarks || null)) return;
                              void patchItem(item.id, { remarks });
                            }}
                            sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
                          />
                        ) : (
                          <Box sx={{ whiteSpace: 'pre-wrap', color: item.remarks ? C.ink : C.mute }}>
                            {item.remarks || '—'}
                          </Box>
                        )}
                      </Box>
                      {rowsEditable && (
                        <Box component="td" sx={{ textAlign: 'center' }}>
                          {/* Agenda items leave the MoM by unticking them on the Agenda tab. */}
                          {item.addedInMom && (
                            <WtIconButton
                              title="Remove topic"
                              color="#DC2626"
                              disabled={rowBusy}
                              onClick={() => removeTopic(item.id)}
                              sx={{ width: 32, height: 32, borderRadius: '10px' }}
                            >
                              <AppIcon name="bi-trash" fallbackSize={14} />
                            </WtIconButton>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}
        {rowsEditable && (
          <Box sx={{ p: 1.5, borderTop: `1px solid ${C.line}`, bgcolor: C.page }}>
            <TaskPathSelect
              key={topicPickerKey}
              value=""
              options={topicOptions}
              disabled={adding}
              onChange={(opt) => {
                if (opt) void addTopic(opt.name);
              }}
              label="Add a topic discussed"
              placeholder={projectId
                ? 'Search this project’s deliverable tasks…'
                : 'Search, e.g. electrical load sheet'}
              loading={topicOptionsLoading}
              helperText={adding ? 'Adding…' : 'Discussed but not on the agenda? Pick it here.'}
            />
          </Box>
        )}
      </Box>
    </Stack>
  );
}

/**
 * What an agenda item (or a MoM topic) can be: the project's deliverable tasks, or every
 * preset task when the meeting has no project / the project has no deliverables yet.
 */
function useAgendaTaskOptions(projectId: string | null) {
  const presetsQuery = usePresetTasks('PROJECT');
  const deliverables = useProjectDeliverables(projectId);
  const { deliverableTaskIds } = deliverables;
  const options = useMemo(() => {
    const presets = (presetsQuery.data?.presetTaskStatuses ?? []) as PresetTask[];
    if (!projectId || deliverableTaskIds.length === 0) return buildTaskPathOptions(presets);
    const only = new Set<string>();
    deliverableTaskIds.forEach((id) => getPresetSubtreeIds(presets, id).forEach((n) => only.add(n)));
    return buildTaskPathOptions(presets, only);
  }, [presetsQuery.data, projectId, deliverableTaskIds]);
  return { options, loading: presetsQuery.isLoading || (!!projectId && deliverables.isFetching) };
}

function AgendaPanel({
  meetingId,
  meeting,
  items,
  canEdit,
  permsLoaded,
  onRefresh,
  onConverted,
  onError,
}: {
  meetingId: string;
  meeting: any;
  items: any[];
  canEdit: boolean;
  permsLoaded: boolean;
  onRefresh: () => Promise<void>;
  onConverted: () => void;
  onError: (m: string) => void;
}) {
  const [agendaSearch, setAgendaSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Array<{ id: string; label: string }>>([]);

  // Ticks start from what is already in the MoM, so converting again never drops items silently.
  const savedKey = items.filter((it: any) => it.inMom).map((it: any) => it.id).join('|');
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(savedKey ? savedKey.split('|') : []),
  );
  useEffect(() => {
    setChecked(new Set(savedKey ? savedKey.split('|') : []));
  }, [savedKey]);

  const visibleItems = useMemo(() => {
    if (!agendaSearch.trim()) return items;
    return items.filter((it: any) => matchesQuery(String(it.description || ''), agendaSearch));
  }, [items, agendaSearch]);

  const visibleChecked = visibleItems.filter((it: any) => checked.has(it.id)).length;
  const allVisibleChecked = visibleItems.length > 0 && visibleChecked === visibleItems.length;

  const toggleAll = () => {
    setChecked((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((it: any) => (allVisibleChecked ? next.delete(it.id) : next.add(it.id)));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const projectId = meeting?.projectId || null;
  const { options: agendaOptions, loading: agendaOptionsLoading } = useAgendaTaskOptions(projectId);

  const agendaPickerOptions = useMemo(() => {
    const takenIds = new Set(selectedAgenda.map((a) => a.id));
    const takenLabels = new Set([
      ...selectedAgenda.map((a) => a.label),
      ...items.map((i) => String(i.description || '')),
    ]);
    return agendaOptions.filter((o) => !takenIds.has(o.id) && !takenLabels.has(o.name));
  }, [agendaOptions, selectedAgenda, items]);

  const agendaPickerKey = selectedAgenda.map((a) => a.id).join('|') || 'empty';

  const submit = async () => {
    if (!selectedAgenda.length) return;
    setSaving(true);
    try {
      const payloads = selectedAgenda.map((item) => ({
        description: item.label,
        itemMode: 'DISCUSSION',
      }));
      if (payloads.length === 1) {
        await createAgendaItem(meetingId, payloads[0]);
      } else {
        await createAgendaItemsBulk(meetingId, payloads);
      }
      setOpen(false);
      setSelectedAgenda([]);
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const convert = async () => {
    setConverting(true);
    try {
      await convertAgendaToMom(
        meetingId,
        items.filter((it: any) => checked.has(it.id)).map((it: any) => it.id),
      );
      await onRefresh();
      onConverted();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setConverting(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteAgendaItem(meetingId, id);
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    }
  };

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Search agenda…"
          value={agendaSearch}
          onChange={(e) => setAgendaSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded sx={{ fontSize: 18, color: C.mute }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: { sm: 320 }, bgcolor: C.paper, borderRadius: 2 }}
        />
        {canEdit ? (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {items.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12.5, color: C.mute, whiteSpace: 'nowrap' }}>
                  {checked.size} of {items.length} selected
                </Typography>
                <WtButton size="small" inverted disabled={converting} onClick={convert}>
                  {converting ? 'Converting…' : 'Convert to MoM'}
                </WtButton>
              </>
            )}
            <WtButton size="small" onClick={() => setOpen(true)}>
              + Add agenda items
            </WtButton>
          </Stack>
        ) : permsLoaded ? (
          <Typography sx={{ fontSize: 12, color: C.mute, maxWidth: 280, textAlign: { sm: 'right' } }}>
            Only the organizer or a project manager can add agenda items.
          </Typography>
        ) : null}
      </Stack>

      <Box
        sx={{
          bgcolor: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 2.5,
          overflow: 'hidden',
        }}
      >
        {items.length === 0 ? (
          <Alert severity="info" sx={{ m: 1.5 }}>
            {canEdit
              ? 'No structured agenda items yet. Use “+ Add agenda items” to get started.'
              : 'No structured agenda items yet. Only the organizer or a project manager can add them.'}
          </Alert>
        ) : visibleItems.length === 0 ? (
          <Alert severity="info" sx={{ m: 1.5 }}>
            No agenda items match “{agendaSearch.trim()}”.
          </Alert>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={agendaTableSx}>
              <Box component="thead">
                <Box component="tr">
                  {canEdit && (
                    <Box component="th" sx={{ width: 44 }}>
                      <WtCheckbox
                        size="sm"
                        checked={allVisibleChecked}
                        indeterminate={visibleChecked > 0 && !allVisibleChecked}
                        onChange={toggleAll}
                        inputProps={{ 'aria-label': 'Select all agenda items' }}
                      />
                    </Box>
                  )}
                  <Box component="th" sx={{ width: 36 }}>#</Box>
                  <Box component="th">Agenda item</Box>
                  {canEdit && <Box component="th" sx={{ width: 44 }} />}
                </Box>
              </Box>
              <Box component="tbody">
                {visibleItems.map((item: any, idx: number) => (
                  <Box
                    component="tr"
                    key={item.id}
                    sx={{ bgcolor: canEdit && checked.has(item.id) ? C.blueSoft : undefined }}
                  >
                    {canEdit && (
                      <Box component="td">
                        <WtCheckbox
                          size="sm"
                          checked={checked.has(item.id)}
                          onChange={() => toggleOne(item.id)}
                          inputProps={{ 'aria-label': `Select ${item.description}` }}
                        />
                      </Box>
                    )}
                    <Box component="td" sx={{ color: C.mute }}>
                      {idx + 1}
                    </Box>
                    <Box component="td" sx={{ fontWeight: 600 }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <span>{item.description}</span>
                        {item.inMom && (
                          <Chip
                            size="small"
                            label="In MoM"
                            sx={{
                              height: 20,
                              fontSize: 10.5,
                              fontWeight: 700,
                              bgcolor: C.greenWash,
                              color: C.green,
                            }}
                          />
                        )}
                      </Stack>
                    </Box>
                    {canEdit && (
                      <Box component="td" sx={{ textAlign: 'center' }}>
                        <WtIconButton
                          title="Remove agenda item"
                          color="#DC2626"
                          onClick={() => onDelete(item.id)}
                          sx={{ width: 32, height: 32, borderRadius: '10px' }}
                        >
                          <AppIcon name="bi-trash" fallbackSize={14} />
                        </WtIconButton>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add agenda items</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {selectedAgenda.length > 0 && (
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {selectedAgenda.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.label}
                    size="small"
                    onDelete={
                      saving
                        ? undefined
                        : () => setSelectedAgenda((prev) => prev.filter((a) => a.id !== item.id))
                    }
                    sx={{
                      maxWidth: '100%',
                      height: 'auto',
                      py: 0.5,
                      '& .MuiChip-label': { whiteSpace: 'normal' },
                    }}
                  />
                ))}
              </Stack>
            )}
            <TaskPathSelect
              key={agendaPickerKey}
              value=""
              options={agendaPickerOptions}
              onChange={(opt) => {
                if (!opt) return;
                setSelectedAgenda((prev) => (
                  prev.some((a) => a.id === opt.id)
                    ? prev
                    : [...prev, { id: opt.id, label: opt.name }]
                ));
              }}
              label="Agenda item"
              placeholder={projectId
                ? 'Search this project’s deliverable tasks…'
                : 'Search, e.g. electrical load sheet'}
              loading={agendaOptionsLoading}
              helperText={
                selectedAgenda.length
                  ? `${selectedAgenda.length} selected — pick more from the list`
                  : 'Pick one or more agenda items.'
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <WtButton
            ghost
            disabled={saving}
            onClick={() => {
              if (saving) return;
              setOpen(false);
              setSelectedAgenda([]);
            }}
          >
            Cancel
          </WtButton>
          <WtButton
            size="small"
            disabled={saving || selectedAgenda.length === 0}
            onClick={submit}
          >
            {saving
              ? 'Saving…'
              : selectedAgenda.length > 1
                ? `Add ${selectedAgenda.length}`
                : 'Add'}
          </WtButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
