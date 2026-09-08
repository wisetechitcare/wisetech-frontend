/**
 * The assembled calendar — grid + summary + legend, zero CSS file, zero
 * Bootstrap utility, MUI used only where behaviour requires it (the tooltip's
 * Popper, and the correction Dialog this hands off to).
 *
 * The 979-line component this replaces mixed four styling systems and did its
 * own data fetching, status derivation, permission checks, colour-variable
 * plumbing and form submission. Here the panel owns exactly two things: which
 * month is showing and which legend filters are on. Everything else is passed
 * in already resolved.
 */
import { useCallback, useMemo, useState } from 'react';
import { GlassCard } from '@app/modules/common/components/ui/tw/Glass';
import { StatTile } from '@app/modules/common/components/ui/tw/Patterns';
import { Spinner } from '@app/modules/common/components/ui/tw/Spinner';
import { ErrorState } from '@app/modules/common/components/ui/tw/ErrorState';
import { MonthGrid } from '@app/modules/common/components/ui/tw/MonthGrid';
import { DayCell } from './DayCell';
import { CalendarLegend } from './CalendarLegend';
import { legendLabel, resolveDayVisual, type DayLabelOverrides, type DayToneOverrides, type ModifierToneOverrides } from './dayTokens';
import type { StructuralColors } from '@app/modules/common/components/ui/tw/calendarDayTones';

import type { AttendanceCalendarResponse, CalendarDay, DayStatus, LegendKey } from './types';

export interface AttendanceCalendarPanelProps {
  month: string;
  data?: AttendanceCalendarResponse;
  loading?: boolean;
  error?: boolean;
  overrides?: DayToneOverrides;
  /** Shared structural colours (holiday / weekend / team off), same source as apply-leave. */
  structuralCols?: StructuralColors;
  /** Admin colours for modifier dots — see dayTokens.ModifierToneOverrides. */
  modifierOverrides?: ModifierToneOverrides;
  /** Admin-renamed entries, from the appearance registry. */
  labels?: DayLabelOverrides;
  /** Configured colour for the today halo. */
  todayColor?: string;
  onMonthChange: (month: string) => void;
  onOpenDay: (day: CalendarDay) => void;
  onRetry?: () => void;
}

export function AttendanceCalendarPanel({
  month,
  data,
  loading,
  error,
  overrides,
  structuralCols,
  modifierOverrides,
  labels,
  todayColor,
  onMonthChange,
  onOpenDay,
  onRetry,
}: AttendanceCalendarPanelProps) {
  const [filters, setFilters] = useState<Set<LegendKey>>(new Set());

  const toggle = useCallback((key: LegendKey) => {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => setFilters(new Set()), []);

  // One lookup for the whole month instead of a linear scan per cell — the
  // engine calls renderDay 42 times.
  const byDate = useMemo(
    () => new Map((data?.days ?? []).map((d) => [d.date, d])),
    [data?.days],
  );

  const tiles = useMemo(() => {
    const s = data?.summary;
    if (!s) return [];

    /**
     * Colour and NAME both come from the same resolver the tiles beneath use.
     *
     * These three were the last things on this screen still painted from the
     * kit's palette: the summary said "Present" in the kit's green while the
     * grid two inches below painted the configured one, and renaming a status
     * in settings left the tile still saying the shipped word. One resolver
     * means the header can no longer contradict the calendar it summarises.
     *
     * Day counts only — hours were dropped, because a month total in whole
     * hours is not a number anyone acts on here and the per-day duration is in
     * the tooltip. `summary.minutesWorked` still arrives for anything that
     * does want it.
     */
    const tile = (key: DayStatus, icon: string, value: number) => ({
      key,
      value,
      icon,
      label: legendLabel(key, labels),
      trio: resolveDayVisual(key, [], overrides).trio,
    });

    return [
      tile('present', 'check-circle', s.present),
      tile('leave', 'calendar-remove', s.leave),
      tile('absent', 'cross-circle', s.absent),
    ];
  }, [data?.summary, overrides, labels]);

  if (error) {
    return (
      <GlassCard preset="section" className="p-4">
        <ErrorState title="Couldn’t load your attendance" onRetry={onRetry} />
      </GlassCard>
    );
  }

  return (
    <GlassCard preset="section" className="flex flex-col gap-4 p-3 sm:p-4">
      {/* Summary first: the month's answer, before the month's detail. */}
      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((t) => (
            <StatTile key={t.key} label={t.label} value={t.value} trio={t.trio} icon={t.icon} />
          ))}
        </div>
      )}

      <div className="relative">
        {/* The shared engine owns the grid, the keyboard model and the ARIA;
            this supplies only what an attendance day looks like. */}
        <MonthGrid
          month={month}
          onMonthChange={onMonthChange}
          loading={loading}
          ariaLabel={`Attendance for ${month}`}
          onDayActivate={(date) => {
            const day = byDate.get(date);
            if (day) onOpenDay(day);
          }}
          renderDay={(ctx) => {
            const day = byDate.get(ctx.date);
            // A day the server did not send (a padding day outside the fetched
            // window) still renders its numeral, so the grid never gaps.
            if (!day) {
              return (
                <span className="text-[13.5px] font-semibold tabular-nums text-slate-400 dark:text-slate-600">
                  {Number(ctx.date.slice(8, 10))}
                </span>
              );
            }
            return (
              <DayCell
                day={day}
                ctx={ctx}
                overrides={overrides}
                structuralCols={structuralCols}
                modifierOverrides={modifierOverrides}
                labels={labels}
                todayColor={todayColor}
                dimmed={
                  filters.size > 0 &&
                  ctx.inMonth &&
                  !filters.has(day.status) &&
                  !day.modifiers.some((m) => filters.has(m))
                }
              />
            );
          }}
        />

        {/* Overlaid, not swapped in — `placeholderData: keepPreviousData` keeps the
            previous month painted underneath so arrowing never flashes empty. */}
        {loading && !data && (
          <div className="absolute inset-0 grid place-items-center">
            <Spinner size={32} />
          </div>
        )}
      </div>

      {data?.legend?.length ? (
        <CalendarLegend
          legend={data.legend}
          active={filters}
          overrides={overrides}
          modifierOverrides={modifierOverrides}
          labels={labels}
          onToggle={toggle}
          onClear={clear}
        />
      ) : null}
    </GlassCard>
  );
}
