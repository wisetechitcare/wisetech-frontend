import { store } from "@redux/store";
import { getDynamicRolesObject } from "./dynamicRoles";
import { can } from "./can";

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
// Maps ABAC resource names to RBAC module names.
// ABAC uses fine-grained strings ("attendancerequest"); RBAC uses module-level names ("attendance").
const resourceToRbacModule: Record<string, string> = {
  attendancerequest: 'attendance',
  attendancereport: 'attendance',
  leave: 'leaves',
  leavecashtransfer: 'leaves',
  reimbursement: 'finance',
  employee: 'users',
  salary: 'finance',
  salaryconfig: 'finance',
  salaryconfiguration: 'finance',
  loan: 'finance',
  loaninstallment: 'finance',
  kpi: 'kpi',
  department: 'settings',
  designation: 'settings',
  branch: 'settings',
  holiday: 'settings',
  onboardingdocument: 'settings',
  announcement: 'settings',
  attendanceconfig: 'settings',
  organisationprofile: 'settings',
};

// Maps uiControlResourceNameMapWithCamelCase values to their full RBAC permission key.
// These represent navigation-level access controls for sidebar/route visibility.
const uiControlToPermissionKey: Record<string, string> = {
  'calendar': 'attendance.view.self',
  'attendanceAndLeaves->personal': 'attendance.view.self',
  'attendanceAndLeaves->employees': 'attendance.view.all',
  'people->employees': 'users.view.team',
  'people->documents': 'users.view.team',
  'company->organisationProfile': 'settings.manage.all',
  'company->announcements': 'settings.manage.all',
  'company->branches': 'settings.manage.all',
  'company->departments': 'settings.manage.all',
  'company->designation': 'settings.manage.all',
  'company->media': 'settings.manage.all',
  'company->onboardingDocument': 'settings.manage.all',
  'reports->holidays': 'reports.view.team',
  'finance->reimbursements': 'finance.view.team',
  'finance->salary': 'finance.view.team',
  'reports->kpi': 'kpi.view.team',
  'finance-loan': 'finance.view.team',
  'lead-project->companiesContact': 'crm.companies.view.team',
};

export function hasPermission(
  resource: string,
  action: string,
  data?: any
): boolean {
  const actionMap: Record<string, { action: string; scope: string }> = {
    readOthers: { action: "view", scope: "team" },
    readOwn: { action: "view", scope: "self" },
    create: { action: "create", scope: "self" },
    updateOthers: { action: "update", scope: "team" },
    updateOwn: { action: "update", scope: "self" },
    deleteOthers: { action: "delete", scope: "team" },
    deleteOwn: { action: "delete", scope: "self" },
    editOthers: { action: "update", scope: "team" },
    editOwn: { action: "update", scope: "self" },
  };

  // UI control paths (e.g. "finance->salary") map directly to a full RBAC key.
  const directKey = uiControlToPermissionKey[resource];
  if (directKey && can(directKey)) return true;

  const mapped = actionMap[action];
  if (mapped) {
    // Resolve ABAC resource name to RBAC module, falling back to the resource as-is.
    const rbacModule = resourceToRbacModule[resource.toLowerCase()] ?? resource;
    const canonicalKey = `${rbacModule}.${mapped.action}.${mapped.scope}`;
    if (can(canonicalKey)) return true;
  }

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
