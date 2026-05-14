/**
 * PRODUCTION KPI BEHAVIOR CLASSIFICATION
 * 
 * This centralized utility defines how each KPI factor should be interpreted
 * for business logic, specifically for color coding and performance evaluation.
 * 
 * CATEGORIES:
 * 1. MANDATORY: Green if score === maxScore (Full compliance), else Red.
 * 2. ACHIEVEMENT: Green if score > 0 (Bonus earned), else Neutral (No red).
 * 3. NEGATIVE: Green if score === 0 (No violations), else Red.
 */

export enum KpiBehavior {
  MANDATORY = "MANDATORY",
  ACHIEVEMENT = "ACHIEVEMENT",
  NEGATIVE = "NEGATIVE",
}

export const FACTOR_BEHAVIOR_MAP: Record<string, KpiBehavior> = {
  // MANDATORY: Minimum company expectations / Compliance
  "Working Days": KpiBehavior.MANDATORY,
  "Total Working Hours": KpiBehavior.MANDATORY,
  "Total Working Hour": KpiBehavior.MANDATORY,
  "On Time Attendance": KpiBehavior.MANDATORY,
  "On Time Attendance Days": KpiBehavior.MANDATORY,

  // ACHIEVEMENT: Voluntary performance boosters / Bonuses
  "Early CheckIn": KpiBehavior.ACHIEVEMENT,
  "Overtime": KpiBehavior.ACHIEVEMENT,
  "Over Time": KpiBehavior.ACHIEVEMENT,
  "Extra Days": KpiBehavior.ACHIEVEMENT,

  // NEGATIVE: Policy breaches / Violations
  "Late Attendance": KpiBehavior.NEGATIVE,
  "Late Attendance Days": KpiBehavior.NEGATIVE,
  "Absent Days": KpiBehavior.NEGATIVE,
  "Early Checkout": KpiBehavior.NEGATIVE,
  "Total Late Hours": KpiBehavior.NEGATIVE,
  "Request Raised": KpiBehavior.NEGATIVE,
  "Total Paid Leaves Taken": KpiBehavior.NEGATIVE,
  "Total Unpaid Leaves Taken": KpiBehavior.NEGATIVE,
};

/**
 * Resolves the business behavior category for a given factor name.
 * Falls back based on the provided factor type if name is not explicitly mapped.
 */
export const getKpiBehavior = (factorName: string, factorType?: string): KpiBehavior => {
  const normalizedName = factorName.trim();
  if (FACTOR_BEHAVIOR_MAP[normalizedName]) {
    return FACTOR_BEHAVIOR_MAP[normalizedName];
  }

  // Fallback to type-based logic if name mapping is missing
  if (factorType?.toUpperCase() === "NEGATIVE") {
    return KpiBehavior.NEGATIVE;
  }

  // Default to ACHIEVEMENT for other positive factors not explicitly marked as MANDATORY
  return KpiBehavior.ACHIEVEMENT;
};

/**
 * Determines the color state based on business rules.
 * returns: "success" | "danger" | "neutral"
 */
export const getKpiColorState = (
  score: number,
  maxScore: number,
  behavior: KpiBehavior
): "success" | "danger" | "neutral" => {
  switch (behavior) {
    case KpiBehavior.MANDATORY:
      // Green only if fully satisfied, else Red
      return score >= maxScore && maxScore > 0 ? "success" : "danger";

    case KpiBehavior.ACHIEVEMENT:
      // Green if any bonus earned, Red if negative total, else Neutral
      if (score < 0) return "danger";
      return score > 0 ? "success" : "neutral";

    case KpiBehavior.NEGATIVE:
      // Green if zero violations, else Red
      return score === 0 ? "success" : "danger";

    default:
      return score >= 0 ? "success" : "danger";
  }
};
