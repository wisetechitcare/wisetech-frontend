import dayjs from 'dayjs';
import {
  CalendarDate,
  getLocalTimeZone,
  parseDate,
  today,
} from '@internationalized/date';
import { DATE_FORMATS, formatDate } from './dateFormats';

/**
 * Fiscal-year RANGE as a stored string: `"YYYY-MM-DD to YYYY-MM-DD"`.
 *
 * Canonical helpers for every screen that edits or displays an org / prefix
 * fiscal year. Prefer these over Flatpickr-local parsing or en-IN `dateFormatter`
 * composition — ISO is what prefix settings already persist, and it round-trips
 * cleanly through `new Date` / dayjs / WtDateField.
 *
 * Legacy rows may still hold `"DD/MM/YYYY to DD/MM/YYYY"` (en-IN). Parsers below
 * accept both; writers always emit ISO.
 */

/** Wire shape produced by {@link composeFiscalYearRange}. */
export type FiscalYearRangeValue = string;

/** A fiscal range as kit calendar values (`@internationalized/date`, no time zone). */
export type FiscalCalendarRange = { start: CalendarDate; end: CalendarDate };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const DOTTED_DISPLAY = /^(\d{4})\.(\d{2})\.(\d{2})$/;
/** `"a to b"`, `"a - b"`, `"a – b"` (en-dash) for pasted / typed ranges. */
const RANGE_SPLIT = /\s+(?:to|–|-)\s+/i;

/**
 * Kit segment typing emits partial years (`0002-…`) before the user finishes.
 * Years below this floor are treated as incomplete and never committed.
 */
const MIN_COMPLETE_YEAR = 1900;

/** Format a Date as `YYYY-MM-DD` from its local calendar day (no UTC shift). */
const toISODateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parse one side of a fiscal range. Accepts ISO and legacy `DD/MM/YYYY`.
 * Returns null when the string is empty or unrecognisable. Lenient: JS rolls an
 * impossible day over (`2023-02-29` → 1 Mar), which stored rows have always relied on.
 */
