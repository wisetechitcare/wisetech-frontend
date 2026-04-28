import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  getAllLeaveManagements,
  updateLeaveManagement,
  revokeLeaveManagement,
} from "@services/employee";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import dayjs from "dayjs";
import { toAbsoluteUrl } from "@metronic/helpers";
import { successConfirmation } from "@utils/modal";
import { Modal } from "react-bootstrap";
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

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "#F39C12"; // warning/pending - orange
      case 1:
        return "#2ECC71"; // success/approved - green
      case 2:
        return "#E74C3C"; // danger/rejected - red
      case 3:
        return "#9B59B6"; // revoked - purple
      default:
        return "#95A5A6"; // secondary - gray
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
      Cell: ({ row }: any) => (
        <span
          className="badge"
          style={{
            backgroundColor: row.original.managementType === LEAVE_MANAGEMENT_TYPE.CASH ? '#3498DB' : '#9B59B6',
            color: 'white',
            fontWeight: '500',
            fontSize: '11px',
            padding: '5px 8px',
            borderRadius: '12px',
          }}
        >
          {row.original.managementTypeText || '-NA-'}
        </span>
      ),
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
        <span
          className="badge"
          style={{
            backgroundColor: getStatusColor(row.original.status),
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
          {getStatusText(row.original.status)}
        </span>
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

      return (
        <div className="d-flex gap-2">
        {permission ? (
          <>
            {row.original.status === 0 && (
              <>
                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => handleApprove(row.original)}
                  title="Approve"
                  disabled={loading || processingRowId === row.original.id}
                >
                  {processingRowId === row.original.id && processingAction === "approve" ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} alt="Approve" />
                  )}
                </button>

                <button
                  className="btn btn-icon btn-sm"
                  onClick={() => handleReject(row.original.id)}
                  title="Reject"
                  disabled={loading || processingRowId === row.original.id}
                >
                  {processingRowId === row.original.id && processingAction === "reject" ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} alt="Reject" />
                  )}
                </button>
              </>
            )}

            {(row.original.status === 1 || row.original.status === 2) && (
              <button
                className="btn btn-icon btn-sm"
                onClick={() => handleRevokeClick(row.original.id)}
                title="Revoke"
                disabled={loading || processingRowId === row.original.id}
              >
                {processingRowId === row.original.id && processingAction === "revoke" ? (
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                ) : (
                  <img
                    src={toAbsoluteUrl("media/svg/misc/refresh.svg")}
                    width={23}
                    height={23}
                  />
                )}
              </button>
            )}
          </>
        ) : (
          <span className="text-muted" style={{ fontSize: "12px" }}>
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
      <div className="mt-10">
        <h3 className="fw-bold">
          Pending Leave Management Requests
        </h3>
        <MaterialTable
          columns={columns}
          data={requests}
          tableName="Pending Leave Management Requests"
          isLoading={loading}
          viewOthers={true}
          viewOwn={true}
          resource={resourceNameMapWithCamelCase.leaveCashTransfer}
        />
      </div>

      {/* Revoke Reason Modal */}
      <Modal show={showRevokeModal} onHide={() => setShowRevokeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revoke Leave Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Reason for Revoke (Optional)</label>
            <textarea
              className="form-control"
              rows={4}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder="Enter reason for revoking this request..."
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRevokeModal(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            style={{ backgroundColor: '#9B59B6', color: 'white' }}
            onClick={handleRevokeConfirm}
          >
            Confirm Revoke
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default LeaveManagementRequests;
