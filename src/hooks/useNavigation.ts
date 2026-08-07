import { useMemo, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
// Professional Bootstrap Icons for clean, business-focused navigation
import { permissionConstToUseWithHasPermission, uiControlResourceNameMapWithCamelCase } from '@constants/statistics';
import { hasPermission } from '@utils/authAbac';
import { can } from '@utils/can';
import { isSectionBlocked, isSubsectionVisible, anyChildGranted } from '@utils/accessAreas';
import { fetchPendingApprovals } from '@services/employee';
import { NEW_MY_TEAM_IA } from '@utils/featureFlags';
import { useRootOrgName } from './useRootOrgNames';
import { RootState } from '@redux/store';

export type NavigationItemType = 'item' | 'sub' | 'section';

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
  /**
   * SECTIONS ONLY. Keep this section even when it holds no links.
   *
   * Containers with nothing in them are dropped (useNavContainers pass 2) so an
   * application whose every module is permission-gated vanishes instead of
   * offering an empty shell. Set this only for a section that is empty BY DESIGN
   * — a department declared before its modules exist — never to paper over a
   * permission result.
   */
  allowEmpty?: boolean;
}

export function useNavigation() {
  const intl = useIntl();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  // Subscribe to capabilities + blocked sections so the menu re-evaluates
  // whenever they load or refresh (drives can() and isSectionBlocked()).
  const capabilities = useSelector((state: RootState) => (state as any).authz?.capabilities);
  const blockedSections = useSelector((state: RootState) => (state as any).authz?.blockedSections);
  // Drives the dynamic "<Org> Team" label on the Employees row (see below).
  const orgName = useRootOrgName();

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

  const menu = useMemo(() => {
    // ── Nav ORDER, labels, grouping and icons are ported verbatim from
    // `irfan-frontend-branch`'s config/navigationConfig.ts (NAV_CONFIG). The
    // permission CHECKS are this branch's own (isSectionBlocked / hasPermission /
    // can) — that branch's Visibility Layer (@utils/visibility, the access-control
    // module) does not exist here, so only the arrangement crossed over.
    //
    // Two deliberate divergences from NAV_CONFIG, both forced by what this branch has:
    //   • Its "Access Control" group (Roles · Employee Access · Audit Logs) is
    //     dropped — /access-control/* has no routes here. Roles & Permissions,
    //     this branch's equivalent admin surface, keeps its place instead.
    //   • Recruitment is kept; that branch has no recruitment module.
    const items: NavigationItem[] = [
      // Inbox leads the tree. NAV_CONFIG points it at /approvals/inbox, but under
      // NEW_MY_TEAM_IA that path is a redirect to /my-team/approvals (PrivateRoutes),
      // so the row could never match the URL and would never light up as active.
      // Target the destination directly while the flag is on.
      {
        type: 'item',
        id: 'inbox',
        to: NEW_MY_TEAM_IA ? '/my-team/approvals' : '/approvals/inbox',
        title: 'Inbox',
        fontIcon: 'bi-inbox',
        badgeCount: pendingApprovalsCount,
        visible: can('approvals.approve.team') || can('approvals.view.team'),
      },
      {
        type: 'item',
        id: 'dashboard',
        to: '/dashboard',
        title: intl.formatMessage({ id: 'MENU.DASHBOARD' }),
        fontIcon: 'bi-speedometer2',
        visible: true,
      },
      {
        type: 'item',
        id: 'admin-calendar',
        to: '/employees/calendar',
        title: 'Calendar',
        fontIcon: 'bi-calendar-event',
        visible: isSubsectionVisible('calendar', hasPermission(uiControlResourceNameMapWithCamelCase.calendar, permissionConstToUseWithHasPermission.readOthers)),
      },

      // ── HR & People ───────────────────────────────────────────────────────
      // Flat, as in NAV_CONFIG: the old "Attendance & Leaves" and "People"
      // wrapper groups are gone, and Reports no longer gets its own section
      // header — KPI lives under this one. (Finance did too, until it became an
      // application in its own right further down.)
      {
        type: 'section',
        id: 'hr-section',
        // Section ids are the stable identity (icons, workspace slugs and accents are
        // keyed off them); only the LABEL is renamed here, so /workspace/hr and every
        // bookmark to it keep working.
        title: 'HR Department',
        visible:
          !isSectionBlocked('attendance') ||
          !isSectionBlocked('users') ||
          !isSectionBlocked('settings') ||
          !isSectionBlocked('reports') ||
          (!isSectionBlocked('recruitment') && can('recruitment.view.team')) ||
          (NEW_MY_TEAM_IA && (can('approvals.view.team') || can('approvals.approve.team') || can('approvals.manage.all'))),
      },
      {
        type: 'item',
        id: 'att-personal',
        to: '/employee/attendance-and-leaves',
        title: 'My Attendance & Leaves',
        fontIcon: 'bi-calendar-check',
        visible: !isSectionBlocked('attendance') && isSubsectionVisible('attendance.personal', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'att-employees',
        to: '/employees/attendance-and-leaves',
        title: 'Attendance & Leaves',
        fontIcon: 'bi-calendar2-week',
        visible: !isSectionBlocked('attendance') && isSubsectionVisible('attendance.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
      },
      // Dynamic label, ported from that branch's `overlay()` in useNavigation.ts:
      // the row is named after the root organization ("WISETECH GROUP Team"), not
      // the generic "Employees". Falls back to "Employees" until the org resolves,
      // or if it never does — the row must never render blank or half-titled.
      {
        type: 'item',
        id: 'hr-employees',
        to: '/employees',
        title: orgName ? `${orgName} Team` : 'Employees',
        fontIcon: 'bi-people',
        visible: !isSectionBlocked('users'),
      },
      {
        type: 'item',
        id: 'hr-documents',
        to: '/employee/documents',
        title: 'Documents',
        fontIcon: 'bi-file-earmark-text',
        visible: !isSectionBlocked('users') && hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers),
      },
      {
        // Everyone's own file, alongside "My Attendance & Leaves". Deliberately
        // ungated: it resolves to the signed-in employee server-side, so there is no
        // permission to check — and the company-wide Documents entry above is the one
        // that needs the readOthers gate.
        type: 'item',
        id: 'my-documents',
        to: '/my-documents',
        title: 'My Documents',
        fontIcon: 'bi-folder2-open',
        visible: !isSectionBlocked('users'),
      },
      // Promoted out of the Organization group to top level, as in NAV_CONFIG.
      {
        type: 'item',
        id: 'hr-announcements',
        to: '/company/announcements',
        title: 'Announcements',
        fontIcon: 'bi-megaphone',
        visible: !isSectionBlocked('settings') && isSubsectionVisible('settings.announcements', hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'sub',
        id: 'hr-my-team-group',
        to: '/my-team',
        title: 'Project Team',
        fontIcon: 'bi-diagram-3',
        visible: NEW_MY_TEAM_IA && (can('approvals.view.team') || can('approvals.approve.team') || can('approvals.manage.all')),
        children: [
          { type: 'item', id: 'tm-overview', to: '/my-team/overview', title: 'Overview', visible: true },
          { type: 'item', id: 'tm-members', to: '/my-team/members', title: 'Members', visible: true },
          { type: 'item', id: 'tm-attendance', to: '/my-team/attendance', title: 'Attendance', visible: true },
          { type: 'item', id: 'tm-leaves', to: '/my-team/leaves', title: 'Leaves', visible: true },
          { type: 'item', id: 'tm-reimbursements', to: '/finance/bills', title: 'Reimbursements', visible: true },
          { type: 'item', id: 'tm-salary', to: '/my-team/salary', title: 'Salary', visible: true },
          { type: 'item', id: 'tm-tasks', to: '/my-team/tasks', title: 'Tasks', visible: true },
          { type: 'item', id: 'tm-projects', to: '/my-team/projects', title: 'Projects', visible: true },
          { type: 'item', id: 'tm-leads', to: '/my-team/leads', title: 'Leads', visible: true },
          { type: 'item', id: 'tm-approvals', to: '/my-team/approvals', title: 'Approvals', badgeCount: pendingApprovalsCount, visible: can('approvals.approve.team') },
          { type: 'item', id: 'tm-delegations', to: '/my-team/delegations', title: 'Delegations', visible: can('approvals.manage.all') },
        ]
      },
      // Pre-"My Team IA" routes. NAV_CONFIG has no equivalent (that branch shipped
      // the new IA unconditionally), but VITE_NEW_MY_TEAM_IA=false is still a
      // supported override here — without these, turning it off strands the pages.
      {
        type: 'item',
        id: 'att-team',
        to: '/approvals/my-team',
        title: 'My Team',
        fontIcon: 'bi-diagram-3',
        visible: !NEW_MY_TEAM_IA && can('approvals.view.team'),
      },
      {
        type: 'item',
        id: 'att-delegations',
        to: '/approvals/delegations',
        title: 'Delegations',
        fontIcon: 'bi-arrow-left-right',
        visible: !NEW_MY_TEAM_IA && can('approvals.manage.all'),
      },
      {
        type: 'item',
        id: 'recruitment-home',
        to: '/recruitment',
        title: 'Recruitment',
        fontIcon: 'bi-person-badge',
        visible: !isSectionBlocked('recruitment') && can('recruitment.view.team'),
      },
      {
        type: 'item',
        id: 'rep-kpi',
        to: '/employee/report/kpis',
        title: 'KPI',
        fontIcon: 'bi-bar-chart',
        visible: !isSectionBlocked('reports') && isSubsectionVisible('reports.kpi', hasPermission(uiControlResourceNameMapWithCamelCase.kpiUnderReports, permissionConstToUseWithHasPermission.readOthers)),
      },
      // Finance used to sit here as a collapsible `sub`, which made it a labelled
      // cluster inside the HR & People workspace. It is its own application now —
      // see the Finance section between Projects and Organization below.

      // ── CRM ───────────────────────────────────────────────────────────────
      {
        type: 'section',
        id: 'crm-section',
        title: 'CRM',
        visible: !isSectionBlocked('crm.leads') || !isSectionBlocked('crm.companies') || !isSectionBlocked('crm.contacts'),
      },
      {
        type: 'item',
        id: 'crm-leads',
        to: '/qc/leads',
        title: 'Leads',
        fontIcon: 'bi-megaphone',
        visible: !isSectionBlocked('crm.leads'),
      },
      {
        type: 'item',
        id: 'crm-companies',
        to: '/qc/companies',
        title: 'Companies',
        fontIcon: 'bi-building',
        visible: !isSectionBlocked('crm.companies'),
      },
      {
        type: 'item',
        id: 'crm-contacts',
        to: '/qc/contacts',
        title: 'Contacts',
        fontIcon: 'bi-person-lines-fill',
        visible: !isSectionBlocked('crm.contacts'),
      },

      // ── Project Department ────────────────────────────────────────────────
      // Organization USED to sit under this header (it preceded the next section
      // marker), which is why `settings` was part of the header's condition. It is
      // now an application of its own, below — so this header answers for its own
      // three subsections and nothing else.
      {
        type: 'section',
        id: 'projects-section',
        title: 'Project Department',
        visible: !isSectionBlocked('projects') || !isSectionBlocked('tasks') || !isSectionBlocked('timesheets'),
      },
      {
        type: 'item',
        id: 'projects-projects',
        to: '/qc/projects',
        title: 'Projects',
        fontIcon: 'bi-briefcase',
        visible: !isSectionBlocked('projects'),
      },
      {
        type: 'item',
        id: 'projects-tasks',
        to: '/tasks',
        title: 'Tasks',
        fontIcon: 'bi-check2-square',
        visible: !isSectionBlocked('tasks'),
      },
      // The "TimeSheet" wrapper group is flattened away — both timesheets are
      // top-level rows in NAV_CONFIG.
      {
        type: 'item',
        id: 'ts-my',
        to: '/tasks/timesheet',
        title: 'My Timesheet',
        fontIcon: 'bi-clock-history',
        visible: !isSectionBlocked('timesheets') && isSubsectionVisible('timesheets.my', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'ts-emp',
        to: '/tasks/employee-timesheet',
        title: 'Employees Timesheet',
        fontIcon: 'bi-clipboard-data',
        visible: !isSectionBlocked('timesheets') && isSubsectionVisible('timesheets.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
      },

      // ── Payment Department ────────────────────────────────────────────────
      // A deliberate PLACEHOLDER: it owns no routes yet, and sits between Project
      // and Finance so the department exists in the information architecture
      // before its modules do.
      //
      // `allowEmpty` is what makes it visible at all. useNavContainers drops any
      // container with no links, which is correct for every other section — an
      // application whose every module is permission-gated must vanish rather
      // than offer an empty shell. This flag is the narrow opt-out for a section
      // that is empty BY DESIGN rather than by permission, so that rule stays
      // intact for the sections it protects.
      {
        type: 'section',
        id: 'payment-section',
        title: 'Payment Department',
        visible: true,
        allowEmpty: true,
      },

      // ── Finance / Account Department ──────────────────────────────────────
      // Was a collapsible `sub` at the bottom of HR & People, so it rendered as a
      // labelled cluster inside that workspace. Loans, Reimbursements, Salary and
      // Increment are money, not people administration — and they have their own
      // `finance` permission section already, so the split follows a boundary the
      // authorization model draws anyway.
      //
      // Placed between Projects and Organization, as requested.
      //
      // The header repeats the group's `!isSectionBlocked('finance')` check: the
      // sidebar renders a section unless `visible === false`, so without it a user
      // without finance access would get a bare "Finance" heading over nothing.
      // (The workspace is safe either way — useNavContainers drops empty containers.)
      {
        type: 'section',
        id: 'finance-section',
        title: 'Finance/Account Department',
        visible: !isSectionBlocked('finance'),
      },
      // As `sub` children these rows carried no icon of their own and inherited the
      // group's glyph, which ModuleGrid does for cluster children only. Top-level
      // modules get no such fallback, so each names its own — otherwise all four
      // would render the generic folder placeholder.
      {
        type: 'item',
        id: 'fin-loans',
        to: '/finance/loans',
        title: 'Loans',
        fontIcon: 'bi-cash-stack',
        visible: !isSectionBlocked('finance') && isSubsectionVisible('finance.loans', hasPermission(uiControlResourceNameMapWithCamelCase.loanUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'fin-reimbursements',
        to: '/finance/bills',
        title: 'Reimbursements',
        fontIcon: 'bi-receipt',
        visible: !isSectionBlocked('finance') && isSubsectionVisible('finance.reimbursements', hasPermission(uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'fin-salary',
        to: '/finance/salary',
        title: 'Salary',
        fontIcon: 'bi-cash-coin',
        visible: !isSectionBlocked('finance') && isSubsectionVisible('finance.salary', hasPermission(uiControlResourceNameMapWithCamelCase.salaryUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'fin-increment',
        to: '/finance/increment',
        title: 'Increment',
        fontIcon: 'bi-graph-up-arrow',
        visible: !isSectionBlocked('finance') && isSubsectionVisible('finance.increment', hasPermission(uiControlResourceNameMapWithCamelCase.incrementUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
      },

      // ── Organization ──────────────────────────────────────────────────────
      // Was a collapsible `sub` ("Organization") sitting at the bottom of the
      // Projects section, which made it a labelled CLUSTER inside the Projects
      // workspace (useWorkspaceApps splits a container's entries into flat modules
      // then grouped clusters). It is not a facet of Projects — it is org-wide
      // configuration — so it is promoted to a section, i.e. an application of its
      // own in the rail, the dock and the launcher, with its five pages as
      // top-level modules.
      //
      // Nothing about WHO may see these rows changed: the section header carries
      // the exact condition the `sub` did, and each row keeps its own check. The
      // header's OR matters for the sidebar specifically — AsideMenuMain renders a
      // section unless `visible === false`, so without it a user with none of these
      // permissions would get a bare "Organization" heading over nothing. (The
      // workspace is safe either way: useNavContainers drops empty containers.)
      {
        type: 'section',
        id: 'organization-section',
        title: 'Organization',
        visible: !isSectionBlocked('settings') && (anyChildGranted('settings') || hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },
      // As `sub` children these rows carried no icon and inherited the group's
      // glyph (ModuleGrid does that fallback for cluster children only). Top-level
      // modules get no such fallback, so each now names its own — otherwise all
      // five would render the generic folder placeholder.
      {
        type: 'item',
        id: 'org-profile',
        to: '/company/organisation-profile',
        title: 'Organization Profile',
        fontIcon: 'bi-house-fill',
        visible: isSubsectionVisible('settings.profile', hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'org-media',
        to: '/company/media',
        title: 'Media',
        fontIcon: 'bi-images',
        visible: isSubsectionVisible('settings.media', hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },
      // Onboarding Docs moved to HR & People → Employees → Configure, alongside the
      // rest of the onboarding configuration. Listing it here as well would put the
      // same screen in two modules, which is the wandering this consolidation removes.
      // The route still resolves, so existing bookmarks keep working.
      {
        type: 'item',
        id: 'org-teams',
        to: '/company/teams',
        title: 'Teams',
        fontIcon: 'bi-people',
        visible: isSubsectionVisible('settings.teams', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'item',
        id: 'org-emp-level',
        to: '/company/employee-level-teams',
        title: 'Employee-Level',
        fontIcon: 'bi-diagram-3',
        visible: isSubsectionVisible('settings.employeeLevel', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
      },

      // ── App Settings ──────────────────────────────────────────────────────
      // Renamed from "Administration" to match NAV_CONFIG.
      {
        type: 'section',
        id: 'admin-section',
        title: 'App Settings',
        visible: !isSectionBlocked('settings'),
      },
      // Stands in for NAV_CONFIG's "Access Control" group, which has no routes here.
      {
        type: 'item',
        id: 'admin-roles-permissions',
        to: '/admin/roles-permissions',
        title: 'Roles & Permissions',
        fontIcon: 'bi-shield-lock',
        visible: !isSectionBlocked('settings'),
      },
      {
        type: 'item',
        id: 'admin-app-settings',
        to: '/admin/app-settings',
        title: 'Settings',
        fontIcon: 'bi-gear',
        visible: !isSectionBlocked('settings'),
      },
    ];

    return items;
  }, [intl, pendingApprovalsCount, capabilities, blockedSections, orgName]);

  return menu;
}
