/**
 * Pull the human-readable reason out of an API error.
 *
 * The backend's error envelope (see `utils/response.ts` + `utils/API.ts`) puts the
 * GENERIC HTTP phrase in `message` ("Bad request", "Conflict") and the ACTUAL reason in
 * `detail`. Reading `message` first — which is the intuitive thing to do, and what most
 * call sites in this app happen to do — therefore shows the user "Bad request" and throws
 * away the sentence that tells them what to fix.
 *
 * `detail` first, `message` as a fallback, caller's text last.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { detail?: unknown; message?: unknown } } })?.response?.data;
  const detail = typeof data?.detail === "string" ? data.detail.trim() : "";
  if (detail) return detail;
  const message = typeof data?.message === "string" ? data.message.trim() : "";
  // Guard against the generic phrases: they are never more useful than the caller's
  // context-specific fallback.
  if (message && !/^(bad request|conflict|not found|internal server error|unprocessable entity)$/i.test(message)) {
    return message;
  }
  return fallback;
}
