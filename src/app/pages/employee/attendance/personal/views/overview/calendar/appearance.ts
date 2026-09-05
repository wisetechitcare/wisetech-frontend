/**
 * The calendar's appearance REGISTRY — the one declaration of what this grid
 * paints, what each thing is called, and what colour it is by default.
 *
 * Why this exists
 * ───────────────
 * Appearance Settings offered seven colours. The calendar paints fourteen
 * things. The seven were not a subset of the fourteen: some pointed at concepts
 * the grid had no idea about, and some of what the grid painted had no setting
 * at all. `markedPresentViaRequestRaisedColor` sat in the config for years
 * while the calendar ignored it — an admin could pick magenta and watch nothing
 * happen — and `workingWeekendColor` still does nothing, because
 * `worked_on_off_day` fell through to the plain `present` fill.
 *
 * Two lists in two repos, edited by different people at different times, will
 * always drift. So there is now one list, and the settings screen is GENERATED
 * from it. Add a key here and it gets a settings row for free; delete one and
 * the row goes with it. They cannot disagree because there is nothing to
 * disagree with.
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
 * It is deliberately NOT set for `late_in`, `early_out`, `remote`, `on_site` and
 * `overtime`. Fields with those names do exist (`workingPattern.lateCheckinColor`,
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
 * Everything the grid can paint. `today` is not a day STATE — it is a property
 * of the grid — but it is a colour on this screen that someone configures, so
 * it belongs in the same list as the rest.
 */
export type CalendarToneKey = LegendKey | 'today';

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
  /** Settings grouping — the two questions a day answers. */
  group: 'status' | 'mark';
  /** Old flat field to inherit from. Omitted where inheriting would repaint a correct grid. */
  legacyColor?: LegacyPath;
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
 * The three ring marks (`request_pending`, `missing_check_in`,
 * `missing_check_out`) are also absent. A ring deliberately borrows the status
 * tone: the SHAPE says "unresolved" and the COLOUR says what it would otherwise
 * be. Handing them a colour of their own would break that pairing.
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
  },
  {
    key: 'absent',
    label: 'Absent',
    hint: 'A working day with no attendance and no leave.',
    trio: TRIO.rose,
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceCalendar.absentColor',
  },
  {
    key: 'leave',
    label: 'On leave',
    hint: 'An approved full day of leave.',
    trio: TRIO.amber,
    channel: 'fill',
    group: 'status',
    legacyColor: 'attendanceCalendar.onLeaveColor',
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
    key: 'early_out',
    label: 'Early check-out',
    hint: 'Left before the shift ended.',
    trio: TRIO.amber,
    channel: 'dot',
    group: 'mark',
  },
  {
    key: 'remote',
    label: 'Remote',
    hint: 'Worked from home.',
    trio: TRIO.blue,
    channel: 'dot',
    group: 'mark',
  },
  {
    key: 'on_site',
    label: 'On-site',
    hint: 'Worked at a client or project site.',
    trio: TRIO.cyan,
    channel: 'dot',
    group: 'mark',
  },
  {
    key: 'overtime',
    label: 'Overtime',
    hint: 'Worked beyond the shift.',
    trio: TRIO.purple,
    channel: 'dot',
    group: 'mark',
  },
  {
    key: 'today',
    label: 'Today',
    hint: "The halo around the current date. The grid's only animation.",
    trio: { c: '#1E3A8A', bg: '#eff6ff', bd: '#dbeafe' },
    channel: 'ring',
    group: 'mark',
    legacyColor: 'attendanceCalendar.todayColor',
  },
] as const;

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
