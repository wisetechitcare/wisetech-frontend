export type WorkingDaysMap = Record<string, string>;

/**
 * Safely parse a branch's `workingAndOffDays` into a `{ dayName: "1" | "0" }` map
 * ("1" = working day, "0" = weekend/off). ALWAYS returns an object — never null or
 * undefined — so callers can index it by day name without a crash.
 *
 * Handles every shape the value has been seen in:
 *  - null / undefined            → {}
 *  - "" (empty string)           → {}
 *  - the literal string "null"    → {}   (JSON.parse("null") === null — the bug that
 *    or "undefined"                       crashed the heatmap with `null["saturday"]`)
 *  - a valid JSON object string   → the parsed object
 *  - an already-parsed object     → returned as-is
 *  - invalid / non-object JSON    → {}
 */
/**
 * Is this date a non-working day according to the branch's WEEKLY pattern?
 *
 * Weekly pattern only — it deliberately knows nothing about holidays or the one-off
 * `isWeekend` rows (the alternate Saturdays), which are per-date and must be looked up
 * separately. A caller that needs "is this day off at all" has to check both.
 *
 * Falls back to Saturday + Sunday when the branch has no config, which is the historical
 * behaviour every call site already assumed.
 */
export function isNonWorkingWeekday(date: Date | string, raw: unknown): boolean {
  const d = date instanceof Date ? date : new Date(date);
  const map = parseWorkingDays(raw);
  if (Object.keys(map).length === 0) {
    const day = d.getDay();
    return day === 0 || day === 6;
  }
  const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return map[names[d.getDay()]] === '0';
}

export function parseWorkingDays(raw: unknown): WorkingDaysMap {
  if (raw == null) return {};
  if (typeof raw === 'object') return raw as WorkingDaysMap; // already parsed by the API
  if (typeof raw !== 'string') return {};

  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return {};

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? (parsed as WorkingDaysMap) : {};
  } catch {
    return {};
  }
}
