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
