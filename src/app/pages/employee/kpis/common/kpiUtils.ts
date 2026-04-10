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
    name === "extra_days"
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
