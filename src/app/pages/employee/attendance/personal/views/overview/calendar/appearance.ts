/**
 * The calendar's appearance REGISTRY — the one declaration of what this grid
 * paints, what each thing is called, and what colour it is by default.
 *
 * Why this exists
 * ───────────────
 * There were FOUR lists of what a calendar day can be, maintained by hand in
 * two repos, and none of them agreed:
 *
 *   1. the server's `DayModifier` union — the only one that was complete
 *   2. the server's `LEGEND_ORDER`, a hand-picked eleven
 *   3. the client's `DayModifier` union, which had lost `late_night_waiver`
 *   4. Appearance Settings' seven flat colour fields
 *
 * Everything that has gone wrong here follows from that.
 * `markedPresentViaRequestRaisedColor` sat in the config for years while the
 * calendar ignored it. `workingWeekendColor` configured nothing, because
 * `worked_on_off_day` was in no render channel and fell through to the plain
 * `present` fill. `remote` and `on_site` were emitted and painted but had no
 * legend row, so a blue dot appeared with nothing to explain it. And a waived
 * late night printed the raw string `late_night_waiver` in the tooltip.
 *
 * So there is now ONE list. The settings screen is generated from it, the
 * legend is built from it, and the server only promises that a count exists for
 * anything it can emit. Add a key here and it gets a settings row and a legend
 * chip for free; they cannot disagree because there is nothing left to disagree
 * with.
 *
 * What is editable, and what is not
 * ─────────────────────────────────
 * Values, not keys. `absent` is not a row an admin invents — it is a name the
 * server's precedence ladder and three render channels know. An invented key
 * would render nowhere and a deleted `present` would leave the grid unable to
 * paint a worked day. So the KEYS are fixed by code and the LABEL and COLOUR of
 * each are the admin's.
 *
 * Preserving what admins already picked
 * ─────────────────────────────────────
 * `legacyColor` names the old flat config field a key's colour used to live in,
 * and it is read whenever the new per-key value is unset — so nobody's existing
 * choices are lost on the way across.
 *
 * It is deliberately NOT set for `late_in`, `remote` or `on_site`. Fields with
 * those names do exist (`workingPattern.lateCheckinColor`,
 * `workingLocation.remoteColor`, …) but the calendar has never read them: they
 * were picked to colour bar charts, and adopting them here would silently
 * repaint a grid that is currently correct. They start from the built-in tone
 * and change only when someone sets them here, on purpose.
 */
import { TRIO, type Trio } from '@app/modules/common/components/ui/tw/tokens';
import { STRUCTURAL_DEFAULTS } from '@app/modules/common/components/ui/tw/calendarDayTones';
import type { ICustomColorCode } from '@redux/slices/customColors';
import type { LegendKey } from './types';

/**
 * Everything the grid can paint.
 *
 * `today`, `sunday` and `team_off` are not day STATES — they are properties of
 * the grid, drawn by the shared structural resolver — but they are colours
 * someone configures, so they belong in the same list as the rest. They carry
 * `legend: false` so they never become a legend chip.
 */
export type CalendarToneKey = LegendKey | 'today' | 'sunday' | 'team_off';

/**
 * How the key is drawn, which is what makes the settings preview honest: a
 * swatch shaped like the thing it configures tells you what you are changing
 * before you change it.
 */
export type ToneChannel = 'fill' | 'split' | 'tint' | 'dot' | 'ring';

/** Dotted paths into the stored colour blob, resolved with `readLegacy`. */
type LegacyPath =
  | `attendanceCalendar.${string}`
  | `attendanceOverview.${string}`
  | `workingPattern.${string}`
  | `workingLocation.${string}`;

