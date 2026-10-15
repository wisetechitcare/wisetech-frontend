import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Autocomplete,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import VideocamOutlined from '@mui/icons-material/VideocamOutlined';
import NotesOutlined from '@mui/icons-material/NotesOutlined';
import CheckCircleOutlineRounded from '@mui/icons-material/CheckCircleOutlineRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import dayjs from 'dayjs';
import { hasPermission } from '@utils/authAbac';
import {
  permissionConstToUseWithHasPermission,
  resourceNameMapWithCamelCase,
} from '@constants/statistics';
import { WtButton, WtDateField } from '@app/modules/common/components/ui';
import MeetingDialog from '../../MeetingDialog';
import TaskPathSelect, { buildTaskPathOptions } from '../../tasks/components/TaskPathSelect';
import { usePresetTasks } from '../../tasks/useTaskQueries';
import { useProjectDeliverables } from '../../tasks/useProjectDeliverables';
import { getPresetSubtreeIds } from '@utils/presetTaskHierarchy';
import type { PresetTask } from '../../tasks/taskDomain';
import { getProjectTeam } from '@services/tasks';
import { fetchAllEmployees } from '@services/employee';
import {
  createAgendaItem,
  deleteAgendaItem,
  downloadMeetingMinutesPdf,
  getAgendaItems,
  getMeetingDetail,
  getMeetingMinutes,
  getMeetingsAgendaHub,
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
  heldConfirmedAt?: string | Date | null;
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

const statusTone = (status?: string) => {
  const s = String(status || '').toUpperCase();
  if (s === 'OPEN') return { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Open' };
  if (s === 'CLOSED') return { bg: '#DCFCE7', fg: '#15803D', label: 'Closed' };
  if (s === 'INFORMATION') return { bg: '#F1F5F9', fg: '#475569', label: 'Information' };
  return { bg: '#F1F5F9', fg: '#475569', label: status || '—' };
};

/**
 * Meetings → Agenda: master–detail hub.
 * Left list stays mounted; selection is instant; detail is cached + prefetched.
 */
export default function MeetingsAgendaHubTab() {
  const navigate = useNavigate();
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
  const [detailTab, setDetailTab] = useState<'overview' | 'agenda' | 'mom'>('agenda');
  const [detailLoading, setDetailLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, DetailCache>>({});
  const [showNew, setShowNew] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadHub = useCallback(async () => {
    setLoading(true);
    setError(null);
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
      setError(e?.response?.data?.message || 'Could not load meetings');
      return [] as HubMeeting[];
    } finally {
      setLoading(false);
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
        || list[0]?.id
        || null;
      if (pick) setSelectedId(pick);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reloadToken drives refresh
  }, [loadHub, reloadToken]);

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
    if (id === selectedId) return;
    setSelectedId(id);
    setDetailTab('agenda');
    // Instant paint: if cached, no spinner; otherwise list selection is already painted
    if (!cacheRef.current[id]) setDetailLoading(true);
  };

  const refreshSelected = async () => {
    if (!selectedId) return;
    await loadDetail(selectedId, { force: true });
    await loadHub();
  };

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

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, 380px) minmax(0, 1fr)' },
        gap: 0,
        minHeight: { lg: 'calc(100vh - 220px)' },
        borderTop: `1px solid ${C.line}`,
        bgcolor: C.page,
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
          display: 'flex',
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
          {canCreate && (
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

      {/* ── Right: detail ── */}
      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          maxHeight: { lg: 'calc(100vh - 220px)' },
          overflowY: 'auto',
          bgcolor: C.page,
          p: { xs: 1.5, md: 2 },
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
            onOpenFull={() => navigate(`/employees/meetings/${selectedMeeting.id}`)}
            onOpenMom={() => navigate(`/employees/meetings/${selectedMeeting.id}?tab=mom`)}
            onRefresh={refreshSelected}
            onError={setError}
          />
        )}
      </Box>

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
  onOpenFull,
  onOpenMom,
  onRefresh,
  onError,
}: {
  listMeeting: HubMeeting;
  cached?: DetailCache;
  loading: boolean;
  detailTab: 'overview' | 'agenda' | 'mom';
  setDetailTab: (t: 'overview' | 'agenda' | 'mom') => void;
  onOpenFull: () => void;
  onOpenMom: () => void;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const meeting = cached?.meeting || listMeeting;
  const items = cached?.items || [];
  const minutes = cached?.minutes;
  const perms = cached?.permissions;
  const agendaCount = cached ? items.length : listMeeting.agendaCount;

  const exportPdf = async () => {
    try {
      const res = await downloadMeetingMinutesPdf(listMeeting.id);
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
    }
  };

  return (
    <Stack spacing={1.75} sx={{ opacity: loading ? 0.72 : 1, transition: 'opacity .18s ease' }}>
      {/* Header card */}
      <Box
        sx={{
          bgcolor: C.paper,
          border: `1px solid ${C.line}`,
          borderRadius: 3,
          p: { xs: 1.5, md: 2 },
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
          <DateBadge date={meeting.startDate} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
              <Typography sx={{ fontWeight: 800, fontSize: { xs: 20, md: 22 }, color: C.ink, letterSpacing: '-0.02em' }}>
                {meeting.title}
              </Typography>
              <WtButton size="small" inverted onClick={onOpenFull} sx={{ flexShrink: 0 }}>
                Edit meeting
              </WtButton>
            </Stack>
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
              {meeting.heldConfirmedAt || listMeeting.heldConfirmedAt ? (
                <Chip size="small" color="success" label="Held confirmed" />
              ) : (
                <Chip size="small" variant="outlined" label="Held not confirmed" />
              )}
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
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ mt: 2, borderBottom: `1px solid ${C.line}` }}>
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
        <OverviewPanel meeting={meeting} listMeeting={listMeeting} items={items} />
      ) : detailTab === 'mom' ? (
        <MomPanel
          minutes={minutes}
          canExport={!!perms?.canExportPdf}
          onView={onOpenMom}
          onDownload={exportPdf}
          onAmend={onOpenMom}
        />
      ) : (
        <AgendaPanel
          key={listMeeting.id}
          meetingId={listMeeting.id}
          meeting={meeting}
          items={items}
          canEdit={!!perms?.canEditAgenda}
          onRefresh={onRefresh}
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
  meeting,
  listMeeting,
  items,
}: {
  meeting: any;
  listMeeting: HubMeeting;
  items: any[];
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      }}
    >
      <InfoCard title="Purpose" body={meeting.purposeLabel || listMeeting.purposeLabel || 'Not set'} />
      <InfoCard
        title="Held confirmation"
        body={
          meeting.heldConfirmedAt || listMeeting.heldConfirmedAt
            ? `Confirmed ${fmtDate(meeting.heldConfirmedAt || listMeeting.heldConfirmedAt)}`
            : 'Not confirmed yet'
        }
      />
      <InfoCard title="Agenda items" body={`${items.length || listMeeting.agendaCount} item(s)`} />
      <InfoCard title="Location" body={placeLabel(meeting)} />
    </Box>
  );
}

