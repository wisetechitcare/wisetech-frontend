/**
 * The month grid — `react-calendar`, replaced by ~7 lines of CSS Grid.
 *
 * What the library actually provided: month arithmetic (dayjs does it), a
 * 7-column grid (`grid-cols-7`), and prev/next navigation (which was being
 * restyled anyway). What it cost: a global vendor stylesheet imported from
 * `_init.scss`, 359 lines of override SCSS with 14 `!important`s, a
 * class-name-string styling API incompatible with MUI+TW, and a DOM we could
 * not put a tooltip, a roving tabindex or `role="grid"` into.
 *
 * Owning the loop also fixes the adjacent-month artefact for free: the padding
 * days are ours, so they are dimmed uniformly instead of only the Sundays
 * picking up a weekend tint.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { cn } from '@app/modules/common/components/ui/tw/cn';
import { DayCell } from './DayCell';
import type { DayToneOverrides } from './dayTokens';
import type { CalendarDay, LegendKey } from './types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CELLS = 42; // 6 weeks — a stable height, so the card never jumps between months

export interface MonthGridProps {
  /** YYYY-MM */
  month: string;
  days: CalendarDay[];
  /** Legend filter. Empty = show everything. */
  activeFilters: Set<LegendKey>;
  overrides?: DayToneOverrides;
  onMonthChange: (month: string) => void;
  onOpenDay: (day: CalendarDay) => void;
  loading?: boolean;
}

export function MonthGrid({
  month,
  days,
  activeFilters,
  overrides,
  onMonthChange,
  onOpenDay,
  loading,
}: MonthGridProps) {
  const cursor = useMemo(() => dayjs(`${month}-01`), [month]);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const registerRef = useCallback((date: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(date, el);
    else cellRefs.current.delete(date);
  }, []);

  /** Monday-first, always 42 cells, padded from the neighbouring months. */
  const grid = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]));
    const start = cursor.startOf('month');
    const gridStart = start.subtract((start.day() + 6) % 7, 'day');
    return Array.from({ length: CELLS }, (_, i) => {
      const d = gridStart.add(i, 'day');
      const key = d.format('YYYY-MM-DD');
      return (
        byDate.get(key) ?? {
          // A placeholder only ever appears for padding days the server did not
          // send; it is never a guess about a day inside the month.
          date: key,
          status: 'future' as const,
          modifiers: [],
          inMonth: d.month() === cursor.month(),
          actual: { checkIn: null, checkOut: null, minutesWorked: null },
          expected: { checkIn: null, checkOut: null, source: null },
          workMode: null,
        }
      );
    });
  }, [cursor, days]);

  const today = dayjs().format('YYYY-MM-DD');
  const tabStop = focusedDate && grid.some((d) => d.date === focusedDate)
    ? focusedDate
    : (grid.find((d) => d.date === today) ?? grid.find((d) => d.inMonth) ?? grid[0]).date;

  const move = useCallback(
    (from: string, delta: number) => {
      const next = dayjs(from).add(delta, 'day');
      const key = next.format('YYYY-MM-DD');
      const nextMonth = next.format('YYYY-MM');
      if (nextMonth !== month) onMonthChange(nextMonth);
      setFocusedDate(key);
      // The cell may not exist yet if the month just changed; focus after paint.
      requestAnimationFrame(() => cellRefs.current.get(key)?.focus());
    },
    [month, onMonthChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const from = focusedDate ?? tabStop;
      const jump: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (e.key in jump) {
        e.preventDefault();
        move(from, jump[e.key]);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const d = dayjs(from);
        const target = e.key === 'Home' ? d.startOf('week').add(1, 'day') : d.endOf('week').add(1, 'day');
        move(from, target.diff(d, 'day'));
        return;
      }
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        const step = e.shiftKey ? 'year' : 'month';
        const next = dayjs(from)[e.key === 'PageUp' ? 'subtract' : 'add'](1, step);
        onMonthChange(next.format('YYYY-MM'));
        setFocusedDate(next.format('YYYY-MM-DD'));
      }
    },
    [focusedDate, tabStop, move, onMonthChange],
  );

  const shift = (n: number, unit: 'month' | 'year') =>
    onMonthChange(cursor.add(n, unit).format('YYYY-MM'));

  return (
    <div className="flex flex-col gap-3">
      {/* ── Navigation ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <NavBtn label="Previous year" icon="double-left" onClick={() => shift(-1, 'year')} />
          <NavBtn label="Previous month" icon="left" onClick={() => shift(-1, 'month')} />
        </div>

        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="m-0 truncate text-[15px] font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
            {cursor.format('MMMM YYYY')}
          </h3>
          {cursor.format('YYYY-MM') !== dayjs().format('YYYY-MM') && (
            <button
              type="button"
              onClick={() => onMonthChange(dayjs().format('YYYY-MM'))}
              className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#1E3A8A] hover:bg-[#EAF0FA] dark:text-[#8AA3EC] dark:hover:bg-white/[0.06]"
            >
              Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <NavBtn label="Next month" icon="right" onClick={() => shift(1, 'month')} />
          <NavBtn label="Next year" icon="double-right" onClick={() => shift(1, 'year')} />
        </div>
      </div>

      {/* ── Weekday header ─────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500"
          >
            {w}
          </span>
        ))}
      </div>

      {/* ── The grid ───────────────────────────────────────────────── */}
      <div
        role="grid"
        aria-label={`Attendance for ${cursor.format('MMMM YYYY')}`}
        aria-busy={loading || undefined}
        onKeyDown={onKeyDown}
        className={cn('grid grid-cols-7 gap-1 transition-opacity', loading && 'opacity-50 pointer-events-none')}
      >
        {grid.map((day) => (
          <DayCell
            key={day.date}
            day={day}
            isToday={day.date === today}
            isTabStop={day.date === tabStop}
            dimmed={
              activeFilters.size > 0 &&
              day.inMonth &&
              !activeFilters.has(day.status) &&
              !day.modifiers.some((m) => activeFilters.has(m))
            }
            overrides={overrides}
            onOpen={onOpenDay}
            onFocus={setFocusedDate}
            registerRef={registerRef}
          />
        ))}
      </div>
    </div>
  );
}

function NavBtn({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-8 place-items-center rounded-lg text-slate-500 dark:text-slate-400',
        'transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/[0.06] dark:hover:text-slate-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] dark:focus-visible:ring-[#8AA3EC]',
      )}
    >
      <KTIcon iconName={icon} className="fs-4" />
    </button>
  );
}
