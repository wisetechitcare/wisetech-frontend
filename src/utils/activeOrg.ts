// Resolve the "active" organization from the companyOverview list.
//
// The app historically assumed a single company and read `companyOverview[0]`.
// Under the multi-org model `getCompanyOverview` returns ALL orgs in no guaranteed
// order, so `[0]` is non-deterministic (and crashes when the array is empty). These
// helpers deterministically pick the ROOT organization (the top-level company) —
// matching the old single-org behaviour and the backend logo resolution — and never
// throw on empty input.

export const resolveActiveOrg = (companyOverview?: any[]): any | undefined => {
  if (!Array.isArray(companyOverview) || companyOverview.length === 0) return undefined;
  // Prefer the root org (no parent); fall back to the first entry.
  return companyOverview.find((o) => o && !o.parentOrganizationId) ?? companyOverview[0];
};

export const resolveActiveOrgId = (companyOverview?: any[]): string | undefined =>
  resolveActiveOrg(companyOverview)?.id;
