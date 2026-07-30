import { safeJsonParse } from '@utils/safeJson';
import { EARLY_CHECKOUT, EXTRA_DAYS, LATE_CHECKIN, onSiteAndHolidayWeekendSettingsOnOffName } from "@constants/statistics";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
import { toAbsoluteUrl } from "@metronic/helpers";
import { Attendance } from "@models/employee";
import { Employee } from "@redux/slices/employee";
import { saveTotalEmployeeCount } from "@redux/slices/attendance";
import { RootState } from "@redux/store";
import { fetchAllEmployees, fetchEmployeesOnLeaveToday, fetchEmployeesOnLeaveRange } from "@services/employee";
import { fetchDayWiseShifts } from '@services/dayWiseShift';
import { donutaDataLabel, multipleRadialBarData } from "@utils/statistics";
import dayjs from "dayjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAttendanceRealtime } from "@hooks/useAttendanceRealtime";
import {
    Card,
    CardContent,
    Grid,
    Avatar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    Button,
    IconButton,
    TextField,
    InputAdornment,
    Menu,
    MenuItem,
    Divider,
    Tooltip,
    Box,
    Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { fetchEmpsAttendance, fetchEmpsAttendanceRange } from "./DailyAttendance";
import EmployeeIdentityCell from "@app/modules/common/components/EmployeeIdentityCell";
import locationIcon from "@metronic/assets/sidepanelicons/location_11383462.png";
import { fetchConfiguration } from "@services/company";
import { getUserTablePreferences, upsertUserTablePreferences } from "@services/users";
import { isCheckOutMissing } from "@app/modules/common/components/attendanceDurationUtils";
import ReorderableGroup from "@app/modules/common/components/ReorderableGroup";
import { pressableProps } from "@app/modules/common/components/ui/a11y";
import "./OverviewStatsGrid.css";
import StatDetailModal, { type StatSortOption } from '@app/modules/common/components/StatDetailModal';
import { EmployeeStatGrid, StatEmptyState, type EmployeeStatItem } from '@app/modules/common/components/EmployeeStatGrid';

// Sort/search/close modal shell and the employee card grid are shared with the
// Dashboard daily overview — see the two components above, not a local copy.
type SortOption = StatSortOption;

type ModalType = 'working' | 'leave' | 'late' | 'early' | 'extra' | 'absent' | 'checkoutMissing' | null;

type StatCardAccent =
    | 'working'
    | 'leave'
    | 'late'
    | 'checkout-missing'
    | 'early'
    | 'extra'
    | 'absent';

type StatCardConfig = {
    type: Exclude<ModalType, null>;
    stat: string;
    label: string;
    accent: StatCardAccent;
    img?: string;
    iconClass?: string;
    iconBg?: string;
    iconColor?: string;
};

interface EmployeeWithAttendance {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode?: string;
    designation?: string;
    avatar?: string | null;  // Changed from profileImage to avatar to match Employee interface
    isActive?: boolean;  // Added to filter inactive employees
    attendance?: Attendance & {
        workingMethod?: {
            id?: string;
            type: string;
            companyId?: string;
        };
        latitude?: number;
        longitude?: number;
        checkInLocation?: string;
    };
}

interface OverviewProps {
    date: any; // dayjs object — anchor day (daily stats + table)
    // Selected period from the Overview PeriodFilter. When mode is weekly/monthly the
    // stat cards aggregate over [start, end]; daily (or null) keeps the single-day
    // behaviour. Optional so existing callers stay backward compatible.
    range?: import("@app/modules/common/components/PeriodFilter").PeriodRange | null;
}

function Overview({ date, range }: OverviewProps) {
    // Weekly/monthly stats load a date range instead of a single day; daily (or no
    // range) keeps the original single-day path untouched.
    const useRange = !!(range && range.mode !== "daily" && range.start && range.end);
    const { filterIds } = useTeamFilter();
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [employeesOnLeave, setEmployeesOnLeave] = useState<any[]>([]);
    const [employesLeaveDatas, setEmployesLeaveDatas] = useState<any[]>([]);//employesLeaveData
    // Approved leaves overlapping the selected week/month (range mode only) — used to
    // expand On-Leave / Absent into per-day stats. Empty in daily mode.
    const [rangeLeaveRecords, setRangeLeaveRecords] = useState<any[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [showModal, setShowModal] = useState<ModalType>(null);
    const [allEmployees, setAllEmployees] = useState<EmployeeWithAttendance[]>([]);
    const [dayWiseShifts, setDayWiseShifts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortOption, setSortOption] = useState<SortOption>('none');
    const [graceTimeOnSite, setGraceTimeOnSite] = useState<string>('');
    const [graceTimeOffice, setGraceTimeOffice] = useState<string>('');
    const [lunchTime, setLunchTime] = useState<string>('');
    const [isOnSiteSettingsOn, setIsOnSiteSettingsOn] = useState<string>('0');

    // User-customisable order of the overview stat cards (drag to reorder), persisted
    // PER EMPLOYEE on the server (via the shared user-table-preferences store) so it
    // survives restarts and follows the user across browsers/devices. localStorage is
    // kept only as an instant cache to avoid a flash before the server value loads.
    const OVERVIEW_CARD_ORDER_KEY = 'attendanceOverviewCardOrder';
    const CARD_ORDER_PREF_NAME = 'attendanceOverviewCards';
    const currentEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);
    // Scope the org-wide overview's per-day shifts to the admin's own org so they match
    // payroll (branch override → org → global). No scoped shift = global (unchanged).
    const overviewShiftCompanyId = useSelector((state: RootState) => state.employee?.currentEmployee?.companyId);
    const overviewShiftBranchId = useSelector((state: RootState) => state.employee?.currentEmployee?.branchId);
    const shiftScope = { companyId: overviewShiftCompanyId, branchId: overviewShiftBranchId };
    const [cardOrder, setCardOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem(OVERVIEW_CARD_ORDER_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Load this employee's saved order from the server (the source of truth).
    useEffect(() => {
        if (!currentEmployeeId) return;
        let cancelled = false;
        (async () => {
            try {
                const res = await getUserTablePreferences(currentEmployeeId, CARD_ORDER_PREF_NAME);
                const order = res?.data?.preferences?.order;
                if (!cancelled && Array.isArray(order) && order.length) {
                    setCardOrder(order);
                    try { localStorage.setItem(OVERVIEW_CARD_ORDER_KEY, JSON.stringify(order)); } catch { /* ignore */ }
                }
            } catch { /* keep localStorage/default order */ }
        })();
        return () => { cancelled = true; };
    }, [currentEmployeeId]);

    const persistCardOrder = (types: string[]) => {
        setCardOrder(types);
        try { localStorage.setItem(OVERVIEW_CARD_ORDER_KEY, JSON.stringify(types)); } catch { /* ignore */ }
        // Persist to the employee's account so the order is fixed for them everywhere.
        if (currentEmployeeId) {
            upsertUserTablePreferences(currentEmployeeId, CARD_ORDER_PREF_NAME, { order: types })
                .catch((err) => console.error('Failed to save overview card order', err));
        }
    };

    const { employeePresent, totalEmployee } = useSelector((state: RootState) => ({
        employeePresent: state.attendance.employeesAttendance?.length || 0,
        totalEmployee: state.attendance.totalEmployee || 0,
    }));
    // console.log("employeePresent ====================================>",employeePresent, totalEmployee )

    const employeesPresentAttendance = useSelector((state: RootState) =>
        state.attendance.employeesAttendance || []
    );

    // All these calculations are date-specific because they depend on state
    // updated by useEffect with date dependency (line 803)
    const lateEarlyCheckInOut = multipleRadialBarData(attendance, dayWiseShifts) || new Map();
    const workingLocationColors = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const weekends = safeJsonParse(getAllWeekends);
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);
    const appSettings = useSelector((state: RootState) => state.appSettings);
    const graceTimeFromStore = appSettings.graceTime;

    // Helper function: Get shift for a specific date
    const getShiftForDate = (date: Date) => {
        const dayName = dayjs(date).format('dddd'); // "Monday", "Tuesday", etc.
        return dayWiseShifts.find(s => s.day === dayName) || null;
    };

    // Helper function: Parse grace time
    function parseGraceTime(graceTime: string | null) {
        if (!graceTime) {
            return {
                hours: 0,
                minutes: 0,
                seconds: 0,
            };
        }
        // Remove " Hrs" and split by ":"
        const timePart = graceTime.replace(' Hrs', '').trim();
        const [hoursStr, minutesStr, secondsStr] = timePart.split(':');
        return {
            hours: parseInt(hoursStr, 10) || 0,
            minutes: parseInt(minutesStr, 10) || 0,
            seconds: parseInt(secondsStr, 10) || 0,
        };
    }

    // Helper function: Check if date is weekend or holiday
    const checkIfWeekendOrHoliday = (attendanceDate: Date) => {
        const dayName = dayjs(attendanceDate).format('dddd');
        const isConfiguredWeekend = weekends && weekends[dayName.toLowerCase()] === '0';
        const formattedDate = dayjs(attendanceDate).format('DD/MM/YYYY');
        const isPublicHoliday = allHolidays?.some((h: any) =>
            dayjs(h.date).format('DD/MM/YYYY') === formattedDate
        );
        return isConfiguredWeekend || isPublicHoliday;
    };

    // Helper function: Convert time string to minutes
    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr) return 0;
        // Handle format "1:00 Hrs" or "1:00"
        const cleanTime = timeStr.replace(' Hrs', '').trim();
        const [hoursStr, minutesStr] = cleanTime.split(':');
        const hours = parseInt(hoursStr, 10) || 0;
        const minutes = parseInt(minutesStr, 10) || 0;
        return hours * 60 + minutes;
    };

    // Transform attendance data to match the format expected by donutaDataLabel
    const attendanceForDonut = attendance.map(att => ({
        id: att.id,
        date: dayjs(att.checkIn).format('DD MMM YYYY'),
        day: dayjs(att.checkIn).format('dddd'),
        checkIn: att.checkIn,
        checkOut: att.checkOut
    }));

    // Filter leaves and holidays for the selected date
    const currentDateLeaves = useSelector((state: RootState) =>
        state?.attendanceStats?.filteredLeaves?.filter((leave: any) =>
            dayjs(leave.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
        ) || []
    );

    const currentDateHolidays = allHolidays?.filter((holiday: any) =>
        dayjs(holiday.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ) || [];

    // Check if the selected date is a weekend
    const isWeekend = weekends && weekends[date.format('dddd').toLowerCase()] === '0' ? 1 : 0;

    const extraDays = donutaDataLabel(
        attendanceForDonut,
        currentDateLeaves,
        currentDateHolidays,
        false,
        isWeekend
    )?.get(EXTRA_DAYS) || 0;

    // Calculate late check-in count: employees who checked in after (shift check-in time + grace time)
    const lateRows = attendance.filter(att => {
        if (!att.checkIn) return false;

        const attendanceDate = new Date(att.checkIn);

        // Get shift for this date
        const shift = getShiftForDate(attendanceDate);
        const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

        if (!shiftCheckIn) return false;

        // Use on-site grace time for on-site employees, office grace time for others
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");

        // If on-site settings is ON, skip on-site employees from late check-in
        if (isOnSiteSettingsOn === '1' && isOnSite) return false;
        const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
        const graceTime = parseGraceTime(graceTimeStr);

        // Create expected check-in time with grace period for the attendance date
        const expectedCheckIn = dayjs(att.checkIn)
            .startOf('day')
            .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
            .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
            .add(graceTime.hours, 'hour')
            .add(graceTime.minutes, 'minute')
            .add(graceTime.seconds, 'second');

        const actualCheckIn = dayjs(att.checkIn);

        // Return true if checked in after expected time (shift time + grace time)
        return actualCheckIn.isAfter(expectedCheckIn);
    });
    const lateCheckInsCount = lateRows.length;

    // Calculate early check-out count: employees who checked out before shift check-out time
    const earlyRows = attendance.filter(att => {
        if (!att.checkOut) return false;

        const attendanceDate = new Date(att.checkOut);

        // If on-site settings is ON, skip on-site employees from early check-out
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");
        if (isOnSiteSettingsOn === '1' && isOnSite) return false;

        // Get shift for this date
        const shift = getShiftForDate(attendanceDate);
        const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

        if (!shiftCheckOut) return false;

        // Create expected check-out time for the attendance date
        const expectedCheckOut = dayjs(att.checkOut)
            .startOf('day')
            .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
            .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

        const actualCheckOut = dayjs(att.checkOut);

        // Return true if checked out before expected time
        return actualCheckOut.isBefore(expectedCheckOut);
    });
    const earlyCheckOutsCount = earlyRows.length;

    // Calculate absent count.
    // employeesOnLeave from the API is a NUMBER (count), not an array — using .length on it gives
    // undefined which silently makes on-leave employees appear as absent.
    // Use employesLeaveDatas (the ARRAY of leave detail objects) for the correct count.
    const absentCount = Math.max(0, (totalEmployee || 0) - (employesLeaveDatas?.length || 0) - (employeePresent || 0));

    const hasCheckInNoCheckOut = (att: Attendance) =>
        Boolean(att.checkIn) && isCheckOutMissing(att.checkOut);

    const missingRows = attendance.filter(hasCheckInNoCheckOut);
    const checkoutMissingCount = missingRows.length;

    // One entry per attendance row (person-day) — the modal lists these so its
    // count matches the card. Employee identity is joined from the roster.
    const rowToEntry = (att: any) => ({
        ...(allEmployees.find((e: any) => e._id === att.employeeId) || {}),
        _id: att.employeeId,
        attendance: att,
    }) as EmployeeWithAttendance;
    // Present / on-leave / extra-day rows (weekend-worked) for the range modals.
    const presentRows = attendance.filter((a: any) => a.checkIn);
    const leaveRows = attendance.filter((a: any) => a.leaveTrackedId);
    // Extra day = a check-in on a weekend OR a public holiday.
    const extraRows = attendance.filter((a: any) => {
        if (!a.checkIn) return false;
        const isWeekend = weekends?.[dayjs(a.checkIn).format("dddd").toLowerCase()] === "0";
        const isHoliday = (allHolidays || []).some((h: any) => dayjs(h.date).format("YYYY-MM-DD") === dayjs(a.checkIn).format("YYYY-MM-DD"));
        return isWeekend || isHoliday;
    });

    // ── Weekly/Monthly On-Leave & Absent, expanded per working day ──────────────
    // Attendance rows are checkIn-only (no leave/absent), so these come from
    // rangeLeaveRecords (approved leaves overlapping the window) + the roster.
    // ponytail: a half-day leave marks the employee on-leave (not absent) for that day.
    const presentByDay = new Map<string, Set<string>>();
    for (const att of presentRows as any[]) {
        const k = dayjs(att.checkIn).format("YYYY-MM-DD");
        if (!presentByDay.has(k)) presentByDay.set(k, new Set());
        presentByDay.get(k)!.add(att.employeeId);
    }
    const leaveByDay = new Map<string, Map<string, any>>(); // dateKey -> empId -> leave record
    if (useRange && range?.start && range?.end) {
        const rStart = range.start.startOf("day");
        const rEnd = range.end.startOf("day");
        for (const lr of rangeLeaveRecords) {
            let d = dayjs(lr.dateFrom).startOf("day");
            const lEnd = dayjs(lr.dateTo).startOf("day");
            while (d.isBefore(lEnd) || d.isSame(lEnd, "day")) {
                const inRange = (d.isAfter(rStart) || d.isSame(rStart, "day")) && (d.isBefore(rEnd) || d.isSame(rEnd, "day"));
                const isWorking = weekends?.[d.format("dddd").toLowerCase()] !== "0";
                if (inRange && isWorking) {
                    const k = d.format("YYYY-MM-DD");
                    if (!leaveByDay.has(k)) leaveByDay.set(k, new Map());
                    if (!leaveByDay.get(k)!.has(lr.employeeId)) leaveByDay.get(k)!.set(lr.employeeId, { ...lr, _leaveDate: d });
                }
                d = d.add(1, "day");
            }
        }
    }
    // One entry per (employee, leave day) — On-Leave modal list + count.
    const leaveDayEntries = Array.from(leaveByDay.values()).flatMap((m) =>
        Array.from(m.values()).map((lr) => ({
            ...(allEmployees.find((e: any) => e._id === lr.employeeId) || {}),
            _id: lr.employeeId,
            _leaveDate: lr._leaveDate,
            leaveType: lr.leaveType,
            isHalfDay: lr.isHalfDay,
        }))
    );
    // Absent = per working day, roster minus present minus on-leave.
    const absentEntries: any[] = [];
    if (useRange && range?.start && range?.end) {
        let d = range.start.startOf("day");
        const end = range.end.startOf("day");
        while (d.isBefore(end) || d.isSame(end, "day")) {
            if (weekends?.[d.format("dddd").toLowerCase()] !== "0") {
                const k = d.format("YYYY-MM-DD");
                const present = presentByDay.get(k) || new Set<string>();
                const onLeave = leaveByDay.get(k) || new Map<string, any>();
                for (const emp of allEmployees) {
                    if (emp?._id && !present.has(emp._id) && !onLeave.has(emp._id)) {
                        absentEntries.push({ ...emp, _absentDate: d });
                    }
                }
            }
            d = d.add(1, "day");
        }
    }

    const handleCardClick = (type: ModalType) => {
        // console.log('Opening modal: ======================>', type, {
        //     totalEmployees: totalEmployee,
        //     present: employeePresent,
        //     onLeave: employeesOnLeave,
        //     attendanceCount: attendance
        // });
        setShowModal(type);
    };

    const handleCloseModal = () => {
        setShowModal(null);
        setSearchQuery('');
        setSortOption('none');
    };

    const getModalTitle = () => {
        switch (showModal) {
            case 'working': return 'Working Employees';
            case 'leave': return 'Employees on Leave';
            case 'late': return 'Late Check-ins';
            case 'early': return 'Early Check-outs';
            case 'absent': return 'Absent Employees';
            case 'checkoutMissing': return 'Employees with Missing Check-out';
            default: return '';
        }
    };

    const filterEmployeesBySearch = (employees: EmployeeWithAttendance[]) => {
        if (!searchQuery.trim()) return employees;

        const query = searchQuery.toLowerCase();
        return employees.filter(emp => {
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            return fullName.includes(query);
        });
    };

    const filterLeaveDataBySearch = (leaveData: any[]) => {
        if (!searchQuery.trim()) return leaveData;

        const query = searchQuery.toLowerCase();
        return leaveData.filter(emp => {
            const employeeData = emp.employee || {};
            const user = employeeData.users || emp.users || {};
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            return fullName.includes(query);
        });
    };

    const sortEmployees = (employees: EmployeeWithAttendance[]) => {
        if (sortOption === 'none') return employees;

        const sorted = [...employees];
        switch (sortOption) {
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
                    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            case 'checkin-asc':
                return sorted.sort((a, b) => {
                    const timeA = a.attendance?.checkIn ? new Date(a.attendance.checkIn).getTime() : 0;
                    const timeB = b.attendance?.checkIn ? new Date(b.attendance.checkIn).getTime() : 0;
                    return timeA - timeB;
                });
            case 'checkin-desc':
                return sorted.sort((a, b) => {
                    const timeA = a.attendance?.checkIn ? new Date(a.attendance.checkIn).getTime() : 0;
                    const timeB = b.attendance?.checkIn ? new Date(b.attendance.checkIn).getTime() : 0;
                    return timeB - timeA;
                });
            default:
                return sorted;
        }
    };

    const sortLeaveData = (leaveData: any[]) => {
        if (sortOption === 'none') return leaveData;

        const sorted = [...leaveData];
        switch (sortOption) {
            case 'name-asc':
                return sorted.sort((a, b) => {
                    const userA = (a.employee?.users || a.users) || {};
                    const userB = (b.employee?.users || b.users) || {};
                    const nameA = `${userA.firstName || ''} ${userA.lastName || ''}`.toLowerCase();
                    const nameB = `${userB.firstName || ''} ${userB.lastName || ''}`.toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            case 'name-desc':
                return sorted.sort((a, b) => {
                    const userA = (a.employee?.users || a.users) || {};
                    const userB = (b.employee?.users || b.users) || {};
                    const nameA = `${userA.firstName || ''} ${userA.lastName || ''}`.toLowerCase();
                    const nameB = `${userB.firstName || ''} ${userB.lastName || ''}`.toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            case 'checkin-asc':
            case 'checkin-desc':
                // Leave data doesn't have check-in times, so just return as-is
                return sorted;
            default:
                return sorted;
        }
    };

    const getModalContent = () => {
        // console.log('Rendering modal content for:', showModal);
        if (!showModal) return null;

        let employees: EmployeeWithAttendance[] = [];
        const additionalInfo: Record<string, string> = {};

        try {
            switch (showModal) {
                case 'working':
                    // Present-day rows (with a check-in) — same source as the card numerator.
                    employees = presentRows.map(rowToEntry);
                    break;

                case 'leave':
                    // Range: list leave person-days (matches the On-Leave card) via the shared render.
                    if (useRange) {
                        employees = leaveDayEntries as any;
                        break;
                    }
                    // employeesOnLeave is a NUMBER from the API — use the array employesLeaveDatas for length check
                    if ((employesLeaveDatas?.length ?? 0) === 0) {
                        return <div className="p-3 text-muted">No employees on leave today</div>;
                    }

                    const filteredLeaveData = filterLeaveDataBySearch(employesLeaveDatas);
                    const sortedLeaveData = sortLeaveData(filteredLeaveData);

                    if (sortedLeaveData.length === 0) {
                        return <div className="p-3 text-muted">No employees found matching "{searchQuery}"</div>;
                    }

                    return (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Employee</th>
                                        <th>Designation</th>
                                        <th>Leave Type</th>
                                        <th>Duration</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedLeaveData.map(emp => {
                                        const employeeData = emp.employee || {};
                                        const user = employeeData.users || emp.users || {};
                                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                                        const avatarSrc = employeeData.avatar || emp.avatar || toAbsoluteUrl('media/svg/avatars/043-boy-18.svg');
                                        const leaveType = emp.leaveType || 'Leave';
                                        const startDate = emp.duration?.startDate ? dayjs(emp.duration.startDate).format('MMM D, YYYY') : 'N/A';
                                        const endDate = emp.duration?.endDate ? dayjs(emp.duration.endDate).format('MMM D, YYYY') : 'N/A';
                                        const isSameDay = startDate === endDate;
                                        const reason = emp.reason || '';

                                        return (
                                            <tr key={emp.id}>
                                                <td>
                                                    <EmployeeIdentityCell
                                                        name={fullName || 'Unnamed Employee'}
                                                        code={employeeData.employeeCode || emp.employeeCode || ''}
                                                        avatarUrl={employeeData.avatar || emp.avatar}
                                                    />
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{employeeData.designations?.role || emp.designations?.role || 'N/A'}</td>
                                                <td>
                                                    <span className="badge bg-warning text-dark">
                                                        {leaveType}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <i className="bi bi-calendar3 me-2"></i>
                                                        {isSameDay ? startDate : `${startDate} to ${endDate}`}
                                                    </div>
                                                </td>
                                                <td>
                                                    {reason && (
                                                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={reason}>
                                                            <i className="bi bi-chat-square-text me-1"></i>
                                                            {reason}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                case 'late':
                    // Late check-in: employees who checked in after (shift check-in time + grace time)
                    const lateCheckInEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);

                        if (!empAttendance?.checkIn) return false;

                        const attendanceDate = new Date(empAttendance.checkIn);

                        // Get shift for this date
                        const shift = getShiftForDate(attendanceDate);
                        const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

                        if (!shiftCheckIn) return false;

                        // Use on-site grace time for on-site employees, office grace time for others
                        const workingMethod = empAttendance.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                        const isOnSite = workingMethod?.includes("onsite");

                        // If on-site settings is ON, skip on-site employees from late check-in
                        if (isOnSiteSettingsOn === '1' && isOnSite) return false;
                        const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                        const graceTime = parseGraceTime(graceTimeStr);

                        // Create expected check-in time with grace period for the attendance date
                        const expectedCheckIn = dayjs(empAttendance.checkIn)
                            .startOf('day')
                            .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                            .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                            .add(graceTime.hours, 'hour')
                            .add(graceTime.minutes, 'minute')
                            .add(graceTime.seconds, 'second');

                        const actualCheckIn = dayjs(empAttendance.checkIn);
                        const isLate = actualCheckIn.isAfter(expectedCheckIn);

                        if (isLate) {
                            const lateByMinutes = actualCheckIn.diff(expectedCheckIn, 'minute');
                            const lateHours = Math.floor(lateByMinutes / 60);
                            const lateMins = lateByMinutes % 60;
                            additionalInfo[emp._id] = `Late by ${lateHours > 0 ? lateHours + 'h ' : ''}${lateMins}m (Checked in at ${actualCheckIn.format('h:mm A')})`;
                        }

                        return isLate;
                    });

                    // Always list the same rows the card counts (lateRows). The filter
                    // above still runs, populating additionalInfo[employeeId] ("Late by
                    // Xm") which the shared render shows.
                    void lateCheckInEmployees;
                    employees = lateRows.map(rowToEntry);

                    break;

                case 'early':
                    // Early check-out: employees who checked out before shift check-out time
                    const earlyCheckOutEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);

                        if (!empAttendance?.checkOut) return false;

                        const attendanceDate = new Date(empAttendance.checkOut);

                        // If on-site settings is ON, skip on-site employees from early check-out
                        const workingMethod = empAttendance.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                        const isOnSite = workingMethod?.includes("onsite");
                        if (isOnSiteSettingsOn === '1' && isOnSite) return false;

                        // Get shift for this date
                        const shift = getShiftForDate(attendanceDate);
                        const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

                        if (!shiftCheckOut) return false;

                        // Create expected check-out time for the attendance date
                        const expectedCheckOut = dayjs(empAttendance.checkOut)
                            .startOf('day')
                            .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
                            .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

                        const actualCheckOut = dayjs(empAttendance.checkOut);
                        const isEarly = actualCheckOut.isBefore(expectedCheckOut);

                        if (isEarly) {
                            const earlyByMinutes = expectedCheckOut.diff(actualCheckOut, 'minute');
                            const earlyHours = Math.floor(earlyByMinutes / 60);
                            const earlyMins = earlyByMinutes % 60;
                            additionalInfo[emp._id] = `Early by ${earlyHours > 0 ? earlyHours + 'h ' : ''}${earlyMins}m (Checked out at ${actualCheckOut.format('h:mm A')})`;
                        }

                        return isEarly;
                    });

                    void earlyCheckOutEmployees;
                    employees = earlyRows.map(rowToEntry);

                    break;

                case 'absent':
                    // Range: list absent person-days (matches the Absent card) via the shared render.
                    if (useRange) {
                        employees = absentEntries as any;
                        break;
                    }
                    try {
                        // console.log('Calculating absent employees with:', {
                        //     allEmployees: allEmployees?.length || 0,
                        //     employeesPresentAttendance: employeesPresentAttendance?.length || 0,
                        //     employeesOnLeave: employeesOnLeave?.length || 0
                        // });

                        const presentEmployeeIds = new Set(
                            (employeesPresentAttendance || []).map(a => a.employeeId)
                        );

                        // Make sure employeesOnLeave is an array and extract employee IDs properly
                        const safeEmployeesOnLeave = Array.isArray(employeesOnLeave) ?
                            employeesOnLeave : [];

                        // Extract employee IDs from leave data - check multiple possible fields
                        const onLeaveIds = new Set(
                            safeEmployeesOnLeave.map(e => {
                                // Try to get employee ID from different possible fields
                                return e?.employee?.id || e?.employeeId || e?.employee?._id || e?.id;
                            }).filter(Boolean)
                        );

                        // Also check employesLeaveDatas for employee IDs
                        employesLeaveDatas.forEach(leave => {
                            const empId = leave?.employee?.id || leave?.employeeId || leave?.employee?._id;
                            if (empId) {
                                onLeaveIds.add(empId);
                            }
                        });

                        employees = (allEmployees || []).filter(emp =>
                            emp?._id &&
                            !presentEmployeeIds.has(emp._id) &&
                            !onLeaveIds.has(emp._id)
                        );

                        // console.log('Absent employees calculation result:', {
                        //     totalEmployees: allEmployees?.length || 0,
                        //     presentCount: presentEmployeeIds.size,
                        //     onLeaveCount: onLeaveIds.size,
                        //     absentCount: employees.length,
                        //     absentEmployees: employees.map(e => `${e.firstName} ${e.lastName}`)
                        // });
                    } catch (error) {
                        console.error('Error calculating absent employees:', error);
                        // Provide empty array if there was an error
                        employees = [];
                    }
                    break;

                case 'extra':
                    // Extra days: Employees who worked on weekends or holidays
                    const extraDayEmployees = allEmployees.filter(emp => {
                        const empAttendance = attendance.find(a => a.employeeId === emp._id);
                        if (!empAttendance?.checkIn || !empAttendance?.checkOut) return false;

                        // Check if the attendance date is a weekend or holiday
                        const attendanceDate = new Date(empAttendance.checkIn);
                        const dayName = dayjs(attendanceDate).format('dddd');

                        // Check if it's a configured weekend
                        const isConfiguredWeekend = weekends && weekends[dayName.toLowerCase()] === '0';

                        // Check if it's a public holiday
                        const formattedDate = dayjs(attendanceDate).format('DD/MM/YYYY');
                        const isPublicHoliday = allHolidays.some((h: any) =>
                            dayjs(h.date).format('DD/MM/YYYY') === formattedDate
                        );

                        return isConfiguredWeekend || isPublicHoliday;
                    });

                    void extraDayEmployees;
                    employees = extraRows.map(rowToEntry);

                    break;

                case 'checkoutMissing': {
                    // One entry per attendance row with a missing check-out — the SAME
                    // rows the card counts (missingRows), so the modal count always
                    // matches the card (daily and range alike).
                    const checkoutMissingEmployees = missingRows.map(rowToEntry);

                    const filtered = filterEmployeesBySearch(checkoutMissingEmployees);
                    const sorted = sortEmployees(filtered);

                    if (!sorted.length) {
                        return (
                            <div className="p-3 text-muted">
                                {searchQuery.trim()
                                    ? `No employees found matching "${searchQuery}"`
                                    : 'No employees with missing check-out'}
                            </div>
                        );
                    }

                    return (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Employee</th>
                                        <th>Date</th>
                                        <th>Check-in Time</th>
                                        <th>Working Method</th>
                                        <th>Location</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map(emp => {
                                        const att = emp.attendance;
                                        const workingMethod = att?.workingMethod?.type || '—';
                                        const wmKey = workingMethod
                                            ?.replace(/\s/g, '')
                                            ?.replace(/-/g, '')
                                            ?.replace(/_/g, '')
                                            ?.toLowerCase();
                                        const wmColor =
                                            workingMethod === 'Office'
                                                ? workingLocationColors?.officeColor
                                                : workingMethod === 'Hybrid'
                                                  ? workingLocationColors?.remoteColor
                                                  : wmKey?.includes('onsite')
                                                    ? workingLocationColors?.onSiteColor
                                                    : '#6c757d';

                                        return (
                                            <tr key={att?.id || emp._id}>
                                                <td>
                                                    <EmployeeIdentityCell
                                                        name={`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'}
                                                        code={emp.employeeCode}
                                                        avatarUrl={emp.avatar}
                                                    />
                                                </td>
                                                <td>
                                                    {att?.checkIn ? (
                                                        <div className="d-flex flex-column">
                                                            <span className="fw-semibold text-gray-800">{dayjs(att.checkIn).format('D MMM YYYY')}</span>
                                                            <span className="badge badge-light-primary align-self-start mt-1 fw-semibold">{dayjs(att.checkIn).format('dddd')}</span>
                                                        </div>
                                                    ) : '—'}
                                                </td>
                                                <td>
                                                    {att?.checkIn
                                                        ? dayjs(att.checkIn).format('h:mm A')
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <span style={{ color: wmColor, fontWeight: 600 }}>
                                                        {workingMethod}
                                                    </span>
                                                </td>
                                                <td>
                                                    {att?.checkInLocation ? (
                                                        att.latitude && att.longitude ? (
                                                            <Tooltip title={att.checkInLocation} placement="top">
                                                                <a
                                                                    href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="d-inline-flex align-items-center"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <img
                                                                        src={locationIcon}
                                                                        alt="location"
                                                                        style={{ width: 20, height: 20 }}
                                                                    />
                                                                    <span className="ms-1 text-truncate" style={{ maxWidth: 180 }}>
                                                                        {att.checkInLocation}
                                                                    </span>
                                                                </a>
                                                            </Tooltip>
                                                        ) : (
                                                            <span className="text-truncate d-inline-block" style={{ maxWidth: 220 }}>
                                                                {att.checkInLocation}
                                                            </span>
                                                        )
                                                    ) : (
                                                        '—'
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                }

                default:
                    return <div className="p-3 text-muted">No data available</div>;
            }

            // Apply search filter and sort for all non-leave modals
            const filteredEmployees = filterEmployeesBySearch(employees);
            const sortedEmployees = sortEmployees(filteredEmployees);

            if (!sortedEmployees || sortedEmployees.length === 0) {
                return <StatEmptyState searchQuery={searchQuery} />;
            }

            // Card layout, breakpoints and density all live in EmployeeStatGrid so the
            // Dashboard daily overview renders identically. Only the meta content —
            // dates, badges, check-in/out colouring — is computed here, because it
            // depends on this page's shifts, grace times and on-site settings.
            const statItems: EmployeeStatItem[] = sortedEmployees.map(emp => {
                        const hasMeta = Boolean(
                            (useRange && (emp.attendance?.checkIn || (emp as any)._leaveDate || (emp as any)._absentDate)) ||
                            additionalInfo[emp._id] ||
                            emp.attendance?.checkIn ||
                            emp.attendance?.checkOut,
                        );
                        return {
                            key: emp.attendance?.id || `${emp._id}-${(emp as any)._leaveDate?.format?.('YYYY-MM-DD') || (emp as any)._absentDate?.format?.('YYYY-MM-DD') || ''}`,
                            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                            code: emp.employeeCode,
                            avatarUrl: emp.avatar,
                            designation: emp.designation,
                            meta: hasMeta ? (
                                <>
                                    {useRange && (emp.attendance?.checkIn || (emp as any)._leaveDate || (emp as any)._absentDate) && (() => {
                                        const dt = emp.attendance?.checkIn ? dayjs(emp.attendance.checkIn) : dayjs((emp as any)._leaveDate || (emp as any)._absentDate);
                                        return (
                                            <div className="d-flex align-items-center gap-2 small flex-wrap">
                                                <span className="fw-semibold text-gray-800">{dt.format('D MMM YYYY')}</span>
                                                <span className="badge badge-light-primary fw-semibold">{dt.format('dddd')}</span>
                                                {(emp as any).leaveType && (
                                                    <span className="badge badge-light-warning fw-semibold">
                                                        {(emp as any).leaveType}{(emp as any).isHalfDay ? ' (½)' : ''}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    {additionalInfo[emp._id] && (
                                        <div className="text-primary small mt-1">
                                            <i className="bi bi-info-circle me-1"></i>
                                            {additionalInfo[emp._id]}
                                        </div>
                                    )}
                                    {!additionalInfo[emp._id] && (emp.attendance?.checkIn || emp.attendance?.checkOut) && (
                                        // flex-wrap: at 4 columns the check-in/out chips plus a
                                        // working-method label must wrap, not overflow the card.
                                        <div className="d-flex align-items-center gap-2 small mt-1 flex-wrap">
                                            {emp.attendance?.checkIn && emp.attendance?.checkOut && (() => {
                                                // Check if weekend/holiday worker
                                                const attendanceDate = new Date(emp.attendance.checkIn);
                                                const isWeekendOrHoliday = checkIfWeekendOrHoliday(attendanceDate);

                                                // Get shift for this date
                                                const shift = getShiftForDate(attendanceDate);
                                                const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;
                                                const shiftCheckOut = shift?.checkOut || appSettings.checkoutTime;

                                                // Check working method for on-site
                                                const workingMethod = emp.attendance?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                                                const isOnSite = workingMethod?.includes("onsite");

                                                // If on-site settings is ON and employee is on-site, always show green
                                                const skipLateEarlyCheck = (isOnSiteSettingsOn === '1' && isOnSite) || isWeekendOrHoliday;

                                                let isLateCheckIn = false;
                                                let isEarlyCheckOut = false;

                                                if (!skipLateEarlyCheck && shiftCheckIn && shiftCheckOut) {
                                                    // Calculate late check-in
                                                    const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                                                    const graceTime = parseGraceTime(graceTimeStr);

                                                    const expectedCheckIn = dayjs(emp.attendance.checkIn)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                                                        .add(graceTime.hours, 'hour')
                                                        .add(graceTime.minutes, 'minute')
                                                        .add(graceTime.seconds, 'second');

                                                    const actualCheckIn = dayjs(emp.attendance.checkIn);
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn);

                                                    // Calculate early check-out
                                                    const expectedCheckOut = dayjs(emp.attendance.checkOut)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckOut, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckOut, 'h:mm A').minute(), 'minute');

                                                    const actualCheckOut = dayjs(emp.attendance.checkOut);
                                                    isEarlyCheckOut = actualCheckOut.isBefore(expectedCheckOut);
                                                }

                                                return (
                                                    <>
                                                        <span className={isLateCheckIn ? "text-danger" : "text-success"} title={isLateCheckIn ? "Late check-in" : "On-time check-in"} aria-label={`${isLateCheckIn ? "Late" : "On-time"} check-in at ${dayjs(emp.attendance.checkIn).format('h:mm A')}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <i className={`bi ${isLateCheckIn ? 'bi-exclamation-triangle-fill' : 'bi-clock'} me-1`}></i>
                                                            {dayjs(emp.attendance.checkIn).format('h:mm A')}
                                                        </span>
                                                        <span className={isEarlyCheckOut ? "text-danger" : "text-success"} title={isEarlyCheckOut ? "Early check-out" : "On-time check-out"} aria-label={`${isEarlyCheckOut ? "Early" : "On-time"} check-out at ${dayjs(emp.attendance.checkOut).format('h:mm A')}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <i className={`bi ${isEarlyCheckOut ? 'bi-exclamation-triangle-fill' : 'bi-clock-fill'} me-1`}></i>
                                                            {dayjs(emp.attendance.checkOut).format('h:mm A')}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                            {emp.attendance?.checkIn && !emp.attendance?.checkOut && (() => {
                                                // Check if weekend/holiday worker
                                                const attendanceDate = new Date(emp.attendance.checkIn);
                                                const isWeekendOrHoliday = checkIfWeekendOrHoliday(attendanceDate);

                                                // Get shift for this date
                                                const shift = getShiftForDate(attendanceDate);
                                                const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

                                                // Check working method for on-site
                                                const workingMethod = emp.attendance?.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                                                const isOnSite = workingMethod?.includes("onsite");

                                                // If on-site settings is ON and employee is on-site, always show green
                                                const skipLateCheck = (isOnSiteSettingsOn === '1' && isOnSite) || isWeekendOrHoliday;

                                                let isLateCheckIn = false;

                                                if (!skipLateCheck && shiftCheckIn) {
                                                    // Calculate late check-in
                                                    const graceTimeStr = isOnSite ? graceTimeOnSite : graceTimeOffice;
                                                    const graceTime = parseGraceTime(graceTimeStr);

                                                    const expectedCheckIn = dayjs(emp.attendance.checkIn)
                                                        .startOf('day')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').hour(), 'hour')
                                                        .add(dayjs(shiftCheckIn, 'h:mm A').minute(), 'minute')
                                                        .add(graceTime.hours, 'hour')
                                                        .add(graceTime.minutes, 'minute')
                                                        .add(graceTime.seconds, 'second');

                                                    const actualCheckIn = dayjs(emp.attendance.checkIn);
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn);
                                                }

                                                return (
                                                    <span className={isLateCheckIn ? "text-danger" : "text-success"} title={isLateCheckIn ? "Late check-in" : "On-time check-in"} aria-label={`${isLateCheckIn ? "Late" : "On-time"} check-in at ${dayjs(emp.attendance.checkIn).format('h:mm A')}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                        <i className={`bi ${isLateCheckIn ? 'bi-exclamation-triangle-fill' : 'bi-clock'} me-1`}></i>
                                                        {dayjs(emp.attendance.checkIn).format('h:mm A')}
                                                    </span>
                                                );
                                            })()}
                                            {showModal === 'working' && emp.attendance?.workingMethod && (
                                                <span
                                                    style={{
                                                        color:
                                                            emp.attendance.workingMethod.type === 'Office' ? workingLocationColors?.officeColor :
                                                            emp.attendance.workingMethod.type === 'Hybrid' ? workingLocationColors?.remoteColor :
                                                            emp.attendance.workingMethod.type === 'On-site' ? workingLocationColors?.onSiteColor : '#6c757d',
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center'
                                                    }}
                                                >
                                                    {emp.attendance.workingMethod.type}
                                                    {emp.attendance.workingMethod.type === 'On-site' && emp.attendance.checkInLocation && emp.attendance.latitude && emp.attendance.longitude && (
                                                        <Tooltip title={emp.attendance.checkInLocation} placement="top">
                                                            <a
                                                                href={`https://www.google.com/maps?q=${emp.attendance.latitude},${emp.attendance.longitude}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    marginLeft: '6px',
                                                                    textDecoration: 'none',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    verticalAlign: 'middle'
                                                                }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <img
                                                                    src={locationIcon}
                                                                    alt="location"
                                                                    style={{
                                                                        width: '20px',
                                                                        height: '20px',
                                                                        objectFit: 'contain',
                                                                        display: 'block'
                                                                    }}
                                                                />
                                                            </a>
                                                        </Tooltip>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : null,
                        };
                    });

            return <EmployeeStatGrid items={statItems} />;

        } catch (err) {
            console.error('Error in getModalContent:', err);
            return <div className="p-3 text-danger">Error loading data. Please try again.</div>;
        }
    };



    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // `silent` skips the loader/error UI — used by the realtime refetch so live
    // updates don't flash the whole board.
    const reloadOverviewAttendance = useCallback(async (silent = false) => {
            try {
                if (!silent) setIsLoading(true);
                setError(null);

                const { data: { employees } } = await fetchAllEmployees();
                // Fetch data for the selected date
                const response = await fetchEmployeesOnLeaveToday(date.format('YYYY-MM-DD'));
                const employeesOnLeave = response?.data?.employeesOnLeave || [];
                const employesLeaveData = response?.data?.employeeLeaveDetails || [];
                const allAttendance = useRange
                    ? await fetchEmpsAttendanceRange(range!.start!.format("YYYY-MM-DD"), range!.end!.format("YYYY-MM-DD"))
                    : await fetchEmpsAttendance(date);

                // Range mode: also pull approved leaves overlapping the window so
                // On-Leave / Absent can be expanded per day (the attendance fetch is
                // checkIn-filtered and carries no leave/absent rows).
                if (useRange && range?.start && range?.end) {
                    const leaveResp = await fetchEmployeesOnLeaveRange(range.start.format("YYYY-MM-DD"), range.end.format("YYYY-MM-DD"));
                    if (isMountedRef.current) setRangeLeaveRecords(leaveResp?.data?.leaveRecords || []);
                } else if (isMountedRef.current) {
                    setRangeLeaveRecords([]);
                }
                //     employees:employees,
                //     rawResponse: response,
                //     employesLeaveData:response?.data?.employeeLeaveDetails,
                //     employeesOnLeave: employeesOnLeave,
                //     count: employeesOnLeave.length,
                //     firstItem: employeesOnLeave[0]
                // });


                // console.log('Transforming employees data. Total employees:', employees.length);
                // Transform employees to match EmployeeWithAttendance interface
                const transformedEmployees = employees.map((emp: any) => ({
                    _id: emp.id || '',
                    firstName: emp.users?.firstName || 'Unknown',
                    lastName: emp.users?.lastName || 'Employee',
                    designation: emp.designations?.role || 'No designation',
                    employeeCode: emp.employeeCode || '',
                    avatar: emp.avatar || null,
                    isActive: emp.isActive ?? true,  // Default to true if not specified
                }));

                if (isMountedRef.current) {
                    // console.log('Setting state with data:', {
                    //     allEmployees: transformedEmployees.length,
                    //     employeesOnLeave: employeesOnLeave.length,
                    //     attendance: allAttendance.length
                    // });

                    // Filter only active employees for state
                    const activeEmployees = transformedEmployees.filter((emp: any) => emp.isActive !== false);
                    const visibleEmployees = filterIds
                        ? activeEmployees.filter((emp: any) => filterIds.includes(emp._id))
                        : activeEmployees;

                    setAllEmployees(visibleEmployees);
                    setEmployeesOnLeave(employeesOnLeave);
                    setEmployesLeaveDatas(employesLeaveData);
                    setAttendance(allAttendance);
                    dispatch(saveTotalEmployeeCount(activeEmployees.length));
                }
                // console.log("employesLeaveData:=============>", employesLeaveData)
            } catch (err) {
                console.error('Error fetching employee data:', err);
                if (isMountedRef.current && !silent) {
                    setError('Failed to load employee data. Please refresh the page to try again.');
                }
            } finally {
                if (isMountedRef.current && !silent) {
                    setIsLoading(false);
                }
            }
    }, [dispatch, date, useRange, range?.start?.valueOf(), range?.end?.valueOf()]);

    useEffect(() => {
        reloadOverviewAttendance();
    }, [reloadOverviewAttendance]);

    // Realtime: refetch quietly when attendance changes anywhere (biometric punch, admin edit, self check-in/out).
    useAttendanceRealtime(() => reloadOverviewAttendance(true));

    // Fetch day-wise shifts
    useEffect(() => {
        async function loadDayWiseShifts() {
            try {
                const response = await fetchDayWiseShifts(shiftScope);
                setDayWiseShifts(response.data || []);
            } catch (error) {
                console.error("Error fetching day-wise shifts:", error);
                setDayWiseShifts([]); // Use empty array as fallback
            }
        }
        loadDayWiseShifts();
    }, [shiftScope.companyId, shiftScope.branchId]);

    // Fetch grace time for office, on-site, lunch time and on-site settings
    useEffect(() => {
        async function fetchTimeConfiguration() {
            try {
                const { data: { configuration } } = await fetchConfiguration('leave management', undefined, undefined, shiftScope);
                const leaveConfig = safeJsonParse(configuration?.configuration || '{}');
                const graceTimeOfficeStr = leaveConfig?.['Grace Time'] || '00:30:00 Hrs';
                const graceTimeOnSiteStr = leaveConfig?.['Grace Time - On Site'] || '00:10:00 Hrs';
                const lunchTimeStr = leaveConfig?.['Lunch Time'] || '1:00 Hrs';
                const onSiteSettingsValue = leaveConfig?.[onSiteAndHolidayWeekendSettingsOnOffName] || '0';
                setGraceTimeOffice(graceTimeOfficeStr.replace(' Hrs', '').trim());
                setGraceTimeOnSite(graceTimeOnSiteStr.replace(' Hrs', '').trim());
                setLunchTime(lunchTimeStr);
                setIsOnSiteSettingsOn(onSiteSettingsValue);
            } catch (error) {
                console.error('Failed to fetch time configuration:', error);
                setGraceTimeOffice('00:30:00'); // fallback
                setGraceTimeOnSite('00:10:00'); // fallback
                setLunchTime('1:00 Hrs'); // fallback
                setIsOnSiteSettingsOn('0'); // fallback
            }
        }
        fetchTimeConfiguration();
    }, [shiftScope.companyId, shiftScope.branchId]);

    // ── Weekly/Monthly employee-day totals ──────────────────────────────────────
    // In range mode `attendance` holds every row in [start, end], so the per-row
    // counts above (late/early/missing/checkout-missing) already sum. The four
    // below aren't per-row counts, so derive them as employee-day totals here.
    // ponytail: On-Leave/Absent read materialized leave rows + a roster×working-days
    // estimate; exact per-day roster reconciliation stays on the Individual page.
    // Present count from attendance rows (with a check-in) — same source the
    // Working modal lists, so card numerator = modal count in daily and range.
    const presentDays = presentRows.length;
    // On-Leave (range) = leave person-days, half-days weighted 0.5 (matches the
    // half-day=0.5 policy). The modal lists every leave-day row with a ½ badge, so
    // e.g. 11.5 on the card ↔ 12 rows (one marked ½).
    const leaveDays = useRange
        ? leaveDayEntries.reduce((s, e: any) => s + (e.isHalfDay ? 0.5 : 1), 0)
        : (employesLeaveDatas?.length || 0);
    const extraDayCount = extraRows.length;
    const workingDaysInRange = (() => {
        if (!useRange || !range?.start || !range?.end) return 1;
        let n = 0;
        let d = range.start.startOf("day");
        const end = range.end.startOf("day");
        while (d.isBefore(end) || d.isSame(end, "day")) {
            if (weekends?.[d.format("dddd").toLowerCase()] !== "0") n++;
            d = d.add(1, "day");
        }
        return n;
    })();
    // Absent (range) = per-day roster minus present minus on-leave; matches its modal.
    const absentDayCount = useRange ? absentEntries.length : absentCount;

    const cardsData: StatCardConfig[] = [
        { type: 'working', accent: 'working', img: toAbsoluteUrl('media/svg/misc/working-employees.svg'), stat: useRange ? `${presentDays}/${(totalEmployee || 0) * workingDaysInRange}` : `${presentDays}/${totalEmployee || 0}`, label: 'Working Employees' },
        { type: 'leave', accent: 'leave', img: toAbsoluteUrl('media/svg/misc/on-leave.svg'), stat: `${leaveDays}`, label: 'On Leave' },
        { type: 'late', accent: 'late', img: toAbsoluteUrl('media/svg/misc/late.svg'), stat: `${lateCheckInsCount}`, label: 'Late Check-ins' },
        {
            type: 'checkoutMissing',
            accent: 'checkout-missing',
            iconClass: 'bi bi-person-exclamation',
            iconBg: '#FFF4E6',
            iconColor: '#F59E0B',
            stat: `${checkoutMissingCount}`,
            label: 'Check-out Missing',
        },
        { type: 'early', accent: 'early', img: toAbsoluteUrl('media/svg/misc/checkout.svg'), stat: `${earlyCheckOutsCount}`, label: 'Early Check-out' },
        { type: 'extra', accent: 'extra', img: toAbsoluteUrl('media/svg/misc/extra-days.svg'), stat: `${extraDayCount}`, label: 'Extra Day' },
        { type: 'absent', accent: 'absent', img: toAbsoluteUrl('media/svg/misc/absent.svg'), stat: `${absentDayCount}`, label: 'Absent' },
    ];

    // Apply the user's saved order; any card not in the saved order keeps its
    // natural position at the end (handles new cards / first run gracefully).
    const cardsByType = new Map<string, StatCardConfig>(cardsData.map((c) => [c.type, c]));
    const orderedCards: StatCardConfig[] = [
        ...cardOrder.map((t) => cardsByType.get(t)).filter(Boolean) as StatCardConfig[],
        ...cardsData.filter((c) => !cardOrder.includes(c.type)),
    ];

    // if (isLoading) {
    //     return (
    //         <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
    //             <Spinner animation="border" role="status">
    //                 <span className="visually-hidden">Loading...</span>
    //             </Spinner>
    //         </div>
    //     );
    // }

    if (error) {
        return (
            <Alert severity="error" sx={{ mt: 3 }}>
                {error}
            </Alert>
        );
    }
    const renderStatCard = (card: StatCardConfig) => (
        <Card
            key={card.type}
            elevation={0}
            className={`overview-stat-card overview-stat-card--${card.accent}`}
            onClick={() => handleCardClick(card.type)}
            aria-label={`${card.label}: ${card.stat || 0}. View details`}
            {...pressableProps(() => handleCardClick(card.type))}
            sx={{ '&:focus-visible': { outline: '2px solid #1E3A8A', outlineOffset: '2px' } }}
        >
            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <div className="overview-stat-card-content">
                    <div className="overview-stat-card-metric">
                        {card.iconClass ? (
                            <span
                                className="overview-stat-card-icon"
                                style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                            >
                                <i className={card.iconClass} style={{ fontSize: '1.25rem' }} />
                            </span>
                        ) : (
                            <span className="overview-stat-card-icon">
                                <img src={card.img} alt={card.label} />
                            </span>
                        )}
                        <span className="overview-stat-card-value">{card.stat || 0}</span>
                    </div>
                    <p className="overview-stat-card-label">{card.label}</p>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <>
            <ReorderableGroup
                items={orderedCards}
                getItemId={(c) => c.type}
                onReorder={(items) => persistCardOrder(items.map((c) => c.type))}
                renderItem={(card) => renderStatCard(card)}
                axis="x"
                className="overview-stats-container mt-3"
                itemClassName="overview-stat-card-slot"
            />

            <CustomModal
                show={showModal !== null}
                onHide={handleCloseModal}
                title={getModalTitle()}
                size="xl"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
            >
                {getModalContent()}
            </CustomModal>
        </>
    );
}

export default Overview;