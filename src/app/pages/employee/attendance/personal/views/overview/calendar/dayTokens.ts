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

/** A marker dot beneath the numeral. Carries its key so the tile knows whether to pulse it. */
export interface DayDot {
  key: DayModifier;
  trio: Trio;
  /** Live state — animates, on the tile and in the legend alike. */
  pulse: boolean;
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
};

/* ── Modifier → tone + channel ────────────────────────────────────────── */

const MODIFIER_TRIO: Partial<Record<DayModifier, Trio>> = {
  late_in: TRIO.amber,
  early_out: TRIO.amber,
  remote: TRIO.blue,
  on_site: TRIO.cyan,
  overtime: TRIO.purple,
  regularized: TRIO.blue,
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
  request_pending: 'Correction pending',
  request_rejected: 'Correction rejected',
  worked_on_off_day: 'Worked on an off day',
  overtime: 'Overtime',
  remote: 'Remote',
  on_site: 'On-site',
};

/** Modifiers that replace the fill with an outline. Order = precedence. */
const RING_MODIFIERS: DayModifier[] = ['request_pending', 'missing_check_in', 'missing_check_out'];

/** Modifiers that render as a dot beneath the numeral. Order = left-to-right. */
const DOT_MODIFIERS: DayModifier[] = ['late_in', 'early_out', 'remote', 'on_site', 'overtime'];

/* ── Resolution ───────────────────────────────────────────────────────── */

/**
 * Optional runtime overrides, keyed by status, sourced from the admin colour
 * picker. Only the accent (`c`) is overridable; `bg`/`bd` are derived so a
 * pale pick cannot silently produce an unreadable tile.
 */
export type DayToneOverrides = Partial<Record<DayStatus, string>>;

export function resolveDayVisual(
  status: DayStatus,
  modifiers: readonly DayModifier[],
  overrides?: DayToneOverrides,
): DayVisual {
  const base = STATUS_TRIO[status];
  const trio = overrides?.[status] ? withAccent(base, overrides[status]!) : base;

  const ringMod = RING_MODIFIERS.find((m) => modifiers.includes(m));
  const ring: RingMode = !ringMod ? 'none' : ringMod === 'request_pending' ? 'dashed' : 'solid';

  // A ring replaces the fill — an outlined disc is the "incomplete" signal, and
  // stacking it on a solid fill would read as a border, not as a state.
  const fill: FillMode = ring !== 'none' ? 'none' : STATUS_FILL[status];

  return {
    trio,
    fill,
    splitWith: status === 'half_day' ? (overrides?.present ? withAccent(TRIO.green, overrides.present) : TRIO.green) : undefined,
    ring,
    dots: DOT_MODIFIERS.filter((m) => modifiers.includes(m))
      .map((m) => ({ key: m, trio: MODIFIER_TRIO[m], pulse: shouldPulse(m) }))
      .filter((d): d is DayDot => Boolean(d.trio)),
    onFill: fill === 'solid' || fill === 'split',
  };
}

/** Legend swatches reuse the same resolver so a chip can never drift from its tiles. */
export function resolveLegendVisual(key: LegendKey, overrides?: DayToneOverrides): DayVisual {
  if (key in STATUS_TRIO) return resolveDayVisual(key as DayStatus, [], overrides);
  return resolveDayVisual('present', [key as DayModifier], overrides);
}

export function legendLabel(key: LegendKey): string {
  return (STATUS_LABEL as Record<string, string>)[key] ?? (MODIFIER_LABEL as Record<string, string>)[key] ?? key;
}

/**
 * Legend keys whose swatch pulses.
 *
 * Reuses the kit's `wt-dot-pulse` — the same animation `StatusBadge` uses for
 * "Approval Pending" — so a live state reads identically wherever it appears.
 *
 * The rule for adding one: a pulse means *this is unresolved and wants your
 * attention*, not merely *this is important*. `late_in` and `request_pending`
 * qualify; `absent` does not, because a past absence is settled fact, and
 * `present` certainly does not. Motion that marks everything marks nothing.
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
