import { store } from "@redux/store";
import { getDynamicRolesObject } from "./dynamicRoles";
import { json } from "stream/consumers";

let dynamicRoles: Record<string, any> = {};

// Call this early (for example, on app load) to initialize the permissions
export async function loadDynamicRoles() {
  try {
    dynamicRoles = await getDynamicRolesObject();
    // console.log("Dynamic roles loaded:", dynamicRoles);
  } catch (err) {
    console.error("Failed to load dynamic roles", err);
  }
}

/**
 * Checks if the given user has permission to perform a specific action
 * on a resource.
 *
 * @param user - the current user object (fetched from your store)
 * @param resource - the resource name (e.g. "comments", "todos", "attendanceRequest")
 * @param action - the action name (e.g. "view", "create", "update", "delete")
 * @param data - (optional) any extra data required for the permission check
 */
export function hasPermission(
  resource: string,
  action: string,
  data?: any
): boolean {

  const dynamicRoles = JSON.parse(store.getState().rolesAndPermissions.rap);
  const emp = JSON.parse(store.getState().rolesAndPermissions.emp || "{}");
  
  return emp.roles.some((role: any) => {
    // Convert the role to lowercase to match your dynamic roles keys.
    const roleKey = role?.name?.toLowerCase();
    // console.log("roleKey", roleKey);
    const rolePermissions = dynamicRoles[roleKey];
    
    if (!rolePermissions) return false;
    
    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    const permission = resourcePermissions[action];
    
    if (
      data?.employeeId &&
      data?.employeeId?.toString() !== emp?.id?.toString() &&
      action?.toLocaleLowerCase()?.includes("own")
    ) {
      return false;
    }

    if (
      data?.employeeId &&
      data?.employeeId?.toString() === emp?.id?.toString() &&
      action?.toLocaleLowerCase()?.includes("other")
    ) {
      return false;
    }
        
    if (permission == null) return false;
    
    if (typeof permission === "boolean") return permission;
    // Assume permission is a function in all other cases.
    return data != null && permission(emp, data);
  });
}

//   export function hasPermission<Resource extends keyof Permissions>(
//     user: User,
//     resource: Resource,
//     action: Permissions[Resource]["action"],
//     data?: Permissions[Resource]["dataType"]
//   ) {
//     return user.roles.some(role => {
//       const permission = (ROLES as RolesWithPermissions)[role][resource]?.[action]
//       if (permission == null) return false

//       if (typeof permission === "boolean") return permission
//       return data != null && permission(user, data)
//     })
//   }
