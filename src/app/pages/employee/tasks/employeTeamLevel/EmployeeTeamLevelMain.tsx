import React, { useState, useCallback, useEffect } from 'react';
import { EmployeeTeamLevelMainProps, Level, Employee } from './types';
import { LevelSection, FormModal } from './components';
import { FormMode, FormSubmitData } from './components/FormModal';
import {
    fetchEmployeeLevels,
    handleCreateLevel,
    handleUpdateLevel,
    handleDeleteLevel
} from './handlers/LevelHandlers';
import {
    fetchAvailableEmployees,
    handleAddEmployee,
    handleAddMultipleEmployees,
    handleDeleteEmployee
} from './handlers/EmployeeHandlers';

const EmployeeTeamLevelMain: React.FC<EmployeeTeamLevelMainProps> = ({
    levels: propLevels,
    onAddLevel,
    onAddEmployee,
    onEditLevel,
    onEditEmployee,
    onDeleteEmployee
}) => {
    // State
    const [levels, setLevels] = useState<Level[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<FormMode>('addLevel');
    const [selectedLevel, setSelectedLevel] = useState<Level | undefined>();
    const [selectedLevelNumber, setSelectedLevelNumber] = useState<number | undefined>();
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>();
    const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
    const [rawEmployeesData, setRawEmployeesData] = useState<any[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
    });

    // Fetch data on mount
    const loadLevels = useCallback(async (page: number = 1, limit: number = 5) => {
        await fetchEmployeeLevels(setLevels, setLoading, setError, page, limit, setPagination);
    }, []);

    useEffect(() => {
        loadLevels(currentPage, itemsPerPage);
        fetchAvailableEmployees(setAvailableEmployees, setRawEmployeesData);
    }, [currentPage, itemsPerPage]);

    // Modal actions
    const openModal = useCallback((mode: FormMode, level?: Level, employee?: Employee) => {
        setModalMode(mode);
        setSelectedLevel(level);
        setSelectedLevelNumber(level?.levelNumber ?? levels.length + 1);
        setSelectedEmployee(employee);
        setIsModalOpen(true);
    }, [levels.length]);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedLevel(undefined);
        setSelectedLevelNumber(undefined);
        setSelectedEmployee(undefined);
    }, []);

    // Form submission
    const handleFormSubmit = useCallback(async (data: FormSubmitData) => {
        try {
            setLoading(true);
            setError(null);

            if (modalMode === 'addLevel' && data.levelName) {
                await handleCreateLevel(data.levelName, levels.length, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onAddLevel);
            }
            else if (modalMode === 'editLevel' && selectedLevel && data.levelName) {
                await handleUpdateLevel(selectedLevel.id, data.levelName, selectedLevel.levelNumber, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onEditLevel);
            }
            else if (modalMode === 'addEmployee' && selectedLevel && data.selectedEmployee) {
                await handleAddEmployee(selectedLevel.id, data.selectedEmployee.id, data.selectedEmployee, rawEmployeesData, setLevels, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onAddEmployee);
            }
            else if (modalMode === 'addMultipleEmployees' && selectedLevel && data.selectedEmployees) {
                await handleAddMultipleEmployees(selectedLevel.id, data.selectedEmployees, rawEmployeesData, setLevels, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onAddEmployee);
            }
            else if (modalMode === 'editEmployee' && selectedEmployee && data.employeeName && data.employeePosition) {
                const updatedEmployee: Employee = {
                    ...selectedEmployee,
                    name: data.employeeName,
                    position: data.employeePosition
                };
                setLevels(prevLevels =>
                    prevLevels.map(level => ({
                        ...level,
                        employees: level.employees.map(emp =>
                            emp.id === selectedEmployee.id ? updatedEmployee : emp
                        )
                    }))
                );
                onEditEmployee?.(updatedEmployee);
            }

            closeModal();
        } catch (err: any) {
            console.error('Error in form submission:', err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [modalMode, selectedLevel, selectedEmployee, levels.length, rawEmployeesData, loadLevels, currentPage, itemsPerPage, onAddLevel, onEditLevel, onAddEmployee, onEditEmployee, closeModal]);

    // Form deletion
    const handleFormDelete = useCallback(async () => {
        if (modalMode === 'editEmployee' && selectedEmployee) {
            await handleDeleteEmployee(selectedEmployee.id, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onDeleteEmployee);
        } else if (modalMode === 'editLevel' && selectedLevel) {
            await handleDeleteLevel(selectedLevel.id, () => loadLevels(currentPage, itemsPerPage), setLoading, setError);
        }
        closeModal();
    }, [modalMode, selectedEmployee, selectedLevel, loadLevels, currentPage, itemsPerPage, onDeleteEmployee, closeModal]);

    // Delete employee from card
    const handleEmployeeDelete = useCallback(async (employeeId: string) => {
        await handleDeleteEmployee(employeeId, () => loadLevels(currentPage, itemsPerPage), setLoading, setError, onDeleteEmployee);
    }, [loadLevels, currentPage, itemsPerPage, onDeleteEmployee]);

    // Pagination handlers
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (pagination.hasPrevPage) {
            setCurrentPage(prev => prev - 1);
        }
    };

    const handleNext = () => {
        if (pagination.hasNextPage) {
            setCurrentPage(prev => prev + 1);
        }
    };

    return (
        <div className="position-relative bg-light min-vh-100">
            <div className="container-fluid p-3 p-sm-4">
                {/* Header */}
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
                    <div className="flex-grow-1">
                        <h1 className="mb-2 fw-semibold" style={{ fontFamily: 'Barlow', fontSize: '22px', letterSpacing: '0.22px' }}>
                            Employees by levels
                        </h1>
                        <p className="mb-0 text-secondary" style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px' }}>
                            Manage employee levels and assignments
                        </p>
                    </div>

                    <button
                        type="button"
                        className="btn flex-shrink-0"
                        style={{
                            fontFamily: 'Inter',
                            fontSize: '14px',
                            fontWeight: 500,
                            borderRadius: '6px',
                            padding: '8px 20px',
                            height: '40px',
                            backgroundColor: '#9d4141',
                            borderColor: '#9d4141',
                            opacity: loading ? 0.6 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            color:"white"
                        }}
                        onClick={() => openModal('addLevel')}
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Add New Level'}
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                        <strong>Error:</strong> {error}
                        <button
                            type="button"
                            className="btn-close"
                            onClick={() => setError(null)}
                            aria-label="Close"
                        ></button>
                    </div>
                )}

                {/* Loading State */}
                {loading && levels.length === 0 && (
                    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                        <div className="text-center">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="mt-2">Loading employee levels...</p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {!loading || levels.length > 0 ? (
                    <>
                        <div className="bg-white rounded-3 p-3">
                            {levels.length > 0 ? (
                                levels.map((level) => (
                                    <LevelSection
                                        key={level.id}
                                        level={level}
                                        onAddEmployee={(levelId) => {
                                            const lvl = levels.find(l => l.id === levelId);
                                            if (lvl) openModal('addEmployee', lvl);
                                        }}
                                        onAddMultipleEmployees={(levelId) => {
                                            const lvl = levels.find(l => l.id === levelId);
                                            if (lvl) openModal('addMultipleEmployees', lvl);
                                        }}
                                        onEditLevel={(lvl) => openModal('editLevel', lvl)}
                                        onEditEmployee={(emp) => openModal('editEmployee', undefined, emp)}
                                        onDeleteEmployee={handleEmployeeDelete}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-5">
                                    <h5>No employee levels found</h5>
                                    <p className="text-muted">Create your first employee level to get started.</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {pagination.totalPages > 1 && (
                            <div className="row mt-4">
                                <div className="col-12">
                                    <div className="d-flex justify-content-between align-items-center">
                                        {/* Pagination Info */}
                                        <div style={{
                                            fontFamily: 'Inter',
                                            fontSize: '14px',
                                            color: '#8998AB'
                                        }}>
                                            Showing page {currentPage} of {pagination.totalPages} ({pagination.total} total levels)
                                        </div>

                                        {/* Pagination Navigation */}
                                        <nav aria-label="Employee levels pagination">
                                            <ul className="pagination mb-0" style={{ gap: '8px' }}>
                                                {/* Previous Button */}
                                                <li className={`page-item ${!pagination.hasPrevPage ? 'disabled' : ''}`}>
                                                    <button
                                                        className="btn"
                                                        onClick={handlePrevious}
                                                        disabled={!pagination.hasPrevPage}
                                                        style={{
                                                            border: '1px solid #c1c9d6',
                                                            borderRadius: '6px',
                                                            padding: '8px 12px',
                                                            fontFamily: 'Inter',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: !pagination.hasPrevPage ? '#c1c9d6' : '#202020',
                                                            backgroundColor: 'white'
                                                        }}
                                                    >
                                                        Previous
                                                    </button>
                                                </li>

                                                {/* Page Numbers */}
                                                {Array.from({ length: pagination.totalPages }, (_, index) => {
                                                    const page = index + 1;
                                                    const isActive = page === currentPage;

                                                    return (
                                                        <li key={page} className="page-item">
                                                            <button
                                                                className="btn"
                                                                onClick={() => handlePageChange(page)}
                                                                style={{
                                                                    border: '1px solid #c1c9d6',
                                                                    borderRadius: '6px',
                                                                    padding: '8px 12px',
                                                                    fontFamily: 'Inter',
                                                                    fontSize: '14px',
                                                                    fontWeight: '500',
                                                                    minWidth: '40px',
                                                                    color: isActive ? 'white' : '#202020',
                                                                    backgroundColor: isActive ? '#9d4141' : 'white',
                                                                    borderColor: isActive ? '#9d4141' : '#c1c9d6'
                                                                }}
                                                            >
                                                                {page}
                                                            </button>
                                                        </li>
                                                    );
                                                })}

                                                {/* Next Button */}
                                                <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                                                    <button
                                                        className="btn"
                                                        onClick={handleNext}
                                                        disabled={!pagination.hasNextPage}
                                                        style={{
                                                            border: '1px solid #c1c9d6',
                                                            borderRadius: '6px',
                                                            padding: '8px 12px',
                                                            fontFamily: 'Inter',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: !pagination.hasNextPage ? '#c1c9d6' : '#202020',
                                                            backgroundColor: 'white'
                                                        }}
                                                    >
                                                        Next
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>

            {/* Form Modal */}
            <FormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                mode={modalMode}
                levelData={selectedLevel}
                levelNumber={selectedLevelNumber}
                employeeData={selectedEmployee}
                onSubmit={handleFormSubmit}
                onDelete={handleFormDelete}
                availableEmployees={availableEmployees}
            />
        </div>
    );
};

export default EmployeeTeamLevelMain;
