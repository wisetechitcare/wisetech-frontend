import { useEffect, useState } from "react";
import { fetchCompanyOverview } from "@services/company";

/**
 * Returns the set of TOP-LEVEL organization names (those with no parent —
 * `parentOrganizationId === null`).
 *
 * Sub-organization filter dropdowns derive their options from each employee's
 * `companyOverview.name`. Employees attached directly to the root org carry the
 * root org's name there, which wrongly surfaces the parent org (e.g. "WISETECH
 * GROUP") as a selectable "sub organization". Callers exclude these names so the
 * dropdown lists only actual sub-orgs. Falls back to an empty set on error, which
 * leaves the dropdown unchanged (showing all) rather than breaking it.
 */
export function useRootOrgNames(): Set<string> {
    const [rootNames, setRootNames] = useState<Set<string>>(new Set());

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetchCompanyOverview();
                const rows = res?.data?.companyOverview ?? res?.companyOverview ?? res?.data ?? res ?? [];
                const names = new Set<string>(
                    (Array.isArray(rows) ? rows : [])
                        .filter((o: any) => !o?.parentOrganizationId)
                        .map((o: any) => o?.name)
                        .filter((n: any): n is string => typeof n === "string" && n.length > 0),
                );
                if (active) setRootNames(names);
            } catch {
                /* non-fatal — leave dropdown showing all sub-org names */
            }
        })();
        return () => { active = false; };
    }, []);

    return rootNames;
}

/**
 * The root organization's name — the group the whole app belongs to (e.g.
 * "WISETECH GROUP") — or `''` while it loads, if the fetch fails, or if no root
 * org exists. Drives the sidebar's dynamic "<Org> Team" label.
 *
 * `GET /api/company/overview` is `protect`-only (no capability gate), so every
 * authenticated employee resolves this. The org TREE endpoint would 403 for
 * non-admins, which is why the label reads the flat overview instead.
 */
export function useRootOrgName(): string {
    const rootNames = useRootOrgNames();
    // Insertion order == row order from the API, so this is the first root org,
    // matching a plain `.find(o => !o.parentOrganizationId)`.
    return rootNames.values().next().value ?? '';
}
