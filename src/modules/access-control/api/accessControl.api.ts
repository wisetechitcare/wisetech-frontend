/**
 * Access Control — centralized API layer. Every request for this module goes
 * through here; components never import axios.
 *
 * Uses the shared `api` helper (@/lib/apiClient) which already carries the
 * httpOnly auth cookie (withCredentials) and the session-expiry interceptor.
 * The backend wraps payloads as { hasError, statusCode, message, data }.
 */
import { api } from '@/lib/apiClient';
import type {
  AccessCatalog,
  RoleDetails,
  RoleListParams,
  RoleListResponse,
  RoleMember,
  RoleSummary,
  RoleEditorResponse,
  EditorSavePayload,
  EditorSaveResponse,
} from '../types';

const BASE = 'api/access';

/** Unwrap the standard success envelope. */
const unwrap = <T,>(envelope: unknown): T => (envelope as { data: T })?.data;

export const fetchCatalog = async (): Promise<AccessCatalog> =>
  unwrap<AccessCatalog>(await api.get(`${BASE}/catalog`));

export const fetchRoles = async (params: RoleListParams): Promise<RoleListResponse> =>
  unwrap<RoleListResponse>(await api.get(`${BASE}/roles`, params));

export const fetchRoleById = async (id: string): Promise<RoleDetails> =>
  unwrap<RoleDetails>(await api.get(`${BASE}/roles/${id}`));

export const fetchRoleSummary = async (id: string): Promise<RoleSummary> =>
  unwrap<RoleSummary>(await api.get(`${BASE}/roles/${id}/summary`));

export const fetchRoleMembers = async (id: string): Promise<RoleMember[]> =>
  unwrap<RoleMember[]>(await api.get(`${BASE}/roles/${id}/members`)) ?? [];

// ── Permission Editor (Phase 5.2) ────────────────────────────────────────────

export const fetchRoleEditor = async (id: string): Promise<RoleEditorResponse> =>
  unwrap<RoleEditorResponse>(await api.get(`${BASE}/roles/${id}/editor`));

/** Submits ONLY the modules that changed. Business language only. */
export const saveRoleEditor = async (id: string, payload: EditorSavePayload): Promise<EditorSaveResponse> =>
  unwrap<EditorSaveResponse>(await api.put(`${BASE}/roles/${id}/editor`, payload));
