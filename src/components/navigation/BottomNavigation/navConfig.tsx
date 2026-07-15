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
    icon: 'bi-calendar-check',
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
    icon: 'bi-receipt',
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
    icon: 'bi-bar-chart',
    to: '/employee/report/kpis',
    match: ['/employee/report'],
    order: 30,
    isVisible: () =>
      !isSectionBlocked('reports') && hasPermission(R.kpiUnderReports, readOthers),
  },
  {
    id: 'tasks',
    label: 'Task',
    icon: 'bi-check2-square',
    to: '/tasks',
    match: ['/tasks'],
    order: 40,
    isVisible: () => !isSectionBlocked('tasks'),
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'bi-speedometer2',
    to: '/dashboard',
    match: ['/dashboard'],
    order: 50,
    isVisible: () => !isSectionBlocked('dashboard'),
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: 'bi-megaphone',
    to: '/qc/leads',
    match: ['/qc/leads', '/leads/', '/employee/lead/'],
    order: 60,
    isVisible: () => !isSectionBlocked('crm.leads'),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: 'bi-briefcase',
    to: '/qc/projects',
    match: ['/qc/projects', '/projects/'],
    order: 70,
    isVisible: () => !isSectionBlocked('projects'),
  },
  {
    id: 'timesheet',
    label: 'Timesheet',
    icon: 'bi-clock-history',
    to: '/tasks/timesheet',
    match: ['/tasks/timesheet', '/tasks/employee-timesheet'],
    order: 80,
    isVisible: () => !isSectionBlocked('timesheets'),
  },
  {
    id: 'companies',
    label: 'Companies',
    icon: 'bi-building',
    to: '/qc/companies',
    match: ['/qc/companies', '/companies/'],
    order: 90,
    isVisible: () => !isSectionBlocked('crm.companies'),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: 'bi-person-lines-fill',
    to: '/qc/contacts',
    match: ['/qc/contacts', '/contacts/'],
    order: 100,
    isVisible: () => !isSectionBlocked('crm.contacts'),
  },
  {
    id: 'people',
    label: 'People',
    icon: 'bi-people',
    to: '/employees',
    match: ['/employees'],
    order: 110,
    isVisible: () => !isSectionBlocked('users'),
  },
  {
    id: 'my-team',
    label: 'My Team',
    icon: 'bi-diagram-3',
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
    icon: 'bi-cash-coin',
    to: '/finance/loans',
    match: ['/finance'],
    order: 130,
    isVisible: () => !isSectionBlocked('finance'),
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bi-bell',
    to: '/employees/notifications',
    match: ['/employees/notifications'],
    order: 140,
    isVisible: () => true,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: 'bi-person-circle',
    to: '/crafted/pages/profile/overview',
    match: ['/crafted/pages/profile', '/employee/profile'],
    order: 150,
    isVisible: () => true,
  },
]

/** Max primary tabs shown in the bar before the 5th "More" slot. */
export const MAX_PRIMARY_TABS = 4
