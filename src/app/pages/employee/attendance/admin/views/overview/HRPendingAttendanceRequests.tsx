/**
 * HRPendingAttendanceRequests
 * Shown only to HR/admin users (gated in OverviewView.tsx).
 * Displays all attendance requests at status=4 (PendingHR) — manager approved, awaiting HR final sign-off.
 */
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LeaveStatus } from "@constants/attendance";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { toAbsoluteUrl } from "@metronic/helpers";
import { IAttendanceRequests } from "@models/employee";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { approveAttendanceRequest, getPendingAttendanceRequests, rejectAttendanceRequest } from "@services/employee";
import { transformAttendanceRequest } from "@utils/statistics";
import { rejectConfirmation, successConfirmation, errorConfirmation } from "@utils/modal";
import { normalizeAttendanceRequestTime } from "./OpenAttendanceRequests";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

function HRPendingAttendanceRequests() {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

    const [requests, setRequests] = useState<IAttendanceRequests[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

    const fetchRequests = useCallback(async () => {
        try {
            const { data: { companyOverview } } = await fetchCompanyOverview();
            const companyId = companyOverview[0].id;
            const { data: { attendanceRequests } } = await getPendingAttendanceRequests(companyId);
            const transformed = transformAttendanceRequest(attendanceRequests);
            setRequests(transformed.filter((r) => r.status === LeaveStatus.PendingHR));
        } catch (err) {
            console.error('Error fetching HR pending attendance requests:', err);
            setRequests([]);
        }
    }, []);

    useEffect(() => { fetchRequests(); }, [fetchRequests]);
    useEventBus(EVENT_KEYS.attendanceRequestUpdated, fetchRequests);

    const approveAsHR = async (request: IAttendanceRequests) => {
        try {
            setLoading(true);
            setProcessingRowId(request.id!);
            setProcessingAction('approve');

            const attendance: any = {
                requestId: request.id,
                employeeId: request.employeeId,
                checkIn: request.rawCheckIn || request.checkIn,
                checkOut: request.rawCheckOut || request.checkOut,
                latitude: request.latitude,
                longitude: request.longitude,
                remarks: request.remarks,
                workingMethodId: request.workingMethodId,
                approvedById: employeeIdCurrent,
            };

            if (attendance.checkIn && attendance.checkIn !== '' && attendance.checkIn !== '-NA-') {
                const normalizedCheckIn = normalizeAttendanceRequestTime(attendance.checkIn, request.date);
                if (normalizedCheckIn) attendance.checkIn = normalizedCheckIn;

                if (attendance.checkOut && attendance.checkOut !== '' && attendance.checkOut !== '-NA-') {
                    const normalizedCheckOut = normalizeAttendanceRequestTime(attendance.checkOut, request.date);
                    if (normalizedCheckOut) attendance.checkOut = normalizedCheckOut;
                    else delete attendance.checkOut;
                } else {
                    delete attendance.checkOut;
                }

                await approveAttendanceRequest(attendance);
                successConfirmation('Attendance request fully approved — HR sign-off complete.');
                await fetchRequests();
            } else {
                errorConfirmation('Cannot approve: no check-in record found for this day.');
            }
        } catch (err) {
            console.error('HR approve attendance error:', err);
            errorConfirmation('Failed to approve attendance request. Please try again.');
        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

    const rejectAsHR = async (requestId: string) => {
        try {
            setLoading(true);
            setProcessingRowId(requestId);
            setProcessingAction('reject');
            const sure = await rejectConfirmation('Yes, reject it!');
            if (sure) {
                await rejectAttendanceRequest(requestId, employeeIdCurrent);
                successConfirmation('Attendance request rejected by HR.');
                await fetchRequests();
            }
        } catch (err) {
            console.error('HR reject attendance error:', err);
            errorConfirmation('Failed to reject attendance request. Please try again.');
        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

    const columns = [
        {
            accessorKey: 'date',
            header: 'Date',
            size: 110,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'employeeName',
            header: 'Employee',
            size: 130,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'employeeCode',
            header: 'Emp Code',
            size: 100,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'checkIn',
            header: 'Check-In',
            size: 100,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'checkOut',
            header: 'Check-Out',
            size: 100,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'remarks',
            header: 'Remarks',
            size: 130,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: 'status',
            header: 'Stage',
            size: 170,
            Cell: () => (
                <span
                    className="badge"
                    style={{
                        backgroundColor: '#F39C12',
                        color: 'white',
                        fontSize: '11px',
                        padding: '5px 10px',
                        borderRadius: '12px',
                    }}
                >
                    ⏳ Pending HR Approval
                </span>
            ),
        },
        {
            accessorKey: 'actions',
            header: 'HR Action',
            size: 110,
            Cell: ({ row }: any) => (
                <>
                    <button
                        className="btn btn-icon btn-sm"
                        title="HR Final Approve"
                        disabled={loading || processingRowId === row.original.id}
                        onClick={() => approveAsHR(row.original)}
                    >
                        {processingRowId === row.original.id && processingAction === 'approve'
                            ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            : <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt="approve" />
                        }
                    </button>
                    <button
                        className="btn btn-icon btn-sm"
                        title="HR Reject"
                        disabled={loading || processingRowId === row.original.id}
                        onClick={() => rejectAsHR(row.original.id)}
                    >
                        {processingRowId === row.original.id && processingAction === 'reject'
                            ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                            : <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt="reject" />
                        }
                    </button>
                </>
            ),
        },
    ];

    if (requests.length === 0) return null;

    return (
        <>
            <h3 className="pt-8 fw-bold">
                Pending HR Approval
                <span
                    className="badge ms-2 fs-7"
                    style={{ backgroundColor: '#F39C12', color: 'white' }}
                >
                    {requests.length}
                </span>
            </h3>
            <p className="text-muted fs-7 mb-4">
                These attendance requests cleared manager review and require your final sign-off.
            </p>
            <MaterialTable
                data={requests}
                columns={columns}
                hideFilters={false}
                tableName="HR Pending Attendance Approvals"
                resource={resourceNameMapWithCamelCase.attendanceRequest}
                viewOthers={true}
                viewOwn={false}
                employeeId={employeeIdCurrent}
            />
        </>
    );
}

export default HRPendingAttendanceRequests;