export interface CalendarToneSpec {
  key: CalendarToneKey;
  /** The default name. Overridable per company; never blank. */
  label: string;
  /** One line of plain English, shown under the label in settings. */
  hint: string;
  /** The built-in paint. `withAccent` derives the tint/border from `c` when overridden. */
  trio: Trio;
  channel: ToneChannel;
  /** Settings grouping — the two questions a day answers, plus the calendar's own furniture. */
  group: 'status' | 'mark' | 'grid';
  /** Old flat field to inherit from. Omitted where inheriting would repaint a correct grid. */
  legacyColor?: LegacyPath;
  /**
   * Old flat fields to WRITE BACK to when this key is edited.
   *
   * The same concept is stored under different names in several groups —
   * "Present" is `attendanceCalendar.presentColor` here and
   * `attendanceOverview.presentColor` on the dashboard — and those groups are
   * read by charts and boards this registry does not own. Mirroring on save
   * keeps every consumer in step from one edit, instead of leaving an admin to
   * find and match the twin by hand.
   */
  mirrorTo?: LegacyPath[];
  /**
   * Set false to keep an entry out of the LEGEND while still configuring it.
   *
   * The legend is a key for reading the grid, not an inventory of it. Two kinds
   * of entry are excluded:
   *
   *  - the grid's own furniture (Today, Sunday, Team off), which are positions
   *    and variants rather than day categories;
   *  - marks that are either rare, self-evident from the tooltip, or only ever
   *    true of a single day (Currently working), where a permanent chip costs
   *    more attention than it returns.
   *
   * Excluded keys still paint on tiles, still appear in the tooltip, and are
   * still editable in settings — they simply do not claim a row in the key.
   */
  legend?: false;
}

/**
 * Order is the settings order and the reading order: what a day IS, then what
 * is true ABOUT it.
 *
 * Three statuses are missing on purpose. `not_employed`, `future` and `pending`
 * render as a bare numeral — the absence of state, which is not a colour. Giving
 * them a swatch would invite someone to paint "nothing has happened yet", and
 * the grid would start reading as noise again.
 *
 * So are `early_in`, `early_out`, `late_out` and `overtime`. They exist in the
 * `DayModifier` union at both ends, but `composeDay` never emits any of them —
 * a settings row for a colour that can never appear is the same drift this file
 * exists to end. They come back the day the server starts producing them.
 */
