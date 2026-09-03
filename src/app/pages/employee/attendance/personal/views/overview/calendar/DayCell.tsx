/**
 * One day tile. Memoised, and deliberately logic-free: it receives a resolved
 * `CalendarDay` and renders it. It cannot disagree with the server because it
 * never decides anything.
 *
 * Replaces the `tileClassName` / `_react-calendar.scss` pair, which could only
 * be styled by reaching into react-calendar's generated DOM (`.react-calendar__tile abbr`)
 * from a global stylesheet with `!important`. Owning the markup is what makes
 * zero-CSS possible here — and it is also what makes the tooltip, the keyboard
 * grid and uniform out-of-month dimming possible at all.
 */
import { memo, useId, useRef, useState, type CSSProperties } from 'react';
import dayjs from 'dayjs';
import Popper from '@mui/material/Popper';
import Fade from '@mui/material/Fade';
import { cn } from '@app/modules/common/components/ui/tw/cn';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import { MODIFIER_LABEL, STATUS_LABEL, readableOn, resolveDayVisual, type DayToneOverrides } from './dayTokens';
import { DayTooltip } from './DayTooltip';
import type { CalendarDay } from './types';

export interface DayCellProps {
  day: CalendarDay;
  isToday: boolean;
  /** Roving tabindex — exactly one cell in the grid is tabbable. */
  isTabStop: boolean;
  /** Dimmed because a legend filter excludes it. */
  dimmed: boolean;
  overrides?: DayToneOverrides;
  onOpen: (day: CalendarDay) => void;
  onFocus: (date: string) => void;
  registerRef: (date: string, el: HTMLButtonElement | null) => void;
}

const POPPER_MODS = [
  { name: 'offset', options: { offset: [0, 8] } },
  { name: 'preventOverflow', options: { padding: 12 } },
];

export const DayCell = memo(function DayCell({
  day,
  isToday,
  isTabStop,
  dimmed,
  overrides,
  onOpen,
  onFocus,
  registerRef,
}: DayCellProps) {
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const tipId = useId();

  const v = resolveDayVisual(day.status, day.modifiers, overrides);
  const tone = toneSurface(v.trio, dark);
  const num = dayjs(day.date).date();

  // Runtime hex cannot be a utility class, so the disc's paint is inline —
  // the same rule IconBox/StatusBadge already follow in this kit.
  const disc: CSSProperties =
    v.fill === 'solid'
      ? { backgroundColor: v.trio.c, color: readableOn(v.trio.c) }
      : v.fill === 'split'
        ? {
            // Half-day renders as halves, because the ledger holds 0.5.
            background: `linear-gradient(105deg, ${v.trio.c} 0 50%, ${v.splitWith?.c ?? v.trio.c} 50% 100%)`,
            color: readableOn(v.trio.c),
          }
        : v.fill === 'tint'
          ? { backgroundColor: tone.bg, color: dark ? '#A9B3C4' : '#475569' }
          : v.ring !== 'none'
            ? { borderWidth: 2, borderStyle: v.ring === 'dashed' ? 'dashed' : 'solid', borderColor: v.trio.c, color: 'inherit' }
            : {};

  return (
    <>
      <button
        ref={(el) => {
          anchorRef.current = el;
          registerRef(day.date, el);
        }}
        type="button"
        role="gridcell"
        tabIndex={isTabStop ? 0 : -1}
        aria-current={isToday ? 'date' : undefined}
        aria-describedby={open ? tipId : undefined}
        disabled={day.status === 'not_employed'}
        className={cn(
          'relative grid place-items-center rounded-xl outline-none',
          'aspect-square w-full sm:aspect-auto sm:h-[46px]',
          'transition-[background-color,opacity,transform] duration-150',
          'hover:bg-slate-100/70 dark:hover:bg-white/[0.06]',
          'focus-visible:ring-2 focus-visible:ring-[#1E3A8A] dark:focus-visible:ring-[#8AA3EC] focus-visible:ring-offset-1 focus-visible:ring-offset-transparent',
          'disabled:cursor-not-allowed',
          !day.inMonth && 'opacity-35', // uniform — the current grid paints only the Sundays
          dimmed && 'opacity-20',
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => {
          setOpen(true);
          onFocus(day.date);
        }}
        onBlur={() => setOpen(false)}
        onClick={() => onOpen(day)}
      >
        <span
          className={cn(
            'grid place-items-center rounded-full tabular-nums',
            'size-[34px] sm:size-[32px] text-[13.5px]',
            v.fill === 'solid' || v.fill === 'split' ? 'font-bold' : 'font-semibold',
            v.fill === 'none' && v.ring === 'none' && 'text-slate-700 dark:text-slate-300',
          )}
          style={disc}
        >
          {num}
        </span>

        {/* Today: a ring around the disc, so it composes with any status
            rather than replacing it. */}
        {isToday && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full size-[40px] sm:size-[38px] ring-2 ring-[#1E3A8A] dark:ring-[#8AA3EC]"
          />
        )}

        {/* Modifiers as dots — they never consume the fill, so `present` and
            `late_in` coexist instead of competing for one enum slot. */}
        {v.dots.length > 0 && (
          <span aria-hidden="true" className="absolute bottom-[3px] flex gap-[3px]">
            {v.dots.map((d, i) => (
              <i key={i} className="block size-[4px] rounded-full" style={{ backgroundColor: d.c }} />
            ))}
          </span>
        )}

        {/* Keeps (and extends) the existing screen-reader work — colour is
            never the only channel. */}
        <span className="sr-only">{describeDay(day)}</span>
      </button>

      <Popper
        id={tipId}
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom"
        transition
        modifiers={POPPER_MODS}
        className="z-[1300]"
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={120}>
            <div>
              <DayTooltip day={day} overrides={overrides} id={tipId} />
            </div>
          </Fade>
        )}
      </Popper>
    </>
  );
});

/** The announced sentence: date, status, then every modifier. */
export function describeDay(day: CalendarDay): string {
  const parts = [dayjs(day.date).format('D MMMM'), STATUS_LABEL[day.status]];
  if (day.leave) parts.push(`${day.leave.type}${day.leave.fraction === 0.5 ? ', half day' : ''}`);
  if (day.holiday) parts.push(day.holiday.name);
  day.modifiers.forEach((m) => parts.push(MODIFIER_LABEL[m]));
  if (day.actual.checkIn) parts.push(`in ${day.actual.checkIn}`);
  if (day.actual.checkOut) parts.push(`out ${day.actual.checkOut}`);
  return parts.join(', ');
}
