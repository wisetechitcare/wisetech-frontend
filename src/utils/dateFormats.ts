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

/** Format a date + 24h time for DISPLAY (`2025.12.03 14:30`). */
export const formatDateTime = (value: DateLike, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.DISPLAY_DATETIME) : fallback;
};

/** Serialize for the API/DB (ISO `YYYY-MM-DD`). Returns `''` when absent/invalid. */
export const toWireDate = (value: DateLike): string => {
  if (value === null || value === undefined || value === "") return "";
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMATS.WIRE) : "";
};

export const formatDateRange = (start: Dayjs, end: Dayjs, includeYear: boolean = false): string => {
  if (!start || !end || !start.isValid() || !end.isValid()) return "";
  
  const isSameMonth = start.isSame(end, "month");
  const isSameYear = start.isSame(end, "year");
  
  let result = "";
  if (start.isSame(end, "day")) {
      result = start.format("D MMM");
  } else if (isSameMonth && isSameYear) {
      result = `${start.format("D")} - ${end.format("D MMM")}`;
  } else {
      result = `${start.format("D MMM")} - ${end.format("D MMM")}`;
  }
  
  if (includeYear) {
      result += `, ${end.format("YYYY")}`;
  }
  
  return result;
};

export const buildFiscalYearLabel = (start: Dayjs, rawEnd: Dayjs, end: Dayjs): string => {
  if (!start || !rawEnd || !start.isValid() || !rawEnd.isValid()) return "";
  return `FY ${start.format("YYYY")}-${rawEnd.format("YY")}`;
};
