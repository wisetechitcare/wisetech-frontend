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
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import FormatIndentIncrease from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecrease from '@mui/icons-material/FormatIndentDecrease';
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenter from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRight from '@mui/icons-material/FormatAlignRight';
import dayjs from 'dayjs';
import { hasPermission } from '@utils/authAbac';
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from '@constants/statistics';
import {
  AppIcon,
  WtButton,
  WtDateField,
  WtIconButton,
  WtSelect,
  type WtSelectOption,
} from '@app/modules/common/components/ui';
import { useEmployeeDirectory } from '@app/modules/common/components/EmployeePickerField';
import MeetingDialog from '../../MeetingDialog';
import TaskPathSelect, { buildTaskPathOptions } from '../../tasks/components/TaskPathSelect';
import { usePresetTasks } from '../../tasks/useTaskQueries';
import { useProjectDeliverables } from '../../tasks/useProjectDeliverables';
import { getPresetSubtreeIds } from '@utils/presetTaskHierarchy';
import type { PresetTask } from '../../tasks/taskDomain';
import { getProjectTeam } from '@services/tasks';
import {
  amendMeetingMinutes,
  createAgendaItem,
  createAgendaItemsBulk,
  createMeetingMinutesDraft,
  deleteAgendaItem,
  downloadMeetingMinutesPdf,
  getAgendaItems,
  getCompanyAgendaCategories,
  getCompanyAgendaStatuses,
  getMeetingDetail,
  getMeetingMinutes,
  getMeetingsAgendaHub,
  updateAgendaItem,
  updateMeetingMinutesDraft,
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
  purposeCode?: string | null;
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
const errMsg = (e: unknown) => {
  const any = e as any;
  return any?.response?.data?.message || any?.message || 'Something went wrong';
};

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

/** Soft chip wash from a configure colour hex. */
const statusTone = (label?: string | null, color?: string | null) => {
  const fg = color || '#475569';
  const bg = (() => {
    const hex = fg.replace('#', '');
    if (hex.length !== 6) return '#F1F5F9';
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r},${g},${b},0.14)`;
  })();
  return { bg, fg, label: label || '—' };
};

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
        setError(e?.response?.data?.message || 'Could not load meetings');
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
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (!opts?.silent) setDetailLoading(true);
    try {
      const [d, agenda, mom] = await Promise.all([
        getMeetingDetail(meetingId),
        getAgendaItems(meetingId),
        getMeetingMinutes(meetingId).catch(() => ({ minutes: null })),
      ]);
      if (ac.signal.aborted) return null;
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
      if (!ac.signal.aborted) {
        setError(e?.response?.data?.message || 'Could not load meeting detail');
      }
      return null;
    } finally {
      if (!ac.signal.aborted && !opts?.silent) setDetailLoading(false);
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
  const minutes = cached?.minutes;
  const perms = cached?.permissions;
  const purposeOptions = cached?.purposeOptions || [];
  const agendaCount = cached ? items.length : listMeeting.agendaCount;
  const permsLoaded = perms != null;
  const canEditMom = !!perms?.canEditMom;
  const canEditAgenda = !!perms?.canEditAgenda;
  const minutesFinal = minutes?.status === 'FINAL';
  const accessBadge = (() => {
    if (!permsLoaded) return null;
    if (minutesFinal) {
      return {
        label: 'Finalized',
        tip: canEditMom
          ? 'Minutes are finalized. Notes are locked — open Minutes of Meeting and create an amendment draft to edit them.'
          : 'Minutes are finalized and read-only. Only the organizer or a project manager can create an amendment.',
        bg: '#DCFCE7',
        fg: '#166534',
      };
    }
    if (!canEditMom && !canEditAgenda) {
      return {
        label: 'View only',
        tip: 'Only the meeting organizer or a project manager can edit the agenda and discussion notes.',
        bg: C.slate,
        fg: C.mute,
      };
    }
    if (!canEditMom) {
      return {
        label: 'View only',
        tip: 'Only the organizer or a project manager can edit discussion notes and decisions.',
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
              {(meeting.purposeLabel || listMeeting.purposeLabel) && (
                <span>{meeting.purposeLabel || listMeeting.purposeLabel}</span>
              )}
            </Stack>
            <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ mt: 1.25 }}>
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
          items={items}
          purposeOptions={purposeOptions}
          canEdit={!!perms?.canManage}
          onRefresh={onRefresh}
          onError={onError}
        />
      ) : detailTab === 'mom' ? (
        <MomPanel
          meetingId={listMeeting.id}
          minutes={minutes}
          canEdit={!!perms?.canEditMom}
          canFinalize={!!perms?.canFinalizeMom}
          canExport={!!perms?.canExportPdf}
          onRefresh={onRefresh}
          onError={onError}
        />
      ) : (
        <AgendaPanel
          key={listMeeting.id}
          meetingId={listMeeting.id}
          meeting={meeting}
          items={items}
          canEdit={!!perms?.canEditAgenda}
          permsLoaded={perms != null}
          onRefresh={onRefresh}
          onPatchItem={onPatchItem}
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
  const [purposeCode, setPurposeCode] = useState(meeting?.purposeCode || listMeeting.purposeCode || '');
  const [other, setOther] = useState(meeting?.purposeOtherText || '');
  const [busy, setBusy] = useState(false);
  const needsOther = !!(
    purposeOptions.find((o) => o.code === purposeCode)?.requiresOther
    || purposeCode === 'OTHER'
  );

  useEffect(() => {
    setPurposeCode(meeting?.purposeCode || listMeeting.purposeCode || '');
    setOther(meeting?.purposeOtherText || '');
  }, [meeting?.purposeCode, meeting?.purposeOtherText, listMeeting.purposeCode]);

  const savePurpose = async () => {
    setBusy(true);
    try {
      await updateMeetingPurpose(meetingId, {
        purposeCode: purposeCode || null,
        purposeOtherText: needsOther ? other : null,
      });
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 1, color: C.ink }}>Purpose</Typography>
        {canEdit ? (
          <Stack spacing={1.25}>
            <TextField
              select
              size="small"
              label="Purpose"
              value={purposeCode}
              onChange={(e) => setPurposeCode(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Not set</MenuItem>
              {purposeOptions.map((o) => (
                <MenuItem key={o.code} value={o.code}>{o.label}</MenuItem>
              ))}
            </TextField>
            {needsOther && (
              <TextField
                size="small"
                label="Please specify"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                fullWidth
              />
            )}
            <WtButton size="small" disabled={busy} onClick={savePurpose} sx={{ alignSelf: 'flex-start' }}>
              Save purpose
            </WtButton>
          </Stack>
        ) : (
          <Typography fontWeight={700}>
            {meeting.purposeLabel || listMeeting.purposeLabel || 'Not set'}
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
  minutes,
  canEdit,
  canFinalize,
  canExport,
  onRefresh,
  onError,
}: {
  meetingId: string;
  minutes: any;
  canEdit: boolean;
  canFinalize: boolean;
  canExport: boolean;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [discussionNotes, setDiscussionNotes] = useState(minutes?.discussionNotes || '');
  const [decisions, setDecisions] = useState(minutes?.decisions || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDiscussionNotes(minutes?.discussionNotes || '');
    setDecisions(minutes?.decisions || '');
  }, [minutes?.id, minutes?.discussionNotes, minutes?.decisions, minutes?.revision]);

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

  const saveNotes = async () => {
    setBusy(true);
    try {
      await updateMeetingMinutesDraft(meetingId, { discussionNotes, decisions });
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const amend = async () => {
    setBusy(true);
    try {
      await amendMeetingMinutes(meetingId);
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
          No Minutes of Meeting yet. Generate a draft to record discussion notes and decisions.
        </Alert>
        {canEdit && (
          <WtButton size="small" disabled={busy} onClick={generate}>
            Generate MoM draft
          </WtButton>
        )}
      </Stack>
    );
  }

  const isFinal = minutes.status === 'FINAL';
  const isDraft = minutes.status === 'DRAFT';

  return (
    <Stack spacing={1.5}>
      <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap gap={1}>
          <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
            <Chip size="small" label={isFinal ? 'Finalized' : 'Draft'} color={isFinal ? 'success' : 'default'} />
            <Typography sx={{ fontSize: 13, color: C.mute }}>
              Document No. {minutes.documentNo || '—'} · Rev. {String(minutes.revision ?? 0).padStart(2, '0')}
            </Typography>
          </Stack>
          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
            {canExport && (
              <WtButton size="small" disabled={busy} onClick={exportPdf}>
                Download PDF
              </WtButton>
            )}
            {canFinalize && isFinal && (
              <WtButton size="small" inverted disabled={busy} onClick={amend}>
                Create amendment draft
              </WtButton>
            )}
            {canEdit && isDraft && (
              <WtButton size="small" inverted disabled={busy} onClick={saveNotes}>
                Save notes
              </WtButton>
            )}
          </Stack>
        </Stack>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: 14, color: C.ink, pt: 0.5 }}>
        Discussion notes & decisions
      </Typography>
      <NotesDecisionsEditors
        discussionNotes={discussionNotes}
        decisions={decisions}
        setDiscussionNotes={setDiscussionNotes}
        setDecisions={setDecisions}
        readOnly={!isDraft || !canEdit}
        seed={`${minutes?.id || 'none'}-${minutes?.revision ?? 0}`}
      />
    </Stack>
  );
}

type RichCmd =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'indent'
  | 'outdent'
  | 'justifyLeft'
  | 'justifyCenter'
  | 'justifyRight'
  | 'justifyFull';

/**
 * Uncontrolled rich field: React never rewrites the DOM while you type
 * (controlled contentEditable + setState was wiping bold/lists).
 * Seeds only when `seed` changes (minutes id / revision).
 */
const RICH_STATE_CMDS: RichCmd[] = [
  'bold',
  'italic',
  'underline',
  'insertUnorderedList',
  'insertOrderedList',
  'justifyLeft',
  'justifyCenter',
  'justifyRight',
];

function MomRichField({
  label,
  value,
  onChange,
  readOnly,
  placeholder,
  seed,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  readOnly: boolean;
  placeholder: string;
  seed: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastSeed = useRef('');
  const [active, setActive] = useState<Partial<Record<RichCmd, boolean>>>({});

  useEffect(() => {
    if (!ref.current) return;
    if (lastSeed.current === seed) return;
    lastSeed.current = seed;
    ref.current.innerHTML = value || '';
  }, [seed, value]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.contentEditable = readOnly ? 'false' : 'true';
  }, [readOnly]);

  const syncActive = useCallback(() => {
    if (readOnly || !ref.current) {
      setActive({});
      return;
    }
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode || !ref.current.contains(sel.anchorNode)) {
      setActive({});
      return;
    }
    const next: Partial<Record<RichCmd, boolean>> = {};
    for (const cmd of RICH_STATE_CMDS) {
      try {
        next[cmd] = document.queryCommandState(cmd);
      } catch {
        next[cmd] = false;
      }
    }
    // Default align-left when no explicit alignment is set
    if (!next.justifyCenter && !next.justifyRight && !next.justifyFull) {
      next.justifyLeft = true;
    }
    setActive(next);
  }, [readOnly]);

  useEffect(() => {
    if (readOnly) return undefined;
    const onSel = () => syncActive();
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [readOnly, syncActive]);

  const emit = () => {
    if (!ref.current) return;
    onChange(ref.current.innerHTML);
    syncActive();
  };

  const ensureCaret = () => {
    if (!ref.current) return;
    ref.current.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (sel.rangeCount === 0 || !ref.current.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  const run = (cmd: RichCmd) => {
    if (readOnly || !ref.current) return;
    ensureCaret();
    try {
      document.execCommand('styleWithCSS', false, 'false');
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch {
      /* older browsers */
    }
    document.execCommand(cmd, false);
    emit();
    syncActive();
  };

  const toolBtn = (
    cmd: RichCmd,
    title: string,
    content: ReactNode,
    sxExtra?: Record<string, unknown>,
  ) => {
    const isOn = !!active[cmd];
    return (
      <Tooltip key={cmd + title} title={title} enterDelay={400}>
        <Box
          component="button"
          type="button"
          aria-label={title}
          aria-pressed={isOn}
          onMouseDown={(e) => {
            e.preventDefault();
            run(cmd);
          }}
          sx={{
            border: `1px solid ${isOn ? C.blue : C.line}`,
            bgcolor: isOn ? C.blueSoft : C.slate,
            borderRadius: 1,
            minWidth: 30,
            height: 28,
            px: 0.85,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: isOn ? 800 : 600,
            color: isOn ? C.blue : C.ink,
            cursor: 'pointer',
            lineHeight: 1,
            boxShadow: isOn ? 'inset 0 0 0 1px rgba(29,78,216,0.25)' : 'none',
            '&:hover': {
              bgcolor: isOn ? '#DBEAFE' : '#E8EEF8',
              borderColor: isOn ? C.blue : '#BFDBFE',
            },
            '& .MuiSvgIcon-root': { fontSize: 16, color: 'inherit' },
            ...sxExtra,
          }}
        >
          {content}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ p: 1.75, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, mb: 1, color: C.ink }}>{label}</Typography>
      {!readOnly && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            mb: 1,
            flexWrap: 'nowrap',
            alignItems: 'center',
            overflowX: 'auto',
            pb: 0.25,
            '&::-webkit-scrollbar': { height: 4 },
          }}
        >
          {toolBtn('bold', 'Bold', 'B', { fontWeight: 800 })}
          {toolBtn('italic', 'Italic', 'I', { fontStyle: 'italic' })}
          {toolBtn('underline', 'Underline', 'U', { textDecoration: 'underline' })}
          {toolBtn('insertUnorderedList', 'Bulleted list', <FormatListBulleted />)}
          {toolBtn('insertOrderedList', 'Numbered list', <FormatListNumbered />)}
          {toolBtn('outdent', 'Decrease indent', <FormatIndentDecrease />)}
          {toolBtn('indent', 'Increase indent', <FormatIndentIncrease />)}
          {toolBtn('justifyLeft', 'Align left', <FormatAlignLeft />)}
          {toolBtn('justifyCenter', 'Align center', <FormatAlignCenter />)}
          {toolBtn('justifyRight', 'Align right', <FormatAlignRight />)}
        </Stack>
      )}
      <Box
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline
        aria-readonly={readOnly}
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onKeyUp={syncActive}
        onMouseUp={syncActive}
        onFocus={syncActive}
        onKeyDown={(e) => {
          if (readOnly) return;
          // Tab indents list items like Word
          if (e.key === 'Tab') {
            e.preventDefault();
            run(e.shiftKey ? 'outdent' : 'indent');
          }
        }}
        sx={{
          minHeight: 160,
          px: 1.5,
          py: 1.15,
          borderRadius: 1.5,
          border: `1px solid ${C.line}`,
          bgcolor: readOnly ? C.slate : '#fff',
          outline: 'none',
          fontSize: 13.5,
          lineHeight: 1.6,
          color: C.ink,
          cursor: readOnly ? 'default' : 'text',
          '&:focus': { borderColor: C.blue, boxShadow: '0 0 0 2px rgba(29,78,216,0.12)' },
          '&:empty:before': {
            content: 'attr(data-placeholder)',
            color: C.mute,
            pointerEvents: 'none',
          },
          '& b, & strong': { fontWeight: 700 },
          '& i, & em': { fontStyle: 'italic' },
          '& u': { textDecoration: 'underline' },
          '& p': { m: 0, mb: 0.35 },
          '& ul, & ol': {
            margin: '0.35em 0',
            paddingLeft: '1.6em',
            listStylePosition: 'outside',
          },
          '& ul': { listStyleType: 'disc' },
          '& ul ul': { listStyleType: 'circle' },
          '& ul ul ul': { listStyleType: 'square' },
          '& ol': { listStyleType: 'decimal' },
          '& ol ol': { listStyleType: 'lower-alpha' },
          '& ol ol ol': { listStyleType: 'lower-roman' },
          '& li': { margin: '0.15em 0', display: 'list-item' },
          '& li > p': { margin: 0 },
          '& li + li': { marginTop: '0.2em' },
        }}
      />
    </Box>
  );
}

function NotesDecisionsEditors({
  discussionNotes,
  decisions,
  setDiscussionNotes,
  setDecisions,
  readOnly,
  seed,
}: {
  discussionNotes: string;
  decisions: string;
  setDiscussionNotes: (v: string) => void;
  setDecisions: (v: string) => void;
  readOnly: boolean;
  seed: string;
}) {
  return (
    <Stack spacing={1.5}>
      <MomRichField
        label="Discussion notes"
        value={discussionNotes}
        onChange={setDiscussionNotes}
        readOnly={readOnly}
        placeholder="Key discussion points from the meeting."
        seed={`${seed}:d`}
      />
      <MomRichField
        label="Decisions"
        value={decisions}
        onChange={setDecisions}
        readOnly={readOnly}
        placeholder="Key decisions taken in this meeting."
        seed={`${seed}:c`}
      />
    </Stack>
  );
}

function AgendaPanel({
  meetingId,
  meeting,
  items,
  canEdit,
  permsLoaded,
  onRefresh,
  onPatchItem,
  onError,
}: {
  meetingId: string;
  meeting: any;
  items: any[];
  canEdit: boolean;
  permsLoaded: boolean;
  onRefresh: () => Promise<void>;
  onPatchItem: (meetingId: string, itemId: string, patch: Record<string, unknown>) => void;
  onError: (m: string) => void;
}) {
  const [agendaSearch, setAgendaSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [selectedAgenda, setSelectedAgenda] = useState<Array<{ id: string; label: string }>>([]);
  const [assignToId, setAssignToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [addCategoryId, setAddCategoryId] = useState('');
  const [teamIds, setTeamIds] = useState<Set<string> | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [statusOptions, setStatusOptions] = useState<
    Array<{ code: string; name: string; color: string }>
  >([]);
  const [addStatusCode, setAddStatusCode] = useState('');
  const { data: directory = [], isLoading: directoryLoading } = useEmployeeDirectory();

  const patchItem = async (
    itemId: string,
    payload: Record<string, unknown>,
    displayPatch?: Record<string, unknown>,
  ) => {
    setRowBusyId(itemId);
    // Optimistic row update — avoid full hub reload (that spun the whole page).
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

  const visibleItems = useMemo(() => {
    if (!agendaSearch.trim()) return items;
    return items.filter((it: any) => {
      const hay = [
        it.description,
        it.responsibleName,
        it.category?.name,
        it.statusLabel || it.status,
        it.targetCompletionDate ? dayjs(it.targetCompletionDate).format('DD MMM YYYY') : '',
      ].filter(Boolean).join(' ');
      return matchesQuery(hay, agendaSearch);
    });
  }, [items, agendaSearch]);

  const projectId = meeting?.projectId || null;
  const presetsQuery = usePresetTasks('PROJECT');
  const deliverables = useProjectDeliverables(projectId);
  const presets = (presetsQuery.data?.presetTaskStatuses ?? []) as PresetTask[];
  const { deliverableTaskIds } = deliverables;
  const fromDeliverables = !!projectId && deliverableTaskIds.length > 0;

  const agendaOptions = useMemo(() => {
    if (!fromDeliverables) return buildTaskPathOptions(presets);
    const only = new Set<string>();
    deliverableTaskIds.forEach((id) => getPresetSubtreeIds(presets, id).forEach((n) => only.add(n)));
    return buildTaskPathOptions(presets, only);
  }, [presets, fromDeliverables, deliverableTaskIds]);

  const agendaPickerOptions = useMemo(() => {
    const takenIds = new Set(selectedAgenda.map((a) => a.id));
    const takenLabels = new Set([
      ...selectedAgenda.map((a) => a.label),
      ...items.map((i) => String(i.description || '')),
    ]);
    return agendaOptions.filter((o) => !takenIds.has(o.id) && !takenLabels.has(o.name));
  }, [agendaOptions, selectedAgenda, items]);

  const agendaPickerKey = selectedAgenda.map((a) => a.id).join('|') || 'empty';

  useEffect(() => {
    if (!projectId) {
      setTeamIds(null);
      return;
    }
    if (!canEdit && !open) return;
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
  }, [canEdit, open, projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [catRes, stRes] = await Promise.all([
          getCompanyAgendaCategories(),
          getCompanyAgendaStatuses(),
        ]);
        const rows = (catRes?.categories || [])
          .filter((c: any) => c.isActive !== false)
          .map((c: any) => ({ id: String(c.id), name: String(c.name || '') }))
          .filter((c: { id: string; name: string }) => c.id && c.name)
          .sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
          );
        const sts = (stRes?.statuses || [])
          .filter((s: any) => s.isActive !== false)
          .map((s: any) => ({
            code: String(s.code || ''),
            name: String(s.name || ''),
            color: String(s.color || '#64748B'),
          }))
          .filter((s: { code: string; name: string }) => s.code && s.name)
          .sort((a: { name: string }, b: { name: string }) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
          );
        if (!cancelled) {
          setCategories(rows);
          setStatusOptions(sts);
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setStatusOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const defaultOpenCode = useMemo(
    () =>
      statusOptions.find((s) => s.code === 'OPEN')?.code
      || statusOptions.find((s) => /open/i.test(s.name))?.code
      || statusOptions[0]?.code
      || 'OPEN',
    [statusOptions],
  );
  const defaultInfoCode = useMemo(
    () =>
      statusOptions.find((s) => s.code === 'INFORMATION')?.code
      || statusOptions.find((s) => /info/i.test(s.name))?.code
      || statusOptions.find((s) => s.code !== defaultOpenCode)?.code
      || defaultOpenCode,
    [statusOptions, defaultOpenCode],
  );

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

  const assigneeSelected = useMemo(
    () => assigneeOptions.find((a) => a.value === assignToId) ?? null,
    [assigneeOptions, assignToId],
  );

  const resetForm = () => {
    setSelectedAgenda([]);
    setAssignToId('');
    setDueDate('');
    setAddCategoryId('');
    setAddStatusCode('');
  };

  const submit = async () => {
    if (!selectedAgenda.length) return;
    setSaving(true);
    try {
      const status =
        addStatusCode
        || (assignToId || dueDate ? defaultOpenCode : defaultInfoCode);
      const payloads = selectedAgenda.map((item) => ({
        description: item.label,
        itemMode: 'DISCUSSION',
        status,
        categoryId: addCategoryId || null,
        responsibleUserId: assignToId || null,
        targetCompletionDate: dueDate || null,
      }));
      if (payloads.length === 1) {
        await createAgendaItem(meetingId, payloads[0]);
      } else {
        await createAgendaItemsBulk(meetingId, payloads);
      }
      setOpen(false);
      resetForm();
      await onRefresh();
    } catch (e) {
      onError(errMsg(e));
    } finally {
      setSaving(false);
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
          <WtButton size="small" onClick={() => setOpen(true)}>
            + Add agenda items
          </WtButton>
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
            <Box
              component="table"
              sx={{
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
              }}
            >
              <Box component="thead">
                <Box component="tr">
                  {['#', 'Agenda item', 'Category', 'Assignee', 'Due date', 'Status', ''].map((h) => (
                    <Box component="th" key={h || 'actions'}>
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {visibleItems.map((item: any, idx: number) => {
                  const statusMeta =
                    statusOptions.find((s) => s.code === item.status)
                    || null;
                  const tone = statusTone(
                    item.statusLabel || statusMeta?.name || item.status,
                    item.statusColor || statusMeta?.color,
                  );
                  const rowBusy = rowBusyId === item.id;
                  const assigneeVal =
                    assigneeOptions.find((a) => a.value === item.responsibleUserId) || null;
                  const dueVal = item.targetCompletionDate
                    ? dayjs(item.targetCompletionDate).format('YYYY-MM-DD')
                    : '';
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ color: C.mute, width: 36 }}>
                        {idx + 1}
                      </Box>
                      <Box component="td" sx={{ minWidth: 180, fontWeight: 600 }}>
                        {item.description}
                      </Box>
                      <Box component="td" sx={{ minWidth: 140 }}>
                        {canEdit ? (
                          <TextField
                            select
                            size="small"
                            fullWidth
                            disabled={rowBusy}
                            value={item.categoryId || ''}
                            onChange={(e) => {
                              const categoryId = e.target.value || null;
                              const cat = categories.find((c) => c.id === categoryId);
                              void patchItem(
                                item.id,
                                { categoryId },
                                {
                                  categoryId,
                                  category: categoryId
                                    ? { id: categoryId, name: cat?.name || '' }
                                    : null,
                                },
                              );
                            }}
                            sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
                          >
                            <MenuItem value="">
                              <em>—</em>
                            </MenuItem>
                            {categories.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          item.category?.name || '—'
                        )}
                      </Box>
                      <Box component="td" sx={{ minWidth: 200 }}>
                        {canEdit ? (
                          <Box sx={assigneeSelectSx}>
                            <WtSelect
                              size="sm"
                              options={assigneeOptions}
                              value={assigneeVal}
                              isDisabled={rowBusy}
                              isLoading={directoryLoading}
                              isClearable
                              isSearchable
                              optionVariant="avatar"
                              placeholder="Assignee"
                              ariaLabel="Assignee"
                              onChange={(next) => {
                                const opt = next as WtSelectOption | null;
                                const status = opt || dueVal ? defaultOpenCode : item.status;
                                const meta = statusOptions.find((s) => s.code === status);
                                void patchItem(
                                  item.id,
                                  {
                                    responsibleUserId: opt?.value || null,
                                    status,
                                  },
                                  {
                                    responsibleUserId: opt?.value || null,
                                    responsibleName: opt?.label || null,
                                    status,
                                    statusLabel: meta?.name || item.statusLabel,
                                    statusColor: meta?.color || item.statusColor,
                                  },
                                );
                              }}
                            />
                          </Box>
                        ) : (
                          item.responsibleName || '—'
                        )}
                      </Box>
                      <Box component="td" sx={{ whiteSpace: 'nowrap', minWidth: 150 }}>
                        {canEdit ? (
                          <WtDateField
                            label=""
                            value={dueVal}
                            disabled={rowBusy}
                            onChange={(v) => {
                              const status = v || item.responsibleUserId ? defaultOpenCode : item.status;
                              const meta = statusOptions.find((s) => s.code === status);
                              void patchItem(
                                item.id,
                                {
                                  targetCompletionDate: v || null,
                                  status,
                                },
                                {
                                  targetCompletionDate: v || null,
                                  status,
                                  statusLabel: meta?.name || item.statusLabel,
                                  statusColor: meta?.color || item.statusColor,
                                },
                              );
                            }}
                          />
                        ) : (
                          fmtDate(item.targetCompletionDate)
                        )}
                      </Box>
                      <Box component="td" sx={{ minWidth: 130 }}>
                        {canEdit && statusOptions.length > 0 ? (
                          <TextField
                            select
                            size="small"
                            fullWidth
                            disabled={rowBusy}
                            value={
                              statusOptions.some((s) => s.code === item.status)
                                ? item.status
                                : (statusOptions[0]?.code || '')
                            }
                            onChange={(e) => {
                              const status = e.target.value;
                              const meta = statusOptions.find((s) => s.code === status);
                              void patchItem(
                                item.id,
                                { status },
                                {
                                  status,
                                  statusLabel: meta?.name || status,
                                  statusColor: meta?.color || null,
                                },
                              );
                            }}
                            sx={{ '& .MuiInputBase-root': { fontSize: 13 } }}
                          >
                            {statusOptions.map((s) => (
                              <MenuItem key={s.code} value={s.code}>
                                {s.name}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <Chip
                            size="small"
                            label={String(tone.label || '—')}
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: tone.bg,
                              color: tone.fg,
                            }}
                          />
                        )}
                      </Box>
                      <Box component="td" sx={{ width: 44, textAlign: 'center' }}>
                        {canEdit && (
                          <WtIconButton
                            title="Remove agenda item"
                            color="#DC2626"
                            disabled={rowBusy}
                            onClick={() => onDelete(item.id)}
                            sx={{ width: 32, height: 32, borderRadius: '10px' }}
                          >
                            <AppIcon name="bi-trash" fallbackSize={14} />
                          </WtIconButton>
                        )}
                      </Box>
                    </Box>
                  );
                })}
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
              loading={presetsQuery.isLoading || (!!projectId && deliverables.isFetching)}
              helperText={
                selectedAgenda.length
                  ? `${selectedAgenda.length} selected — pick more from the list`
                  : 'Pick one or more agenda items.'
              }
            />
            <TextField
              select
              size="small"
              fullWidth
              label="Category"
              value={addCategoryId}
              onChange={(e) => setAddCategoryId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.mute, mb: 0.5 }}>
                Assign to
              </Typography>
              <Box sx={assigneeSelectSx}>
                <WtSelect
                  size="sm"
                  options={assigneeOptions}
                  value={assigneeSelected}
                  isLoading={directoryLoading}
                  isClearable
                  isSearchable
                  optionVariant="avatar"
                  placeholder={projectId ? 'Search project team…' : 'Search active employees…'}
                  ariaLabel="Assign to"
                  onChange={(next) => setAssignToId((next as WtSelectOption | null)?.value || '')}
                />
              </Box>
            </Box>
            <WtDateField label="Due date" value={dueDate} onChange={setDueDate} />
            <TextField
              select
              size="small"
              fullWidth
              label="Status"
              value={addStatusCode || (assignToId || dueDate ? defaultOpenCode : defaultInfoCode)}
              onChange={(e) => setAddStatusCode(e.target.value)}
            >
              {statusOptions.map((s) => (
                <MenuItem key={s.code} value={s.code}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <WtButton
            ghost
            disabled={saving}
            onClick={() => {
              if (saving) return;
              setOpen(false);
              resetForm();
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

