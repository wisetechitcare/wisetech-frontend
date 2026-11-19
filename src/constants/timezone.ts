/**
 * The default business timezone (IST) — the fallback when a record's own branch timezone is not available, and the
 * zone the backend reads business days and months in (wisetech-backend `utils/istDate.ts`).
 *
 * Its own dependency-free module so pure utilities (formatters, rules) can use it without importing
 * `@utils/date`, which pulls in the Redux store and through it the whole app.
 */
export const IST_TZ = 'Asia/Kolkata';
