import { canSection } from "@utils/can";

// The sidebar "sections" an admin can grant/block per employee, as a tree.
// `module` is the backend permission resource key; sub-sections use a dotted key
// under their parent (e.g. finance.salary, kpi.leaderboard). `label` is what the
// admin reads. Keep in sync with SECTION_PARENT in
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
  {
    // Billing is a top-level ERP module, not a project sub-area — its children are the
    // module's own tabs, so an admin can block, say, Settings without hiding Billing.
    module: "billing",
    label: "Billing",
    children: [
      { module: "billing.dashboard", label: "Dashboard" },
      { module: "billing.requests", label: "Billing Requests" },
      { module: "billing.accounts", label: "Accounts Queue" },
      { module: "billing.operations", label: "Billing Tracker" },
      { module: "billing.proformas", label: "Proformas" },
      { module: "billing.payments", label: "Payments" },
      { module: "billing.invoices", label: "Tax Invoices" },
      { module: "billing.reports", label: "Reports" },
      { module: "billing.configure", label: "Configure" },
    ],
  },
  { module: "crm.companies", label: "Companies" },
  { module: "crm.contacts", label: "Contacts" },
  {
    module: "recruitment",
    label: "Recruitment",
    children: [
      { module: "recruitment.requisitions", label: "Requisitions" },
      { module: "recruitment.pipeline", label: "Pipeline" },
      { module: "recruitment.candidates", label: "Candidates" },
    ],
  },
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
    module: "documents",
    label: "Documents",
    children: [
      { module: "documents.my", label: "My Documents" },
      { module: "documents.employees", label: "Employees' Documents" },
    ],
  },
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

/** True when the signed-in employee has no Read on this section or tab. */
export const isSectionBlocked = (module: string): boolean => !canSection(module, "read");

/**
 * Whether a section / tab shows. Section access alone decides it; `_baseAllowed` is the older
 * per-screen answer, kept in the signature so existing menu entries need no edit.
 */
export const isSubsectionVisible = (module: string, _baseAllowed?: boolean): boolean => canSection(module, "read");

/** Whether any tab under a section is readable — a section with tabs reads as the OR of them. */
export const anyChildGranted = (parentModule: string): boolean => canSection(parentModule, "read");
