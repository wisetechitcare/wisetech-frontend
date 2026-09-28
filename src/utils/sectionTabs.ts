import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import { canTab } from "./can";

/**
 * Tabs inside a section that can be turned off for a role or a person (Access → Advanced) — e.g. a
 * data-entry clerk with Write on Leads but no Configure. A tab follows its section unless turned
 * off: Configure needs Write, the rest Read. Keep in step with the backend's SECTION_TABS.
 */
export interface SectionTab {
  key: string;
  label: string;
  icon: string;
  hint: string;
  /** A manage view (everyone's records, settings): needs Write, not just Read — as the page shows it. */
  needsWrite?: boolean;
}

const overview = (what: string): SectionTab => ({ key: "overview", label: "Overview", icon: "bi-grid-1x2", hint: `Charts and totals for ${what}` });
const map: SectionTab = { key: "map", label: "Map", icon: "bi-geo-alt", hint: "Locations on a map" };
const configure = (what: string): SectionTab => ({ key: "configure", label: "Configure", icon: "bi-gear", hint: `Statuses, types and other settings for ${what}`, needsWrite: true });

export const SECTION_TABS: Record<string, SectionTab[]> = {
  "crm.leads": [
    overview("leads"),
    { key: "leads", label: "Leads", icon: "bi-megaphone", hint: "The leads list" },
    { key: "files", label: "Files", icon: "bi-folder", hint: "Files attached to leads" },
    configure("leads"),
  ],
  projects: [
    overview("projects"),
    { key: "projects", label: "Projects", icon: "bi-briefcase", hint: "The projects list" },
    map,
    configure("projects"),
  ],
  "crm.companies": [
    overview("companies"),
    { key: "companies", label: "Companies", icon: "bi-building", hint: "The companies list" },
    map,
    configure("companies"),
  ],
  "crm.contacts": [
    overview("contacts"),
    { key: "contacts", label: "Contacts", icon: "bi-person-lines-fill", hint: "The contacts list" },
    { key: "calendar", label: "Calendar", icon: "bi-calendar-event", hint: "Contacts' birthdays and events" },
    map,
    configure("contacts"),
  ],
  // Pages whose tab bar is filtered by MaterialHeaderTab (`accessSection`): keys are the tab titles
  // as slugs (tabSlug), so a tab is found by its name.
  calendar: [
    { key: "calendar", label: "Calendar", icon: "bi-calendar-event", hint: "The shared calendar" },
    { key: "meetings", label: "Meetings", icon: "bi-people", hint: "Meetings list" },
    { key: "holidays", label: "Holidays", icon: "bi-calendar-check", hint: "Holiday list" , needsWrite: true },
    configure("the calendar"),
  ],
  "attendance.personal": [
    overview("their attendance"),
    { key: "my-attendance", label: "My Attendance", icon: "bi-calendar-check", hint: "Their check-ins" },
    { key: "my-leaves", label: "My Leaves", icon: "bi-calendar2-week", hint: "Their leave requests and balance" },
    { key: "rules", label: "Rules", icon: "bi-file-earmark-text", hint: "Attendance and leave rules" },
    { key: "faqs", label: "FAQS", icon: "bi-file-earmark-text", hint: "Common questions" },
  ],
  "attendance.employees": [
    overview("everyone's attendance"),
    { key: "individual", label: "Individual", icon: "bi-person-badge", hint: "One employee's attendance" },
    configure("attendance and leaves"),
    { key: "faqs", label: "FAQS", icon: "bi-file-earmark-text", hint: "Common questions" , needsWrite: true },
  ],
  users: [
    { key: "employees", label: "Employees", icon: "bi-people", hint: "The employee directory" },
    configure("employees"),
  ],
  tasks: [
    overview("tasks"),
    { key: "tasks", label: "Tasks", icon: "bi-check2-square", hint: "The tasks board" },
    configure("tasks"),
  ],
  "finance.salary": [
    { key: "my-salary", label: "My Salary", icon: "bi-cash-coin", hint: "Their own salary slips" },
    { key: "employee-payrolls", label: "Employee Payrolls", icon: "bi-clipboard-data", hint: "Everyone's payroll" , needsWrite: true },
    configure("salary"),
  ],
  "finance.increment": [
    { key: "my-increment", label: "My Increment", icon: "bi-graph-up-arrow", hint: "Their own increments" },
    { key: "employee-increment", label: "Employee Increment", icon: "bi-people", hint: "Everyone's increments" , needsWrite: true },
  ],
  "finance.reimbursements": [
    { key: "my-reimbursements", label: "My Reimbursements", icon: "bi-receipt", hint: "Their own claims" },
    { key: "reimbursement-details", label: "Reimbursement Details", icon: "bi-clipboard-data", hint: "Everyone's claims" , needsWrite: true },
    { key: "search-employee", label: "Search Employee", icon: "bi-people", hint: "One employee's claims" , needsWrite: true },
    { key: "payment", label: "Payment", icon: "bi-credit-card", hint: "Paying out approved claims" , needsWrite: true },
    configure("reimbursements"),
  ],
  "finance.loans": [
    { key: "personal-loans", label: "Personal Loans", icon: "bi-cash-stack", hint: "Their own loans" },
    { key: "personal-installments", label: "Personal Installments", icon: "bi-receipt", hint: "Their own installments" },
    { ...overview("everyone's loans"), needsWrite: true },
    { key: "installments", label: "Installments", icon: "bi-receipt", hint: "Everyone's installments" , needsWrite: true },
    { key: "search-employees", label: "Search Employees", icon: "bi-people", hint: "One employee's loans" , needsWrite: true },
    configure("loans"),
  ],
  "settings.profile": [
    { key: "organizations", label: "Organizations", icon: "bi-building", hint: "Organization profiles" },
    configure("the organization"),
  ],
};

/** A tab's key from its title — how MaterialHeaderTab finds a tab by name ("My Leaves" → "my-leaves"). */
export const tabSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const tabKey = (section: string, tab: string) => `${section}/${tab}`;

/**
 * For a section's page: the tabs this person gets, in page order. Subscribes to access so a live
 * change applies at once. Pages map the active tab through this list, never through fixed indexes.
 */
export const useSectionTabs = <K extends string>(section: string, keys: readonly K[]): K[] => {
  useSelector((s: RootState) => (s as any).authz);
  return keys.filter((k) => canTab(section, k));
};
