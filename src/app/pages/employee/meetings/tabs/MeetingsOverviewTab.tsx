import { apiErrorMessage } from '@utils/apiError';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Alert,
  Box,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { Button } from '@/ds/ui/button';
import { WtButton } from '@app/modules/common/components/ui';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import ScheduleOutlined from '@mui/icons-material/ScheduleOutlined';
import AssignmentLateOutlined from '@mui/icons-material/AssignmentLateOutlined';
import HourglassEmptyRounded from '@mui/icons-material/HourglassEmptyRounded';
import dayjs, { Dayjs } from 'dayjs';
import { RootState } from '@redux/store';
import { getMeetingsByEmployee } from '@services/employee';
import { getMeetingsWorkspaceSummary } from '@services/meetingAgendaMom';
import { fetchConfiguration } from '@services/company';
import { MEETING_TIMESHEET_PENDING } from '@constants/configurations-key';
import { LIFECYCLE_DEFAULT_COLORS, lightOf } from '@app/modules/common/components/MeetingsList';
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import { safeJsonParse } from '@utils/safeJson';

type MeetingSlim = {
  id: string;
  title: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string | null;
  location?: string | null;
  meetingLink?: string | null;
  meetingMode?: string | null;
  isOnline?: boolean;
  hasAgenda?: boolean;
};

const C = {
  ink: '#0F172A',
  mute: '#64748B',
  line: '#E2E8F0',
  paper: '#FFFFFF',
  page: '#F8FAFC',
  blue: '#2563EB',
  blueWash: '#DBEAFE',
  purple: '#7C3AED',
  purpleWash: '#EDE9FE',
  green: '#159A5A',
  greenWash: '#DCFCE7',
  rose: '#E11D48',
  roseWash: '#FFE4E6',
  amber: '#D97706',
  amberWash: '#FFEDD5',
};

/**
 * Meetings overview — layout matched to the shared dashboard reference:
 * summary strip + 2×2 panels (Upcoming / Today / Timesheet / Held confirmation).
 */
