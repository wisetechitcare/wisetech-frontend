/**
 * Chronological sorting for date columns — pure, no React/MUI, so it can be
 * exercised by dateSort.test.ts without bundling the UI layer.
 *
 * Why this exists: MRT's default `sortingFn: 'auto'` sorts a display string
 * alphanumerically. It chunks "30/07/2024" into [30, 7, 2024] and orders by DAY
 * OF MONTH first; "DD MMM YYYY" is worse still, because the month sorts
 * alphabetically (Apr, Aug, Dec…). Any column whose row value is a formatted
 * date needs an explicit comparator.
 */

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/**
 * Display formats this codebase actually emits, tried in order under STRICT
 * parsing. Day-first throughout (company convention) — a loose parser would
 * read "03/12/2025" as 12 March. `YYYY.MM.DD` (the documented display standard)
 * leads because it is unambiguous.
 */
const DISPLAY_FORMATS = [
  "YYYY.MM.DD",
  "DD/MM/YYYY",
  "DD-MM-YYYY",
  "DD.MM.YYYY",
  "DD MMM YYYY",
  "DD-MMM-YYYY",
  "DD MMM YYYY, hh:mm A",
  "DD/MM/YYYY, hh:mm A",
  "DD MMM YYYY HH:mm",
];

const BLANKS = new Set(["", "-", "—", "N/A", "NA", "NULL", "UNDEFINED"]);

// A sortingFn runs O(n log n) times, so the same handful of strings gets parsed
// over and over. Cache by raw string; distinct date values are bounded by rows.
// ponytail: unbounded Map, wiped at 5k distinct keys. Swap for an LRU only if a
// table ever holds more distinct date strings than that.
const timeCache = new Map<string, number>();

/**
 * Parse anything a date column might hold — raw ISO/wire value, Date, epoch
 * number, or an already-formatted display string — into a sortable timestamp.
 *
 * Blank / "N/A" sorts as oldest (0) so dated rows lead a descending view, which
 * matches the convention already used by ProjectTablePage.
 */
export const toSortableTime = (value: unknown): number => {
  if (value == null) return 0;
  if (value instanceof Date) return value.getTime() || 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  if (!raw || BLANKS.has(raw.toUpperCase())) return 0;

  const cached = timeCache.get(raw);
  if (cached !== undefined) return cached;

  // Explicit display formats first (strict), so "30/07/2024" is never handed to
  // a loose parser that would read it month-first or reject it outright. Fall
  // back to dayjs's native parsing for ISO / wire values.
  let parsed = dayjs(raw, DISPLAY_FORMATS, true);
  if (!parsed.isValid()) parsed = dayjs(raw);

  const time = parsed.isValid() ? parsed.valueOf() : 0;
  if (timeCache.size > 5000) timeCache.clear();
  timeCache.set(raw, time);
  return time;
};

/** Chronological comparator for any date column. Pass as `sortingFn`. */
export const dateSortingFn = (rowA: any, rowB: any, columnId: string): number =>
  toSortableTime(rowA.getValue(columnId)) - toSortableTime(rowB.getValue(columnId));
