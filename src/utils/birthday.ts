import dayjs from "dayjs";

/**
 * A birthday is often known without its year. The column stores a full date, so an unknown
 * year is saved as this one: a LEAP year, so 29 February still fits. Greetings compare only
 * day and month, so they work unchanged; every screen shows such a date without a year and
 * never works out an age from it. Keep in step with the backend's `YEARLESS_BIRTH_YEAR`.
 */
export const YEARLESS_YEAR = 1904;

export const isYearless = (date: string | Date | null | undefined): boolean =>
  !!date && dayjs(date).isValid() && dayjs(date).year() === YEARLESS_YEAR;

/** "12 Mar" when the year is unknown, "12 Mar 1990" when it is; "" for no date. */
export const formatBirthday = (date: string | Date | null | undefined): string => {
  if (!date || !dayjs(date).isValid()) return "";
  return dayjs(date).format(isYearless(date) ? "D MMM" : "D MMM YYYY");
};

/** Age in whole years on `on`, or null when there is no date or no known year. */
export const ageFrom = (date: string | Date | null | undefined, on: Date = new Date()): number | null => {
  if (!date || !dayjs(date).isValid() || isYearless(date)) return null;
  return dayjs(on).diff(dayjs(date), "year");
};

/** Days in a month; February has 29 when the year is unknown (it could be a leap year). */
export const daysInMonth = (month: number, year?: number | null): number =>
  month === 2 && !year ? 29 : dayjs(`${year || 2001}-${String(month).padStart(2, "0")}-01`).daysInMonth();

/** The form value ("YYYY-MM-DD", or "" until day and month are both picked). */
export const toBirthdayValue = (day: number | null, month: number | null, year: number | null): string =>
  day && month
    ? `${year || YEARLESS_YEAR}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    : "";

/** Split a stored / form value back into its parts; the placeholder year reads as unknown. */
export const fromBirthdayValue = (value: string | null | undefined): { day: number | null; month: number | null; year: number | null } => {
  const d = value ? dayjs(value) : null;
  if (!d || !d.isValid()) return { day: null, month: null, year: null };
  return { day: d.date(), month: d.month() + 1, year: d.year() === YEARLESS_YEAR ? null : d.year() };
};
