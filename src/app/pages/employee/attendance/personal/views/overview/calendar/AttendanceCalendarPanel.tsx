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
import { TRIO } from '@app/modules/common/components/ui/tw/tokens';
import { MonthGrid } from './MonthGrid';
import { CalendarLegend } from './CalendarLegend';
import type { DayToneOverrides } from './dayTokens';

import type { AttendanceCalendarResponse, CalendarDay, LegendKey } from './types';

export interface AttendanceCalendarPanelProps {
  month: string;
  data?: AttendanceCalendarResponse;
  loading?: boolean;
  error?: boolean;
  overrides?: DayToneOverrides;
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

  const tiles = useMemo(() => {
    const s = data?.summary;
    if (!s) return [];
    return [
      { label: 'Present', value: s.present, trio: TRIO.green, icon: 'check-circle' },
      { label: 'Leave', value: s.leave, trio: TRIO.amber, icon: 'calendar-remove' },
      { label: 'Absent', value: s.absent, trio: TRIO.rose, icon: 'cross-circle' },
      { label: 'Hours', value: `${Math.round(s.minutesWorked / 60)}h`, trio: TRIO.blue, icon: 'time' },
    ];
  }, [data?.summary]);

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
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {tiles.map((t) => (
            <StatTile key={t.label} label={t.label} value={t.value} trio={t.trio} icon={t.icon} />
          ))}
        </div>
      )}

      <div className="relative">
        <MonthGrid
          month={month}
          days={data?.days ?? []}
          activeFilters={filters}
          overrides={overrides}
          onMonthChange={onMonthChange}
          onOpenDay={onOpenDay}
          loading={loading}
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
          onToggle={toggle}
          onClear={clear}
        />
      ) : null}
    </GlassCard>
  );
}
