/**
 * Access Control — shared types (Phase 5.1 read-only foundation).
 * Mirrors the backend /api/access contract. Business language only: no
 * permission keys ever cross this boundary.
 */

export type RoleStatus = 'published' | 'archived';
export type RoleType = 'system' | 'custom';
export type SortField = 'name' | 'users' | 'updated';
export type SortOrder = 'asc' | 'desc';

export interface CatalogModule {
  key: string;
  label: string;
  icon: string;
  category: string;
}

export interface CatalogCapability {
  action: string;
  label: string;
  description: string;
}

export interface CatalogScope {
  key: string;
  label: string;
  caption: string;
}

export interface AccessCatalog {
  permissionVersion: string;
  modules: CatalogModule[];
  categories: string[];
  capabilities: CatalogCapability[];
  scopes: CatalogScope[];
}

export interface RoleListItem {
  id: string;
  name: string;
  code: string | null;
  description: string;
  status: RoleStatus;
  type: RoleType;
  isSystem: boolean;
  level: number;
  levelLabel: string;
  userCount: number;
  topCategories: string[];
  hasDraft: boolean;
  updatedAt: string;
  canManage: boolean;
}

export interface RoleListResponse {
  data: RoleListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RoleStatistics {
  assignedUsers: number;
  grantedAreas: number;
  topCategories: string[];
}

export interface RoleDetails {
  id: string;
  name: string;
  code: string | null;
  description: string;
  status: RoleStatus;
  type: RoleType;
  isSystem: boolean;
  level: number;
  levelLabel: string;
  createdAt: string;
  updatedAt: string;
  statistics: RoleStatistics;
  canManage: boolean;
}

/** An employee directly holding a role (the "Assigned users" list). */
export interface RoleMember {
  id: string;
  name: string;
  email: string | null;
  designation: string | null;
  avatar: string | null;
  isActive: boolean;
}

export interface RoleSummaryCapability {
  module: string;
  label: string;
  reach: string;
  reachLabel: string;
  capability?: string;
}

export interface RoleSummary {
  fullAccess: boolean;
  can: RoleSummaryCapability[];
  cannot: Array<{ module: string; label: string }>;
  sentences: string[];
}

export interface RoleListParams {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: RoleStatus | 'all';
  type?: RoleType | 'all';
  level?: number;
  category?: string;
  sort?: SortField;
  order?: SortOrder;
}

// ── Permission Editor (Phase 5.2, Simple Mode) ───────────────────────────────
// Business language only — the UI never sees or composes a permission key.

export type BusinessCapability = 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export';
export type Reach = 'none' | 'own' | 'team' | 'department' | 'company' | 'global';
export type SimpleLevel = 'none' | 'view' | 'manage' | 'custom';

export interface EditorCapability {
  action: BusinessCapability;
  reach: Reach;
  label: string;
}

export interface EditorModule {
  key: string;
  label: string;
  icon: string;
  category: string;
  level: SimpleLevel;
  capabilities: EditorCapability[];
}

export interface RoleEditorResponse {
  role: {
    id: string;
    name: string;
    code: string | null;
    levelLabel: string;
    isSystem: boolean;
    status: RoleStatus;
  };
  permissionVersion: string;
  /** False when the role is Super Admin or outranks the current administrator. */
  editable: boolean;
  lockedReason: string | null;
  capabilityOrder: BusinessCapability[];
  reachOptions: Reach[];
  modules: EditorModule[];
}

/** Only the modules the administrator actually changed are submitted. */
export interface EditorSavePayload {
  modules: Array<{
    key: string;
    capabilities: Array<{ action: BusinessCapability; reach: Reach }>;
  }>;
}

export interface EditorSaveResponse {
  role: { id: string; name: string };
  permissionVersion: string;
  updatedModules: string[];
  clearedOverrides: number;
  affectedUsers: number;
  modules: EditorModule[];
}

export interface ValidationIssue {
  module?: string;
  capability?: string;
  message: string;
}
