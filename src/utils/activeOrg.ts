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

  const roots = companyOverview.filter((o) => o && !o.parentOrganizationId);
  if (roots.length === 0) return companyOverview[0];
  if (roots.length === 1) return roots[0];

  // Multiple top-level orgs exist (e.g. a stray/test org accidentally created at the
  // top level). `getCompanyOverview` returns orgs in NO guaranteed order, so picking the
  // "first root" is non-deterministic and can land on the empty stray — which then scopes
  // every holiday/weekend/active-org fetch to an org with no data. Deterministically pick
  // the root that actually anchors the organization tree (the most descendants), so the
  // real company always wins and a stray empty root never does.
  const countDescendants = (rootId: string): number => {
    let count = 0;
    const stack = [rootId];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop() as string;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const child of companyOverview.filter((o) => o && o.parentOrganizationId === cur)) {
        count += 1;
        stack.push(child.id);
      }
    }
    return count;
  };

  return roots
    .slice()
    .sort((a, b) => {
      const diff = countDescendants(b.id) - countDescendants(a.id);
      if (diff !== 0) return diff;
      // Tie-break: oldest org first (stable, matches historical single-org behaviour).
      return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime();
    })[0];
};

export const resolveActiveOrgId = (companyOverview?: any[]): string | undefined =>
  resolveActiveOrg(companyOverview)?.id;
