/**
 * Visual vocabulary for a calendar day — the ONE place a status or modifier
 * becomes a colour and a shape.
 *
 * Two rules encoded here, both from the audit:
 *
 *  1. Structural state (weekend, holiday, out-of-month) gets a TINT.
 *     Employee state (present, absent, leave) gets a saturated FILL.
 *     Mixing them is why the current grid reads as noise.
 *
 *  2. Modifiers never consume the fill. They are rings, dashes and dots — so
 *     `present` + `late_in` can render together, which a flat enum cannot.
 *     Every state therefore has a non-colour channel (WCAG 1.4.1), preserving
 *     the visually-hidden-label work already in the existing component.
 *
 * Colours are `Trio` triples from the Tailwind kit so a tile's tone matches the
 * MUI kit's chips verbatim. Runtime-configurable colours (the admin colour
 * picker, read from `customColors.attendanceCalendar`) are merged in by
 * `resolveDayTone` — a Tailwind utility class cannot express a runtime hex, so
 * these are applied via inline `style`, exactly as `IconBox`/`StatusBadge` do.
 */
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw/tokens';
import type { DayModifier, DayStatus, LegendKey } from './types';

/** How the numeral's disc is painted. */
export type FillMode = 'solid' | 'split' | 'tint' | 'none';

/** An outline drawn instead of / around the fill, carrying a modifier. */
export type RingMode = 'none' | 'solid' | 'dashed';

/** A marker dot beneath the numeral. Carries its key so the tile knows how to draw it. */
export interface DayDot {
  key: DayModifier;
  trio: Trio;
  /** Live state — animates, on the tile and in the legend alike. */
  pulse: boolean;
  /** Diameter in px. Severity is encoded here as well as in the tone. */
  size: number;
}

/**
 * Lateness severity.
 *
 * `lateMinutes` is already measured PAST the policy threshold — the grace
 * window and any per-employee override are applied server-side by
 * `evaluateLateMark` — so every band here is genuinely late; they differ only
 * in degree.
 *
 * Why this exists: five minutes late and ninety minutes late were rendering as
 * the identical amber dot, and the number was buried in a hover. Grading it is
 * worth more than animating it, because it answers a question the tile could
 * not previously answer at all.
 *
 * Two channels, so this survives greyscale and colour-blindness: the dot grows
 * AND its amber deepens.
 */
export interface LateBand {
  id: 'slight' | 'moderate' | 'severe';
  label: string;
  /** Lower bound in minutes past the threshold, inclusive. */
  from: number;
  trio: Trio;
  size: number;
}

/**
 * Ordered widest-first so a `.find` picks the most severe match.
 *
 * Sizes are capped at 6px: the dot sits INSIDE a 32px disc, and anything larger
 * runs into the numeral's descender space. The three steps stay distinguishable
 * because they are read against each other across a month, not in isolation.
 */
export const LATE_BANDS: readonly LateBand[] = [
  { id: 'severe', label: 'Severely late', from: 46, trio: { c: '#B45309', bg: '#FFFBEB', bd: '#FCD34D' }, size: 6 },
  { id: 'moderate', label: 'Moderately late', from: 16, trio: { c: '#D97706', bg: '#FFFBEB', bd: '#FDE68A' }, size: 5 },
  { id: 'slight', label: 'Slightly late', from: 0, trio: { c: '#F59E0B', bg: '#FFFBEB', bd: '#FDE68A' }, size: 4 },
] as const;

export function lateBandOf(lateMinutes?: number | null): LateBand {
  const m = Math.max(0, lateMinutes ?? 0);
  // The last entry has `from: 0`, so this can never be undefined.
  return LATE_BANDS.find((b) => m >= b.from) ?? LATE_BANDS[LATE_BANDS.length - 1];
}

export interface DayVisual {
  trio: Trio;
  fill: FillMode;
  /** Second tone for `split` (half-day) — the leave half of the gradient. */
  splitWith?: Trio;
  ring: RingMode;
  /** Marker dots, floated inside the numeral's disc. */
  dots: DayDot[];
  /** True when the disc carries a saturated fill and needs light numerals. */
  onFill: boolean;
}

/* ── Status → tone + fill ─────────────────────────────────────────────── */

const STATUS_TRIO: Record<DayStatus, Trio> = {
  present: TRIO.green,
  absent: TRIO.rose,
  leave: TRIO.amber,
  half_day: TRIO.amber,
  holiday: TRIO.purple,
  weekly_off: TRIO.slate,
  not_employed: TRIO.slate,
  future: TRIO.slate,
  pending: TRIO.slate,
};

const STATUS_FILL: Record<DayStatus, FillMode> = {
  present: 'solid',
  absent: 'solid',
  leave: 'solid',
  half_day: 'split',
  holiday: 'solid',
  weekly_off: 'tint', // structural — tint, never a saturated fill
  not_employed: 'none',
  future: 'none',
  // No fill: nothing has happened yet, and today's halo is already marking the
  // cell. A tint here would read as a state rather than as the absence of one.
  pending: 'none',
};

