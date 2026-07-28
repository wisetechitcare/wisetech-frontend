// utils/dynamicRoles.ts
import { fetchRoles } from '@services/roles';
import { store } from '@redux/store';
import { can } from './can';

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
    // GET /api/roles is admin-gated (accesscontrol.view). Once capabilities are
    // loaded, skip the call entirely for non-administrators so their sessions
    // don't emit expected-403 noise on every page (e.g. the attendance calendar).
    // During bootstrap the capabilities aren't loaded yet (empty array) — we
    // still attempt the fetch and let the 403 handler below degrade gracefully.
    const caps = (store.getState() as any).authz?.capabilities;
    if (Array.isArray(caps) && caps.length > 0 && !can('accesscontrol.view.all')) {
      return {};
    }

    let response;
    try {
      response = await fetchRoles();
    } catch (err: any) {
      // GET /api/roles is admin-gated (accesscontrol.view). A 403 just means the
      // current user isn't a role administrator — a NORMAL state for employees,
      // not a failure. Return an empty legacy map so app bootstrap succeeds and
      // doesn't retry-storm; real authorization is enforced by the capability
      // system (can()), which hasPermission() consults first. Other errors
      // (network / 5xx) still propagate so session bootstrap can retry.
      if (err?.response?.status === 403) return {};
      throw err;
    }
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
