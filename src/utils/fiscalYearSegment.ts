/**
 * The fiscal-year SEGMENT of a generated number — the "26-27" in
 * "WT/OFFER/26-27/149".
 *
 * TWIN OF THE BACKEND. The authority is
 * `wisetech-backend/src/utils/fiscalYearFormat.ts`; this file exists so previews
 * can render the same segment without a round trip, and it must stay
 * algorithmically identical. A divergence here does not corrupt anything — the
 * server issues the real number — but it makes the preview lie, which is worse
 * than having no preview.
 *
 * Shared, not per-screen: Lead, Project and Bill prefix settings all render this
 * segment, and previously each had its own parser.
 *
 * ── Never assume April ───────────────────────────────────────────────────────
 *
 * Fiscal years are not all April-March. An organisation running October to
 * September stores "2025-10-01 to 2026-09-30" and must read "25-26", so the
 * parser takes the FIRST and LAST four-digit years it finds and ignores months
 * entirely. Do not add a start-month constant to this file.
 */

export const FISCAL_YEAR_FORMATS = ['YY-YY', 'YYYY-YY', 'YYYY-YYYY', 'YY', 'YYYY'] as const;
export type FiscalYearFormat = (typeof FISCAL_YEAR_FORMATS)[number];

/**
 * What every number rendered before the shape was configurable. Rows store NULL
 * for it, so this default has to keep producing the identical string.
 */
export const DEFAULT_FISCAL_YEAR_FORMAT: FiscalYearFormat = 'YY-YY';

export const isFiscalYearFormat = (value: unknown): value is FiscalYearFormat =>
  typeof value === 'string' && (FISCAL_YEAR_FORMATS as readonly string[]).includes(value);

/** Falls back rather than throwing, so an unknown stored value still renders. */
export const asFiscalYearFormat = (value: unknown): FiscalYearFormat =>
  isFiscalYearFormat(value) ? value : DEFAULT_FISCAL_YEAR_FORMAT;

interface FiscalYearParts {
  startYear: number;
  endYear: number;
}

/**
 * The two calendar years a stored fiscal-year string spans.
 *
 *   "2026-04-01 to 2027-03-31"  → 2026, 2027
 *   "01/10/2025 to 30/09/2026"  → 2025, 2026   (an October fiscal year)
 *   "2026-27"                   → 2026, 2027
 *   "2026"                      → 2026, 2026
 *
 * Null when there is no four-digit year to read — the signal to pass the raw
 * string through rather than invent one.
 */
const fiscalYearParts = (rawYear: string | null | undefined): FiscalYearParts | null => {
  const raw = String(rawYear ?? '').trim();

  // "YYYY-YY" — the tail is a two-digit continuation, not a year the scan below
  // would match on its own.
  const yyyyYy = raw.match(/^(\d{4})\s*-\s*(\d{2})$/);
  if (yyyyYy) {
    const startYear = Number(yyyyYy[1]);
    const century = Math.floor(startYear / 100) * 100;
    const endYear = century + Number(yyyyYy[2]);
    // "2099-00" is 2100, not 2000.
    return { startYear, endYear: endYear < startYear ? endYear + 100 : endYear };
  }

  const years = raw.match(/\b(19|20)\d{2}\b/g);
  if (!years || years.length === 0) return null;

  return { startYear: Number(years[0]), endYear: Number(years[years.length - 1]) };
};

const yy = (year: number): string => String(year % 100).padStart(2, '0');

const renderParts = (parts: FiscalYearParts, format: FiscalYearFormat): string => {
  const { startYear, endYear } = parts;
  // A single-year fiscal year has no span to print — "26-26" would read as a
  // two-year range that does not exist.
  const spans = endYear !== startYear;

  switch (format) {
    case 'YYYY':
      return String(startYear);
    case 'YY':
      return yy(startYear);
    case 'YYYY-YYYY':
      return spans ? `${startYear}-${endYear}` : String(startYear);
    case 'YYYY-YY':
      return spans ? `${startYear}-${yy(endYear)}` : String(startYear);
    case 'YY-YY':
    default:
      return spans ? `${yy(startYear)}-${yy(endYear)}` : yy(startYear);
  }
};

/** Render a fiscal year in the chosen shape, from its starting calendar year. */
export const formatFiscalYearFromStart = (
  startYear: number,
  format: FiscalYearFormat = DEFAULT_FISCAL_YEAR_FORMAT,
): string => renderParts({ startYear, endYear: startYear + 1 }, format);

/**
 * The segment: a stored fiscal-year string plus a chosen shape.
 *
 * An unparseable string passes through trimmed and unchanged — a hand-typed
 * custom segment is somebody's deliberate choice, not something to mangle.
 */
export const formatFiscalYearSegment = (
  rawYear: string | null | undefined,
  format: FiscalYearFormat = DEFAULT_FISCAL_YEAR_FORMAT,
): string => {
  const parts = fiscalYearParts(rawYear);
  if (!parts) return String(rawYear ?? '').trim();
  return renderParts(parts, format);
};

/**
 * The canonical short form, whatever an admin chose to display.
 *
 * On the server this is the counter key, so it must never follow the configured
 * format. Mirrored here for the same reason the rest of the file is: so the two
 * sides cannot drift.
 */
export const canonicalFiscalYear = (rawYear: string | null | undefined): string =>
  formatFiscalYearSegment(rawYear, DEFAULT_FISCAL_YEAR_FORMAT);

/**
 * The Configure dropdown's choices, each labelled with what it actually produces
 * — built by running the real formatter over a sample year, so the menu can
 * never advertise a shape the numbers do not take.
 */
export const FISCAL_YEAR_FORMAT_OPTIONS: {
  value: FiscalYearFormat;
  label: string;
  sample: string;
}[] = FISCAL_YEAR_FORMATS.map((value) => ({
  value,
  label: value,
  sample: formatFiscalYearFromStart(2026, value),
}));
