/**
 * Access Control → Assignments — centralized API layer (Phase 6.2). Every
 * request for this module goes through here; components never import axios.
 *
 * Uses the shared `api` helper (@/lib/apiClient) which already carries the
 * httpOnly auth cookie (withCredentials) and the session-expiry interceptor.
 * The backend wraps payloads as { hasError, statusCode, message, data }.
 */
import { api } from '@/lib/apiClient';
import type {
  Assignment,
  AssignmentHistoryResponse,
  AssignmentListParams,
  AssignmentListResponse,
  AssignmentStateResult,
  CreateAssignmentPayload,
  EffectiveAccessResponse,
  PersonOption,
  RoleOption,
  TenantOption,
  UnitOption,
  UpdateAssignmentPayload,
} from '../types';

const BASE = 'api/role-assignments';

/** Unwrap the standard success envelope. */
const unwrap = <T,>(envelope: unknown): T => (envelope as { data: T })?.data;

// ── Assignments CRUD + lifecycle ──────────────────────────────────────────────

export const fetchAssignments = async (params: AssignmentListParams): Promise<AssignmentListResponse> =>
  unwrap<AssignmentListResponse>(await api.get(BASE, params));

export const fetchAssignmentById = async (id: string): Promise<Assignment> =>
  unwrap<Assignment>(await api.get(`${BASE}/${id}`));

export const createAssignment = async (payload: CreateAssignmentPayload): Promise<Assignment> =>
  unwrap<Assignment>(await api.post(BASE, payload));

export const updateAssignment = async (id: string, payload: UpdateAssignmentPayload): Promise<Assignment> =>
  unwrap<Assignment>(await api.patch(`${BASE}/${id}`, payload));

/** Soft-remove: returns { id, status: 'revoked' }. */
export const removeAssignment = async (id: string): Promise<AssignmentStateResult> =>
  unwrap<AssignmentStateResult>(await api.delete(`${BASE}/${id}`));

export const restoreAssignment = async (id: string): Promise<AssignmentStateResult> =>
  unwrap<AssignmentStateResult>(await api.post(`${BASE}/${id}/restore`));

export const expireAssignment = async (id: string): Promise<AssignmentStateResult> =>
  unwrap<AssignmentStateResult>(await api.post(`${BASE}/${id}/expire`));

// ── Effective access + history ────────────────────────────────────────────────

export const fetchEffectiveAccess = async (personId: string): Promise<EffectiveAccessResponse> =>
  unwrap<EffectiveAccessResponse>(await api.get(`${BASE}/effective/${personId}`));

export const fetchAssignmentHistory = async (
  personId: string,
  limit?: number,
): Promise<AssignmentHistoryResponse> =>
  unwrap<AssignmentHistoryResponse>(await api.get(`${BASE}/history/${personId}`, { limit }));

// ── Picker data sources (existing endpoints reused as-is) ─────────────────────

/**
 * People picker source. Reuses the existing employees selector endpoint.
 * The `id` returned here is the employees.id, which is exactly the value the
 * role-assignment `userId` references — so it is submitted verbatim as userId
 * and used as `:personId` in the effective-access / history routes.
 */
interface RawEmployee {
  id: string;
  avatar?: string | null;
  gender?: string | null;
  isActive?: boolean;
  companyId?: string | null;
  branchId?: string | null;
  departmentId?: string | null;
  users?: { firstName?: string | null; lastName?: string | null } | null;
  designations?: { role?: string | null } | null;
  roles?: Array<{ name?: string | null }> | null;
}

export const fetchPeopleOptions = async (): Promise<PersonOption[]> => {
  const res = await api.get<{ data?: { employees?: RawEmployee[] } }>(
    'api/employee/all-employees-selected-data',
  );
  const employees = res?.data?.employees ?? [];
  return employees.map((emp) => ({
    id: emp.id,
    name: `${emp.users?.firstName ?? ''} ${emp.users?.lastName ?? ''}`.trim() || 'Unnamed person',
    caption: emp.designations?.role ?? null,
    isActive: emp.isActive ?? true,
    role: emp.roles?.[0]?.name ?? null, // one role per employee
    companyId: emp.companyId ?? null,
    branchId: emp.branchId ?? null,
    departmentId: emp.departmentId ?? null,
  }));
};

interface RawRole {
  id: string;
  name: string;
  code?: string | null;
  level?: number;
}

export const fetchRoleOptions = async (): Promise<RoleOption[]> => {
  // GET /api/access/roles returns a PAGINATED envelope: { data: { data: [...roles],
  // page, total, ... } }. api.get already unwraps the outer transport envelope, so
  // the roles array is at res.data.data — reading res.data (the pagination object)
  // yields no array and the picker shows "No options".
  const res = await api.get<{ data?: { data?: RawRole[] } }>('api/access/roles', { pageSize: 100 });
  return (res?.data?.data ?? []).map((r) => ({ id: r.id, name: r.name, code: r.code ?? null, level: r.level }));
};

interface RawTenant {
  id: string;
  name: string;
  status?: string;
}

export const fetchTenantOptions = async (): Promise<TenantOption[]> => {
  const res = await api.get<{ data?: RawTenant[] }>('api/tenants', { pageSize: 100 });
  return (res?.data ?? []).map((t) => ({ id: t.id, name: t.name, status: t.status ?? 'active' }));
};

interface RawTreeNode {
  id: string;
  name: string;
  type: string;
  status: string;
  children?: RawTreeNode[];
}

/** Depth-first flatten of the org tree into an indented, selectable list. */
const flattenUnits = (nodes: RawTreeNode[], depth = 0, acc: UnitOption[] = []): UnitOption[] => {
  for (const node of nodes) {
    acc.push({ id: node.id, name: node.name, type: node.type, status: node.status, depth });
    if (node.children?.length) flattenUnits(node.children, depth + 1, acc);
  }
  return acc;
};

export const fetchUnitOptions = async (tenantId: string): Promise<UnitOption[]> => {
  const res = await api.get<{ data?: { tree?: RawTreeNode[] } }>('api/organization-units/tree', { tenantId });
  return flattenUnits(res?.data?.tree ?? []);
};
