import axios from "axios";
import { EMPLOYEE, AUDIT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export interface AccessOverride {
    id: string;
    key: string;
    resource: string;
    action: string;
    condition?: string | null;
    expiresAt?: string | null;
}

export type AccessLevel = "default" | "view" | "edit" | "blocked";

export interface EmployeeAccessSummary {
    roles: Array<{ id: string; name: string; code?: string | null; isSystem: boolean }>;
    inherited: string[];
    overridesAllow: AccessOverride[];
    overridesDeny: AccessOverride[];
    sectionLevels: Record<string, "view" | "edit" | "blocked">;
    effective: string[];
}

/**
 * Server-computed access breakdown for an employee.
 * @api "api/employee/:id/access"
 */
export const getEmployeeAccessSummary = async (employeeId: string): Promise<EmployeeAccessSummary> => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.GET_EMPLOYEE_ACCESS.replace(":id", employeeId)}`;
    const { data } = await axios.get(endpoint);
    return data?.data;
};

/**
 * Set one sidebar section's access level (Blocked / View only / Can edit /
 * Default) for an employee in a single atomic call. Returns the refreshed summary.
 * @api "api/employee/:id/access/section"
 */
export const setSectionAccessLevel = async (
    employeeId: string,
    module: string,
    level: AccessLevel,
    expiresAt?: string | null
): Promise<EmployeeAccessSummary> => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.SET_SECTION_ACCESS.replace(":id", employeeId)}`;
    const { data } = await axios.put(endpoint, { module, level, ...(expiresAt ? { expiresAt } : {}) });
    return data?.data;
};

/**
 * Replace the full set of roles assigned to an employee.
 * @api "api/employee/:id/roles"
 */
export const updateEmployeeRoles = async (employeeId: string, roleIds: string[]) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_ROLES.replace(":id", employeeId)}`;
    const { data } = await axios.put(endpoint, { roleIds });
    return data;
};

/**
 * Create a per-employee permission override (allow grant or deny).
 * @api "api/employee/:id/permissions"
 */
export const createEmployeeOverride = async (
    employeeId: string,
    payload: { resource: string; action: string; allow: boolean; condition?: string; expiresAt?: string | null }
) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.CREATE_EMPLOYEE_PERMISSION.replace(":id", employeeId)}`;
    const { data } = await axios.post(endpoint, payload);
    return data;
};

/**
 * Update an existing per-employee override.
 * @api "api/employee/:id/permissions/:permissionId"
 */
export const updateEmployeeOverride = async (
    employeeId: string,
    permissionId: string,
    payload: { resource?: string; action?: string; allow?: boolean; condition?: string; expiresAt?: string | null }
) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.UPDATE_EMPLOYEE_PERMISSION.replace(":id", employeeId).replace(":permissionId", permissionId)}`;
    const { data } = await axios.put(endpoint, payload);
    return data;
};

/**
 * Delete a per-employee override (reverts to role-inherited behavior).
 * @api "api/employee/:id/permissions/:permissionId"
 */
export const deleteEmployeeOverride = async (employeeId: string, permissionId: string) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.DELETE_EMPLOYEE_PERMISSION.replace(":id", employeeId).replace(":permissionId", permissionId)}`;
    const { data } = await axios.delete(endpoint);
    return data;
};

/**
 * Fetch the RBAC audit trail (optionally scoped to a target).
 * @api "api/audit/rbac"
 */
export const getRbacAuditLogs = async (params?: { targetType?: string; targetId?: string; actorId?: string; limit?: number }) => {
    const endpoint = `${API_BASE_URL}/${AUDIT.GET_RBAC_AUDIT_LOGS}`;
    const { data } = await axios.get(endpoint, { params });
    return data?.data || [];
};
