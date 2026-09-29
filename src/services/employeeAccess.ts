import axios from "axios";
import { EMPLOYEE, AUDIT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export type AccessLevel = "default" | "view" | "edit" | "blocked";
export type TabLevel = "view" | "edit" | "none";

/** Per section tab: what the roles give, this employee's overrides, and the result. */
export interface EmployeeAccessSummary {
    roles: Array<{ id: string; name: string; code?: string | null; isSystem: boolean }>;
    /** Super Admin: every section, overrides don't apply. */
    fullAccess: boolean;
    /** Whether the caller may change it: an Admin's access is a Super Admin's to set; nobody sets their own. */
    editable?: boolean;
    roleLevels: Record<string, TabLevel>;
    overrides: Record<string, { level: TabLevel; expiresAt: string | null }>;
    effectiveLevels: Record<string, TabLevel>;
    /** Leads / projects: see records not their own (`readAll`) and money (`commercial`). `custom` = set for this employee. */
    records?: Record<RecordSection, RecordAccess & { custom: boolean }>;
    /** Tabs (Access → Advanced), keyed `<section>/<tab>`: off for this person, and set for them rather than by their roles. */
    tabs?: Record<string, { denied: boolean; custom: boolean }>;
}

export type RecordSection = "crm.leads" | "projects";
export type RecordAccess = { readAll: boolean; commercial: boolean };

/**
 * Set whether an employee sees every lead / project (`readAll`) and their money (`commercial`);
 * `null` drops back to the default for their tier.
 * @api "api/employee/:id/access/record"
 */
export const setRecordAccess = async (employeeId: string, section: RecordSection, next: RecordAccess | null) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.SET_RECORD_ACCESS.replace(":id", employeeId)}`;
    const { data } = await axios.put(endpoint, next ? { section, ...next } : { section, reset: true });
    return data?.data;
};

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
 * Default) for an employee in a single atomic call.
 * @api "api/employee/:id/access/section"
 */
export const setSectionAccessLevel = async (
    employeeId: string,
    module: string,
    level: AccessLevel,
    expiresAt?: string | null
) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.SET_SECTION_ACCESS.replace(":id", employeeId)}`;
    const { data } = await axios.put(endpoint, { module, level, ...(expiresAt ? { expiresAt } : {}) });
    return data?.data;
};

/**
 * Turn one tab of a section off or on for an employee, or `null` to follow their roles again.
 * @api "api/employee/:id/access/tab"
 */
export const setTabAccess = async (employeeId: string, section: string, tab: string, allowed: boolean | null) => {
    const endpoint = `${API_BASE_URL}/${EMPLOYEE.SET_TAB_ACCESS.replace(":id", employeeId)}`;
    const { data } = await axios.put(endpoint, { section, tab, allowed });
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
 * Fetch the RBAC audit trail (optionally scoped to a target).
 * @api "api/audit/rbac"
 */
export const getRbacAuditLogs = async (params?: { targetType?: string; targetId?: string; actorId?: string; limit?: number }) => {
    const endpoint = `${API_BASE_URL}/${AUDIT.GET_RBAC_AUDIT_LOGS}`;
    const { data } = await axios.get(endpoint, { params });
    return data?.data || [];
};
