import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectOverviewIcons } from "@metronic/assets/sidepanelicons";
import { Button } from "react-bootstrap";
import { miscellaneousIcons } from "@metronic/assets/miscellaneousicons";
import { useNavigate } from "react-router-dom";
import { deleteTimeSheetById, getTimesheetById } from "@services/tasks";
import dayjs from "dayjs";
import { calculateProjectTotalTime, formatStringINR } from "@utils/statistics";
import { RootState } from "@redux/store";
import { useSelector } from "react-redux";
import { deleteConfirmation } from "@utils/modal";
import { toast } from "react-toastify";
import NewTimeLogForm from "../../employeetimesheet/component/NewTimeLogForm";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { getAllEmployeeWithMonthDailyHourlySalary } from "@services/employee";

const TimeSheetByIdOverview = () => {
  const { timesheetId, employeeId, startDate, endDate } = useParams<{
    timesheetId: string;
    employeeId: string;
    startDate: string;
    endDate: string;
  }>();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [timesheetData, setTimesheetData] = useState<any>(null);
  const [hourlySalary, setHourlySalary] = useState();
  const allEmployees = useSelector(
    (state: RootState) => state?.allEmployees?.list
  );
const currentEmployeeId = useSelector((state: RootState) => state?.employee?.currentEmployee?.id);
  const handleBackClick = () => {
    navigate(-1);
  };

  const calculateCostOfTimesheet = useCallback(
    (timesheet: any) => {
      if (!hourlySalary || !timesheet) {
        return "-NA-";
      }
      const startTime = new Date(timesheet.startTime);
      const endTime = new Date(timesheet.endTime);
      const isBillable = timesheet.billable;

      const diffInHours =
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const cost = diffInHours * hourlySalary;
      return isBillable ? formatStringINR(cost) : "-";
    },
    [hourlySalary]
  );

  const fetchTimesheetById = async () => {
    try {
      if (!timesheetId) return;
      const response = await getTimesheetById(timesheetId!);
      setTimesheetData(response?.timeSheet);
    } catch (error) {
      console.error("Error fetching timesheet by ID:", error);
    }
  };

  useEffect(() => {
    if (!employeeId) return;
    getAllEmployeeWithMonthDailyHourlySalary(employeeId, startDate)
      .then((res) => {
        setHourlySalary(res?.salaries[0]?.hourlySalary);
      })
      .catch((err) => {
        console.error("Error fetching timesheets:", err);
      });
  }, [employeeId, startDate]);

  const findEmployeeName = (id: string) => {
    const employee = allEmployees.find((emp: any) => emp.employeeId === id);
    return employee?.employeeName;
  };

  useEffect(() => {
    if (!timesheetId) return;
    fetchTimesheetById();
  }, [timesheetId, employeeId, startDate, endDate]);

  useEventBus(EVENT_KEYS.NewTimeLogFromCreated, () => {
    fetchTimesheetById();
  });

  const totalCost = calculateCostOfTimesheet(timesheetData);

  const handleDeleteTimeSheet = async (id: any) => {
    const isConfirmed = await deleteConfirmation("Deleted Successfully");
    if (isConfirmed) {
      try {
        await deleteTimeSheetById(id);
        navigate(-1);
      } catch (err) {
        toast.error("Failed to delete timesheet");
        console.error(err);
      }
    }
  };

  return (
    <>
      <div className="mt-8">
        <div className="p-2 p-md-4">
          <div className="d-flex align-items-center justify-content-between mb-3 mb-md-4 pt-md-0">
            <div className="d-flex align-items-center gap-2 gap-md-3 flex-grow-1">
              <button
                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                onClick={handleBackClick}
              >
                <img
                  src={miscellaneousIcons.leftArrow}
                  alt=""
                  style={{
                    width: "40px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                  className="d-none d-md-block"
                />
              </button>
              <div className="flex-grow-1">
                <div
                  className="text-muted small"
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: "14px",
                    color: "#8998AB",
                  }}
                >
                  Time Log #{timesheetId?.slice(0, 4)}
                </div>
                <div className="d-flex align-items-center gap-2">
                  <h2
                    className="mb-0 text-truncate"
                    style={{
                      fontFamily: "Barlow",
                      fontWeight: "600",
                      fontSize: "24px",
                    }}
                  >
                    {timesheetData?.task?.taskName}
                  </h2>
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  fontFamily: "Barlow",
                  fontWeight: 600,
                  fontStyle: "normal",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  color: "#1D5DE1",
                  fontSize: "24px",
                }}
              >
                {calculateProjectTotalTime(timesheetData)}
              </div>
              <>
                <Button
                  variant="primary"
                  onClick={() => setShow(true)}
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Edit log
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDeleteTimeSheet(timesheetData?.id)}
                  style={{
                    fontFamily: "Inter",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Delete
                </Button>
              </>
            </div>
          </div>
        </div>

        <div className="row mt-5 p-4">
          {/* Left Card */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-5">
                  <img
                    src={projectOverviewIcons.timeLogssIcon.default}
                    alt=""
                    style={{ width: "44px", height: "44px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontFamily: "Barlow",
                      fontSize: "19px",
                      fontWeight: "600",
                    }}
                  >
                    Time Log Details
                  </span>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Task Name
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {timesheetData?.task?.taskName}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Project Name
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {timesheetData?.project?.title}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Billable
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {timesheetData?.billable ? "Yes" : "No"}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Start Time
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(timesheetData?.startTime).format(
                      "DD-MM-YYYY hh:mm:ss A"
                    )}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  End Time
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(timesheetData?.endTime).format(
                      "DD-MM-YYYY hh:mm:ss A"
                    )}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Duration
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {calculateProjectTotalTime(timesheetData)}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Cost
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {totalCost || "-NA-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Card */}
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-4">
                  <img
                    src={projectOverviewIcons.portalssIcon.default}
                    alt=""
                    style={{ width: "44px", height: "44px", cursor: "pointer" }}
                  />
                  <span
                    style={{
                      fontFamily: "Barlow",
                      fontSize: "19px",
                      fontWeight: "600",
                    }}
                  >
                    Portal
                  </span>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Created Time
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(timesheetData?.createdAt).format(
                      "DD-MM-YYYY hh:mm:ss A"
                    )}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Created By
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {findEmployeeName(timesheetData?.employeeId)}
                  </div>
                </div>

                <div
                  className="d-flex align-items-center justify-content-between mt-5"
                  style={{
                    fontFamily: "Inter",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  Updated Time
                  <div
                    style={{
                      fontFamily: "Inter",
                      fontSize: "14px",
                      fontWeight: "400",
                    }}
                  >
                    {dayjs(timesheetData?.updatedAt).format(
                      "DD-MM-YYYY hh:mm:ss A"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <NewTimeLogForm
        show={show}
        onClose={() => setShow(false)}
        timeSheetId={timesheetId}
      />
    </>
  );
};

export default TimeSheetByIdOverview;
