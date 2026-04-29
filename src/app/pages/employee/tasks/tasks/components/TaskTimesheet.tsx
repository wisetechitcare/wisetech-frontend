import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Row, Col, Button, Table } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import { Chip } from '@mui/material';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { getTimesheetByTaskId, deleteTimeSheetById, getAllTimeSheetWithCostByProjectId } from '@services/tasks';
import { fetchAllEmployees } from '@services/employee';
import NewTimeLogForm from '@app/pages/employee/timesheet/employeetimesheet/component/NewTimeLogForm';
import { deleteConfirmation } from '@utils/modal';
import { toast } from 'react-toastify';
import { useEventBus } from '@hooks/useEventBus';
import { EVENT_KEYS } from '@constants/eventKeys';

// Extend dayjs with duration plugin
dayjs.extend(duration);

interface TaskTimesheetProps {
    taskId?: string;
    projectId?: string;
    task?: any;
    // Make component reusable by accepting either taskId or projectId
    fetchMode?: 'task' | 'project';
}

interface TimeSheetData {
    id: string;
    taskName: string;
    startTime: string;
    endTime: string;
    billable: boolean;
    cost: number;
    costFormatted: string;
    createdAt: string;
    updatedAt: string;
    employeeId: string;
    hourlyRate: number;
    totalHours: number;
    logTimeHours: number;
    logTimeMinutes: number;
    logTimeSeconds: number;
    workedDuration: string;
    original: {
        employee?: {
            users?: {
                firstName: string;
                lastName: string;
            };
        };
        description?: string;
    };
}

interface ApiResponse {
    hasError: boolean;
    message: string;
    statusCode: number;
    summary: {
        totalEntries: number;
        billableEntries: number;
        totalHours: number;
        totalCost: number;
        totalCostFormatted: string;
    };
    timeSheets: TimeSheetData[];
}

