import { store } from "@redux/store";
import { can } from "@utils/can";

// The sidebar "sections" an admin can grant/block per employee, as a tree.
// `module` is the backend permission resource key; sub-sections use a dotted key
// under their parent (e.g. finance.salary, kpi.leaderboard). `label` is what the
// admin reads. Keep in sync with SECTION_MODULES in
// backend/src/constants/permissions.ts.
export interface AccessArea {
  module: string;
  label: string;
  children?: AccessArea[];
}

export const ACCESS_AREAS: AccessArea[] = [
  { module: "dashboard", label: "Dashboard" },
  { module: "calendar", label: "Calendar" },
  {
    module: "attendance",
    label: "Attendance & Leaves",
    children: [
      { module: "attendance.personal", label: "Personal" },
      { module: "attendance.employees", label: "Employees" },
    ],
  },
  { module: "crm.leads", label: "Leads" },
  { module: "projects", label: "Projects" },
  { module: "crm.companies", label: "Companies" },
  { module: "crm.contacts", label: "Contacts" },
  { module: "tasks", label: "Tasks" },
  {
    module: "timesheets",
    label: "Timesheet",
    children: [
      { module: "timesheets.my", label: "My Timesheet" },
      { module: "timesheets.employees", label: "Employees Timesheet" },
    ],
  },
  { module: "users", label: "People (Employees)" },
  {
    module: "reports",
    label: "Reports",
    children: [
      {
        module: "reports.kpi",
        label: "KPI",
        children: [
          { module: "kpi.my", label: "My KPI" },
          { module: "kpi.search", label: "Search Employees" },
          { module: "kpi.leaderboard", label: "Leaderboard" },
          { module: "kpi.configure", label: "Configure" },
        ],
      },
    ],
  },
  {
    module: "finance",
    label: "Finance",
    children: [
      { module: "finance.loans", label: "Loans" },
      { module: "finance.reimbursements", label: "Reimbursements" },
      { module: "finance.salary", label: "Salary" },
      { module: "finance.increment", label: "Increment" },
    ],
  },
  {
    module: "settings",
    label: "Organization / Settings",
    children: [
      { module: "settings.profile", label: "Organization Profile" },
      { module: "settings.announcements", label: "Announcements" },
      { module: "settings.media", label: "Media" },
      { module: "settings.onboarding", label: "Onboarding Docs" },
      { module: "settings.teams", label: "Teams" },
      { module: "settings.employeeLevel", label: "Employee Level" },
    ],
  },
];

// Flatten the tree (with depth) for table rendering and label lookups.
export interface FlatArea extends AccessArea {
  depth: number;
}
export const flattenAreas = (areas: AccessArea[] = ACCESS_AREAS, depth = 0): FlatArea[] =>
  areas.flatMap((a) => [{ ...a, depth }, ...(a.children ? flattenAreas(a.children, depth + 1) : [])]);

export const AREA_LABELS: Record<string, string> = flattenAreas().reduce((acc, a) => {
  acc[a.module] = a.label;
  return acc;
}, {} as Record<string, string>);

/**
 * True when the current user is explicitly blocked from a section/sub-section.
 * Default is NOT blocked, so areas stay visible unless an admin blocks them —
 * this keeps existing users unaffected.
 */
export const isSectionBlocked = (module: string): boolean => {
  const blocked = (store.getState() as any).authz?.blockedSections || [];
  return Array.isArray(blocked) && blocked.includes(module);
};

/**
 * Visibility for a section/sub-section/tab. Precedence (matches the backend):
 *   1. Explicit Block always wins  → hidden.
 *   2. Otherwise visible if the ROLE allows it (baseAllowed) OR the admin
 *      granted an employee-specific override (View/Edit).
 * This is what lets a per-employee override REVEAL an area the role doesn't
 * grant — the override is layered on top of the role, not ignored.
 */
export const isSubsectionVisible = (module: string, baseAllowed: boolean): boolean => {
  if (isSectionBlocked(module)) return false;
  return baseAllowed || can(`${module}.view.all`);
};

const findNode = (areas: AccessArea[], module: string): AccessArea | undefined => {
  for (const a of areas) {
    if (a.module === module) return a;
    if (a.children) {
      const found = findNode(a.children, module);
      if (found) return found;
    }
  }
  return undefined;
};

/**
 * True if any descendant sub-section of `parentModule` has been granted via an
 * employee override. Used so a parent menu group appears when the role grants
 * nothing but the admin granted one of its children to this employee.
 */
export const anyChildGranted = (parentModule: string): boolean => {
  const node = findNode(ACCESS_AREAS, parentModule);
  if (!node?.children) return false;
  return flattenAreas(node.children).some((c) => !isSectionBlocked(c.module) && can(`${c.module}.view.all`));
};
