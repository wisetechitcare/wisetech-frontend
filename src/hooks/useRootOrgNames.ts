import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { fetchCompanyOverview } from "@services/company";
import { resolveHomeRootOrg } from "@utils/activeOrg";
import { RootState } from "@redux/store";

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

export type HomeRootOrg = {
    /** Root org id, or null while loading / on failure. */
    id: string | null;
    /** Display name for "<Org> Team", or '' until resolved. */
    name: string;
    /** Uploaded logo URL when present. */
    logo: string | null;
};

const EMPTY_HOME: HomeRootOrg = { id: null, name: '', logo: null };

/**
 * The logged-in user's tenant root (name + logo) — never an arbitrary platform
 * root from Super Admin's full overview. Drives the sidebar "<Org> Team" row.
 *
 * `GET /api/company/overview` is `protect`-only (no capability gate), so every
 * authenticated employee resolves this. The org TREE endpoint would 403 for
 * non-admins, which is why the label reads the flat overview instead.
 */
export function useHomeRootOrg(): HomeRootOrg {
    const homeCompanyId = useSelector(
        (state: RootState) => (state as any)?.employee?.currentEmployee?.companyId as string | undefined,
    );
    const [home, setHome] = useState<HomeRootOrg>(EMPTY_HOME);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetchCompanyOverview();
                const rows = res?.data?.companyOverview ?? res?.companyOverview ?? res?.data ?? res ?? [];
                const root = resolveHomeRootOrg(Array.isArray(rows) ? rows : [], homeCompanyId);
                if (!active) return;
                const name = typeof root?.name === 'string' ? root.name.trim() : '';
                const logoRaw = typeof root?.logo === 'string' ? root.logo.trim() : '';
                setHome({
                    id: typeof root?.id === 'string' ? root.id : null,
                    name,
                    logo: logoRaw || null,
                });
            } catch {
                if (active) setHome(EMPTY_HOME);
            }
        })();
        return () => { active = false; };
    }, [homeCompanyId]);

    return home;
}

/**
 * The root organization's name for the logged-in user (e.g. "WISETECH GROUP"),
 * or `''` while it loads / on failure. Prefer {@link useHomeRootOrg} when the
 * logo is also needed.
 */
export function useRootOrgName(): string {
    return useHomeRootOrg().name;
}
