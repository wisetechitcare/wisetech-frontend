import { fetchAllEmployees, fetchLeaveRequest } from "@services/employee";
import { useEffect, useState, lazy, Suspense, useCallback } from "react";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { saveLeaveRequests } from "@redux/slices/attendance";
import dayjs from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { getWeekDay } from "@utils/date";
import { LEAVE_STATUS, LeaveStatus } from "@constants/attendance";
import Overview from "./views/overview/Overview";
import { Bar } from "@app/modules/common/components/Graphs";
import {
  barDailyData,
  currentDayWorkingHours,
  fetchEmpDailyStatistics,
  formatDisplay,
} from "@utils/statistics";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import {
  DISABLE_LAUNCH_DEDUCTION_TIME_KEY,
  LEAVE_MANAGEMENT,
} from "@constants/configurations-key";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";
import { fetchConfiguration } from "@services/company";
import { calculateTotalDuration } from "@utils/calculateTotalDuration";
import LazySection from "@app/modules/common/components/LazySection";
import Loader from "@app/modules/common/utils/Loader";

// Lazy load heavy components
const DailyAttendance = lazy(() => import("./views/overview/DailyAttendance"));
const OpenAttendanceRequests = lazy(() => import("./views/overview/OpenAttendanceRequests"));
const OpenLeaveRequests = lazy(() => import("./views/overview/OpenLeaveRequests"));
const AllLeaveRequest = lazy(() => import("./views/overview/AllLeaveRequest"));
const AttendanceRequestLimitReset = lazy(() => import("./views/overview/AttendanceRequestLimitReset"));
const LeaveManagementRequests = lazy(() => import("./views/overview/LeaveManagementRequests"));

interface LeaveRequestResponse {
  id: string;
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  leaveTypeId: string;
  status: number;
  createdAt: string;
  updatedAt?: string;
  approvedBy: string;
  employee: {
    employeeCode: string;
    userId: string;
    name: string;
    branchId?: string;
    dateOfJoining?: string;
  };
  leaveOptions: {
    leaveType: string;
  };
  approvedByEmployee?: {
    users?: {
      firstName?: string;
      lastName?: string;
    };
  };
  rejectedByEmployee?: {
    users?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export const transformLeaveRequests = (
  leaveRequest: LeaveRequestResponse[]
) => {
  if (!leaveRequest.length) return [];

  const leaveRequestData = leaveRequest.map((leave: LeaveRequestResponse) => {
    const {
      createdAt,
      employee: { name, employeeCode, branchId, dateOfJoining },
      employeeId,
      id,
      reason,
      approvedBy,
      dateFrom,
      dateTo,
      status,
      leaveTypeId,
      leaveOptions: { leaveType },
    } = leave;
    const dateFromWeekday = getWeekDay(dateFrom);
    const dateToWeekday = getWeekDay(dateTo);
    const formattedDateFrom = dayjs(dateFrom).format("DD MMM, YYYY");
    const formattedDateTo = dayjs(dateTo).format("DD MMM, YYYY");

    return {
      createdDate: createdAt,
      dateFrom,
      employeeId,
      dateTo,
      day: `${dateFromWeekday} - ${dateToWeekday}`,
      name,
      date: `${formattedDateFrom} - ${formattedDateTo}`,
      code: employeeCode,
      id,
      type: leaveType,
      remark: reason,
      status,
      approvedBy,
      statusText: LEAVE_STATUS[status as LeaveStatus],
      // Additional fields for edit form (existing fields kept as-is above)
      leaveTypeId,
      reason,
      statusNumber: status,
      branchId,
      dateOfJoining,
      // Approved/Rejected by info
      approvedByName: leave.approvedByEmployee?.users ? `${leave.approvedByEmployee.users.firstName || ''} ${leave.approvedByEmployee.users.lastName || ''}`.trim() : '',
      rejectedByName: leave.rejectedByEmployee?.users ? `${leave.rejectedByEmployee.users.firstName || ''} ${leave.rejectedByEmployee.users.lastName || ''}`.trim() : '',
      updatedAt: leave.updatedAt,
    };
  });

  return leaveRequestData;
};

function OverviewView() {
  const dispatch = useDispatch();
  const [date, setDate] = useState(dayjs()); // Centralized date state
  const employeesPresentAttendance = useSelector(
    (state: RootState) => state.attendance.employeesAttendance
  );
  const dailyStats = useSelector((state: RootState) => {
    const { attendanceStats } = state;
    return attendanceStats.daily;
  });
  const [users, setUsers] = useState([]);
  const [usersName, setUsersName] = useState([]);
  const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  // const [subtractLunchTime, setSubtractLunchTime] = useState<boolean>();
  const { employeeId } = useSelector((state: RootState) => {
    const { employee } = state;
    return {
      employeeId: employee.currentEmployee.id,
    };
  });

  const selectedEmployeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee?.id
  );
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange
  );

