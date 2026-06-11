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
  "Early CheckOut": KpiBehavior.NEGATIVE,
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
  const type = factorType?.toUpperCase();

  // â”€â”€ LIVE CONFIG TYPE IS THE SOURCE OF TRUTH â”€â”€
  // The configured type drives behavior with NO name-based overrides, so a leave
  // factor set to POSITIVE is treated as positive (and NEGATIVE as a violation).
  // The static name map only refines the *positive* direction into MANDATORY vs
  // ACHIEVEMENT.

  // NEGATIVE and LEAVE color as "violations": green only at 0.
  if (type === "NEGATIVE" || type === "LEAVE") {
    return KpiBehavior.NEGATIVE;
  }

  if (type === "POSITIVE") {
    // Within positive, the name map distinguishes a hard requirement
    // (MANDATORY) from a voluntary bonus (ACHIEVEMENT). Default to ACHIEVEMENT.
    const mapped = FACTOR_BEHAVIOR_MAP[normalizedName];
    return mapped === KpiBehavior.MANDATORY ? KpiBehavior.MANDATORY : KpiBehavior.ACHIEVEMENT;
  }

  // â”€â”€ Type missing â†’ fall back to the static name map, then default â”€â”€
  if (FACTOR_BEHAVIOR_MAP[normalizedName]) {
    return FACTOR_BEHAVIOR_MAP[normalizedName];
  }
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

/**
 * Normalizes a score's SIGN to match the factor's current type for DISPLAY.
 *
 * WHY: when an admin converts a factor (e.g. NEGATIVE â†’ POSITIVE) historical
 * scores are intentionally NOT recalculated, so a positive factor can still
 * carry a stale negative value like -10. Showing "-10" under a positive factor
 * is wrong, so we re-sign by the live type:
 *   â€¢ POSITIVE      â†’ magnitude is always non-negative (never shows "-")
 *   â€¢ NEGATIVE/LEAVE â†’ magnitude is always shown as a penalty (negative)
 * This only affects presentation; ranking order (from the API) is untouched.
 */
export const normalizeScoreSign = (score: number, factorType?: string): number => {
  const mag = Math.abs(score);
  const type = factorType?.toUpperCase();
  // Negatives and leaves display as a penalty (negative); positives stay positive.
  if (type === "NEGATIVE" || type === "LEAVE") return -mag;
  return mag; // POSITIVE and unknown/overall default to non-negative
};
