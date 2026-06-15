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
        const [typesRes, companiesRes] = await Promise.all([
          getAllCompanyTypes(),
          getAllClientCompanies(),
        ]);

        if (cancelled) return;

        // Build company-type map  { id → name }
        const types: any[] = typesRes?.companyTypes || [];
        const typeMap: Record<string, string> = {};
        types.forEach((ct: any) => {
          if (ct?.id) typeMap[ct.id] = ct.name ?? ct.id;
        });
        setCompanyTypeMap(typeMap);

        // Build client-company map  { id → companyName }
        const companies: any[] =
          companiesRes?.data?.companies ||
          companiesRes?.clientCompanies ||
          companiesRes?.data?.clientCompanies ||
          companiesRes?.companies ||
          [];
        const companyMap: Record<string, string> = {};
        companies.forEach((c: any) => {
          if (c?.id) companyMap[c.id] = c.companyName ?? c.id;
        });
        setClientCompanyMap(companyMap);
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
      const results = await Promise.allSettled(
        uniqueCompanyIds.map((companyId) =>
          getProjectsByCompanyId(companyId).then((res) => ({
            companyId,
            projects: res?.projects || res?.data?.projects || [],
          }))
        )
      );

      if (cancelled) return;

      const newEntries: Record<string, string> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          result.value.projects.forEach((p: any) => {
            if (p?.id) newEntries[p.id] = p.title ?? p.id;
          });
        }
      });

      if (Object.keys(newEntries).length > 0) {
        setProjectMap((prev) => ({ ...prev, ...newEntries }));
      }
    };

    fetchProjects();
    return () => { cancelled = true; };
  // Re-run whenever the set of rows changes (new data loaded, filter toggled, etc.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.map((r: any) => r?.clientCompanyId).join(",")]);

  // ── Resolvers ─────────────────────────────────────────────────────────────

  const resolveClientType = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "NA";
      return companyTypeMap[id] ?? "NA";
    },
    [companyTypeMap]
  );

  const resolveClientCompany = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "NA";
      return clientCompanyMap[id] ?? "NA";
    },
    [clientCompanyMap]
  );

  const resolveProject = useCallback(
    (id: string | null | undefined): string => {
      if (!id) return "NA";
      return projectMap[id] ?? "NA";
    },
    [projectMap]
  );

  return { resolveClientType, resolveClientCompany, resolveProject, loading };
}
