import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { KTIcon } from "@metronic/helpers";
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
import { getAllEmployeeWithMonthDailyHourlySalary } from "@services/employee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
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
  const groupedByProject = useMemo(() => {
    if (!data?.timeSheets) return {};

    return data.timeSheets.reduce((acc: any, timesheet: any) => {
      const projectId = timesheet.project?.id;

      if (!acc[projectId]) {
        acc[projectId] = {
          project: timesheet.project,
          timeSheets: [],
        };
      }
      acc[projectId].timeSheets.push(timesheet);
      return acc;
    }, {});
  }, [data?.timeSheets]);

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
                navigate(
                  `/tasks/timesheet/${taskId?.id}/${employeeId}/${startDates}/${endDates}`
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
    [handleEditTimeSheet, handleDeleteTimeSheet, navigate, findEmployeeName]
  );

  // Memoized ProjectContainer component
  const ProjectContainer = memo(({ projectData }: { projectData: any }) => {
    const totalTime = useMemo(
      () => calculateProjectTotalTime(projectData.timeSheets),
      [projectData.timeSheets]
    );

    const tableData = useMemo(
      () => prepareTableData(projectData.timeSheets),
      [projectData.timeSheets, prepareTableData]
    );

    return (
      <div className="mb-6 bg-white w-100 shadow rounded-2">
        <div className="px-5 py-6">
          <div className="d-flex align-items-center justify-content-between">
            <h6
              style={{
                fontFamily: "Barlow",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "1%",
              }}
            >
              {projectData?.project?.title || projectData?.timeSheets[0]?.original?.project?.title || "Unknown Project"}
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
              </span>{" "}
              <span
                style={{
                  fontFamily: "Inter",
                  fontWeight: 400,
                  fontStyle: "normal",
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  color: "#7A8597",
                }}
              >
                {}
              </span>
            </p>
          </div>
          <div>
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
          </div>
        </div>
      </div>
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
      {Object.keys(groupedByProject).length === 0 ? (
        <div className="text-center mt-6 fs-2 text-muted">Not Found</div>
      ) : (
        Object.values(groupedByProject).map(
          (projectData: any, index: number) => (
            <ProjectContainer
              projectData={projectData}
              key={projectData.project?.id || index}
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

export default memo(MyTimeSheetProject);