export default function MeetingsOverviewTab() {
  const navigate = useNavigate();
  const employeeId = useSelector((s: RootState) => s.employee.currentEmployee.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [pendingColor, setPendingColor] = useState(LIFECYCLE_DEFAULT_COLORS.pending);
  const [logging, setLogging] = useState<MeetingSlim | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [agendaDay, setAgendaDay] = useState<Dayjs>(() => dayjs());
  const [myMeetings, setMyMeetings] = useState<MeetingSlim[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, cfgRes, mine] = await Promise.all([
          getMeetingsWorkspaceSummary(),
          fetchConfiguration(MEETING_TIMESHEET_PENDING).catch(() => null),
          employeeId ? getMeetingsByEmployee(employeeId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setSummary(res.summary);
        const cfg = safeJsonParse(cfgRes?.data?.configuration?.configuration || '{}');
        if (cfg?.enabled !== false && cfg?.color) setPendingColor(cfg.color);
        const list = mine?.data || [];
        setMyMeetings(Array.isArray(list) ? list : []);
      } catch (e: any) {
        if (!cancelled) setError(apiErrorMessage(e, 'Could not load overview'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadToken, employeeId]);

  const upcoming: MeetingSlim[] = summary?.upcoming || [];
  const nextUp = upcoming[0] || null;
  const withoutAgendaIds = useMemo(
    () => new Set((summary?.withoutAgenda || []).map((m: MeetingSlim) => m.id)),
    [summary],
  );
  const dayMeetings: MeetingSlim[] = useMemo(() => {
    return myMeetings
      .filter((m) => m?.id && dayjs(m.startDate).isSame(agendaDay, 'day') && String((m as any).status || '') !== 'CANCELLED')
      .map((m) => ({
        ...m,
        hasAgenda:
          !!String(m.description || '').trim()
          || (m.hasAgenda ?? !withoutAgendaIds.has(m.id)),
      }))
      .sort((a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf());
  }, [myMeetings, agendaDay, withoutAgendaIds]);

  const pendingTimesheets: MeetingSlim[] = summary?.pendingTimesheets || [];
  const withoutAgendaList: MeetingSlim[] = summary?.withoutAgenda || [];
  const minutesList: Array<{
    meetingId: string;
    title: string;
    documentNo?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
  }> = summary?.minutes || [];
  const c = summary?.counts || {};

  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const openDetail = (id: string, tab?: string) => {
    const panel = tab === 'mom' || tab === 'minutes' ? 'mom' : tab === 'agenda' ? 'agenda' : '';
    navigate(`/employees/meetings/agenda?meeting=${id}${panel ? `&panel=${panel}` : ''}`);
  };

  const joinMeeting = (m: MeetingSlim) => {
    if (m.meetingLink) {
      window.open(m.meetingLink, '_blank', 'noopener,noreferrer');
      return;
    }
    openDetail(m.id);
  };

  const placeOf = (m: MeetingSlim) => {
    if (m.location?.trim()) return m.location;
    if (m.meetingLink || m.isOnline || m.meetingMode === 'ONLINE' || m.meetingMode === 'HYBRID') {
      return 'Online Meeting';
    }
    return '—';
  };

  const pendingWash = lightOf(pendingColor, 0.88);

  return (
    <Box
      className="px-lg-0 px-2 pt-4"
      sx={{ pb: 3, width: '100%', minWidth: 0, bgcolor: 'transparent' }}
    >
      {/* Summary strip */}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          mb: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <SummaryCard
          value={c.minutes ?? 0}
          title="Minutes of Meeting"
          subtitle="Meetings with minutes recorded."
          wash={C.blueWash}
          accent={C.blue}
          icon={<DescriptionOutlined sx={{ fontSize: 22, color: C.blue }} />}
          onClick={() => navigate('/employees/meetings/agenda')}
        />
        <SummaryCard
          value={c.thisMonth ?? c.upcoming ?? 0}
          title="Meetings this month"
          subtitle="Upcoming and scheduled."
          wash={C.greenWash}
          accent={C.green}
          icon={<ScheduleOutlined sx={{ fontSize: 22, color: C.green }} />}
          onClick={() => navigate('/employees/meetings/all-meetings')}
        />
      </Box>

      {/* Minutes of Meeting — named list matching the summary count */}
      <Box sx={{ mb: 1.5 }}>
        <Panel
          title="Minutes of Meeting"
          subtitle="Open a meeting's minutes to continue"
          icon={<DescriptionOutlined sx={{ fontSize: 18, color: C.blue }} />}
          iconWash={C.blueWash}
          viewAll={() => navigate('/employees/meetings/agenda')}
        >
          {!minutesList.length ? (
            <Empty>No minutes recorded yet.</Empty>
          ) : (
            <Stack spacing={0.75} sx={{ overflowY: 'auto', minHeight: 0, flex: 1, maxHeight: 220 }}>
              {minutesList.map((d) => (
                <Row
                  key={d.meetingId}
                  onClick={() => openDetail(d.meetingId, 'mom')}
                  leading={<DateBlock date={d.endDate || d.startDate} />}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>
                        {d.title}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 12, color: C.mute }}>
                        {d.documentNo || 'Minutes of Meeting'}
                      </Typography>
                    </Box>
                  </Box>
                </Row>
              ))}
            </Stack>
          )}
        </Panel>
      </Box>

      {/* 2×2 panels */}
      <Box
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          gridAutoRows: { xs: 'auto', lg: 'minmax(300px, 34vh)' },
        }}
      >
        {/* Upcoming */}
        <Panel
          title="Upcoming Meetings"
          subtitle="Your next scheduled meeting"
          icon={<ScheduleOutlined sx={{ fontSize: 18, color: C.blue }} />}
          iconWash={C.blueWash}
          viewAll={() => navigate('/employees/meetings/all-meetings')}
        >
          {!nextUp ? (
            <Empty>No upcoming meetings.</Empty>
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
                // Never stretch the date badge when the details column grows.
                alignItems: { xs: 'stretch', sm: 'flex-start' },
                p: 1.5,
                borderRadius: 2.5,
                border: `1px solid ${C.line}`,
                bgcolor: C.page,
                minHeight: 0,
                minWidth: 0,
              }}
            >
              <DateBlock date={nextUp.startDate} large />
              <Box sx={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16, color: C.ink, mb: 0.75 }} noWrap>
                  {nextUp.title}
                </Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                  <Meta icon={<AccessTimeRounded sx={{ fontSize: 15 }} />}>
                    {dayjs(nextUp.startDate).format('HH:mm')}
                    {' – '}
                    {dayjs(nextUp.endDate).format('HH:mm')}
                  </Meta>
                  <Meta icon={<PlaceOutlined sx={{ fontSize: 15 }} />}>{placeOf(nextUp)}</Meta>
                </Stack>
                {nextUp.description?.trim() && (
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      color: C.mute,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      mb: 1.25,
                    }}
                  >
                    {nextUp.description.split('\n').join(' · ')}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <WtButton size="small" onClick={() => joinMeeting(nextUp)}>
                    Join Meeting
                  </WtButton>
                  <WtButton size="small" ghost onClick={() => openDetail(nextUp.id)}>
                    Open
                  </WtButton>
                </Stack>
              </Box>
            </Box>
          )}
        </Panel>

        {/* Today's Agenda */}
        <Panel
          title="Today's Agenda"
          subtitle="Meetings scheduled for this day"
          icon={<DescriptionOutlined sx={{ fontSize: 18, color: C.purple }} />}
          iconWash={C.purpleWash}
          viewAll={() => navigate('/employees/meetings/agenda')}
          headerRight={
            <Stack direction="row" alignItems="center" spacing={0.25}>
              <Button variant="ghost" size="icon-sm" type="button" onClick={() => setAgendaDay((d) => d.subtract(1, 'day'))} aria-label="Previous day">
                <ChevronLeftRounded fontSize="small" />
              </Button>
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: C.ink, minWidth: 108, textAlign: 'center' }}>
                {agendaDay.format('ddd, D MMM YYYY')}
              </Typography>
              <Button variant="ghost" size="icon-sm" type="button" onClick={() => setAgendaDay((d) => d.add(1, 'day'))} aria-label="Next day">
                <ChevronRightRounded fontSize="small" />
              </Button>
            </Stack>
          }
        >
          {!dayMeetings.length ? (
            <Empty>No meetings on this day.</Empty>
          ) : (
            <Stack spacing={0.75} sx={{ overflowY: 'auto', minHeight: 0, flex: 1, pr: 0.25 }}>
              {dayMeetings.map((m) => {
                const ready = !!m.hasAgenda;
                return (
                  <Row
                    key={m.id}
                    onClick={() => openDetail(m.id, 'agenda')}
                    leading={
                      <Typography sx={{ fontWeight: 800, fontSize: 13, color: C.blue, width: 42, flexShrink: 0 }}>
                        {dayjs(m.startDate).format('HH:mm')}
                      </Typography>
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: ready ? C.green : C.rose,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>
                          {m.title}
                        </Typography>
                        <Typography noWrap sx={{ fontSize: 12, color: C.mute }}>
                          {placeOf(m)}
                        </Typography>
                      </Box>
                      <Pill
                        label={ready ? 'Agenda ready' : 'No agenda'}
                        bg={ready ? C.greenWash : C.roseWash}
                        fg={ready ? C.green : C.rose}
                      />
                    </Box>
                  </Row>
                );
              })}
            </Stack>
          )}
        </Panel>

        {/* Timesheet pending */}
        <Panel
          title="Timesheet Pending"
          subtitle="Meetings waiting for your time log"
          icon={<AssignmentLateOutlined sx={{ fontSize: 18, color: pendingColor }} />}
          iconWash={pendingWash}
          viewAll={() => navigate('/employees/meetings/all-meetings')}
        >
          {!pendingTimesheets.length ? (
            <Empty>You are caught up on meeting time.</Empty>
          ) : (
            <Stack spacing={0.75} sx={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
              {pendingTimesheets.map((m) => (
                <Row key={m.id} onClick={() => setLogging(m)} leading={<DateBlock date={m.endDate || m.startDate} />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>
                        {m.title}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 12, color: C.mute }}>
                        {dayjs(m.startDate).format('HH:mm')}
                        {' – '}
                        {dayjs(m.endDate).format('HH:mm')}
                      </Typography>
                    </Box>
                    <Pill label="Pending" bg={pendingWash} fg={pendingColor} />
                  </Box>
                </Row>
              ))}
            </Stack>
          )}
        </Panel>

        <Panel
          title="Without agenda"
          subtitle="Add agenda items from the Agenda tab"
          icon={<HourglassEmptyRounded sx={{ fontSize: 18, color: C.amber }} />}
          iconWash={C.amberWash}
          viewAll={() => navigate('/employees/meetings/agenda')}
        >
          {!withoutAgendaList.length ? (
            <Empty>Every meeting has an agenda.</Empty>
          ) : (
            <Stack spacing={0.75} sx={{ overflowY: 'auto', minHeight: 0, flex: 1 }}>
              {withoutAgendaList.map((m) => (
                <Row
                  key={m.id}
                  onClick={() => navigate(`/employees/meetings/agenda?meeting=${m.id}`)}
                  leading={<DateBlock date={m.endDate || m.startDate} />}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography noWrap sx={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>
                        {m.title}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: 12, color: C.mute }}>
                        {dayjs(m.endDate || m.startDate).format('HH:mm')}
                      </Typography>
                    </Box>
                    <Pill label="No agenda" bg={C.amberWash} fg={C.amber} />
                  </Box>
                </Row>
              ))}
            </Stack>
          )}
        </Panel>
      </Box>

      <NewTimeLogForm
        key={logging?.id ?? `none-${employeeId}`}
        show={!!logging}
        prefilledMeetingId={logging?.id}
        onClose={() => {
          setLogging(null);
          setReloadToken((n) => n + 1);
        }}
      />
    </Box>
  );
}

