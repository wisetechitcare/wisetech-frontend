import { permissionConstToUseWithHasPermission, ResourceMapWithName, resourceNameMapWithCamelCase, uiControlResourceNameMapWithCamelCase } from '@constants/statistics';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { KTIcon } from '@metronic/helpers';
import { createRole, fetchRoles, createPermissionForRoleById, updatePermissionForRoleById, updateRoleById, deleteRoleById } from '@services/roles';
import { getAvatar } from '@utils/avatar';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react'
import { Button, Modal, Spinner, Accordion } from 'react-bootstrap';

const PermissionConts = {
  readOthers: "View (Others)",
  readOwn: "View (Own)",
  create: "Create",
  editOthers: "Edit (Others)",
  editOwn: "Edit (Own)",
  deleteOthers: "Delete (Others)",
  deleteOwn: "Delete (Own)"
}

interface RoleData {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  permissions: {
    id: string;
    roleId: string;
    resource: string;
    action: string;
    allow: boolean;
    condition?: string | null;
    isActive: boolean;
    createdAt: string;
  }[];
}

interface PermissionsListProps {
  rolesData: RoleData;
}

function PermissionsList({ rolesData }: PermissionsListProps) {
  const [loading, setLoading] = useState(false);

  const role = rolesData;

  // Sort resources alphabetically by displayName
  const sortResourcesAlphabetically = <T extends { displayName: string }>(resources: T[]): T[] => {
    return [...resources].sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  // Group resources by category
  const groupResourcesByCategory = <T extends { displayName: string }>(resources: T[]): Record<string, T[]> => {
    const groups: Record<string, T[]> = {};

    resources.forEach(resource => {
      let groupName: string;

      // Handle Dashboard items
      if (resource.displayName.startsWith('Dashboard - ')) {
        groupName = 'Dashboard';
      }
      // Handle items with common prefixes (e.g., "Attendance Config", "Attendance Request")
      else {
        const words = resource.displayName.split(' ');
        // Use the first word as the group name
        groupName = words[0];
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(resource);
    });

    return groups;
  };

  // Manually define configuration for each resource.
  // For each resource we set:
  // - resourceKey: the key used to store permissions and to compare with existing permissions.
  // - displayName: the label for the resource.
  // - actions: an array of actions for that resource. For each action we specify:
  //      • action: the permission string.
  //      • label: the human-friendly header/label.
  //      • disabled: whether this permission is  applicable for the resource.
  // Sample Data
  // { action: 'readOthers', label: 'View (Others)', disabled: false },
  // { action: 'readOwn', label: 'View (Own)', disabled: false },
  // { action: 'create', label: 'Create', disabled: true },
  // { action: 'updateOthers', label: 'Edit (Others)', disabled: true },
  // { action: 'updateOwn', label: 'Edit (Own)', disabled: true },
  // { action: 'deleteOthers', label: 'Delete (Others)', disabled: true },
  // { action: 'deleteOwn', label: 'Delete (Own)', disabled: true },

  const resourcesConfig = [
    {
      resourceKey: resourceNameMapWithCamelCase.attendanceConfig,
      displayName: 'Attendance Config',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.attendanceRequest,
      displayName: 'Attendance Request',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.attendanceRequestLimit,
      displayName: 'Attendance Request Limit',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.attendanceReport,
      displayName: 'Attendance Report',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.leave,
      displayName: 'Leaves',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.leaveCashTransfer,
      displayName: 'Leave Cash/Transfer',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.reimbursement,
      displayName: 'Reimbursement',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.department,
      displayName: 'Department',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.designation,
      displayName: 'Designation',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.announcement,
      displayName: 'Announcement',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.branch,
      displayName: 'Branch',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.onboardingDocument,
      displayName: 'Onboarding Document',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.organisationProfile,
      displayName: 'Organisation Profile',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.employee,
      displayName: 'Employee',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.holiday,
      displayName: 'Holiday',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.meeting,
      displayName: 'Meeting',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.event,
      displayName: 'Event',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.birthdays,
      displayName: 'Birthdays',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.loan,
      displayName: 'Loan',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: false },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.loanInstallment,
      displayName: 'Loan Installment',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.kpi,
      displayName: 'KPI',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.salary,
      displayName: 'Salary',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.salaryConfig,
      displayName: 'Salary Config',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    // Dashboard Sections
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardAnnouncements,
      displayName: 'Dashboard - Announcements Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardAttendance,
      displayName: 'Dashboard - Attendance Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardDailyAttendanceOverview,
      displayName: 'Dashboard - Daily Attendance Overview Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardTasks,
      displayName: 'Dashboard - Tasks Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardUpcomingEvents,
      displayName: 'Dashboard - Upcoming Events Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardTodoCard,
      displayName: 'Dashboard - Todo Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardPendingRequests,
      displayName: 'Dashboard - Pending Requests Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: false },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardLeaderboard,
      displayName: 'Dashboard - Leaderboard Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardAnalyticsGraphs,
      displayName: 'Dashboard - Analytics Graphs Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardAllLoans,
      displayName: 'Dashboard - All Loans Overview Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardOngoingLoans,
      displayName: 'Dashboard - Ongoing Loans Overview Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    },
    {
      resourceKey: resourceNameMapWithCamelCase.dashboardKpiSection,
      displayName: 'Dashboard - KPI Section Card',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn, disabled: false },
        { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers, disabled: true },
        { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn, disabled: true },
      ]
    }
  ];

  const uiControlConfig = [
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.calendar,
      displayName: 'Calendar',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.personalUnderAttendanceAndLeaves,
      displayName: 'Attendance & Leaves -> Personal',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.employeesUnderAttendanceAndLeaves,
      displayName: 'Attendance & Leaves -> Employees',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.employeesUnderPeople,
      displayName: 'People -> Employees',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.documentsUnderPeople,
      displayName: 'People -> Documents',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.organisationProfileUnderCompany,
      displayName: 'Company -> Organisation Profile',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.announcementsUnderCompany,
      displayName: 'Company -> Announcements',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.branchesUnderCompany,
      displayName: 'Company -> Branches',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.departmentsUnderCompany,
      displayName: 'Company -> Departments',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.designationUnderCompany,
      displayName: 'Company -> Designation',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.mediaUnderCompany,
      displayName: 'Company -> Media',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.onboardingDocumentUnderCompany,
      displayName: 'Company -> Onboarding Docs',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.kpiUnderReports,
      displayName: 'Reports -> Kpis',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.holidaysUnderReports,
      displayName: 'Finance -> Holidays',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.reimbursementsUnderFinance,
      displayName: 'Finance -> Reimbursements',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.salaryUnderFinance,
      displayName: 'Finance -> Salary',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.loanUnderFinance,
      displayName: 'Finance -> Loans',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    },
    {
      resourceKey: uiControlResourceNameMapWithCamelCase.leadProjectCompaniesContact,
      displayName: 'PM -> Leads, Projects, Companies, Contacts',
      actions: [
        { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers, disabled: false },
      ]
    }
  ]

  // Sort configurations alphabetically by displayName
  const sortedResourcesConfig = sortResourcesAlphabetically(resourcesConfig);
  const sortedUiControlConfig = sortResourcesAlphabetically(uiControlConfig);

  // Group resources by category
  const groupedResourcesConfig = groupResourcesByCategory(sortedResourcesConfig);
  const groupedUiControlConfig = groupResourcesByCategory(sortedUiControlConfig);

  // Get sorted group names
  const sortedGroupNames = Object.keys(groupedResourcesConfig).sort((a, b) => a.localeCompare(b));
  const sortedUiControlGroupNames = Object.keys(groupedUiControlConfig).sort((a, b) => a.localeCompare(b));

  const initialUIControls = {...sortedUiControlConfig.reduce((acc, resource) => {
    acc[resource.resourceKey] = resource.actions.reduce((actionAcc, actionObj) => {
      const existingPerm = role.permissions.find(
        (perm) => perm.resource === resource.resourceKey && perm.action === actionObj.action
      );
      actionAcc[actionObj.action] = actionObj.disabled ? false : (existingPerm ? existingPerm.allow : false);
      return actionAcc;
    }, {} as Record<string, boolean>);
    return acc;
  }, {} as Record<string, Record<string, boolean>>)}

  // console.log("initialUIControls:: ",initialUIControls);

  const initialFormikValues = {
    ...sortedResourcesConfig.reduce((acc, resource) => {
      acc[resource.resourceKey] = resource.actions.reduce((actionAcc, actionObj) => {
        const existingPerm = role.permissions.find(
          (perm) => perm.resource === resource.resourceKey && perm.action === actionObj.action
        );
        actionAcc[actionObj.action] = actionObj.disabled ? false : (existingPerm ? existingPerm.allow : false);
        return actionAcc;
      }, {} as Record<string, boolean>);
      return acc;
    }, {} as Record<string, Record<string, boolean>>),
    ...initialUIControls
  }

  const formik = useFormik({
    initialValues: initialFormikValues,
    onSubmit: async (values) => {
      await handleSave(values);
    },
  });

  /**
   * handleSave - For each resource and its actions:
   *  - If the action is disabled, skip saving.
   *  - If the permission exists, update it.
   *  - If it does not exist, create it only if allowed.
   */
  const handleSave = async (values: typeof initialFormikValues) => {
    try {
      setLoading(true);
      const promises: Promise<any>[] = [];
      const finalDetails = [...sortedResourcesConfig, ...sortedUiControlConfig]
      finalDetails.forEach(resource => {
        resource.actions.forEach(actionObj => {
          // Skip saving if the action is not applicable.
          if (actionObj.disabled) {
            promises.push(Promise.resolve());
            return;
          }
          const allowValue = values[resource.resourceKey][actionObj.action];
          const existingPerm = role.permissions.find(
            (perm) => perm.resource === resource.resourceKey && perm.action === actionObj.action
          );

          if (existingPerm) {
            promises.push(
              updatePermissionForRoleById(role.id, existingPerm.id, {
                resource: resource.resourceKey,
                action: actionObj.action,
                allow: allowValue,
              })
            );
          } else {
            if (allowValue) {
              promises.push(
                createPermissionForRoleById(role.id, {
                  resource: resource.resourceKey,
                  action: actionObj.action,
                  allow: true,
                })
              );
            } else {
              promises.push(Promise.resolve());
            }
          }
        });
      });

      await Promise.all(promises);
      successConfirmation('Permissions updated successfully!');

    } catch (error) {
      console.error('Error updating permissions:', error);
      errorConfirmation('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex flex-column ml-3 my-3 p-10"
      style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <h2>Permissions</h2>
      <hr style={{ backgroundColor: '#E1E7EF', color: '#E1E7EF', height: '3px' }} />

      <form onSubmit={formik.handleSubmit} className='d-lg-block d-md-flex' style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        {/* Accordion for grouped permissions */}
        <Accordion defaultActiveKey="0" className="mt-5">
          {sortedGroupNames.map((groupName, groupIndex) => (
            <Accordion.Item eventKey={groupIndex.toString()} key={groupName}>
              <Accordion.Header>
                <strong>{groupName}</strong>
              </Accordion.Header>
              <Accordion.Body>
                {/* Header Row for this group */}
                <div
                  className="d-none d-lg-flex flex-row align-items-center justify-content-start m-1"
                  style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#7A8597', fontSize: '11px' }}
                >
                  <div className="col-3">Features</div>
                  {[
                    { action: permissionConstToUseWithHasPermission.readOthers, label: PermissionConts.readOthers },
                    { action: permissionConstToUseWithHasPermission.readOwn, label: PermissionConts.readOwn },
                    { action: permissionConstToUseWithHasPermission.create, label: PermissionConts.create },
                    { action: permissionConstToUseWithHasPermission.editOthers, label: PermissionConts.editOthers },
                    { action: permissionConstToUseWithHasPermission.editOwn, label: PermissionConts.editOwn },
                    { action: permissionConstToUseWithHasPermission.deleteOthers, label: PermissionConts.deleteOthers },
                    { action: permissionConstToUseWithHasPermission.deleteOwn, label: PermissionConts.deleteOwn },
                  ].map(header => (
                    <div key={header.action} className="col d-none d-md-block text-center">
                      {header.label}
                    </div>
                  ))}
                </div>

                {/* Rows for each resource in this group */}
                {groupedResourcesConfig[groupName].map(resource => (
          <>
            <div
              key={resource.resourceKey}
              className="d-none d-md-flex flex-row align-items-center justify-content-start m-1 my-2"
              style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#000', fontSize: '13px' }}
            >
              <div className="col-3">{resource.displayName}</div>
              {['readOthers', 'readOwn', 'create', 'updateOthers', 'updateOwn', 'deleteOthers', 'deleteOwn'].map(action => {
                // Check if this action is defined in our config.
                const actionConfig = resource.actions.find(a => a.action === action);
                return (
                  <div key={action} className="col text-center">
                    <input
                      type="checkbox" 
                      id={`${resource.resourceKey}-${action}`}
                      name={`${resource.resourceKey}.${action}`}
                      className={`form-check-input rounded-circle`}
                      checked={formik.values[resource.resourceKey][action] as any}
                      onChange={formik.handleChange}
                      disabled={actionConfig ? actionConfig.disabled : true}
                      style={{ backgroundColor: actionConfig && actionConfig.disabled ? '#E1E7EF' : undefined }}
                    />
                  </div>
                );
              })}
            </div>
            <div
              key={resource.resourceKey + resource.actions[0].action}
              className="d-flex flex-row d-md-none align-items-center justify-content-center m-1 my-6 col-5"
              style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#000', fontSize: '13px' }}
            >
              <div className='col-12'>
                <div className="col-12 my-2">{resource.displayName}</div>
                {['readOthers', 'readOwn', 'create', 'updateOthers', 'updateOwn', 'deleteOthers', 'deleteOwn'].map(action => {
                  const actionConfig = resource.actions.find(a => a.action === action);
                  return (
                    <div key={action} className="col-12 text-center my-2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label htmlFor={`${resource.resourceKey}-${action}`} style={{ fontSize: '11px', marginRight: "auto" }} >{actionConfig?.label}</label>
                      <input
                        type="checkbox"
                        id={`${resource.resourceKey}-${action}`}
                        name={`${resource.resourceKey}.${action}`}
                        className="form-check-input rounded-circle"
                        checked={formik.values[resource.resourceKey][action]}
                        onChange={formik.handleChange}
                        disabled={actionConfig ? actionConfig.disabled : true}
                        style={{ backgroundColor: actionConfig && actionConfig.disabled ? '#E1E7EF' : undefined }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
                ))}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>

        {/* Section Control Accordions */}
        <div
          className="d-flex flex-column align-items-start justify-center-start m-1 my-5"
          style={{ width: '100%' }}
        >
          <h4 className="mb-3">Section Control (View)</h4>

          <Accordion defaultActiveKey="0" className="w-100">
            {sortedUiControlGroupNames.map((groupName, groupIndex) => (
              <Accordion.Item eventKey={groupIndex.toString()} key={groupName}>
                <Accordion.Header>
                  <strong>{groupName}</strong>
                </Accordion.Header>
                <Accordion.Body>
                  {groupedUiControlConfig[groupName].map(resource => (
                    <div
                      key={resource.resourceKey}
                      className="d-flex flex-row align-items-center justify-content-start m-1 w-100"
                      style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#000', fontSize: '13px' }}
                    >
                      <div className="col-10 col-md-6">{resource.displayName}</div>
                      {['readOthers'].map(action => {
                        const actionConfig = resource.actions.find(a => a.action === action);

                        return (
                          <div key={action} className="col-2 text-center">
                            <input
                              type="checkbox"
                              id={`${resource.resourceKey}-${action}`}
                              name={`${resource.resourceKey}.${action}`}
                              className={`form-check-input rounded-circle`}
                              checked={formik.values[resource.resourceKey][action] as any}
                              onChange={formik.handleChange}
                              disabled={actionConfig ? actionConfig.disabled : true}
                              style={{ backgroundColor: actionConfig && actionConfig.disabled ? '#E1E7EF' : undefined }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>

        </div>
        <button className="btn btn-primary mt-10" type="submit" disabled={loading}>
          {loading ? <span>Please wait..  <Spinner animation="border" size="sm" /></span> : 'Save'}
        </button>
      </form>
    </div>
  );
}

function EditRole({ handleCloseEditModal, roleDetails, setRefetch }: { handleCloseEditModal: () => void, roleDetails: any, setRefetch: (show: boolean) => void }) {
  console.log("roleDetails in EditRole::======================> ", roleDetails);

  return (
    <div className='px-3'>
      <div className='d-flex flex-row align-items-center justify-content-start gap-2'>
        <img src={miscellaneousIcons.leftArrow} alt="" style={{ width: "36px", height: "36px", cursor: 'pointer' }} onClick={handleCloseEditModal} />
        <h2 className='my-auto'>Edit Role "{roleDetails?.name}"</h2>
      </div>
      <div className='row my-3 d-none d-lg-flex'>
        <div className='col-8'>
          <PermissionsList rolesData={roleDetails} />
        </div>
        <div className='col-4' >
          <EditRoleName handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
          <StaffMemberForGivenRole handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
        </div>
      </div>
      <div className='row my-3 d-flex d-lg-none'>
        <div className='col-12' >
          <EditRoleName handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
        </div>
        <div className='col-12' >
          <StaffMemberForGivenRole handleCloseEditModal={handleCloseEditModal} setRefetch={setRefetch} roleDetails={roleDetails} />
        </div>
        <div className='col-12'>
          <PermissionsList rolesData={roleDetails} />
        </div>
      </div>
    </div>
  )
}

function StaffMemberForGivenRole({ handleCloseEditModal, setRefetch, roleDetails }: { handleCloseEditModal: (show: boolean) => void, setRefetch: (show: boolean) => void, roleDetails: any }) {
  const [roleName, setRoleName] = useState(roleDetails?.name || '');

  const handleFormSubmit = async () => {
    try {
      const res = await updateRoleById(roleDetails?.id, { name: roleName });
      // console.log("resFromUpdate::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role updated successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      // console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
    finally {
      handleCloseEditModal(true);
    }
  }

  return (
    <div
      className='d-flex flex-column my-3 p-5 p-md-10 bg-white'
      style={{ borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <h4>Staff members using this role</h4>
      <div className='my-3'>
        {roleDetails?.employees?.map((employee: any) => (
          <div key={employee.id} className='d-flex flex-row align-items-center justify-content-start w-full gap-2 py-1' style={{ backgroundColor: '#FFFFFF', fontSize: '14px', color: '#000000' }}>
            <img src={employee?.avatar || getAvatar(employee.avatar, employee.gender)} className='col-3' style={{ objectFit: "cover", width: "32px", height: "32px", borderRadius: "50%" }} />
            <div className='col-9' style={{ fontSize: '14px', color: '#000000' }}>{employee?.users?.firstName + ' ' + employee?.users?.lastName}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EditRoleName({ handleCloseEditModal, setRefetch, roleDetails }: { handleCloseEditModal: (show: boolean) => void, setRefetch: (show: boolean) => void, roleDetails: any }) {
  const [roleName, setRoleName] = useState(roleDetails?.name || '');

  const handleFormSubmit = async () => {
    try {
      const res = await updateRoleById(roleDetails?.id, { name: roleName });
      // console.log("resFromUpdate::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role updated successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
    finally {
      handleCloseEditModal(true);
    }
  }

  return (
    <div
      className='d-flex flex-column my-3 p-5 p-md-10  bg-white'
      style={{ borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <div className='d-flex flex-column gap-2' >
        <label htmlFor="name">Role Name</label>
        <div className='d-flex flex-column gap-2 align-items-center justify-content-start'>
          <div className='d-flex flex-row gap-2' style={{ marginRight: "auto" }}>
            <input type="text" id="name" placeholder="Role Name" className="form-control" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
            <button className="btn btn-outline btn-light-primary" style={{ marginRight: "auto", backgroundColor: '#FFFFFF' }} disabled={roleName?.length < 1 || roleName?.length > 80} onClick={handleFormSubmit}>Save</button>
          </div>
          <span style={{ color: '#70829A', fontSize: '13px', marginRight: "auto" }}>Must be between 1 - 80 characters </span>
        </div>
      </div>
    </div>
  )
}

function AddNewRole({ setShowAddNewRole, setRefetch }: { setShowAddNewRole: (show: boolean) => void, setRefetch: (show: boolean) => void }) {
  const [roleName, setRoleName] = useState('');

  const handleFormSubmit = async () => {
    try {
      const res = await createRole({ name: roleName });
      // console.log("res::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role created successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
    finally {
      setShowAddNewRole(false);
    }
  }

  return (
    <div
      style={{ borderRadius: '10px', fontFamily: 'Inter' }}
    >
      <div className='d-flex flex-column gap-2' >
        <label htmlFor="name">Role Name</label>
        <input type="text" id="name" placeholder="Role Name" className="form-control" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
        <span style={{ color: '#70829A', fontSize: '13px' }}>Must be between 1 - 80 characters </span>
      </div>
      <button className="btn btn-primary mt-5 mb-5 m-md-0 " style={{ marginRight: "auto" }} disabled={roleName?.length < 1 || roleName?.length > 80} onClick={handleFormSubmit}>Save</button>
    </div>
  )
}

function RolesAndPermissions() {
  const [allRoles, setallRoles] = useState([]);
  const [showAddNewRole, setShowAddNewRole] = useState(false);
  const [showEditModal, setshowEditModal] = useState(false)
  const [roleToEdit, setRoleToEdit] = useState(null);
  const [refetch, setRefetch] = useState(false);
  useEffect(() => {
    const fetchAllRoles = async () => {
      const response = await fetchRoles();
      const rolesData = response?.data;
      // console.log("rolesData: ", rolesData);
      setallRoles(rolesData);
    };
    fetchAllRoles();
  }, [refetch])

  const handleCloseEditModal = () => {
    setshowEditModal(false);
  }

  const handleDeleteRole = async (roleId: number) => {
    try {
      const res = await deleteRoleById(roleId.toString());
      // console.log("res::: ", res);
      if (!res?.hasError) {
        successConfirmation("Role deleted successfully");
        setRefetch(true);
      }
      else {
        errorConfirmation("Error: Something went wrong please try again");
      }
    } catch (error) {
      console.log("error: ", error);
      errorConfirmation("Error: Something went wrong please try again");
    }
  }

  return (
    <>
      <div className='d-flex flex-column mt-12 mb-12 m-md-3 p-5 p-md-10' style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', fontFamily: 'Inter' }}>
        {/* <div>RolesAndPermissions</div> */}
        <div className='d-flex flex-row align-items-center justify-content-start w-full m-md-1' style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', color: '#7A8597', fontSize: '13px' }}>
          {/* <div>RolesAndPermissions</div> */}
          <div className='col-4 col-md-4'>Role Names</div>
          <div className='col-4 col-md-3'>Total Users</div>
          <div className='col-4 col-md-3'>Actions</div>
        </div>
        {allRoles.map((role: any) => (
          <div key={role.id} className='d-flex flex-row align-items-center justify-content-start w-full m-1' style={{ backgroundColor: '#FFFFFF', fontSize: '14px', color: '#000000' }}>
            {/* <div>RolesAndPermissions</div> */}
            <div className='col-4 col-md-4'>{role.name}</div>
            <div className='col-4 col-md-3'>{role?.employees?.length}</div>
            <div className='col-4 col-md-3'>
              <div
                className="btn p-0 btn-active-color-primary btn-sm"
                onClick={() => { setRoleToEdit(role); setshowEditModal(true) }}
              >
                <KTIcon
                  iconName="pencil"
                  className="fs-3 cursor-pointer"
                />
              </div>
              {(!role?.name?.toLowerCase()?.includes("admin") && !role?.name?.toLowerCase()?.includes("guest")) && <div
                className="btn p-0 btn-active-color-primary btn-sm"
                onClick={() => handleDeleteRole(role.id)}
              >
                <KTIcon
                  iconName="trash"
                  className="fs-3 cursor-pointer"
                />
              </div>}
            </div>
          </div>
        ))}
        <button
          className="btn btn-primary mt-10"
          style={{ marginRight: "auto" }}
          onClick={() => setShowAddNewRole(true)}
        >New Role</button>
      </div>
      {/* Add New Role Modal */}
      <Modal show={showAddNewRole} onHide={() => setShowAddNewRole(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body className='d-flex flex-column gap-6'>
          <Modal.Title>Add New Role</Modal.Title>
          <AddNewRole setShowAddNewRole={setShowAddNewRole} setRefetch={setRefetch} />
        </Modal.Body>
      </Modal>
      {/* Edit Role Modal */}
      <Modal show={showEditModal} onHide={handleCloseEditModal} size="xl" aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Body style={{ backgroundColor: '#F7F9FC', borderRadius: '10px' }}>
          <EditRole handleCloseEditModal={handleCloseEditModal} roleDetails={roleToEdit} setRefetch={setRefetch} />
        </Modal.Body>
      </Modal>
    </>
  )
}

export default RolesAndPermissions