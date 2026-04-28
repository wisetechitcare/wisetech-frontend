import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { Button } from "@mui/material";
import { getAllTasks, deleteTask, getTasksByProjectId, getAllTasksWithMetrics } from "@services/tasks";
import React, { useEffect, useState, useCallback } from "react";
import TaskForm from "./components/TaskForm";
import { useNavigate } from "react-router-dom";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";

interface Props {
    projectId?: string;
}

const TasksMainTable: React.FC<Props> = ({projectId}) => {
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    const [isEdit, setIsEdit] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [open, setOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const [tasksMetrics, setTasksMetrics] = useState<any[]>([]);

    const fetchTasks = useCallback(async () => {
        try {
            setIsLoading(true);
            const response1 = await getAllTasksWithMetrics()
            // console.log("response1", response1);
            
            setTasksMetrics(response1.tasks);
            if(projectId){
                const response = await getTasksByProjectId(projectId)
                
                setTasks(response.data.tasks);
            }else{
                const response = await getAllTasks();
                
                setTasks(response.data.tasks);
            }
        } catch (error) {
            console.error("Error fetching tasks:", error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleNewTaskClick = () => {
        setSelectedTask(null);
        setIsEdit(false);
        setShowTaskModal(true);
    };

    const handleEditTask = (task: any) => {
        setSelectedTask(task);
        setIsEdit(true);
        setShowTaskModal(true);
    };

    const handleTaskModalClose = () => {
        setShowTaskModal(false);
        setSelectedTask(null);
        setIsEdit(false);
    };

    const handleTaskSubmitSuccess = (taskData: any) => {
        fetchTasks();
        handleTaskModalClose();
    };

    if(isLoading){
        return <Loader />;
    }

    const columns = [
        {
            accessorKey: "serialNumber",
            header: "Sr. No.",
            Cell: ({ row }: any) => row.index + 1,
            enableSorting: false,
        },
        {
            accessorKey: "taskName",
            header: "Task Name",
            Cell: ({ row }: any) => {
                const taskName = row?.original?.taskName || "N/A";

                return (
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id={`tooltip-taskname-${row?.original?.id}`}>
                                {taskName}
                            </Tooltip>
                        }
                    >
                        <div
                            style={{
                                maxWidth: '200px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                            }}
                        >
                            {taskName}
                        </div>
                    </OverlayTrigger>
                );
            },
        },
        {
            accessorKey: "taskDescription",
            header: "Description",
            Cell: ({ row }: any) => {
                const taskDescription = row?.original?.taskDescription || "N/A";

                return (
                    <OverlayTrigger
                        placement="top"
                        overlay={
                            <Tooltip id={`tooltip-description-${row?.original?.id}`}>
                                {taskDescription}
                            </Tooltip>
                        }
                    >
                        <div
                            style={{
                                maxWidth: '250px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                cursor: 'pointer'
                            }}
                        >
                            {taskDescription}
                        </div>
                    </OverlayTrigger>
                );
            },
        },
        {
            accessorKey: "project",
            header: "Project",
            Cell: ({ row }: any) => row?.original?.project?.title || "N/A",
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ row }: any) => {
                const status = row?.original?.status;
                if (!status || !status.name) return "N/A";

                return (
                    <span
                        style={{
                            backgroundColor: status.color || '#6c757d',
                            color: 'white',
                            fontWeight: '500',
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        {status.name}
                    </span>
                );
            },
        },
        {
            accessorKey: "priority",
            header: "Priority",
            Cell: ({ row }: any) => {
                const priority = row?.original?.priority;
                if (!priority || !priority.name) return "N/A";

                return (
                    <span
                        style={{
                            backgroundColor: priority.color || '#6c757d',
                            color: 'white',
                            fontWeight: '500',
                            fontSize: '11px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            display: 'inline-block',
                            minWidth: '60px',
                            textAlign: 'center'
                        }}
                    >
                        {priority.name}
                    </span>
                );
            },
        },
        {
            accessorKey: "assignedTo",
            header: "Assigned To",
            Cell: ({ row }: any) => row?.original?.assignedTo?.users?.firstName + " " + row?.original?.assignedTo?.users?.lastName || "N/A",
        },
        {
            accessorKey: "createdBy",
            header: "Created By",
            Cell: ({ row }: any) =>
                row?.original?.createdBy?.users?.firstName + " " + row?.original?.createdBy?.users?.lastName || "N/A",
        },
        {
            accessorKey: "startDate",
            header: "Start Date",
            Cell: ({ row }: any) =>
                row?.original?.startDate
                    ? dayjs(row.original.startDate).format("DD-MM-YYYY") + " " + dayjs(row.original.startTime).format("HH:mm")
                    : "N/A",
        },
        {
            accessorKey: "dueDate",
            header: "Due Date",
            Cell: ({ row }: any) =>
                row?.original?.dueDate
                    ? dayjs(row.original.dueDate).format("DD-MM-YYYY") + " " + dayjs(row.original.dueTime).format("HH:mm")
                    : "N/A",
        },
        {
            accessorKey: "completionDate",
            header: "Completion Date",
            Cell: ({ row }: any) => {
                const isCompleted = row?.original?.status?.name?.toLowerCase() === 'completed';
                if (!isCompleted) return "N/A";

                const completionDate = row?.original?.completionDate || row?.original?.updatedAt;
                return completionDate
                    ? dayjs(completionDate).format("DD-MM-YYYY") + " " + dayjs(completionDate).format("HH:mm")
                    : "N/A";
            },
        },
        {
            accessorKey: "cost",
            header: "Cost",
            Cell: ({ row }: any) => {
                const billingType = row?.original?.billingType;
                if (billingType !== "BILLABLE") return "N/A";

                const taskMetric = tasksMetrics.find(metric => metric.id === row?.original?.id);
                return taskMetric?.metrics?.totalCostFormatted || row?.original?.cost || "N/A";
            },
        },
        {
            accessorKey: "Billable",
            header: "Billable",
            Cell: ({ row }: any) => {
                const billingType = row?.original?.billingType;

                if (billingType === "BILLABLE") {
                    return (
                        <span
                            style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                minWidth: '40px',
                                textAlign: 'center'
                            }}
                        >
                            Yes
                        </span>
                    );
                }

                if (billingType === "NON_BILLABLE") {
                    return (
                        <span
                            style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '11px',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                minWidth: '40px',
                                textAlign: 'center'
                            }}
                        >
                            No
                        </span>
                    );
                }

                // Return N/A for undefined/null values
                return "N/A";
            },
        },
        {
            accessorKey: "totalTimeLog",
            header: "Total Log Time",
            Cell: ({ row }: any) => {
                const taskMetric = tasksMetrics.find(metric => metric.id === row?.original?.id);
                return taskMetric?.metrics?.totalLogTimeFormatted || "N/A";
            },
        },
        {
            accessorKey: "actions",
            header: "Actions",
            Cell: ({ row }: any) => (
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                        onClick={e => {
                            e.stopPropagation();
                            handleEditTask(row.original);
                        }}
                    >
                        <KTIcon iconName="pencil" className="fs-2" />
                    </button>
                    <button
                        className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                        onClick={e => {
                            e.stopPropagation();
                            handleDeleteTask(row.original);
                        }}
                    >
                        <KTIcon iconName="trash" className="fs-2" />
                    </button>
                </div>
            ),
        },
    ];

    const handleDeleteTask = async (task: any) => {
        try {
            const sure = await deleteConfirmation("Task deleted successfully!");
            if (!sure) return;
            await deleteTask(task.id);
            fetchTasks();
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };



    const handleClose = () => {
        setOpen(false);
    };

    return (
        <>
            <div>
                <div className="d-flex align-items-center justify-content-between mb-4">
                    <div
                        // className="mb-4"
                        style={{
                            fontFamily: "Barlow",
                            fontSize: "24px",
                            fontWeight: "600",
                        }}
                    >
                        Tasks
                    </div>
                    <div className="d-flex align-items-center gap-3">
                        {/* <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#7A2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg> */}
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNewTaskClick}
                            sx={{
                                backgroundColor: '#9D4141',
                                '&:hover': {
                                    backgroundColor: '#7e3434'
                                },
                                textTransform: 'none',
                                px: 3,
                                py: 1,
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500
                            }}
                        >
                            New Task
                        </Button>
                    </div>
                </div>
                 {/* <Notifications 
                    open={open} 
                    onClose={handleClose} 
                    title="Task Deleted" 
                    message="Task deleted successfully!" 
                    icon={<PauseCircleIcon sx={{ color: "green", fontSize: 48, mr: 1 }} />} 
                  
                 /> */}
                    <MaterialTable
                        columns={columns}
                        data={tasks}
                        tableName="Tasks"
                        muiTableProps={{
                            sx: {
                                borderCollapse: 'separate',
                                borderSpacing: '0 20px !important', // 20px vertical spacing between rows
                                m: 0,
                                p: 0
                            },

                            muiTableBodyRowProps: ({ row }) => ({

                                sx: {
                                    cursor: 'pointer',
                                    backgroundColor: `${row.original?.status?.color}30`,
                                    padding: '10px !important',
                                    m: 0,
                                    p: 0,

                                    '& .MuiTableCell-root': {
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontSize: '14px',
                                        fontFamily: 'Inter',
                                        fontWeight: '400',
                                        padding: '8px 16px !important',
                                        borderBottom: "2px solid white",
                                        borderTop: "2px solid white",
                                        // '&:hover': {
                                        //     backgroundColor: `${row.original?.status?.color}99`,
                                        //     '& td': {
                                        //         color: 'black',
                                        //     },
                                        // },
                                    },
                                    '& .MuiTableCell-root:first-of-type': {
                                        borderTopLeftRadius: '12px',
                                        borderBottomLeftRadius: '12px',
                                        borderLeft: "3px solid white"

                                    },
                                    '& .MuiTableCell-root:last-of-type': {
                                        borderTopRightRadius: '12px',
                                        borderBottomRightRadius: '12px',
                                        borderRight: "3px solid white"
                                    },
                                    '&:hover': {
                                        backgroundColor: `${row.original?.status?.color}99`,
                                        '& td': {
                                            color: 'black',
                                        },
                                    },
                                },
                                onClick: () => {
                                    navigate(`/tasks/${row.original.id}`, {
                                      state: { leadData: row.original.id },
                                    });
                                  },

                            }),

                        }}
                        muiTablePaperStyle={{
                            sx: {
                                m: 0,
                                p: 0,
                            },
                        }}
                    />

                {showTaskModal && (
                    <TaskForm
                        open={showTaskModal}
                        onClose={handleTaskModalClose}
                        onSubmit={handleTaskSubmitSuccess}
                        isEdit={isEdit}
                        selectedTask={selectedTask}
                        title={isEdit ? "Edit Task" : "Add New Task"}
                        // headerName={isEdit ? "Edit Task" : "Create New Task"}
                        taskType={selectedTask?.taskType || 'PRESETS'}
                        taskName={selectedTask?.taskName || ''}
                        taskDescription={selectedTask?.taskDescription || ''}
                        chooseProject={selectedTask?.project?.id || ''}
                        assignTo={selectedTask?.assignedTo?.id || ''}
                        status={selectedTask?.status?.id || ''}
                        priority={selectedTask?.priority?.id || ''}
                        billable={selectedTask?.billingType ?? "BILLABLE"}
                        startDate={selectedTask?.startDate ? new Date(selectedTask.startDate).toISOString().split('T')[0] : ''}
                        dueDate={selectedTask?.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : ''}
                        startTime={selectedTask?.startTime ? new Date(selectedTask.startTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                        dueTime={selectedTask?.dueTime ? new Date(selectedTask.dueTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : ''}
                        logTime={
                            selectedTask
                                ? `${String(selectedTask.logTimeHours || 0).padStart(2, '0')}:${String(selectedTask.logTimeMinutes || 0).padStart(2, '0')}:${String(selectedTask.logTimeSeconds || 0).padStart(2, '0')}`
                                : undefined
                        }
                    />
                )}
            </div>
        </>
    );
};

export default TasksMainTable;
