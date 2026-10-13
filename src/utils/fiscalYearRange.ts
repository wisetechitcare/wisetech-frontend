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

/** Default April→March range for "today" (when the org has no fiscal year yet). */
export const getDefaultFiscalYear = (): string => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  if (currentMonth >= 4) {
    return `${currentYear}-04-01 to ${currentYear + 1}-03-31`;
  }
  return `${currentYear - 1}-04-01 to ${currentYear}-03-31`;
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
 * Normalise any stored / display fiscal string to ISO `"YYYY-MM-DD to YYYY-MM-DD"`.
 * Returns `''` when unparseable. Also upgrades legacy `"2030-2031"` → Apr–Mar range.
 */
export const toCanonicalFiscalYearRange = (fiscalYear: string | null | undefined): string => {
  const raw = String(fiscalYear ?? '').trim();
  if (!raw) return '';
  if (raw.includes('-') && !raw.includes(' to ') && /^\d{4}-\d{4}$/.test(raw)) {
    const [startYear, endYear] = raw.split('-');
    return `${startYear}-04-01 to ${endYear}-03-31`;
  }
  const { from, to } = splitFiscalYearRange(raw);
  return composeFiscalYearRange(from, to);
};

/** Date[] for callers that still speak Flatpickr (prefer {@link splitFiscalYearRange}). */
export const convertFiscalYearToDates = (fiscalYear: string): Date[] => {
  const { from, to } = splitFiscalYearRange(fiscalYear);
  const start = from ? parseFiscalDateString(from) : null;
  const end = to ? parseFiscalDateString(to) : null;
  if (!start || !end) return [];
  return [start, end];
};
