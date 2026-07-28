/**
 * Access Control → Assignments — shared types (Phase 6.2).
 * Mirrors the backend /api/role-assignments contract. Business / display
 * language only. Status is derived on the server from the stored status and the
 * effective-from / effective-until window.
 */

/** Derived lifecycle status the UI renders as a badge. */
export type AssignmentStatus = 'scheduled' | 'active' | 'expired' | 'revoked';

/** How far a role assignment reaches. */
export type AssignmentScope = 'platform' | 'tenant' | 'unit_subtree' | 'unit';

/** Opaque JSON bag the backend round-trips verbatim. */
export type JsonRecord = Record<string, unknown>;

export interface AssignmentRoleRef {
  id: string;
  name: string;
  code: string | null;
  level: number;
}

export interface AssignmentUnitRef {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface AssignmentTenantRef {
  id: string;
  name: string;
  status: string;
}

export interface AssignmentPersonRef {
  id: string;
  name: string;
  email: string | null;
}

export interface Assignment {
  id: string;
  userId: string;
  roleId: string;
  tenantId: string;
  organizationalUnitId: string | null;
  scope: AssignmentScope;
  status: AssignmentStatus;
  storedStatus: string;
  assignedBy: string | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  metadata: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
  role: AssignmentRoleRef;
  unit: AssignmentUnitRef | null;
  tenant: AssignmentTenantRef | null;
  person: AssignmentPersonRef | null;
}

export interface AssignmentListResponse {
  data: Assignment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssignmentListParams {
  tenantId?: string;
  userId?: string;
  roleId?: string;
  unitId?: string;
  status?: AssignmentStatus | 'all';
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateAssignmentPayload {
  userId: string;
  roleId: string;
  tenantId: string;
  organizationalUnitId?: string | null;
  scope?: AssignmentScope;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  metadata?: JsonRecord;
}

export interface UpdateAssignmentPayload {
  roleId?: string;
  organizationalUnitId?: string | null;
  scope?: AssignmentScope;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
}

/** Soft-remove / restore / expire all return this compact shape. */
export interface AssignmentStateResult {
  id: string;
  status: AssignmentStatus;
}

// ── Effective access ──────────────────────────────────────────────────────────

export interface EffectiveAssignment {
  id: string;
  role: string;
  roleCode: string | null;
  scope: AssignmentScope;
  unit: string | null;
  tenant: string | null;
  status: AssignmentStatus;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
}

export interface GrantSource {
  assignmentId: string;
  role: string;
  scope: AssignmentScope;
  unit: string | null;
  reachLabel: string;
  reason: string;
}

export interface CanArea {
  module: string;
  label: string;
  grantedBy: GrantSource[];
  reasonGranted: string;
}

export interface CannotArea {
  module: string;
  label: string;
  reasonDenied: string;
}

export interface EffectiveSummary {
  activeAssignments: number;
  totalAssignments: number;
  areasGranted: number;
  areasDenied: number;
}

export interface EffectiveAccessResponse {
  person: AssignmentPersonRef;
  assignments: EffectiveAssignment[];
  can: CanArea[];
  cannot: CannotArea[];
  summary: EffectiveSummary;
}

// ── History ───────────────────────────────────────────────────────────────────

export type HistoryAction =
  | 'ASSIGNMENT_ADDED'
  | 'ASSIGNMENT_REMOVED'
  | 'ASSIGNMENT_UPDATED'
  | 'ASSIGNMENT_RESTORED'
  | 'ASSIGNMENT_EXPIRED'
  | 'ASSIGNMENT_ACTIVATED'
  | 'ASSIGNMENT_SCOPE_CHANGED'
  | 'ASSIGNMENT_ROLE_CHANGED';

export interface HistoryActor {
  name: string;
  avatar: string | null;
}

export interface HistoryEntry {
  id: string;
  action: HistoryAction | string;
  at: string;
  actor: HistoryActor | null;
  oldValue: JsonRecord | null;
  newValue: JsonRecord | null;
  metadata: JsonRecord | null;
}

export interface AssignmentHistoryResponse {
  history: HistoryEntry[];
}

// ── Picker option shapes (reused data sources) ────────────────────────────────

export interface PersonOption {
  id: string;
  name: string;
  caption: string | null;
  isActive: boolean;
  /** The employee's assigned RBAC role name (one role per employee), if any. */
  role: string | null;
  /** Org placement — used by the Access Control scope bar to filter the list. */
  companyId: string | null;
  branchId: string | null;
  departmentId: string | null;
}

export interface RoleOption {
  id: string;
  name: string;
  code: string | null;
  level?: number;
}

export interface TenantOption {
  id: string;
  name: string;
  status: string;
}

export interface UnitOption {
  id: string;
  name: string;
  type: string;
  status: string;
  depth: number;
}
