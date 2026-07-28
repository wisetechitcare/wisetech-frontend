/**
 * Organization Management — centralized API layer. Every request for this module
 * goes through here; components never import axios.
 *
 * Uses the shared `api` helper (@/lib/apiClient) which already carries the
 * httpOnly auth cookie (withCredentials) and the session-expiry interceptor.
 * The backend wraps payloads as { hasError, statusCode, message, data }.
 */
import { api } from '@/lib/apiClient';
import type {
  ArchiveUnitResult,
  BreadcrumbsResponse,
  CreateTenantPayload,
  CreateUnitPayload,
  MoveUnitPayload,
  RestoreUnitResult,
  Tenant,
  TenantDetails,
  TenantListParams,
  TenantListResponse,
  Unit,
  UnitDetails,
  UnitListParams,
  UnitListResponse,
  UnitTreeResponse,
  UpdateTenantPayload,
  UpdateUnitPayload,
} from '../types';

const TENANTS = 'api/tenants';
const UNITS = 'api/organization-units';

/** Unwrap the standard success envelope. */
const unwrap = <T,>(envelope: unknown): T => (envelope as { data: T })?.data;

// ── Tenants ───────────────────────────────────────────────────────────────────

export const fetchTenants = async (params: TenantListParams): Promise<TenantListResponse> =>
  unwrap<TenantListResponse>(await api.get(TENANTS, params));

export const fetchTenantById = async (id: string): Promise<TenantDetails> =>
  unwrap<TenantDetails>(await api.get(`${TENANTS}/${id}`));

export const createTenant = async (payload: CreateTenantPayload): Promise<Tenant> =>
  unwrap<Tenant>(await api.post(TENANTS, payload));

export const updateTenant = async (id: string, payload: UpdateTenantPayload): Promise<Tenant> =>
  unwrap<Tenant>(await api.patch(`${TENANTS}/${id}`, payload));

/** Archives the tenant (returns the archived tenant). */
export const archiveTenant = async (id: string): Promise<Tenant> =>
  unwrap<Tenant>(await api.delete(`${TENANTS}/${id}`));

export const restoreTenant = async (id: string): Promise<Tenant> =>
  unwrap<Tenant>(await api.post(`${TENANTS}/${id}/restore`));

// ── Organizational units ────────────────────────────────────────────────────────

export const fetchUnitTree = async (
  tenantId: string,
  options?: { rootId?: string; includeArchived?: boolean },
): Promise<UnitTreeResponse> =>
  unwrap<UnitTreeResponse>(
    await api.get(`${UNITS}/tree`, {
      tenantId,
      rootId: options?.rootId,
      includeArchived: options?.includeArchived,
    }),
  );

export const fetchUnits = async (params: UnitListParams): Promise<UnitListResponse> =>
  unwrap<UnitListResponse>(await api.get(UNITS, params));

export const fetchUnitById = async (id: string): Promise<UnitDetails> =>
  unwrap<UnitDetails>(await api.get(`${UNITS}/${id}`));

export const fetchUnitBreadcrumbs = async (id: string): Promise<BreadcrumbsResponse> =>
  unwrap<BreadcrumbsResponse>(await api.get(`${UNITS}/${id}/breadcrumbs`));

export const createUnit = async (payload: CreateUnitPayload): Promise<Unit> =>
  unwrap<Unit>(await api.post(UNITS, payload));

export const updateUnit = async (id: string, payload: UpdateUnitPayload): Promise<Unit> =>
  unwrap<Unit>(await api.patch(`${UNITS}/${id}`, payload));

export const moveUnit = async (id: string, payload: MoveUnitPayload): Promise<UnitDetails> =>
  unwrap<UnitDetails>(await api.post(`${UNITS}/${id}/move`, payload));

export const archiveUnit = async (id: string, cascade: boolean): Promise<ArchiveUnitResult> =>
  unwrap<ArchiveUnitResult>(await api.delete(`${UNITS}/${id}?cascade=${cascade}`));

export const restoreUnit = async (id: string, cascade: boolean): Promise<RestoreUnitResult> =>
  unwrap<RestoreUnitResult>(await api.post(`${UNITS}/${id}/restore?cascade=${cascade}`));