function InfoCard({ title, body }: { title: string; body: ReactNode }) {
  return (
    <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.mute, mb: 0.5 }}>{title}</Typography>
      <Typography sx={{ fontWeight: 700, color: C.ink }}>{body}</Typography>
    </Box>
  );
}

function MomPanel({
  minutes,
  canExport,
  onView,
  onDownload,
  onAmend,
}: {
  minutes: any;
  canExport: boolean;
  onView: () => void;
  onDownload: () => void;
  onAmend: () => void;
}) {
  if (!minutes) {
    return (
      <Alert severity="info">
        No Minutes of Meeting yet. Open the meeting to generate a draft after held confirmation.
      </Alert>
    );
  }
  const isFinal = minutes.status === 'FINAL';
  return (
    <Box sx={{ p: 2, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, color: C.ink }}>Minutes of Meeting</Typography>
        <Chip
          size="small"
          label={isFinal ? 'Finalized' : 'Draft'}
          color={isFinal ? 'success' : 'default'}
        />
      </Stack>
      <Typography sx={{ fontSize: 13, color: C.mute, mb: 2 }}>
        Document No. {minutes.documentNo || '—'} · Rev. {String(minutes.revision ?? 0).padStart(2, '0')}
      </Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        <WtButton size="small" inverted onClick={onView}>
          View
        </WtButton>
        {canExport && (
          <WtButton size="small" onClick={onDownload}>
            Download PDF
          </WtButton>
        )}
        {isFinal && (
          <WtButton size="small" inverted onClick={onAmend}>
            Create amendment draft
          </WtButton>
        )}
      </Stack>
    </Box>
  );
}