function SummaryCard({
  value,
  title,
  subtitle,
  wash,
  accent,
  icon,
  onClick,
}: {
  value: number;
  title: string;
  subtitle: string;
  wash: string;
  accent: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.75,
        borderRadius: 3,
        bgcolor: wash,
        boxSizing: 'border-box',
        width: '100%',
        transition: 'transform 140ms ease, filter 140ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover': { filter: 'brightness(0.98)', transform: 'translateY(-1px)' },
        '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: C.paper,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 20, lineHeight: 1.1, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
          {value}{' '}
          <Box component="span" sx={{ fontWeight: 700, fontSize: 14 }}>
            {title}
          </Box>
        </Typography>
        <Typography sx={{ fontSize: 12, color: C.mute, mt: 0.35 }} noWrap>
          {subtitle}
        </Typography>
      </Box>
      <ChevronRightRounded sx={{ color: accent, flexShrink: 0 }} />
    </Box>
  );
}

function Panel({
  title,
  subtitle,
  icon,
  iconWash,
  viewAll,
  headerRight,
  children,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconWash: string;
  viewAll: () => void;
  headerRight?: React.ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: { xs: 280, lg: 0 },
        maxHeight: { xs: 360, lg: 'none' },
        height: { lg: '100%' },
        borderRadius: 3,
        border: `1px solid ${C.line}`,
        bgcolor: C.paper,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: 1.75,
          pt: 1.5,
          pb: 1.25,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: iconWash,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 14.5, color: C.ink }} noWrap>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: C.mute }} noWrap>
            {subtitle}
          </Typography>
        </Box>
        {headerRight}
        <Button variant="ghost" size="sm" type="button" onClick={viewAll} className="shrink-0 font-bold" style={{ color: C.blue }}>
          View all
        </Button>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, p: 1.25, display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}