export const STATUS_LABEL: Record<DayStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  leave: 'On leave',
  half_day: 'Half day',
  holiday: 'Holiday',
  weekly_off: 'Weekly off',
  not_employed: 'Not employed',
  future: 'Upcoming',
  pending: 'No check-in yet',
};

/* ── Modifier → tone + channel ────────────────────────────────────────── */

const MODIFIER_TRIO: Partial<Record<DayModifier, Trio>> = {
  late_in: TRIO.amber,
  early_out: TRIO.amber,
  remote: TRIO.blue,
  on_site: TRIO.cyan,
  overtime: TRIO.purple,
  // Pink, built to the kit's own recipe (a 600 accent with its 50/200 surface
  // pair) but declared HERE rather than added to TRIO: `TONE_NAMES` is derived
  // from `TRIO` with Object.keys, so a new tone would silently appear as a
  // choice in the FAQ section picker. Same reason LATE_BANDS carries its own
  // amber triples. It belongs in the shared palette once the appearance
  // registry lands — not as a side effect of this fix.
  regularized: { c: '#db2777', bg: '#fdf2f8', bd: '#fbcfe8' },
  worked_on_off_day: TRIO.blue,
};

export const MODIFIER_LABEL: Record<DayModifier, string> = {
  late_in: 'Late check-in',
  early_in: 'Early check-in',
  early_out: 'Early check-out',
  late_out: 'Late check-out',
  missing_check_in: 'Check-in missing',
  missing_check_out: 'Check-out missing',
  regularized: 'Regularised',
  request_pending: 'Approval pending',
  request_rejected: 'Approval rejected',
  worked_on_off_day: 'Worked on an off day',
  overtime: 'Overtime',
  remote: 'Remote',
  on_site: 'On-site',
  in_progress: 'Currently working',
};

/** Modifiers that replace the fill with an outline. Order = precedence. */
const RING_MODIFIERS: DayModifier[] = ['request_pending', 'missing_check_in', 'missing_check_out'];

/**
 * Modifiers that render as a dot beneath the numeral. Order = left-to-right.
 *
 * `worked_on_off_day` was in no channel at all — the same fault `regularized`
 * had. It ships in the server's legend, so it had a chip, and that chip
 * resolved to the plain `present` fill: "Worked off day" and "Present" were the
 * same green, and a Sunday you actually worked was indistinguishable from an
 * ordinary Monday. It also left `workingWeekendColor` configuring nothing.
 */
const DOT_MODIFIERS: DayModifier[] = ['late_in', 'early_out', 'worked_on_off_day', 'remote', 'on_site', 'overtime'];

/**
 * Modifiers that REPAINT the disc rather than adding a marker to it. The third
 * channel, alongside rings and dots. Order = precedence.
 *
 * `regularized` is the case that forced it. A regularised day IS a present day —
 * the status is correct, and rule 2 above would normally keep it out of the fill.
 * But how the day became present is the thing people scan the month for, and a
 * dot under a green tile lost that argument: at a glance it still read as an
 * ordinary present day, which is exactly the complaint.
 *
 * The rule survives intact, because the fill is only ever repainted, never
 * competed for: the status still decides WHETHER there is a disc and what shape
 * it takes (solid, or split for a half day), and the modifier only decides its
 * colour. `present` + `late_in` still coexist — the dot is untouched.
 */
const FILL_MODIFIERS: DayModifier[] = ['regularized'];

/* ── Resolution ───────────────────────────────────────────────────────── */

/**
 * Optional runtime overrides, keyed by status, sourced from the admin colour
 * picker. Only the accent (`c`) is overridable; `bg`/`bd` are derived so a
 * pale pick cannot silently produce an unreadable tile.
 */
export type DayToneOverrides = Partial<Record<DayStatus, string>>;

/**
 * Admin-configured colours for MODIFIERS, alongside the status overrides above.
 *
 * Appearance Settings has carried `markedPresentViaRequestRaisedColor` all
 * along — the calendar simply never read it, so an admin could set magenta and
 * see nothing change. Same shape and same rules as the status overrides: the
 * accent only, with the tint and border derived.
 */
export type ModifierToneOverrides = Partial<Record<DayModifier, string>>;

