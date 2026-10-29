import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Badge,
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
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import FilterListRounded from '@mui/icons-material/FilterListRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import FlagRounded from '@mui/icons-material/FlagRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import dayjs from 'dayjs';
import { hasPermission } from '@utils/authAbac';
import { apiErrorMessage } from '@utils/apiError';
import { successConfirmation } from '@utils/modal';
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
  assignMomTasks,
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
  /** Where the meeting is in its flow — the backend's meetingStage. */
  stage: MeetingStage;
  momLines: number;
  tasksPending: number;
};

type DetailCache = {
  meeting: any;
  permissions: any;
  items: any[];
  minutes: any | null;
  purposeOptions: Array<{ code: string; label: string; requiresOther?: boolean }>;
};

type MeetingStage = 'AGENDA_NEEDED' | 'SCHEDULED' | 'MOM_PENDING' | 'TASKS_PENDING' | 'COMPLETED';
type WhenFilter = 'all' | 'upcoming' | 'past';
type AgendaFilter = 'any' | 'with' | 'none';

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
  rose: '#BE123C',
  roseWash: '#FFE4E6',
  violet: '#6D28D9',
  violetWash: '#EDE9FE',
};

/** One look per stage of the meeting flow, used by the list chip, tracker and Status filter. */
const STAGE_META: Record<MeetingStage, { label: string; hint: string; fg: string; bg: string }> = {
  AGENDA_NEEDED: { label: 'Agenda needed', hint: 'Upcoming, with no agenda yet', fg: C.amber, bg: C.amberWash },
  SCHEDULED: { label: 'Scheduled', hint: 'Upcoming, agenda ready', fg: C.blue, bg: C.blueSoft },
  MOM_PENDING: { label: 'MoM pending', hint: 'Meeting over, minutes not recorded', fg: C.rose, bg: C.roseWash },
  TASKS_PENDING: { label: 'Tasks pending', hint: 'Minutes recorded, tasks not assigned yet', fg: C.violet, bg: C.violetWash },
  COMPLETED: { label: 'Completed', hint: 'Minutes recorded and every task assigned', fg: C.green, bg: C.greenWash },
};
const STAGES = Object.keys(STAGE_META) as MeetingStage[];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [when, setWhen] = useState<WhenFilter>('all');
  const [stages, setStages] = useState<MeetingStage[]>([]);
  const [agendaFilter, setAgendaFilter] = useState<AgendaFilter>('any');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState<HTMLElement | null>(null);
  const activeFilterCount =
    (when !== 'all' ? 1 : 0) + stages.length + (agendaFilter !== 'any' ? 1 : 0) + (overdueOnly ? 1 : 0);
  const clearFilters = () => {
    setWhen('all');
    setStages([]);
    setAgendaFilter('any');
    setOverdueOnly(false);
  };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const panelParam = searchParams.get('panel');
  const [detailTab, setDetailTab] = useState<'overview' | 'agenda' | 'mom'>(
    // A meeting opens on its Overview; an explicit ?panel=agenda|mom link still lands there.
    panelParam === 'mom' ? 'mom' : panelParam === 'agenda' ? 'agenda' : 'overview',
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
      if (when === 'upcoming' && !m.isUpcoming) return false;
      if (when === 'past' && !m.isPast) return false;
      if (stages.length && !stages.includes(m.stage)) return false;
      if (agendaFilter === 'with' && !m.hasAgenda) return false;
      if (agendaFilter === 'none' && m.hasAgenda) return false;
      if (overdueOnly && !m.isOverdue) return false;
      if (!query.trim()) return true;
      const hay = [
        m.title,
        m.purposeLabel,
        m.location,
        placeLabel(m),
        m.startDate ? dayjs(m.startDate).format('DD MMM YYYY ddd') : '',
        m.agendaCount ? `${m.agendaCount} agenda` : 'no agenda',
        STAGE_META[m.stage]?.label,
      ].filter(Boolean).join(' ');
      return matchesQuery(hay, query);
    });
  }, [meetings, when, stages, agendaFilter, overdueOnly, query]);

  // How many meetings each filter option would show, from the whole list.
  const optionCounts = useMemo(() => {
    const n = (f: (m: HubMeeting) => boolean) => meetings.filter(f).length;
    return {
      upcoming: n((m) => m.isUpcoming),
      past: n((m) => m.isPast),
      withAgenda: n((m) => m.hasAgenda),
      noAgenda: n((m) => !m.hasAgenda),
      overdue: n((m) => m.isOverdue),
      stage: Object.fromEntries(STAGES.map((st) => [st, n((m) => m.stage === st)])) as Record<MeetingStage, number>,
    };
  }, [meetings]);

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
      setDetailTab('overview');
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
        // minmax(0, 1fr): a `1fr` track won't shrink below its content, so long one-line
        // addresses pushed the phone list past the screen edge.
        gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(320px, 380px) minmax(0, 1fr)' },
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
            Meetings ({activeFilterCount || query.trim() ? `${filtered.length} of ${meetings.length}` : meetings.length})
          </Typography>
          {canCreate && !isMobile && (
            <WtButton size="small" onClick={() => setShowNew(true)}>
              + New Meeting
            </WtButton>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pb: 1 }}>
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
          <Tooltip title="Filter meetings" arrow>
            <IconButton
              aria-label={`Filter meetings${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
              aria-haspopup="dialog"
              onClick={(e) => setFilterAnchor(e.currentTarget)}
              sx={{
                border: `1px solid ${activeFilterCount ? C.blueEdge : C.line}`,
                bgcolor: activeFilterCount ? C.blueSoft : C.paper,
                borderRadius: 2,
                width: 40,
                height: 40,
                flexShrink: 0,
              }}
            >
              <Badge
                badgeContent={activeFilterCount}
                color="primary"
                invisible={!activeFilterCount}
                sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
              >
                <FilterListRounded sx={{ fontSize: 20, color: activeFilterCount ? C.blue : C.mute }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Stack>

        {activeFilterCount > 0 && (
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75} alignItems="center" sx={{ px: 2, pb: 1.25 }}>
            {when !== 'all' && (
              <Chip size="small" label={when === 'upcoming' ? 'Upcoming' : 'Past'} onDelete={() => setWhen('all')} />
            )}
            {stages.map((st) => (
              <Chip
                key={st}
                size="small"
                label={STAGE_META[st].label}
                onDelete={() => setStages((prev) => prev.filter((x) => x !== st))}
                sx={{ bgcolor: STAGE_META[st].bg, color: STAGE_META[st].fg, fontWeight: 700 }}
              />
            ))}
            {agendaFilter !== 'any' && (
              <Chip
                size="small"
                label={agendaFilter === 'with' ? 'With agenda' : 'No agenda'}
                onDelete={() => setAgendaFilter('any')}
              />
            )}
            {overdueOnly && <Chip size="small" label="Overdue" onDelete={() => setOverdueOnly(false)} />}
            <Box
              component="button"
              type="button"
              onClick={clearFilters}
              sx={{ border: 0, bgcolor: 'transparent', color: C.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', px: 0.5 }}
            >
              Clear all
            </Box>
          </Stack>
        )}

        <Popover
          open={!!filterAnchor}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { width: 320, p: 2, borderRadius: 2.5, border: `1px solid ${C.line}` } } }}
        >
          <Stack spacing={1.75}>
            <FilterGroup title="When">
              {([
                ['all', 'All', meetings.length],
                ['upcoming', 'Upcoming', optionCounts.upcoming],
                ['past', 'Past', optionCounts.past],
              ] as const).map(([key, label, count]) => (
                <FilterOption key={key} active={when === key} onClick={() => setWhen(key)} label={label} count={count} />
              ))}
            </FilterGroup>
            <FilterGroup title="Status" hint="Pick any number">
              {STAGES.map((st) => (
                <FilterOption
                  key={st}
                  active={stages.includes(st)}
                  onClick={() =>
                    setStages((prev) => (prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]))
                  }
                  label={STAGE_META[st].label}
                  count={optionCounts.stage[st]}
                  tone={STAGE_META[st]}
                  title={STAGE_META[st].hint}
                />
              ))}
            </FilterGroup>
            <FilterGroup title="Agenda">
              {([
                ['any', 'Any', meetings.length],
                ['with', 'With agenda', optionCounts.withAgenda],
                ['none', 'No agenda', optionCounts.noAgenda],
              ] as const).map(([key, label, count]) => (
                <FilterOption key={key} active={agendaFilter === key} onClick={() => setAgendaFilter(key)} label={label} count={count} />
              ))}
            </FilterGroup>
            <FilterGroup title="Follow-up">
              <FilterOption
                active={overdueOnly}
                onClick={() => setOverdueOnly((v) => !v)}
                label="Overdue items"
                count={optionCounts.overdue}
                title="Open points past their due date"
              />
            </FilterGroup>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pt: 0.5 }}>
              <Box
                component="button"
                type="button"
                onClick={clearFilters}
                disabled={!activeFilterCount}
                sx={{ border: 0, bgcolor: 'transparent', color: activeFilterCount ? C.blue : C.mute, fontSize: 12.5, fontWeight: 700, cursor: activeFilterCount ? 'pointer' : 'default', p: 0 }}
              >
                Clear all
              </Box>
              <WtButton size="small" onClick={() => setFilterAnchor(null)}>
                Show {filtered.length} meeting{filtered.length === 1 ? '' : 's'}
              </WtButton>
            </Stack>
          </Stack>
        </Popover>

        <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', px: 1.25, pb: { xs: 12, md: 2 } }}>
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
          // Phones: clear the app's floating bottom bar, which would hide the last lines.
          pb: { xs: 12, md: 2.5 },
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
            // Sit above the app's floating bottom bar on phones and tablets.
            bottom: { xs: 104, md: 24 },
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
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ mt: 0.75 }}>
          <StageChip stage={m.stage} />
          <Typography sx={{ fontSize: 11, color: C.mute }}>
            {m.agendaCount ? `${m.agendaCount} agenda item${m.agendaCount === 1 ? '' : 's'}` : 'No agenda'}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

/** What to do next, per stage — the line under the tracker. */
const NEXT_STEP: Record<MeetingStage, { text: string; tab?: 'agenda' | 'mom'; cta?: string }> = {
  AGENDA_NEEDED: { text: 'Add the topics to discuss before the meeting.', tab: 'agenda', cta: 'Add agenda' },
  SCHEDULED: { text: 'Agenda ready. Record the minutes once the meeting is held.' },
  MOM_PENDING: { text: 'The meeting is over — record what was discussed.', tab: 'mom', cta: 'Record minutes' },
  TASKS_PENDING: { text: 'Minutes recorded. Assign the action points as tasks.', tab: 'mom', cta: 'Assign tasks' },
  COMPLETED: { text: 'Done — minutes recorded and every action point is a task.' },
};

/**
 * The meeting's flow at a glance: Agenda → Meeting held → MoM recorded → Tasks assigned.
 * Done steps get a tick; the first open one is the current step.
 */
function MeetingTracker({
  meeting: m,
  onOpen,
}: {
  meeting: HubMeeting;
  onOpen: (t: 'overview' | 'agenda' | 'mom') => void;
}) {
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  if (!m.stage) return null;
  const steps = [
    { label: 'Agenda', done: m.hasAgenda },
    { label: 'Meeting held', done: m.isPast },
    { label: 'MoM recorded', done: m.momLines > 0 },
    { label: 'Tasks assigned', done: m.stage === 'COMPLETED' },
  ];
  const current = steps.findIndex((st) => !st.done);
  const next = NEXT_STEP[m.stage];
  const stepsEl = (
      <Stack
        component="ol"
        direction="row"
        alignItems="center"
        aria-label="Meeting progress"
        sx={{ listStyle: 'none', m: 0, p: 0, flexWrap: { xs: 'nowrap', sm: 'wrap' }, rowGap: 0.75 }}
      >
        {steps.map((st, i) => {
          const isCurrent = i === current;
          return (
            <Stack
              component="li"
              key={st.label}
              direction={{ xs: 'column', sm: 'row' }}
              alignItems="center"
              sx={{ minWidth: 0, flex: { xs: 1, sm: 'none' } }}
            >
              {/* Phones: four equal columns, circle over label — no connector to wrap. */}
              {i > 0 && (
                <Box
                  aria-hidden
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    width: 22,
                    height: 2,
                    mx: 0.75,
                    borderRadius: 1,
                    bgcolor: steps[i - 1].done ? C.green : C.line,
                  }}
                />
              )}
              <Box
                aria-hidden
                sx={{
                  width: { xs: 28, sm: 20 },
                  height: { xs: 28, sm: 20 },
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  bgcolor: st.done ? C.green : isCurrent ? C.blueSoft : C.paper,
                  border: `1.5px solid ${st.done ? C.green : isCurrent ? C.blue : C.line}`,
                  color: st.done ? C.paper : isCurrent ? C.blue : C.mute,
                  fontSize: { xs: 12, sm: 10.5 },
                  fontWeight: 800,
                }}
              >
                {st.done ? <CheckRounded sx={{ fontSize: { xs: 17, sm: 14 } }} /> : i + 1}
              </Box>
              <Typography
                sx={{
                  ml: { xs: 0, sm: 0.6 },
                  mt: { xs: 0.75, sm: 0 },
                  fontSize: { xs: 11, sm: 12 },
                  lineHeight: { xs: 1.25, sm: 1.5 },
                  textAlign: { xs: 'center', sm: 'left' },
                  fontWeight: isCurrent ? 800 : 600,
                  color: st.done ? C.green : isCurrent ? C.ink : C.mute,
                  whiteSpace: { xs: 'normal', sm: 'nowrap' },
                }}
              >
                {st.label}
                <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                  {st.done ? ' (done)' : isCurrent ? ' (current step)' : ''}
                </Box>
              </Typography>
            </Stack>
          );
        })}
      </Stack>
  );

  // Phones: a panel of its own — count, status, steps, then the next step as a real button.
  if (isPhone) {
    const doneCount = steps.filter((st) => st.done).length;
    return (
      <Box sx={{ mt: 2, p: 1.75, borderRadius: 3, bgcolor: C.page, border: `1px solid ${C.line}` }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} sx={{ mb: 1.75 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: C.ink }}>
            Progress <Box component="span" sx={{ color: C.mute, fontWeight: 600 }}>· {doneCount} of {steps.length}</Box>
          </Typography>
          <StageChip stage={m.stage} />
        </Stack>
        {stepsEl}
        <Typography sx={{ mt: 1.75, fontSize: 13, lineHeight: 1.5, color: C.ink }}>{next.text}</Typography>
        {next.tab && next.cta && (
          <WtButton size="small" fullWidth onClick={() => onOpen(next.tab!)} sx={{ mt: 1.25 }}>
            {next.cta}
          </WtButton>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 1.5 }}>
      {stepsEl}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.75 }} flexWrap="wrap">
        <StageChip stage={m.stage} />
        <Typography sx={{ fontSize: 12.5, color: C.mute }}>{next.text}</Typography>
        {next.tab && next.cta && (
          <Box
            component="button"
            type="button"
            onClick={() => onOpen(next.tab!)}
            sx={{ border: 0, bgcolor: 'transparent', color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', p: 0 }}
          >
            {next.cta}
          </Box>
        )}
      </Stack>
    </Box>
  );
}

/** A labelled field in a phone MoM card. */
function MomField({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : 'auto', minWidth: 0 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.mute, mb: 0.4 }}>{label}</Typography>
      {children}
    </Box>
  );
}

function StageChip({ stage }: { stage?: MeetingStage }) {
  const meta = stage ? STAGE_META[stage] : null;
  if (!meta) return null;
  return (
    <Tooltip title={meta.hint} arrow>
      <Chip
        size="small"
        icon={stage === 'COMPLETED' ? <CheckRounded sx={{ fontSize: 14 }} /> : undefined}
        label={meta.label}
        sx={{
          height: 22,
          fontSize: 11,
          fontWeight: 700,
          bgcolor: meta.bg,
          color: meta.fg,
          '& .MuiChip-icon': { color: meta.fg, ml: 0.5 },
        }}
      />
    </Tooltip>
  );
}

function FilterGroup({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Box role="group" aria-label={title}>
      <Stack direction="row" alignItems="baseline" gap={0.75} sx={{ mb: 0.75 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{title}</Typography>
        {hint && <Typography sx={{ fontSize: 11, color: C.mute }}>{hint}</Typography>}
      </Stack>
      <Stack direction="row" flexWrap="wrap" useFlexGap gap={0.75}>
        {children}
      </Stack>
    </Box>
  );
}

function FilterOption({
  active,
  onClick,
  label,
  count,
  tone,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: { fg: string; bg: string };
  title?: string;
}) {
  const fg = tone?.fg ?? C.blue;
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={active}
      title={title}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        border: `1px solid ${active ? fg : C.line}`,
        bgcolor: active ? tone?.bg ?? C.blueSoft : C.paper,
        color: active ? fg : C.ink,
        borderRadius: 999,
        px: 1.1,
        py: 0.4,
        fontSize: 12,
        fontWeight: active ? 700 : 600,
        cursor: 'pointer',
        '&:focus-visible': { outline: `2px solid ${fg}`, outlineOffset: 2 },
      }}
    >
      {active && <CheckRounded sx={{ fontSize: 14 }} />}
      {label}
      <Box component="span" sx={{ color: C.mute, fontWeight: 600 }}>
        {count}
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
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
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
    <Stack spacing={isPhone ? 2 : 1.75} sx={{ opacity: loading ? 0.72 : 1, transition: 'opacity .18s ease' }}>
      <Box
        sx={{
          bgcolor: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          p: isPhone ? 2 : { xs: 1.5, md: 2 },
        }}
      >
        {isPhone && onBack && (
          <Box
            component="button"
            type="button"
            onClick={onBack}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mb: 1.5,
              ml: -0.5,
              px: 0.5,
              py: 0.25,
              border: 0,
              borderRadius: 1.5,
              bgcolor: 'transparent',
              color: C.blue,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              '&:focus-visible': { outline: `2px solid ${C.blue}`, outlineOffset: 2 },
            }}
          >
            <ArrowBackRounded sx={{ fontSize: 18 }} />
            All meetings
          </Box>
        )}
        <Stack direction="row" spacing={1.25} alignItems="flex-start">
          {!isPhone && onBack && (
            <IconButton
              aria-label="Back to meetings"
              onClick={onBack}
              size="small"
              sx={{ mt: 0.25, border: `1px solid ${C.line}` }}
            >
              <ArrowBackRounded fontSize="small" />
            </IconButton>
          )}
          {!isPhone && <DateBadge date={meeting.startDate} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 22 }, color: C.ink, letterSpacing: '-0.02em' }}>
              {meeting.title}
            </Typography>
            {isPhone ? (
              // Phones: date + time on one line, the place clamped to two.
              <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={1.5} rowGap={0.5} sx={{ mt: 0.75, color: C.mute, fontSize: 12.5 }}>
                <Stack direction="row" alignItems="center" gap={0.75} sx={{ whiteSpace: 'nowrap' }}>
                  <span>{fmtDate(meeting.startDate)}</span>
                  <AccessTimeRounded sx={{ fontSize: 15 }} />
                  {fmtTime(meeting.startDate)}–{fmtTime(meeting.endDate)}
                </Stack>
                <Stack direction="row" alignItems="flex-start" gap={0.4} sx={{ minWidth: 0, flexBasis: '100%' }}>
                  <PlaceOutlined sx={{ fontSize: 15, mt: '2px', flexShrink: 0 }} />
                  <Box
                    component="span"
                    sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {placeLabel(meeting)}
                  </Box>
                </Stack>
              </Stack>
            ) : (
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
            )}
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
                  sx={{ maxWidth: { xs: '100%', sm: 'none' } }}
                />
              )}
              <Chip
                size="small"
                variant="outlined"
                label={`${agendaCount} agenda item${agendaCount === 1 ? '' : 's'}`}
              />
            </Stack>
            <MeetingTracker meeting={listMeeting} onOpen={setDetailTab} />
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
          role="tablist"
          sx={
            isPhone
              ? // Phones: a segmented control — three thumb-sized pills on a tinted track.
                { mt: 2, p: 0.5, bgcolor: C.slate, borderRadius: 999 }
              : { mt: 2, borderBottom: `1px solid ${C.line}`, overflowX: 'auto' }
          }
        >
          {(
            [
              { key: 'overview', label: 'Overview' },
              { key: 'agenda', label: `Agenda (${agendaCount})` },
              { key: 'mom', label: isPhone ? 'MoM' : 'Minutes of Meeting' },
            ] as const
          ).map((t) => {
            const active = detailTab === t.key;
            return (
              <Box
                key={t.key}
                component="button"
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDetailTab(t.key)}
                sx={
                  isPhone
                    ? {
                        flex: 1,
                        border: 0,
                        borderRadius: 999,
                        py: 1,
                        fontSize: 13,
                        fontWeight: active ? 800 : 600,
                        color: active ? C.blue : C.mute,
                        bgcolor: active ? C.paper : 'transparent',
                        boxShadow: active ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background-color .15s ease, color .15s ease',
                      }
                    : {
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
                      }
                }
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
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const agendaItemsText = `${items.length || listMeeting.agendaCount} item(s)`;
  // Was the location by mistake; it is the meeting's type and mode.
  const meetingTypeText = [
    meeting.meetingType === 'PROJECT' ? 'Project meeting' : 'General meeting',
    MODE_LABEL[meeting.meetingMode as string],
  ].filter(Boolean).join(' · ');
  const projectText = [meeting.projectNumber, meeting.projectName].filter(Boolean).join(' — ') || '—';

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
      {isPhone ? (
        // Phones: one card, short facts side by side and long ones full width — four tall cards
        // were a screenful on a phone.
        <Box
          component="dl"
          sx={{
            m: 0,
            p: 1.5,
            bgcolor: C.paper,
            border: `1px solid ${C.line}`,
            borderRadius: 2.5,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            columnGap: 2,
            rowGap: 1.5,
          }}
        >
          <InfoItem title="Agenda items" body={agendaItemsText} />
          <InfoItem title="Meeting type" body={meetingTypeText} />
          <InfoItem title="Location" body={placeLabel(meeting)} wide />
          <InfoItem title="Project" body={projectText} wide />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <InfoCard title="Agenda items" body={agendaItemsText} />
          <InfoCard title="Location" body={placeLabel(meeting)} />
          <InfoCard title="Meeting type" body={meetingTypeText} />
          <InfoCard title="Project" body={projectText} />
        </Box>
      )}
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

const MODE_LABEL: Record<string, string> = { ONLINE: 'Online', OFFLINE: 'In person', HYBRID: 'Hybrid' };

function InfoItem({ title, body, wide }: { title: string; body: string; wide?: boolean }) {
  return (
    <Box sx={{ gridColumn: wide ? '1 / -1' : 'auto', minWidth: 0 }}>
      <Typography component="dt" sx={{ fontSize: 11.5, fontWeight: 700, color: C.mute, mb: 0.25 }}>
        {title}
      </Typography>
      <Typography component="dd" sx={{ m: 0, fontSize: 13, fontWeight: 700, color: C.ink, overflowWrap: 'anywhere' }}>
        {body}
      </Typography>
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
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  // Lines that can become tasks now: an assignee, and not a task yet.
  const readyToAssign = momItems.filter((it: any) => it.responsibleUserId && !it.taskId).length;
  // Done: at least one task made, and nothing with an assignee left to make into one.
  const allAssigned = readyToAssign === 0 && momItems.some((it: any) => it.taskId);
  const meetingOver = !!meeting?.endDate && dayjs(meeting.endDate).isBefore(dayjs());
  const [assigning, setAssigning] = useState(false);

  /** One MoM line's fields — shared by the desktop table and the phone cards. */
  const lineFields = (item: any) => {
    const rowBusy = rowBusyId === item.id;
    // Once a line is a task, its assignee and due date live on the task.
    const lineEditable = rowsEditable && !item.taskId;
    const dueVal = item.targetCompletionDate ? dayjs(item.targetCompletionDate).format('YYYY-MM-DD') : '';
    return {
      title: (
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
          <Box component="span" sx={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{item.description}</Box>
          {item.addedInMom && (
            <Chip
              size="small"
              label="Not on agenda"
              sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: C.slate, color: C.mute }}
            />
          )}
          {item.taskId && (
            <Chip
              size="small"
              label="Task assigned"
              sx={{ height: 20, fontSize: 10.5, fontWeight: 700, bgcolor: C.greenWash, color: C.green }}
            />
          )}
        </Stack>
      ),
      assignee: lineEditable ? (
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
            ariaLabel={`Assignee for ${item.description}`}
            onChange={(next) => {
              const opt = next as WtSelectOption | null;
              void patchItem(item.id, { responsibleUserId: opt?.value || null }, { responsibleName: opt?.label || null });
            }}
          />
        </Box>
      ) : (
        <Box component="span" sx={{ fontSize: 13 }}>{item.responsibleName || '—'}</Box>
      ),
      due: lineEditable ? (
        <WtDateField
          label=""
          value={dueVal}
          disabled={rowBusy}
          onChange={(v) => {
            void patchItem(item.id, { targetCompletionDate: v || null });
          }}
        />
      ) : (
        <Box component="span" sx={{ fontSize: 13 }}>{fmtDate(item.targetCompletionDate)}</Box>
      ),
      status: rowsEditable && statusOptions.length ? (
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
            void patchItem(item.id, { status: opt.value }, { statusLabel: opt.label, statusColor: opt.color });
          }}
        />
      ) : (
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ fontSize: 13 }}>
          <Box aria-hidden sx={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, bgcolor: item.statusColor || C.mute }} />
          <span>{item.statusLabel || item.status || '—'}</span>
        </Stack>
      ),
      note: rowsEditable ? (
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
        <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 13, color: item.remarks ? C.ink : C.mute }}>{item.remarks || '—'}</Box>
      ),
      // Agenda items leave the MoM by unticking them on the Agenda tab.
      remove: rowsEditable && item.addedInMom ? (
        <WtIconButton
          title="Remove topic"
          color="#DC2626"
          disabled={rowBusy}
          onClick={() => removeTopic(item.id)}
          sx={{ width: 32, height: 32, borderRadius: '10px', flexShrink: 0 }}
        >
          <AppIcon name="bi-trash" fallbackSize={14} />
        </WtIconButton>
      ) : null,
    };
  };

  const assignTasks = async () => {
    setAssigning(true);
    try {
      const res = await assignMomTasks(meetingId);
      await onRefresh();
      const skipped: Array<{ description: string; reason: string }> = res?.skipped || [];
      if (skipped.length) {
        onError(
          `${res?.created ? `${res.created} assigned. ` : ''}Not assigned: ${skipped
            .map((x) => `${x.description} (${x.reason})`)
            .join('; ')}`,
        );
      } else if (res?.created) {
        void successConfirmation(
          `${res.created} task${res.created === 1 ? '' : 's'} assigned. They now appear on each person's task board.`,
          'Tasks assigned',
        );
      }
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setAssigning(false);
    }
  };

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
            {isPhone ? (
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: C.mute }}>Document No.</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.ink, letterSpacing: '0.01em' }}>
                  {minutes.documentNo || '—'}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 13, color: C.mute }}>
                Document No. {minutes.documentNo || '—'}
              </Typography>
            )}
          </Stack>
          {/* Phones: the two actions share one row, half each. */}
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'nowrap', sm: 'wrap' }, '& > *': { flex: { xs: 1, sm: 'none' } } }}
          >
            {rowsEditable && (
              <Tooltip
                arrow
                title={
                  allAssigned
                    ? 'Tasks have already been assigned. Each person can see theirs on their task board.'
                    : !meetingOver
                      ? 'Available once the meeting has ended.'
                      : !readyToAssign
                        ? 'No line has an assignee yet. Pick an assignee on a line to assign it as a task.'
                        : 'Create a task for each line that has an assignee, on their task board.'
                }
              >
                {/* span: a disabled button fires no hover, so the tooltip needs a live wrapper. */}
                <Box component="span" sx={{ display: { xs: 'flex', sm: 'inline' } }}>
                  <WtButton
                    size="small"
                    inverted
                    fullWidth={isPhone}
                    disabled={assigning || allAssigned || !meetingOver || !readyToAssign}
                    onClick={assignTasks}
                    startIcon={allAssigned ? <CheckRounded /> : undefined}
                  >
                    {assigning
                      ? 'Assigning…'
                      : allAssigned
                        ? 'Tasks assigned'
                        : `Assign tasks${readyToAssign ? ` (${readyToAssign})` : ''}`}
                  </WtButton>
                </Box>
              </Tooltip>
            )}
            {canExport && (
              <WtButton size="small" disabled={busy} onClick={exportPdf} sx={{ whiteSpace: { xs: 'nowrap', sm: 'normal' } }}>
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
          // Phones get one card per line (fields stacked, nothing to scroll sideways); wider
          // screens the table. Both draw the same fields from `lineFields`.
          isPhone ? (
            <Stack spacing={1.25} sx={{ p: 1.25, bgcolor: C.page }}>
              {momItems.map((item: any, idx: number) => {
                const f = lineFields(item);
                return (
                  <Box
                    key={item.id}
                    sx={{
                      p: 1.75,
                      bgcolor: C.paper,
                      border: `1px solid ${C.line}`,
                      // The line's status colour, readable at a glance while scrolling.
                      borderLeft: `4px solid ${item.statusColor || C.line}`,
                      borderRadius: 2.5,
                    }}
                  >
                    <Stack direction="row" alignItems="flex-start" gap={1.25}>
                      <Box
                        aria-hidden
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          bgcolor: C.slate,
                          color: C.mute,
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: 11.5,
                          fontWeight: 800,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0, pt: '2px' }}>{f.title}</Box>
                      {f.remove}
                    </Stack>
                    {/* Due date + Status share a row when each gets 150px; on the narrowest phones they stack. */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', columnGap: 1.25, rowGap: 1.5, mt: 1.75 }}>
                      <MomField label="Assignee" wide>{f.assignee}</MomField>
                      <MomField label="Due date">{f.due}</MomField>
                      <MomField label="Status">{f.status}</MomField>
                      <MomField label="Note" wide>{f.note}</MomField>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
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
                  const f = lineFields(item);
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ color: C.mute, width: 36 }}>{idx + 1}</Box>
                      <Box component="td" sx={{ minWidth: 180 }}>{f.title}</Box>
                      <Box component="td" sx={{ minWidth: 200 }}>{f.assignee}</Box>
                      <Box component="td" sx={{ whiteSpace: 'nowrap', minWidth: 150 }}>{f.due}</Box>
                      <Box component="td" sx={{ minWidth: 160 }}>{f.status}</Box>
                      <Box component="td" sx={{ minWidth: 220 }}>{f.note}</Box>
                      {rowsEditable && <Box component="td" sx={{ textAlign: 'center' }}>{f.remove}</Box>}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
          )
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
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
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
          // Phones: one row — the count on the left, both actions on the right.
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            useFlexGap
            sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: { xs: 'nowrap', sm: 'wrap' } }}
          >
            {items.length > 0 && (
              <>
                <Typography sx={{ fontSize: 12.5, color: C.mute, whiteSpace: 'nowrap', mr: { xs: 'auto', sm: 0 } }}>
                  {checked.size} of {items.length} selected
                </Typography>
                <WtButton size="small" inverted disabled={converting} onClick={convert} sx={{ whiteSpace: { xs: 'nowrap', sm: 'normal' } }}>
                  {converting ? 'Converting…' : 'Convert to MoM'}
                </WtButton>
              </>
            )}
            <WtButton
              size="small"
              onClick={() => setOpen(true)}
              aria-label="Add agenda items"
              sx={{ whiteSpace: { xs: 'nowrap', sm: 'normal' }, ml: { xs: items.length ? 0 : 'auto', sm: 0 } }}
            >
              {isPhone ? '+ Add' : '+ Add agenda items'}
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
