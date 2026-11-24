import dayjs from 'dayjs';
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DMY_DATE = /^\d{2}\/\d{2}\/\d{4}$/;
const DOTTED_DISPLAY = /^(\d{4})\.(\d{2})\.(\d{2})$/;
/** `"a to b"`, `"a - b"`, `"a – b"` (en-dash) for pasted / typed ranges. */
const RANGE_SPLIT = /\s+(?:to|–|-)\s+/i;

/** Format a Date as `YYYY-MM-DD` (storage / WtDateField wire). */
export const toISODateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parse one side of a fiscal range. Accepts ISO and legacy `DD/MM/YYYY`.
 * Returns null when the string is empty or unrecognisable.
 */
export const parseFiscalDateString = (str: string): Date | null => {
  const trimmed = str.trim();
  if (!trimmed) return null;
  if (DMY_DATE.test(trimmed)) {
    const [dd, mm, yyyy] = trimmed.split('/');
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (ISO_DATE.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
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

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Last calendar day of `month` (1–12) in `year`. */
const lastDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

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
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
  const endYear = startMonth === 1 ? startYear : startYear + 1;
  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const endDay = lastDayOfMonth(endYear, endMonth);

  return `${startYear}-${pad2(startMonth)}-01 to ${endYear}-${pad2(endMonth)}-${pad2(endDay)}`;
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
  // Legacy `"2030-2031"` year-pair → default fiscal window (Apr–Mar).
  if (/^\d{4}-\d{4}$/.test(raw)) {
    const [startYearRaw, endYearRaw] = raw.split('-');
    const startYear = Number(startYearRaw);
    const endYear = Number(endYearRaw);
    const startMonth = clampFiscalStartMonth(DEFAULT_FISCAL_START_MONTH);
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endDay = lastDayOfMonth(endYear, endMonth);
    return `${startYear}-${pad2(startMonth)}-01 to ${endYear}-${pad2(endMonth)}-${pad2(endDay)}`;
  }
  const { from, to } = splitFiscalYearRange(raw);
  return composeOrderedFiscalYearRange(from, to);
};

/**
 * Typed / pasted single-date parse (keyboard path from the fiscal-year UX).
 * Accepts company display `YYYY.MM.DD`, ISO, legacy `DD/MM/YYYY`, and natural
 * forms dayjs understands (e.g. `1 Apr 2026`). Invalid / partial → null.
 */
export const parseTypedFiscalDate = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const dotted = trimmed.match(DOTTED_DISPLAY);
  if (dotted) {
    const iso = `${dotted[1]}-${dotted[2]}-${dotted[3]}`;
    const d = dayjs(iso);
    // Reject rolled invalid calendar days (e.g. 2023.02.29 → Mar 1).
    return d.isValid() && d.format(DATE_FORMATS.WIRE) === iso ? iso : null;
  }

  if (ISO_DATE.test(trimmed) || DMY_DATE.test(trimmed)) {
    const known = parseFiscalDateString(trimmed);
    return known ? toISODateString(known) : null;
  }

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
  if (canonical) {
    const { from, to } = splitFiscalYearRange(canonical);
    return composeOrderedFiscalYearRange(from, to);
  }

  const parts = trimmed.split(RANGE_SPLIT);
  if (parts.length !== 2) return '';
  const from = parseTypedFiscalDate(parts[0] ?? '');
  const to = parseTypedFiscalDate(parts[1] ?? '');
  if (!from || !to) return '';
  return composeOrderedFiscalYearRange(from, to);
};

/** True when both sides exist and end is not before start (day precision). */
export const isAcceptableFiscalYearRange = (from: string, to: string): boolean => {
  const a = from.trim();
  const b = to.trim();
  if (!a || !b) return false;
  return a <= b;
};

/** Date[] for callers that still speak Flatpickr (prefer {@link splitFiscalYearRange}). */
export const convertFiscalYearToDates = (fiscalYear: string): Date[] => {
  const { from, to } = splitFiscalYearRange(fiscalYear);
  const start = from ? parseFiscalDateString(from) : null;
  const end = to ? parseFiscalDateString(to) : null;
  if (!start || !end) return [];
  return [start, end];
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
