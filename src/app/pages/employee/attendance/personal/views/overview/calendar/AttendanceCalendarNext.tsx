/**
 * The attendance calendar, wired to real data.
 *
 * Replaced the 979-line `AttendanceCalendar`, which has since been deleted.
 * It owns exactly two pieces of state — the month cursor
 * and the selected day — because everything else arrives already resolved from
 * `GET /attendance/calendar`.
 *
 * The click now opens `DayDetailPanel`, which reads first and offers the
 * correction inside, gated on the server's own `canRaiseCorrection`. The legacy
 * component sent every click straight to a form that then refused most of them.
 */
import { useCallback, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { AttendanceCalendarPanel } from './AttendanceCalendarPanel';
import { useAttendanceCalendar } from './useAttendanceCalendar';
import { DayDetailPanel } from './DayDetailPanel';
import type { DayToneOverrides, ModifierToneOverrides } from './dayTokens';
import { CALENDAR_TONES, resolveCalendarAppearance } from './appearance';
import {
  STRUCTURAL_DEFAULTS,
  type StructuralColors,
} from '@app/modules/common/components/ui/tw/calendarDayTones';
import type { CalendarDay, DayModifier, DayStatus } from './types';

export interface AttendanceCalendarNextProps {
  /** Kept in sync with the legacy component's month cursor so the flag can be flipped mid-session. */
  activeStartDate: Date;
  setActiveStartDate: (d: Date) => void;
}

export default function AttendanceCalendarNext({
  activeStartDate,
  setActiveStartDate,
}: AttendanceCalendarNextProps) {
  const employeeId = useSelector((s: RootState) => s.employee?.currentEmployee?.id) ?? '';
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const month = useMemo(() => dayjs(activeStartDate).format('YYYY-MM'), [activeStartDate]);

  /**
   * The admin colour picker still drives tile colour. Only the ACCENT is taken;
   * the tint, border and numeral colour are derived from it, so a pale pick
   * can't produce the white-on-pale tile the current implementation allows.
   */
  // Select the two slices by REFERENCE and assemble in useMemo.
  //
  // Building the object inside the selector returns a fresh literal on every
  // call, so `useSelector`'s reference check never matches and every unrelated
  // store change re-renders all 42 cells plus the legend. (React-Redux warns
  // about exactly this in dev — see the same warning already firing from
  // StatisticsOverview.tsx.)
  const calendarColors = useSelector((s: RootState) => s.customColors?.attendanceCalendar);
  const overviewColors = useSelector((s: RootState) => s.customColors?.attendanceOverview);

  /**
   * Every colour and every name, resolved ONCE from the appearance registry.
   *
   * This used to be three hand-written maps that each reached into the config
   * for the keys they happened to know about — which is how the calendar ended
   * up painting fourteen things from a config that offered seven, and how
   * `markedPresentViaRequestRaisedColor` sat unread for so long. The registry
   * now decides; these objects only reshape its answer into the props the
   * components already take.
   */
  const appearance = useMemo(
    () => resolveCalendarAppearance({ attendanceCalendar: calendarColors, attendanceOverview: overviewColors }),
    [calendarColors, overviewColors],
  );

  /**
   * Split by GROUP rather than by a hand-written key list.
   *
   * Listing the keys here is how this drifts: the list was already stale once,
   * carrying `early_out` and `overtime` — modifiers the server has never
   * emitted — while missing `late_night_waiver`, which it does. Deriving from
   * the registry means adding a key there is the only edit required.
   */
  const overrides = useMemo<DayToneOverrides>(() => {
    const out: DayToneOverrides = {};
    CALENDAR_TONES.filter((t) => t.group === 'status').forEach((t) => {
      out[t.key as DayStatus] = appearance.colors[t.key];
    });
    return out;
  }, [appearance]);

  const modifierOverrides = useMemo<ModifierToneOverrides>(() => {
    const out: ModifierToneOverrides = {};
    CALENDAR_TONES.filter((t) => t.group === 'mark').forEach((t) => {
      out[t.key as DayModifier] = appearance.colors[t.key];
    });
    return out;
  }, [appearance]);

  /**
   * Structural colours keep their own SHAPE because they are shared with the
   * apply-leave grid — the same Saturday has to look the same on both — but all
   * four values now come from the registry.
   *
   * `sunday` and `team_off` were the last colours the grid painted that nothing
   * could configure: Sundays render in a rose tint and a branch weekday off in
   * teal, while the legend and the settings screen both said "Weekly off" and
   * showed one khaki swatch.
   */
  const structuralCols = useMemo<StructuralColors>(
    () => ({
      holiday: appearance.colors.holiday,
      weekend: appearance.colors.weekly_off,
      teamOff: appearance.colors.team_off,
      sunday: appearance.colors.sunday,
    }),
    [appearance],
  );

  const { data, isLoading, isError, refetch } = useAttendanceCalendar(employeeId, month);

  const onMonthChange = useCallback(
    (next: string) => setActiveStartDate(dayjs(`${next}-01`).toDate()),
    [setActiveStartDate],
  );

  return (
    <div className="flex flex-col gap-3">
      <AttendanceCalendarPanel
        month={month}
        data={data}
        loading={isLoading}
        error={isError}
        overrides={overrides}
        modifierOverrides={modifierOverrides}
        labels={appearance.labels}
        todayColor={appearance.colors.today}
        structuralCols={structuralCols}
        onMonthChange={onMonthChange}
        onOpenDay={setSelected}
        onRetry={refetch}
      />

      <DayDetailPanel
        day={selected}
        open={Boolean(selected)}
        overrides={overrides}
        modifierOverrides={modifierOverrides}
        labels={appearance.labels}
        onClose={() => setSelected(null)}
        // A submitted correction changes what the month means, so the resolved
        // month is refetched rather than patched locally.
        onSubmitted={refetch}
      />
    </div>
  );
}
