/**
 * Centralized utility for consistent KPI Factor ordering across the application.
 * This ensures that factors always appear in the same sequence in tables, cards,
 * and modals, without affecting underlying calculations or API logic.
 */

export const FACTOR_DISPLAY_ORDER: Record<string, number> = {
  
  // POSITIVE FACTORS
  "Working Days": 20,
  "Early CheckIn": 10,
  "Total Working Hour": 30,
  "Total Working Hours": 30, // mapping both variants for safety
  "On-Time Attendance Days": 40,
  "On Time Attendance Days": 40,
  "On Time Attendance": 40,
  "Over Time": 50,
  "Overtime": 50,
  "Extra Days": 60,

  // NEGATIVE FACTORS
  "Late Attendance Days": 110,
  "Late Attendance": 110,
  "Total Late Hours": 120,
  "Early CheckOut": 130,
  "Early Checkout": 130,
  "Request Raised": 140,

  // LEAVES
  "Total Paid Leaves Taken": 210,
  "Total Unpaid Leaves Taken": 220,
};

/**
 * Sorts an array of factors based on the central display order.
 * Unknown factors are placed at the end.
 *
 * @param factors - Array of factors to sort
 * @param getName - Optional function to extract the name from the factor object
 */
export const sortKpiFactors = <T>(
  factors: T[],
  getName: (item: T) => string = (item: any) => item?.name || item?.factor || ""
): T[] => {
  if (!Array.isArray(factors)) return [];

  return [...factors].sort((a, b) => {
    const nameA = getName(a);
    const nameB = getName(b);

    const orderA = FACTOR_DISPLAY_ORDER[nameA] ?? 999;
    const orderB = FACTOR_DISPLAY_ORDER[nameB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Secondary sort: Alphabetical for unknown factors or same priority
    return nameA.localeCompare(nameB);
  });
};
