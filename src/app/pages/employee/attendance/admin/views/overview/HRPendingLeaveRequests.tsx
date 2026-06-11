/**
 * HRPendingLeaveRequests
 * Shown only to HR/admin users (gated in OverviewView.tsx).
 * Displays all leaves at status=4 (PendingHR) — Team Lead approved, awaiting HR final sign-off.
 */
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LeaveStatus } from "@constants/attendance";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { formatDateFromISTString } from "@utils/statistics";
import { toAbsoluteUrl } from "@metronic/helpers";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { RootState } from "@redux/store";
import { fetchLeaveRequest, updateLeaveStatus } from "@services/employee";
import { rejectConfirmation, successConfirmation, errorConfirmation } from "@utils/modal";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchColorAndStoreInSlice } from "@utils/file";

function HRPendingLeaveRequests() {
    const dispatch = useDispatch();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);

    const [loading, setLoading] = useState(false);
    const [processingRowId, setProcessingRowId] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
    const [leaveActionId, setLeaveActionId] = useState("");

    // Only show leaves waiting for HR final approval
    const hrPendingLeaves = useSelector((state: RootState) =>
        state.attendance.leaveRequests.filter((el: any) => el.status === LeaveStatus.PendingHR)
    );

    const getLeaveTypeColor = (leaveType: string): string => {
        if (!leaveTypeColors) return '#3498DB';
        const n = (leaveType || '').toLowerCase();
        if (n.includes('sick'))     return leaveTypeColors.sickLeaveColor    || '#E74C3C';
        if (n.includes('casual'))   return leaveTypeColors.casualLeaveColor  || '#3498DB';
        if (n.includes('annual'))   return leaveTypeColors.annualLeaveColor  || '#2ECC71';
        if (n.includes('maternal') || n.includes('maternity')) return leaveTypeColors.maternalLeaveColor || '#9B59B6';
        if (n.includes('floater'))  return leaveTypeColors.floaterLeaveColor || '#F39C12';
        if (n.includes('unpaid'))   return leaveTypeColors.unpaidLeaveColor  || '#95A5A6';
        return '#3498DB';
    };

    const refreshLeaves = async () => {
        const { data: { leaveRequest } } = await fetchLeaveRequest();
        dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
    };

    const approveAsHR = async (leave: any) => {
        try {
            setLoading(true);
            setProcessingRowId(leave.id);
            setProcessingAction('approve');
            await updateLeaveStatus({
                id: leave.id,
                status: LeaveStatus.Approved,
                approvedById: employeeIdCurrent,
            });
            successConfirmation('Leave fully approved — HR sign-off complete.');
            setLeaveActionId(leave.id);
            await refreshLeaves();
        } catch (err) {
            console.error('HR approve error:', err);
            errorConfirmation('Failed to approve leave. Please try again.');
        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

    const rejectAsHR = async (leaveId: string) => {
        try {
            setLoading(true);
            setProcessingRowId(leaveId);
            setProcessingAction('reject');
            const sure = await rejectConfirmation('Yes, reject it!');
            if (sure) {
                await updateLeaveStatus({
                    id: leaveId,
                    status: LeaveStatus.Rejected,
                    rejectedById: employeeIdCurrent,
                });
                successConfirmation('Leave rejected by HR.');
                setLeaveActionId(leaveId);
                await refreshLeaves();
            }
        } catch (err) {
            console.error('HR reject error:', err);
            errorConfirmation('Failed to reject leave. Please try again.');
        } finally {
            setLoading(false);
            setProcessingRowId(null);
            setProcessingAction(null);
        }
    };

    const columns = [
        {
            accessorKey: "createdDate",
            header: "Submitted",
            size: 100,
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue),
        },
        {
            accessorKey: "date",
            header: "Leave Date",
            size: 120,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: "name",
            header: "Employee",
            size: 130,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: "code",
            header: "Emp Code",
            size: 100,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: "type",
            header: "Leave Type",
            size: 130,
            Cell: ({ renderedCellValue }: any) => (
                <span
                    className="badge"
                    style={{
                        backgroundColor: getLeaveTypeColor(renderedCellValue),
                        color: 'white',
                        fontWeight: '500',
                        fontSize: '11px',
                        padding: '5px 8px',
                        borderRadius: '12px',
                        display: 'inline-block',
                        minWidth: '70px',
                        textAlign: 'center',
                    }}
                >
                    {renderedCellValue}
                </span>
            ),
        },
        {
            accessorKey: "remark",
            header: "Reason",
            size: 130,
            Cell: ({ renderedCellValue }: any) => renderedCellValue,
        },
        {
            accessorKey: "status",
            header: "Stage",
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
            accessorKey: "actions",
            header: "HR Action",
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

    useEffect(() => {
        fetchColorAndStoreInSlice();
    }, []);

    useEffect(() => {
        refreshLeaves();
    }, [leaveActionId]);

    if (hrPendingLeaves.length === 0) return null;

    return (
        <>
            <h3 className="pt-8 fw-bold">
                Pending HR Approval
                <span
                    className="badge ms-2 fs-7"
                    style={{ backgroundColor: '#F39C12', color: 'white' }}
                >
                    {hrPendingLeaves.length}
                </span>
            </h3>
            <p className="text-muted fs-7 mb-4">
                These requests cleared Team Lead review and require your final sign-off.
            </p>
            <MaterialTable
                data={hrPendingLeaves}
                columns={columns}
                hideFilters={false}
                tableName="HR Pending Approvals"
                resource={resourceNameMapWithCamelCase.leave}
                viewOthers={true}
                viewOwn={false}
                employeeId={employeeIdCurrent}
            />
        </>
    );
}

export default HRPendingLeaveRequests;
