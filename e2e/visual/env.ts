/** Saved by `pnpm visual:login`. Holds a live session cookie: gitignored, never commit or share it. */
export const AUTH_FILE = "e2e/.auth/user.json"

/**
 * The browser clock is frozen at 10:00 IST today, so greetings, "today" and relative times
 * ("3 hours ago") render the same in a before/after pair taken minutes apart. The backend clock
 * and your data are live, so take both halves of a pair on the same day.
 */
export function frozenNow(): Date {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
  return new Date(`${today}T10:00:00+05:30`)
}
