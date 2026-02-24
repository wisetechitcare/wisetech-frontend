import { ADMIN_ROLES } from '@constants/statistics';
import { Employee, AdminFolder } from '@models/media';
import dayjs from 'dayjs';

/**
 * Check if an employee has admin role (Super Admin or Admin)
 */
export const isAdminRole = (employee: Employee): boolean => {
    return employee.roles?.some((role:any) =>
        role.name.toLocaleLowerCase() === ADMIN_ROLES.SUPER_ADMIN ||
        role.name.toLocaleLowerCase() === ADMIN_ROLES.ADMIN
    ) || false;
};

/**
 * Get formatted full name from employee
 */
export const getEmployeeFullName = (employee: Employee | undefined, fallback: string = 'Unknown'): string => {
    if (!employee) return fallback;

    const firstName = employee.users?.firstName || '';
    const lastName = employee.users?.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || fallback;
};

/**
 * Get employees created or updated by a specific admin
 */
export const getEmployeesByCreator = (employees: Employee[], creatorId: string): Employee[] => {
    return employees.filter((emp) =>
        (emp.createdById || emp.updatedById) === creatorId
    );
};

/**
 * Get all employees who have admin roles
 */
export const getAdminEmployees = (employees: Employee[]): Employee[] => {
    return employees.filter(isAdminRole);
};

/**
 * Map admin employees to admin folder structure
 */
export const mapToAdminFolders = (employees: Employee[], allEmployees: Employee[]): AdminFolder[] => {
    const adminEmployees = getAdminEmployees(employees);

    return adminEmployees.map((admin) => ({
        id: admin.id,
        name: getEmployeeFullName(admin, 'Admin'),
        employeeCount: getEmployeesByCreator(allEmployees, admin.id).length
    }));
};

/**
 * Find employee by ID
 */
export const findEmployeeById = (employees: Employee[], employeeId: string): Employee | undefined => {
    return employees.find((emp) => emp.id === employeeId);
};

/**
 * Format date to locale date string
 */
export const formatJoiningDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return dayjs(dateString).format('D MMM, YYYY');
};
