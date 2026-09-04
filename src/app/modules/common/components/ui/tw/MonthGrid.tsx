/**
 * MonthGrid — the shared month-calendar ENGINE.
 *
 * This codebase grew four independent month grids (attendance overview, the
 * onboarding wizard, apply-leave, the leave heatmap) across three calendar
 * libraries, each with its own month arithmetic and its own keyboard handling —
 * or, more often, none at all. This is the one implementation of the parts that
 * must be identical everywhere.
 *
 * ── The seam ──────────────────────────────────────────────────────────────
 * The engine owns INTERACTION AND STRUCTURE:
 *   · 42-cell month maths, week-start, adjacent-month padding
 *   · prev/next month and year, "today"
 *   · a real keyboard model — roving tabindex, arrows, Home/End, PageUp/Down
 *   · `role="grid"` semantics and `aria-current` / `aria-selected`
 *   · selection FLAGS and disabled days
 *   · the responsive 7-column layout
 *
 * The caller owns PAINT AND MEANING, through `renderDay`:
 *   · what a day looks like, its tooltip, its colours
 *   · the selection STATE MACHINE — the engine reports an activation and
 *     computes flags from `selection.value`; it never mutates the selection.
 *     Deciding what a second click on a range means is policy, and policy
 *     belongs to the feature (apply-leave's rules are not attendance's).
 *
 * ── Not for event calendars ───────────────────────────────────────────────
 * A day here has a STATE. An event has a START AND AN END, overlaps its
 * neighbours, and needs week/day views and drag-and-drop. That is a different
 * data model; `CustomCalendar` (FullCalendar) stays the right tool for it.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';
import { cn } from './cn';

/** 0 = Sunday, 1 = Monday. */
export type WeekStart = 0 | 1;

export type SelectionMode = 'single' | 'range' | 'multi';

export type SelectionValue =
  | string
  | null
  | { from: string | null; to: string | null }
  | readonly string[];

export interface MonthGridSelection {
  mode: SelectionMode;
  /** Read-only input for flag computation. The engine never writes to it. */
  value?: SelectionValue;
}

/** Everything `renderDay` needs to paint a cell. All dates are `YYYY-MM-DD`. */
export interface MonthDayContext {
  date: string;
  /** false for the leading/trailing days of adjacent months. */
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  /** Strictly between the range ends. */
  isInRange: boolean;
  isDisabled: boolean;
  /** Holds the grid's single tab stop and receives keyboard focus. */
  isFocused: boolean;
}

export interface MonthGridProps {
  /** Displayed month, `YYYY-MM`. */
  month: string;
  onMonthChange?: (month: string) => void;
  weekStartsOn?: WeekStart;
  selection?: MonthGridSelection;
  isDisabled?: (date: string) => boolean;
  renderDay: (ctx: MonthDayContext) => React.ReactNode;
  /** Click, Enter or Space on an enabled day. */
  onDayActivate?: (date: string) => void;
  ariaLabel?: string;
  /** Dims the grid and blocks pointer events while a fetch is in flight. */
  loading?: boolean;
  /** Extra controls rendered beside the month label. */
  toolbar?: React.ReactNode;
  /** Hide the built-in navigation when the caller supplies its own. */
  showNav?: boolean;
  /** Hide the year jump arrows. */
  showYearNav?: boolean;
  className?: string;
}

/** Six weeks — a fixed height, so the card never jumps between months. */
const CELLS = 42;

