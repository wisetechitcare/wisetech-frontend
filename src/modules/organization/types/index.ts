/**
 * Organization Management — shared types (Phase 6.1).
 * Mirrors the backend /api/tenants and /api/organization-units contract.
 * Business / display language only.
 */

export type TenantStatus = 'active' | 'archived';
export type UnitStatus = 'active' | 'archived';

/** Free-form on the backend; the UI maps known values to icons and falls back gracefully. */
export type UnitType = string;

/** Opaque JSON bags the backend round-trips verbatim. */
export type JsonRecord = Record<string, unknown>;

// ── Tenants ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  settings: JsonRecord | null;
  subscription: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantStatistics {
  activeUnits: number;
  activeAssignments: number;
}

export interface TenantDetails extends Tenant {
  statistics: TenantStatistics;
}

export interface TenantListResponse {
  data: Tenant[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TenantListParams {
  q?: string;
  status?: TenantStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface CreateTenantPayload {
  name: string;
  slug?: string;
  settings?: JsonRecord;
  subscription?: JsonRecord;
}

export interface UpdateTenantPayload {
  name?: string;
  slug?: string;
  settings?: JsonRecord;
  subscription?: JsonRecord;
}

// ── Organizational units ────────────────────────────────────────────────────────

/** One node of the organization tree — the whole tree arrives in a single fetch. */
export interface TreeNode {
  id: string;
  tenantId: string;
  parentId: string | null;
  type: UnitType;
  name: string;
  code: string | null;
  status: UnitStatus;
  path: string;
  depth: number;
  children: TreeNode[];
  childCount: number;
}

export interface UnitTreeResponse {
  tree: TreeNode[];
}

export interface Unit {
  id: string;
  tenantId: string;
  parentId: string | null;
  type: UnitType;
  name: string;
  code: string | null;
  status: UnitStatus;
  metadata?: JsonRecord | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnitListResponse {
  data: Unit[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UnitListParams {
  tenantId: string;
  q?: string;
  type?: UnitType;
  status?: UnitStatus | 'all';
  parentId?: string;
  page?: number;
  pageSize?: number;
}

/** Compact reference used inside breadcrumbs, ancestors and child lists. */
export interface UnitRef {
  id: string;
  name: string;
  type: UnitType;
}

export interface UnitChildRef extends UnitRef {
  status: UnitStatus;
}

export interface UnitGeneral {
  id: string;
  tenantId: string;
  type: UnitType;
  name: string;
  code: string | null;
  status: UnitStatus;
  metadata: JsonRecord | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnitHierarchy {
  parentId: string | null;
  depth: number;
  breadcrumbs: UnitRef[];
  ancestors: UnitRef[];
}

export interface UnitStatistics {
  directChildren: number;
  totalDescendants: number;
  activeAssignments: number;
  employees: number;
}

export interface UnitDetails {
  general: UnitGeneral;
  hierarchy: UnitHierarchy;
  statistics: UnitStatistics;
  children: UnitChildRef[];
}

export interface BreadcrumbsResponse {
  breadcrumbs: UnitRef[];
}

export interface CreateUnitPayload {
  tenantId: string;
  parentId?: string | null;
  type: UnitType;
  name: string;
  code?: string;
  metadata?: JsonRecord;
}

export interface UpdateUnitPayload {
  name?: string;
  code?: string;
  metadata?: JsonRecord;
}

export interface MoveUnitPayload {
  parentId: string | null;
}

/** DELETE api/organization-units/:id?cascade= */
export interface ArchiveUnitResult {
  archived: number;
}

/** POST api/organization-units/:id/restore?cascade= */
export interface RestoreUnitResult {
  restored: number;
}
