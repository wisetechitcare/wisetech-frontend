import MaterialTable from "@app/modules/common/components/MaterialTable";
import Identifiers from "@app/modules/common/utils/Identifiers";
import Loader from "@app/modules/common/utils/Loader";
import { LEAVE_STATUS, LeaveStatus, WORKING_METHOD_TYPE } from "@constants/attendance";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { IAttendanceRequests } from "@models/employee";
import { RootState } from "@redux/store";
import { fetchCompanyOverview, fetchConfiguration } from "@services/company";
import { getAllAttendanceRequestByCompanyId, approveAttendanceRequest, rejectAttendanceRequest, getAllKpiFactors, createKpiScore, getPendingAttendanceRequests } from "@services/employee";
import { hasPermission } from "@utils/authAbac";
import { getGraceBasedThresholds } from "@utils/getGraceBasedThresholds";
import { deleteConfirmation, errorConfirmation, rejectConfirmation, successConfirmation } from "@utils/modal";
import { markWeekendOrHoliday, transformAttendanceRequest } from "@utils/statistics";
import { convertTo12HourFormat } from "@utils/date";
import dayjs from "dayjs";
import dayjsTimezone from "dayjs/plugin/timezone";
import dayjsUTC from "dayjs/plugin/utc";
dayjs.extend(dayjsUTC);
dayjs.extend(dayjsTimezone);

export const normalizeAttendanceRequestTime = (value: string | undefined, dateStr: string): string | undefined => {
    if (!value || value === "" || value === "-NA-") {
        return undefined;
    }

    // If it is already a full ISO timestamp, keep it in ISO format.
    if (value.includes('T') || value.includes('Z')) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
        // fall through to additional parsing
    }

    const formattedDate = dayjs(dateStr, "DD MMM YYYY").format("YYYY-MM-DD");
    let parsed: dayjs.Dayjs | undefined;
    const attemptFormats = [
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DD h:mm A',
        'YYYY-MM-DD hh:mm A',
        'YYYY-MM-DD h:mm:ss A',
        'YYYY-MM-DD hh:mm:ss A',
    ];

    for (const fmt of attemptFormats) {
        const candidate = dayjs.tz(`${formattedDate} ${value}`, fmt, 'Asia/Kolkata');
        if (candidate.isValid()) {
            parsed = candidate;
            break;
        }
    }

    if (parsed && parsed.isValid()) {
        return parsed.toISOString();
    }

    // As last resort, attempt to parse with JS Date (assumes value may include timezone offsets)
    const fallback = new Date(value);
    if (!isNaN(fallback.getTime())) {
        return fallback.toISOString();
    }

    return undefined;
};

import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { pageSize, useServerPagination } from "@hooks/useServerPagination";
import EditAttendanceRequest from "./EditAttendanceRequest";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