  // Consolidate all initial data fetching into one useEffect
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsConfigLoading(true);
        // Fetch all data in parallel
        const [
          leaveRequestRes,
          employeesRes,
          configRes,
          lunchTimeRes
        ] = await Promise.all([
          fetchLeaveRequest(),
          fetchAllEmployees(),
          fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
          fetchConfiguration(LEAVE_MANAGEMENT),
          dispatch(fetchRolesAndPermissions() as any),
          fetchEmpDailyStatistics(dayjs(), false)
        ]);

        // Process leave requests
        dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequestRes.data.leaveRequest)));

        // Process employees
        const employees = employeesRes.data.employees;
        setUsers(
          employees.map(
            (employee: any) =>
              employee.users.firstName + " " + employee.users.lastName
          )
        );
        setUsersName(employees.map((employee: any) => employee.users.firstName));

        // Process configuration
        const parsedConfig = JSON.parse(configRes?.data?.configuration?.configuration || '{}');
        const parsedLunchTime = JSON.parse(lunchTimeRes?.data?.configuration?.configuration || '{}');
        const totalWorkingHoursString = parsedLunchTime["Working time"];

        if (totalWorkingHoursString) {
          setTotalWorkingHours(formatDisplay(totalWorkingHoursString));
        }

        // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
        const lunchDeductionValue = parsedConfig.disableLaunchDeductionTime ?? parsedConfig.disableLunchDeductionTime ?? false;

        dispatch(
          setFeatureConfiguration({
            disableLaunchDeductionTime: lunchDeductionValue,
            leaveManagement: parsedLunchTime ?? {},
          })
        );
      } catch (error) {
        console.error("Error initializing data", error);
      } finally {
        setIsConfigLoading(false);
      }
    };

    initializeData();
  }, [dispatch]);

  const barOptions = usersName;
  const barSeriesData = Array.from(
    barDailyData(employeesPresentAttendance, users).values()
  );

  let userRoles = ["HR", "Manager", "Director"];

  let sickLeaves = ["HR", "Manager"];
  let floaterLeaves = ["HR", "Manager", "Director"];
  let annualLeaves = ["HR", "Manager", "Director"];

  // Date navigation handlers
  const incrementDate = useCallback(() => {
    setDate(prevDate => prevDate.add(1, 'day'));
  }, []);

  const decrementDate = useCallback(() => {
    setDate(prevDate => prevDate.subtract(1, 'day'));
  }, []);

  // Show loader while configuration is loading
  if (isConfigLoading) {
    return <Loader />;
  }

  // Calculate total working time and allowed time
  const totalWorkingTime = calculateTotalDuration(dailyStats[0]);

  const totalAllowedTime = `${totalWorkingHours}`;

  return (
    <>
      <div className="sticky-overview-header d-flex flex-row justify-content-between align-items-center mb-4">
        <h3 className="fw-bold fs-1 mb-0 font-barlow">Overview</h3>
        {/* Date navigation */}
        <div>
          <button className="btn btn-sm px-0" onClick={decrementDate}>
            <img src={toAbsoluteUrl('media/svg/misc/back.svg')} alt="Previous day" />
          </button>
          <span className="mx-1 my-1 fw-semibold">{date.format('DD MMM, YYYY')}</span>
          <button className="btn btn-sm px-0" onClick={incrementDate}>
            <img src={toAbsoluteUrl('media/svg/misc/next.svg')} alt="Next day" />
          </button>
        </div>
      </div>

      <Overview date={date} />

      <div className="mt-10"></div>
      <Bar
        barOption={barOptions}
        barSeriesData={barSeriesData}
        height={250}
        totalWorkingTime={totalWorkingTime}
        totalAllowedTime={totalAllowedTime}
      />

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <DailyAttendance date={date} />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <AttendanceRequestLimitReset />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <LeaveManagementRequests />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <OpenAttendanceRequests />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <OpenLeaveRequests />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <AllLeaveRequest />
        </Suspense>
      </LazySection>
    </>
  );
}

export default OverviewView;
