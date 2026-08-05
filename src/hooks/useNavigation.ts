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
      // wrapper groups are gone, and Reports/Finance no longer get their own
      // section headers — KPI and Finance live under this one.
      {
        type: 'section',
        id: 'hr-section',
        title: 'HR & People',
        visible:
          !isSectionBlocked('attendance') ||
          !isSectionBlocked('users') ||
          !isSectionBlocked('settings') ||
          !isSectionBlocked('reports') ||
          !isSectionBlocked('finance') ||
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
      {
        type: 'sub',
        id: 'finance-group',
        title: 'Finance',
        fontIcon: 'bi-cash-coin',
        visible: !isSectionBlocked('finance'),
        children: [
          {
            type: 'item',
            id: 'fin-loans',
            to: '/finance/loans',
            title: 'Loans',
            visible: isSubsectionVisible('finance.loans', hasPermission(uiControlResourceNameMapWithCamelCase.loanUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-reimbursements',
            to: '/finance/bills',
            title: 'Reimbursements',
            visible: isSubsectionVisible('finance.reimbursements', hasPermission(uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-salary',
            to: '/finance/salary',
            title: 'Salary',
            visible: isSubsectionVisible('finance.salary', hasPermission(uiControlResourceNameMapWithCamelCase.salaryUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-increment',
            to: '/finance/increment',
            title: 'Increment',
            visible: isSubsectionVisible('finance.increment', hasPermission(uiControlResourceNameMapWithCamelCase.incrementUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
        ]
      },

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

      // ── Projects ──────────────────────────────────────────────────────────
      // Organization sits under this header in NAV_CONFIG (it precedes the next
      // section marker), so `settings` is part of the header's condition — without
      // it the group could render with no heading above it.
      {
        type: 'section',
        id: 'projects-section',
        title: 'Projects',
        visible: !isSectionBlocked('projects') || !isSectionBlocked('tasks') || !isSectionBlocked('timesheets') || !isSectionBlocked('settings'),
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
      {
        type: 'sub',
        id: 'admin-org',
        to: '/company',
        title: 'Organization',
        fontIcon: 'bi-house-fill',
        // Announcements left this group for top level, so it no longer counts
        // toward whether the group has anything to show.
        visible: !isSectionBlocked('settings') && (anyChildGranted('settings') || hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
        children: [
          {
            type: 'item',
            id: 'org-profile',
            to: '/company/organisation-profile',
            title: 'Organization Profile',
            visible: isSubsectionVisible('settings.profile', hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-media',
            to: '/company/media',
            title: 'Media',
            visible: isSubsectionVisible('settings.media', hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-onboarding',
            to: '/company/onboardingDocs',
            title: 'Onboarding Docs',
            visible: isSubsectionVisible('settings.onboarding', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-teams',
            to: '/company/teams',
            title: 'Teams',
            visible: isSubsectionVisible('settings.teams', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-emp-level',
            to: '/company/employee-level-teams',
            title: 'Employee-Level',
            visible: isSubsectionVisible('settings.employeeLevel', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
        ]
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
