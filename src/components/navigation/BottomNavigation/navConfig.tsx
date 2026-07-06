/**
 * Configuration-driven Bottom Navigation destinations.
 *
 * Each item declares its own visibility gate using the SAME permission helpers
 * that drive the desktop sidebar (`isSectionBlocked`, `hasPermission`, `can`),
 * so there is zero duplicated authorization logic. Different roles therefore
 * receive different tabs automatically — the top-priority items a user can
 * access become their primary tabs, the rest fall into "More".
 *
 * To add / reorder / gate a destination, edit this array only.
 */
import { sidePanelIcons, reimbursementsIcons } from '@metronic/assets/sidepanelicons'
import { isSectionBlocked } from '@utils/accessAreas'
import { hasPermission } from '@utils/authAbac'
import { can } from '@utils/can'
import {
  permissionConstToUseWithHasPermission,
  uiControlResourceNameMapWithCamelCase,
} from '@constants/statistics'
import type { BottomNavItemConfig } from './types'

const { readOthers } = permissionConstToUseWithHasPermission
const R = uiControlResourceNameMapWithCamelCase

/** Badge source keys — mapped to live counts by BottomNavProvider. */
export const BADGE_KEYS = {
  approvals: 'approvals',
} as const

/**
 * Master destination list, in priority order. `order` is authoritative for the
 * primary-vs-overflow split; the array order is kept in sync for readability.
 */
export const BOTTOM_NAV_ITEMS: BottomNavItemConfig[] = [
  {
    id: 'attendance',
    label: 'Attendance',
    icon: sidePanelIcons.attendance,
    to: '/employee/attendance-and-leaves',
    match: ['/employee/attendance-and-leaves', '/employees/attendance-and-leaves'],
    order: 10,
    isVisible: () =>
      !isSectionBlocked('attendance') &&
      (hasPermission(R.personalUnderAttendanceAndLeaves, readOthers) ||
        hasPermission(R.employeesUnderAttendanceAndLeaves, readOthers) ||
        can('attendance.employees.view.all')),
  },
  {
    id: 'reimbursements',
    label: 'Expenses',
    icon: sidePanelIcons.finance,
    to: '/finance/bills',
    match: ['/finance/bills'],
    order: 20,
    isVisible: () =>
      !isSectionBlocked('finance.reimbursements') &&
      hasPermission(R.reimbursementsUnderFinance, readOthers),
  },
  {
    id: 'reports',
    label: 'Report',
    icon: sidePanelIcons.reports,
    to: '/employee/report/kpis',
    match: ['/employee/report'],
    order: 30,
    isVisible: () =>
      !isSectionBlocked('reports') && hasPermission(R.kpiUnderReports, readOthers),
  },
  {
    id: 'tasks',
    label: 'Task',
    icon: sidePanelIcons.tasks.default,
    activeIcon: sidePanelIcons.tasks.active,
    to: '/tasks',
    match: ['/tasks'],
    order: 40,
    isVisible: () => !isSectionBlocked('tasks'),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: sidePanelIcons.dashboard.default,
    activeIcon: sidePanelIcons.dashboard.active,
    to: '/dashboard',
    match: ['/dashboard'],
    order: 50,
    isVisible: () => !isSectionBlocked('dashboard'),
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: sidePanelIcons.leads.default,
    activeIcon: sidePanelIcons.leads.active,
    to: '/qc/leads',
    match: ['/qc/leads', '/leads/', '/employee/lead/'],
    order: 60,
    isVisible: () => !isSectionBlocked('crm.leads'),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: sidePanelIcons.projects.default,
    activeIcon: sidePanelIcons.projects.active,
    to: '/qc/projects',
    match: ['/qc/projects', '/projects/'],
    order: 70,
    isVisible: () => !isSectionBlocked('projects'),
  },
  {
    id: 'timesheet',
    label: 'Timesheet',
    icon: sidePanelIcons.timeTracker.default,
    activeIcon: sidePanelIcons.timeTracker.active,
    to: '/tasks/timesheet',
    match: ['/tasks/timesheet', '/tasks/employee-timesheet'],
    order: 80,
    isVisible: () => !isSectionBlocked('timesheets'),
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: sidePanelIcons.companiesIcon.default,
    activeIcon: sidePanelIcons.companiesIcon.active,
    to: '/qc/companies',
    match: ['/qc/companies', '/companies/'],
    order: 90,
    isVisible: () => !isSectionBlocked('crm.companies'),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: sidePanelIcons.contactsIcon.default,
    activeIcon: sidePanelIcons.contactsIcon.active,
    to: '/qc/contacts',
    match: ['/qc/contacts', '/contacts/'],
    order: 100,
    isVisible: () => !isSectionBlocked('crm.contacts'),
  },
  {
    id: 'people',
    label: 'People',
    icon: sidePanelIcons.people,
    to: '/employees',
    match: ['/employees'],
    order: 110,
    isVisible: () => !isSectionBlocked('users'),
  },
  {
    id: 'my-team',
    label: 'My Team',
    icon: sidePanelIcons.people,
    to: '/my-team',
    match: ['/my-team', '/approvals'],
    order: 120,
    badgeKey: BADGE_KEYS.approvals,
    isVisible: () =>
      can('approvals.view.team') ||
      can('approvals.approve.team') ||
      can('approvals.manage.all'),
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: sidePanelIcons.finance,
    to: '/finance/loans',
    match: ['/finance'],
    order: 130,
    isVisible: () => !isSectionBlocked('finance'),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: sidePanelIcons.company,
    to: '/employees/notifications',
    match: ['/employees/notifications'],
    order: 140,
    isVisible: () => true,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: sidePanelIcons.people,
    to: '/crafted/pages/profile/overview',
    match: ['/crafted/pages/profile', '/employee/profile'],
    order: 150,
    isVisible: () => true,
  },
]

/** Max primary tabs shown in the bar before the 5th "More" slot. */
export const MAX_PRIMARY_TABS = 4
