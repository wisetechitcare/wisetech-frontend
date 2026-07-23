import { safeJsonParse } from '@utils/safeJson';
import { resolveActiveOrgId } from '@utils/activeOrg';
import MaterialTable from "@app/modules/common/components/MaterialTable";
import Loader from "@app/modules/common/utils/Loader";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";
import { fetchApprovalInstanceByRequest } from "@services/employee";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassDialog, GlassHeader, WtIconButton, StatusBadge, IconBox, TRIO, type Trio, Spinner } from "@app/modules/common/components/ui/tw";
import { LEAVE_STATUS, LeaveStatus, WORKING_METHOD_TYPE } from "@constants/attendance";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { KTIcon } from "@metronic/helpers";
import { IAttendanceRequests } from "@models/employee";
import { RootState } from "@redux/store";
import { fetchCompanyOverview, fetchConfiguration } from "@services/company";
import { getAllAttendanceRequestByCompanyId } from "@services/employee";
import { hasPermission } from "@utils/authAbac";
import { getGraceBasedThresholds } from "@utils/getGraceBasedThresholds";
import { markWeekendOrHoliday, transformAttendanceRequest } from "@utils/statistics";
import { convertTo12HourFormat, MUMBAI_TZ } from "@utils/date";
import dayjs from "dayjs";
import dayjsTimezone from "dayjs/plugin/timezone";
import dayjsUTC from "dayjs/plugin/utc";
dayjs.extend(dayjsUTC);
dayjs.extend(dayjsTimezone);