export const CALENDAR_TONES: readonly CalendarToneSpec[] = [
  // ── What the day IS ──────────────────────────────────────────────────────
  {
    key: 'present',
    label: 'Present',
    hint: 'A day that was worked.',
    trio: TRIO.green,
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceCalendar.presentColor',
    mirrorTo: ['attendanceOverview.presentColor'],
  },
  {
    key: 'absent',
    label: 'Absent',
    hint: 'A working day with no attendance and no leave.',
    trio: TRIO.rose,
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceCalendar.absentColor',
    mirrorTo: ['attendanceOverview.absentColor'],
  },
  {
    key: 'leave',
    label: 'On leave',
    hint: 'An approved full day of leave.',
    trio: TRIO.amber,
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceCalendar.onLeaveColor',
    mirrorTo: ['attendanceOverview.onLeaveColor'],
  },
  {
    key: 'half_day',
    label: 'Half day',
    hint: 'Half worked, half leave — the tile is split between this colour and Present.',
    trio: TRIO.amber,
    channel: 'split',
    group: 'status',
    legacyColor: 'attendanceCalendar.onLeaveColor',
  },
  {
    key: 'holiday',
    label: 'Holiday',
    hint: 'A company holiday. Shared with the leave calendar.',
    trio: { c: STRUCTURAL_DEFAULTS.holiday, bg: '#f5f3ff', bd: '#ede9fe' },
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceOverview.holidayColor',
  },
  {
    key: 'weekly_off',
    label: 'Weekly off',
    hint: 'A non-working day for this branch. Tinted, never filled.',
    trio: { c: STRUCTURAL_DEFAULTS.weekend, bg: '#f8fafc', bd: '#e2e8f0' },
    channel: 'tint',
    group: 'status',
    legacyColor: 'attendanceCalendar.weekendColor',
  },

  // ── What is true ABOUT the day ───────────────────────────────────────────
  {
    key: 'regularized',
    label: 'Regularised',
    hint: 'Marked present through an approved request rather than a punch.',
    trio: { c: '#db2777', bg: '#fdf2f8', bd: '#fbcfe8' },
    channel: 'fill',
    group: 'mark',
    legacyColor: 'attendanceCalendar.markedPresentViaRequestRaisedColor',
  },
  {
    key: 'worked_on_off_day',
    label: 'Worked on an off day',
    hint: 'Attendance on a weekly off or a holiday.',
    trio: TRIO.blue,
    channel: 'dot',
    group: 'mark',
    legacyColor: 'attendanceCalendar.workingWeekendColor',
    mirrorTo: ['attendanceOverview.extraDayColor'],
  },
  {
    key: 'late_in',
    label: 'Late check-in',
    hint: 'Past the grace window. The dot also GROWS with severity, so this stays readable in greyscale.',
    trio: TRIO.amber,
    channel: 'dot',
    group: 'mark',
  },
  {
    key: 'late_night_waiver',
    label: 'Late-night waiver',
    hint: 'The late mark was waived because the previous night ran long.',
    trio: TRIO.cyan,
    channel: 'dot',
    group: 'mark',
    legend: false,
  },
  {
    key: 'remote',
    label: 'Remote',
    hint: 'Worked from home.',
    trio: TRIO.blue,
    channel: 'dot',
    group: 'mark',
    legend: false,
  },
  {
    key: 'on_site',
    label: 'On-site',
    hint: 'Worked at a client or project site.',
    trio: TRIO.cyan,
    channel: 'dot',
    group: 'mark',
    legend: false,
  },
  {
    key: 'in_progress',
    label: 'Currently working',
    hint: 'Checked in today and not yet out. Never a missing punch.',
    trio: TRIO.green,
    channel: 'dot',
    group: 'mark',
    legend: false,
  },

  // ── Unresolved days ──────────────────────────────────────────────────────
  // These draw an OUTLINE instead of a fill. The shape is the message — the day
  // is incomplete — and the colour says how. They used to borrow the status
  // tone, which made all three legend chips the same green as "Present".
  {
    key: 'request_pending',
    label: 'Approval pending',
    hint: 'A correction has been raised and is waiting on an approver.',
    trio: TRIO.amber,
    channel: 'ring',
    group: 'mark',
  },
  {
    key: 'request_rejected',
    label: 'Approval rejected',
    hint: 'A correction was raised and turned down.',
    trio: TRIO.rose,
    channel: 'ring',
    group: 'mark',
    legend: false,
  },
  {
    key: 'missing_check_in',
    label: 'Check-in missing',
    hint: 'Checked out with no matching check-in.',
    trio: TRIO.slate,
    channel: 'ring',
    group: 'mark',
    legend: false,
  },
  {
    key: 'missing_check_out',
    label: 'Check-out missing',
    hint: 'Checked in and never checked out.',
    trio: TRIO.slate,
    channel: 'ring',
    group: 'mark',
  },

  // ── The grid's own furniture ─────────────────────────────────────────────
  // Configurable, but not day categories, so they are never legend chips.
  {
    key: 'today',
    label: 'Today',
    hint: "The halo around the current date. The grid's only animation.",
    trio: { c: '#1E3A8A', bg: '#eff6ff', bd: '#dbeafe' },
    channel: 'ring',
    group: 'grid',
    legacyColor: 'attendanceCalendar.todayColor',
    legend: false,
  },
  {
    key: 'sunday',
    label: 'Sunday',
    hint: 'Sundays are tinted apart from Saturdays, matching the red column header.',
    trio: { c: STRUCTURAL_DEFAULTS.sunday, bg: '#fff1f2', bd: '#fecdd3' },
    channel: 'tint',
    group: 'grid',
    legend: false,
  },
  {
    key: 'team_off',
    label: 'Team off',
    hint: 'A branch weekday off (not Sat/Sun). Carries a dashed ring so it never reads as a weekend.',
    trio: { c: STRUCTURAL_DEFAULTS.teamOff, bg: '#f0fdfa', bd: '#ccfbf1' },
    channel: 'tint',
    group: 'grid',
    legacyColor: 'attendanceCalendar.teamOffColor',
    legend: false,
  },
] as const;

