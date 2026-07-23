/**
 * HRPendingLeaveRequests
 * Shown only to HR/admin users (gated in OverviewView.tsx).
 * Displays all leaves at status=4 (PendingHR) — Team Lead approved, awaiting HR final sign-off.
 */
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { LeaveStatus } from "@constants/attendance";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { formatDateFromISTString } from "@utils/statistics";
import { KTIcon } from "@metronic/helpers";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { WtIconButton, StatusBadge, IconBox, Spinner, TRIO } from "@app/modules/common/components/ui/tw";
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
            Cell: ({ renderedCellValue }: any) => {
                const c = getLeaveTypeColor(renderedCellValue);
                return (
                    <span
                        className="inline-block min-w-[70px] text-center font-bold text-[11px] px-2 py-1 rounded-full border"
                        style={{ color: c, backgroundColor: `${c}1a`, borderColor: `${c}3d` }}
                    >
                        {renderedCellValue}
                    </span>
                );
            },
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
            Cell: () => <StatusBadge trio={TRIO.amber} label="Pending HR Approval" pulse title="Awaiting HR final sign-off" />,
        },
        {
            accessorKey: "actions",
            header: "HR Action",
            size: 110,
            Cell: ({ row }: any) => {
                const busy = processingRowId === row.original.id;
                return (
                    <div className="flex gap-1.5">
                        <WtIconButton
                            title="HR Final Approve"
                            color={TRIO.green.c}
                            disabled={loading || busy}
                            onClick={() => approveAsHR(row.original)}
                            size={34}
                        >
                            {busy && processingAction === 'approve'
                                ? <Spinner size={16} color={TRIO.green.c} />
                                : <KTIcon iconName="check" className="fs-4" />}
                        </WtIconButton>
                        <WtIconButton
                            title="HR Reject"
                            color={TRIO.rose.c}
                            disabled={loading || busy}
                            onClick={() => rejectAsHR(row.original.id)}
                            size={34}
                        >
                            {busy && processingAction === 'reject'
                                ? <Spinner size={16} color={TRIO.rose.c} />
                                : <KTIcon iconName="cross" className="fs-4" />}
                        </WtIconButton>
                    </div>
                );
            },
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
            <div className="pt-6 mb-2.5 flex items-start gap-3">
                <IconBox icon="time" trio={TRIO.amber} size={44} fs="fs-1" />
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[20px] text-slate-900">Pending HR Approval</span>
                        <StatusBadge trio={TRIO.amber} label={String(hrPendingLeaves.length)} />
                    </div>
                    <p className="text-[13px] text-slate-500 mt-0.5 m-0">
                        These requests cleared Team Lead review and require your final sign-off.
                    </p>
                </div>
            </div>
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
