import { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { getAllTasks, getAllTasksWithMetrics, deleteTask } from "@services/tasks";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";

interface DashboardTasksProps {
  onNewTaskClick: () => void;
  onEditTask: (task: any) => void;
}

const DashboardTasks = ({ onNewTaskClick, onEditTask }: DashboardTasksProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksMetrics, setTasksMetrics] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const navigate = useNavigate();
  // Fetch tasks data
  const fetchTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true);
      const response1 = await getAllTasksWithMetrics();
      setTasksMetrics(response1.tasks);

      const response = await getAllTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleDeleteTask = async (task: any) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#9D4141",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        await deleteTask(task.id);
        await fetchTasks();
        Swal.fire("Deleted!", "Task has been deleted.", "success");
      } catch (error) {
        console.error("Error deleting task:", error);
        Swal.fire("Error!", "Failed to delete task.", "error");
      }
    }
  };

  // Column definitions for tasks table
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
      Cell: ({ row }: any) => {
        const hasEditPermission = hasPermission(
          resourceNameMapWithCamelCase.dashboardTasks,
          permissionConstToUseWithHasPermission.editOthers
        );
        const hasDeletePermission = hasPermission(
          resourceNameMapWithCamelCase.dashboardTasks,
          permissionConstToUseWithHasPermission.deleteOthers
        );

        if (!hasEditPermission && !hasDeletePermission) {
          return <span style={{ fontSize: "12px", color: "#7a8597" }}>Not Allowed</span>;
        }

        return (
          <div className="d-flex gap-2">
            {hasEditPermission && (
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={e => {
                  e.stopPropagation();
                  onEditTask(row.original);
                }}
              >
                <KTIcon iconName="pencil" className="fs-2" />
              </button>
            )}
            {hasDeletePermission && (
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteTask(row.original);
                }}
              >
                <KTIcon iconName="trash" className="fs-2" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="card border-0 rounded-3 mb-5" style={{ boxShadow: '8px 8px 16px 0px rgba(0,0,0,0.04)' }}>
      <div className="card-body p-3 p-md-4">
        <div className="d-flex align-items-center justify-content-between mb-0">
          <div
            style={{
              fontFamily: "Barlow",
              fontSize: "24px",
              fontWeight: "600",
            }}
          >
            Tasks
          </div>
          <div className="d-flex align-items-center gap-3">
            {/* <Button
              variant="contained"
              color="primary"
              onClick={onNewTaskClick}
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
            </Button> */}
              <button
                type="button"
                className="btn btn-sm"
                style={{
                  borderColor: '#9d4141',
                  color: '#9d4141',
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: '1px solid #9d4141',
                  padding: '8px 18px',
                  whiteSpace: 'nowrap',
                }}
                onClick={()=>navigate('/tasks')}
              >
                View all
              </button>
          </div>
        </div>

        <MaterialTable
          columns={columns}
          data={tasks}
          tableName="Tasks"
          muiTableProps={{
            sx: {
              borderCollapse: 'separate',
              borderSpacing: '0 20px !important',
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
            }),
          }}
          muiTablePaperStyle={{
            sx: {
              m: 0,
              p: 0,
            },
          }}
        />
      </div>
    </div>
  );
};

export default DashboardTasks;