export function resolveDayVisual(
  status: DayStatus,
  modifiers: readonly DayModifier[],
  overrides?: DayToneOverrides,
  /** Minutes past the threshold, from the server's own verdict. Grades the late dot. */
  lateMinutes?: number | null,
  /** Admin colours for modifier dots / rings. */
  modifierOverrides?: ModifierToneOverrides,
): DayVisual {
  const base = STATUS_TRIO[status];

  const ringMod = RING_MODIFIERS.find((m) => modifiers.includes(m));
  const ring: RingMode = !ringMod ? 'none' : ringMod === 'request_pending' ? 'dashed' : 'solid';

  // A ring replaces the fill — an outlined disc is the "incomplete" signal, and
  // stacking it on a solid fill would read as a border, not as a state.
  const fill: FillMode = ring !== 'none' ? 'none' : STATUS_FILL[status];

  /**
   * A fill modifier repaints the disc, but only while there IS a disc to
   * repaint. Two guards, both deliberate:
   *
   *  - A ring outranks it. An unresolved day is unresolved first, whatever else
   *    is true of it, so the outline keeps the status tone.
   *  - A tint or an empty status is left alone — repainting a structural tint
   *    would break rule 1 (structural tints, employee state fills).
   */
  const fillMod =
    fill === 'solid' || fill === 'split'
      ? FILL_MODIFIERS.find((m) => modifiers.includes(m))
      : undefined;

  // The admin's pick wins over the built-in tone in both channels, and
  // `withAccent` derives the tint/border pair either way so a pale hex cannot
  // produce an unreadable tile.
  const trio = fillMod
    ? tone(MODIFIER_TRIO[fillMod] ?? base, modifierOverrides?.[fillMod])
    : tone(base, overrides?.[status]);

  return {
    trio,
    fill,
    splitWith: status === 'half_day' ? tone(TRIO.green, overrides?.present) : undefined,
    ring,
    dots: DOT_MODIFIERS.filter((m) => modifiers.includes(m))
      .map((m) => {
        // Lateness is the one modifier with a magnitude, so it is the one that
        // gets graded. The rest are binary and keep a single neutral size.
        const band = m === 'late_in' ? lateBandOf(lateMinutes) : null;
        const built = band?.trio ?? MODIFIER_TRIO[m];
        return {
          key: m,
          trio: built && tone(built, modifierOverrides?.[m]),
          pulse: shouldPulse(m),
          size: band?.size ?? 4.5,
        };
      })
      .filter((d): d is DayDot => Boolean(d.trio)),
    onFill: fill === 'solid' || fill === 'split',
  };
}

/** Legend swatches reuse the same resolver so a chip can never drift from its tiles. */
export function resolveLegendVisual(
  key: LegendKey,
  overrides?: DayToneOverrides,
  modifierOverrides?: ModifierToneOverrides,
): DayVisual {
  if (key in STATUS_TRIO) return resolveDayVisual(key as DayStatus, [], overrides);
  return resolveDayVisual('present', [key as DayModifier], overrides, null, modifierOverrides);
}

/**
 * Admin-renamed entries, resolved from the appearance registry.
 *
 * The server also sends a label with each legend entry, but the admin's name
 * outranks it: "Regularised" is a word a company gets to choose, and a company
 * that calls it "Manually approved" should see that everywhere the key appears —
 * the chip, the tooltip and the screen-reader sentence alike.
 */
export type DayLabelOverrides = Partial<Record<LegendKey | 'today', string>>;

export function legendLabel(key: LegendKey, labels?: DayLabelOverrides): string {
  return (
    labels?.[key] ||
    (STATUS_LABEL as Record<string, string>)[key] ||
    (MODIFIER_LABEL as Record<string, string>)[key] ||
    key
  );
}

/**
 * Legend keys whose swatch pulses.
 *
 * Reuses the kit's `wt-dot-pulse` — the same animation `StatusBadge` uses for
 * "Approval Pending" — so a live state reads identically wherever it appears.
 *
 * ── The motion rule for this screen ──────────────────────────────────────
 * Motion marks what is IN FLIGHT, never what is merely important:
 *
 *   in flight  →  animated   (today = orbiting beam, pending = pulse)
 *   settled    →  static, graded by severity  (lateness, absence)
 *
 * `late_in` is here by product decision, having been seen both ways. The two
 * channels do not fight: the pulse says LOOK, the size and tone say HOW MUCH.
 * A late mark is the one settled fact that still wants chasing — it is what an
 * employee is asked about — so the exception is a considered one rather than a
 * hole in the rule.
 */
const PULSING: ReadonlySet<LegendKey> = new Set<LegendKey>(['late_in', 'request_pending']);

export function shouldPulse(key: LegendKey): boolean {
  return PULSING.has(key);
}

/**
 * Swap a Trio's accent while keeping a usable tint/border pair.
 *
 * The existing implementation writes the picked colour straight to the tile and
 * hardcodes white numerals, so a pale pick yields white-on-pale. Deriving the
 * surface from the accent keeps the pairing legible whatever gets picked.
 */
function withAccent(base: Trio, accent: string): Trio {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return base;
  return { c: accent, bg: hexA(accent, 0.12), bd: hexA(accent, 0.28) };
}

/** `withAccent` when an override exists, the built-in tone when it doesn't. */
function tone(base: Trio, accent?: string): Trio {
  return accent ? withAccent(base, accent) : base;
}

function hexA(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Relative luminance → the numeral colour that actually contrasts with the
 * fill. Replaces the current unconditional `color: white`.
 */
export function readableOn(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return '#ffffff';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? '#0f172a' : '#ffffff';
}
