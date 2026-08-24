import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
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
  getAllTimeSheetsByStartDateEndDate,
} from "@services/tasks";
import { deleteConfirmation } from "@utils/modal";
import { toast } from "react-toastify";
import { getAllEmployeeWithMonthDailyHourlySalary } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { usePermission } from "@hooks/usePermission";
import TimeLogDetailDialog from "../../components/TimeLogDetailDialog";
import NewTimeLogForm from "../../employeetimesheet/component/NewTimeLogForm";

const MyEmployeesTimeSheetPorject = ({
  startDate,
  endDate,
}: {
  startDate: Dayjs | null;
  endDate: Dayjs | null;
}) => {
  const employeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );
  const allEmployees = useSelector(
    (state: RootState) => state?.allEmployees?.list
  );

  const [configuration, setConfiguration] = useState<any>([]);
  const [workingTime, setWorkingTime] = useState("");
  const [data, setData] = useState<any>({ timeSheets: [] });
  const [hourlySalaryMap, setHourlySalaryMap] = useState<
    Record<string, number>
  >({});
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
      const employeeId = timesheet.employee?.id;
      const employeeHourlySalary = hourlySalaryMap[employeeId];

      if (!employeeHourlySalary) {
        return "-NA-";
      }
      const startTime = new Date(timesheet.startTime);
      const endTime = new Date(timesheet.endTime);
      const isBillable = timesheet.billable;
      const diffInHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const cost = diffInHours * employeeHourlySalary;
      return isBillable ? formatStringINR(cost) : "-";
    },
    [hourlySalaryMap]
  );

  const prepareTableData = useCallback(
    (timeSheets: any[]) => {
      return timeSheets.map((sheet) => ({
        id: sheet.id,
        taskName: sheet.task?.taskName || "-",
        totalLogTime: formatDuration(sheet.startTime, sheet.endTime),
        startTime: sheet.startTime,
        endTime: sheet.endTime,
        billable: sheet.billable,
        cost: calculateCostOfTimesheet(sheet),
        projectTitle: sheet.project?.title || "-",
        createdAt: sheet.createdAt,
        updatedAt: sheet.updatedAt,
        createdBy: sheet.employee,
        original: sheet,
        employeeId: sheet.employee?.id,
        // The person, on the row — this page's whole reason for existing.
        employeeName: `${sheet.employee?.users?.firstName ?? ""} ${sheet.employee?.users?.lastName ?? ""}`.trim() || "—",
        employeeAvatar: sheet.employee?.avatar || null,
      }));
    },
    [formatDuration, calculateCostOfTimesheet]
  );

  const fetchTimesheets = useCallback(
    async (start: Dayjs, end: Dayjs) => {
      try {
        if (!start || !end) return;
        const response = await getAllTimeSheetsByStartDateEndDate(
          start.format("YYYY-MM-DD"),
          end.format("YYYY-MM-DD")
        );
        setData(response);
      } catch (error) {
        console.error("Error fetching timesheets:", error);
      }
    },
    []
  );

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

  // group by employeeId instead of projectId
  /**
   * EVERY entry, in ONE table — the same shape My Timesheet now uses, so the two pages read
   * identically and a manager moving between them is not re-learning a layout.
   *
   * A card per employee meant a team of nine was nine tables, each with its own search and
   * paginator and no way to see the team's day as one thing. The person is a COLUMN here, which
   * the table can sort, filter and group on — and which the employee page keeps and the personal
   * page does not, since on your own timesheet every row is you.
   */
  const allTimeSheets = useMemo(
    () => data?.timeSheets?.timeSheets ?? [],
    [data?.timeSheets]
  );

  const startDates = startDate?.format("YYYY-MM-DD");
  const endDates = endDate?.format("YYYY-MM-DD");

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 80,
        Cell: ({ row }: any) => row.index + 1,
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
        header: "Employee",
        accessorKey: "employeeName",
        size: 200,
        Cell: ({ row }: any) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
              src={row.original?.employeeAvatar || undefined}
              sx={{ width: 26, height: 26, fontSize: 11, fontWeight: 700 }}
            >
              {String(row.original?.employeeName || "?").charAt(0)}
            </Avatar>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {row.original?.employeeName || "—"}
            </Typography>
          </Stack>
        ),
      },
      {
        header: "Total Log Time",
        accessorKey: "totalLogTime",
        size: 150,
        Cell: ({ cell }: any) => (
          <div style={{ color: "#1D5DE1" }}>
            {cell.getValue() ? cell.getValue() : "-"}
          </div>
        ),
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
        accessorKey: "action",
        header: "Actions",
        Cell: ({ row }: any) => (
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
        ),
      },
    ],
    [handleEditTimeSheet, handleDeleteTimeSheet, navigate]
  );

  /**
   * The period's entries for the whole team, as one table — the same card My Timesheet renders,
   * so the two pages are the same screen with one extra column.
   */
  const TimesheetCard = memo(({ timeSheets }: { timeSheets: any[] }) => {
    const totalTime = useMemo(
      () => calculateProjectTotalTime(timeSheets),
      [timeSheets]
    );

    const tableData = useMemo(() => prepareTableData(timeSheets), [timeSheets]);

    const peopleCount = useMemo(
      () => new Set(timeSheets.map((t: any) => t?.employee?.id).filter(Boolean)).size,
      [timeSheets]
    );
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
                Team time logs
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {tableData.length} {tableData.length === 1 ? "entry" : "entries"}
                {peopleCount > 0 && ` from ${peopleCount} ${peopleCount === 1 ? "person" : "people"}`}
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
              tableName="TimeSheetsAdmin"
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

  useEffect(() => {
    fetchConfiguration(LEAVE_MANAGEMENT).then((res) => {
      const configStr = res?.data?.configuration?.configuration || "{}";
      setConfiguration(configStr);
      const configurationObj = JSON.parse(configStr);
      setWorkingTime(configurationObj["Working time"]);
    });
  }, []);

  useEffect(() => {
    if (!startDate) return;
    getAllEmployeeWithMonthDailyHourlySalary(
      undefined,
      startDate?.format("YYYY-MM-DD")
    )
      .then((res) => {
        const salaryMap: Record<string, number> = {};
        res?.salaries?.forEach((salary: any) => {
          if (salary.employeeId && salary.hourlySalary) {
            salaryMap[salary.employeeId] = salary.hourlySalary;
          }
        });
        setHourlySalaryMap(salaryMap);
      })
      .catch((err) => {
        console.error("Error fetching employee salaries:", err);
      });
  }, [startDate]);

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
    if (startDate && endDate) {
      fetchTimesheets(startDate, endDate);
    }
  }, [startDate, endDate]);

  return (
    <div className="mt-6">
      {allTimeSheets.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6, color: "text.disabled" }}>
          <KTIcon iconName="time" className="fs-3x" />
          <Typography variant="body2" sx={{ mt: 1 }}>
            Nobody logged time in this period.
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

export default memo(MyEmployeesTimeSheetPorject);
