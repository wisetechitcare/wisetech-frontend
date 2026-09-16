/**
 * ============================================================================
 * CORRECTION WINDOW — the client half of the attendance-correction policy
 * ============================================================================
 *
 * Decides what to OFFER. It decides nothing about what is allowed.
 *
 * `services/attendanceCorrectionPolicy.ts` on the server is the enforcer and will
 * refuse anything this lets through, so the only job here is to avoid drawing a
 * button that leads to a refusal. The rules are mirrored deliberately: the
 * alternative is a server round trip per table row, and a table paints forty.
 *
 * The values it mirrors are NOT hardcoded — the window comes from the same
 * `leave management` configuration blob the screen already loads, scoped to the
 * viewed employee's own company and branch. Keep `CORRECTION_WINDOW_MONTHS_KEY`
 * character-identical to the server's constant; the literal string IS the key.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACES
 * ---------------------------------------------------------------------------
 *     const isPastDate = dayjs(row.date).isBefore(dayjs(), 'day');
 *     return ... && !isPastDate ? <pencil/> : 'Not Allowed'
 *
 * One line, two defects. It offered a correction on TODAY and nothing else, so a
 * check-out forgotten yesterday was unreachable by the next morning — the exact
 * opposite of what regularization is for. And because every past row was refused,
 * weekends and holidays looked like they were being refused FOR BEING weekends
 * and holidays, which is the question this started from. They never were; they
 * were simply in the past.
 */

import { toCalendarKey } from '@utils/calendarKey';
import { ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, MISSING_CHECKOUT, ON_LEAVE, PRESENT, WEEKEND } from '@constants/statistics';

/**
 * Key inside the `leave management` configuration JSON.
 * Must match `CORRECTION_WINDOW_MONTHS_KEY` in the backend policy exactly.
 */
export const CORRECTION_WINDOW_MONTHS_KEY = 'Attendance Correction Window (Months)';

/** Current month plus the whole of last month — the period payroll still calls open. */
export const DEFAULT_CORRECTION_WINDOW_MONTHS = 1;

/** Guard against a typo becoming a policy. Mirrors the server's clamp. */
export const MAX_CORRECTION_WINDOW_MONTHS = 120;

/**
 * Row statuses that may be corrected.
 *
 * `Weekend` and `Holiday` are IN: a row only reads as one of those when there is
 * no punch at all, which is precisely the case of someone who worked the day and
 * forgot to clock in entirely.
 *
 * `On Leave` is OUT: the leave reconciler already owns "attendance overrides
 * leave" and trims the span when a punch lands. A correction there would give the
 * date two writers.
 */
const CORRECTABLE_STATUSES: ReadonlySet<string> = new Set([
    PRESENT,
    ABSENT,
    WEEKEND,
    'Holiday',
    CHECK_IN_MISSING,
    CHECK_OUT_MISSING,
    MISSING_CHECKOUT,
    'Working on weekend',
    'Half Day',
]);

const pad = (v: number) => String(v).padStart(2, '0');

/** Read the tenant's window out of the loaded `leave management` config. */
export function parseCorrectionWindowMonths(config: Record<string, unknown> | null | undefined): number {
    const raw = config?.[CORRECTION_WINDOW_MONTHS_KEY];
    if (raw === null || raw === undefined || raw === '') return DEFAULT_CORRECTION_WINDOW_MONTHS;

    const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
    // Falls back to the DEFAULT, never to 0 or Infinity — one locks everyone out of
    // last month, the other offers every closed month. A typo should do neither.
    if (!Number.isFinite(n) || n < 0) return DEFAULT_CORRECTION_WINDOW_MONTHS;

    return Math.min(Math.floor(n), MAX_CORRECTION_WINDOW_MONTHS);
}

/**
 * First date still open to a correction. Pure string arithmetic, no `Date` — the
 * same discipline as `toCalendarKey`, and for the same reason.
 */
export function earliestCorrectableDate(today: string, windowMonths: number): string {
    const [y, m] = today.split('-').map(Number);
    const absolute = y * 12 + (m - 1) - windowMonths;
    return `${String(Math.floor(absolute / 12)).padStart(4, '0')}-${pad((absolute % 12) + 1)}-01`;
}

export interface OfferCorrectionInput {
    /** The row's business day, in any form `toCalendarKey` reads. */
    date: string | Date | null | undefined;
    /** The row's rendered status. */
    status?: unknown;
    /** Today, as `YYYY-MM-DD` in the viewed employee's own timezone. */
    today: string;
    windowMonths: number;
}

/** Whether this row should be offered a "raise a correction" action. */
export function canOfferCorrection(input: OfferCorrectionInput): boolean {
    const { date, status, today, windowMonths } = input;

    const key = toCalendarKey(date);
    // An unreadable date is offered nothing. A near-miss is worse than a miss.
    if (key === null) return false;

    if (key > today) return false;
    if (key < earliestCorrectableDate(today, windowMonths)) return false;

    // Placeholder rows for days that have not happened carry "-" here; they are not
    // days. An unrecognised status is treated the same way — the server holds the
    // real allow-list, and guessing wide would invite a refused click.
    return typeof status === 'string' && CORRECTABLE_STATUSES.has(status);
}
