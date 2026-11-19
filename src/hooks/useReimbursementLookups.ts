import { useCallback, useEffect, useMemo, useState } from "react";
import { getAllCompanyTypes } from "@services/companies";
import { getReimbursementProjectOptions } from "@services/projects";

/**
 * Resolved names for reimbursement table display.
 *
 * Usage:
 *   const { resolveClientType, resolveClientCompany, resolveProject } = useReimbursementLookups(rows);
 *
 * Each resolver returns the human-readable name for an id, or "N/A".
 *
 * WHERE THE NAMES COME FROM, cheapest first:
 *   1. The rows themselves. Drafts and submitted lines arrive with `clientCompany: { companyName }` and
 *      `lead: { title }` attached by the server — no request at all.
 *   2. Company types — `getAllCompanyTypes()` (small, non-sensitive, cached and shared by the service), only
 *      when some row carries a type id.
 *   3. Anything the server did not name — the slim, family-scoped reimbursement options
 *      (`getReimbursementProjectOptions()`: projects + their File Location companies, cached and shared).
 *
 * This hook used to download the ENTIRE client-company master on mount (every column — contacts, address,
 * GST, PAN; 1.6 MB, ~5 s) plus one project list per company in the rows, to print a few names. It also ran
 * inside closed dialogs, so every page load paid for it. With no rows it now fetches nothing.
 */

interface LookupMaps {
  resolveClientType: (id: string | null | undefined) => string;
  resolveClientCompany: (id: string | null | undefined) => string;
  resolveProject: (id: string | null | undefined) => string;
  /** true while any fetch is still in-flight */
  loading: boolean;
}

const NA = "N/A";

const projectIdOf = (r: any): string | null => r?.leadId || r?.projectId || null;

export function useReimbursementLookups(rows: any[] = []): LookupMaps {
  // ── 1. Names the rows already carry ───────────────────────────────────────
  const embedded = useMemo(() => {
    const companies: Record<string, string> = {};
    const projects: Record<string, string> = {};
    for (const r of rows || []) {
      if (r?.clientCompanyId && r?.clientCompany?.companyName) companies[r.clientCompanyId] = r.clientCompany.companyName;
      const pid = projectIdOf(r);
      if (pid && r?.lead?.title) projects[pid] = r.lead.title;
    }
    return { companies, projects };
  }, [rows]);

  // What still needs a request — computed as stable strings so the effects below re-run only when the
  // SET of missing ids changes, not on every new rows array.
  const needsTypes = useMemo(() => (rows || []).some((r: any) => !!r?.clientTypeId), [rows]);
  const missingKey = useMemo(() => {
    const missing = new Set<string>();
    for (const r of rows || []) {
      if (r?.clientCompanyId && !embedded.companies[r.clientCompanyId]) missing.add(`c:${r.clientCompanyId}`);
      const pid = projectIdOf(r);
      if (pid && !embedded.projects[pid]) missing.add(`p:${pid}`);
    }
    return [...missing].sort().join(",");
  }, [rows, embedded]);

  const [companyTypeMap, setCompanyTypeMap] = useState<Record<string, string>>({});
  const [fallback, setFallback] = useState<{ companies: Record<string, string>; projects: Record<string, string> }>({
    companies: {},
    projects: {},
  });
  const [typesLoading, setTypesLoading] = useState(false);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // ── 2. Company types, only when a row has one ─────────────────────────────
  useEffect(() => {
    if (!needsTypes) return;
    let cancelled = false;
    setTypesLoading(true);
    getAllCompanyTypes()
      .then((res) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const ct of (res?.companyTypes ?? []) as any[]) if (ct?.id) map[ct.id] = ct.name ?? ct.id;
        setCompanyTypeMap(map);
      })
      .catch((err) => console.error("[useReimbursementLookups] company types failed to load", err))
      .finally(() => { if (!cancelled) setTypesLoading(false); });
    return () => { cancelled = true; };
  }, [needsTypes]);

  // ── 3. Anything the server did not name ───────────────────────────────────
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    setFallbackLoading(true);
    getReimbursementProjectOptions()
      .then((res) => {
        if (cancelled) return;
        const companies: Record<string, string> = {};
        for (const c of res?.data?.companies ?? []) if (c?.id) companies[c.id] = c.companyName;
        const projects: Record<string, string> = {};
        for (const p of res?.data?.projects ?? []) if (p?.id) projects[p.id] = p.title ?? p.id;
        setFallback({ companies, projects });
      })
      .catch((err) => console.error("[useReimbursementLookups] project options failed to load", err))
      .finally(() => { if (!cancelled) setFallbackLoading(false); });
    return () => { cancelled = true; };
  }, [missingKey]);

  // ── Resolvers ─────────────────────────────────────────────────────────────
  const resolveClientType = useCallback(
    (id: string | null | undefined): string => (id ? companyTypeMap[id] ?? NA : NA),
    [companyTypeMap],
  );

  const resolveClientCompany = useCallback(
    (id: string | null | undefined): string => (id ? embedded.companies[id] ?? fallback.companies[id] ?? NA : NA),
    [embedded, fallback],
  );

  const resolveProject = useCallback(
    (id: string | null | undefined): string => (id ? embedded.projects[id] ?? fallback.projects[id] ?? NA : NA),
    [embedded, fallback],
  );

  return { resolveClientType, resolveClientCompany, resolveProject, loading: typesLoading || fallbackLoading };
}
