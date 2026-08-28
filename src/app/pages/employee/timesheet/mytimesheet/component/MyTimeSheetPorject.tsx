import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { KTIcon } from "@metronic/helpers";
import { Avatar, Box, Stack, Typography } from "@mui/material";
import { RootState } from "@redux/store";
import { fetchConfiguration } from "@services/company";
import { calculateProjectTotalTime, formatStringINR } from "@utils/statistics";
import dayjs, { Dayjs } from "dayjs";
import { memo, useCallback, useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  deleteTimeSheetById,
  getAllTimeSheetWithCostByProjectId,
  getTimesheetsByProjectId,
  getTimesheetsEmployeeIdStartDateEndDate,
} from "@services/tasks";
import { deleteConfirmation } from "@utils/modal";
import { toast } from "react-toastify";
import eventBus from "@utils/EventBus";
import { usePermission } from "@hooks/usePermission";
import { getAllEmployeeWithMonthDailyHourlySalary } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import TimeLogDetailDialog from "../../components/TimeLogDetailDialog";
import NewTimeLogForm from "../../employeetimesheet/component/NewTimeLogForm";

const MyTimeSheetProject = ({
  startDate,
  endDate,
  projectId,
  billable,
}: {
  startDate?: Dayjs | null;
  endDate?: Dayjs | null;
  projectId?: string;
  billable?: string | null;
}) => {
  const employeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );
  const getHourlySalaryOfCurrentEmployee = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.hourlySalary
  );
  const allEmployees = useSelector(
    (state: RootState) => state?.allEmployees?.list
  );

  const [configuration, setConfiguration] = useState<any>([]);
  const [workingTime, setWorkingTime] = useState("");
  const [data, setData] = useState<any>({ timeSheets: [] });
  const [hourlySalary, setHourlySalary] = useState();
  const [openTimeSheet, setOpenTimeSheet] = useState(false);
  const [selectedTimeSheet, setSelectedTimeSheet] = useState<any>(null);

  const navigate = useNavigate();
  /**
   * Who may see labour cost.
   *
   * The API already decides this — `canViewTaskCost` narrows it to an explicit finance grant or
   * the project's PRIMARY manager, and strips the fields for everyone else. This only stops the
   * column being drawn for somebody the server will never fill it for.
   *
   * ⚠️ A HINT, not the gate: `usePermission` treats a blanket `*.*.all` wildcard as satisfying
   * any key, so it can read true for somebody the API still refuses. That is fine — the server
   * remains the boundary.
   */
  const canSeeAllFinance = usePermission('finance.view.all');
  const canSeeDeptFinance = usePermission('finance.view.department');
  const canSeeCost = canSeeAllFinance || canSeeDeptFinance;
  // The time log opens as a dialog over this table rather than as a page of
  // its own: it is a detail OF this list, and reading one used to mean leaving.
  const [openLogId, setOpenLogId] = useState<string | null>(null);

  // Memoized utility functions
  const formatDuration = useCallback((start: string, end: string) => {
    if (!start || !end) return "-";
    const diff = new Date(end).getTime() - new Date(start).getTime();
    if (diff <= 0) return "-";
    const hrs = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    return `${hrs}h ${mins}m ${secs}s`;
  }, []);

  const calculateCostOfTimesheet = useCallback(
    (timesheet: any) => {

      const costFormated = timesheet?.costFormatted;
      if (costFormated) {
        return costFormated;
      } else {
        if (!hourlySalary) {
          return "-NA-";
        }

        const startTime = new Date(timesheet.startTime);

        const endTime = new Date(timesheet.endTime);

        const isBillable = timesheet.billable;

        const diffInHours =
          (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

        const cost = diffInHours * hourlySalary;

        return isBillable ? formatStringINR(cost) : "-";
      }
    },
    [hourlySalary]
  );

  const findEmployeeName = useCallback(
    (id: string) => {
      const employee = allEmployees.find((emp: any) => emp.employeeId === id);
      return employee?.employeeName;
    },
    [allEmployees]
  );

  // Memoized data preparation function
  const prepareTableData = useCallback(
    (timeSheets: any[]) => {
      return timeSheets.map((sheet) => ({
        id: sheet.id,
        taskName: sheet.task?.taskName || sheet.taskName || "-",
        totalLogTime: formatDuration(sheet.startTime, sheet.endTime),
        startTime: sheet.startTime,
        endTime: sheet.endTime,
        billable: sheet.billable,
        cost: calculateCostOfTimesheet(sheet),
        projectTitle: sheet.project?.title || sheet.original?.project?.title || "-",
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
        createdBy: sheet.employeeId || sheet.original?.employee?.id,
        original: sheet,
      }));
    },
    [formatDuration, calculateCostOfTimesheet]
  );

  // Memoized fetch function
  const fetchTimesheets = useCallback(
    async (start: Dayjs, end: Dayjs) => {
      if (!employeeId) return;
      try {
        if (projectId && (billable==null || billable=="null" || billable=="false" || billable=="true")) {
          const response = await getAllTimeSheetWithCostByProjectId(
            projectId,
            billable!
          );
          setData(response);
        } else {
          const response = await getTimesheetsEmployeeIdStartDateEndDate(
            employeeId,
            start.format("YYYY-MM-DD"),
            end.format("YYYY-MM-DD")
          );
          setData(response);
        }
      } catch (error) {
        console.error("Error fetching timesheets:", error);
      }
    },
    [employeeId,billable,projectId]
  );

  // Memoized event handlers
  const handleDeleteTimeSheet = useCallback(
    async (project: any) => {
      const isConfirmed = await deleteConfirmation("Deleted Successfully");
      if (isConfirmed) {
        try {
          await deleteTimeSheetById(project.id);
          if (startDate && endDate) {
            await fetchTimesheets(startDate, endDate);
          }
        } catch (err) {
          toast.error("Failed to delete timesheet");
          console.error(err);
        }
      }
    },
    [startDate, endDate, fetchTimesheets]
  );

  const handleEditTimeSheet = useCallback((project: any) => {
    setOpenTimeSheet(true);
    setSelectedTimeSheet(project);
  }, []);

  const handleCloseTimeSheet = useCallback(() => {
    setOpenTimeSheet(false);
    setSelectedTimeSheet(null);
  }, []);

  // Memoized grouped data
  /**
   * EVERY entry, in ONE table — not a card per project.
   *
   * The page used to render a separate table for each project in the period, which meant a week
   * spent across four projects was four tables, each with its own search box, its own paginator
   * and its own column widths — and nowhere to see the day as a whole. Worse, entries whose
   * project could not be resolved collapsed into a single card titled "Unknown Project", so the
   * grouping key was doing real damage while claiming to organise.
   *
   * The project is a COLUMN now. Sorting, filtering and grouping by it are things the table
   * already does well, and one table can be read, sorted and exported as one thing.
   */
  const allTimeSheets = useMemo(() => data?.timeSheets ?? [], [data?.timeSheets]);

  const startDates = startDate?.format("YYYY-MM-DD");
  const endDates = endDate?.format("YYYY-MM-DD");

  // Memoized columns definition
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 80,
        enableEditing: false,
        Cell: ({ row }: any) => {
          return row.index + 1;
        },
      },
      {
        header: "Task Name",
        accessorKey: "taskName",
        size: 200,
        Cell: ({ row }: any) => {
          const taskId = row.original;
          return (
            <div
              style={{ cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                setOpenLogId(taskId?.id ?? null);
              }}
            >
              {taskId?.taskName}
            </div>
          );
        },
      },
      {
        header: "Task assigned to",
        accessorKey: "taskOwner",
        size: 180,
        Cell: ({ row }: any) => {
          const name = row.original?.taskOwner;
          // Your own task needs no attribution — this column exists to explain the rows that
          // are somebody else's work, which you logged time against.
          if (!name) return <span style={{ color: "#7A8597" }}>—</span>;
          return (
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                src={row.original?.taskOwnerAvatar || undefined}
                sx={{ width: 22, height: 22, fontSize: 10, fontWeight: 700 }}
              >
                {name.charAt(0)}
              </Avatar>
              <Typography variant="body2" noWrap>{name}</Typography>
            </Stack>
          );
        },
      },
      {
        header: "Total Log Time",
        accessorKey: "totalLogTime",
        size: 150,
        Cell: ({ cell }: any) => {
          const value = cell.getValue();
          return (
            <div
              style={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontStyle: "normal",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#1D5DE1",
              }}
            >
              {value ? value : "-"}
            </div>
          );
        },
      },
      {
        header: "Start Time",
        accessorKey: "startTime",
        size: 150,
        Cell: ({ cell }: any) =>
          cell.getValue()
            ? dayjs(cell.getValue()).format("DD-MM-YYYY hh:mm A")
            : "-",
      },
      {
        header: "End Time",
        accessorKey: "endTime",
        size: 150,
        Cell: ({ cell }: any) =>
          cell.getValue()
            ? dayjs(cell.getValue()).format("DD-MM-YYYY hh:mm A")
            : "-",
      },
      {
        header: "Billable",
        accessorKey: "billable",
        size: 100,
        Cell: ({ cell }: any) => (cell.getValue() ? "Yes" : "No"),
      },
      // Labour cost is derived from internal SALARY data. It is a manager's figure, not the
      // employee's own — an ordinary person reading their timesheet should not be able to
      // work backwards from it to anybody's pay, their own included. Omitted rather than
      // blanked: a column of dashes still advertises that a number exists.
      ...(canSeeCost
        ? [{
            header: "Cost",
            accessorKey: "cost",
            size: 120,
          }]
        : []),
      {
        header: "Project",
        accessorKey: "projectTitle",
        size: 200,
      },
      {
        header: "Created At",
        accessorKey: "createdAt",
        size: 150,
        Cell: ({ cell }: any) =>
          cell.getValue()
            ? dayjs(cell.getValue()).format("DD-MM-YYYY hh:mm A")
            : "-",
      },
      {
        header: "Last Edited At",
        accessorKey: "updatedAt",
        size: 150,
        Cell: ({ cell }: any) =>
          cell.getValue()
            ? dayjs(cell.getValue()).format("DD-MM-YYYY hh:mm A")
            : "-",
      },
      {
        header: "Created By",
        accessorKey: "createdBy",
        size: 150,
        Cell: ({ cell }: any) => {
          const cellValue = cell.getValue();
          const employeeName = findEmployeeName(cellValue);
          return employeeName ? employeeName : "-";
        },
      },
      {
        accessorKey: "action",
        header: "Actions",
        Cell: ({ row }: any) => {
          return (
            <div className="d-flex gap-2">
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditTimeSheet(row?.original);
                }}
              >
                <KTIcon iconName="pencil" className="fs-2" />
              </button>
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTimeSheet(row?.original);
                }}
              >
                <KTIcon iconName="trash" className="fs-2" />
              </button>
            </div>
          );
        },
      },
    ],
    [handleEditTimeSheet, handleDeleteTimeSheet, navigate, findEmployeeName, canSeeCost]
  );

  /**
   * The period's entries, as one table.
   *
   * Header states what the table IS and what it adds up to — the two things a timesheet is read
   * for — and the projects live in a column beneath rather than in four separate cards.
   */
  const TimesheetCard = memo(({ timeSheets }: { timeSheets: any[] }) => {
    const totalTime = useMemo(
      () => calculateProjectTotalTime(timeSheets),
      [timeSheets]
    );

    const tableData = useMemo(
      () => prepareTableData(timeSheets),
      [timeSheets]
    );

    /** How many distinct projects the period touched — the header says so instead of hiding it. */
    const projectCount = useMemo(
      () => new Set(timeSheets.map((t: any) => t?.project?.id).filter(Boolean)).size,
      [timeSheets]
    );

    return (
      <Box
        sx={{
          mb: 3, borderRadius: 2, bgcolor: "background.paper",
          border: "1px solid", borderColor: "divider",
        }}
      >
        <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
                Time logs
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {tableData.length} {tableData.length === 1 ? "entry" : "entries"}
                {projectCount > 0 && ` across ${projectCount} project${projectCount === 1 ? "" : "s"}`}
              </Typography>
            </Box>
            <Box sx={{ textAlign: { sm: "right" } }}>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: "text.primary" }}>
                {totalTime}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                logged in this period
              </Typography>
            </Box>
          </Stack>
            <MaterialTable
              columns={columns}
              data={tableData}
              tableName="TimeSheetsEmployee"
              employeeId={employeeId}
              viewOwn={true}
              viewOthers={true}
              checkOwnWithOthers={true}
              muiTableProps={{
                sx: {
                  borderCollapse: "separate",
                  borderSpacing: "0 20px !important",
                },
                muiTableBodyRowProps: ({ row, cell }) => ({
                  sx: {
                    cursor: "pointer",
                    backgroundColor: `${row.original?.status?.color}20`,
                    padding: "10px !important",

                    "& .MuiTableCell-root": {
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontSize: "14px",
                      fontFamily: "Inter",
                      fontWeight: "400",
                      padding: "8px 16px !important",
                      borderBottom: "2px solid white",
                      borderTop: "2px solid white",
                    },
                    "& .MuiTableCell-root:first-of-type": {
                      borderTopLeftRadius: "12px",
                      borderBottomLeftRadius: "12px",
                      borderLeft: "3px solid white",
                    },
                    "& .MuiTableCell-root:last-of-type": {
                      borderTopRightRadius: "12px",
                      borderBottomRightRadius: "12px",
                      borderRight: "3px solid white",
                    },
                    "&:hover": {
                      backgroundColor: `${row.original?.status?.color}99`,
                      "& td": {
                        color: "black",
                      },
                    },
                  },
                }),
              }}
            />
        </Box>
      </Box>
    );
  });

  // Effects
  useEffect(() => {
    fetchConfiguration(LEAVE_MANAGEMENT).then((res) => {
      const configStr = res?.data?.configuration?.configuration || "{}";
      setConfiguration(configStr);
      const configurationObj = JSON.parse(configStr);
      setWorkingTime(configurationObj["Working time"]);
    });
  }, []);

  useEffect(() => {
    if (!employeeId || !startDate) return;
    getAllEmployeeWithMonthDailyHourlySalary(
      employeeId,
      startDate?.format("YYYY-MM-DD")
    )
      .then((res) => {
        setHourlySalary(res?.salaries[0]?.hourlySalary);
      })
      .catch((err) => {
        console.error("Error fetching timesheets:", err);
      });
  }, [employeeId, startDate, projectId]);

  useEventBus(EVENT_KEYS.NewTimeLogFromCreated, () => {
    if (startDate && endDate) {
      fetchTimesheets(startDate, endDate);
    }
  });

  useEffect(() => {
    const start = dayjs();
    const end = dayjs();
    fetchTimesheets(start, end);
  }, [fetchTimesheets]);

  useEffect(() => {
    if (startDate && endDate && employeeId) {
      fetchTimesheets(startDate, endDate);
    }
  }, [startDate, endDate, employeeId, fetchTimesheets, projectId, billable]);

  return (
    <div className="mt-6">
      {allTimeSheets.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6, color: "text.disabled" }}>
          <KTIcon iconName="time" className="fs-3x" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            No time logged in this period.
          </Typography>
        </Box>
      ) : (
        <TimesheetCard timeSheets={allTimeSheets} />
      )}
      {openTimeSheet && (
        <NewTimeLogForm
          show={openTimeSheet}
          onClose={handleCloseTimeSheet}
          timeSheetId={selectedTimeSheet?.id}
        />
      )}

      {/* The row's own detail, over the table it belongs to. `onChanged` reuses the key this
          screen already refetches on, so an edit or a delete lands without a second mechanism. */}
      <TimeLogDetailDialog
        open={!!openLogId}
        timesheetId={openLogId}
        onClose={() => setOpenLogId(null)}
        onChanged={() => eventBus.emit(EVENT_KEYS.NewTimeLogFromCreated, { id: openLogId ?? '' })}
      />
    </div>
  );
};

export default memo(MyTimeSheetProject);
