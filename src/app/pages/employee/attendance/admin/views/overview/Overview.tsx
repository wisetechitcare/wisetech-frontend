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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ToneChip, AppIcon } from '@app/modules/common/components/ui';
import type { SemanticTone } from '@app/theme/tokens';
import { DATE_FORMATS, formatDateLong } from '@utils/dateFormats';
import StatDetailModal, { type StatSortOption } from '@app/modules/common/components/StatDetailModal';
import {
    EmployeeStatGrid,
    EmployeeStatGroupView,
    StatEmptyState,
    type EmployeeStatItem,
} from '@app/modules/common/components/EmployeeStatGrid';
import type { EmployeeStatGroup } from '@app/modules/common/components/employeeStatGrouping';
import { computeAbsentEntries, computeLeaveDaysByDate } from "./absentDays";
import { getEmployeeStatus } from "@utils/employeeStatus";

// Sort/search/close modal shell and the employee card grid are shared with the
// Dashboard daily overview — see the two components above, not a local copy.
type SortOption = StatSortOption;

type ModalType = 'working' | 'leave' | 'late' | 'early' | 'extra' | 'absent' | 'checkoutMissing' | null;

// Count-badge colour per category, mirroring the stat-card accents so a modal reads as
// the same object the user clicked rather than a generic list.
const MODAL_TONE: Record<Exclude<ModalType, null>, SemanticTone> = {
    working: 'success',
    leave: 'warning',
    late: 'danger',
    early: 'cyan',
    extra: 'indigo',
    absent: 'danger',
    checkoutMissing: 'warning',
};

// Weekly/monthly rolls up to one card per employee, so "who does this most" leads.
// Check-in ordering works there too — occurrences carry a `time`, which a group reduces
// to its earliest/latest, so "who started offending first" is answerable.
const GROUPED_SORT_OPTIONS: StatSortOption[] = [
    'count-desc',
    'count-asc',
    'name-asc',
    'name-desc',
    'checkin-asc',
    'checkin-desc',
];
// Daily lists rows directly — one row is already one employee, so there is nothing to
// total and "most days first" would rank a column of 1s.
const FLAT_SORT_OPTIONS: StatSortOption[] = ['name-asc', 'name-desc', 'checkin-asc', 'checkin-desc'];

/** Employee id behind a leave record — the API nests it differently per endpoint. */
const leaveEmployeeId = (rec: any): string | null =>
    rec?.employee?.id || rec?.employeeId || rec?.employee?._id || null;

/**
 * Stat cards count PEOPLE, not rows. Over a week or a month the underlying lists are
 * person-days, so `rows.length` answered "how many records" ("747 Absent") under a
 * label that promises employees. Counting distinct employees also makes every card
 * reconcile exactly with its modal, which renders one card per employee.
 */
