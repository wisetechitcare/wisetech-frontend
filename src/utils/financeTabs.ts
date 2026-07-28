/**
 * Finance tab catalog — the single source of truth for the per-tab access model.
 *
 * Each finance section (Salary / Reimbursements / Loans / Increment) has tabs.
 * Every tab maps to TWO permission keys:
 *   • viewKey — reveals the tab (read-only).
 *   • editKey — reveals the tab's action/edit buttons (create/update/approve/pay…).
 *              Omitted for a tab that has no write surface (e.g. "My Salary").
 *
 * Used by BOTH the Employee-Access override editor (to grant a tab View/Edit for
 * one employee) and the finance pages (to gate the tab + its action buttons). One
 * catalog keeps editor ⇄ runtime perfectly consistent. Keys are canonical
 * `module.action.scope`; a per-employee override just writes these as UserPermission
 * rows, so `can()` resolves them exactly like a role grant.
 */
import { can } from '@utils/can';

export interface FinanceTabDef {
  /** Stable id (used as the override row id + React key). */
  id: string;
  /** Tab label shown in the editor + the page. */
  title: string;
  /** The finance subsection module this tab belongs to. */
  module: string;
  /** Permission that reveals the tab (read-only). */
  viewKey: string;
  /** Permission that reveals the tab's action/edit buttons (absent = view-only tab). */
  editKey?: string;
}

export interface FinanceSectionDef {
  /** The subsection module (matches ACCESS_AREAS / the sidebar). */
  module: string;
  /** Section label. */
  label: string;
  tabs: FinanceTabDef[];
}

export const FINANCE_TAB_CATALOG: FinanceSectionDef[] = [
  {
    module: 'finance.salary',
    label: 'Salary',
    tabs: [
      { id: 'salary.my', title: 'My Salary', module: 'finance.salary', viewKey: 'finance.salary.view.self' },
      { id: 'salary.payrolls', title: 'Employee Payrolls', module: 'finance.salary', viewKey: 'finance.salary.view.all', editKey: 'finance.salary.update.all' },
      { id: 'salary.search', title: 'Search Employee', module: 'finance.salary', viewKey: 'finance.salary.manage.all', editKey: 'finance.salary.manage.all' },
      { id: 'salary.configure', title: 'Configure', module: 'finance.salary', viewKey: 'finance.salary.manage.all', editKey: 'finance.salary.manage.all' },
    ],
  },
  {
    module: 'finance.reimbursements',
    label: 'Reimbursements',
    tabs: [
      { id: 'reimb.my', title: 'My Reimbursements', module: 'finance.reimbursements', viewKey: 'finance.reimbursements.view.self', editKey: 'finance.reimbursements.create.self' },
      { id: 'reimb.employees', title: 'Employees Reimbursements', module: 'finance.reimbursements', viewKey: 'finance.reimbursements.view.all', editKey: 'finance.reimbursements.update.all' },
      { id: 'reimb.payment', title: 'Payment', module: 'finance.reimbursements', viewKey: 'finance.reimbursements.approve.all', editKey: 'finance.reimbursements.approve.all' },
      { id: 'reimb.search', title: 'Search Employee', module: 'finance.reimbursements', viewKey: 'finance.reimbursements.manage.all', editKey: 'finance.reimbursements.manage.all' },
      { id: 'reimb.configure', title: 'Configure', module: 'finance.reimbursements', viewKey: 'finance.reimbursements.manage.all', editKey: 'finance.reimbursements.manage.all' },
    ],
  },
  {
    module: 'finance.loans',
    label: 'Loans',
    tabs: [
      { id: 'loans.my', title: 'My Loans', module: 'finance.loans', viewKey: 'finance.loans.view.self', editKey: 'finance.loans.create.self' },
      { id: 'loans.overview', title: 'Overview', module: 'finance.loans', viewKey: 'finance.loans.view.all', editKey: 'finance.loans.update.all' },
      { id: 'loans.installments', title: 'Installments', module: 'finance.loans', viewKey: 'finance.loans.view.all', editKey: 'finance.loans.update.all' },
      { id: 'loans.search', title: 'Search Employees', module: 'finance.loans', viewKey: 'finance.loans.manage.all', editKey: 'finance.loans.manage.all' },
      { id: 'loans.configure', title: 'Configure', module: 'finance.loans', viewKey: 'finance.loans.manage.all', editKey: 'finance.loans.manage.all' },
    ],
  },
  {
    module: 'finance.increment',
    label: 'Increment',
    tabs: [
      { id: 'increment.my', title: 'My Increment', module: 'finance.increment', viewKey: 'finance.increment.view.self' },
      { id: 'increment.employees', title: 'Employee Increment', module: 'finance.increment', viewKey: 'finance.increment.view.all', editKey: 'finance.increment.update.all' },
    ],
  },
];

/** Flat list of every finance tab across all sections. */
export const ALL_FINANCE_TABS: FinanceTabDef[] = FINANCE_TAB_CATALOG.flatMap((s) => s.tabs);

const TAB_BY_ID: Map<string, FinanceTabDef> = new Map(ALL_FINANCE_TABS.map((t) => [t.id, t]));

/** Look up a tab definition by its catalog id. */
export const financeTab = (id: string): FinanceTabDef | undefined => TAB_BY_ID.get(id);

/**
 * The flat-`finance` equivalent of a subsection key, e.g.
 *   finance.salary.view.self  →  finance.view.self
 * Admins/Managers hold FLAT `finance.*` (not the subsections), so a tab check must
 * accept either the subsection grant (employee override / Accountant) OR the flat
 * grant (admin). `can()` handles scope-widening, so a `.global` flat grant covers it.
 */
const flatFinanceKey = (key: string): string => {
  const parts = key.split('.');
  const action = parts[parts.length - 2];
  const scope = parts[parts.length - 1];
  return `finance.${action}.${scope}`;
};

const holds = (key: string): boolean => can(key) || can(flatFinanceKey(key));

/**
 * Can the current user SEE this tab? Holds its view key (subsection) OR the flat
 * finance equivalent. Reads live capabilities via `can()`, so it reflects role
 * grants AND per-employee overrides. Pass a tab id or a tab def.
 */
export const canViewFinanceTab = (idOrTab: string | FinanceTabDef): boolean => {
  const t = typeof idOrTab === 'string' ? TAB_BY_ID.get(idOrTab) : idOrTab;
  return !!t && holds(t.viewKey);
};

/**
 * Can the current user use this tab's ACTION/EDIT buttons? Holds its edit key
 * (subsection or flat). A view-only tab (no editKey) always returns false. Gate
 * create/update/delete/approve/pay buttons on this so a "View" grant is read-only.
 */
export const canEditFinanceTab = (idOrTab: string | FinanceTabDef): boolean => {
  const t = typeof idOrTab === 'string' ? TAB_BY_ID.get(idOrTab) : idOrTab;
  return !!(t && t.editKey && holds(t.editKey));
};

/** Every distinct permission key the catalog references (view + edit). */
export const FINANCE_TAB_KEYS: string[] = Array.from(
  new Set(ALL_FINANCE_TABS.flatMap((t) => [t.viewKey, ...(t.editKey ? [t.editKey] : [])])),
);
