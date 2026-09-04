/**
 * The attendance day's PAINT.
 *
 * The kit's `MonthGrid` owns the cell button, the roving-tabindex keyboard
 * model and the `role="grid"` semantics; this renders what goes inside one.
 * That split is what lets the wizard, apply-leave and the heatmap share the
 * hard parts while keeping their own appearance.
 *
 * Deliberately logic-free: it receives a resolved `CalendarDay` from the
 * server and renders it. It cannot disagree with the server because it never
 * decides anything.
 */
import { memo, useRef, useState, type CSSProperties } from 'react';
import dayjs from 'dayjs';
// Barrel import, matching the 173 files that already use it. Mixing deep
// (@mui/material/Popper) and barrel entry points makes Vite pre-bundle two
// copies of the emotion styled engine, which surfaces at runtime as
// "styled_default is not a function".
import { Popper, Fade } from '@mui/material';
import type { MonthDayContext } from '@app/modules/common/components/ui/tw/MonthGrid';
import {
  structuralDayKind,
  structuralDayTone,
  STRUCTURAL_DEFAULTS,
  type StructuralColors,
} from '@app/modules/common/components/ui/tw/calendarDayTones';
import { cn } from '@app/modules/common/components/ui/tw/cn';
import { useIsDark, toneSurface } from '@app/modules/common/components/ui/tw/useIsDark';
import { MODIFIER_LABEL, STATUS_LABEL, readableOn, resolveDayVisual, type DayToneOverrides } from './dayTokens';
import { DayTooltip } from './DayTooltip';
import type { CalendarDay } from './types';

export interface DayCellProps {
  /** Admin-configured structural colours, shared with the apply-leave grid. */
  structuralCols?: StructuralColors;
  day: CalendarDay;
  /** Grid state for this cell, supplied by the engine. */
  ctx: MonthDayContext;
  /** Dimmed because a legend filter excludes it. */
  dimmed: boolean;
  overrides?: DayToneOverrides;
}

const POPPER_MODS = [
  { name: 'offset', options: { offset: [0, 10] } },
  { name: 'preventOverflow', options: { padding: 12 } },
];

export const DayCell = memo(function DayCell({
  day,
  ctx,
  dimmed,
  overrides,
  structuralCols = STRUCTURAL_DEFAULTS,
}: DayCellProps) {
  const dark = useIsDark();
  const [hovered, setHovered] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  // `lateMinutes` grades the late dot — the server's own verdict, never
  // recomputed here.
  const v = resolveDayVisual(day.status, day.modifiers, overrides, day.lateMark?.lateMinutes);
  const tone = toneSurface(v.trio, dark);
  const num = dayjs(day.date).date();

  // Hover OR keyboard focus. The engine owns focus, so `ctx.isFocused` is the
  // only way a keyboard user reaches the tooltip — hover alone would strand
  // them, which is the WCAG 1.4.13 failure this avoids.
  const open = hovered || ctx.isFocused;

  /**
   * Structural days — holiday, team off, Sunday, Saturday — are painted by the
   * SHARED resolver, so the same Saturday looks identical here and on the
   * apply-leave grid. Only days with no employee state of their own qualify: a
   * day you worked is a worked day first, and the holiday survives as context.
   *
   * This also corrects this grid's own inconsistency. It painted holidays as a
   * saturated purple fill, which broke the rule stated in `dayTokens`: a
   * structural day gets a TINT, and only employee state earns a fill.
   */
  const structural =
    day.status === 'holiday' || day.status === 'weekly_off'
      ? structuralDayKind(day.date, {
          isHoliday: day.status === 'holiday',
          isOffDay: day.status === 'weekly_off',
        })
      : null;

  // Runtime hex cannot be a utility class, so the disc's paint is inline —
  // the same rule IconBox/StatusBadge already follow in this kit.
  const disc: CSSProperties = structural
    ? (() => {
        const t = structuralDayTone(structural, structuralCols);
        return t.ring.style === 'dashed'
          ? {
              backgroundColor: t.background,
              color: t.color,
              // `outline` rather than a border, so the dashed Team Off cue
              // costs no layout shift — same technique apply-leave uses.
              outline: `${t.ring.width}px dashed ${t.ring.color}`,
              outlineOffset: '-3px',
            }
          : {
              backgroundColor: t.background,
              color: t.color,
              boxShadow: `inset 0 0 0 ${t.ring.width}px ${t.ring.color}`,
            };
      })()
    : v.fill === 'solid'
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
      <span
        ref={anchorRef}
        className={cn('grid size-full place-items-center transition-opacity', dimmed && 'opacity-20')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span
          className={cn(
            'relative grid place-items-center rounded-full tabular-nums',
            'size-[34px] text-[13.5px] sm:size-[32px]',
            v.fill === 'solid' || v.fill === 'split' ? 'font-bold' : 'font-semibold',
            v.fill === 'none' && v.ring === 'none' && 'text-slate-700 dark:text-slate-300',
          )}
          style={disc}
        >
          {num}

          {/* Modifiers float INSIDE the disc, pinned to its lower edge, so the
              day reads as one object instead of a circle with something stuck
              underneath it. They never consume the fill, so `present` and
              `late_in` still coexist rather than competing for one enum slot. */}
          {v.dots.length > 0 && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-[3px] left-1/2 flex -translate-x-1/2 items-end gap-[3px]"
            >
              {v.dots.map((d) => (
                <i
                  key={d.key}
                  className={cn('block shrink-0 rounded-full', d.pulse && 'wt-dot-pulse')}
                  // Size carries severity alongside tone, so the grading
                  // survives greyscale and colour-blindness. Runtime values,
                  // so inline — a utility class cannot express either.
                  // `color` too: wt-dot-pulse rings with currentColor, so a
                  // halo matches its dot instead of inheriting the numeral's.
                  style={{ width: d.size, height: d.size, backgroundColor: d.trio.c, color: d.trio.c }}
                />
              ))}
            </span>
          )}
        </span>

        {/* Today: a soft halo that expands and fades from the disc edge. The one
            live thing on the screen and the only element that animates, which is
            what makes it read as emphasis rather than noise. Falls back to a
            static ring under prefers-reduced-motion, so today never loses its
            marker. */}
        {ctx.isToday && (
          <span
            aria-hidden="true"
            className="wt-now-ring pointer-events-none absolute rounded-full size-[34px] text-[#1E3A8A] dark:text-[#8AA3EC] sm:size-[32px]"
          />
        )}

        {/* Colour is never the only channel. */}
        <span className="sr-only">{describeDay(day)}</span>
      </span>

      <Popper
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
              <DayTooltip day={day} overrides={overrides} />
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
