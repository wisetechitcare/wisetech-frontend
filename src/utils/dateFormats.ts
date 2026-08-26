import dayjs, { Dayjs } from "dayjs";

/**
 * ============================================================================
 * WiseTech date formats — the single source of truth.
 * ============================================================================
 *
 * COMPANY STANDARD (official date format guide): **YYYY.MM.DD** — year first,
 * DOT separated. `2025.12.03` ✅ · `2025-12-03` ❌ (dashes) · `03.12.2025` ❌ (day first).
 * Every date a USER SEES must render through `DATE_FORMATS.DISPLAY` / `formatDate()`.
 *
 * DISPLAY vs WIRE — the one distinction that matters:
 *   • DISPLAY (`YYYY.MM.DD`) — anything rendered to a human: fields, tables, cards, exports,
 *     PDFs, emails. This is what the company standard governs.
 *   • WIRE (`YYYY-MM-DD`, ISO 8601) — what crosses the network or hits the DB. This MUST stay
 *     ISO: it is what the backend (Prisma/MySQL) parses, what `<input type=date>` and the
 *     MUI pickers use internally, and what every existing API payload/query param already
 *     sends. Reformatting wire values to dots would break date parsing server-side.
 * Rule of thumb: if a human reads it, DISPLAY; if a machine parses it, WIRE.
 */
export const DATE_FORMATS = {
  /** ✅ The company standard. Use for every user-visible date. */
  DISPLAY: "YYYY.MM.DD",
  /**
   * Long form with the month spelled out — `1 July 2026`. For headings and labels a
   * person reads rather than scans: period filters, modal subtitles, report headers.
   * Never abbreviate the month ("Jul") — that was the old ad-hoc `D MMM YYYY` and it
   * is what this token replaces.
   */
  DISPLAY_LONG: "D MMMM YYYY",
  /** Long month + year — `August 2026`. The readable form of MONTH_YEAR. */
  MONTH_YEAR_LONG: "MMMM YYYY",
  /** User-visible date + 24h time. */
  DISPLAY_DATETIME: "YYYY.MM.DD HH:mm",
  /** User-visible time only. */
  DISPLAY_TIME: "HH:mm",
  /** ISO — network/DB only, never shown to a user. */
  WIRE: "YYYY-MM-DD",
  /** ISO date-time (local, no zone) — matches `<input type=datetime-local>`. */
  WIRE_DATETIME: "YYYY-MM-DDTHH:mm",

  MONTH_YEAR: "YYYY.MM",
  YEAR_ONLY: "YYYY",
  FISCAL_YEAR: "[FY] YYYY",
  /** Date-picker input mask — mirrors DISPLAY so typing matches what's shown. */
  DATE_PICKER: "YYYY.MM.DD",
} as const;

/** Accepts anything dayjs can parse (ISO string, Date, Dayjs). */
type DateLike = string | number | Date | Dayjs | null | undefined;

/**
 * Format a date for DISPLAY in the company standard (`2025.12.03`).
 * Returns `fallback` (default `"—"`) for null/empty/invalid input, so callers don't render
 * "Invalid Date" — the single most common date bug in this codebase.
 */
export const formatDate = (value: DateLike, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.DISPLAY) : fallback;
};

/** Format a date in the long, spelled-out form (`3 December 2025`). See DISPLAY_LONG. */
export const formatDateLong = (value: DateLike, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.DISPLAY_LONG) : fallback;
};

/** Format a date + 24h time for DISPLAY (`2025.12.03 14:30`). */
export const formatDateTime = (value: DateLike, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.DISPLAY_DATETIME) : fallback;
};

/** Format the time only, 24h (`14:30`). See DISPLAY_TIME. */
export const formatTime = (value: DateLike, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.DISPLAY_TIME) : fallback;
};

/** Serialize for the API/DB (ISO `YYYY-MM-DD`). Returns `''` when absent/invalid. */
export const toWireDate = (value: DateLike): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.WIRE) : "";
};

/**
 * Both range styles share this. Repeated parts are elided — a span inside one month
 * names the month once — and `includeYear` appends the year for labels that stand alone.
 *
 * A span crossing a year boundary ALWAYS states both years, regardless of `includeYear`:
 * the original rendered 28 Dec 2026 → 3 Jan 2027 as "28 Dec - 3 Jan, 2027", silently
 * attributing the start date to the wrong year.
 */
const buildDateRange = (
  start: Dayjs,
  end: Dayjs,
  includeYear: boolean,
  month: "MMM" | "MMMM",
  dash: string,
): string => {
  if (!start || !end || !start.isValid() || !end.isValid()) return "";

  const full = `D ${month} YYYY`;
  if (!start.isSame(end, "year")) return `${start.format(full)} ${dash} ${end.format(full)}`;

  const suffix = includeYear ? `, ${end.format(DATE_FORMATS.YEAR_ONLY)}` : "";

  if (start.isSame(end, "day")) return `${start.format(`D ${month}`)}${suffix}`;
  if (start.isSame(end, "month")) return `${start.format("D")} ${dash} ${end.format(`D ${month}`)}${suffix}`;
  return `${start.format(`D ${month}`)} ${dash} ${end.format(`D ${month}`)}${suffix}`;
};

/**
 * Compact span — `19 - 25 Jul`, `19 - 25 Jul, 2026` with `includeYear`.
 *
 * Kept as-is for dense contexts (table cells, chips, anywhere the width is tight).
 * For a HEADING a person reads, prefer {@link formatDateRangeLong} — an abbreviated
 * month scans as data rather than as a label.
 */
export const formatDateRange = (start: Dayjs, end: Dayjs, includeYear: boolean = false): string =>
  buildDateRange(start, end, includeYear, "MMM", "-");

/**
 * Detailed span with the month spelled out — `19 – 25 July`, `19 – 25 July, 2026` with
 * `includeYear`. The long-form counterpart of {@link formatDateRange}; both exist so a
 * consumer picks per surface rather than one replacing the other.
 */
export const formatDateRangeLong = (start: Dayjs, end: Dayjs, includeYear: boolean = false): string =>
  buildDateRange(start, end, includeYear, "MMMM", "–");

export const buildFiscalYearLabel = (start: Dayjs, rawEnd: Dayjs, end: Dayjs): string => {
  if (!start || !rawEnd || !start.isValid() || !rawEnd.isValid()) return "";
  return `FY ${start.format("YYYY")}-${rawEnd.format("YY")}`;
};
