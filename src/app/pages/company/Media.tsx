import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchAllEmployees } from '@services/employee';
import { Employee } from '@models/media';
import { mapToAdminFolders, getEmployeesByCreator, findEmployeeById, getEmployeeFullName } from '@utils/media.utils';
import AdminFolderList from './components/AdminFolderList';
import EmployeeList from './components/EmployeeList';
import EmployeeDocumentsView from './components/EmployeeDocumentsView';

function Media() {
    const { adminId, employeeId } = useParams<{ adminId?: string; employeeId?: string }>();
    const currentUser = useSelector((state: RootState) => state.auth.currentUser);
    const [employeeData, setEmployeeData] = useState<Employee[]>([]);
    const [loading, setLoading] =  useState(false);

    useEffect(() => {
        async function fetchAllTheEmployeesData() {
            try {
                setLoading(true);
                const res = await fetchAllEmployees();
                setEmployeeData(res.data.employees);
            } catch (error) {
                console.error(error);
            } finally { 
                setLoading(false);
            }
        }
        fetchAllTheEmployeesData();
    }, []);

    // Memoize admin folders based on employeeData
    const admins = useMemo(() => {
        if (!employeeData.length) return [];
        return mapToAdminFolders(employeeData, employeeData);
    }, [employeeData, currentUser]);


    // Level 3: Show specific employee's documents
    if (adminId && employeeId) {
        const currentEmployee = findEmployeeById(employeeData, employeeId);
        const adminEmployee = findEmployeeById(employeeData, adminId);
        const employeeName = getEmployeeFullName(currentEmployee, 'Employee');
        const adminName = getEmployeeFullName(adminEmployee, 'Admin');

        return (
            <EmployeeDocumentsView
                adminId={adminId}
                adminName={adminName}
                employeeName={employeeName}
            />
        );
    }

    // Level 2: Show employees under selected admin
    if (adminId) {
        const adminEmployees = getEmployeesByCreator(employeeData, adminId);
        const adminEmployee = findEmployeeById(employeeData, adminId);
        const adminName = getEmployeeFullName(adminEmployee, 'Admin');

        return (
            <EmployeeList
                adminId={adminId}
                adminName={adminName}
                adminEmployees={adminEmployees}
                admins={admins}
            />
        );
    }

    // Level 1: Show all admins (who created employees)
    return <AdminFolderList admins={admins} />;
}

export default Media;
