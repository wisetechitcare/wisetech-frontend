import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
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
  const groupedByEmployee = useMemo(() => {
    if (!data?.timeSheets?.timeSheets) return {};

    return data.timeSheets?.timeSheets.reduce((acc: any, timesheet: any) => {
      const empId = timesheet.employee?.id;

      if (!acc[empId]) {
        acc[empId] = {
          employee: timesheet.employee,
          timeSheets: [],
        };
      }
      acc[empId].timeSheets.push(timesheet);
      return acc;
    }, {});
  }, [data?.timeSheets]);

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
                navigate(
                  `/tasks/timesheet/${taskId?.id}/${taskId?.employeeId}/${startDates}/${endDates}`
                );
              }}
            >
              {taskId?.taskName}
            </div>
          );
        },
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
      {
        header: "Cost",
        accessorKey: "cost",
        size: 120,
      },
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

  const EmployeeContainer = memo(({ employeeData }: { employeeData: any }) => {
    const totalTime = useMemo(
      () => calculateProjectTotalTime(employeeData.timeSheets),
      [employeeData.timeSheets]
    );

    const tableData = useMemo(
      () => prepareTableData(employeeData.timeSheets),
      [employeeData.timeSheets, prepareTableData]
    );

    return (
      <div className="mb-6 bg-white w-100 shadow rounded-2">
        <div className="px-5 py-6">
          <div className="d-flex align-items-center justify-content-between">
            <h6
              className="d-flex align-items-center gap-3"
              style={{
                fontFamily: "Barlow",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "1%",
              }}
            >
              {employeeData?.employee?.avatar ? (
                <img
                  src={employeeData?.employee?.avatar}
                  alt={employeeData?.employee?.users?.firstName}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <img
                  src={toAbsoluteUrl("media/avatars/blank.png")}
                  alt={employeeData?.employee?.users?.firstName}
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              )}
              {employeeData?.employee?.users?.firstName}{" "}
              {employeeData?.employee?.users?.lastName}
            </h6>
            <p>
              <span
                style={{
                  fontFamily: "Inter",
                  fontWeight: 600,
                  fontStyle: "normal",
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                }}
              >
                {totalTime}
              </span>
            </p>
          </div>
          <div>
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
          </div>
        </div>
      </div>
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
      {Object.keys(groupedByEmployee).length === 0 ? (
        <div className="text-center mt-6 fs-2 text-muted">Not Found</div>
      ) : (
        Object.values(groupedByEmployee).map(
          (employeeData: any, index: number) => (
            <EmployeeContainer
              employeeData={employeeData}
              key={employeeData.employee?.id || index}
            />
          )
        )
      )}
      {openTimeSheet && (
        <NewTimeLogForm
          show={openTimeSheet}
          onClose={handleCloseTimeSheet}
          timeSheetId={selectedTimeSheet?.id}
        />
      )}
    </div>
  );
};

export default memo(MyEmployeesTimeSheetPorject);