export const parseFiscalDateString = (str: string): Date | null => {
  const trimmed = str.trim();
  if (!trimmed) return null;
  const dmy = trimmed.match(DMY_DATE);
  const d = dmy
    ? new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T00:00:00`)
    : ISO_DATE.test(trimmed)
      ? new Date(`${trimmed}T00:00:00`)
      : new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Strict ISO `YYYY-MM-DD` → CalendarDate; null for malformed or impossible days (e.g. `2023-02-29`). */
export const parseFiscalCalendarDate = (iso: string): CalendarDate | null => {
  try {
    return parseDate(iso);
  } catch {
    return null;
  }
};

/** Calendar month the fiscal year starts (1=Jan … 12=Dec). Default April. */
export const DEFAULT_FISCAL_START_MONTH = 4;

const SHORT_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const clampFiscalStartMonth = (fiscalStartMonth: number): number =>
  Number.isInteger(fiscalStartMonth) && fiscalStartMonth >= 1 && fiscalStartMonth <= 12
    ? fiscalStartMonth
    : DEFAULT_FISCAL_START_MONTH;

/** `startYear-startMonth-01 to` the day before the same date in `endYear` (leap-safe). */
const composeFiscalWindow = (startYear: number, endYear: number, startMonth: number): string => {
  const start = new CalendarDate(startYear, startMonth, 1);
  const end = start.set({ year: endYear }).subtract({ days: 1 });
  return composeFiscalYearRange(start.toString(), end.toString());
};

/**
 * Preset chip label for a fiscal start month (e.g. 4 → `"Apr–Mar"`, 1 → `"Jan–Dec"`).
 */
export const getFiscalPresetLabel = (
  fiscalStartMonth: number = DEFAULT_FISCAL_START_MONTH,
): string => {
  const startMonth = clampFiscalStartMonth(fiscalStartMonth);
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  return `${SHORT_MONTH_LABELS[startMonth - 1]}–${SHORT_MONTH_LABELS[endMonth - 1]}`;
};

/**
 * Default fiscal range for "today" (when the org has no fiscal year yet).
 * `fiscalStartMonth` is 1–12 (default April = 4). Example: 4 → Apr 1–Mar 31.
 */
export const getDefaultFiscalYear = (
  fiscalStartMonth: number = DEFAULT_FISCAL_START_MONTH,
): string => {
  const startMonth = clampFiscalStartMonth(fiscalStartMonth);
  const now = today(getLocalTimeZone());
  const startYear = now.month >= startMonth ? now.year : now.year - 1;
  return composeFiscalWindow(startYear, startYear + 1, startMonth);
};

/** Split a stored range into WtDateField wire values (`YYYY-MM-DD`). */
export const splitFiscalYearRange = (fiscalYear: string | null | undefined): { from: string; to: string } => {
  const raw = String(fiscalYear ?? '').trim();
  if (!raw.includes(' to ')) return { from: '', to: '' };
  const [startRaw, endRaw] = raw.split(' to ');
  const start = parseFiscalDateString(startRaw);
  const end = parseFiscalDateString(endRaw);
  return {
    from: start ? toISODateString(start) : '',
    to: end ? toISODateString(end) : '',
  };
};

/** Compose two wire dates into the stored range string. Empty if either side missing. */
export const composeFiscalYearRange = (from: string, to: string): string => {
  const a = from.trim();
  const b = to.trim();
  if (!a || !b) return '';
  return `${a} to ${b}`;
};

/**
 * Order two wire dates chronologically and compose the stored range.
 * Empty when either side is missing.
 */
export const composeOrderedFiscalYearRange = (from: string, to: string): string => {
  const a = from.trim();
  const b = to.trim();
  if (!a || !b) return '';
  return a <= b ? composeFiscalYearRange(a, b) : composeFiscalYearRange(b, a);
};

/**
 * Normalise any stored / display fiscal string to ISO `"YYYY-MM-DD to YYYY-MM-DD"`.
 * Returns `''` when unparseable. Also upgrades legacy `"2030-2031"` → Apr–Mar range.
 * Writers always emit chronologically ordered sides.
 */
export const toCanonicalFiscalYearRange = (fiscalYear: string | null | undefined): string => {
  const raw = String(fiscalYear ?? '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{4}$/.test(raw)) {
    const [startYear, endYear] = raw.split('-').map(Number);
    return composeFiscalWindow(startYear, endYear, DEFAULT_FISCAL_START_MONTH);
  }
  const { from, to } = splitFiscalYearRange(raw);
  return composeOrderedFiscalYearRange(from, to);
};

/**
 * Typed / pasted single-date parse (keyboard path from the fiscal-year UX).
 * Accepts company display `YYYY.MM.DD`, ISO, legacy `DD/MM/YYYY`, and natural
 * forms dayjs understands (e.g. `1 Apr 2026`). Invalid / partial / impossible
 * days (e.g. `2023.02.29`) → null.
 */
export const parseTypedFiscalDate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dotted = trimmed.match(DOTTED_DISPLAY);
  const dmy = trimmed.match(DMY_DATE);
  const iso = dotted
    ? `${dotted[1]}-${dotted[2]}-${dotted[3]}`
    : dmy
      ? `${dmy[3]}-${dmy[2]}-${dmy[1]}`
      : ISO_DATE.test(trimmed)
        ? trimmed
        : null;
  if (iso) return parseFiscalCalendarDate(iso)?.toString() ?? null;

  // Natural language only (e.g. "1 Apr 2026") — avoid dayjs guessing on partial numerics.
  if (!/[a-zA-Z]/.test(trimmed)) return null;
  const flex = dayjs(trimmed);
  return flex.isValid() ? flex.format(DATE_FORMATS.WIRE) : null;
};

/**
 * Parse a typed / pasted fiscal range into ISO wire.
 * Accepts canonical storage, legacy shapes, year-pairs, and free-text pairs
 * like `1 Apr 2026 to 31 Mar 2027`. Partial / invalid → `''`.
 */
export const parseTypedFiscalRangeInput = (raw: string): FiscalYearRangeValue => {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return '';

  const canonical = toCanonicalFiscalYearRange(trimmed);
  if (canonical) return canonical;

  const parts = trimmed.split(RANGE_SPLIT);
  if (parts.length !== 2) return '';
  const from = parseTypedFiscalDate(parts[0] ?? '');
  const to = parseTypedFiscalDate(parts[1] ?? '');
  if (!from || !to) return '';
  return composeOrderedFiscalYearRange(from, to);
};

/** False while a kit segment is still mid-typing its year (`0002-…`). */
export const isCompleteFiscalYear = (day: CalendarDate): boolean => day.year >= MIN_COMPLETE_YEAR;

/** Order a range so start ≤ end (accept writes chronologically). */
export const orderFiscalCalendarRange = (range: FiscalCalendarRange): FiscalCalendarRange =>
  range.start.compare(range.end) > 0 ? { start: range.end, end: range.start } : range;

/** Stored string → kit range value; null when either side is missing or unreadable. */
export const fiscalRangeFromString = (
  value: string | null | undefined,
): FiscalCalendarRange | null => {
  const { from, to } = splitFiscalYearRange(toCanonicalFiscalYearRange(value));
  const start = parseFiscalCalendarDate(from);
  const end = parseFiscalCalendarDate(to);
  return start && end ? { start, end } : null;
};

/**
 * Kit range value → stored string, or `undefined` while it is not worth storing yet.
 * Complete ranges are always written chronologically as ISO `"YYYY-MM-DD to YYYY-MM-DD"`.
 */
export const fiscalStringFromRange = (
  range: FiscalCalendarRange | null,
): FiscalYearRangeValue | undefined => {
  if (!range) return '';
  if (!isCompleteFiscalYear(range.start) || !isCompleteFiscalYear(range.end)) return undefined;
  const { start, end } = orderFiscalCalendarRange(range);
  return composeFiscalYearRange(start.toString(), end.toString());
};

/**
 * A stored range for people to read, in the company date format: `"2026.04.01 – 2027.03.31"`.
 * Exact dates on purpose (a fiscal year is not always April–March); for the compact `2026-27` label in
 * selectors use `formatFiscalYearLabel` (fiscalYearHelper). Empty / unreadable → `fallback`.
 */
export const formatFiscalYearRange = (value: string | null | undefined, fallback = '—'): string => {
  const { from, to } = splitFiscalYearRange(value);
  if (!from || !to) return fallback;
  return `${formatDate(from)} – ${formatDate(to)}`;
};