/**
 * The legend's rows, in order — every day category, and nothing that isn't one.
 *
 * The server used to own this list too, which made it a third vocabulary and it
 * drifted: `remote` and `on_site` were emitted and painted but had no legend
 * row, so a blue dot appeared with nothing to explain it. The server now sends
 * a count for everything it can emit and this decides what to show, which is
 * also what the settings screen lists. They cannot disagree.
 */
export const LEGEND_TONES: readonly CalendarToneSpec[] = CALENDAR_TONES.filter((t) => t.legend !== false);

export const TONE_BY_KEY: Readonly<Record<string, CalendarToneSpec>> = Object.fromEntries(
  CALENDAR_TONES.map((t) => [t.key, t]),
);

/* ── Stored overrides ─────────────────────────────────────────────────────── */

/** What an admin has changed for one key. Both halves optional — unset means "use the default". */
export interface CalendarToneOverride {
  color?: string;
  label?: string;
}

/**
 * Where the per-key values live: nested inside the existing `attendanceCalendar`
 * blob, which is already a JSON column and already passes through the API
 * unvalidated-but-untouched.
 *
 * Nested rather than a new column on purpose — it needs no migration, and the
 * seven legacy siblings keep working for the other screens that still read them.
 */
export const TONES_FIELD = 'attendanceCalendar.tones';

export type CalendarToneOverrides = Partial<Record<CalendarToneKey, CalendarToneOverride>>;

type ColorConfig = Partial<ICustomColorCode> | null | undefined;

function readLegacy(cfg: ColorConfig, path: LegacyPath): string | undefined {
  const [group, field] = path.split('.') as [keyof ICustomColorCode, string];
  const bucket = cfg?.[group] as Record<string, string> | undefined;
  return bucket?.[field];
}

/** Six hex digits. Anything else is treated as unset, so a bad value can't paint. */
export const isHex6 = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

/**
 * Takes the `attendanceCalendar` bucket, not the whole config, so the settings
 * form can hand it live Formik values (which only ever hold one bucket at a
 * time) without a cast.
 */
export function readToneOverrides(calendar?: { tones?: unknown } | null): CalendarToneOverrides {
  const raw = calendar?.tones;
  return raw && typeof raw === 'object' ? (raw as CalendarToneOverrides) : {};
}

/**
 * The resolved colour for one key: what the admin set here, else what they set
 * in the old flat field, else the built-in tone.
 */
export function resolveToneColor(key: CalendarToneKey, cfg: ColorConfig): string {
  const spec = TONE_BY_KEY[key];
  const set = readToneOverrides(cfg?.attendanceCalendar)[key]?.color;
  if (isHex6(set)) return set;
  const legacy = spec?.legacyColor ? readLegacy(cfg, spec.legacyColor) : undefined;
  if (isHex6(legacy)) return legacy;
  return spec?.trio.c ?? TRIO.slate.c;
}

/** The resolved name for one key. Never blank — a blank override falls back. */
export function resolveToneLabel(key: CalendarToneKey, cfg: ColorConfig): string {
  const set = readToneOverrides(cfg?.attendanceCalendar)[key]?.label?.trim();
  return set || TONE_BY_KEY[key]?.label || String(key);
}

/**
 * Every key resolved at once, in the shapes the calendar's existing props take.
 *
 * The calendar keeps its `overrides` / `modifierOverrides` / `labels` props —
 * they are already threaded, tested and typed — but they are now all DERIVED
 * here, so there is one place a colour is decided rather than four.
 */
export function resolveCalendarAppearance(cfg: ColorConfig) {
  const colors = {} as Record<CalendarToneKey, string>;
  const labels = {} as Record<CalendarToneKey, string>;
  CALENDAR_TONES.forEach((t) => {
    colors[t.key] = resolveToneColor(t.key, cfg);
    labels[t.key] = resolveToneLabel(t.key, cfg);
  });
  return { colors, labels };
}