export const normalizeAttendanceRequestTime = (value: string | undefined, dateStr: string, timezone: string = MUMBAI_TZ): string | undefined => {
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
        const candidate = dayjs.tz(`${formattedDate} ${value}`, fmt, timezone);
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
import { useTeamFilter } from '@/contexts/TeamFilterContext';
import { pageSize, useServerPagination } from "@hooks/useServerPagination";
import EditAttendanceRequest from "./EditAttendanceRequest";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

const OpenAttendanceRequests = () => {
    const { filterIds } = useTeamFilter();
    const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation)
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);

    const [leaveConfiguration, setLeaveConfiguration] = useState<any>()
    const [openAttendanceRequestModal, setOpenAttendanceRequestModal] = useState(false);
    const [trackingRequestId, setTrackingRequestId] = useState<string | null>(null);
    const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
    const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);

    const openTracker = async (requestId: string) => {
        setTrackingRequestId(requestId);
        setTrackInstanceId(null);
        setTrackInstanceLoading(true);
        try {
            const res = await fetchApprovalInstanceByRequest('AttendanceRequests', requestId);
            const instance = res?.data ?? res;
            setTrackInstanceId(instance?.id ?? null);
        } catch {
            setTrackInstanceId(null);
        } finally {
            setTrackInstanceLoading(false);
        }
    };
    const [selectedAttendanceRequest, setSelectedAttendanceRequest] = useState<IAttendanceRequests>();

    const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
    const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);

    // Fetch function for all attendance requests
    const fetchAllAttendanceRequests = useCallback(async (page: number, limit: number) => {
        const { data: { companyOverview } } = await fetchCompanyOverview();
        const companyId = (resolveActiveOrgId(companyOverview) ?? '');

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

    useEventBus(EVENT_KEYS.attendanceRequestUpdated, (data) => {
        refetch();
    });

    useEffect(() => {
        async function fetchLeaveConfig() {
            const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
            const jsonObject = safeJsonParse(configuration?.configuration?.configuration);

            setLeaveConfiguration(jsonObject);
        }
        fetchLeaveConfig();
    }, []);

    const [allEmployeeThresholds, setAllEmployeeThresholds] = useState<any>([]);

    // fetch grace based thresholds
    useEffect(() => {
        const initThresholds = async () => {
            if (!allAttendanceRequests || allAttendanceRequests.length === 0) return;
            try {
                const allThresholds = await getGraceBasedThresholds(allAttendanceRequests);
                if (allThresholds) {
                    setAllEmployeeThresholds(allThresholds.employeesWithThresholds);
                }
            } catch (error) {
                console.error('Error fetching thresholds:', error);
            }
        };
        initThresholds();
    }, [allAttendanceRequests]);

    // if employee working on weekend/holiday then no late marking and early check out marking
    const rawAttendanceData = markWeekendOrHoliday(allAttendanceRequests, getAllWeekends, allHolidays);
    const allIsWeekendOrHolidayDataWithAttendanceRequests = filterIds
        ? rawAttendanceData.filter((r: any) => filterIds.includes(r.employeeId))
        : rawAttendanceData;

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
                let trio: Trio;

                switch (renderedCellValue) {
                    case LeaveStatus.ApprovalPending:
                        statusText = LEAVE_STATUS[0]; trio = TRIO.amber; break;
                    case LeaveStatus.Approved:
                        statusText = LEAVE_STATUS[1]; trio = TRIO.green; break;
                    case LeaveStatus.Rejected:
                        statusText = LEAVE_STATUS[2]; trio = TRIO.rose; break;
                    case LeaveStatus.PendingHR:
                        statusText = 'Pending HR'; trio = TRIO.blue; break;
                    default:
                        return renderedCellValue;
                }

                return <StatusBadge trio={trio} label={statusText} pulse={renderedCellValue === LeaveStatus.ApprovalPending} />;
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
                    (emp: any) => emp.id === employee.id
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

                if (!checkOut || checkOut === '-NA-' || !allEmployeeThresholds) {
                    return <span>{checkOut || "N/A"}</span>;
                }

                const employeeData = allEmployeeThresholds.find(
                    (emp: any) => emp.id === row.original.id
                );
                const employeeThreshold = employeeData?.earlyCheckOutThreshold;

                // Compare times in 24-hour format add seconds to checkOutTime
                const checkOutTime = dayjs(checkOut, "HH:mm").add(0, 'second');
                const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, "HH:mm:ss") : null;
                if (!thresholdTime) return <span>{checkOut || "N/A"}</span>;
                const isEarlyCheckOut = checkOutTime.isBefore(thresholdTime);

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
            header: "Approved / Rejected By",
            size: 180,
            minSize: 150,
            maxSize: 220,
            Cell: ({ row }: any) => {
                const { status, approvedById, rejectedById } = row.original;
                const isApproved = status === LeaveStatus.Approved;
                const isRejected = status === LeaveStatus.Rejected;
                const actorId = isApproved ? approvedById : isRejected ? rejectedById : null;
                const name = actorId ? allEmployees?.find((emp: any) => emp.employeeId === actorId)?.employeeName : null;
                const date = row.original.approvedOrRejectedDate
                    ? dayjs(row.original.approvedOrRejectedDate).format('DD MMM YYYY hh:mm A')
                    : null;

                if (!name) return <span className="text-slate-400 text-[12.5px]">-NA-</span>;

                const trio: Trio = isApproved ? TRIO.green : TRIO.rose;
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="w-[30px] h-[30px] rounded-lg shrink-0 grid place-items-center font-extrabold text-[12.5px]"
                            style={{ color: trio.c, backgroundColor: trio.bg, borderColor: trio.bd, borderWidth: 1, borderStyle: 'solid' }}
                        >
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-slate-900 font-semibold text-[12.5px] leading-[1.3]">{name}</span>
                            {date && <span className="text-slate-500 text-[11px]">{date}</span>}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "action",
            header: "Actions",
            size: 120,
            minSize: 100,
            maxSize: 160,
            Cell: ({ row }: any) => {
                const isPending = row.original.status === LeaveStatus.ApprovalPending;
                const permission = hasPermission(resourceNameMapWithCamelCase.attendanceRequest, permissionConstToUseWithHasPermission.editOthers, row.original);
                return (
                    <div className="flex items-center gap-1.5">
                        {permission && (
                            <WtIconButton title="Edit" color={TRIO.blue.c} onClick={() => raiseRequest(row?.original)} size={34}>
                                <KTIcon iconName="pencil" className="fs-4" />
                            </WtIconButton>
                        )}
                        {isPending && row.original.hasApprovalInstance && (
                            <WtIconButton title="Track Approval" color={TRIO.cyan.c} onClick={() => openTracker(row.original.id)} size={34}>
                                <KTIcon iconName="map" className="fs-4" />
                            </WtIconButton>
                        )}
                        {!permission && !isPending && <span className="text-slate-400 text-[12px]">Not Allowed</span>}
                    </div>
                );
            },
        }];


    const raiseRequest = (attendanceRequest: IAttendanceRequests) => {
        setOpenAttendanceRequestModal(true);
        setSelectedAttendanceRequest(attendanceRequest);
    }


    // Show loader only on initial page load
    if (initialLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Loader />
            </div>
        );
    }

    return (
        <>
            <div className="pt-8 mb-2.5 flex items-center gap-3">
                <IconBox icon="time" trio={TRIO.blue} size={44} fs="fs-1" />
                <span className="font-bold text-[20px] text-slate-900">All Attendance Requests</span>
            </div>
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
                    }}
                    selectedAttendanceRequest={selectedAttendanceRequest}
                />
            )}

            <GlassDialog
                open={!!trackingRequestId}
                onClose={() => { setTrackingRequestId(null); setTrackInstanceId(null); }}
                maxWidth="md"
                fullWidth
            >
                <GlassHeader
                    title="Approval Status"
                    icon={<KTIcon iconName="map" className="fs-1 text-white" />}
                    onClose={() => { setTrackingRequestId(null); setTrackInstanceId(null); }}
                />
                <div className="p-4 sm:p-6">
                    {trackInstanceLoading ? (
                        <div className="text-center py-5 flex items-center justify-center gap-2">
                            <Spinner size={16} />
                            <p className="text-[13px] text-slate-500 m-0">Loading approval status…</p>
                        </div>
                    ) : trackInstanceId ? (
                        <ApprovalStatusTracker instanceId={trackInstanceId} showAuditLog />
                    ) : (
                        <div className="text-center py-5">
                            <KTIcon iconName='information' className='fs-3x text-muted mb-3' />
                            <p className="text-[13px] text-slate-500 m-0">No approval workflow found for this request.</p>
                        </div>
                    )}
                </div>
            </GlassDialog>
        </>
    );
}

export default OpenAttendanceRequests;
