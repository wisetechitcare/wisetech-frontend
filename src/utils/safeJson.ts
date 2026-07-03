/**
 * Drop-in, never-throws replacement for `JSON.parse()` on values that are
 * EXPECTED to be a JSON string but in practice arrive in many shapes across
 * environments/records.
 *
 * The app stores feature configs, working-days, etc. as JSON strings and parses
 * them on read with raw `JSON.parse()`. That crashes the whole page when the
 * value is:
 *   - already an object (e.g. a Prisma JSON column returns a parsed object) →
 *     `JSON.parse({})` stringifies to "[object Object]" → SyntaxError
 *   - the literal string "null"/"undefined" → `JSON.parse("null")` === null
 *   - null / undefined / "" / malformed JSON
 *
 * Behavior:
 *   - already an object/array → returned as-is (it was already parsed)
 *   - a valid JSON string      → parsed
 *   - anything else            → `fallback` (defaults to {})
 *
 * Returns `any` so it is a true drop-in for `JSON.parse(x)` with no call-site
 * type friction: `JSON.parse(x)` → `safeJsonParse(x)`.
 *
 * @param raw       the value to parse
 * @param fallback  returned when `raw` can't yield a usable parsed value (default {})
 */
export function safeJsonParse(raw: unknown, fallback: any = {}): any {
  if (raw == null) return fallback;
  // Already parsed (object or array) — hand it straight back.
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return fallback;

  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return fallback;

  try {
    const parsed = JSON.parse(trimmed);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch {
    return fallback;
  }
}
