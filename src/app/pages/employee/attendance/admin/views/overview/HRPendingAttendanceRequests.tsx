/**
 * HRPendingAttendanceRequests
 * Shown only to HR/admin users (gated in OverviewView.tsx).
 * Displays all attendance requests at status=4 (PendingHR) — manager approved, awaiting HR final sign-off.
 */
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import { LeaveStatus } from "@constants/attendance";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { KTIcon } from "@metronic/helpers";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { WtIconButton, Spinner, TRIO } from "@app/modules/common/components/ui/tw";
import { ToneChip } from "@app/modules/common/components/ui";
import { Badge } from "@/ds/ui/badge";
import { IAttendanceRequests } from "@models/employee";
import { RootState } from "@redux/store";
import { fetchCompanyOverview } from "@services/company";
import { approveAttendanceRequest, getPendingAttendanceRequests, rejectAttendanceRequest } from "@services/employee";
import { transformAttendanceRequest } from "@utils/statistics";
import { rejectConfirmation, successConfirmation, errorConfirmation } from "@utils/modal";
import { normalizeAttendanceRequestTime } from "./OpenAttendanceRequests";
import { MUMBAI_TZ } from "@utils/date";
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
                const employeeTimezone = request.employeeTimezone || MUMBAI_TZ;
                const normalizedCheckIn = normalizeAttendanceRequestTime(attendance.checkIn, request.date, employeeTimezone);
                if (normalizedCheckIn) attendance.checkIn = normalizedCheckIn;

                if (attendance.checkOut && attendance.checkOut !== '' && attendance.checkOut !== '-NA-') {
                    const normalizedCheckOut = normalizeAttendanceRequestTime(attendance.checkOut, request.date, employeeTimezone);
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
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'employeeName',
            header: 'Employee',
            size: 130,
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'employeeCode',
            header: 'Emp Code',
            size: 100,
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'checkIn',
            header: 'Check-In',
            size: 100,
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'checkOut',
            header: 'Check-Out',
            size: 100,
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'remarks',
            header: 'Remarks',
            // Matches OpenAttendanceRequests — enough width for the uppercase heading
            // plus the sort icon on one line.
            size: 150,
            minSize: 140,
            cell: ({ cell }: any) => cell.getValue(),
        },
        {
            accessorKey: 'status',
            header: 'Stage',
            size: 170,
            cell: () => (
                <ToneChip dense tone="warning" label="⏳ Pending HR Approval" />
            ),
        },
        {
            accessorKey: 'actions',
            header: 'HR Action',
            size: 110,
            cell: ({ row }: any) => (
                <>
                    <WtIconButton
                        color={TRIO.green.c}
                        title="HR Final Approve"
                        disabled={loading || processingRowId === row.original.id}
                        onClick={() => approveAsHR(row.original)}
                        size={34}
                    >
                        {processingRowId === row.original.id && processingAction === 'approve'
                            ? <Spinner size={14} color={TRIO.green.c} />
                            : <KTIcon iconName="check" className="fs-4" />
                        }
                    </WtIconButton>
                    <WtIconButton
                        color={TRIO.rose.c}
                        title="HR Reject"
                        disabled={loading || processingRowId === row.original.id}
                        onClick={() => rejectAsHR(row.original.id)}
                        size={34}
                    >
                        {processingRowId === row.original.id && processingAction === 'reject'
                            ? <Spinner size={14} color={TRIO.rose.c} />
                            : <KTIcon iconName="cross" className="fs-4" />
                        }
                    </WtIconButton>
                </>
            ),
        },
    ];

    if (requests.length === 0) return null;

    return (
        <>
            <h3 className="pt-8 fw-bold">
                Pending HR Approval
                <Badge variant="warning-solid" className="ms-2 align-middle">
                    {requests.length}
                </Badge>
            </h3>
            <p className="text-muted fs-7 mb-4">
                These attendance requests cleared manager review and require your final sign-off.
            </p>
            <DataTable
                caption="HR Pending Attendance Approvals"
                data={requests}
                columns={columns}
                getRowId={(r: any) => String(r.id)}
                stateKey="attendance.hrPendingAttendance"
                groupableColumns={false}
                searchPlaceholder="Search attendance requests…"
            />
        </>
    );
}

export default HRPendingAttendanceRequests;
