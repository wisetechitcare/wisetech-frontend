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
 * Retrieves a role by its ID.
 * @param roleId The ID of the role to retrieve.
 * @returns The retrieved role.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:id"
 */
export const getRoleById = async (roleId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.GET_ROLE.replace(":id", roleId)}`;
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

/**
 * Retrieves the permissions associated with a role by its ID.
 * @param roleId The ID of the role to retrieve permissions for.
 * @returns The permissions associated with the specified role.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:id/permissions"
 */
export const getPermissionsForRoleById = async (roleId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.GET_PERMISSIONS_FOR_ROLE.replace(":id", roleId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Creates a new permission for a role by its ID.
 * @param roleId The ID of the role to create a permission for.
 * @param permission The permission to create.
 * @returns The created permission.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:id/permissions"
 */
export const createPermissionForRoleById = async (roleId: string, permission: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.CREATE_PERMISSION_FOR_ROLE.replace(":id", roleId)}`;
        const { data } = await axios.post(endpoint, permission);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Updates an existing permission for a role by roleId and permissionId.
 * @param roleId The ID of the role to update a permission for.
 * @param permissionId The ID of the permission to update.
 * @param permission The updated permission.
 * @returns The updated permission.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:roleId/permissions/:permissionId"
 */
export const updatePermissionForRoleById = async (roleId: string, permissionId: string, permission: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.UPDATE_PERMISSION_FOR_ROLE.replace(":roleId", roleId).replace(":permissionId", permissionId)}`;
        const { data } = await axios.put(endpoint, permission);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Deletes a permission for a role by roleId and permissionId.
 * @param roleId The ID of the role to delete a permission for.
 * @param permissionId The ID of the permission to delete.
 * @returns The deleted permission.
 * @throws Throws an error if the request fails.
 * @api "api/roles/:roleId/permissions/:permissionId"
 */
export const deletePermissionForRoleById = async (roleId: string, permissionId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${ROLES.DELETE_PERMISSION_FOR_ROLE.replace(":roleId", roleId).replace(":permissionId", permissionId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}