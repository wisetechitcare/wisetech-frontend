// utils/dynamicRoles.ts
import { fetchRoles,getRoleById, createRole, updateRoleById, deleteRoleById, getPermissionsForRoleById, createPermissionForRoleById, updatePermissionForRoleById, deletePermissionForRoleById  } from '@services/roles';
import { getEmployeePermissionsById } from '@services/employee';
import { store } from '@redux/store';

/**
 * Fetches roles from the backend and constructs a dynamic ROLES object.
 *
 * Expected backend response for each role:
 * {
 *    id: string,
 *    name: string,
 *    permissions: [
 *       {
 *         id: string,
 *         resource: string,    // e.g., "attendanceRequests"
 *         action: string,      // e.g., "view", "create", etc.
 *         allow: boolean,      // e.g., true or false
 *         condition?: string   // e.g., "req.status === 0"
 *       },
 *       ...
 *    ]
 * }
 */
export async function getDynamicRolesObject() {
  try {
    const response = await fetchRoles();
    const rolesData = response?.data; // Array of roles with permissions
    // console.log("responseFromGetDynamicRolesObject: ",rolesData);

    const constructed: Record<string, any> = {};

    rolesData.forEach((role: any) => {
      const roleName = role.name.toLowerCase().trim();
      if (!constructed[roleName]) {
        constructed[roleName] = {};
      }

      role.permissions.forEach((perm: any) => {
        const resource = perm.resource;
        const action = perm.action;

        // Initialize resource object if needed
        if (!constructed[roleName][resource]) {
          constructed[roleName][resource] = {};
        }

        // If a condition is provided, convert it into a function; otherwise, use the boolean allow
        if (perm.condition) {
          try {
            // Here, we create a function that takes (user, req) and returns the result of the condition.
            // e.g., new Function('user', 'req', 'return req.status === 0;')
            constructed[roleName][resource][action] = new Function(
              'user',
              'req',
              `return ${perm.condition};`
            );
          } catch (err) {
            console.error(
              `Error constructing condition function for role ${roleName} on resource ${resource} action ${action}`,
              err
            );
            constructed[roleName][resource][action] = false; // fallback value
          }
        } else {
          constructed[roleName][resource][action] = perm.allow;
        }
      });
    });
    // console.log("constructed: ",constructed);
    
    return constructed;
  } catch (err) {
    console.error('Failed to fetch roles from API', err);
    throw err;
  }
}

/**
 * Fetches roles from the backend and constructs a dynamic ROLES object.
 *
 * Expected backend response for each role:
 * {
 *    id: string,
 *    name: string,
 *    userPermissions: [
 *       {
 *         id: string,
 *         userId: string,
 *         resource: string,    // e.g., "attendanceRequests"
 *         action: string,      // e.g., "view", "create", etc.
 *         allow: boolean,      // e.g., true or false
 *         condition?: string   // e.g., "req.status === 0"
 *       },
 *       ...
 *    ]
 * }
 */
export async function getDynamicUserRolesObject() {
  try {
    const employeeId = store.getState().employee?.currentEmployee?.id;
    if(!employeeId){
      return;
    }
    // instead here fetch the user from DB and store in slice as it is
    const response = await getEmployeePermissionsById(employeeId);

    // const userRolesData = undefined;
    const userRolesData = response?.data?.data; // Array of roles with permissions
    // console.log("responseFromGetDynamicUserRolesObject: ",userRolesData);
    const finalUserRolesData: Record<string, any> = {};
    userRolesData?.forEach((perm: any) => {
      const resource = perm.resource;
        const action = perm.action;
      if (!finalUserRolesData[resource]) {
        finalUserRolesData[resource] = {};
      }
      finalUserRolesData[resource][action] = perm.allow;
    })

    return finalUserRolesData;
  } catch (err) {
    console.error('Failed to fetch roles from API', err);
    throw err;
  }
}