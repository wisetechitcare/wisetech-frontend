import { createEmployeeLevel, updateEmployeeLevel, deleteEmployeeLevel, getAllEmployeeLevels } from '@services/employee';
import { deleteConfirmation } from '@utils/modal';
import { Level } from '../types';
import defaultImage from '@metronic/assets/defaultAvatar/defaultimage.png';

export const handleCreateLevel = async (
    levelName: string,
    currentLevelsCount: number,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    onAddLevel?: () => void
) => {
    try {
        setLoading(true);
        setError(null);

        const payload = {
            name: levelName,
            order: currentLevelsCount + 1,
            isActive: true
        };

        console.log('Creating level with payload:', payload);
        await createEmployeeLevel(payload);

        // Add delay to ensure backend processes
        await new Promise(resolve => setTimeout(resolve, 300));

        // Refetch all levels from API
        await fetchLevels();
        onAddLevel?.();
    } catch (err: any) {
        console.error('Error creating level:', err);
        setError(err.message || 'Failed to create level');
        throw err;
    } finally {
        setLoading(false);
    }
};

export const handleUpdateLevel = async (
    levelId: string,
    levelName: string,
    levelNumber: number,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    onEditLevel?: (level: Level) => void
) => {
    try {
        setLoading(true);
        setError(null);

        const payload = {
            name: levelName,
            order: levelNumber,
            isActive: true
        };

        await updateEmployeeLevel(levelId, payload);
        
        // Refetch all levels from API
        await fetchLevels();
        
        const updatedLevel = { id: levelId, levelNumber, title: levelName } as Level;
        onEditLevel?.(updatedLevel);
    } catch (err: any) {
        console.error('Error updating level:', err);
        setError(err.message || 'Failed to update level');
        throw err;
    } finally {
        setLoading(false);
    }
};

export const handleDeleteLevel = async (
    levelId: string,
    fetchLevels: () => Promise<void>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>
) => {
    const confirmed = await deleteConfirmation(
        "Remove Level",
        "Are you sure ?"
    );

    if (!confirmed) return;

    try {
        setLoading(true);
        setError(null);

        await deleteEmployeeLevel(levelId);
        
        // Refetch all levels from API
        await fetchLevels();
    } catch (err: any) {
        console.error('Error deleting level:', err);
        setError(err.message || 'Failed to delete level');
    } finally {
        setLoading(false);
    }
};

export const fetchEmployeeLevels = async (
    setLevels: React.Dispatch<React.SetStateAction<Level[]>>,
    setLoading: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    page: number = 1,
    limit: number = 5,
    setPagination?: React.Dispatch<React.SetStateAction<any>>
) => {
    try {
        setLoading(true);
        setError(null);
        const response = await getAllEmployeeLevels(page, limit);

        if (response.data.employeeLevels) {
            const mappedLevels = Array.isArray(response.data.employeeLevels) ? response.data.employeeLevels.map((level: any) => {
                return {
                    id: level._id || level.id,
                    levelNumber: level.order,
                    title: level.name,
                    description: level.description || `Level ${level.order} description`,
                    icon: level.icon || 'http://localhost:3845/assets/6378b39cff8c126028e54977a4b9fd9568a5cbe4.svg',
                    employees: Array.isArray(level.employeeMembers) ? level.employeeMembers.map((member: any) => {
                        const emp = member.employee || member;
                        const firstName = emp.employee?.users?.firstName || emp.users?.firstName || emp.firstName || '';
                        const lastName = emp.employee?.users?.lastName || emp.users?.lastName || emp.lastName || '';
                        const fullName = `${firstName} ${lastName}`.trim() || emp.employee?.name || emp.name || 'Unknown Employee';

                        const generateAvatar = () => {
                            return defaultImage;
                        };

                        const avatar = emp.employee?.users?.avatar || emp.users?.avatar || emp.avatar || emp.profilePicture || generateAvatar();
                        const position = emp.employee?.designation?.name || emp.designation?.name || emp.position || 'Employee';

                        return {
                            id: member._id || member.id,
                            name: fullName,
                            position: position,
                            avatar: avatar,
                            employee: member
                        };
                    }) : []
                };
            }) : [];

            setLevels(mappedLevels);

            // Update pagination state if provided
            if (setPagination && response.data.pagination) {
                setPagination({
                    total: response.data.pagination.total,
                    totalPages: response.data.pagination.totalPages,
                    hasNextPage: response.data.pagination.hasNextPage,
                    hasPrevPage: response.data.pagination.hasPrevPage
                });
            }
        }
    } catch (err: any) {
        console.error('Error fetching employee levels:', err);
        setError('Failed to fetch employee levels');
    } finally {
        setLoading(false);
    }
};
