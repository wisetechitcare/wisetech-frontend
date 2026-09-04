/**
 * Flagged entry point — the new calendar, wired to real data.
 *
 * The DEFAULT calendar on this branch, rendered in place of the 979-line
 * `AttendanceCalendar`. It owns exactly two pieces of state — the month cursor
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
import type { DayToneOverrides } from './dayTokens';
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
  const [dismissed, setDismissed] = useState(false);
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
      {!dismissed && (
        <div className="flex items-start gap-2 rounded-xl border border-[#1E3A8A]/25 bg-[#EAF0FA] px-3 py-2 dark:border-[#8AA3EC]/25 dark:bg-[#8AA3EC]/10">
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[11.5px] font-bold text-[#1E3A8A] dark:text-[#8AA3EC]">
              Preview · re-platformed calendar
            </p>
            <p className="m-0 text-[11px] leading-snug text-slate-600 dark:text-slate-400">
              Hover or focus a day for detail; click to open it. The old calendar is one
              click away and stays remembered.
            </p>
          </div>
          <button
            type="button"
            // Opting OUT is now the explicit act, so this navigates to the
            // legacy variant rather than clearing to the (new) default.
            onClick={() => {
              setDismissed(true);
              window.location.search = '?calendar=legacy';
            }}
            className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold text-[#1E3A8A] hover:bg-white/60 dark:text-[#8AA3EC] dark:hover:bg-white/[0.06]"
          >
            Use old calendar
          </button>
        </div>
      )}

      <AttendanceCalendarPanel
        month={month}
        data={data}
        loading={isLoading}
        error={isError}
        overrides={overrides}
        structuralCols={structuralCols}
        onMonthChange={onMonthChange}
        onOpenDay={setSelected}
        onRetry={refetch}
      />

      <DayDetailPanel
        day={selected}
        open={Boolean(selected)}
        overrides={overrides}
        onClose={() => setSelected(null)}
        // A submitted correction changes what the month means, so the resolved
        // month is refetched rather than patched locally.
        onSubmitted={refetch}
      />
    </div>
  );
}
