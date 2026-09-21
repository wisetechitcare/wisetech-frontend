/**
 * ============================================================================
 * CALENDAR KEY — a business day, kept out of `new Date()`
 * ============================================================================
 *
 * A business day is a CALENDAR DATE: "the 15th of September". An instant is a
 * point on a timeline. Converting the first into the second requires a timezone,
 * and `new Date("15 Sept 2026")` silently supplies the RUNTIME's — which is how
 * a pure date acquires an offset it never had and then loses a day on the way
 * back out.
 *
 * That is the "15 Sept shows Holiday" bug, exactly:
 *
 *     const entryDate = new Date(entry.date);              // "15 Sept 2026"
 *     const formatted = dayjs.utc(entryDate).format(...);  // read back as UTC
 *
 * In IST the first line produces 2026-09-14T18:30:00Z (local midnight), so the
 * second yields "2026-09-14". Every row's holiday lookup ran one day early, which
 * put 14 Sept's Ganesh Chaturthi onto the 15 Sept row and stripped the holiday
 * from the day that actually had one. The comment above that code asserted the
 * value was "timezone-NEUTRAL" — it was, right up until `new Date()` touched it.
 *
 * So this never parses. It reads the digits out of the string and re-emits them.
 * There is no instant, therefore no offset, therefore nothing to shift.
 *
 * The one input that IS an instant is a stored holiday date, which the backend
 * writes as UTC midnight (see the holiday storage contract). Those are read with
 * an explicit UTC accessor rather than a local one.
 */

const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const pad = (v: string | number) => String(v).padStart(2, '0');

/**
 * The `YYYY-MM-DD` key for a business day, or null when the input cannot be read.
 *
 * Accepts every shape the attendance rows actually carry:
 *   "15 Sept 2026" / "15 Sep 2026"   the table's display date
 *   "15/09/2026"                     the same row's `formattedDate`
 *   "2026-09-15"                     an ISO date, passed through
 *   "2026-09-14T00:00:00.000Z"       a stored holiday instant (UTC calendar day)
 *   Date                             ditto
 *
 * Null rather than a guess: a lookup that silently matched the wrong day is what
 * this replaces, and a miss is easier to see than a near-miss.
 */
export function toCalendarKey(input: string | Date | null | undefined): string | null {
    if (input == null) return null;

    if (input instanceof Date) {
        return Number.isNaN(input.getTime()) ? null : input.toISOString().slice(0, 10);
    }

    const value = String(input).trim();
    if (!value) return null;

    // ISO date, with or without a time part. An instant is read in UTC, which is
    // the timezone it was WRITTEN in — holidays are stored at UTC midnight.
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    // "15/09/2026" — day first, matching the app's `formattedDate`.
    const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
    if (slash) return `${slash[3]}-${pad(slash[2])}-${pad(slash[1])}`;

    // "15 Sept 2026" / "15 Sep 2026". dayjs emits "Sept" for September under some
    // locales and "Sep" under others, so the month is matched on its first three
    // letters rather than on an exact token.
    const words = /^(\d{1,2})\s+([A-Za-z]+)\.?\s+(\d{4})$/.exec(value);
    if (words) {
        const month = MONTHS[words[2].slice(0, 3).toLowerCase()];
        return month ? `${words[3]}-${month}-${pad(words[1])}` : null;
    }

    return null;
}

/** True when two date-ish values name the same calendar day. */
export function isSameCalendarDay(
    a: string | Date | null | undefined,
    b: string | Date | null | undefined,
): boolean {
    const ka = toCalendarKey(a);
    // An unreadable value matches nothing — never "everything", which is what an
    // early-return-true would quietly mean.
    return ka !== null && ka === toCalendarKey(b);
}
