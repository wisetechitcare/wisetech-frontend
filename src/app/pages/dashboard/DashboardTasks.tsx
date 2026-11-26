import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import { buttonVariants } from "@/ds/ui/button";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { RowAction } from "@/ds/patterns/row-action";
import { getTaskList, getAllTasksWithMetrics, getAvailableProjects, deleteTask } from "@services/tasks";
import { WtTooltip, confirmDialog } from "@app/modules/common/components/ui";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { canDelete, canSection } from "@utils/can";
import { usePermission } from "@hooks/usePermission";
import { getTimeTokens } from '@utils/timeFormat';
import { errorConfirmation, successConfirmation } from '@utils/modal';

interface DashboardTasksProps {
  onNewTaskClick: () => void;
  onEditTask: (task: any) => void;
}

const DashboardTasks = ({ onNewTaskClick, onEditTask }: DashboardTasksProps) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksMetrics, setTasksMetrics] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
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
    const confirmed = await confirmDialog({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      confirmText: "Yes, delete it!",
      danger: true,
    });

    if (confirmed) {
      try {
        await deleteTask(task.id);
        await fetchTasks();
        successConfirmation("Task has been deleted.", "Deleted!");
      } catch (error) {
        console.error("Error deleting task:", error);
        errorConfirmation("Failed to delete task.", "Error!");
      }
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: "serialNumber",
      header: "Sr. No.",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
    },
    {
      accessorKey: "taskName",
      header: "Task Name",
      cell: ({ row }) => {
        const taskName = row?.original?.taskName || "N/A";

        return (
          <WtTooltip title={taskName}>
            <div
              style={{
                maxWidth: '200px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {taskName}
            </div>
          </WtTooltip>
        );
      },
    },
    {
      accessorKey: "taskDescription",
      header: "Description",
      cell: ({ row }) => {
        const taskDescription = row?.original?.taskDescription || "N/A";

        return (
          <WtTooltip title={taskDescription}>
            <div
              style={{
                maxWidth: '250px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                cursor: 'pointer',
              }}
            >
              {taskDescription}
            </div>
          </WtTooltip>
        );
      },
    },
    {
      accessorKey: "project",
      header: "Project",
      cell: ({ row }) => row?.original?.project?.title || "N/A",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
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
      cell: ({ row }) => {
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
      cell: ({ row }) => row?.original?.assignedTo?.users?.firstName + " " + row?.original?.assignedTo?.users?.lastName || "N/A",
    },
    {
      accessorKey: "createdBy",
      header: "Created By",
      cell: ({ row }) =>
        row?.original?.createdBy?.users?.firstName + " " + row?.original?.createdBy?.users?.lastName || "N/A",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) =>
        row?.original?.startDate
          ? dayjs(row.original.startDate).format("DD-MM-YYYY") + " " + dayjs(row.original.startTime).format(getTimeTokens().TIME)
          : "N/A",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) =>
        row?.original?.dueDate
          ? dayjs(row.original.dueDate).format("DD-MM-YYYY") + " " + dayjs(row.original.dueTime).format(getTimeTokens().TIME)
          : "N/A",
    },
    {
      accessorKey: "completionDate",
      header: "Completion Date",
      cell: ({ row }) => {
        const isCompleted = row?.original?.status?.name?.toLowerCase() === 'completed';
        if (!isCompleted) return "N/A";

        const completionDate = row?.original?.completionDate || row?.original?.updatedAt;
        return completionDate
          ? dayjs(completionDate).format("DD-MM-YYYY") + " " + dayjs(completionDate).format(getTimeTokens().TIME)
          : "N/A";
      },
    },
    {
      accessorKey: "cost",
      header: "Cost",
      cell: ({ row }) => {
        const billingType = row?.original?.billingType;
        if (billingType !== "BILLABLE") return "N/A";

        const taskMetric = tasksMetrics.find(metric => metric.id === row?.original?.id);
        return taskMetric?.metrics?.totalCostFormatted || row?.original?.cost || "N/A";
      },
    },
    {
      accessorKey: "Billable",
      header: "Billable",
      cell: ({ row }) => {
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
      cell: ({ row }) => {
        const taskMetric = tasksMetrics.find(metric => metric.id === row?.original?.id);
        return taskMetric?.metrics?.totalLogTimeFormatted || "N/A";
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      meta: { export: false, pin: "end" },
      cell: ({ row }) => {
        // Write on Tasks, the same as on the Tasks page. Which tasks you may touch is the server's call.
        const hasEditPermission = canSection("tasks", "write");
        const hasDeletePermission = canDelete("tasks");

        if (!hasEditPermission && !hasDeletePermission) {
          return <span style={{ fontSize: "12px", color: "#7a8597" }}>Not Allowed</span>;
        }

        return (
          <div className="flex gap-2">
            {hasEditPermission && (
              <RowAction label="Edit task" onClick={() => onEditTask(row.original)}>
                <Pencil className="size-4" aria-hidden />
              </RowAction>
            )}
            {hasDeletePermission && (
              <RowAction label="Delete task" tint="danger" onClick={() => handleDeleteTask(row.original)}>
                <Trash2 className="size-4" aria-hidden />
              </RowAction>
            )}
          </div>
        );
      },
    },
  ], [tasksMetrics, onEditTask]);

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
            <Link
              to={scope === "MINE" ? "/tasks" : `/tasks?scope=${encodeURIComponent(scope)}`}
              data-slot="button"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              View all
            </Link>
          </Stack>
        </Stack>

        <DataTable
          caption="Dashboard Tasks"
          columns={columns}
          data={tasks}
          getRowId={(r, i) => String(r.id ?? i)}
          loading={isLoadingTasks}
          stateKey="DashboardTasks"
          rowTone={(row) => row?.status?.color}
        />
      </div>
    </div>
  );
};

export default DashboardTasks;
