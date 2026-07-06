import { safeJsonParse } from '@utils/safeJson';
import { resolveActiveOrgId } from '@utils/activeOrg';
import './DailyAttendance.css';
import MaterialTable from "@app/modules/common/components/MaterialTable";
import AttendanceStatusBadge from "@app/modules/common/components/AttendanceStatusBadge";
import AttendanceCheckCell, {
    formatAttendanceCheckExport,
    hasValidMapCoordinates,
} from "@app/modules/common/components/AttendanceCheckCell";
import AttendanceDurationCell from "@app/modules/common/components/AttendanceDurationCell";
import {
    resolveCheckInColor,
    resolveCheckOutColor,
    shouldApplyCheckInColoring,
} from "@utils/attendanceColorUtils";
import { ATTENDANCE_STATUS, LeaveStatus, WORKING_METHOD_TYPE } from "@constants/attendance";
import { toAbsoluteUrl } from "@metronic/helpers";
import { IEmployeesAttendance } from "@models/employee";
import { saveEmployeesAttendance } from "@redux/slices/attendance";
import { RootState } from "@redux/store";
import { fetchAllEmployeesAttendance, fetchEmployeeLeaves, fetchEmployeesOnLeaveToday } from "@services/employee";
import { getWeekDay, formatTime, formatTime24Hour, convertToTimeZone, findTimeDifference, convertTo12HourFormat } from "@utils/date";
import dayjs, { Dayjs } from "dayjs";
import { MRT_ColumnDef } from "material-react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAttendanceRealtime } from "@hooks/useAttendanceRealtime";
import { useDispatch, useSelector } from "react-redux";
import { WorkingMethod as ModelWorkingMethod } from '@models/employee';
import { onSiteAndHolidayWeekendSettingsOnOffName, resourceNameMapWithCamelCase } from "@constants/statistics";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { fetchAddressDetails } from "@services/location";
import { fetchAllPublicHolidays, fetchCompanyOverview, fetchConfiguration } from "@services/company";
import { DISABLE_LAUNCH_DEDUCTION_TIME_KEY, LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { getGraceBasedThresholds } from "@utils/getGraceBasedThresholds";
import { decimalHoursToHHMM } from "@utils/date";
import { convertMinutesIntoHrMinFormat, convertMinutesIntoHrMinFormats, customLeaves, filterLeavesPublicHolidays, getTimeDifference, markWeekendOrHoliday } from "@utils/statistics";
import { saveFilteredLeaves, saveLeaves, savePublicHolidays } from "@redux/slices/attendanceStats";
import { setFeatureConfiguration } from "@redux/slices/featureConfiguration";
import { fetchColorAndStoreInSlice } from "@utils/file";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
// TODO: Pull timezone and date format settings from db

const MUMBAI_TZ = 'Asia/Kolkata';

interface IEmployeesAttendanceResponse {
    id: string;
    employeeId: string;
    checkIn: string;
    checkOut: string;
    latitude: number;
    longitude: number;
    remarks: string | null;
    workingMethod: ModelWorkingMethod;
    checkInLocation: string;
    checkOutLocation: string;
    checkOutLatitude?: number;
    checkOutLongitude?: number;
    leaveTrackedId: string | null;
    employee: {
        employeeCode: string;
        userId: string;
        name: string;
    }
    checkoutWorkingMethod?: ModelWorkingMethod;
}

export const fetchEmpsAttendance = async (date: Dayjs) => {
    const currDate = date.date();
    const month = date.month() + 1;
    const year = date.year();
    const { data: { attendance } } = await fetchAllEmployeesAttendance(currDate, month, year);

    return attendance;
}

// Transform leave data to match attendance structure
const transformLeaveToAttendance = (leave: any, weekends: any): IEmployeesAttendance => {
    const { LEAVE } = ATTENDANCE_STATUS;

    // Use the exact leave type string from backend (e.g., "Paid Leave")
    const leaveTypeName: string = leave?.leaveType || LEAVE;

    const leaveDate = dayjs(leave.date);
    const weekDay = leaveDate.format('dddd');
    const isWeekend = weekends && typeof weekends === 'object' && weekends[weekDay.toLowerCase()] === "0";

    return {
        id: `${leave.id}`,
        employeeId: leave.employeeId,
        code: leave.employee?.employeeCode || leave.employeeCode || '-NA-',
        name: leave.employee?.users?.firstName + " " + leave.employee?.users?.lastName || '-NA-',
        checkIn: '-NA-',
        checkOut: '-NA-',
        duration: '-NA-',
        location: '-NA-',
        workingMethod: '-NA-',
        day: weekDay,
        latitude: 0,
        longitude: 0,
        status: leaveTypeName,
        date: leaveDate.format('YYYY-MM-DD'),
        checkInLocation: '-NA-',
        checkOutLocation: '-NA-',
        checkOutLatitude: 0,
        checkOutLongitude: 0,
        leaveType: leaveTypeName,
    };
};

const transformAttendance = (attendance: IEmployeesAttendanceResponse[], weekends: any): IEmployeesAttendance[] => {
    if (!attendance?.length) {
        console.warn('No attendance data received');
        return [];
    }

    const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND } = ATTENDANCE_STATUS;

    return attendance.map((empAttendance: IEmployeesAttendanceResponse) => {
        const { checkIn, checkOut, workingMethod, employeeId } = empAttendance;
        const weekDay = getWeekDay(checkIn);

        // Check if the day is a weekend based on the weekDay
        const isWeekend = weekends && typeof weekends === 'object' && weekends[weekDay.toLowerCase()] === "0";

        // Format times for display (respects 12/24 hour setting)
        const formattedCheckIn = checkIn ? formatTime(convertToTimeZone(checkIn, MUMBAI_TZ)) : '-NA-';
        const formattedCheckOut = checkOut ? formatTime(convertToTimeZone(checkOut, MUMBAI_TZ)) : '-NA-';

        // Get 24-hour format times for duration calculation
        const checkIn24Hour = checkIn ? formatTime24Hour(convertToTimeZone(checkIn, MUMBAI_TZ)) : '-NA-';
        const checkOut24Hour = checkOut ? formatTime24Hour(convertToTimeZone(checkOut, MUMBAI_TZ)) : '-NA-';

        const date = new Date(checkIn);
        const formattedDate = date.toISOString().split("T")[0];

        // Use 24-hour format for accurate duration calculation
        const getTimeDifferenceInMinutes = getTimeDifference(checkIn24Hour, checkOut24Hour);
        const getMinutesInHrMinFormat = convertMinutesIntoHrMinFormats(getTimeDifferenceInMinutes);

        let status;
        if (checkIn && checkOut) {
            status = isWeekend ? WORKING_WEEKEND : PRESENT;
        } else if (!checkIn && !checkOut && !isWeekend) {
            status = ABSENT;
        } else if (!checkIn && !isWeekend) {
            status = CHECK_IN_MISSING;
        } else if (!checkOut && !isWeekend) {
            status = CHECK_OUT_MISSING;
        } else if (empAttendance?.leaveTrackedId && !isWeekend) {
            status = LEAVE;
        } else {
            status = WEEKEND;
        }

        return {
            id: empAttendance.id,
            employeeId,
            code: empAttendance.employee.employeeCode,
            name: empAttendance.employee.name,
            checkIn: formattedCheckIn,
            checkOut: formattedCheckOut,
            duration: checkIn && checkOut ? getMinutesInHrMinFormat : '-NA-',
            location: empAttendance.checkInLocation || '-NA-',
            workingMethod: workingMethod?.type || '-NA-',
            day: weekDay,
            latitude: empAttendance.latitude,
            longitude: empAttendance.longitude,
            status,
            date: formattedDate,
            checkInLocation: empAttendance.checkInLocation,
            checkOutLocation: empAttendance.checkOutLocation,
            checkOutLatitude: empAttendance.checkOutLatitude,
            checkOutLongitude: empAttendance.checkOutLongitude,
            checkoutWorkingMethod: empAttendance.checkoutWorkingMethod?.type || '-NA-',
        };
    });
}

