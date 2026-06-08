import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAllLeaveManagements } from "@services/employee";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { LEAVE_MANAGEMENT_TYPE, LEAVE_MANAGEMENT_TYPE_NAMES } from "@constants/statistics";

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

function MyLeaveManagementRequests({ startDateNew, endDateNew }: { startDateNew: string, endDateNew: string }) {
  const [requests, setRequests] = useState<LeaveManagementRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const { employeeId } = useSelector((state: RootState) => ({
    employeeId: state.employee.currentEmployee.id,
  }));

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await getAllLeaveManagements(employeeId);
      const allRequests = response.data.leaveManagements || [];

      // Filter requests by fiscal year date range
      const fiscalYearRequests = allRequests.filter((req: LeaveManagementRequest) => {
        const createdDate = req.createdAt ? dayjs(req.createdAt).format('YYYY-MM-DD') : '';
        return createdDate >= startDateNew && createdDate <= endDateNew;
      });

      // console.log("MyLeaveManagementRequests - Total requests:", allRequests.length);
      // console.log("MyLeaveManagementRequests - Fiscal year filtered:", fiscalYearRequests.length);
      // console.log("MyLeaveManagementRequests - Fiscal year range:", startDateNew, "to", endDateNew);

      const transformedData = fiscalYearRequests.map((req: LeaveManagementRequest) => ({
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
    if (employeeId && startDateNew && endDateNew) {
      fetchRequests();
    }
  }, [employeeId, startDateNew, endDateNew]);

  // Listen for leave management request created event to refresh table
  useEventBus(EVENT_KEYS.leaveManagementRequestCreated, () => {
    if (employeeId) {
      fetchRequests();
    }
  });

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
  ];

  if (!loading && requests.length === 0) {
    return null;
  }

  return (
    <div className="mt-10">
      <h5 className="fw-bold mb-4">
        My Leave Management Requests
      </h5>
      <MaterialTable
        columns={columns}
        data={requests}
        tableName="My Leave Management Requests"
        isLoading={loading}
      />
    </div>
  );
}

export default MyLeaveManagementRequests;