const WEEKDAYS_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_SUN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthGrid({
  month,
  onMonthChange,
  weekStartsOn = 1,
  selection,
  isDisabled,
  renderDay,
  onDayActivate,
  ariaLabel,
  loading,
  toolbar,
  showNav = true,
  showYearNav = true,
  className,
}: MonthGridProps) {
  const cursor = useMemo(() => dayjs(`${month}-01`), [month]);
  const [focusedDate, setFocusedDate] = useState<string | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());

  const registerRef = useCallback((date: string, el: HTMLButtonElement | null) => {
    if (el) cellRefs.current.set(date, el);
    else cellRefs.current.delete(date);
  }, []);

  /** Always 42 cells, padded from the neighbouring months. */
  const dates = useMemo(() => {
    const start = cursor.startOf('month');
    // Offset back to the week start. `+7` keeps the modulo non-negative.
    const offset = (start.day() - weekStartsOn + 7) % 7;
    const gridStart = start.subtract(offset, 'day');
    return Array.from({ length: CELLS }, (_, i) => gridStart.add(i, 'day'));
  }, [cursor, weekStartsOn]);

  const today = dayjs().format('YYYY-MM-DD');

  /** The single tab stop: the focused day, else today, else the first in-month day. */
  const tabStop = useMemo(() => {
    const iso = dates.map((d) => d.format('YYYY-MM-DD'));
    if (focusedDate && iso.includes(focusedDate)) return focusedDate;
    if (iso.includes(today)) return today;
    return iso.find((_, i) => dates[i].month() === cursor.month()) ?? iso[0];
  }, [dates, focusedDate, today, cursor]);

  const move = useCallback(
    (from: string, days: number) => {
      const next = dayjs(from).add(days, 'day');
      const iso = next.format('YYYY-MM-DD');
      const nextMonth = next.format('YYYY-MM');
      if (nextMonth !== month) onMonthChange?.(nextMonth);
      setFocusedDate(iso);
      // The cell may not exist yet when the month just changed — focus after paint.
      requestAnimationFrame(() => cellRefs.current.get(iso)?.focus());
    },
    [month, onMonthChange],
  );

  const shiftMonth = useCallback(
    (n: number, unit: 'month' | 'year') => onMonthChange?.(cursor.add(n, unit).format('YYYY-MM')),
    [cursor, onMonthChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const from = focusedDate ?? tabStop;
      const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

      if (e.key in step) {
        e.preventDefault();
        move(from, step[e.key]);
        return;
      }
      if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault();
        const d = dayjs(from);
        // Distance to this row's first/last cell, honouring weekStartsOn.
        const col = (d.day() - weekStartsOn + 7) % 7;
        move(from, e.key === 'Home' ? -col : 6 - col);
        return;
      }
      if (e.key === 'PageUp' || e.key === 'PageDown') {
        e.preventDefault();
        const unit = e.shiftKey ? 'year' : 'month';
        const next = dayjs(from)[e.key === 'PageUp' ? 'subtract' : 'add'](1, unit);
        onMonthChange?.(next.format('YYYY-MM'));
        setFocusedDate(next.format('YYYY-MM-DD'));
      }
    },
    [focusedDate, tabStop, move, weekStartsOn, onMonthChange],
  );

  const flagsFor = useCallback(
    (iso: string) => {
      const v = selection?.value;
      if (!selection || v == null) {
        return { isSelected: false, isRangeStart: false, isRangeEnd: false, isInRange: false };
      }
      if (selection.mode === 'single') {
        return { isSelected: v === iso, isRangeStart: false, isRangeEnd: false, isInRange: false };
      }
      if (selection.mode === 'multi') {
        const arr = Array.isArray(v) ? v : [];
        return { isSelected: arr.includes(iso), isRangeStart: false, isRangeEnd: false, isInRange: false };
      }
      const { from, to } = (v as { from: string | null; to: string | null }) ?? { from: null, to: null };
      // A half-made range (`from` set, `to` not) still highlights its one end.
      const lo = from && to ? (from <= to ? from : to) : from;
      const hi = from && to ? (from <= to ? to : from) : from;
      const isRangeStart = Boolean(lo) && iso === lo;
      const isRangeEnd = Boolean(hi) && iso === hi;
      return {
        isSelected: isRangeStart || isRangeEnd,
        isRangeStart,
        isRangeEnd,
        isInRange: Boolean(lo && hi) && iso > (lo as string) && iso < (hi as string),
      };
    },
    [selection],
  );

  const weekdays = weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN;

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showNav && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {showYearNav && <NavBtn label="Previous year" icon="double-left" onClick={() => shiftMonth(-1, 'year')} />}
            <NavBtn label="Previous month" icon="left" onClick={() => shiftMonth(-1, 'month')} />
          </div>

          <div className="flex min-w-0 items-baseline gap-2">
            <h3 className="m-0 truncate text-[15px] font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
              {cursor.format('MMMM YYYY')}
            </h3>
            {month !== dayjs().format('YYYY-MM') && (
              <button
                type="button"
                onClick={() => onMonthChange?.(dayjs().format('YYYY-MM'))}
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-[#1E3A8A] hover:bg-[#EAF0FA] dark:text-[#8AA3EC] dark:hover:bg-white/[0.06]"
              >
                Today
              </button>
            )}
            {toolbar}
          </div>

          <div className="flex items-center gap-1">
            <NavBtn label="Next month" icon="right" onClick={() => shiftMonth(1, 'month')} />
            {showYearNav && <NavBtn label="Next year" icon="double-right" onClick={() => shiftMonth(1, 'year')} />}
          </div>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1" aria-hidden="true">
        {weekdays.map((w) => (
          <span
            key={w}
            className="py-1 text-center text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 dark:text-slate-500"
          >
            {w}
          </span>
        ))}
      </div>

      <div
        role="grid"
        aria-label={ariaLabel ?? `Calendar for ${cursor.format('MMMM YYYY')}`}
        aria-busy={loading || undefined}
        onKeyDown={onKeyDown}
        className={cn('grid grid-cols-7 gap-1 transition-opacity', loading && 'pointer-events-none opacity-50')}
      >
        {dates.map((d) => {
          const iso = d.format('YYYY-MM-DD');
          const disabled = isDisabled?.(iso) ?? false;
          const ctx: MonthDayContext = {
            date: iso,
            inMonth: d.month() === cursor.month(),
            isToday: iso === today,
            isDisabled: disabled,
            isFocused: iso === tabStop,
            ...flagsFor(iso),
          };

          return (
            <button
              key={iso}
              ref={(el) => registerRef(iso, el)}
              type="button"
              role="gridcell"
              // Roving tabindex — one tab stop for the whole grid, so a month
              // costs one Tab press rather than forty-two.
              tabIndex={ctx.isFocused ? 0 : -1}
              disabled={disabled}
              aria-current={ctx.isToday ? 'date' : undefined}
              aria-selected={selection ? ctx.isSelected : undefined}
              onFocus={() => setFocusedDate(iso)}
              onClick={() => !disabled && onDayActivate?.(iso)}
              className={cn(
                'relative grid place-items-center rounded-xl outline-none',
                'aspect-square w-full sm:aspect-auto sm:h-[46px]',
                'transition-[background-color,opacity] duration-150',
                !disabled && 'hover:bg-slate-100/70 dark:hover:bg-white/[0.06]',
                'focus-visible:ring-2 focus-visible:ring-[#1E3A8A] dark:focus-visible:ring-[#8AA3EC] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
                disabled && 'cursor-not-allowed opacity-40',
                !ctx.inMonth && 'opacity-35',
              )}
            >
              {renderDay(ctx)}
            </button>
          );
        })}
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
