import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  getAttendanceRequestLimitResetRequests,
  approveAttendanceRequestLimitReset,
  rejectAttendanceRequestLimitReset,
} from "@services/employee";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { KTIcon } from "@metronic/helpers";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { WtIconButton, Spinner, TRIO } from "@app/modules/common/components/ui/tw";
import { successConfirmation } from "@utils/modal";
import Tooltip from "@mui/material/Tooltip";
import { resourceNameMapWithCamelCase, permissionConstToUseWithHasPermission } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

interface AttendanceRequestLimitResetRequest {
  id: string;
  employeeId: string;
  requestedTo: string;
  status: number;
  createdAt: string;
  updatedAt: string;
  employee: {
    id: string;
    employeeCode: string;
    attendanceRequestRaiseLimit: number;
    users: {
      firstName: string;
      lastName: string;
      personalEmailId: string;
    };
    companyEmailId: string;
  };
}

function AttendanceRequestLimitReset() {
  const [requests, setRequests] = useState<AttendanceRequestLimitResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

  const { employeeId, companyId } = useSelector((state: RootState) => ({
    employeeId: state.employee.currentEmployee.id,
    companyId: state.employee.currentEmployee.companyId,
  }));

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getAttendanceRequestLimitResetRequests(companyId!);

      let allRequests = response.data.requests || [];

      // Filter based on role
      const isSuperAdmin = hasPermission(
        resourceNameMapWithCamelCase.attendanceRequestLimit,
        permissionConstToUseWithHasPermission.editOthers
      );

      // If not super admin (i.e., manager), filter to show only requests assigned to them
      if (!isSuperAdmin) {
        allRequests = allRequests.filter((req: AttendanceRequestLimitResetRequest) => req.requestedTo === employeeId);
      }
      // Super admin sees all requests (no filter)

      const transformedData = allRequests.map((req: AttendanceRequestLimitResetRequest) => ({
        ...req,
        employeeCode: req.employee.employeeCode,
        employeeName: `${req.employee.users.firstName} ${req.employee.users.lastName}`,
        email: req.employee.companyEmailId,
        currentLimit: req.employee.attendanceRequestRaiseLimit,
      }));
      setRequests(transformedData);
    } catch (error) {
      console.error("Error fetching attendance request limit reset requests:", error);
      toast.error("Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchRequests();
    }
  }, [companyId]);

  const handleApprove = async (request: AttendanceRequestLimitResetRequest) => {
    try {
      setProcessingRowId(request.id);
      setProcessingAction('approve');
      await approveAttendanceRequestLimitReset(request.id);
      successConfirmation("Request approved successfully");
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
      await rejectAttendanceRequestLimitReset(requestId);
      successConfirmation("Request rejected successfully");
      fetchRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
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
      default:
        return "#95A5A6"; // secondary - gray
    }
  };

  const columns = [
    {
      accessorKey: "employeeCode",
      header: "Employee Code",
    },
    {
      accessorKey: "employeeName",
      header: "Employee Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "currentLimit",
      header: "Current Limit",
      Cell: ({ row }: any) => (
        <div >
          {row.original.currentLimit}
        </div>
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
        const permission = hasPermission(resourceNameMapWithCamelCase.attendanceRequestLimit, permissionConstToUseWithHasPermission.editOthers, row.original);

        return (
          <div className="flex items-center gap-1.5">
            {permission && row.original.status === 0 && (
              <>
                <WtIconButton
                  color={TRIO.green.c}
                  onClick={() => handleApprove(row.original)}
                  title="Approve"
                  disabled={loading || processingRowId === row.original.id}
                  size={34}
                >
                  {processingRowId === row.original.id && processingAction === 'approve' ? (
                    <Spinner size={14} color={TRIO.green.c} />
                  ) : (
                    <KTIcon iconName="check" className="fs-4" />
                  )}
                </WtIconButton>
                <WtIconButton
                  color={TRIO.rose.c}
                  onClick={() => handleReject(row.original.id)}
                  title="Reject"
                  disabled={loading || processingRowId === row.original.id}
                  size={34}
                >
                  {processingRowId === row.original.id && processingAction === 'reject' ? (
                    <Spinner size={14} color={TRIO.rose.c} />
                  ) : (
                    <KTIcon iconName="cross" className="fs-4" />
                  )}
                </WtIconButton>
              </>
            )}
            {!permission && (
              <span className="text-[12px] text-slate-500">Not Allowed</span>
            )}
          </div>
        );
      },
    },
  ];

  if (!loading && requests.length === 0) {
    return null;
  }

  return (
    <div className=" mt-10">
        <h3 className=" fw-bold">
          Pending Limit Reset Requests
          <Tooltip
            placement="top"
            title="Approving this request will double the employee's current attendance request limit"
          >
            <AppIcon name="bi-question-circle" className="ms-2" style={{ fontSize: '1rem', cursor: 'pointer' }} />
          </Tooltip>
        </h3>
        <MaterialTable
          resource={resourceNameMapWithCamelCase.attendanceRequestLimit}
          columns={columns}
          data={requests}
          tableName="Pending Limit Reset Requests"
          isLoading={loading}
          viewOthers={true}
          viewOwn={true}
        />
    </div>
  );
}

export default AttendanceRequestLimitReset;
