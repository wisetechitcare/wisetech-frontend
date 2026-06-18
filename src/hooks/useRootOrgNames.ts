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
