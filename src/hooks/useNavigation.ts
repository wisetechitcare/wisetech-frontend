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
    const items: NavigationItem[] = [
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


      // HR & People
      {
        type: 'section',
        id: 'hr-section',
        title: 'HR & People',
        visible: !isSectionBlocked('users') || !isSectionBlocked('attendance') || (NEW_MY_TEAM_IA && (can('approvals.view.team') || can('approvals.approve.team') || can('approvals.manage.all'))),
      },
      {
        type: 'sub',
        id: 'hr-attendance-group',
        title: 'Attendance & Leaves',
        fontIcon: 'bi-calendar-check',
        visible: !isSectionBlocked('attendance') && (hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || anyChildGranted('attendance')),
        children: [
          {
            type: 'item',
            id: 'att-personal',
            to: '/employee/attendance-and-leaves',
            title: 'Personal',
            visible: isSubsectionVisible('attendance.personal', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'att-employees',
            to: '/employees/attendance-and-leaves',
            title: 'Employees',
            visible: isSubsectionVisible('attendance.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'att-team',
            to: '/approvals/my-team',
            title: 'My Team',
            visible: !NEW_MY_TEAM_IA && can('approvals.view.team'),
          },
          {
            type: 'item',
            id: 'att-inbox',
            to: '/approvals/inbox',
            title: 'Approval Inbox',
            badgeCount: pendingApprovalsCount,
            visible: !NEW_MY_TEAM_IA && can('approvals.approve.team'),
          },
          {
            type: 'item',
            id: 'att-delegations',
            to: '/approvals/delegations',
            title: 'Delegations',
            visible: !NEW_MY_TEAM_IA && can('approvals.manage.all'),
          },
        ]
      },
      {
        type: 'sub',
        id: 'hr-employees-group',
        title: 'People',
        fontIcon: 'bi-people',
        visible: !isSectionBlocked('users'),
        children: [
          {
            type: 'item',
            id: 'hr-employees',
            to: '/employees',
            title: 'Employees',
            visible: true,
          },
          {
            type: 'item',
            id: 'hr-documents',
            to: '/employee/documents',
            title: 'Documents',
            visible: hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers),
          }
        ]
      },

      {
        type: 'sub',
        id: 'hr-my-team-group',
        to: '/my-team',
        title: 'My Team',
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
      // Reports
      {
        type: 'section',
        id: 'reports-section',
        title: 'Reports',
        visible: !isSectionBlocked('reports'),
      },
      {
        type: 'item',
        id: 'rep-kpi',
        to: '/employee/report/kpis',
        title: 'KPI',
        fontIcon: 'bi-bar-chart',
        visible: !isSectionBlocked('reports') && isSubsectionVisible('reports.kpi', hasPermission(uiControlResourceNameMapWithCamelCase.kpiUnderReports, permissionConstToUseWithHasPermission.readOthers)),
      },

      // Finance
      {
        type: 'section',
        id: 'finance-section',
        title: 'Finance',
        visible: !isSectionBlocked('finance'),
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


      // CRM
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
      // Projects
      {
        type: 'section',
        id: 'projects-section',
        title: 'Projects',
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
      {
        type: 'sub',
        id: 'projects-timesheets',
        title: 'TimeSheet',
        fontIcon: 'bi-clock-history',
        visible: !isSectionBlocked('timesheets') && (
          isSubsectionVisible('timesheets.my', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)) ||
          isSubsectionVisible('timesheets.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers))
        ),
        children: [
          {
            type: 'item',
            id: 'ts-my',
            to: '/tasks/timesheet',
            title: 'My TimeSheet',
            visible: isSubsectionVisible('timesheets.my', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'ts-emp',
            to: '/tasks/employee-timesheet',
            title: 'Employees TimeSheet',
            visible: isSubsectionVisible('timesheets.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
        ]
      },
      // Administration
      {
        type: 'section',
        id: 'admin-section',
        title: 'Administration',
        visible: !isSectionBlocked('settings') || isSubsectionVisible('calendar', hasPermission(uiControlResourceNameMapWithCamelCase.calendar, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'sub',
        id: 'admin-org',
        to: '/company',
        title: 'Organization',
        fontIcon: 'bi-house-fill',
        visible: !isSectionBlocked('settings') && (anyChildGranted('settings') || hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
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
            id: 'org-announcements',
            to: '/company/announcements',
            title: 'Announcements',
            visible: isSubsectionVisible('settings.announcements', hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
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
      {
        type: 'item',
        id: 'admin-roles-permissions',
        to: '/admin/roles-permissions',
        title: 'Roles & Permissions',
        fontIcon: 'bi-lock',
        visible: !isSectionBlocked('settings'),
      },
      {
        type: 'item',
        id: 'admin-app-settings',
        to: '/admin/app-settings',
        title: 'App Settings',
        fontIcon: 'bi-gear',
        visible: !isSectionBlocked('settings'),
      },
    ];

    return items;
  }, [intl, pendingApprovalsCount, capabilities, blockedSections]);

  return menu;
}