const TaskTimesheet: React.FC<TaskTimesheetProps> = ({ 
    taskId, 
    projectId, 
    task, 
    fetchMode = 'project' 
}) => {
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [logs, setLogs] = useState<TimeSheetData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [showAddLogModal, setShowAddLogModal] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'All' | 'Billable' | 'Non Billable'>('All');
    const [selectedTimeSheet, setSelectedTimeSheet] = useState<any>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Get the ID to use for fetching based on fetchMode
    const fetchId = useMemo(() => {
        return fetchMode === 'task' ? taskId : projectId;
    }, [fetchMode, taskId, projectId]);

    // Format time duration helper
    const formatDuration = useCallback((hours: number, minutes: number = 0, seconds: number = 0) => {
        if (hours === 0 && minutes === 0 && seconds === 0) return '—';
        
        const totalMinutes = hours * 60 + minutes;
        const totalSeconds = totalMinutes * 60 + seconds;
        
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        } else if (totalMinutes < 60) {
            return `${totalMinutes}m`;
        } else {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
    }, []);

    // Calculate summary from logs
    const calculatedSummary = useMemo(() => {
        if (!logs.length) {
            return {
                totalLogTime: '0h 0m',
                totalCost: '₹0',
                totalLogs: 0,
                billableLogs: 0,
                nonBillableLogs: 0
            };
        }

        // Calculate total seconds from all logs to avoid floating point issues
        const totalSecondsFromLogs = logs.reduce((sum, log) => {
            const hours = log.logTimeHours || 0;
            const minutes = log.logTimeMinutes || 0;
            const seconds = log.logTimeSeconds || 0;
            return sum + (hours * 3600) + (minutes * 60) + seconds;
        }, 0);

        // Convert back to hours, minutes, seconds
        const totalHours = Math.floor(totalSecondsFromLogs / 3600);
        const remainingMinutes = Math.floor((totalSecondsFromLogs % 3600) / 60);
        const remainingSeconds = totalSecondsFromLogs % 60;

        const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
        const billableLogs = logs.filter(log => log.billable).length;

        const result = {
            totalLogTime: formatDuration(totalHours, remainingMinutes, remainingSeconds),
            totalCost: `₹${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            totalLogs: logs.length,
            billableLogs,
            nonBillableLogs: logs.length - billableLogs
        };

        return result;
    }, [logs, formatDuration]);

    const handleAddLogClick = () => {
        setShowAddLogModal(true);
    };

    const handleCloseModal = () => {
        setShowAddLogModal(false);
        setSelectedTimeSheet(null);
    };

    const handleEditTimeSheet = (log: TimeSheetData) => {
        setSelectedTimeSheet(log);
        setShowAddLogModal(true);
    };

    const handleDeleteTimeSheet = async (log: TimeSheetData) => {
        const isConfirmed = await deleteConfirmation("Are you sure you want to delete this timesheet entry?");
        if (isConfirmed) {
            try {
                await deleteTimeSheetById(log.id);
                toast.success("Timesheet entry deleted successfully");
                await fetchTimesheetData();
            } catch (err) {
                toast.error("Failed to delete timesheet entry");
                console.error('Delete error:', err);
            }
        }
    };

    const handleLogAdded = () => {
        fetchTimesheetData();
        setShowAddLogModal(false);
    };

    const fetchTimesheetData = async () => {
        if (!fetchId) {
            setError("No ID provided for fetching timesheet data");
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            let response: ApiResponse;
            
            // if (fetchMode === 'task') {
            //     response = await getTimesheetByTaskId(fetchId);
            // } else {
                response = await getAllTimeSheetWithCostByProjectId(fetchId, "");
            // }
            
            
            if (response.hasError) {
                throw new Error(response.message || 'Failed to fetch timesheet data');
            }
            
            setApiResponse(response);
            setLogs(response.timeSheets || []);
            
        } catch (err) {
            console.error("Error fetching timesheet data:", err);
            setError(err instanceof Error ? err.message : "Failed to load timesheet data");
            setLogs([]);
            setApiResponse(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTimesheetData();
    }, [fetchId, fetchMode]);

    // Listen for timesheet creation/update events
    useEventBus(EVENT_KEYS.NewTimeLogFromCreated, fetchTimesheetData);

    // Use calculated summary for time (more accurate), but API summary for cost and count
    const displaySummary = useMemo(() => {
        if (apiResponse?.summary) {
            return {
                totalLogTime: calculatedSummary.totalLogTime, // Use calculated time (more accurate)
                totalCost: apiResponse.summary.totalCostFormatted || '₹0', // Use API cost
                totalLogs: apiResponse.summary.totalEntries || 0 // Use API count
            };
        }
        return calculatedSummary;
    }, [apiResponse, calculatedSummary]);

    const summaryCards = [
        {
            title: 'Total Log Time',
            value: displaySummary.totalLogTime,
            icon: 'time',
            bgColor: 'bg-light-primary',
            iconColor: 'text-primary',
            img: "/media/details/timesheetone.png"
        },
        {
            title: 'Total Cost',
            value: displaySummary.totalCost,
            icon: 'dollar',
            bgColor: 'bg-light-success',
            iconColor: 'text-success',
            img: "/media/details/totalCost.png"
        },
        {
            title: 'Total Logs',
            value: displaySummary.totalLogs.toString(),
            icon: 'document',
            bgColor: 'bg-light-info',
            iconColor: 'text-info',
            img: "/media/details/totallogs.png"
        }
    ];

    const filterButtons: Array<'All' | 'Billable' | 'Non Billable'> = ['All', 'Billable', 'Non Billable'];

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            switch (activeFilter) {
                case 'Billable':
                    return log.billable === true;
                case 'Non Billable':
                    return log.billable === false;
                default:
                    return true;
            }
        });
    }, [logs, activeFilter]);

    const getEmployeeName = (log: TimeSheetData) => {
        const employee = log.original?.employee;
        if (employee?.users) {
            return `${employee.users.firstName || ''} ${employee.users.lastName || ''}`.trim();
        }
        return log.employeeId || '—';
    };

    // Mobile table navigation functions
    const scrollTableLeft = () => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft -= 200;
        }
    };

    const scrollTableRight = () => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft += 200;
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <div className="text-muted mt-3">Loading timesheet data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Summary Cards */}
            <Row className="g-6 mb-4">
                {summaryCards.map((card, index) => (
                    <Col md={4} key={index}>
                        <Card className="h-100">
                            <Card.Body className="d-flex align-items-center p-2">
                                <div className={`symbol symbol-50px me-4 ${card.bgColor} rounded-circle`}>
                                    <div className="symbol-label rounded-circle">
                                        <img 
                                            src={card.img} 
                                            alt={card.title}
                                            style={{ width: '24px', height: '24px' }}
                                        />
                                    </div>
                                </div>
                                <Card.Body className="p-6">
                                    <div className="d-flex justify-content-between align-items-center w-100">
                                        <div
                                            className="mb-0"
                                            style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '14px' }}
                                        >
                                            {card.title}
                                        </div>
                                        <div
                                            style={{
                                                fontFamily: 'Inter',
                                                fontWeight: 500,
                                                fontSize: '14px',
                                                color: '#1D5DE1',
                                            }}
                                        >
                                            {card.value}
                                        </div>
                                    </div>
                                </Card.Body>

                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Logs Section */}
            <Card>
                <Card.Header className="border-0 pt-6">
                    <div className="d-flex justify-content-between align-items-center w-100">
                        <h3 className="card-title fw-bold">Time Logs</h3>
                        <Button 
                            variant="primary" 
                            className="btn btn-primary"
                            onClick={handleAddLogClick}
                        >
                            <KTIcon iconName="plus" className="fs-6 me-2" />
                            Add Log
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="pt-0">
                    {/* Filter Buttons */}
                    <div className="d-flex gap-2 mb-6 flex-wrap">
                        {filterButtons.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`btn ${activeFilter === filter ? 'btn-primary' : 'btn-light'} btn-sm`}
                                style={{
                                    borderRadius: '50px',
                                    padding: '8px 20px',
                                    border: 'none',
                                    fontWeight: '500'
                                }}
                            >
                                {filter}
                                {filter !== 'All' && (
                                    <span className="badge badge-circle badge-light-primary ms-2">
                                        {filter === 'Billable' 
                                            ? calculatedSummary.billableLogs 
                                            : calculatedSummary.nonBillableLogs
                                        }
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Error State */}
                    {error && (
                        <div className="alert alert-danger d-flex align-items-center mb-6">
                            <KTIcon iconName="warning-2" className="fs-2 me-3" />
                            <div>
                                <strong>Error:</strong> {error}
                                <button 
                                    className="btn btn-light btn-sm ms-3" 
                                    onClick={fetchTimesheetData}
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Logs Table */}
                    <div className="table-responsive" ref={tableContainerRef}>
                        {filteredLogs.length > 0 ? (
                            <Table className="table table-row-dashed table-row-gray-300 gy-7">
                                <thead>
                                    <tr style={{ fontFamily: 'Inter', fontWeight: '500', fontSize: '14px', color: '#7A8597' }}>
                                        <th className="min-w-50px text-center">#</th>
                                        <th className="min-w-150px">Task Name</th>
                                        <th className="min-w-150px">Added By</th>
                                        <th className="min-w-120px">Date</th>
                                        <th className="min-w-150px">Logged Time</th>
                                        <th className="min-w-100px">Start Time</th>
                                        <th className="min-w-100px">End Time</th>
                                        <th className="min-w-150px">Completed Time</th>
                                        <th className="min-w-100px text-center">Billable</th>
                                        <th className="min-w-100px">Cost</th>
                                        <th className="min-w-150px">Last Updated</th>
                                        <th className="min-w-120px text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLogs.map((log, index) => (
                                        <tr key={log.id} style={{ fontFamily: 'Inter', fontWeight: '400', fontSize: '14px', verticalAlign: 'middle' }}>
                                            <td className="text-center">{index + 1}</td>
                                            <td>
                                                <div className="fw-semibold">{log.taskName || '—'}</div>
                                            </td>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <span>{getEmployeeName(log)}</span>
                                                </div>
                                            </td>
                                            <td className="text-nowrap">
                                                {dayjs(log.startTime).format('DD MMM YYYY')}
                                            </td>
                                            <td>
                                                <span className="badge badge-light-primary fw-bold">
                                                    {formatDuration(log.logTimeHours, log.logTimeMinutes, log.logTimeSeconds)}
                                                </span>
                                            </td>
                                            <td className="text-nowrap">{dayjs(log.startTime).format('HH:mm')}</td>
                                            <td className="text-nowrap">{dayjs(log.endTime).format('HH:mm')}</td>
                                            <td className="text-nowrap text-center">{log?.updatedAt ? dayjs(log.updatedAt).format('DD MMM YYYY HH:mm') : '—'}</td>
                                            <td className="text-center"> {log.billable ? 'Yes' : 'No'}</td>
                                            <td>
                                                <span className="" style={{color:'#1D5DE1'}}>
                                                    {log.costFormatted || `₹${(log.cost || 0).toFixed(2)}`}
                                                </span>
                                            </td>
                                            <td className="text-nowrap">
                                                {log.updatedAt ? dayjs(log.updatedAt).format('DD MMM YYYY HH:mm') : '—'}
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button
                                                        className="btn btn-sm btn-light btn-active-light-primary"
                                                        onClick={() => handleEditTimeSheet(log)}
                                                        title="Edit timesheet"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-light btn-active-light-danger"
                                                        onClick={() => handleDeleteTimeSheet(log)}
                                                        title="Delete timesheet"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <div className="text-center py-12">
                                <div className="mb-4">
                                    <KTIcon iconName="time" className="fs-3x text-muted" />
                                </div>
                                <h5 className="text-muted mb-3">No time logs found</h5>
                                <p className="text-muted mb-4">
                                    {activeFilter === 'All' 
                                        ? "No time logs have been added yet." 
                                        : `No ${activeFilter.toLowerCase()} time logs found.`
                                    }
                                </p>
                                <Button variant="primary" onClick={handleAddLogClick}>
                                    <KTIcon iconName="plus" className="fs-6 me-2" />
                                    Add First Log
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Table Navigation Arrows */}
                    {filteredLogs.length > 0 && (
                        <div className="d-flex justify-content-center gap-3 mt-4">
                            <div
                                
                                onClick={scrollTableLeft}
                                className="d-flex align-items-center"
                                style={{
                                    borderRadius: '50px',
                                    padding: '8px 16px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                <KTIcon iconName="black-left" className="fs-2 me-1" />
                            </div>
                            <div
                                onClick={scrollTableRight}
                                className="d-flex align-items-center"
                                style={{
                                    borderRadius: '50px',
                                    padding: '8px 16px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                <KTIcon iconName="black-right" className="fs-2 ms-1" />
                            </div>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Modal */}
            {showAddLogModal && (
                <NewTimeLogForm
                    show={showAddLogModal}
                    onClose={handleCloseModal}
                    timeSheetId={selectedTimeSheet?.id}
                    prefilledProjectId={projectId || task?.project?.id}
                    prefilledTaskId={taskId || task?.id}
                />
            )}
        </div>
    );
};

export default TaskTimesheet;