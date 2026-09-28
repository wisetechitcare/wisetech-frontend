import { ACCESS_AREAS, AccessArea } from "./accessAreas";

/**
 * The access editor laid out like the sidebar — same departments, same order, same icons, same
 * page names — so what an admin ticks reads as "which parts of the menu this person gets".
 *
 * Display only: which sections exist and how they roll up is ACCESS_AREAS (mirrored by the
 * backend). Every ACCESS_AREAS leaf appears here exactly once (accessSidebarLayout.test.ts).
 * Group ids are the sidebar's section ids, so icons and accents come from the same maps.
 */

export interface AccessLayoutNode {
  /** The section key (a leaf), or a parent section whose tabs are listed under it. */
  module: string;
  label: string;
  /** Bootstrap-icon name, as on the sidebar entry. */
  icon: string;
  children?: AccessLayoutNode[];
  /**
   * Show as ONE card / row whose tabs are its children, set under Advanced — like Leads, though each
   * tab here is a section of its own (the card's Read / Write set them all; Advanced turns one off).
   */
  composite?: boolean;
  /** One line on what a tab holds (Advanced dialog). */
  hint?: string;
  /** Not a section at all: who has it is fixed (e.g. "Admin and above"), shown, never ticked. */
  fixed?: string;
}

export interface AccessLayoutGroup {
  /** Sidebar section id (useNavigation `type: 'section'`), e.g. 'hr-section'. */
  id: string;
  title: string;
  items: AccessLayoutNode[];
}

const area = (module: string): AccessArea | undefined => {
  const find = (as: AccessArea[]): AccessArea | undefined => {
    for (const a of as) {
      if (a.module === module) return a;
      const hit = a.children && find(a.children);
      if (hit) return hit;
    }
    return undefined;
  };
  return find(ACCESS_AREAS);
};

// A sidebar entry that opens a module with tabs of its own (Billing, Recruitment, KPI): its tabs,
// named as in ACCESS_AREAS.
const withTabs = (module: string, label: string, icon: string): AccessLayoutNode => ({
  module,
  label,
  icon,
  children: (area(module)?.children ?? []).map((c) => ({ module: c.module, label: c.label, icon: "bi-dot" })),
});

export const ACCESS_SIDEBAR_LAYOUT: AccessLayoutGroup[] = [
  {
    id: "general-section",
    title: "Overview",
    items: [
      { module: "dashboard", label: "Dashboard", icon: "bi-speedometer2" },
      { module: "calendar", label: "Calendar", icon: "bi-calendar-event" },
    ],
  },
  {
    id: "hr-section",
    title: "HR Department",
    items: [
      { module: "attendance.personal", label: "My Attendance & Leaves", icon: "bi-calendar-check" },
      { module: "attendance.employees", label: "Attendance & Leaves", icon: "bi-calendar2-week" },
      { module: "users", label: "Employees", icon: "bi-people" },
      { module: "documents.employees", label: "Documents", icon: "bi-file-earmark-text" },
      { module: "documents.my", label: "My Documents", icon: "bi-folder2-open" },
      { module: "settings.announcements", label: "Announcements", icon: "bi-megaphone" },
      withTabs("recruitment", "Recruitment", "bi-person-badge"),
      {
        module: "reports.kpi",
        label: "KPI",
        icon: "bi-bar-chart",
        composite: true,
        children: [
          { module: "kpi.my", label: "My KPI", icon: "bi-graph-up-arrow", hint: "Their own KPI scores" },
          { module: "kpi.search", label: "Search Employees", icon: "bi-people", hint: "Anyone's KPI scores" },
          { module: "kpi.leaderboard", label: "Leaderboard", icon: "bi-bar-chart", hint: "Everyone's ranking" },
          { module: "kpi.configure", label: "Configure", icon: "bi-gear", hint: "KPI factors and scoring — needs Write" },
        ],
      },
    ],
  },
  {
    id: "crm-section",
    title: "CRM",
    items: [
      { module: "crm.leads", label: "Leads", icon: "bi-megaphone" },
      { module: "crm.companies", label: "Companies", icon: "bi-building" },
      { module: "crm.contacts", label: "Contacts", icon: "bi-person-lines-fill" },
    ],
  },
  {
    id: "projects-section",
    title: "Project Department",
    items: [
      { module: "projects", label: "Projects", icon: "bi-briefcase" },
      { module: "tasks", label: "Tasks", icon: "bi-check2-square" },
      { module: "timesheets.my", label: "My Timesheet", icon: "bi-clock-history" },
      { module: "timesheets.employees", label: "Employees Timesheet", icon: "bi-clipboard-data" },
    ],
  },
  {
    id: "finance-section",
    title: "Finance/Account Department",
    items: [
      withTabs("billing", "Billing", "bi-receipt-cutoff"),
      { module: "finance.reimbursements", label: "Reimbursements", icon: "bi-receipt" },
      { module: "finance.salary", label: "Salary", icon: "bi-cash-coin" },
      { module: "finance.increment", label: "Increment", icon: "bi-graph-up-arrow" },
      { module: "finance.loans", label: "Loans", icon: "bi-cash-stack" },
    ],
  },
  {
    id: "organization-section",
    title: "Organization",
    items: [
      { module: "settings.profile", label: "Organization Profile", icon: "bi-house-fill" },
      { module: "settings.media", label: "Media", icon: "bi-images" },
      { module: "settings.teams", label: "Teams", icon: "bi-people" },
      { module: "settings.employeeLevel", label: "Employee-Level", icon: "bi-diagram-3" },
      { module: "settings.onboarding", label: "Onboarding Docs", icon: "bi-file-earmark-text" },
    ],
  },
  {
    id: "admin-section",
    title: "App Settings",
    items: [
      // Managing roles and access is a tier, never a checkbox — shown so the picture is complete.
      { module: "app.roles-permissions", label: "Roles & Permissions", icon: "bi-shield-lock", fixed: "Admin and above" },
    ],
  },
];

/** The leaf sections under a layout node (itself, when it is one; none for a fixed entry). */
export const layoutLeaves = (n: AccessLayoutNode): string[] =>
  n.fixed ? [] : n.children?.length ? n.children.flatMap(layoutLeaves) : [n.module];
