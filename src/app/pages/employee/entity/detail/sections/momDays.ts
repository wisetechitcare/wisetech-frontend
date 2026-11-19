import dayjs, { type Dayjs } from 'dayjs';

/**
 * Days a MoM line has been (or was) open: open date → close date, or → today while still open.
 * Calendar days, so the clock time of either end never shifts the count.
 * Derived on read, never stored — a stored count is wrong by the next morning.
 */
export const daysOpen = (openDate: string, closeDate: string | null, today: Dayjs = dayjs()): number =>
    Math.max(0, (closeDate ? dayjs(closeDate) : today).startOf('day').diff(dayjs(openDate).startOf('day'), 'day'));
