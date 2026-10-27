/** One project type a plan bills: a whole category (`subCategoryId` null) or one subcategory. */
export interface PlanScopeLike {
  categoryId: string;
  subCategoryId?: string | null;
}

/** The scope-bearing half of a payment plan — all the filter below needs to know about one. */
export interface ScopedPlan {
  scopes?: PlanScopeLike[];
}

/**
 * The payment plans on offer for a lead, given the project types that lead is.
 *
 * A plan bills one or SEVERAL project types — a bungalow and a hospital are not billed in the
 * same phases, a bungalow and a villa may be — and the lead names its categories a few steps
 * earlier in the wizard. Filtered on the client rather than by the API because a lead holds
 * MANY categories (`categoryIds` / `subcategoryIds` are multi-selects over the LeadCategory /
 * LeadSubCategory joins), so "plans for this lead" is not a single-category query.
 *
 * Two cases deliberately WIDEN the list instead of emptying it, because an empty payment-plan
 * dropdown reads as a broken screen:
 *
 *   - **No categories chosen yet** → every plan. The honest answer at that point is "not yet",
 *     not "none exist".
 *   - **An un-typed plan** (no scopes — every plan written before plans carried a type)
 *     → always on offer. Excluding them would drop the existing configuration off every lead
 *     the moment this shipped.
 *
 * Beyond that a plan applies when ANY of its types matches, exact in one direction only: a type
 * that is a SUBcategory needs that subcategory selected, while a category-wide type applies to
 * every subcategory beneath it. A sibling subcategory's plan never leaks across.
 */
export const filterPlansForLead = <T extends ScopedPlan>(
  plans: T[],
  categoryIds: string[] = [],
  subcategoryIds: string[] = [],
): T[] => {
  if (!categoryIds.length && !subcategoryIds.length) return plans;

  return plans.filter((plan) => {
    if (!plan.scopes?.length) return true;
    return plan.scopes.some((scope) =>
      scope.subCategoryId
        ? subcategoryIds.includes(scope.subCategoryId)
        : categoryIds.includes(scope.categoryId));
  });
};
