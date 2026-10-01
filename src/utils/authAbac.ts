import { store } from "@redux/store";
import { can, canSection, isFullAccess } from "./can";

/**
 * `hasPermission(resource, action, data?)` — the older screen-level check, answered by section
 * access (see @utils/can). Kept under its name because ~180 screens call it; it holds no rules of
 * its own beyond translating a resource name to its section.
 *
 *   Read  on the section → reading (`readOwn`, and `readOthers` on an "everyone" tab), and acting
 *                          on your OWN records (edit/delete own, create a leave, claim, loan, …)
 *   Write on the section → changing anyone's records, creating the section's shared things, and
 *                          `readOthers` elsewhere (a manage view: Configure, Employee Increment, …).
 *   Whose rows the server returns is decided by the role tier either way.
 */

// Resource name (resourceNameMapWithCamelCase / uiControlResourceNameMapWithCamelCase) → section.
const RESOURCE_SECTION: Record<string, string> = {
  // Screen-level resources
  attendancerequest: "attendance",
  attendancerequestlimit: "attendance",
  // The Report table shows your own days (Personal) and, from Employees, other people's — so it
  // follows SPLIT. Pinned to "attendance.employees" it hid every check-in row from an employee.
  attendancereport: "attendance",
  leave: "attendance",
  leavecashtransfer: "attendance",
  attendanceconfig: "attendance.employees",
  reimbursement: "finance.reimbursements",
  salary: "finance.salary",
  salaryconfig: "finance.salary",
  loan: "finance.loans",
  loaninstallment: "finance.loans",
  increment: "finance.increment",
  kpi: "reports.kpi",
  employee: "users",
  department: "settings",
  designation: "settings",
  branch: "settings",
  holiday: "calendar",
  onboardingdocument: "settings.onboarding",
  announcement: "settings.announcements",
  organisationprofile: "settings.profile",
  meeting: "calendar",
  event: "calendar",
  birthdays: "calendar",
  // Sidebar / tab controls
  calendar: "calendar",
  "attendanceandleaves->personal": "attendance.personal",
  "attendanceandleaves->employees": "attendance.employees",
  "people->employees": "users",
  "people->documents": "documents.employees",
  "company->organisationprofile": "settings.profile",
  "company->announcements": "settings.announcements",
  "company->branches": "settings",
  "company->departments": "settings",
  "company->designation": "settings",
  "company->media": "settings.media",
  "company->onboardingdocument": "settings.onboarding",
  "reports->holidays": "reports",
  "finance->reimbursements": "finance.reimbursements",
  "finance->salary": "finance.salary",
  "finance->increment": "finance.increment",
  "reports->kpi": "reports.kpi",
  "finance-loan": "finance.loans",
  "lead-project->companiescontact": "crm.companies",
};

// Entity tables (MaterialTableImpl's `resource`). The server already sends each person exactly the
// rows they may see, so every row shows with Read on the section — no mine/everyone split here.
const TABLE_SECTION: Record<string, string> = {
  leads: "crm.leads",
  projects: "projects",
  companies: "crm.companies",
  sub_companies: "crm.companies",
  branches: "crm.companies",
  client_contacts: "crm.contacts",
};

// Resources an employee creates for themselves, so `create` on them needs only Read.
const SELF_SERVICE = new Set(["attendancerequest", "attendancerequestlimit", "leave", "leavecashtransfer", "reimbursement", "loan", "loaninstallment", "meeting"]);

// Tabs whose whole point is other people's records.
const EVERYONE_TABS = new Set(["attendance.employees", "timesheets.employees", "users", "kpi.search", "kpi.leaderboard"]);

// Where a section splits into "mine" and "everyone", pick the tab the action is about.
const SPLIT: Record<string, { own: string; others: string }> = {
  attendance: { own: "attendance.personal", others: "attendance.employees" },
  timesheets: { own: "timesheets.my", others: "timesheets.employees" },
};

const sectionFor = (resource: string): string | null => {
  const key = resource.toLowerCase();
  if (RESOURCE_SECTION[key]) return RESOURCE_SECTION[key];
  // Dashboard widgets (dashboardattendance, dashboardtasks, …) belong to the Dashboard.
  if (key.startsWith("dashboard")) return "dashboard";
  return null;
};

export function hasPermission(resource: string, action: string, data?: any): boolean {
  const lowerAction = action?.toLowerCase() ?? "";
  const others = lowerAction.includes("other");

  // Ownership: an "own" action never applies to someone else's row, an "others" action never to
  // your own. Checked first, whatever the access.
  const targetEmployeeId = data?.employeeId?.toString();
  if (targetEmployeeId) {
    let currentEmployeeId: string | undefined;
    try {
      const emp = JSON.parse((store.getState() as any).rolesAndPermissions?.emp || "{}");
      currentEmployeeId = emp?.id?.toString();
    } catch {
      currentEmployeeId = undefined;
    }
    if (lowerAction.includes("own") && targetEmployeeId !== currentEmployeeId) return false;
    if (others && targetEmployeeId === currentEmployeeId) return false;
  }

  if (isFullAccess()) return true;

  // Approvals are not a section: approvers are granted them by the workflow setup.
  if (resource.toLowerCase() === "approvals") return can(`approvals.${others ? "view.team" : "view.self"}`);

  const tableSection = TABLE_SECTION[resource.toLowerCase()];
  if (tableSection) return canSection(tableSection, lowerAction.startsWith("read") ? "read" : "write");

  let section = sectionFor(resource);
  if (!section) return false;
  // Sidebar / tab controls ("finance->salary", "calendar", …) name their tab outright and are
  // always asked with `readOthers`, meaning "show this item" — no mine/everyone reading applies.
  const navControl = resource.includes("->") || resource === "finance-loan" || resource === "calendar";
  const reading = lowerAction.startsWith("read") || lowerAction.startsWith("view");
  if (navControl) return canSection(section, reading ? "read" : "write");

  if (SPLIT[section]) section = others ? SPLIT[section].others : SPLIT[section].own;
  if (!reading) {
    // Your own records need only Read: editing or deleting your own row, and creating one where
    // what you create is your own (a leave, a claim, a loan application, a meeting).
    const ownRecord = lowerAction.includes("own") || (lowerAction === "create" && SELF_SERVICE.has(resource.toLowerCase()));
    return canSection(section, ownRecord ? "read" : "write");
  }
  // Looking at other people's records is what a "manage" view does (Configure, Employee Increment,
  // …), so it needs Write — except on a tab that IS the everyone view, where Read is the point.
  if (others && !EVERYONE_TABS.has(section)) return canSection(section, "write");
  return canSection(section, "read");
}
