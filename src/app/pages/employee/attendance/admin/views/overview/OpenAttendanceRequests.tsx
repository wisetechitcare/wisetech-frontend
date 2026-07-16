import { safeJsonParse } from '@utils/safeJson';
import { resolveActiveOrgId } from '@utils/activeOrg';
import MaterialTable from "@app/modules/common/components/MaterialTable";
import Loader from "@app/modules/common/utils/Loader";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";
import { fetchApprovalInstanceByRequest } from "@services/employee";
import { Modal } from "react-bootstrap";
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

                if (!name) return <span className='text-muted fs-7'>-NA-</span>;

                return (
                    <div className='d-flex align-items-center gap-2'>
                        <div className='symbol symbol-30px'>
                            <span className={`symbol-label fw-bold fs-7 ${isApproved ? 'bg-light-success text-success' : 'bg-light-danger text-danger'}`}>
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className='d-flex flex-column'>
                            <span className='text-dark fw-semibold fs-7'>{name}</span>
                            {date && <span className='text-muted fs-8'>{date}</span>}
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
                    <div className='d-flex align-items-center gap-1'>
                        {permission && (
                            <button
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                onClick={() => raiseRequest(row?.original)}
                            >
                                <KTIcon iconName="pencil" className="fs-3" />
                            </button>
                        )}
                        {isPending && row.original.hasApprovalInstance && (
                            <button
                                className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
                                title="Track Approval"
                                onClick={() => openTracker(row.original.id)}
                            >
                                <KTIcon iconName="map" className="fs-3" />
                            </button>
                        )}
                        {!permission && !isPending && 'Not Allowed'}
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
                    }}
                    selectedAttendanceRequest={selectedAttendanceRequest}
                />
            )}

            <Modal
                show={!!trackingRequestId}
                onHide={() => { setTrackingRequestId(null); setTrackInstanceId(null); }}
                centered
                size='lg'
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontSize: 16, fontWeight: 700 }}>Approval Status</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '20px 24px' }}>
                    {trackInstanceLoading ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <span className='spinner-border spinner-border-sm text-primary me-2' />
                            <span style={{ fontSize: 13, color: '#a1a5b7' }}>Loading approval status...</span>
                        </div>
                    ) : trackInstanceId ? (
                        <ApprovalStatusTracker instanceId={trackInstanceId} showAuditLog />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <KTIcon iconName='information' className='fs-3x text-muted mb-3' />
                            <div style={{ fontSize: 13, color: '#a1a5b7' }}>No approval workflow found for this request.</div>
                        </div>
                    )}
                </Modal.Body>
            </Modal>
        </>
    );
}

export default OpenAttendanceRequests;
