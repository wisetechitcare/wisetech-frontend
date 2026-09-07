import { useCallback, useEffect, useState } from "react";
import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { getTaskList, getAllTasksWithMetrics, getAvailableProjects, deleteTask } from "@services/tasks";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { usePermission } from "@hooks/usePermission";

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
  /**
   * WHOSE tasks this widget is showing.
   *
   * `MINE` is the default for everybody, because the dashboard answers "what is on me today".
   * It used to call the unfiltered list, so anyone with wide visibility — a manager, an admin —
   * opened their dashboard to every task in their scope, which is a report, not a to-do list.
   *
   * A project id switches it to that project's tasks. Offered ONLY to people who actually run a
   * project (see `manageableProjects`): the switcher is a manager's tool for looking across
   * their own team's work, and a team member has nothing to switch between.
   */
  const [scope, setScope] = useState<string>("MINE");

  /**
   * Whether to ask for cost at all.
   *
   * ⚠️ A HINT, not the gate: `usePermission` treats a blanket `*.*.all` wildcard as satisfying
   * any key, so this can be true for somebody the API will still refuse. That is fine here —
   * it exists to stop a guaranteed 403 on every dashboard load, and `canViewAggregateCost` on
   * the server remains the only thing deciding who sees a salary-derived figure.
   */
  // Both hooks called unconditionally — `||` would short-circuit the second one, and a hook
  // that runs on some renders and not others is the one thing React genuinely cannot survive.
  const canSeeAllCost = usePermission('finance.view.all');
  const canSeeDeptCost = usePermission('finance.view.department');
  const canSeeCost = canSeeAllCost || canSeeDeptCost;

  /**
   * The projects this person MANAGES — `available-projects` answers "where may I create a task",
   * which is project-manager authority. Deliberately not the board rail (`board-projects`),
   * which is every project you are merely a member of: being on a team is not a reason to be
   * handed the whole team's workload on your own dashboard.
   */
  const [manageableProjects, setManageableProjects] = useState<any[]>([]);

  useEffect(() => {
    getAvailableProjects()
      .then((res: any) => setManageableProjects(res?.projects ?? res?.data?.projects ?? []))
      // No projects, or no authority to ask: the switcher simply does not appear.
      .catch(() => setManageableProjects([]));
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoadingTasks(true);

      // Scoped SERVER-side. `mine=true` is resolved from the session — there is no employee id
      // to send and no way to point it at somebody else.
      const query: Record<string, string> =
        scope === "MINE" ? { mine: "true" } : { projectId: scope };
      const response = await getTaskList(query);
      setTasks(response?.data?.tasks ?? response?.tasks ?? []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  /**
   * Cost and logged time come from a SEPARATE endpoint, gated on `finance.view` at department
   * scope or wider. Asking for it without that permission is a guaranteed 403, so it is only
   * requested by somebody who holds the same key the server checks — the widget used to fire it
   * on every dashboard load and log a 403 for most of the company.
   */
  useEffect(() => {
    if (!canSeeCost) return;
    getAllTasksWithMetrics()
      .then((res: any) => setTasksMetrics(res?.tasks ?? []))
      .catch(() => setTasksMetrics([]));
  }, [canSeeCost]);

  const handleDeleteTask = async (task: any) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1E3A8A",
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
        <Stack
          direction={{ xs: "column", md: "row" }}
          alignItems={{ xs: "stretch", md: "center" }}
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: 600, lineHeight: 1.2 }}
            >
              Tasks
            </Typography>
            {/* Says WHOSE work is on screen. A list that silently changes meaning depending on
                who is looking is the thing this widget got wrong. */}
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              {scope === "MINE"
                ? "Assigned to you"
                : `${manageableProjects.find((p: any) => p?.id === scope)?.title ?? "Project"} — your team's tasks`}
            </Typography>
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ flexShrink: 0, flexWrap: "wrap", rowGap: 1 }}
          >
            {/* The project switcher — only for somebody who actually runs a project. A team
                member has nothing to switch between, so they never see the control at all
                rather than seeing one with a single disabled option in it. */}
            {manageableProjects.length > 0 && (
              <TextField
                select
                size="small"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                SelectProps={{
                  MenuProps: {
                    // The dashboard scrolls in its own container. MUI's default menu locks the
                    // body and compensates with padding, which shunted the whole page down the
                    // moment the list opened; and without an explicit anchor the menu positions
                    // itself over the field, scrolling it into view to do so. Pinning it below
                    // the field and leaving the page's scroll alone keeps the click where the
                    // user put it.
                    disableScrollLock: true,
                    anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                    transformOrigin: { vertical: 'top', horizontal: 'left' },
                    PaperProps: { sx: { maxHeight: 320, mt: 0.5 } },
                  },
                }}
                sx={{ minWidth: 210, "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
              >
                <MenuItem value="MINE">My tasks</MenuItem>
                {manageableProjects.map((project: any) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.projectNumber ? `${project.projectNumber} — ` : ""}
                    {project.title || "Untitled project"}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {/* <Button
              variant="contained"
              color="primary"
              onClick={onNewTaskClick}
              sx={{
                backgroundColor: '#1E3A8A',
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
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate(scope === "MINE" ? "/tasks" : `/tasks?scope=${encodeURIComponent(scope)}`)}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                borderRadius: "8px",
                px: 2.25,
                whiteSpace: "nowrap",
              }}
            >
              View all
            </Button>
          </Stack>
        </Stack>

        <MaterialTable
          columns={columns}
          data={tasks}
          tableName="DashboardTasks"
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
