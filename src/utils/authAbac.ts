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
// Some resources map to different child modules depending on whether the check is for
// "others" (team scope) or "own" (self scope) data - e.g. attendance/leave requests are
// governed by the "Attendance & Leaves" section tree's "Employees" vs "Personal" leaves
// (attendance.employees / attendance.personal), which is finer-grained than a single flat
// module name. Leave requests are intentionally bundled under the same two leaves as
// attendance, since the Access tree has one combined "Attendance & Leaves" section, not a
// separate "Leaves" node.
// `flat` is also checked as a fallback: default system roles seeded by
// scripts/seed_rbac.ts (backend) grant the plain "attendance"/"leaves" module rather
// than the granular Access-tree leaves, so both conventions must keep working.
const resourceToRbacModule: Record<string, string | { team: string; self: string; flat: string }> = {
  attendancerequest: { team: 'attendance.employees', self: 'attendance.personal', flat: 'attendance' },
  attendancereport: { team: 'attendance.employees', self: 'attendance.personal', flat: 'attendance' },
  leave: { team: 'attendance.employees', self: 'attendance.personal', flat: 'leaves' },
  leavecashtransfer: { team: 'attendance.employees', self: 'attendance.personal', flat: 'leaves' },
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

// Memoized parse of the redux-stored (JSON-stringified) legacy roles/employee
// state, keyed by the raw string reference so it's only re-parsed when the
// underlying redux state actually changes, not on every hasPermission() call.
let lastRapState: string | undefined;
let lastParsedRoles: Record<string, any> = {};
let lastEmpState: string | undefined;
let lastParsedEmp: any = {};

function getLegacyRolesAndEmployee(): { dynamicRoles: Record<string, any>; emp: any } {
  try {
    const rapState = store.getState().rolesAndPermissions.rap;
    if (rapState !== lastRapState) {
      lastParsedRoles = rapState ? JSON.parse(rapState) : {};
      lastRapState = rapState;
    }

    const empState = store.getState().rolesAndPermissions.emp;
    if (empState !== lastEmpState) {
      lastParsedEmp = empState ? JSON.parse(empState) : {};
      lastEmpState = empState;
    }
  } catch (e) {
    console.error("Error parsing roles and permissions state:", e);
    lastParsedRoles = {};
    lastParsedEmp = {};
  }

  return { dynamicRoles: lastParsedRoles, emp: lastParsedEmp };
}

export function hasPermission(
  resource: string,
  action: string,
  data?: any
): boolean {
  const actionMap: Record<string, { action: string; scope: "team" | "self" }> = {
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

  const { dynamicRoles, emp } = getLegacyRolesAndEmployee();

  // Ownership guard: an "Own" action must never apply to another employee's
  // record, and an "Others" action must never apply to the current
  // employee's own record. This is checked up front - before either the
  // capability (`can()`) or legacy dynamic-role branch can grant access - so
  // it can't be bypassed by whichever source resolves the base permission.
  if (data?.employeeId) {
    const isOwnRecord = data.employeeId.toString() === emp?.id?.toString();
    const actionLower = action?.toLocaleLowerCase() ?? "";
    if (!isOwnRecord && actionLower.includes("own")) return false;
    if (isOwnRecord && actionLower.includes("other")) return false;
  }

  const mapped = actionMap[action];
  if (mapped) {
    // Resolve ABAC resource name to RBAC module, falling back to the resource as-is.
    // A resource may map to different child modules depending on scope (see
    // resourceToRbacModule's comment) - pick the one matching this call's scope, but
    // also accept the flat module name so default-seeded roles keep working.
    const rawModule = resourceToRbacModule[resource.toLowerCase()] ?? resource;
    if (typeof rawModule === "string") {
      if (can(`${rawModule}.${mapped.action}.${mapped.scope}`)) return true;
    } else {
      if (can(`${rawModule[mapped.scope]}.${mapped.action}.${mapped.scope}`)) return true;
      if (can(`${rawModule.flat}.${mapped.action}.${mapped.scope}`)) return true;
    }
  }

  if (!emp || !Array.isArray(emp.roles)) {
    return false;
  }

  return emp.roles.some((role: any) => {
    // Convert the role to lowercase to match your dynamic roles keys.
    const roleKey = role?.name?.toLowerCase();
    const rolePermissions = dynamicRoles[roleKey];

    if (!rolePermissions) return false;

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) return false;

    const permission = resourcePermissions[action];

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
