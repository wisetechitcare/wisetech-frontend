/**
 * Access Control — shared organizational scope (Global Scope Bar) types.
 *
 * This is the BUSINESS ORGANIZATION context (Organization → Sub-Organization →
 * Branch → Department). It is NOT the permission-reach selector (self/team/…),
 * which lives inside the Permission Matrix and is untouched by this module.
 */

/** A selectable node at any level of the org hierarchy. */
export interface ScopeOption {
  id: string;
  name: string;
}

/** The four cascading selections (null = "all / not narrowed" at that level). */
export interface AccessScopeSelection {
  organizationId: string | null;
  subOrganizationId: string | null;
  branchId: string | null;
  departmentId: string | null;
}

/** Human-readable label for each selected level (null when not selected). */
export interface AccessScopeLabels {
  organization: string | null;
  subOrganization: string | null;
  branch: string | null;
  department: string | null;
}

/** The value exposed by AccessScopeContext — consumers read this, never manage it. */
export interface AccessScopeContextValue {
  selection: AccessScopeSelection;
  options: {
    organizations: ScopeOption[];
    subOrganizations: ScopeOption[];
    branches: ScopeOption[];
    departments: ScopeOption[];
  };
  labels: AccessScopeLabels;
  /** True while the org hierarchy is loading. */
  loading: boolean;
  /** True when the hierarchy could not be loaded (selectors fall back to disabled). */
  error: boolean;
  /**
   * True when the actor cannot see across sub-orgs (not Super Admin / Group Admin):
   * the scope is pinned to their own sub-org/branch and the Org/Sub-org/Branch
   * selectors are locked (view-only). They may still narrow by Department within it.
   */
  locked: boolean;
  // Selection actions — each cascades (resets the narrower levels).
  setOrganization: (id: string | null) => void;
  setSubOrganization: (id: string | null) => void;
  setBranch: (id: string | null) => void;
  setDepartment: (id: string | null) => void;
  reset: () => void;
}
