/**
 * Structural calendar days — the ONE definition of what a holiday, a weekend
 * and a team-off day look like, wherever a calendar renders them.
 *
 * These four are facts about the CALENDAR, not about a person: the same
 * Saturday is the same Saturday on the attendance grid and on the apply-leave
 * grid, so it must not be a tinted slate pill in one and a red-ringed cell in
 * the other. Everything a specific screen owns — present, absent, leave types,
 * range endpoints, sandwich days — stays with that screen.
 *
 * ── Where these values came from ──────────────────────────────────────────
 * Lifted VERBATIM from `apply-leave/LeaveCalendar`, which had already worked
 * out the hard part and is the more considered of the two implementations:
 *
 *   · three distinct off-day identities, so Team Off never reads as "weekend"
 *   · Sunday separated from Saturday, matching the red column header
 *   · Team Off carries a DASHED ring — a non-colour cue, so the distinction
 *     survives greyscale and colour-blindness (WCAG 1.4.1)
 *   · every colour comes from admin config, never hardcoded
 *
 * The attendance grid was the one that had to change: it painted holidays as a
 * saturated purple fill, which broke its own rule that structural state gets a
 * TINT and only employee state gets a fill.
 */

/** How a structural day is painted. Both a tint and a ring, never colour alone. */
export interface StructuralTone {
  background: string;
  color: string;
  /** Inset ring. `dashed` is Team Off's non-colour cue. */
  ring: { width: number; style: 'solid' | 'dashed'; color: string };
}

/**
 * Ordered by precedence — a holiday that falls on a Sunday reads as a holiday.
 * `team_off` is a branch-configured weekday off that is NOT Sat/Sun.
 */
export type StructuralDayKind = 'holiday' | 'team_off' | 'sunday' | 'weekend';

export interface StructuralColors {
  /** customColors.attendanceOverview.holidayColor */
  holiday: string;
  /** customColors.attendanceCalendar.weekendColor */
  weekend: string;
  /** Branch-configured off weekday. */
  teamOff: string;
  /** Sunday, matching the red column header. */
  sunday: string;
}

/** `#rrggbb` + alpha → `rgba(...)`. Mirrors `@utils/leaveTypeColors`'s helper. */
const rgba = (hex: string, a: number): string => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};

/**
 * Classify a date's structural kind, or `null` when it is an ordinary working
 * day. Derived from the date itself plus two booleans the caller already has,
 * so no extra server field is needed.
 *
 * `isOffDay` means "not a working day for this branch" — a weekend OR a
 * configured weekday off. Sat/Sun split out here; anything else off is a team
 * off, which is exactly what makes it worth its own identity.
 */
export function structuralDayKind(
  isoDate: string,
  opts: { isHoliday: boolean; isOffDay: boolean },
): StructuralDayKind | null {
  if (opts.isHoliday) return 'holiday';
  if (!opts.isOffDay) return null;
  // Parse as local midnight; `new Date('YYYY-MM-DD')` alone is UTC and can slip a day.
  const wd = new Date(`${isoDate}T00:00:00`).getDay();
  if (wd === 0) return 'sunday';
  if (wd === 6) return 'weekend';
  return 'team_off';
}

/**
 * The tone for a structural kind. Alphas and ring weights are the ones
 * apply-leave arrived at; they are deliberately light, because a structural day
 * is context, not the thing the reader is looking for.
 */
export function structuralDayTone(kind: StructuralDayKind, c: StructuralColors): StructuralTone {
  switch (kind) {
    case 'holiday':
      return {
        background: rgba(c.holiday, 0.12),
        color: c.holiday,
        ring: { width: 1, style: 'solid', color: rgba(c.holiday, 0.3) },
      };
    case 'team_off':
      return {
        background: rgba(c.teamOff, 0.12),
        color: c.teamOff,
        // Dashed: the non-colour cue that sets Team Off apart from the SOLID
        // rings on weekend and holiday cells.
        ring: { width: 1.5, style: 'dashed', color: rgba(c.teamOff, 0.55) },
      };
    case 'sunday':
      return {
        background: rgba(c.sunday, 0.07),
        color: c.sunday,
        ring: { width: 1, style: 'solid', color: rgba(c.sunday, 0.2) },
      };
    case 'weekend':
    default:
      return {
        background: rgba(c.weekend, 0.1),
        color: c.weekend,
        ring: { width: 1, style: 'solid', color: rgba(c.weekend, 0.25) },
      };
  }
}

export const STRUCTURAL_LABEL: Record<StructuralDayKind, string> = {
  holiday: 'Holiday',
  team_off: 'Team off',
  sunday: 'Sunday',
  weekend: 'Weekend',
};

/**
 * Fallbacks for when admin config is absent.
 *
 * These are ApplyLeave's own defaults, copied exactly. Two calendars agreeing
 * only when config happens to be set would defeat the point of this module —
 * they have to agree when it is missing too.
 *
 * Note holiday and weekend intentionally share a purple: that collision is
 * precisely why Team Off needs its own teal AND a dashed ring, since without
 * both it is indistinguishable from a Saturday.
 */
export const STRUCTURAL_DEFAULTS: StructuralColors = {
  holiday: '#9B59B6',
  weekend: '#9B59B6',
  teamOff: '#0F766E',
  sunday: '#A64652',
};
