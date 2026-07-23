import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
import { RootState } from "@redux/store";
import {
  getAllLeaveManagements,
  updateLeaveManagement,
  revokeLeaveManagement,
} from "@services/employee";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import dayjs from "dayjs";
import { KTIcon } from "@metronic/helpers";
import { successConfirmation } from "@utils/modal";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassDialog, GlassHeader, WtButton, WtIconButton, StatusBadge, IconBox, TRIO, type Trio, Spinner } from "@app/modules/common/components/ui/tw";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import eventBus from "@utils/EventBus";
import { LEAVE_MANAGEMENT_TYPE, LEAVE_MANAGEMENT_TYPE_NAMES, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";

interface LeaveManagementRequest {
  id: string;
  employeeId: string;
  managementType: string;
  leaveTypeId: string | null;
  leaveTypeIds: any;
  leaveCount: number;
  status: number;
  totalAmount: number | null;
  createdAt: string;
  updateAt: string;
  createdById: string;
  updatedById: string;
}

function LeaveManagementRequests() {
  const { filterIds } = useTeamFilter();
  const [requests, setRequests] = useState<LeaveManagementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | 'revoke' | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokeRequestId, setRevokeRequestId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const { companyId } = useSelector((state: RootState) => ({
    companyId: state.employee.currentEmployee.companyId,
  }));

  const currentEmployeeId = useSelector(
    (state: RootState) => state?.employee?.currentEmployee?.id
  );

  const allEmployees = useSelector(
    (state: RootState) => state.allEmployees.list
  );

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllLeaveManagements();
      // Show all requests (pending, approved, rejected, revoked)
      const allRequests = response.data.leaveManagements || [];
      const transformedData = allRequests.map((req: LeaveManagementRequest) => ({
        ...req,
        managementTypeText: req.managementType === LEAVE_MANAGEMENT_TYPE.CASH ? LEAVE_MANAGEMENT_TYPE_NAMES.CASH : LEAVE_MANAGEMENT_TYPE_NAMES.TRANSFER,
        leaveTypeDetails: req.leaveTypeIds ?
          (req.leaveTypeIds as any[]).map(lt => `${lt.leaveType}: ${lt.count}`).join(', ') :
          '-'
      }));
      setRequests(transformedData);
    } catch (error) {
      console.error("Error fetching leave management requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchRequests();
    }
  }, [companyId]);

  // Listen for leave management request created event to refresh table
  useEventBus(EVENT_KEYS.leaveManagementRequestCreated, () => {
    if (companyId) {
      fetchRequests();
    }
  });

  const handleApprove = async (request: LeaveManagementRequest) => {
    try {
      setProcessingRowId(request.id);
      setProcessingAction('approve');
      const payLoad = {
        status: 1,
        approvedRejectById: currentEmployeeId
      }
      await updateLeaveManagement(request.id, payLoad);
      await successConfirmation("Leave management request approved successfully");
      eventBus.emit(EVENT_KEYS.leaveManagementRequestUpdated, { requestId: request.id });
      fetchRequests();
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      setProcessingRowId(requestId);
      setProcessingAction('reject');
      const payLoad = {
        status: 2,
        approvedRejectById: currentEmployeeId
      }
      await updateLeaveManagement(requestId, payLoad);
      await successConfirmation("Leave management request rejected successfully");
      eventBus.emit(EVENT_KEYS.leaveManagementRequestUpdated, { requestId });
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRevokeClick = (requestId: string) => {
    setRevokeRequestId(requestId);
    setRevokeReason("");
    setShowRevokeModal(true);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeRequestId) return;

    try {
      setProcessingRowId(revokeRequestId);
      setProcessingAction('revoke');
      setShowRevokeModal(false);

      const payLoad = {
        revokedById: currentEmployeeId,
        revokeReason: revokeReason || '' // Use entered reason or empty string
      }

      // Call revoke API endpoint using service method
      await revokeLeaveManagement(revokeRequestId, payLoad);
      await successConfirmation("Leave management request revoked successfully");
      eventBus.emit(EVENT_KEYS.leaveManagementRequestUpdated, { requestId: revokeRequestId });
      fetchRequests();
    } catch (error) {
      console.error("Error revoking request:", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
      setRevokeRequestId(null);
      setRevokeReason("");
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Pending";
      case 1:
        return "Approved";
      case 2:
        return "Rejected";
      case 3:
        return "Revoked";
      default:
        return "Unknown";
    }
  };

  // Status → shared TRIO tone (pending amber · approved green · rejected rose · revoked purple).
  const getStatusTrio = (status: number): Trio => {
    switch (status) {
      case 0: return TRIO.amber;
      case 1: return TRIO.green;
      case 2: return TRIO.rose;
      case 3: return TRIO.purple;
      default: return TRIO.slate;
    }
  };

  const columns = [
    {
      accessorKey: "employee",
      header: "Employee",
      Cell: ({ row }: any) => {
        const employee = row.original.employee;
        if (employee && employee.users) {
          return `${employee.users.firstName} ${employee.users.lastName} (${employee.employeeCode || 'N/A'})`;
        }
        // Fallback to old method if employee data not included
        return allEmployees.find((e:any) => e.employeeId === row.original.employeeId)?.employeeName || row.original.employeeId;
      }
    },
    {
      accessorKey: "managementTypeText",
      header: "Type",
      Cell: ({ row }: any) => {
        const trio = row.original.managementType === LEAVE_MANAGEMENT_TYPE.CASH ? TRIO.blue : TRIO.purple;
        return <StatusBadge trio={trio} label={row.original.managementTypeText || '-NA-'} />;
      },
    },
    {
      accessorKey: "leaveCount",
      header: "Total Leaves",
      Cell: ({ row }: any) => (
        <span style={{ fontWeight: '600' }}>{row.original.leaveCount || '-NA-'}</span>
      ),
    },
    {
      accessorKey: "leaveTypeDetails",
      header: "Leave Breakdown",
      Cell: ({ row }: any) => (
        <span style={{ fontSize: '12px' }}>
          {row.original.leaveTypeDetails || '-NA-'}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      Cell: ({ row }: any) => (
        <span style={{ fontWeight: row.original.totalAmount ? '600' : 'normal' }}>
          {row.original.totalAmount ? `₹${Number(row.original.totalAmount).toLocaleString()}` : '-NA-'}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Requested At",
      Cell: ({ row }: any) => (
        <span>{dayjs(row.original.createdAt).format("DD MMM YYYY hh:mm A")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      Cell: ({ row }: any) => (
        <StatusBadge trio={getStatusTrio(row.original.status)} label={getStatusText(row.original.status)} pulse={row.original.status === 0} />
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }: any) => {
        const permission = hasPermission(
          resourceNameMapWithCamelCase.leaveCashTransfer,
          permissionConstToUseWithHasPermission.editOthers,
      );

      const busy = processingRowId === row.original.id;
      return (
        <div className="flex gap-1.5">
        {permission ? (
          <>
            {row.original.status === 0 && (
              <>
                <WtIconButton title="Approve" color={TRIO.green.c} onClick={() => handleApprove(row.original)} disabled={loading || busy} size={34}>
                  {busy && processingAction === "approve"
                    ? <Spinner size={16} color={TRIO.green.c} />
                    : <KTIcon iconName="check" className="fs-4" />}
                </WtIconButton>

                <WtIconButton title="Reject" color={TRIO.rose.c} onClick={() => handleReject(row.original.id)} disabled={loading || busy} size={34}>
                  {busy && processingAction === "reject"
                    ? <Spinner size={16} color={TRIO.rose.c} />
                    : <KTIcon iconName="cross" className="fs-4" />}
                </WtIconButton>
              </>
            )}

            {(row.original.status === 1 || row.original.status === 2) && (
              <WtIconButton title="Revoke" color={TRIO.purple.c} onClick={() => handleRevokeClick(row.original.id)} disabled={loading || busy} size={34}>
                {busy && processingAction === "revoke"
                  ? <Spinner size={16} color={TRIO.purple.c} />
                  : <KTIcon iconName="arrows-circle" className="fs-4" />}
              </WtIconButton>
            )}
          </>
        ) : (
          <span className="text-slate-400 text-[12px]">
            Not Allowed
          </span>
        )}
      </div>
    );
  },
}];

  if (!loading && requests.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-8">
        <div className="mb-2.5 flex items-center gap-3">
          <IconBox icon="dollar" trio={TRIO.purple} size={44} fs="fs-1" />
          <span className="font-bold text-[20px] text-slate-900">Pending Leave Management Requests</span>
        </div>
        <MaterialTable
          columns={columns}
          data={filterIds ? requests.filter((r) => filterIds.includes(r.employeeId)) : requests}
          tableName="Pending Leave Management Requests"
          isLoading={loading}
          viewOthers={true}
          viewOwn={true}
          resource={resourceNameMapWithCamelCase.leaveCashTransfer}
        />
      </div>

      {/* Revoke Reason Modal */}
      <GlassDialog open={showRevokeModal} onClose={() => setShowRevokeModal(false)} maxWidth="sm" fullWidth>
        <GlassHeader
          title="Revoke Leave Request"
          icon={<KTIcon iconName="arrows-circle" className="fs-1 text-white" />}
          onClose={() => setShowRevokeModal(false)}
        />
        <div className="p-4 sm:p-6">
          <p className="text-[13px] font-semibold text-slate-900 mb-2 m-0">Reason for Revoke (Optional)</p>
          <textarea
            className="w-full min-h-[92px] rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 outline-none focus:border-slate-400 resize-y"
            rows={4}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            placeholder="Enter reason for revoking this request…"
          />
        </div>
        <div
          className="px-4 sm:px-6 py-4 flex justify-end gap-2.5 flex-col-reverse sm:flex-row"
          style={{ borderTop: `1px solid ${TRIO.slate.bd}` }}
        >
          <WtButton ghost onClick={() => setShowRevokeModal(false)} className="w-full sm:w-auto">Cancel</WtButton>
          <WtButton tone="accent" onClick={handleRevokeConfirm} className="w-full sm:w-auto">Confirm Revoke</WtButton>
        </div>
      </GlassDialog>
    </>
  );
}

export default LeaveManagementRequests;
