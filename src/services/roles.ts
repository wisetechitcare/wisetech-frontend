import axios from "axios";
import { ROLES } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Fetches all roles.
 * @returns An array of roles.
 * @throws Throws an error if the request fails.
 * @api "api/roles"
 */
export const fetchRoles = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.GET_ALL_ROLES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Creates a new role.
 * @param role The role to create.
 * @returns The created role.
 * @throws Throws an error if the request fails.
 * @api "api/roles"
 */
export const createRole = async (role: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.CREATE_ROLE}`;
        const { data } = await axios.post(endpoint, role);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Updates an existing role by its ID.
 * @param roleId The ID of the role to update.
 * @param role The updated role.
 * @returns The updated role.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:id"
 */
export const updateRoleById = async (roleId: string, role: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.UPDATE_ROLE.replace(":id", roleId)}`;
        const { data } = await axios.put(endpoint, role);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Deletes a role by its ID.
 * @param roleId The ID of the role to delete.
 * @returns The deleted role.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:id"
 */
export const deleteRoleById = async (roleId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.DELETE_ROLE.replace(":id", roleId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const addEmployeeToRole = async (roleId: string, employeeId: string) => {
    const endpoint = `${API_BASE_URL}/${ROLES.ADD_EMPLOYEE_TO_ROLE.replace(":id", roleId)}`;
    const { data } = await axios.post(endpoint, { employeeId });
    return data;
}

export const removeEmployeeFromRole = async (roleId: string, employeeId: string) => {
    const endpoint = `${API_BASE_URL}/${ROLES.REMOVE_EMPLOYEE_FROM_ROLE.replace(":id", roleId).replace(":employeeId", employeeId)}`;
    const { data } = await axios.delete(endpoint);
    return data;
}

/**
 * Role-level section access (Settings → Roles & Permissions). The same section
 * model as the per-employee Access tab, but applied to a whole role.
 * @api "api/roles/:id/access"
 */
export const getRoleAccess = async (roleId: string): Promise<{ sectionLevels: Record<string, 'view' | 'edit'>; isSuperAdmin?: boolean; isSystem?: boolean; name?: string }> => {
    const endpoint = `${API_BASE_URL}/${ROLES.GET_ROLE_ACCESS.replace(":id", roleId)}`;
    const { data } = await axios.get(endpoint);
    return data?.data;
}

/**
 * Set one section's access level for the whole role. level ∈ none | view | edit.
 * @api "api/roles/:id/access/section"
 */
export const setRoleSectionAccess = async (roleId: string, module: string, level: 'none' | 'view' | 'edit') => {
    const endpoint = `${API_BASE_URL}/${ROLES.SET_ROLE_SECTION_ACCESS.replace(":id", roleId)}`;
    const { data } = await axios.put(endpoint, { module, level });
    return data?.data;
}