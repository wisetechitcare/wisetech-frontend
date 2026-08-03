import { fetchAllEmployees, fetchLeaveRequest } from "@services/employee";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from "react";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { usePermission } from "@hooks/usePermission";
import { saveLeaveRequests } from "@redux/slices/attendance";
import dayjs from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { getWeekDay } from "@utils/date";
import { LEAVE_STATUS, LeaveStatus } from "@constants/attendance";
import Overview from "./views/overview/Overview";
import PeriodFilter, { PeriodRange } from "@app/modules/common/components/PeriodFilter";
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
import { ErrorState } from "@app/modules/common/components/ui/tw";

import DailyAttendance from "./views/overview/DailyAttendance";
import { countWorkingDays, isMultiDay } from "@utils/periodRange";
import { filterActiveEmployees } from "@utils/activeEmployee";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { formatWorkedMinutes, parseHoursMinutes } from "./views/overview/attendancePeriodSummary";
import { safeJsonParse } from "@utils/safeJson";
// Lazy load heavy components
// Weekly/monthly Attendance rolls up to one row per employee (see the component's
// docblock) — lazily loaded because a Daily session never renders it.
const PeriodAttendanceSummary = lazy(
  () => import("./views/overview/PeriodAttendanceSummary"),
);
const OpenAttendanceRequests = lazy(
  () => import("./views/overview/OpenAttendanceRequests"),
);
const AttendanceSyncConflicts = lazy(
  () => import("./views/overview/AttendanceSyncConflicts"),
);
const AllLeaveRequest = lazy(() => import("./views/overview/AllLeaveRequest"));
const LeaveManagementRequests = lazy(
  () => import("./views/overview/LeaveManagementRequests"),
);

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
    reportsToId?: string | null;
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
  leaveRequest: LeaveRequestResponse[],
) => {
  if (!leaveRequest.length) return [];

  const leaveRequestData = leaveRequest.map((leave: LeaveRequestResponse) => {
    const {
      createdAt,
      employee: { name, employeeCode, branchId, dateOfJoining, reportsToId },
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
      reportsToId: reportsToId ?? null,
      // Approved/Rejected by info
      approvedByName: leave.approvedByEmployee?.users
        ? `${leave.approvedByEmployee.users.firstName || ""} ${leave.approvedByEmployee.users.lastName || ""}`.trim()
        : "",
      rejectedByName: leave.rejectedByEmployee?.users
        ? `${leave.rejectedByEmployee.users.firstName || ""} ${leave.rejectedByEmployee.users.lastName || ""}`.trim()
        : "",
      updatedAt: leave.updatedAt,
      hasApprovalInstance: (leave as any).hasApprovalInstance ?? false,
    };
  });

  return leaveRequestData;
};

