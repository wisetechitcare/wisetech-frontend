/**
 * Centralized utility to get a consistent unit label for KPI factors.
 * 
 * Rules:
 * - HOURS-based: "hrs" if contains "hour" or is a known hours factor.
 * - DAYS-based: "days" if contains "day", "attendance", "leave".
 * - REQUEST-based: "req" if contains "request".
 * - Fallback: "" (removes Generic "units")
 * 
 * @param factorName The name of the KPI factor or its code.
 * @returns A string representing the unit (e.g., "hrs", "days", "req", or "").
 */
export const getFactorUnit = (factorName: string | undefined): string => {
  if (!factorName) return "";

  const name = factorName.toLowerCase();

  // HOURS-based factors
  if (
    name.includes("hour") ||
    name === "total working hour" ||
    name === "total late hours" ||
    name === "over time" ||
    name === "late_hours" ||
    name === "overtime" ||
    name === "total_working_hours"
  ) {
    return "hrs";
  }

  // DAYS-based factors
  if (
    name.includes("day") ||
    name.includes("attendance") ||
    name.includes("leave") ||
    name === "working days" ||
    name === "on time attendance days" ||
    name === "absent days" ||
    name === "extra days" ||
    name === "attendance_days" ||
    name === "absent_days" ||
    name === "extra_days" ||
    name.includes("early checkin") ||
    name.includes("Early CheckOut") ||
    name.includes("early check in") ||
    name.includes("early check out")
  ) {
    return "days";
  }

  // REQUEST-based factors
  if (
    name.includes("request") ||
    name === "request raised" ||
    name === "request_raised"
  ) {
    return "req";
  }

  // Fallback to empty string (replaces generic "units")
  return "";
};

/**
 * Converts a decimal hour value to a human-readable "XH YM" string.
 * e.g. 84.84 → "84H 50M", 0.5 → "30M", 2 → "2H"
 *
 * IMPORTANT: minutes are TRUNCATED (floored), never rounded up. This keeps KPI
 * identical to the Salary & Attendance pages — and to the backend, which already
 * floors these factors to whole minutes (e.g. overtime 18:33:59 → 18h 33m, not
 * 18h 34m). The tiny epsilon absorbs float noise so a value that is exactly on a
 * minute boundary still lands on that minute (and fixes the old "29H 60M" glitch).
 */
export function formatHours(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return "0H";
  const totalMinutes = Math.floor(decimalHours * 60 + 1e-6);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}M`;
  if (minutes === 0) return `${hours}H`;
  return `${hours}H ${minutes}M`;
}

/**
 * Returns true when the unit string represents an hours-based measurement.
 */
export function isHourUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const u = unit.toLowerCase().trim();
  return u === "hour" || u === "hours" || u === "hrs";
}

/**
 * Formats a weightage value with its unit into a readable "X Points / Day" or "X Point / Hour" string.
 * Handles singular ("1 Point") vs plural ("5 Points").
 * e.g. (5, "day") → "5 Points / Day", (1, "Hours") → "1 Point / Hour"
 */
export function formatWeightageUnit(weightage: number, unit: string | undefined): string {
  if (!unit) return String(weightage);
  const pointLabel = weightage === 1 ? "Point" : "Points";
  const normalizedUnit = isHourUnit(unit) ? "Hour" : "Day";
  return `${weightage} ${pointLabel} / ${normalizedUnit}`;
}
