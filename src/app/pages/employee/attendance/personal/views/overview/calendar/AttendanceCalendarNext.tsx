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
import {
  STRUCTURAL_DEFAULTS,
  type StructuralColors,
} from '@app/modules/common/components/ui/tw/calendarDayTones';
import type { CalendarDay } from './types';

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

  const overrides = useMemo<DayToneOverrides>(
    () => ({
      present: calendarColors?.presentColor,
      absent: calendarColors?.absentColor,
      leave: calendarColors?.onLeaveColor,
      half_day: calendarColors?.onLeaveColor,
      weekly_off: calendarColors?.weekendColor,
      holiday: overviewColors?.holidayColor,
    }),
    [calendarColors, overviewColors],
  );

  /**
   * Structural colours, read from the SAME config keys and with the SAME
   * fallbacks ApplyLeave uses — so a holiday and a Saturday look identical on
   * both calendars whether or not an admin has configured them.
   */
  /**
   * Modifier colours the admin has already configured but the calendar never
   * read — Appearance Settings has carried markedPresentViaRequestRaisedColor
   * all along, so magenta could be set and nothing changed.
   */
  const modifierOverrides = useMemo<ModifierToneOverrides>(
    () => ({ regularized: calendarColors?.markedPresentViaRequestRaisedColor }),
    [calendarColors],
  );

  const structuralCols = useMemo<StructuralColors>(
    () => ({
      holiday: overviewColors?.holidayColor || STRUCTURAL_DEFAULTS.holiday,
      weekend: calendarColors?.weekendColor || STRUCTURAL_DEFAULTS.weekend,
      teamOff: calendarColors?.teamOffColor || STRUCTURAL_DEFAULTS.teamOff,
      sunday: STRUCTURAL_DEFAULTS.sunday,
    }),
    [calendarColors, overviewColors],
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
        onClose={() => setSelected(null)}
        // A submitted correction changes what the month means, so the resolved
        // month is refetched rather than patched locally.
        onSubmitted={refetch}
      />
    </div>
  );
}
