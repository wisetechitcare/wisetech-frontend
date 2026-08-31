/** The scope-bearing half of a payment plan — all the filter below needs to know about one. */
export interface ScopedPlan {
  categoryId?: string | null;
  subCategoryId?: string | null;
}

/**
 * The payment plans on offer for a lead, given the project types that lead is.
 *
 * A plan belongs to a project category — a bungalow and a hospital are not billed in the same
 * phases — and the lead names its categories a few steps earlier in the wizard. Filtered on the
 * client rather than by the API because a lead holds MANY categories (`categoryIds` /
 * `subcategoryIds` are multi-selects over the LeadCategory / LeadSubCategory joins), so "plans
 * for this lead" is not a single-category query.
 *
 * Two cases deliberately WIDEN the list instead of emptying it, because an empty payment-plan
 * dropdown reads as a broken screen:
 *
 *   - **No categories chosen yet** → every plan. The honest answer at that point is "not yet",
 *     not "none exist".
 *   - **An un-typed plan** (no `categoryId` — every plan written before plans carried a type)
 *     → always on offer. Excluding them would drop the existing configuration off every lead
 *     the moment this shipped.
 *
 * Beyond that the match is exact in one direction only: a plan scoped to a SUBcategory needs
 * that subcategory selected, while a category-wide plan applies to every subcategory beneath
 * it. A sibling subcategory's plan never leaks across.
 */
export const filterPlansForLead = <T extends ScopedPlan>(
  plans: T[],
  categoryIds: string[] = [],
  subcategoryIds: string[] = [],
): T[] => {
  if (!categoryIds.length && !subcategoryIds.length) return plans;

  return plans.filter((plan) => {
    if (!plan.categoryId) return true;
    return plan.subCategoryId
      ? subcategoryIds.includes(plan.subCategoryId)
      : categoryIds.includes(plan.categoryId);
  });
};