function AgendaPanel({
  meetingId,
  meeting,
  items,
  canEdit,
  onRefresh,
  onError,
}: {
  meetingId: string;
  meeting: any;
  items: any[];
  canEdit: boolean;
  onRefresh: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [agendaSearch, setAgendaSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState<Array<{ id: string; label: string }>>([]);
  const [assignToId, setAssignToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([]);

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
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        if (projectId) {
          const res = await getProjectTeam(projectId);
          const list = res?.members || [];
          const rows = (Array.isArray(list) ? list : [])
            .map((m: any) => {
              const id = m.id || m.employeeId;
              const name =
                [m.users?.firstName, m.users?.lastName].filter(Boolean).join(' ')
                || m.name
                || '';
              return { id: String(id || ''), name: String(name) };
            })
            .filter((r: { id: string; name: string }) => r.id && r.name)
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
          if (!cancelled) setAssignees(rows);
        } else {
          const res = await fetchAllEmployees(true);
          const list = res?.data?.employees || [];
          const rows = (Array.isArray(list) ? list : [])
            .map((e: any) => ({
              id: String(e.id),
              name: [e.users?.firstName || e.firstName, e.users?.lastName || e.lastName]
                .filter(Boolean)
                .join(' ') || '',
            }))
            .filter((r: { id: string; name: string }) => r.id && r.name)
            .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
          if (!cancelled) setAssignees(rows);
        }
      } catch {
        if (!cancelled) setAssignees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  const assigneeSelected = useMemo(
    () => assignees.find((a) => a.id === assignToId) ?? null,
    [assignees, assignToId],
  );

  const resetForm = () => {
    setSelectedAgenda([]);
    setAssignToId('');
    setDueDate('');
  };

  const submit = async () => {
    if (!selectedAgenda.length) return;
    setSaving(true);
    try {
      const status = assignToId || dueDate ? 'OPEN' : 'INFORMATION';
      await Promise.all(
        selectedAgenda.map((item) =>
          createAgendaItem(meetingId, {
            description: item.label,
            itemMode: 'DISCUSSION',
            status,
            responsibleUserId: assignToId || null,
            targetCompletionDate: dueDate || null,
          }),
        ),
      );
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
        {canEdit && (
          <WtButton size="small" onClick={() => setOpen(true)}>
            + Add agenda items
          </WtButton>
        )}
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
            No structured agenda items yet. Add items to get started.
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
                  const tone = statusTone(item.statusLabel || item.status);
                  return (
                    <Box component="tr" key={item.id}>
                      <Box component="td" sx={{ color: C.mute, width: 36 }}>
                        {idx + 1}
                      </Box>
                      <Box component="td" sx={{ minWidth: 180, fontWeight: 600 }}>
                        {item.description}
                      </Box>
                      <Box component="td">{item.category?.name || '—'}</Box>
                      <Box component="td">{item.responsibleName || '—'}</Box>
                      <Box component="td" sx={{ whiteSpace: 'nowrap' }}>
                        {fmtDate(item.targetCompletionDate)}
                      </Box>
                      <Box component="td">
                        <Chip
                          size="small"
                          label={tone.label}
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: tone.bg,
                            color: tone.fg,
                          }}
                        />
                      </Box>
                      <Box component="td">
                        {canEdit && (
                          <WtButton
                            size="small"
                            ghost
                            onClick={() => onDelete(item.id)}
                            sx={{ color: '#DC2626 !important', minWidth: 0, px: 1 }}
                          >
                            Remove
                          </WtButton>
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

      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
        }}
      >
        <BottomNote
          icon={<NotesOutlined sx={{ fontSize: 18, color: C.blue }} />}
          title="Discussion notes"
          body="Open Minutes of Meeting to record discussion notes."
        />
        <BottomNote
          icon={<CheckCircleOutlineRounded sx={{ fontSize: 18, color: C.green }} />}
          title="Decisions"
          body="Open Minutes of Meeting to record decisions."
        />
        <BottomNote
          icon={<DescriptionOutlined sx={{ fontSize: 18, color: C.mute }} />}
          title="Minutes of Meeting"
          body="Use the Minutes tab above to view, download, or amend."
        />
      </Box>

      <Alert
        severity="warning"
        sx={{
          bgcolor: C.amberWash,
          color: C.ink,
          '& .MuiAlert-icon': { color: C.amber },
        }}
      >
        Meetings without an agenda are marked in amber on the left. Select one to add agenda items.
      </Alert>

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
            <Autocomplete
              size="small"
              options={assignees}
              value={assigneeSelected}
              onChange={(_, next) => setAssignToId(next?.id || '')}
              getOptionLabel={(o) => o.name}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign to"
                  placeholder={projectId ? 'Search project team…' : 'Search active employees…'}
                />
              )}
            />
            <WtDateField label="Due date" value={dueDate} onChange={setDueDate} />
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

function BottomNote({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Box sx={{ p: 1.75, bgcolor: C.paper, border: `1px solid ${C.line}`, borderRadius: 2.5 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
        {icon}
        <Typography sx={{ fontWeight: 800, fontSize: 13.5, color: C.ink }}>{title}</Typography>
      </Stack>
      <Typography sx={{ fontSize: 12.5, color: C.mute, lineHeight: 1.45 }}>{body}</Typography>
    </Box>
  );
}