function DateBlock({ date, large }: { date?: string | Date | null; large?: boolean }) {
  const d = dayjs(date);
  // Fixed specs — width/height never follow the neighbouring details column.
  const size = large
    ? { width: 72, height: 88, radius: 2.5, day: 22, mon: 11, dow: 11 }
    : { width: 52, height: 48, radius: 2, day: 14, mon: 10, dow: 0 };
  return (
    <Box
      sx={{
        flex: '0 0 auto',
        flexShrink: 0,
        alignSelf: large ? { xs: 'flex-start', sm: 'flex-start' } : 'center',
        boxSizing: 'border-box',
        width: size.width,
        minWidth: size.width,
        maxWidth: size.width,
        height: size.height,
        minHeight: size.height,
        maxHeight: size.height,
        px: 0.5,
        borderRadius: size.radius,
        bgcolor: C.blueWash,
        textAlign: 'center',
        lineHeight: 1.1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: size.day, color: C.blue, lineHeight: 1 }}>
        {d.format('DD')}
      </Typography>
      <Typography sx={{ fontWeight: 700, fontSize: size.mon, color: C.blue, letterSpacing: 0.4, lineHeight: 1.2 }}>
        {d.format('MMM').toUpperCase()}
      </Typography>
      {large && (
        <Typography sx={{ fontWeight: 600, fontSize: size.dow, color: C.mute, mt: 0.35, lineHeight: 1 }}>
          {d.format('ddd')}
        </Typography>
      )}
    </Box>
  );
}

function Row({
  leading,
  children,
  onClick,
}: {
  leading: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 1.1,
        width: '100%',
        boxSizing: 'border-box',
        px: 1,
        py: 0.85,
        borderRadius: 2,
        border: `1px solid transparent`,
        transition: 'background-color 120ms ease, border-color 120ms ease',
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
        '&:hover': { bgcolor: C.page, borderColor: C.line },
        '&:focus-visible': { outline: `2px solid ${C.blue}`, outlineOffset: 2 },
      }}
    >
      {leading}
      {children}
    </Box>
  );
}

function Pill({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <Box
      component="span"
      sx={{
        flexShrink: 0,
        px: 1,
        py: 0.35,
        borderRadius: 999,
        bgcolor: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Box>
  );
}

function Meta({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: C.mute }}>
      {icon}
      <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 600 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <Typography sx={{ fontSize: 13, color: C.mute, px: 0.5, py: 1.5 }}>
      {children}
    </Typography>
  );
}
