/**
 * Access Control — shared organizational scope provider.
 *
 * Single source of truth for the Organization → Sub-Organization → Branch →
 * Department context across every Access Control screen. Mounted ONCE by the
 * AccessControlLayout; screens consume it via `useAccessScope()` and never own
 * this state themselves.
 *
 * Data comes from existing org APIs only (fetchOrganizationTree, fetchAllDepartments).
 * Nothing is fabricated — when a level has no data its selector is left empty and
 * the Global Scope Bar disables it. Selection is persisted to sessionStorage so a
 * refresh restores it within the session (documented reset-on-new-tab behaviour).
 */
import { createContext, useContext, useEffect, useMemo, useState, useCallback, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { fetchOrganizationTree, fetchAllDepartments } from '@services/company';
import type { IOrgNode } from '@models/company';
import type { RootState } from '@redux/store';
import type { AccessScopeContextValue, AccessScopeSelection, ScopeOption } from './types';

/** Locate an employee's org placement in the tree from their companyId (sub-org). */
const locateHome = (
  orgs: IOrgNode[],
  companyId: string,
  branchId: string | null,
): AccessScopeSelection | null => {
  for (const root of orgs) {
    if (root.id === companyId) return { organizationId: root.id, subOrganizationId: null, branchId, departmentId: null };
    const sub = root.children?.find((c) => c.id === companyId);
    if (sub) return { organizationId: root.id, subOrganizationId: sub.id, branchId, departmentId: null };
  }
  return null;
};

const STORAGE_KEY = 'accessControl.scopeSelection';
const EMPTY: AccessScopeSelection = { organizationId: null, subOrganizationId: null, branchId: null, departmentId: null };

/** Untyped department rows tolerated defensively — the endpoint is legacy/untyped. */
interface DeptRow { id: string; name: string; companyId?: string; branchId?: string }

const readStored = (): AccessScopeSelection => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
};

const AccessScopeContext = createContext<AccessScopeContextValue | null>(null);

export const AccessScopeProvider = ({ children }: { children: ReactNode }) => {
  const [orgTree, setOrgTree] = useState<IOrgNode[]>([]);
  const [departments, setDepartments] = useState<DeptRow[]>([]);
  const [selection, setSelection] = useState<AccessScopeSelection>(readStored);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // A non-group-wide actor (not Super Admin / Group Admin) is confined to their own
  // sub-org: the scope bar pins to it and locks the Org/Sub-org/Branch selectors.
  const isGroupWide = useSelector((s: RootState) => s.authz.isGroupWide);
  const homeCompanyId = useSelector((s: RootState) => s.authz.homeCompanyId);
  const homeBranchId = useSelector((s: RootState) => s.authz.homeBranchId);
  const locked = !isGroupWide;

  // Load the org hierarchy + departments once. Graceful: on failure, leave empty
  // (selectors disable) — never fabricate.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [treeRes, deptRes] = await Promise.all([
          fetchOrganizationTree(),
          fetchAllDepartments().catch(() => null),
        ]);
        if (!alive) return;
        const orgs: IOrgNode[] = treeRes?.data?.organizations ?? [];
        const deptList: DeptRow[] = deptRes?.data?.departments ?? deptRes?.data ?? deptRes ?? [];
        setOrgTree(Array.isArray(orgs) ? orgs : []);
        setDepartments(Array.isArray(deptList) ? deptList : []);
        // Sensible default: a single root organization is auto-selected (unless a
        // stored selection already exists).
        setSelection((prev) =>
          prev.organizationId ? prev : orgs.length === 1 ? { ...EMPTY, organizationId: orgs[0].id } : prev,
        );
      } catch {
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Persist selection across refreshes (same tab/session).
  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(selection)); } catch { /* ignore */ }
  }, [selection]);

  // Locked actor: pin the scope to their own sub-org/branch once the tree loads.
  // They cannot select a different sub-org (the selectors are disabled in the bar).
  useEffect(() => {
    if (!locked || !homeCompanyId || orgTree.length === 0) return;
    const home = locateHome(orgTree, homeCompanyId, homeBranchId);
    if (home) setSelection(home);
  }, [locked, homeCompanyId, homeBranchId, orgTree]);

  const findOrg = useCallback((id: string | null) => orgTree.find((o) => o.id === id) ?? null, [orgTree]);

  const selectedOrg = useMemo(() => findOrg(selection.organizationId), [findOrg, selection.organizationId]);
  const selectedSubOrg = useMemo(
    () => selectedOrg?.children?.find((c) => c.id === selection.subOrganizationId) ?? null,
    [selectedOrg, selection.subOrganizationId],
  );
  // Branches come from the selected sub-org, or the org itself when it has no sub-orgs.
  const branchHost = selectedSubOrg ?? selectedOrg;
  const selectedBranch = useMemo(
    () => branchHost?.branches?.find((b) => b.id === selection.branchId) ?? null,
    [branchHost, selection.branchId],
  );

  const options = useMemo(() => {
    const toOpt = (n: { id: string; name: string }): ScopeOption => ({ id: n.id, name: n.name });
    // Departments narrow to the active company (branch's company, else sub-org/org).
    const activeCompanyId = selectedBranch?.companyId ?? selection.subOrganizationId ?? selection.organizationId;
    const narrowed = departments.filter(
      (d) => (selection.branchId && d.branchId ? d.branchId === selection.branchId : true) &&
             (activeCompanyId && d.companyId ? d.companyId === activeCompanyId : true),
    );
    return {
      organizations: orgTree.map(toOpt),
      subOrganizations: (selectedOrg?.children ?? []).map(toOpt),
      branches: (branchHost?.branches ?? []).map(toOpt),
      departments: (narrowed.length ? narrowed : departments).map(toOpt),
    };
  }, [orgTree, selectedOrg, branchHost, selectedBranch, departments, selection]);

  const labels = useMemo(() => ({
    organization: selectedOrg?.name ?? null,
    subOrganization: selectedSubOrg?.name ?? null,
    branch: selectedBranch?.name ?? null,
    department: options.departments.find((d) => d.id === selection.departmentId)?.name ?? null,
  }), [selectedOrg, selectedSubOrg, selectedBranch, options.departments, selection.departmentId]);

  // Actions — each cascades: changing a level clears every narrower level.
  const setOrganization = useCallback((id: string | null) => setSelection({ ...EMPTY, organizationId: id }), []);
  const setSubOrganization = useCallback((id: string | null) =>
    setSelection((p) => ({ ...p, subOrganizationId: id, branchId: null, departmentId: null })), []);
  const setBranch = useCallback((id: string | null) =>
    setSelection((p) => ({ ...p, branchId: id, departmentId: null })), []);
  const setDepartment = useCallback((id: string | null) =>
    setSelection((p) => ({ ...p, departmentId: id })), []);
  const reset = useCallback(() => setSelection(EMPTY), []);

  const value: AccessScopeContextValue = {
    selection, options, labels, loading, error, locked,
    setOrganization, setSubOrganization, setBranch, setDepartment, reset,
  };

  return <AccessScopeContext.Provider value={value}>{children}</AccessScopeContext.Provider>;
};

/** Read the shared Access Control organizational scope. Must be used within the provider. */
export const useAccessScope = (): AccessScopeContextValue => {
  const ctx = useContext(AccessScopeContext);
  if (!ctx) throw new Error('useAccessScope must be used within an AccessScopeProvider');
  return ctx;
};