interface DailyAttendanceProps {
    date: any; // dayjs object from parent
}

function DailyAttendance({ date }: DailyAttendanceProps) {
    const { filterIds } = useTeamFilter();
    const dispatch = useDispatch();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);

    const { employeesAttendance } = useSelector((state: RootState) => ({
        employeesAttendance: state.attendance.employeesAttendance
    }));


    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const weekends = safeJsonParse(getAllWeekends);
    const employeeId = useSelector((state: RootState) => state?.employee?.currentEmployee?.id);
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);
    const [leaveConfiguration, setLeaveConfiguration] = useState<any>()
    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
    const colorValues = useSelector((state: RootState) => state?.customColors?.attendanceOverview);
    const missingColor = useSelector((state: RootState) => state?.customColors.workingPattern);
    const workingOnWeekendColor = useSelector((state: RootState) => state?.customColors.attendanceCalendar);
    const attendanceCalendarColor = useSelector((state: RootState) => state?.customColors?.attendanceCalendar);
    const leaveTypesColor = useSelector((state: RootState) => state?.customColors?.leaveTypes);
    const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
    const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
    const [employeeThresholds, setEmployeeThresholds] = useState<any[]>([]);
    const [employeesOnLeaveToday, setEmployeesOnLeaveToday] = useState<any[]>([]);
    const [mergedAttendanceData, setMergedAttendanceData] = useState<IEmployeesAttendance[]>([]);


    useEffect(() => {
        fetchColorAndStoreInSlice();
        async function fetchLeaveConfig() {
            const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
            const jsonObject = safeJsonParse(configuration.configuration.configuration);

            setLeaveConfiguration(jsonObject);
        }
        fetchLeaveConfig();
    }, []);

    const filteredLeaves = useSelector((state: RootState) => {
        const { attendanceStats } = state;

        return attendanceStats.filteredLeaves.filter((leave: any) => {
            const leaveDate = dayjs(leave?.date).format('DD/MM/YYYY');
            const selectedDate = date.format('DD/MM/YYYY');
            return leaveDate === selectedDate;
        });
    });

    const approvedLeaves = filteredLeaves.filter((leave: any) => leave.status === LeaveStatus.Approved);

    const LocationCell = useCallback(({ latitude, longitude, location }: { latitude?: number, longitude?: number, location?: string }) => {
        const [address, setAddress] = useState("Fetching...");

        useEffect(() => {
            let isMounted = true;

            const fetchAddress = async () => {
                // Check location string FIRST (handles biometric "Biometric" where lat/lng are 0)
                if (location) {
                    if (isMounted) setAddress(location);
                    return;
                }

                if (!latitude || !longitude) {
                    if (isMounted) setAddress("-NA-");
                    return;
                }

                try {
                    const res = await fetchAddressDetails(latitude, longitude);
                    if (isMounted) {
                        setAddress(res.data.address || "No Address Found");
                    }
                } catch (error) {
                    if (isMounted) {
                        setAddress("Unable to fetch address");
                    }
                }
            };

            fetchAddress();

            return () => {
                isMounted = false;
            };
        }, [latitude, longitude, location]);

        const mapUrl = latitude && longitude
            ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
            : null;

        return mapUrl ? (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                <OverlayTrigger placement='top' overlay={<Tooltip id={`tooltip-${latitude}-${longitude}`}>{address}</Tooltip>}>
                    <span>
                        {address.length > 30 ? `${address.substring(0, 30)}...` : address}
                    </span>
                </OverlayTrigger>
            </a>
        ) : (
            <span>{address}</span>
        );
    }, []);

    const StatusBadge = useCallback(({ status }: { status: string }) => {
        const { PRESENT, ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE, WEEKEND, WORKING_WEEKEND, LEAVE_TYPE } = ATTENDANCE_STATUS;


        // Define color mapping
        const statusColors: Record<string, string> = {
            [PRESENT]: colorValues?.presentColor || "#28a745", // Default Green
            [ABSENT]: colorValues?.absentColor || "#dc3545", // Default Red
            [CHECK_IN_MISSING]: missingColor?.earlyCheckinColor || "#ffc107", // Default Yellow
            [CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || "#ffc107", // Default Yellow
            [WEEKEND]: colorValues?.holidayColor || "#6c757d", // Default Gray
            [WORKING_WEEKEND]: workingOnWeekendColor?.workingWeekendColor || "#6610f2", // Default Purple
            // Leave type colors from Redux
            [LEAVE_TYPE.ANNUAL_LEAVE]: leaveTypesColor?.annualLeaveColor || "#2ECC71",
            [LEAVE_TYPE.SICK_LEAVE]: leaveTypesColor?.sickLeaveColor || "#E74C3C",
            [LEAVE_TYPE.CASUAL_LEAVE]: leaveTypesColor?.casualLeaveColor || "#3498DB",
            [LEAVE_TYPE.MATERNAL_LEAVE]: leaveTypesColor?.maternalLeaveColor || "#9B59B6",
            [LEAVE_TYPE.FLOATER_LEAVE]: leaveTypesColor?.floaterLeaveColor || "#F39C12",
            [LEAVE_TYPE.UNPAID_LEAVE]: leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
            [LEAVE]: attendanceCalendarColor?.onLeaveColor || "#FFC300", // Default Cyan
        };

        const resolveStatusColor = (statusValue: string): string => {
            const direct = statusColors[statusValue];
            if (direct) return direct;

            const normalizedStatus = (statusValue || '').toLowerCase();
            if (normalizedStatus.includes('annual')) return leaveTypesColor?.annualLeaveColor || statusColors[LEAVE_TYPE.ANNUAL_LEAVE];
            if (normalizedStatus.includes('sick')) return leaveTypesColor?.sickLeaveColor || statusColors[LEAVE_TYPE.SICK_LEAVE];
            if (normalizedStatus.includes('casual')) return leaveTypesColor?.casualLeaveColor || statusColors[LEAVE_TYPE.CASUAL_LEAVE];
            if (normalizedStatus.includes('maternal') || normalizedStatus.includes('maternity')) return leaveTypesColor?.maternalLeaveColor || statusColors[LEAVE_TYPE.MATERNAL_LEAVE];
            if (normalizedStatus.includes('floater')) return leaveTypesColor?.floaterLeaveColor || statusColors[LEAVE_TYPE.FLOATER_LEAVE];
            if (normalizedStatus.includes('unpaid')) return leaveTypesColor?.unpaidLeaveColor || statusColors[LEAVE_TYPE.UNPAID_LEAVE];

            // Any other custom leave type (e.g., "Paid Leave")
            if (normalizedStatus.includes('leave')) return attendanceCalendarColor?.onLeaveColor || statusColors[LEAVE];

            return "#000";
        };

        const color = resolveStatusColor(status);
        return <AttendanceStatusBadge status={status} color={color} />;
    }, [colorValues, missingColor, workingOnWeekendColor, attendanceCalendarColor, leaveTypesColor]);

    const WorkTypeCell = useCallback(({ workingMethod, latitude, longitude }: {
        workingMethod: string;
        latitude?: number;
        longitude?: number;
    }) => {
        const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

        const colorMap: Record<string, string> = {
            [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
            [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
            [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
        };

        const content = (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                    style={{
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        backgroundColor: colorMap[workingMethod] || "#000"
                    }}
                />
                {workingMethod === OFFICE ? 'Office' :
                    workingMethod === ON_SITE ? 'On-site' :
                        workingMethod === REMOTE ? 'Hybrid' : workingMethod}
            </div>
        );

        // Only provide a map link for ON-SITE work
        if (workingMethod === ON_SITE && latitude && longitude) {
            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            return (
                <a href={mapUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    {content}
                </a>
            );
        }

        return content;
    }, [worktypeColorValues]);


    // Process merged attendance data with weekend/holiday logic
    const finalAttendanceData = useMemo(() => {
        // Use merged data if available, otherwise fall back to Redux data
        const dataToProcess = mergedAttendanceData.length > 0 ? mergedAttendanceData : employeesAttendance;

        if (!dataToProcess || dataToProcess.length === 0) {
            return [];
        }

        // Apply weekend/holiday marking logic
        const isWeekendOrHolidayData = markWeekendOrHoliday(dataToProcess, getAllWeekends, allHolidays);

        return filterIds
            ? isWeekendOrHolidayData.filter((row: any) => filterIds.includes(row.employeeId))
            : isWeekendOrHolidayData;
    }, [mergedAttendanceData, employeesAttendance, getAllWeekends, allHolidays, filterIds]);

    const columns = useMemo<MRT_ColumnDef<IEmployeesAttendance>[]>(() => [
        {
            id: "employee",
            header: "Employee",
            size: 180,
            accessorFn: (row) => `${row.name} ${row.code}`,
            Cell: ({ row }) => (
                <div className="daily-attendance__employee-cell">
                    <div className="daily-attendance__employee-name">
                        {row.original.name}
                    </div>
                    <div className="daily-attendance__employee-code">
                        {row.original.code}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 120,
            Cell: ({ row }) => <StatusBadge status={row.original.status} />
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 200,
            minSize: 160,
            accessorFn: (row) => formatAttendanceCheckExport(
                row.checkIn,
                typeof row.workingMethod === 'object' ? (row.workingMethod as any)?.type : row.workingMethod,
                row.checkInLocation
            ),
            Cell: ({ row }) => {
                const employee = row.original;
                const checkIn = employee.checkIn;
                const workingMethodValue = typeof employee?.workingMethod === 'object'
                    ? (employee.workingMethod as any)?.type
                    : employee?.workingMethod;

                const employeeData = employeeThresholds?.find(
                    (emp) => emp.employeeId === employee.employeeId
                );
                const checkInColor = resolveCheckInColor({
                    checkIn,
                    workingMethod: workingMethodValue,
                    date: employee.date,
                    lateCheckInThreshold:
                        employeeData?.lateCheckInThreshold ?? lateCheckInThreshold,
                    leaveConfig: leaveConfiguration,
                    skipColoring: !shouldApplyCheckInColoring(
                        employee.status,
                        employee.isWeekendOrHoliday
                    ),
                });

                const checkInCoords =
                    employee.latitude != null &&
                    employee.longitude != null &&
                    hasValidMapCoordinates({
                        lat: Number(employee.latitude),
                        lng: Number(employee.longitude),
                    })
                        ? { lat: Number(employee.latitude), lng: Number(employee.longitude) }
                        : null;

                return (
                    <AttendanceCheckCell
                        label="Check-In"
                        type="in"
                        time={checkIn && checkIn !== '-NA-' ? convertTo12HourFormat(checkIn) : checkIn}
                        method={typeof employee.workingMethod === 'object'
                            ? (employee.workingMethod as any)?.type
                            : employee.workingMethod}
                        location={employee.checkInLocation}
                        fullAddress={employee.checkInLocation}
                        coordinates={checkInCoords}
                        timeTone={checkInColor.tone}
                        timeTooltip={checkInColor.tooltip}
                    />
                );
            },
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 200,
            minSize: 160,
            accessorFn: (row) => formatAttendanceCheckExport(
                row.checkOut,
                typeof row.checkoutWorkingMethod === 'object'
                    ? (row.checkoutWorkingMethod as any)?.type
                    : row.checkoutWorkingMethod,
                row.checkOutLocation
            ),
            Cell: ({ row }) => {
                const employee = row.original;
                const checkOut = employee.checkOut;
                const displayTime =
                    checkOut && checkOut !== '-NA-'
                        ? convertTo12HourFormat(checkOut)
                        : checkOut;

                const checkoutMethod = typeof employee.checkoutWorkingMethod === 'object'
                    ? (employee.checkoutWorkingMethod as any)?.type
                    : employee.checkoutWorkingMethod;

                const checkOutCoords =
                    employee.checkOutLatitude != null &&
                    employee.checkOutLongitude != null &&
                    hasValidMapCoordinates({
                        lat: Number(employee.checkOutLatitude),
                        lng: Number(employee.checkOutLongitude),
                    })
                        ? {
                            lat: Number(employee.checkOutLatitude),
                            lng: Number(employee.checkOutLongitude),
                        }
                        : null;

                const checkOutColor = resolveCheckOutColor(checkOut);

                return (
                    <AttendanceCheckCell
                        label="Check-Out"
                        type="out"
                        time={displayTime}
                        method={checkoutMethod}
                        location={employee.checkOutLocation}
                        fullAddress={employee.checkOutLocation}
                        coordinates={checkOutCoords}
                        timeTone={checkOutColor.tone}
                    />
                );
            },
        },
        {
            accessorKey: "duration",
            header: "Duration",
            size: 120,
            minSize: 80,
            Cell: ({ row }) => (
                <AttendanceDurationCell
                    duration={row.original.duration}
                    checkOut={row.original.checkOut}
                    skipIncompleteHighlight={row.original.isWeekendOrHoliday}
                />
            ),
        },

        // {
        //     accessorKey: "location",
        //     header: "Location",
        //     size: 200,
        //     Cell: ({ row }) => {
        //         if (row.original.workingMethod === WORKING_METHOD_TYPE.ON_SITE) {
        //             return <LocationCell latitude={row.original.latitude} longitude={row.original.longitude} location={row.original.location}/>;
        //         }
        //         return <span>-NA-</span>;
        //     }
        // },
        {
            accessorKey: "day",
            header: "Day",
            size: 120,
        },
    ], [StatusBadge, lateCheckInThreshold, earlyCheckOutThreshold, employeeThresholds, leaveConfiguration]);

    const reloadDailyAttendance = useCallback(async () => {
            try {
                const attendance = await fetchEmpsAttendance(date);
                // Fetch today's leaves for all employees
                const leavesResponse = await fetchEmployeesOnLeaveToday(date.format('YYYY-MM-DD'));

                const todaysLeaves = leavesResponse?.data?.employeeLeaveDetails || [];
                setEmployeesOnLeaveToday(todaysLeaves);

                // Filter leaves for the selected date
                const selectedDateLeaves = todaysLeaves.filter((leave: any) => {
                    const leaveDate = dayjs(leave.date).format('DD/MM/YYYY');
                    const selectedDate = date.format('DD/MM/YYYY');
                    return leaveDate === selectedDate && leave.status === LeaveStatus.Approved;
                });

                // Transform attendance data
                const transformed = transformAttendance(attendance, weekends);

                // Transform leave data to attendance structure
                const transformedLeaves = selectedDateLeaves.map((leave: any) =>
                    transformLeaveToAttendance(leave, weekends)
                );

                // Merge attendance and leave data
                // Priority: valid attendance (Present/Working Weekend) takes precedence,
                // but approved leaves must override "Absent / missing" statuses to prevent showing Absent incorrectly.
                const { ABSENT, CHECK_IN_MISSING, CHECK_OUT_MISSING, LEAVE } = ATTENDANCE_STATUS;
                const approvedLeaveTypeByEmployeeId = new Map<string, string>();
                selectedDateLeaves.forEach((leave: any) => {
                    if (!leave?.employeeId) return;
                    if (approvedLeaveTypeByEmployeeId.has(leave.employeeId)) return;
                    approvedLeaveTypeByEmployeeId.set(leave.employeeId, leave?.leaveType || LEAVE);
                });

                const transformedWithLeaveOverride = transformed.map((att) => {
                    if (!att.employeeId) return att;
                    const leaveTypeName = approvedLeaveTypeByEmployeeId.get(att.employeeId);
                    if (!leaveTypeName) return att;

                    if (
                        att.status === ABSENT ||
                        att.status === CHECK_IN_MISSING ||
                        att.status === CHECK_OUT_MISSING ||
                        att.status === LEAVE
                    ) {
                        return { ...att, status: leaveTypeName, leaveType: leaveTypeName };
                    }

                    return att;
                });

                const attendanceEmployeeIds = new Set(transformedWithLeaveOverride.map(att => att.employeeId));
                const leavesForMissingEmployees = transformedLeaves.filter((leave: IEmployeesAttendance) =>
                    !attendanceEmployeeIds.has(leave.employeeId)
                );

                const mergedData = [...transformedWithLeaveOverride, ...leavesForMissingEmployees];

                // Store merged data in local state
                setMergedAttendanceData(mergedData);

                // Store original attendance in redux for compatibility
                dispatch(saveEmployeesAttendance(transformed));
            } catch (error) {
                console.error('Error fetching attendance:', error);
            }
    }, [date, dispatch]);

    useEffect(() => {
        reloadDailyAttendance();
    }, [reloadDailyAttendance]);

    // Realtime: refetch when attendance changes anywhere (biometric punch, admin edit, self check-in/out).
    useAttendanceRealtime(() => reloadDailyAttendance());

    // fetch grace based thresholds
    useEffect(() => {
        const initThresholds = async () => {
            if (!employeesAttendance || employeesAttendance.length === 0) {
                console.error('No attendance data available yet');
                return;
            }

            const thresholds = await getGraceBasedThresholds(employeesAttendance);

            if (thresholds) {
                setEmployeeThresholds(thresholds.employeesWithThresholds);
                setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
            } else {
                console.error('No thresholds returned from getGraceBasedThresholds');
            }
        };

        initThresholds();
    }, [employeesAttendance]);

    useEffect(() => {
        const getAllholiday = async () => {
            try {
                const { data: { companyOverview } } = await fetchCompanyOverview();
                const companyId = (resolveActiveOrgId(companyOverview) ?? '');
                const { data: { publicHolidays } } = await fetchAllPublicHolidays('India', companyId);

                dispatch(savePublicHolidays(publicHolidays));
            } catch (error) {
                console.error("error", error);

            }
        }
        getAllholiday();
    }, [])

    // Fetch configuration
    const loadConfiguration = async () => {
        try {
            const res = await fetchConfiguration(DISABLE_LAUNCH_DEDUCTION_TIME_KEY);
            const lunchTime = await fetchConfiguration(LEAVE_MANAGEMENT);
            const configStr = res?.data?.configuration?.configuration;
            const lunchTimeStr = lunchTime?.data?.configuration?.configuration;
            const parsedConfig = JSON.parse(configStr);
            const parsedLunchTime = JSON.parse(lunchTimeStr);

            // Priority: disableLaunchDeductionTime (correct) -> disableLunchDeductionTime (fallback) -> false
            const lunchDeductionValue = parsedConfig?.disableLaunchDeductionTime ?? parsedConfig?.disableLunchDeductionTime ?? false;

            dispatch(
                setFeatureConfiguration({
                    disableLaunchDeductionTime: lunchDeductionValue,
                    leaveManagement: parsedLunchTime ?? {},
                })
            );
        } catch (error) {
            console.error("Error fetching configuration", error);
        }
    };

    useEffect(() => {
        loadConfiguration();
    }, []);


    return (
        <>
            <div className="d-flex flex-row mt-8 justify-content-between align-items-center ">
                <h3 className='fw-bold'>Daily Attendance</h3>
                {/* Date display (navigation is in parent OverviewView) */}
                {/* <div>
                    <span className="mx-1 my-1 fw-semibold">{date.format('DD MMM, YYYY')}</span>
                </div> */}
            </div>

            <MaterialTable
                columns={columns}
                data={finalAttendanceData}
                tableName="Daily Attendance"
                muiTableProps={{
                    muiTableBodyRowProps: ({ row }) => {
                        const status = row.original?.status ?? "";
                        const { ANNUAL_LEAVE, CASUAL_LEAVE, FLOATER_LEAVE, MATERNAL_LEAVE, SICK_LEAVE, UNPAID_LEAVE } = ATTENDANCE_STATUS.LEAVE_TYPE;
                        const statusColors: Record<string, string> = {
                            [ATTENDANCE_STATUS.PRESENT]: attendanceCalendarColor?.presentColor || "#28a745",
                            [ATTENDANCE_STATUS.ABSENT]: attendanceCalendarColor?.absentColor || "#dc3545",
                            [ATTENDANCE_STATUS.WEEKEND]: attendanceCalendarColor?.weekendColor || "#6c757d",
                            [ATTENDANCE_STATUS.WORKING_WEEKEND]: attendanceCalendarColor?.workingWeekendColor || "#6610f2",
                            [ATTENDANCE_STATUS.CHECK_OUT_MISSING]: missingColor?.missingCheckoutColor || '#ffff',
                            [ATTENDANCE_STATUS.RAISE_REQUEST]: attendanceCalendarColor?.markedPresentViaRequestRaisedColor || '#6610f2',
                            [ATTENDANCE_STATUS.LEAVE]: attendanceCalendarColor?.onLeaveColor || '#6610f2',
                            [ATTENDANCE_STATUS.CHECK_IN_MISSING]: missingColor?.missingCheckoutColor || '#6610f2',
                            // Singular keys (ATTENDANCE_STATUS.LEAVE_TYPE constants)
                            [ANNUAL_LEAVE]: leaveTypesColor?.annualLeaveColor || "#2ECC71",
                            [CASUAL_LEAVE]: leaveTypesColor?.casualLeaveColor || "#3498DB",
                            [FLOATER_LEAVE]: leaveTypesColor?.floaterLeaveColor || "#F39C12",
                            [SICK_LEAVE]: leaveTypesColor?.sickLeaveColor || "#E74C3C",
                            [UNPAID_LEAVE]: leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
                            [MATERNAL_LEAVE]: leaveTypesColor?.maternalLeaveColor || "#9B59B6",
                            // Plural keys — DB stores "Annual Leaves", "Sick Leaves" etc. (with trailing 's').
                            // Both singular and plural must be present so row background works regardless of source.
                            'Annual Leaves': leaveTypesColor?.annualLeaveColor || "#2ECC71",
                            'Casual Leaves': leaveTypesColor?.casualLeaveColor || "#3498DB",
                            'Floater Leaves': leaveTypesColor?.floaterLeaveColor || "#F39C12",
                            'Sick Leaves': leaveTypesColor?.sickLeaveColor || "#E74C3C",
                            'Unpaid Leaves': leaveTypesColor?.unpaidLeaveColor || "#95A5A6",
                            'Maternal Leaves': leaveTypesColor?.maternalLeaveColor || "#9B59B6",
                            [ATTENDANCE_STATUS.ON_LEAVE]: attendanceCalendarColor.onLeaveColor || "#dc3545",
                            [ATTENDANCE_STATUS.HOLIDAY]: colorValues?.holidayColor || "#28a745",
                        };

                        // Get background color based on status (subtle tint at 15% opacity)
                        const bgColor = statusColors[status] || "#ffffff";
                        const backgroundColor = status === ATTENDANCE_STATUS.CHECK_OUT_MISSING ? '#ffffff' : `${bgColor}26`;

                        return {
                            sx: {
                                backgroundColor,
                                borderLeft: `4px solid ${statusColors[status] ?? "transparent"}`,
                                '&:hover': { backgroundColor: `${bgColor}40` },
                                color: "#333",
                                transition: 'background-color 0.15s ease-in-out',
                                // Ensure consistent cell padding and alignment
                                '& .MuiTableCell-root': {
                                    padding: '12px 16px',
                                    verticalAlign: 'middle',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    color: '#334155',
                                },
                                // Align status column to center
                                '& .MuiTableCell-root:nth-child(3)': {
                                    textAlign: 'center',
                                },
                            }
                        };
                    }
                }}
                resource={resourceNameMapWithCamelCase.attendanceReport}
                viewOwn={true}
                viewOthers={true}
                employeeId={employeeIdCurrent}
                checkOwnWithOthers={true}
                manualPagination={false}
            />
        </>
    );
}

export default DailyAttendance;
