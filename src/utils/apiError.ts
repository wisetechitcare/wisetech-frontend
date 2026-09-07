/**
 * The human-readable reason out of an API failure.
 *
 * This API's failure envelope (backend `utils/response.ts` → `failureHandler`) is:
 *
 *   { statusCode: 400, message: "Bad request", detail: "\"Design\" is still used by 3 employees…" }
 *
 * `message` is the HTTP STATUS NAME. `detail` is the sentence a person should read.
 * Reading `.message` — which most of this codebase does — puts "Bad request" or
 * "Internal server error" in front of the user and throws away the only part that
 * says what went wrong or what to do about it.
 *
 * One extractor so a screen cannot get that wrong by accident, and so the next change
 * to the envelope is a change in one place.
 */

/** HTTP status names, which are never worth showing on their own. */
const STATUS_NAMES = new Set([
    'bad request',
    'unauthorized',
    'forbidden',
    'not found',
    'method not allowed',
    'conflict',
    'unprocessable entity',
    'internal server error',
]);

const clean = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const data = (error as any)?.response?.data;

    const detail = clean(data?.detail);
    if (detail) return detail;

    // Some endpoints put the real sentence in `message`. Take it — unless it is just
    // the status name, which is what the envelope above always puts there.
    const message = clean(data?.message);
    if (message && !STATUS_NAMES.has(message.toLowerCase())) return message;

    return fallback;
};

export default apiErrorMessage;