const OpenAttendanceRequests = () => {
    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation)
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);
    const isAdminUser = useSelector((state: RootState) => (state.auth as any).currentUser?.isAdmin);
    const currentEmployeeRoles: any[] = useSelector((state: RootState) => state.employee.currentEmployee.roles || []);
    const isHROrAdmin = isAdminUser || currentEmployeeRoles.some((r: any) =>
        ['hr', 'admin', 'super_admin', 'superadmin', 'super admin'].includes((r?.name || r?.role || '').toLowerCase())
    );

    const [allTheFactorDetails, setAllTheFactorDetails] = useState<any>([])
    const [attendanceActionId, setAttendanceActionId] = useState("");
    const [loading, setLoading] = useState(false);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
    const [leaveConfiguration, setLeaveConfiguration] = useState<any>()
    const [openRequests, setOpenRequests] = useState<IAttendanceRequests[]>([]);
    const [openRequestsLoading, setOpenRequestsLoading] = useState(true);
    const [openAttendanceRequestModal, setOpenAttendanceRequestModal] = useState(false);
    const [selectedAttendanceRequest, setSelectedAttendanceRequest] = useState<IAttendanceRequests>();

    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

    // Fetch function for all attendance requests (used for both tables)
    const fetchAllAttendanceRequests = useCallback(async (page: number, limit: number) => {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const companyId = companyOverview[0].id;

        const { data: { attendanceRequests, pagination: paginationData } } = await getAllAttendanceRequestByCompanyId(companyId, page, limit);
        console.log("attendanceRequestsAll", attendanceRequests);

        return {
            data: attendanceRequests,
            totalRecords: paginationData?.totalRecords || attendanceRequests.length,
        };
    }, []);

    // Single hook for all attendance requests with server-side pagination
    const {
        data: attendanceRequests,
        allData: allAttendanceRequests,
        pagination: allPagination,
        totalRecords: allTotalRecords,
        isLoading: dataLoading,
        isInitialLoading: initialLoading,
        setPagination: setAllPagination,
        refetch,
    } = useServerPagination<IAttendanceRequests>({
        fetchFunction: fetchAllAttendanceRequests,
        initialPageSize: pageSize,
        transformData: transformAttendanceRequest,
    });

    // Fetch ALL pending requests separately for "Open Attendance Requests" table
    const fetchOpenRequests = useCallback(async () => {
        try {
            setOpenRequestsLoading(true);
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;

            // Fetch pending requests from the dedicated API endpoint (no pagination)
            const { data: { attendanceRequests } } = await getPendingAttendanceRequests(companyId);
            console.log("attendanceRequests", attendanceRequests);

            // Transform the data
            const transformed = transformAttendanceRequest(attendanceRequests);

            setOpenRequests(transformed);
        } catch (error) {
            console.error('Error fetching open requests:', error);
            setOpenRequests([]);
        } finally {
            setOpenRequestsLoading(false);
        }
    }, []);

    // Fetch open requests on mount and after approve/reject
    useEffect(() => {
        fetchOpenRequests();
    }, [fetchOpenRequests]);

    useEventBus(EVENT_KEYS.attendanceRequestUpdated, (data) => {
        fetchOpenRequests();
        refetch();
    });

    useEffect(() => {
        async function fetchLeaveConfig() {
            const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
            const jsonObject = JSON.parse(configuration.configuration.configuration);

            setLeaveConfiguration(jsonObject);
        }
        fetchLeaveConfig();
    }, []);


    useEffect(() => {
        async function fetchAllTheFactorDetails() {
            try {
                const { data: { factors } } = await getAllKpiFactors();
                setAllTheFactorDetails(factors);
            } catch (error) {
                console.error('Error fetching factor details:', error);
            }
        }
        fetchAllTheFactorDetails();
    }, [])

    const approveRequest = async (request: any) => {
        try {
            setLoading(true);
            setProcessingRowId(request.id);
            setProcessingAction('approve');
            const attendance = {
                requestId: request.id,
                employeeId: request.employeeId,
                // Prefer raw ISO timestamps when available to avoid 12-hour formatting ambiguity.
                checkIn: request.rawCheckIn || request.checkIn,
                checkOut: request.rawCheckOut || request.checkOut,
                latitude: request.latitude,
                longitude: request.longitude,
                remarks: request.remarks,
                workingMethodId: request.workingMethodId,
                approvedById: employeeIdCurrent // Track who approved the request
            }

            const requestRaised = allTheFactorDetails.find((el: any) => el?.name?.toLowerCase() === 'request raised');

            let workingDaysWeightage = Number(requestRaised?.weightage);
            const workingDaysWeightageType = requestRaised?.type;
            if (workingDaysWeightageType == "NEGATIVE") {
                if (workingDaysWeightage > 0) {
                    workingDaysWeightage = workingDaysWeightage * -1;
                }
            }
            const workingDaysFactorId = requestRaised?.id;
            const workingDayValue = workingDaysWeightage
            const workingDaysScore = workingDayValue * 1

            const workingDaysPayload = {
                employeeId: request?.employeeId, // here put employeeId from the request payload
                factorId: workingDaysFactorId,
                value: 1,
                score: workingDaysScore.toString(),
            }
            // if(attendance.checkOut === "-NA-" || attendance.checkOut === "" || attendance.checkIn === "" || attendance.checkIn === "-NA-"){
            //     errorConfirmation("Check-In time and Check-Out time is required to approve the request");
            //     setLoading(false);
            //     setProcessingRowId(null);
            //     setProcessingAction(null);
            //     return;
            // }
            const isCheckoutMissing = (attendance.checkOut === "-NA-" || attendance.checkOut === "");
            if (!isCheckoutMissing) {
                const res = await createKpiScore(workingDaysPayload);
            }

            // const formattedDate = dayjs(request.date, "DD MMM YYYY").format("YYYY-MM-DD");

            // if (attendance.checkIn !== "") {
            //     const checkInDateTime = dayjs(`${formattedDate} ${attendance.checkIn}`, "YYYY-MM-DD HH:mm").toString();
            //     const checkInDateObject = new Date(checkInDateTime);
            //     const checkInUTC = checkInDateObject.toISOString();
            //     attendance.checkIn = checkInUTC;
            // }

            // FIX: request.checkIn and request.checkOut are already full ISO timestamp strings
            // (e.g. "2026-03-04T08:30:00.000Z"). Do NOT re-combine them with formattedDate as if
            // they were bare HH:mm strings — that strips the PM half of the day and causes
            // checkout times like 17:45 (5:45 PM) to be interpreted as 05:45 AM, producing
            // an erroneous ~20-hour duration.
            // Use the ISO values directly, only normalising to proper ISO format.
            // NOTE: attendance.checkIn is now populated from the actual Attendance table record
            // (via actualCheckIn → rawCheckIn) so this gate correctly blocks requests where the
            // employee genuinely has no check-in at all.
            if (attendance.checkIn && attendance.checkIn !== "" && attendance.checkIn !== "-NA-") {
                const normalizedCheckIn = normalizeAttendanceRequestTime(attendance.checkIn, request.date);
                if (normalizedCheckIn) {
                    attendance.checkIn = normalizedCheckIn;
                } else {
                    throw new Error(`Unable to parse checkIn time: ${attendance.checkIn}`);
                }

                if (attendance.checkOut && attendance.checkOut !== "" && attendance.checkOut !== "-NA-") {
                    const normalizedCheckOut = normalizeAttendanceRequestTime(attendance.checkOut, request.date);
                    if (normalizedCheckOut) {
                        attendance.checkOut = normalizedCheckOut;
                    } else {
                        delete attendance.checkOut;
                    }
                } else {
                    delete attendance.checkOut;
                }

                await approveAttendanceRequest(attendance);
                successConfirmation(
                    request.status === 0 && !isHROrAdmin
                        ? 'Attendance request forwarded to HR for final approval.'
                        : 'Attendance request approved successfully'
                );

                setAttendanceActionId(request.id);
                fetchOpenRequests();
                refetch();
            } else {
                errorConfirmation('Cannot approve: employee has no check-in record for this day.');
            }
        } catch (error) {
            console.log("approveRequest error", error);
        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

        const rejectRequest = async (requestId: string) => {
            try {
                setLoading(true);
                setProcessingRowId(requestId);
                setProcessingAction('reject');
                const sure = await rejectConfirmation('Yes, reject it!')
                if (sure) {
                    await rejectAttendanceRequest(requestId, employeeIdCurrent); // Pass who rejected
                    successConfirmation('Attendance request rejected successfully');
                    setAttendanceActionId('');
                    fetchOpenRequests();
                    refetch();
                }

            } finally {
                setLoading(false);
                setProcessingRowId(null);
                setProcessingAction(null);
            }
        };

        const [lateCheckInThreshold, setLateCheckInThreshold] = useState('');
        const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');
        const [employeeThresholds, setEmployeeThresholds] = useState<any>([]);

        const [allEmployeeThresholds, setAllEmployeeThresholds] = useState<any>([]);
        // const [allLateCheckInThreshold, setAllLateCheckInThreshold] = useState('');
        // const [allEarlyCheckOutThreshold, setAllEarlyCheckOutThreshold] = useState('');


        // fetch grace based thresholds
        useEffect(() => {
            const initThresholds = async () => {
                if (!openRequests || openRequests.length === 0 || !allAttendanceRequests) {
                    console.error('No attendance data available yet');
                    // setThresholdsLoading(false);
                    return;
                }

                try {
                    // setThresholdsLoading(true);
                    const thresholds = await getGraceBasedThresholds(openRequests);
                    const allThresholds = await getGraceBasedThresholds(allAttendanceRequests);


                    if (thresholds) {
                        setEmployeeThresholds(thresholds.employeesWithThresholds);
                        setLateCheckInThreshold(thresholds.defaultThresholds.lateCheckInThreshold);
                        setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
                    } else {
                        console.log('No thresholds returned from getGraceBasedThresholds');
                    }

                    if (allThresholds) {
                        setAllEmployeeThresholds(allThresholds.employeesWithThresholds);
                        // setAllLateCheckInThreshold(allThresholds.defaultThresholds.lateCheckInThreshold);
                        // setAllEarlyCheckOutThreshold(allThresholds.defaultThresholds.earlyCheckOutThreshold);
                    } else {
                        console.log('No thresholds returned from getGraceBasedThresholds');
                    }
                } catch (error) {
                    console.error('Error fetching thresholds:', error);
                } finally {
                    // setThresholdsLoading(false);
                }
            };

            initThresholds();
        }, [openRequests, allAttendanceRequests])


        // Role-based filtering of open requests (status=0 only — HR sees their section separately):
        // HR/admin: see all status=0 (to supervise manager stage)
        // Reporting manager: see only their team's status=0 requests
        const visibleOpenRequests = openRequests.filter((req: IAttendanceRequests) => {
            if (req.status !== LeaveStatus.ApprovalPending) return false;
            if (isHROrAdmin) return true;
            return req.reportsToId === employeeIdCurrent;
        });

        // if employee working on weekend/holiday then no late marking and early check out marking
        const isWeekendOrHolidayDataWithAttendanceRequests = markWeekendOrHoliday(visibleOpenRequests, getAllWeekends, allHolidays);

        const allIsWeekendOrHolidayDataWithAttendanceRequests = markWeekendOrHoliday(allAttendanceRequests, getAllWeekends, allHolidays);

        const columns = [
            {
                accessorKey: "date",
                header: "Date",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "day",
                header: "Day",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "employeeName",
                header: "Employee Name",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "employeeCode",
                header: "Employee Code",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "remarks",
                header: "Remarks",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "status",
                header: "Status ",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => {
                    let statusText = '';
                    let backgroundColor = '';

                    switch (renderedCellValue) {
                        case LeaveStatus.ApprovalPending:
                            statusText = LEAVE_STATUS[0];
                            backgroundColor = '#FFA500';
                            break;
                        case LeaveStatus.Approved:
                            statusText = LEAVE_STATUS[1];
                            backgroundColor = '#28a745';
                            break;
                        case LeaveStatus.Rejected:
                            statusText = LEAVE_STATUS[2];
                            backgroundColor = '#dc3545';
                            break;
                        case LeaveStatus.PendingHR:
                            statusText = 'Pending HR';
                            backgroundColor = '#6366f1';
                            break;
                        default:
                            return renderedCellValue;
                    }

                    return (
                        <span
                            className="badge"
                            style={{
                                backgroundColor: backgroundColor,
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '11px',
                                padding: '5px 8px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                minWidth: '60px',
                                textAlign: 'center'
                            }}
                        >
                            {statusText}
                        </span>
                    );
                }
            },
            {
                accessorKey: "checkIn",
                header: "Check-In",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const employee = row.original;
                    const isWeekendOrHolidays = employee.isWeekendOrHoliday;
                    const checkIn = employee.checkIn;
                    const workingMethod = employee?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
                    const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";
                    if (!checkIn || checkIn === '-NA-' || !employeeThresholds) {
                        return <span>{checkIn || "N/A"}</span>;
                    }

                    const employeeData = employeeThresholds.find(
                        (emp: any) => emp.id === employee.id  // Changed from emp.employeeId === employee.employeeId
                    );
                    const employeeThreshold = employeeData?.lateCheckInThreshold;

                    // Parse times - handle both HH:mm and HH:mm:ss formats
                    const checkInTime = checkIn.includes(':') ? dayjs(checkIn, ['HH:mm', 'HH:mm:ss']) : null;
                    const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, 'HH:mm:ss') : null;
                    if (!thresholdTime) return <span>{checkIn || "N/A"}</span>;
                    if (!checkInTime || !thresholdTime) {
                        console.error('Could not parse times:', { checkIn, employeeThreshold });
                        return <span>{checkIn || "N/A"}</span>;
                    }

                    // Compare just the time portions using the 'minute' unit
                    const isLateCheckIn = checkInTime.isAfter(thresholdTime, 'minute');

                    // const finalCheckIn = convertTo12HourFormat(checkIn);
                    const finalCheckIn = showDateIn12HourFormat == true ? convertTo12HourFormat(checkIn) : checkIn;

                    return (
                        <span style={{
                            color: (((isWeekendOrHolidays || workingMethod == "onsite") && isOnSiteSettingsOn == "1")) ? 'green' : isLateCheckIn ? 'red' : 'green',
                        }}>
                            {finalCheckIn}
                        </span>
                    );
                },
            },
            {
                accessorKey: "checkOut",
                header: "Check-Out",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const employee = row.original;
                    const isWeekendOrHolidays = employee.isWeekendOrHoliday;
                    const checkOut = employee.checkOut;

                    if (!checkOut || checkOut === '-NA-' || !earlyCheckOutThreshold) {
                        // return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;
                        return <span>{checkOut || "N/A"}</span>;
                    }

                    const employeeData = employeeThresholds.find(
                        (emp: any) => emp.id === employee.id  // Changed from emp.employeeId === employee.employeeId
                    );
                    const employeeThreshold = employeeData?.earlyCheckOutThreshold;
                    const workingMethod = employee?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
                    const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";
                    const checkOutTime = checkOut.includes(':') ? dayjs(checkOut, ['HH:mm', 'HH:mm:ss']) : null;
                    const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, 'HH:mm:ss') : null;
                    if (!thresholdTime) return <span>{checkOut || "N/A"}</span>;
                    if (!checkOutTime || !thresholdTime) {
                        console.error('Could not parse times:', { checkOut, employeeThreshold });
                        // return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;
                        return <span>{checkOut || "N/A"}</span>;
                    }

                    const isEarlyCheckOut = checkOutTime.isBefore(thresholdTime, 'minute');
                    // const finalCheckOut = convertTo12HourFormat(checkOut);
                    const finalCheckOut = showDateIn12HourFormat == true ? convertTo12HourFormat(checkOut) : checkOut;

                    return (
                        <span style={{
                            color: (((isWeekendOrHolidays || workingMethod == "onsite") && isOnSiteSettingsOn == "1")) ? 'green' : isEarlyCheckOut ? 'red' : 'green',
                        }}>
                            {finalCheckOut}
                        </span>
                    );
                },
            },
            {
                accessorKey: "workingMethod",
                header: "Work",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const renderedCellValue = row.original.workingMethod;
                    const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

                    const colorMap: Record<string, string> = {
                        [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
                        [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
                        [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
                    };

                    const getIdentifier = (text: string, color: string) => (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: colorMap[renderedCellValue] || "#000"
                                }}
                            ></span>
                            {renderedCellValue}
                        </div>
                    );

                    switch (renderedCellValue) {
                        case OFFICE:
                            return getIdentifier('OFFICE', 'working-method-office');
                        case ON_SITE:
                            return getIdentifier('ON-SITE', 'working-method-on-site')
                        case REMOTE:
                            return getIdentifier('REMOTE', 'working-method-remote');
                        default:
                            return renderedCellValue;
                    }
                }
            },
            {
                accessorKey: "actions",
                header: "Actions",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const isReportingManagerForThis = row.original.reportsToId === employeeIdCurrent;

                    if (!isReportingManagerForThis) {
                        return (
                            <span style={{ fontSize: "11px", color: "#b45309", backgroundColor: "#fef3c7", padding: "3px 8px", borderRadius: "10px", fontWeight: 500 }}>
                                Awaiting Manager
                            </span>
                        );
                    }

                    return (
                        <>
                            <button
                                className='btn btn-icon btn-sm'
                                onClick={() => approveRequest(row.original)}
                                title="Approve"
                                disabled={loading || processingRowId === row.original.id}
                            >
                                {processingRowId === row.original.id && processingAction === 'approve' ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                    <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} />
                                )}
                            </button>

                            <button
                                className='btn btn-icon btn-sm'
                                onClick={() => rejectRequest(row.original.id)}
                                title="Reject"
                                disabled={loading || processingRowId === row.original.id}
                            >
                                {processingRowId === row.original.id && processingAction === 'reject' ? (
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                    <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} />
                                )}
                            </button>
                        </>
                    );
                }
            }

        ];

        const allColumns = [
            {
                accessorKey: "date",
                header: "Date",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "day",
                header: "Day",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "employeeName",
                header: "Employee Name",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "employeeCode",
                header: "Employee Code",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "remarks",
                header: "Remarks",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => renderedCellValue
            },
            {
                accessorKey: "status",
                header: "Status ",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => {
                    let statusText = '';
                    let backgroundColor = '';

                    switch (renderedCellValue) {
                        case LeaveStatus.ApprovalPending:
                            statusText = LEAVE_STATUS[0];
                            backgroundColor = '#FFA500';
                            break;
                        case LeaveStatus.Approved:
                            statusText = LEAVE_STATUS[1];
                            backgroundColor = '#28a745';
                            break;
                        case LeaveStatus.Rejected:
                            statusText = LEAVE_STATUS[2];
                            backgroundColor = '#dc3545';
                            break;
                        case LeaveStatus.PendingHR:
                            statusText = 'Pending HR';
                            backgroundColor = '#6366f1';
                            break;
                        default:
                            return renderedCellValue;
                    }

                    return (
                        <span
                            className="badge"
                            style={{
                                backgroundColor: backgroundColor,
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '11px',
                                padding: '5px 8px',
                                borderRadius: '12px',
                                display: 'inline-block',
                                minWidth: '60px',
                                textAlign: 'center'
                            }}
                        >
                            {statusText}
                        </span>
                    );
                }
            },
            {
                accessorKey: "checkIn",
                header: "Check-In",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const employee = row.original;
                    const isWeekendOrHoliday = employee.isWeekendOrHoliday;
                    const checkIn = employee.checkIn;

                    if (!checkIn || checkIn === '-NA-' || !allEmployeeThresholds) {
                        return <span>{checkIn || "N/A"}</span>;
                    }

                    const employeeData = allEmployeeThresholds.find(
                        (emp: any) => emp.id === employee.id  // Changed from emp.employeeId === employee.employeeId
                    );
                    const employeeThreshold = employeeData?.lateCheckInThreshold;
                    const workingMethod = employee?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
                    const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";

                    // Parse times - handle both HH:mm and HH:mm:ss formats
                    const checkInTime = checkIn.includes(':') ? dayjs(checkIn, ['HH:mm', 'HH:mm:ss']) : null;
                    const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, 'HH:mm:ss') : null;
                    if (!thresholdTime) return <span>{checkIn || "N/A"}</span>;
                    if (!checkInTime || !thresholdTime) {
                        console.error('Could not parse times:', { checkIn, employeeThreshold });
                        return <span>{checkIn || "N/A"}</span>;
                    }

                    // Compare just the time portions using the 'minute' unit
                    const isLateCheckIn = checkInTime.isAfter(thresholdTime, 'minute');
                    // const finalCheckIn = convertTo12HourFormat(checkIn);
                    const finalCheckIn = showDateIn12HourFormat == true ? convertTo12HourFormat(checkIn) : checkIn;

                    return (
                        <span style={{
                            color: (((isWeekendOrHoliday || workingMethod == "onsite") && isOnSiteSettingsOn == "1")) ? 'green' : isLateCheckIn ? 'red' : 'green',
                        }}>
                            {finalCheckIn}
                        </span>
                    );
                },
            },
            {
                accessorKey: "checkOut",
                header: "Check-Out",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const checkOut = row.original.checkOut;
                    const isWeekendOrHolidays = row.original.isWeekendOrHoliday;
                    const workingMethod = row.original?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
                    const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";

                    if (!checkOut || checkOut === '-NA-' || !earlyCheckOutThreshold) {
                        // return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;
                        return <span>{checkOut || "N/A"}</span>;
                    }

                    // Compare times in 24-hour format add seconds to checkOutTime
                    const checkOutTime = dayjs(checkOut, "HH:mm").add(0, 'second');
                    const thresholdTime = dayjs(earlyCheckOutThreshold, "HH:mm:ss");
                    const isEarlyCheckOut = checkOutTime.isBefore(thresholdTime);

                    // const finalCheckOut = convertTo12HourFormat(checkOut);
                    const finalCheckOut = showDateIn12HourFormat == true ? convertTo12HourFormat(checkOut) : checkOut;

                    return (
                        <span style={{
                            color: (((isWeekendOrHolidays || workingMethod == "onsite") && isOnSiteSettingsOn == "1")) ? 'green' : isEarlyCheckOut ? 'red' : 'green',
                        }}>
                            {finalCheckOut}
                        </span>
                    );
                },
            },
            {
                accessorKey: "workingMethod",
                header: "Work",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const renderedCellValue = row.original.workingMethod;
                    const { OFFICE, ON_SITE, REMOTE } = WORKING_METHOD_TYPE;

                    const colorMap: Record<string, string> = {
                        [OFFICE]: worktypeColorValues?.officeColor || "#3498db",
                        [ON_SITE]: worktypeColorValues?.onSiteColor || "#e74c3c",
                        [REMOTE]: worktypeColorValues?.remoteColor || "#2ecc71",
                    };

                    const getIdentifier = (text: string, color: string) => (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                                style={{
                                    width: "12px",
                                    height: "12px",
                                    borderRadius: "50%",
                                    backgroundColor: colorMap[renderedCellValue] || "#000"
                                }}
                            ></span>
                            {renderedCellValue}
                        </div>
                    );

                    switch (renderedCellValue) {
                        case OFFICE:
                            return getIdentifier('OFFICE', 'working-method-office');
                        case ON_SITE:
                            return getIdentifier('ON-SITE', 'working-method-on-site')
                        case REMOTE:
                            return getIdentifier('REMOTE', 'working-method-remote');
                        default:
                            return renderedCellValue;
                    }
                }
            },
            {
                accessorKey: "approvedById",
                header: "Approved By ",
                size: 120,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => allEmployees?.find((emp: any) => emp.employeeId === renderedCellValue)?.employeeName || '-NA-'
            },
            {
                accessorKey: "rejectedById",
                header: "Rejected By ",
                size: 120,
                minSize: 100,
                maxSize: 150,
                Cell: ({ renderedCellValue }: any) => allEmployees?.find((emp: any) => emp.employeeId === renderedCellValue)?.employeeName || '-NA-'
            },
            {
                accessorKey: "approvedOrRejectedDate",
                header: "Last Updated",
                size: 150,
                minSize: 120,
                maxSize: 180,
                Cell: ({ renderedCellValue }: any) => renderedCellValue ? dayjs(renderedCellValue).format('DD MMM YYYY hh:mm A') : '-NA-'
            },
            {
                accessorKey: "action",
                header: "Actions",
                size: 100,
                minSize: 100,
                maxSize: 150,
                Cell: ({ row }: any) => {
                    const permission =
                        // hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOwn, row.original) ||
                        hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOthers, row.original);
                    return (
                        <>
                            {permission ? (
                                <button
                                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                    onClick={() => raiseRequest(row?.original)}
                                >
                                    <KTIcon iconName="pencil" className="fs-3" />
                                </button>
                            ) : 'Not Allowed'}
                        </>
                    );
                },
            }];


        const raiseRequest = (attendanceRequest: IAttendanceRequests) => {
            setOpenAttendanceRequestModal(true);
            setSelectedAttendanceRequest(attendanceRequest);
        }


        // Show loader only on initial page load
        if (initialLoading || openRequestsLoading) {
            return (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                    <Loader />
                </div>
            );
        }

        return (
            <>
                <h3 className='pt-10 fw-bold'>Open Attendance Requests</h3>
                <MaterialTable
                    resource={resourceNameMapWithCamelCase.attendanceRequest}
                    viewOwn={true}
                    viewOthers={true}
                    columns={columns}
                    data={isWeekendOrHolidayDataWithAttendanceRequests}
                    tableName="Open Attendance Requests"
                    employeeId={employeeIdCurrent}
                    hidePagination={true}
                />

                <h3 className='pt-10 fw-bold'>All Attendance Requests</h3>
                <MaterialTable
                    resource={resourceNameMapWithCamelCase.attendanceRequest}
                    viewOwn={true}
                    viewOthers={true}
                    columns={allColumns}
                    data={allIsWeekendOrHolidayDataWithAttendanceRequests}
                    tableName="All Attendance Requests"
                    employeeId={employeeIdCurrent}
                    manualPagination={true}
                    rowCount={allTotalRecords}
                    onPaginationChange={setAllPagination}
                    paginationState={allPagination}
                    isLoading={dataLoading}
                />


                {openAttendanceRequestModal && (
                    <EditAttendanceRequest
                        show={openAttendanceRequestModal}
                        onHide={() => {
                            setOpenAttendanceRequestModal(false);
                            // setSelectedAttendanceRequest(null);
                        }}
                        selectedAttendanceRequest={selectedAttendanceRequest}
                    />
                )}
            </>
        );
    }

    export default OpenAttendanceRequests;