function countDistinct<T>(rows: readonly T[], idOf: (row: T) => string | null | undefined): number {
    const ids = new Set<string>();
    for (const row of rows) {
        const id = idOf(row);
        if (id) ids.add(id);
    }
    return ids.size;
}

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
    // Weekly/monthly drill-in: which grouped employee is open. Only the key + name are
    // held — the group itself is re-resolved from live data on every render, so a
    // realtime attendance refresh can never leave a stale snapshot on screen.
    const [drill, setDrill] = useState<{ key: string; name: string } | null>(null);
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

    // Roster size only. The "present" figure deliberately does NOT come from the shared
    // attendance slice — that list is the Daily Attendance table's, which folds leave
    // rows in as pseudo-attendance. Every card on this page counts off `presentRows`
    // below, from this component's own fetch, so they cannot disagree with each other.
    const totalEmployee = useSelector((state: RootState) => state.attendance.totalEmployee || 0);

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
        // THE SERVER'S VERDICT decides when present. It runs the same ladder payroll and
        // KPI use, against this employee's OWN branch calendar — which the derivation
        // below cannot see. Everything after this line is a fallback for responses that
        // predate the verdict annotator, and can be deleted once those are gone.
        const serverVerdict = (att as any).lateMark as { isLate: boolean } | undefined;
        if (serverVerdict) return serverVerdict.isLate;
        // Late-night waiver (server verdict, same rule payroll applies) — never late.
        if ((att as any).lateWaived) return false;

        const attendanceDate = new Date(att.checkIn);

        // Get shift for this date
        const shift = getShiftForDate(attendanceDate);
        const shiftCheckIn = shift?.checkIn || appSettings.checkinTime;

        if (!shiftCheckIn) return false;

        // Use on-site grace time for on-site employees, office grace time for others
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");

        // Master switch — all THREE legs (on-site, holiday, weekend), matching the backend
        // ladder. It used to test only `isOnSite`, so this card reported late check-ins on
        // the very days `extraRows` below was counting as Extra Days.
        if (isOnSiteSettingsOn === '1' && (isOnSite || checkIfWeekendOrHoliday(attendanceDate))) return false;
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
    const lateCheckInsCount = countDistinct(lateRows, (a) => a.employeeId);

    // Calculate early check-out count: employees who checked out before shift check-out time
    const earlyRows = attendance.filter(att => {
        if (!att.checkOut) return false;

        const attendanceDate = new Date(att.checkOut);

        // Master switch — all three legs, same as `lateRows`. A weekend/holiday check-out
        // is not an early check-out; there is no shift to be early against.
        const workingMethod = att.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
        const isOnSite = workingMethod?.includes("onsite");
        if (isOnSiteSettingsOn === '1' && (isOnSite || checkIfWeekendOrHoliday(attendanceDate))) return false;

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
    const earlyCheckOutsCount = countDistinct(earlyRows, (a) => a.employeeId);

    const hasCheckInNoCheckOut = (att: Attendance) =>
        Boolean(att.checkIn) && isCheckOutMissing(att.checkOut);

    const missingRows = attendance.filter(hasCheckInNoCheckOut);
    const checkoutMissingCount = countDistinct(missingRows, (a) => a.employeeId);

    // Roster index for the joins below. rowToEntry runs once per attendance row, so a
    // linear find() per row makes the range paths O(rows × roster) on EVERY render —
    // a month is ~2k rows against a ~120-person roster, and the modal re-renders on
    // every keystroke in its search box. One Map turns each join into O(1).
    const employeesById = useMemo(() => {
        const index = new Map<string, EmployeeWithAttendance>();
        for (const emp of allEmployees) if (emp?._id) index.set(emp._id, emp);
        return index;
    }, [allEmployees]);

    // Holiday dates as a lookup set. The extra-day filter previously re-formatted every
    // holiday for every attendance row — O(rows × holidays) dayjs parses per render.
    const holidayDateKeys = useMemo(() => {
        const keys = new Set<string>();
        for (const h of (allHolidays || []) as any[]) {
            const d = dayjs(h?.date);
            if (d.isValid()) keys.add(d.format(DATE_FORMATS.WIRE));
        }
        return keys;
    }, [allHolidays]);

    // One entry per attendance row (person-day) — the modal lists these so its
    // count matches the card. Employee identity is joined from the roster.
    const rowToEntry = (att: any) => ({
        ...(employeesById.get(att.employeeId) || {}),
        _id: att.employeeId,
        attendance: att,
    }) as EmployeeWithAttendance;
    // Present / on-leave / extra-day rows (weekend-worked) for the range modals.
    const presentRows = attendance.filter((a: any) => a.checkIn);
    const leaveRows = attendance.filter((a: any) => a.leaveTrackedId);
    // Extra day = a check-in on a weekend OR a public holiday.
    const extraRows = attendance.filter((a: any) => {
        if (!a.checkIn) return false;
        const day = dayjs(a.checkIn);
        const isWeekend = weekends?.[day.format("dddd").toLowerCase()] === "0";
        return isWeekend || holidayDateKeys.has(day.format(DATE_FORMATS.WIRE));
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
    // dateKey -> empId -> leave record. Extracted alongside the absent walk so both use the
    // SAME working-day predicate — this loop used to test the weekly pattern only, so a
    // leave spanning a holiday still counted as an on-leave day while the absent walk
    // skipped that day entirely.
    const leaveByDay: Map<string, Map<string, any>> = (useRange && range?.start && range?.end)
        ? computeLeaveDaysByDate({
            start: range.start,
            end: range.end,
            isNonWorking: checkIfWeekendOrHoliday,
            leaves: rangeLeaveRecords as any,
        })
        : new Map();
    // One entry per (employee, leave day) — On-Leave modal list + count.
    const leaveDayEntries = Array.from(leaveByDay.values()).flatMap((m) =>
        Array.from(m.values()).map((lr) => ({
            ...(employeesById.get(lr.employeeId) || {}),
            _id: lr.employeeId,
            _leaveDate: lr._leaveDate,
            leaveType: lr.leaveType,
            isHalfDay: lr.isHalfDay,
        }))
    );
    // Absent = per working day, roster minus present minus on-leave.
    // The walk itself lives in `absentDays.ts` so it can be tested — it carried three
    // defects at once (future days, holidays/off-Saturdays, and leavers) and none were
    // reachable by a test while it sat inline here.
    const absentEntries: any[] = (useRange && range?.start && range?.end)
        ? computeAbsentEntries({
            start: range.start,
            end: range.end,
            today: dayjs(),
            // The same predicate the rest of this page uses, so the modal cannot disagree
            // with the calendar about which days are working days.
            isNonWorking: checkIfWeekendOrHoliday,
            // Per-DAY employment. The roster is scoped to the window, which says who
            // belongs in the period; this says which of that period's days each of them
            // was actually on the books for. Without it, someone who left on 14 August
            // collected an absence for every working day from the 15th onward.
            // `getEmployeeStatus` is the shared frontend twin of the backend's
            // employment-window predicate, and is rejoin-aware.
            isEmployedOn: (employee: any, day) => getEmployeeStatus(employee, day) === 1,
            presentByDay,
            leaveByDay,
            roster: allEmployees,
        })
        : [];

    // ── Daily On-Leave & Absent ─────────────────────────────────────────────────
    // The API returns leave for the anchor day in two shapes (a summary list and a
    // detail list) and neither is guaranteed populated, so both fold into one id set.
    const dailyLeaveIds = new Set<string>();
    for (const rec of [
        ...(Array.isArray(employeesOnLeave) ? employeesOnLeave : []),
        ...(employesLeaveDatas || []),
    ]) {
        const id = leaveEmployeeId(rec);
        if (id) dailyLeaveIds.add(id);
    }
    const dailyPresentIds = new Set(
        presentRows.map((a: any) => a.employeeId).filter(Boolean) as string[],
    );
    // Roster minus present minus on-leave — the SAME set the Absent modal lists.
    // It used to be `total − present − onLeave` arithmetic against a different present
    // source than every other card, so the card and its own list could disagree.
    // Nobody is absent on a day the company does not work: the range path below already
    // skipped non-working days, this daily path did not, so a weekend/holiday reported
    // the whole roster minus whoever happened to come in.
    // Prefer the SERVER's day kind, taken from any row on this day — it is resolved from
    // each employee's own branch calendar, where `checkIfWeekendOrHoliday` reads the
    // VIEWING ADMIN's. Falls back to the local check when no row carries a verdict.
    const serverDayKinds = presentRows
        .map((a: any) => a.dayKind as string | undefined)
        .filter(Boolean) as string[];
    const isNonWorkingDay = serverDayKinds.length
        ? serverDayKinds.every((k) => k !== 'working')
        : checkIfWeekendOrHoliday(date.toDate());

    const dailyAbsentEmployees = isNonWorkingDay
        ? []
        : allEmployees.filter(
            (emp) => emp?._id && !dailyPresentIds.has(emp._id) && !dailyLeaveIds.has(emp._id),
        );

    // ── Grouping ────────────────────────────────────────────────────────────────
    // The stat lists are per-OCCURRENCE (one row per offending day). On a single day that
    // is already one row per employee, so the flat grid shows the records directly — no
    // rollup, no drill-in for detail that fits on the card. Over a range the same list
    // repeats an employee once per day (30 people × a month ≈ 600 cards, with no way to
    // see who repeats), which is what the rollup exists to fix.
    const groupedView = useRange;

    const handleDrillChange = useCallback((group: EmployeeStatGroup | null) => {
        setDrill(group ? { key: group.key, name: group.name } : null);
    }, []);

    /** Records as-is on a single day; one card per employee over a week or month. */
    const renderStatItems = (items: EmployeeStatItem[]) => {
        if (!groupedView) return <EmployeeStatGrid items={items} />;
        return (
            <EmployeeStatGroupView
                items={items}
                sort={sortOption}
                tone={showModal ? MODAL_TONE[showModal] : 'brand'}
                openKey={drill?.key ?? null}
                onOpenChange={handleDrillChange}
            />
        );
    };

    const handleCardClick = (type: ModalType) => {
        // console.log('Opening modal: ======================>', type, {
        //     totalEmployees: totalEmployee,
        //     present: employeePresent,
        //     onLeave: employeesOnLeave,
        //     attendanceCount: attendance
        // });
        setShowModal(type);
        // Each category is a fresh list: carrying the previous one's drill-in or search
        // would open the modal already filtered to something the user didn't ask for.
        setDrill(null);
        setSearchQuery('');
        // Over a range, lead with the repeat offenders — that is the question the
        // grouped list exists to answer. A single day has nothing to rank by.
        setSortOption(groupedView ? 'count-desc' : 'none');
    };

    const handleCloseModal = () => {
        setShowModal(null);
        setDrill(null);
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
        const query = searchQuery.trim().toLowerCase();
        if (!query) return employees;

        return employees.filter(emp => {
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            // Code as well as name: "WT-69" is how an admin actually refers to someone.
            return fullName.includes(query) || (emp.employeeCode || '').toLowerCase().includes(query);
        });
    };

    const filterLeaveDataBySearch = (leaveData: any[]) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return leaveData;

        return leaveData.filter(emp => {
            const employeeData = emp.employee || {};
            const user = employeeData.users || emp.users || {};
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
            const code = (employeeData.employeeCode || emp.employeeCode || '').toLowerCase();
            return fullName.includes(query) || code.includes(query);
        });
    };

    const sortEmployees = (employees: EmployeeWithAttendance[]) => {
        // Count ordering is a property of the GROUP, not of a row, so it is applied by
        // sortEmployeeStatGroups after rollup. Returning early also skips a pointless
        // O(n) copy of a list whose order is about to be discarded.
        if (sortOption === 'none' || sortOption === 'count-desc' || sortOption === 'count-asc') return employees;

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
        // Same as sortEmployees: count ordering happens after rollup, so don't copy here.
        if (sortOption === 'none' || sortOption === 'count-desc' || sortOption === 'count-asc') return leaveData;

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
                        return <StatEmptyState emptyMessage="No employees on leave today" />;
                    }

                    const filteredLeaveData = filterLeaveDataBySearch(employesLeaveDatas);
                    const sortedLeaveData = sortLeaveData(filteredLeaveData);

                    if (sortedLeaveData.length === 0) {
                        return <StatEmptyState searchQuery={searchQuery} />;
                    }

                    const leaveItems: EmployeeStatItem[] = sortedLeaveData.map(emp => {
                        const employeeData = emp.employee || {};
                        const user = employeeData.users || emp.users || {};
                        // Same resolver the On-Leave card counts with, so card = groups.
                        const employeeId = leaveEmployeeId(emp);
                        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                        const leaveType = emp.leaveType || 'Leave';
                        const startDate = emp.duration?.startDate ? dayjs(emp.duration.startDate).format('MMM D, YYYY') : 'N/A';
                        const endDate = emp.duration?.endDate ? dayjs(emp.duration.endDate).format('MMM D, YYYY') : 'N/A';
                        const isSameDay = startDate === endDate;
                        const reason = emp.reason || '';
                        return {
                            key: emp.id,
                            employeeId,
                            // The day being viewed, not the leave's start date — this list is
                            // "on leave on <date>", and a multi-day leave that began last month
                            // would otherwise stamp the card with a date outside the period.
                            date: date.format(DATE_FORMATS.WIRE),
                            name: fullName || 'Unnamed Employee',
                            code: employeeData.employeeCode || emp.employeeCode || '',
                            avatarUrl: employeeData.avatar || emp.avatar,
                            designation: employeeData.designations?.role || emp.designations?.role,
                            meta: (
                                <>
                                    <div className="d-flex align-items-center gap-2 small flex-wrap">
                                        <ToneChip tone="warning" dense label={leaveType} />
                                    </div>
                                    <div className="small mt-1 text-gray-700">
                                        <AppIcon name="bi-calendar3" className="me-1" />
                                        {isSameDay ? startDate : `${startDate} to ${endDate}`}
                                    </div>
                                    {reason && (
                                        <div className="small mt-1 text-muted text-truncate" title={reason} style={{ maxWidth: 220 }}>
                                            <AppIcon name="bi-chat-square-text" className="me-1" />{reason}
                                        </div>
                                    )}
                                </>
                            ),
                        };
                    });

                    return renderStatItems(leaveItems);
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

                        // Master switch — all three legs; keep in step with `lateRows`.
                        if (isOnSiteSettingsOn === '1' && (isOnSite || checkIfWeekendOrHoliday(attendanceDate))) return false;
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

                        // Master switch — all three legs; keep in step with `earlyRows`.
                        const workingMethod = empAttendance.workingMethod?.type?.replace(" ", "")?.replace("-", "")?.replace("_", "")?.toLowerCase();
                        const isOnSite = workingMethod?.includes("onsite");
                        if (isOnSiteSettingsOn === '1' && (isOnSite || checkIfWeekendOrHoliday(attendanceDate))) return false;

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
                    // Range lists absent person-days; daily lists the roster-minus-present
                    // set. Both come from the same expressions the Absent card counts, so
                    // the card and this list can never drift apart.
                    employees = useRange
                        ? (absentEntries as any)
                        : dailyAbsentEmployees.map((emp) => ({ ...emp, _absentDate: date }) as any);
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
                        return <StatEmptyState searchQuery={searchQuery} emptyMessage="No employees with missing check-out" />;
                    }

                    const missingItems: EmployeeStatItem[] = sorted.map(emp => {
                        const att = emp.attendance;
                        const workingMethod = att?.workingMethod?.type || '';
                        const day = att?.checkIn ? dayjs(att.checkIn) : null;
                        return {
                            key: att?.id || emp._id,
                            employeeId: emp._id,
                            date: day ? day.format(DATE_FORMATS.WIRE) : null,
                            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                            code: emp.employeeCode,
                            avatarUrl: emp.avatar,
                            designation: emp.designation,
                            time: att?.checkIn ? dayjs(att.checkIn).valueOf() : null,
                            meta: (
                                <>
                                    {/* No per-row date. Weekly/monthly render it structurally (span
                                        on the card, per-day heading in the drill-in), and daily
                                        states it once in the modal subtitle — repeating the same
                                        date on all 30 cards was noise no other stat modal had. */}
                                    <div className="d-flex align-items-center gap-2 small mt-1 flex-wrap">
                                        {att?.checkIn && (
                                            <span className="text-gray-700"><AppIcon name="bi-clock" className="me-1" />{dayjs(att.checkIn).format('h:mm A')}</span>
                                        )}
                                        {workingMethod && (
                                            <ToneChip tone="cyan" dense label={workingMethod} />
                                        )}
                                        {att?.checkInLocation && (
                                            att.latitude && att.longitude ? (
                                                <a href={`https://www.google.com/maps?q=${att.latitude},${att.longitude}`} target="_blank" rel="noopener noreferrer" className="text-truncate d-inline-block" style={{ maxWidth: 180 }} onClick={(e) => e.stopPropagation()}>
                                                    <AppIcon name="bi-geo-alt" className="me-1" />{att.checkInLocation}
                                                </a>
                                            ) : (
                                                <span className="text-muted text-truncate d-inline-block" style={{ maxWidth: 180 }}>
                                                    <AppIcon name="bi-geo-alt" className="me-1" />{att.checkInLocation}
                                                </span>
                                            )
                                        )}
                                    </div>
                                </>
                            ),
                        };
                    });

                    return renderStatItems(missingItems);
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
                        // The day this row belongs to: a check-in for attendance rows, the
                        // expanded leave/absent day for the range-only rollups.
                        const rawDay = emp.attendance?.checkIn || (emp as any)._leaveDate || (emp as any)._absentDate || null;
                        const day = rawDay ? dayjs(rawDay) : null;
                        const dayWire = day?.isValid() ? day.format(DATE_FORMATS.WIRE) : null;
                        const leaveTypeLabel = (emp as any).leaveType
                            ? `${(emp as any).leaveType}${(emp as any).isHalfDay ? ' (½)' : ''}`
                            : null;
                        // No per-row date: grouped cards carry it structurally and daily states
                        // it once in the modal subtitle. Only the rest belongs in `meta`.
                        const hasMeta = Boolean(
                            leaveTypeLabel ||
                            additionalInfo[emp._id] ||
                            emp.attendance?.checkIn ||
                            emp.attendance?.checkOut,
                        );
                        return {
                            key: emp.attendance?.id || `${emp._id}-${dayWire || ''}`,
                            employeeId: emp._id,
                            date: dayWire,
                            // Lets "Check-in (Earliest/Latest)" order by the clock rather
                            // than by day, which is what it has to mean on a single date.
                            time: emp.attendance?.checkIn ? dayjs(emp.attendance.checkIn).valueOf() : null,
                            // Half-day leave counts as 0.5 so a grouped total reconciles with the
                            // On-Leave stat card, which applies the same weighting.
                            weight: (emp as any).isHalfDay ? 0.5 : 1,
                            name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
                            code: emp.employeeCode,
                            avatarUrl: emp.avatar,
                            designation: emp.designation,
                            meta: hasMeta ? (
                                <>
                                    {leaveTypeLabel && (
                                        <div className="d-flex align-items-center gap-2 small flex-wrap">
                                            <ToneChip tone="warning" dense label={leaveTypeLabel} />
                                        </div>
                                    )}
                                    {additionalInfo[emp._id] && (
                                        <div className="text-primary small mt-1">
                                            <AppIcon name="bi-info-circle" className="me-1" />
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
                                                    // Late-night waiver (server verdict) wins over the shift+grace comparison.
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn)
                                                        && !(emp.attendance as any)?.lateWaived;

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
                                                    // Late-night waiver (server verdict) wins over the shift+grace comparison.
                                                    isLateCheckIn = actualCheckIn.isAfter(expectedCheckIn)
                                                        && !(emp.attendance as any)?.lateWaived;
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

            return renderStatItems(statItems);

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

                // Ask for EMPLOYED staff, judged against the window on screen.
                // Calling this with no argument returns every employee ever — the server
                // applies no filter when isActive is undefined — and the client then fell
                // back to the raw isActive flag, which drifts whenever HR sets an exit date
                // without also unticking Active. That is why people who had left were still
                // being counted absent every working day.
                const { data: { employees } } = await fetchAllEmployees(
                    true,
                    (useRange && range?.start ? range.start : date).format('YYYY-MM-DD'),
                    (useRange && range?.end ? range.end : date).format('YYYY-MM-DD'),
                );
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

                    // No flag filter. `fetchAllEmployees` above is already scoped
                    // server-side to this period by the employment TIMELINE
                    // (dates + rejoin history) — which is what the request just
                    // above this was always meant to do, and finally does now
                    // that the window is sent under the names the server reads.
                    //
                    // Re-applying `isActive` here would undo it twice over: it
                    // drops leavers a historical period is supposed to include,
                    // and it drops anyone whose flag is stale-off. Two people
                    // employed today were in that state when this was measured.
                    const activeEmployees = transformedEmployees as EmployeeWithAttendance[];
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

    // ── Card figures: EMPLOYEES, in every period ────────────────────────────────
    // Every one of these is a distinct-employee count, so a card means the same thing
    // whether you are looking at a day, a week or a month — "how many people". They
    // used to be row counts over a range, which turned "Absent" into 747 person-day
    // records against a 36-person roster and made the three periods unreadable side by
    // side. The per-employee day totals didn't disappear — over a range they're the count
    // badge on each card in the modal, whose summary bar states both ("34 employees · 156
    // days"). Since that modal groups by employee, the card equals its number of groups;
    // on a single day it equals its number of rows. Either way, card = list length.
    const presentEmployees = countDistinct(presentRows, (a: any) => a.employeeId);
    const leaveEmployees = useRange
        ? countDistinct(leaveDayEntries, (e: any) => e._id)
        : countDistinct(employesLeaveDatas || [], leaveEmployeeId);
    const extraDayCount = countDistinct(extraRows, (a: any) => a.employeeId);
    const absentEmployees = useRange
        ? countDistinct(absentEntries, (e: any) => e._id)
        : dailyAbsentEmployees.length;

    const cardsData: StatCardConfig[] = [
        { type: 'working', accent: 'working', img: toAbsoluteUrl('media/svg/misc/working-employees.svg'), stat: `${presentEmployees}/${totalEmployee || 0}`, label: 'Working Employees' },
        { type: 'leave', accent: 'leave', img: toAbsoluteUrl('media/svg/misc/on-leave.svg'), stat: `${leaveEmployees}`, label: 'On Leave' },
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
        { type: 'absent', accent: 'absent', img: toAbsoluteUrl('media/svg/misc/absent.svg'), stat: `${absentEmployees}`, label: 'Absent' },
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
    const modalCategoryTitle = getModalTitle();
    // The lists never repeat the date on every card, so the window the numbers cover is
    // stated once in the header — in all three periods, not just the multi-day ones.
    const periodSubtitle = useRange && range?.start && range?.end
        ? `${formatDateLong(range.start)} → ${formatDateLong(range.end)}`
        : formatDateLong(date);

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

            <StatDetailModal
                show={showModal !== null}
                onHide={handleCloseModal}
                // Drilled in, the employee is the subject and the category becomes context —
                // the reverse of the list view. One dialog, two levels: stacking a second
                // GlassDialog would put a scrim over a scrim, unusable at phone width.
                title={drill ? drill.name : modalCategoryTitle}
                subtitle={drill ? modalCategoryTitle : periodSubtitle}
                onBack={drill ? () => setDrill(null) : undefined}
                backLabel={`Back to ${modalCategoryTitle || 'list'}`}
                size="xl"
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                sortOption={sortOption}
                onSortChange={setSortOption}
                sortOptions={groupedView ? GROUPED_SORT_OPTIONS : FLAT_SORT_OPTIONS}
            >
                {getModalContent()}
            </StatDetailModal>
        </>
    );
}

export default Overview;