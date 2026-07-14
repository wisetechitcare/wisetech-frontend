import { useMemo, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { sidePanelIcons } from '../_metronic/assets/sidepanelicons/index';
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
        icon: sidePanelIcons.dashboard.default,
        activeIcon: sidePanelIcons.dashboard.active,
        title: intl.formatMessage({ id: 'MENU.DASHBOARD' }),
        fontIcon: 'bi-app-indicator',
        visible: true,
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
        icon: sidePanelIcons.attendance,
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('attendance') && (hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers) || anyChildGranted('attendance')),
        children: [
          {
            type: 'item',
            id: 'att-personal',
            to: '/employee/attendance-and-leaves',
            title: 'Personal',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('attendance.personal', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'att-employees',
            to: '/employees/attendance-and-leaves',
            title: 'Employees',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('attendance.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'att-team',
            to: '/approvals/my-team',
            title: 'My Team',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: !NEW_MY_TEAM_IA && can('approvals.view.team'),
          },
          {
            type: 'item',
            id: 'att-inbox',
            to: '/approvals/inbox',
            title: 'Approval Inbox',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            badgeCount: pendingApprovalsCount,
            visible: !NEW_MY_TEAM_IA && can('approvals.approve.team'),
          },
          {
            type: 'item',
            id: 'att-delegations',
            to: '/approvals/delegations',
            title: 'Delegations',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: !NEW_MY_TEAM_IA && can('approvals.manage.all'),
          },
        ]
      },
      {
        type: 'sub',
        id: 'hr-employees-group',
        title: 'People',
        icon: sidePanelIcons.people,
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('users'),
        children: [
          {
            type: 'item',
            id: 'hr-employees',
            to: '/employees',
            title: 'Employees',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: true,
          },
          {
            type: 'item',
            id: 'hr-documents',
            to: '/employee/documents',
            title: 'Documents',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: hasPermission(uiControlResourceNameMapWithCamelCase.documentsUnderPeople, permissionConstToUseWithHasPermission.readOthers),
          }
        ]
      },
    
      {
        type: 'sub',
        id: 'hr-my-team-group',
        to: '/my-team',
        title: 'My Team',
        icon: sidePanelIcons.people,
        fontIcon: 'bi-layers',
        visible: NEW_MY_TEAM_IA && (can('approvals.view.team') || can('approvals.approve.team') || can('approvals.manage.all')),
        children: [
          { type: 'item', id: 'tm-overview', to: '/my-team/overview', title: 'Overview', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-members', to: '/my-team/members', title: 'Members', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-attendance', to: '/my-team/attendance', title: 'Attendance', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-leaves', to: '/my-team/leaves', title: 'Leaves', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-reimbursements', to: '/finance/bills', title: 'Reimbursements', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-salary', to: '/my-team/salary', title: 'Salary', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-tasks', to: '/my-team/tasks', title: 'Tasks', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-projects', to: '/my-team/projects', title: 'Projects', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-leads', to: '/my-team/leads', title: 'Leads', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: true },
          { type: 'item', id: 'tm-approvals', to: '/my-team/approvals', title: 'Approvals', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', badgeCount: pendingApprovalsCount, visible: can('approvals.approve.team') },
          { type: 'item', id: 'tm-delegations', to: '/my-team/delegations', title: 'Delegations', icon: sidePanelIcons.rectangle.default, activeIcon: sidePanelIcons.rectangle.active, fontIcon: 'bi-layers', visible: can('approvals.manage.all') },
        ]
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
        icon: sidePanelIcons.finance,
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('finance'),
        children: [
          {
            type: 'item',
            id: 'fin-loans',
            to: '/finance/loans',
            title: 'Loans',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'price-tag',
            visible: isSubsectionVisible('finance.loans', hasPermission(uiControlResourceNameMapWithCamelCase.loanUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-reimbursements',
            to: '/finance/bills',
            title: 'Reimbursements',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'price-tag',
            visible: isSubsectionVisible('finance.reimbursements', hasPermission(uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-salary',
            to: '/finance/salary',
            title: 'Salary',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'dollar',
            visible: isSubsectionVisible('finance.salary', hasPermission(uiControlResourceNameMapWithCamelCase.salaryUnderFinance, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'fin-increment',
            to: '/finance/increment',
            title: 'Increment',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'dollar',
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
        icon: sidePanelIcons.leads.default,
        activeIcon: sidePanelIcons.leads.active,
        title: 'Leads',
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('crm.leads'),
      },
      {
        type: 'item',
        id: 'crm-companies',
        to: '/qc/companies',
        icon: sidePanelIcons.companiesIcon.default,
        activeIcon: sidePanelIcons.companiesIcon.active,
        title: 'Companies',
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('crm.companies'),
      },
      {
        type: 'item',
        id: 'crm-contacts',
        to: '/qc/contacts',
        icon: sidePanelIcons.contactsIcon.default,
        activeIcon: sidePanelIcons.contactsIcon.active,
        title: 'Contacts',
        fontIcon: 'bi-layers',
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
        icon: sidePanelIcons.projects.default,
        activeIcon: sidePanelIcons.projects.active,
        title: 'Projects',
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('projects'),
      },
      {
        type: 'item',
        id: 'projects-tasks',
        to: '/tasks',
        icon: sidePanelIcons.projects.default,
        activeIcon: sidePanelIcons.projects.active,
        title: 'Tasks',
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('tasks'),
      },
      {
        type: 'sub',
        id: 'projects-timesheets',
        title: 'TimeSheet',
        icon: sidePanelIcons.timeTracker.default,
        fontIcon: 'bi-layers',
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
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('timesheets.my', hasPermission(uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'ts-emp',
            to: '/tasks/employee-timesheet',
            title: 'Employees TimeSheet',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('timesheets.employees', hasPermission(uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves, permissionConstToUseWithHasPermission.readOthers)),
          },
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
        type: 'sub',
        id: 'reports-group',
        title: 'Reports',
        icon: sidePanelIcons.reports,
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('reports'),
        children: [
          {
            type: 'item',
            id: 'rep-kpi',
            to: '/employee/report/kpis',
            title: 'KPI',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('reports.kpi', hasPermission(uiControlResourceNameMapWithCamelCase.kpiUnderReports, permissionConstToUseWithHasPermission.readOthers)),
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
        type: 'item',
        id: 'admin-calendar',
        to: '/employees/calendar',
        title: 'Calendar',
        icon: sidePanelIcons.calendar.default,
        activeIcon: sidePanelIcons.calendar.active,
        fontIcon: 'bi-layers',
        visible: isSubsectionVisible('calendar', hasPermission(uiControlResourceNameMapWithCamelCase.calendar, permissionConstToUseWithHasPermission.readOthers)),
      },
      {
        type: 'sub',
        id: 'admin-org',
        to: '/company',
        title: 'Organization',
        icon: sidePanelIcons.company,
        fontIcon: 'bi-layers',
        visible: !isSectionBlocked('settings') && (anyChildGranted('settings') || hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.branchesUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.departmentsUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.designationUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers) || hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
        children: [
          {
            type: 'item',
            id: 'org-profile',
            to: '/company/organisation-profile',
            title: 'Organization Profile',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.profile', hasPermission(uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-announcements',
            to: '/company/announcements',
            title: 'Announcements',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.announcements', hasPermission(uiControlResourceNameMapWithCamelCase.announcementsUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-media',
            to: '/company/media',
            title: 'Media',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.media', hasPermission(uiControlResourceNameMapWithCamelCase.mediaUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-onboarding',
            to: '/company/onboardingDocs',
            title: 'Onboarding Docs',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.onboarding', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-teams',
            to: '/company/teams',
            title: 'Teams',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.teams', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
          {
            type: 'item',
            id: 'org-emp-level',
            to: '/company/employee-level-teams',
            title: 'Employee-Level',
            icon: sidePanelIcons.rectangle.default,
            activeIcon: sidePanelIcons.rectangle.active,
            fontIcon: 'bi-layers',
            visible: isSubsectionVisible('settings.employeeLevel', hasPermission(uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany, permissionConstToUseWithHasPermission.readOthers)),
          },
        ]
      },
    ];

    return items;
  }, [intl, pendingApprovalsCount, capabilities, blockedSections]);

  return menu;
}
