import { useEffect, useState, useCallback } from "react";
import { getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { getProjectsByCompanyId } from "@services/projects";

/**
 * Resolved name maps for reimbursement table display.
 *
 * Usage:
 *   const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups();
 *
 * Each resolver returns the human-readable name for a given UUID, or "—" if not
 * found (e.g. the record predates the entity or the ID is null/undefined).
 *
 * The hook fetches:
 *   • Company types   — via getAllCompanyTypes()
 *   • Client companies — via getAllClientCompanies()
 *   • Projects        — lazily, per unique clientCompanyId found in `rows`
 *
 * Pass `rows` (the current table data) so the hook can batch-prefetch all
 * projects that appear in the visible data in a single pass.
 */


/**
 * Module-level caches, shared by every instance of this hook.
 *
 * The hook is instantiated three times across the reimbursement screens, and each copy fetched
 * company types, client companies and per-company projects independently on mount — the same
 * responses, three times, on every page load. Nothing here changes during a session.
 *
 * The in-flight promises are cached too, not just the results: without that, three components
 * mounting in the same tick all miss the empty cache and fire the request anyway.
 */
let baseCache: { types: Record<string, string>; companies: Record<string, string> } | null = null;
let baseInFlight: Promise<{ types: Record<string, string>; companies: Record<string, string> }> | null = null;

/** Projects keyed by the company they belong to; each company is fetched at most once. */
const projectCache: Record<string, string> = {};
const projectInFlight = new Map<string, Promise<void>>();

const loadBaseLookups = () => {
    if (baseCache) return Promise.resolve(baseCache);
    if (baseInFlight) return baseInFlight;

    baseInFlight = (async () => {
        const [typesRes, companiesRes] = await Promise.all([
            getAllCompanyTypes(),
            getAllClientCompanies(),
        ]);

        const types: Record<string, string> = {};
        for (const ct of (typesRes?.companyTypes ?? []) as any[]) {
            if (ct?.id) types[ct.id] = ct.name ?? ct.id;
        }

        const rawCompanies: any[] =
            companiesRes?.data?.companies ||
            companiesRes?.clientCompanies ||
            companiesRes?.data?.clientCompanies ||
            companiesRes?.companies ||
            [];
        const companies: Record<string, string> = {};
        for (const c of rawCompanies) {
            if (c?.id) companies[c.id] = c.companyName ?? c.id;
        }

        baseCache = { types, companies };
        return baseCache;
    })().catch((err) => {
        // Clear the in-flight promise so a later mount can retry rather than inheriting a
        // permanently rejected one.
        baseInFlight = null;
        throw err;
    });

    return baseInFlight;
};

const loadProjectsForCompany = (companyId: string): Promise<void> => {
    const existing = projectInFlight.get(companyId);
    if (existing) return existing;

    const p = getProjectsByCompanyId(companyId)
        .then((res: any) => {
            for (const proj of (res?.projects || res?.data?.projects || []) as any[]) {
                if (proj?.id) projectCache[proj.id] = proj.title ?? proj.id;
            }
        })
        .catch(() => { projectInFlight.delete(companyId); });

    projectInFlight.set(companyId, p);
    return p;
};

interface LookupMaps {
  resolveClientType: (id: string | null | undefined) => string;
  resolveClientCompany: (id: string | null | undefined) => string;
  resolveProject: (id: string | null | undefined) => string;
  /** true while any fetch is still in-flight */
  loading: boolean;
}

export function useReimbursementLookups(rows: any[] = []): LookupMaps {
  const [companyTypeMap, setCompanyTypeMap] = useState<Record<string, string>>({});
  const [clientCompanyMap, setClientCompanyMap] = useState<Record<string, string>>({});
  const [projectMap, setProjectMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // ── Load company types + client companies once on mount ───────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { types, companies } = await loadBaseLookups();
        if (cancelled) return;
        setCompanyTypeMap(types);
        setClientCompanyMap(companies);
      } catch (err) {
        console.error("[useReimbursementLookups] Failed to load base lookup data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Lazily fetch projects for every unique clientCompanyId in current rows ─
  useEffect(() => {
    if (!rows || rows.length === 0) return;

    // Collect unique, non-null clientCompanyIds that we don't have projects for yet
    const uniqueCompanyIds = [
      ...new Set(
        rows
          .map((r: any) => r?.clientCompanyId)
          .filter((id: any) => id && typeof id === "string")
      ),
    ] as string[];

    if (uniqueCompanyIds.length === 0) return;

    let cancelled = false;

    const fetchProjects = async () => {
      await Promise.allSettled(uniqueCompanyIds.map(loadProjectsForCompany));
      if (cancelled) return;
      // The cache is shared, so publish the whole thing rather than a delta — another instance
      // may have filled entries this one never asked for.
      setProjectMap({ ...projectCache });
    };

    fetchProjects();
    return () => { cancelled = true; };
  // Re-run whenever the set of rows changes (new data loaded, filter toggled, etc.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r: any) => r?.clientCompanyId).join(",")]);

  // ── Resolvers ─────────────────────────────────────────────────────────────

  const resolveClientType = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "N/A";
      return companyTypeMap[id] ?? "N/A";
    },
    [companyTypeMap]
  );

  const resolveClientCompany = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "N/A";
      return clientCompanyMap[id] ?? "N/A";
    },
    [clientCompanyMap]
  );

  const resolveProject = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "N/A";
      return projectMap[id] ?? "N/A";
    },
    [projectMap]
  );

  return { resolveClientType, resolveClientCompany, resolveProject, loading };
}