function OverviewView() {
  const { filterIds } = useTeamFilter();
  const dispatch = useDispatch();
  const [date, setDate] = useState(dayjs()); // Anchor day — drives the Daily Attendance table + daily stats.
  // Selected period (Daily / Weekly / Monthly) — drives the stat cards. Daily is the
  // default so the table and stats stay in lock-step exactly as before; weekly/monthly
  // aggregate the stats over the range while the table stays on the anchor day.
  const [statsRange, setStatsRange] = useState<PeriodRange | null>(null);
  const handleRangeChange = useCallback((range: PeriodRange) => {
    setStatsRange(range);
    // In daily mode, keep the table + daily stats following the chosen day.
    if (range.mode === "daily" && range.start) setDate(range.start);
  }, []);
  const employeesPresentAttendance = useSelector(
    (state: RootState) => state.attendance.employeesAttendance,
  );
  const dailyStats = useSelector((state: RootState) => {
    const { attendanceStats } = state;
    return attendanceStats.daily;
  });
  // Both are lists of display names feeding the Working Time chart. Previously untyped —
  // `useState([])` infers `never[]`, which only compiled because an `any` was assigned
  // into it; now that the roster is typed, they need their real type.
  const [users, setUsers] = useState<string[]>([]);
  const [usersName, setUsersName] = useState<string[]>([]);
  const [totalWorkingHours, setTotalWorkingHours] = useState("0h 0m");
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [initError, setInitError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // const [subtractLunchTime, setSubtractLunchTime] = useState<boolean>();
  const { employeeId } = useSelector((state: RootState) => {
    const { employee } = state;
    return {
      employeeId: employee.currentEmployee.id,
    };
  });

  const selectedEmployeeId = useSelector(
    (state: RootState) => state.employee.selectedEmployee?.id,
  );

  const userIsHROrAdmin = usePermission('approvals.approve.team');
  const toggleChange = useSelector(
    (state: RootState) => state.attendanceStats.toggleChange,
  );

  // Consolidate all initial data fetching into one useEffect
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsConfigLoading(true);
        setInitError(false);
        // Fetch all data in parallel
        const [leaveRequestRes, employeesRes, configRes, lunchTimeRes] =
          await Promise.all([
            fetchLeaveRequest(),
            fetchAllEmployees(),
            fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY),
            fetchConfiguration(LEAVE_MANAGEMENT),
            dispatch(fetchRolesAndPermissions() as any),
            fetchEmpDailyStatistics(dayjs(), false),
          ]);

        // Process leave requests
        dispatch(
          saveLeaveRequests(
            transformLeaveRequests(leaveRequestRes.data.leaveRequest),
          ),
        );

        // Process employees. Inactive staff are excluded FIRST, so the Working Time
        // chart's axis carries the same people the stat cards count — a leaver used to
        // sit in the chart forever as a permanent 0h bar.
        const allFetched = filterActiveEmployees(employeesRes.data.employees || []);
        const employees = filterIds
          ? allFetched.filter((e: any) => filterIds.includes(e.id))
          : allFetched;
        setUsers(
          employees.map(
            (employee: any) =>
              employee.users.firstName + " " + employee.users.lastName,
          ),
        );
        setUsersName(
          employees.map((employee: any) => employee.users.firstName),
        );

        // Process configuration
        const parsedConfig = JSON.parse(
          configRes?.data?.configuration?.configuration || "{}",
        );
        const parsedLunchTime = JSON.parse(
          lunchTimeRes?.data?.configuration?.configuration || "{}",
        );
        const totalWorkingHoursString = parsedLunchTime["Working time"];

        if (totalWorkingHoursString) {
          setTotalWorkingHours(formatDisplay(totalWorkingHoursString));
        }

        // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
        const lunchDeductionValue =
          parsedConfig.disableLaunchDeductionTime ??
          parsedConfig.disableLunchDeductionTime ??
          false;

        dispatch(
          setFeatureConfiguration({
            disableLaunchDeductionTime: lunchDeductionValue,
            leaveManagement: parsedLunchTime ?? {},
          }),
        );
      } catch (error) {
        console.error("Error initializing data", error);
        setInitError(true);
      } finally {
        setIsConfigLoading(false);
      }
    };

    initializeData();
  }, [dispatch, reloadKey]);

  // Realtime for the page's OWN data (the Redux leave-request store and the roster
  // feeding the Working Time chart). It was a mount-only fetch, so these went stale the
  // moment anyone acted anywhere — the reason the page needed a full reload. Reuses the
  // existing reloadKey rather than a second fetch path, so there is one way to refresh.
  const reloadPageData = useCallback(() => setReloadKey((k) => k + 1), []);
  useEventBus(EVENT_KEYS.leaveRequestUpdated, reloadPageData);
  useEventBus(EVENT_KEYS.attendanceRequestUpdated, reloadPageData);

  const barOptions = usersName;
  const barSeriesData = Array.from(
    barDailyData(employeesPresentAttendance, users).values(),
  );

  // ── Period wiring ───────────────────────────────────────────────────────────
  // Daily keeps every section exactly as it was. Multi-day switches the Attendance
  // table to the per-employee rollup and rescales the Working Time targets; the two
  // request tables filter server-side and take the range directly.
  const isPeriodView = isMultiDay(statsRange);
  const weekends = useSelector((state: RootState) =>
    safeJsonParse(state?.employee?.currentEmployee?.branches?.workingAndOffDays),
  );
  const workingDaysInPeriod = useMemo(
    () => countWorkingDays(statsRange, weekends),
    [statsRange, weekends],
  );

  // Declared here, above the loading/error early returns — a hook after a conditional
  // return changes hook order between renders (react-hooks/rules-of-hooks).
  const periodWorkedMinutes = useMemo(
    () =>
      isPeriodView
        ? (employeesPresentAttendance || []).reduce(
            (sum: number, row: any) => sum + (row?.durationMinutes ?? 0),
            0,
          )
        : 0,
    [isPeriodView, employeesPresentAttendance],
  );

  const userRoles = ["HR", "Manager", "Director"];

  const sickLeaves = ["HR", "Manager"];
  const floaterLeaves = ["HR", "Manager", "Director"];
  const annualLeaves = ["HR", "Manager", "Director"];

  // Show loader while configuration is loading
  if (isConfigLoading) {
    return <Loader />;
  }

  // Surface load failures instead of silently rendering an empty Overview.
  if (initError) {
    return (
      <div className="mt-10">
        <ErrorState
          title="Couldn’t load the attendance overview"
          message="We couldn’t fetch employees, leave requests or configuration. Check your connection and try again."
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  // Calculate total working time and allowed time.
  // Over a period both must scale: the worked figure is summed from the period's rows
  // (PeriodAttendanceSummary publishes them to the same slice the daily table uses), and
  // the target is the daily target times the working days in the window — otherwise a
  // month of work is compared against a single day's target and the bar pins at 100%.
  const totalWorkingTime = isPeriodView
    ? formatWorkedMinutes(periodWorkedMinutes)
    : calculateTotalDuration(dailyStats[0]);

  const totalAllowedTime = isPeriodView
    ? formatWorkedMinutes(parseHoursMinutes(totalWorkingHours) * workingDaysInPeriod)
    : `${totalWorkingHours}`;

  return (
    <>
      <div className="sticky-overview-header d-flex flex-row justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <h3 className="fw-bold fs-1 mb-0 font-barlow">Overview</h3>
        {/* Period filter (Daily / Weekly / Monthly) with day+date label in daily mode.
            Yearly / All-Time are future scope, so they're hidden via allowedModes. */}
        <PeriodFilter
          allowedModes={["daily", "weekly", "monthly"]}
          initialMode="daily"
          dailyLabelFormat="dddd, D MMMM YYYY"
          storageKey="attendance:overview:period"
          onChange={handleRangeChange}
        />
      </div>

      <Overview date={date} range={statsRange} />

      <div className="mt-10"></div>
      <Bar
        barOption={barOptions}
        barSeriesData={barSeriesData}
        height={250}
        totalWorkingTime={totalWorkingTime}
        totalAllowedTime={totalAllowedTime}
      />

      {/* Daily keeps the familiar one-row-per-employee day view; a week or month rolls
          up to one row per employee with a day-by-day drill-in, because the same table
          over a month is ~4,600 rows and answers nothing at a glance. */}
      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          {isPeriodView && statsRange ? (
            <PeriodAttendanceSummary range={statsRange} />
          ) : (
            <DailyAttendance date={date} />
          )}
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <LeaveManagementRequests />
        </Suspense>
      </LazySection>

      <LazySection minHeight="200px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <AttendanceSyncConflicts />
        </Suspense>
      </LazySection>

      {/* Both filter SERVER-side (?startDate&endDate) — they are paginated, so trimming
          a page in the browser would leave the totals lying and later pages unfiltered. */}
      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <OpenAttendanceRequests range={statsRange} activeOnly />
        </Suspense>
      </LazySection>

      <LazySection minHeight="400px" rootMargin="300px">
        <Suspense fallback={<Loader />}>
          <AllLeaveRequest range={statsRange} activeOnly />
        </Suspense>
      </LazySection>
    </>
  );
}

export default OverviewView;
