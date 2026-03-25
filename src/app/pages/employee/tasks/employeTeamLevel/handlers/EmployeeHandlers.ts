import { createMultipleEmployeeMembers, deleteEmployeeMember, fetchAllEmployees } from '@services/employee';
import { deleteConfirmation, removeConfirmation } from '@utils/modal';
import { Employee, Level } from '../types';
import defaultAvatar from '@metronic/assets/defaultAvatar/defaultAvatar.png';

export const handleAddEmployee = async (
    levelId: string,
    employeeId: string,
    selectedEmployee: Employee,
    rawEmployeesData: any[],
    setLevels: React.Dispatch<React.SetStateAction<Level[]>>,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    onAddEmployee?: (levelId: string) => void
) => {
    try {
        setLoading(true);
        setError(null);

        const payload = {
            employeeLevelId: levelId,
            employeeIds: [employeeId]
        };

        console.log('Adding employee with payload:', payload);

        // Optimistic UI update
        const rawEmp = rawEmployeesData.find(raw => (raw._id || raw.id) === employeeId);
        const newEmployee = {
            id: selectedEmployee.id,
            name: selectedEmployee.name,
            position: selectedEmployee.position,
            avatar: selectedEmployee.avatar,
            employee: rawEmp ? { ...rawEmp, users: rawEmp.users } : undefined
        };

        setLevels(prevLevels =>
            prevLevels.map(level =>
                level.id === levelId
                    ? { ...level, employees: [...level.employees, newEmployee] }
                    : level
            )
        );

        // Call API and refetch on success
        await createMultipleEmployeeMembers(payload);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchLevels();
        
        onAddEmployee?.(levelId);
    } catch (err: any) {
        console.error('Error adding employee:', err);
        setError(err.message || 'Failed to add employee');
        // Refetch to revert optimistic update on error
        await fetchLevels();
    } finally {
        setLoading(false);
    }
};

export const handleAddMultipleEmployees = async (
    levelId: string,
    selectedEmployees: Employee[],
    rawEmployeesData: any[],
    setLevels: React.Dispatch<React.SetStateAction<Level[]>>,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    onAddEmployee?: (levelId: string) => void
) => {
    try {
        setLoading(true);
        setError(null);

        const payload = {
            employeeLevelId: levelId,
            employeeIds: selectedEmployees.map(emp => emp.id)
        };

        console.log('Adding multiple employees with payload:', payload);

        // Optimistic UI update
        const newEmployees = selectedEmployees.map(emp => {
            const rawEmp = rawEmployeesData.find(raw => (raw._id || raw.id) === emp.id);
            return {
                id: emp.id,
                name: emp.name,
                position: emp.position,
                avatar: emp.avatar,
                employee: rawEmp ? { ...rawEmp, users: rawEmp.users } : undefined
            };
        });

        setLevels(prevLevels =>
            prevLevels.map(level =>
                level.id === levelId
                    ? {
                        ...level,
                        employees: [
                            ...level.employees,
                            ...newEmployees.filter(emp =>
                                !level.employees.some(existingEmp => existingEmp.id === emp.id)
                            )
                        ]
                    }
                    : level
            )
        );

        // Call API and refetch on success
        await createMultipleEmployeeMembers(payload);
        await new Promise(resolve => setTimeout(resolve, 300));
        await fetchLevels();
        
        onAddEmployee?.(levelId);
    } catch (err: any) {
        console.error('Error adding multiple employees:', err);
        setError(err.message || 'Failed to add employees');
        // Refetch to revert optimistic update on error
        await fetchLevels();
    } finally {
        setLoading(false);
    }
};

export const handleDeleteEmployee = async (
    employeeId: string,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    onDeleteEmployee?: (employeeId: string) => void
) => {
    const confirmed = await deleteConfirmation("Removed successfully");

    if (!confirmed) return;

    try {
        setLoading(true);
        setError(null);

        await deleteEmployeeMember(employeeId);
        
        // Refetch all levels from API
        await fetchLevels();
        
        onDeleteEmployee?.(employeeId);
    } catch (err: any) {
        console.error('Error deleting employee:', err);
        setError(err.message || 'Failed to remove employee');
    } finally {
        setLoading(false);
    }
};

export const fetchAvailableEmployees = async (
    setAvailableEmployees: React.Dispatch<React.SetStateAction<Employee[]>>,
    setRawEmployeesData: React.Dispatch<React.SetStateAction<any[]>>
) => {
    try {
        const response = await fetchAllEmployees();

        if (response && response.data.employees && Array.isArray(response.data.employees)) {
            setRawEmployeesData(response.data.employees);

            const employees = response.data.employees.map((emp: any) => {
                const userName = emp.users ? `${emp.users.firstName || ''} ${emp.users.lastName || ''}`.trim() : '';
                const empName = emp.name || userName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown Employee';

                const generateDiceBearAvatar = (emp: any, name: string) => {
                    return defaultAvatar;
                };

                const avatar = emp.avatar || emp.profilePicture || emp.users?.avatar || generateDiceBearAvatar(emp, empName);

                return {
                    id: emp._id || emp.id,
                    name: empName,
                    position: emp.designation?.name || emp.position || 'Employee',
                    avatar: avatar
                };
            });
            
            setAvailableEmployees(employees);
        } else {
            setAvailableEmployees([]);
        }
    } catch (err: any) {
        console.error('Error fetching employees:', err);
        setAvailableEmployees([]);
    }
};
