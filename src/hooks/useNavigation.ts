import { useMemo, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
// Professional Bootstrap Icons for clean, business-focused navigation
import { can } from '@utils/can';
import { useVisibility, type VisibilityReq } from '@utils/visibility';
import { fetchPendingApprovals } from '@services/employee';
import { fetchOrganizationNames } from '@services/company';
import { RootState } from '@redux/store';

export type NavigationItemType = 'item' | 'sub' | 'section';

/** A raw nav node — declares its visibility REQUIREMENT; `visible` is derived. */
interface RawNav {
  type: NavigationItemType;
  id: string;
  title: string;
  to?: string;
  icon?: any;
  activeIcon?: any;
  fontIcon?: string;
  badgeCount?: number;
  hasBullet?: boolean;
  /** What the user must be able to SEE for this item to render (Visibility Layer). */
  req: VisibilityReq;
  children?: RawNav[];
}

export interface NavigationItem {
  type: NavigationItemType;
  id: string;
  title: string;
  to?: string;
  icon?: any;
  activeIcon?: any;
  fontIcon?: string;
  badgeCount?: number;
  hasBullet?: boolean;
  children?: NavigationItem[];
  visible?: boolean;
}

export function useNavigation() {
  const intl = useIntl();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Subscribe to capabilities + blocked sections so the menu re-evaluates whenever
  // they load or refresh. All visibility now flows through the Visibility Layer.
  const capabilities = useSelector((state: RootState) => (state as any).authz?.capabilities);
  const blockedSections = useSelector((state: RootState) => (state as any).authz?.blockedSections);
  const vis = useVisibility();
  const [orgName, setOrgName] = useState('');

  useEffect(() => {
    if (!can('approvals.approve.team')) {
      setPendingApprovalsCount(0);
      return;
    }
    fetchPendingApprovals()
      .then((res: any) => {
        const records = res?.data ?? res ?? [];
        setPendingApprovalsCount(Array.isArray(records) ? records.length : 0);
      })
      .catch(() => setPendingApprovalsCount(0));
  }, [capabilities]);

  // Root organization name for the "<Org> Team" label (authenticated, no capability).
  useEffect(() => {
    fetchOrganizationNames()
      .then((res: any) => {
        const orgs = res?.data?.organizations ?? [];
        const root = (Array.isArray(orgs) ? orgs : []).find((o: any) => !o?.parentOrganizationId);
        if (root?.name) setOrgName(root.name);
      })
      .catch(() => { /* non-fatal — keep the fallback label */ });
  }, []);

  const menu = useMemo(() => {
    // Every item declares a permission REQUIREMENT (RULE 1: No View = No Feature).
    // "self" items require the module's own-scope view; "others" items require the
    // team-or-broader view; admin-only items require the admin module. Genuinely
    // universal items (Inbox, Dashboard) are declared 'universal' — a deliberate
    // decision in the layer, not a hardcoded `true`.
    const raw: RawNav[] = [
      { type: 'item', id: 'inbox', to: '/approvals/inbox', title: 'Inbox', fontIcon: 'bi-inbox', badgeCount: pendingApprovalsCount, req: 'universal' },
      { type: 'item', id: 'dashboard', to: '/dashboard', title: intl.formatMessage({ id: 'MENU.DASHBOARD' }), fontIcon: 'bi-speedometer2', req: 'universal' },
      { type: 'item', id: 'admin-calendar', to: '/employees/calendar', title: 'Calendar', fontIcon: 'bi-calendar-event', req: { module: 'calendar' } },

      // ── HR & People ─────────────────────────────────────────────
      { type: 'section', id: 'hr-section', title: 'HR & People', req: 'universal' },
      { type: 'item', id: 'att-personal', to: '/employee/attendance-and-leaves', title: 'My Attendance & Leaves', fontIcon: 'bi-calendar-check', req: { anyOf: [{ capability: 'attendance.view.self' }, { capability: 'leaves.view.self' }] } },
      { type: 'item', id: 'att-employees', to: '/employees/attendance-and-leaves', title: 'Attendance & Leaves', fontIcon: 'bi-calendar2-week', req: { capability: 'attendance.view.team' } },
      { type: 'item', id: 'hr-employees', to: '/employees', title: orgName ? `${orgName} Team` : 'Employees', fontIcon: 'bi-people', req: { capability: 'users.view.team' } },
      { type: 'item', id: 'hr-documents', to: '/employee/documents', title: 'Documents', fontIcon: 'bi-file-earmark-text', req: { capability: 'users.view.team' } },
      { type: 'item', id: 'hr-announcements', to: '/company/announcements', title: 'Announcements', fontIcon: 'bi-megaphone', req: { module: 'settings' } },
      {
        type: 'sub', id: 'hr-my-team-group', to: '/my-team', title: 'Project Team', fontIcon: 'bi-diagram-3',
        req: { anyOf: [{ capability: 'approvals.view.team' }, { capability: 'approvals.approve.team' }, { capability: 'approvals.manage.all' }] },
        children: [
          { type: 'item', id: 'tm-overview', to: '/my-team/overview', title: 'Overview', req: 'universal' },
          { type: 'item', id: 'tm-members', to: '/my-team/members', title: 'Members', req: 'universal' },
          { type: 'item', id: 'tm-attendance', to: '/my-team/attendance', title: 'Attendance', req: 'universal' },
          { type: 'item', id: 'tm-leaves', to: '/my-team/leaves', title: 'Leaves', req: 'universal' },
          { type: 'item', id: 'tm-reimbursements', to: '/finance/bills', title: 'Reimbursements', req: 'universal' },
          { type: 'item', id: 'tm-salary', to: '/my-team/salary', title: 'Salary', req: 'universal' },
          { type: 'item', id: 'tm-tasks', to: '/my-team/tasks', title: 'Tasks', req: 'universal' },
          { type: 'item', id: 'tm-projects', to: '/my-team/projects', title: 'Projects', req: 'universal' },
          { type: 'item', id: 'tm-leads', to: '/my-team/leads', title: 'Leads', req: 'universal' },
          { type: 'item', id: 'tm-approvals', to: '/my-team/approvals', title: 'Approvals', badgeCount: pendingApprovalsCount, req: { capability: 'approvals.approve.team' } },
          { type: 'item', id: 'tm-delegations', to: '/my-team/delegations', title: 'Delegations', req: { capability: 'approvals.manage.all' } },
        ],
      },

      { type: 'item', id: 'rep-kpi', to: '/employee/report/kpis', title: 'KPI', fontIcon: 'bi-bar-chart', req: { module: 'kpi' } },

      {
        // Each Finance subsection gates on its OWN module (a role can be scoped to
        // just some of them, e.g. Accountant → Salary + Reimbursements). "Own" is
        // meaningful here (Salary·Own → My Salary), so { module } (view at any
        // scope) is used; the parent-fallback lets a `finance.*` umbrella grant
        // light up all four.
        type: 'sub', id: 'finance-group', title: 'Finance', fontIcon: 'bi-cash-coin',
        req: { anyOf: [{ module: 'finance.loans' }, { module: 'finance.reimbursements' }, { module: 'finance.salary' }, { module: 'finance.increment' }] },
        children: [
          { type: 'item', id: 'fin-loans', to: '/finance/loans', title: 'Loans', req: { module: 'finance.loans' } },
          { type: 'item', id: 'fin-reimbursements', to: '/finance/bills', title: 'Reimbursements', req: { module: 'finance.reimbursements' } },
          { type: 'item', id: 'fin-salary', to: '/finance/salary', title: 'Salary', req: { module: 'finance.salary' } },
          { type: 'item', id: 'fin-increment', to: '/finance/increment', title: 'Increment', req: { module: 'finance.increment' } },
        ],
      },

      // ── CRM ─────────────────────────────────────────────────────
      { type: 'section', id: 'crm-section', title: 'CRM', req: { anyOf: [{ capability: 'crm.leads.view.team' }, { capability: 'crm.companies.view.team' }, { capability: 'crm.contacts.view.team' }] } },
      { type: 'item', id: 'crm-leads', to: '/qc/leads', title: 'Leads', fontIcon: 'bi-megaphone', req: { capability: 'crm.leads.view.team' } },
      { type: 'item', id: 'crm-companies', to: '/qc/companies', title: 'Companies', fontIcon: 'bi-building', req: { capability: 'crm.companies.view.team' } },
      { type: 'item', id: 'crm-contacts', to: '/qc/contacts', title: 'Contacts', fontIcon: 'bi-person-lines-fill', req: { capability: 'crm.contacts.view.team' } },

      // ── Projects ────────────────────────────────────────────────
      { type: 'section', id: 'projects-section', title: 'Projects', req: { anyOf: [{ module: 'projects' }, { module: 'tasks' }, { module: 'timesheets' }] } },
      { type: 'item', id: 'projects-projects', to: '/qc/projects', title: 'Projects', fontIcon: 'bi-briefcase', req: { module: 'projects' } },
      { type: 'item', id: 'projects-tasks', to: '/tasks', title: 'Tasks', fontIcon: 'bi-check2-square', req: { module: 'tasks' } },
      { type: 'item', id: 'ts-my', to: '/tasks/timesheet', title: 'My Timesheet', fontIcon: 'bi-clock-history', req: { module: 'timesheets' } },
      { type: 'item', id: 'ts-emp', to: '/tasks/employee-timesheet', title: 'Employees Timesheet', fontIcon: 'bi-clipboard-data', req: { capability: 'timesheets.view.team' } },

      // Organization — admin
      {
        type: 'sub', id: 'admin-org', to: '/company', title: 'Organization', fontIcon: 'bi-house-fill',
        req: { module: 'settings' },
        children: [
          { type: 'item', id: 'org-profile', to: '/company/organisation-profile', title: 'Organization Profile', req: { module: 'settings' } },
          { type: 'item', id: 'org-media', to: '/company/media', title: 'Media', req: { module: 'settings' } },
          { type: 'item', id: 'org-onboarding', to: '/company/onboardingDocs', title: 'Onboarding Docs', req: { module: 'settings' } },
          { type: 'item', id: 'org-teams', to: '/company/teams', title: 'Teams', req: { module: 'settings' } },
          { type: 'item', id: 'org-emp-level', to: '/company/employee-level-teams', title: 'Employee-Level', req: { module: 'settings' } },
        ],
      },

      // Access Control — one module identifier everywhere (accesscontrol.*).
      {
        type: 'sub', id: 'access-control', to: '/access-control', title: 'Access Control', fontIcon: 'bi-shield-lock',
        req: { capability: 'accesscontrol.view.all' },
        children: [
          { type: 'item', id: 'ac-roles', to: '/access-control/roles', title: 'Roles', req: { capability: 'accesscontrol.view.all' } },
          { type: 'item', id: 'ac-employees', to: '/access-control/employees', title: 'Employee Access', req: { capability: 'accesscontrol.view.all' } },
          { type: 'item', id: 'ac-audit', to: '/access-control/audit', title: 'Audit Logs', req: { capability: 'accesscontrol.view.all' } },
        ],
      },

      // ── App Settings ────────────────────────────────────────────
      { type: 'section', id: 'admin-section', title: 'App Settings', req: { module: 'settings' } },
      { type: 'item', id: 'admin-app-settings', to: '/admin/app-settings', title: 'Settings', fontIcon: 'bi-gear', req: { module: 'settings' } },
    ];

    // ── Resolve visibility + auto-collapse ─────────────────────────────────────
    // 1) Each node's own requirement. 2) A group is hidden when it has no visible
    // child (auto-collapse). 3) A section header is hidden when no visible item
    // follows it before the next section. "No View = No Feature", consistently.
    const resolve = (n: RawNav): NavigationItem => {
      const selfVisible = vis.canSee(n.req);
      if (n.children) {
        const children = n.children.map(resolve);
        const anyChild = children.some((c) => c.visible);
        return { ...stripReq(n), children, visible: selfVisible && anyChild };
      }
      return { ...stripReq(n), visible: selfVisible };
    };

    const resolved = raw.map(resolve);

    // Section headers: visible only if a following item (until the next section) is.
    return resolved.map((it, idx) => {
      if (it.type !== 'section') return it;
      let anyFollowing = false;
      for (let j = idx + 1; j < resolved.length; j++) {
        if (resolved[j].type === 'section') break;
        if (resolved[j].visible) { anyFollowing = true; break; }
      }
      return { ...it, visible: it.visible && anyFollowing };
    });
  }, [intl, pendingApprovalsCount, capabilities, blockedSections, orgName, vis]);

  return menu;
}

/** Drop the internal `req` field so the public NavigationItem shape is unchanged. */
function stripReq(n: RawNav): Omit<NavigationItem, 'visible' | 'children'> {
  const { req, children, ...rest } = n; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}
