import { resolveActiveOrgId } from '@utils/activeOrg';
import { useState, useMemo, useEffect, useCallback } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { Button } from "@mui/material";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import Loader from "@app/modules/common/utils/Loader";
import { IAttendanceRequests, IReimbursementsFetch } from "@models/employee";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchCompanyOverview } from "@services/company";
import {
  getPendingAttendanceRequests,
  fetchLeaveRequest,
} from "@services/employee";
import {
  transformAttendanceRequest,
  fetchAllTimeReimbursementsOfAllEmp,
  approveEmpReimbursementRequestById,
  rejectEmpReimbursementRequestById
} from "@utils/statistics";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { LeaveStatus, LEAVE_STATUS, WORKING_METHOD_TYPE } from "@constants/attendance";
import { successConfirmation, deleteConfirmation } from "@utils/modal";
import dayjs from "dayjs";
import { convertTo12HourFormat } from "@utils/date";
import { getGraceBasedThresholds } from "@utils/getGraceBasedThresholds";
import { markWeekendOrHoliday } from "@utils/statistics";
import { fetchConfiguration } from "@services/company";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, uiControlResourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { fetchApprovalInstanceByRequest } from "@services/employee";
import { Modal } from "react-bootstrap";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";

interface PendingRequest {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  remark: string;
  type: "attendance" | "leave" | "reimbursement";
}

type RequestTab = "attendance" | "leaves" | "reimbursements";

const PendingRequestsTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RequestTab>("attendance");
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceRequests, setAttendanceRequests] = useState<IAttendanceRequests[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [reimbursementRequests, setReimbursementRequests] = useState<IReimbursementsFetch[]>([]);
  const [processingRowId, setProcessingRowId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const [leaveConfiguration, setLeaveConfiguration] = useState<any>();
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackRequestModel, setTrackRequestModel] = useState<'AttendanceRequests' | 'LeaveTracker' | 'Reimbursement'>('LeaveTracker');
  const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
  const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);

  const openTracker = async (requestId: string, requestModel: 'AttendanceRequests' | 'LeaveTracker' | 'Reimbursement') => {
    setTrackingId(requestId);
    setTrackRequestModel(requestModel);
    setTrackInstanceId(null);
    setTrackInstanceLoading(true);
    try {
      const res = await fetchApprovalInstanceByRequest(requestModel, requestId);
      const instance = res?.data ?? res;
      setTrackInstanceId(instance?.id ?? null);
    } catch {
      setTrackInstanceId(null);
    } finally {
      setTrackInstanceLoading(false);
    }
  };
  const [employeeThresholds, setEmployeeThresholds] = useState<any>([]);
  const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');

  const worktypeColorValues = useSelector((state: RootState) => state?.customColors?.workingLocation);
  const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
  const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
  const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);
  const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);
  const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
  const openLeaveRequestsFromRedux = useSelector((state: RootState) => {
    const { attendance } = state;
    return attendance.leaveRequests.filter((el: any) => el.status === LeaveStatus.ApprovalPending);
  });

  // Fetch pending attendance requests
  const fetchAttendanceRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { companyOverview } } = await fetchCompanyOverview();
      const companyId = (resolveActiveOrgId(companyOverview) ?? '');

      const { data: { attendanceRequests } } = await getPendingAttendanceRequests(companyId);
      const transformed = transformAttendanceRequest(attendanceRequests);
      setAttendanceRequests(transformed);
    } catch (error) {
      console.error('Error fetching attendance requests:', error);
      setAttendanceRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch pending leave requests
  const fetchLeaveRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { leaveRequest } } = await fetchLeaveRequest();
      dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  // Fetch leave configuration
  useEffect(() => {
    async function fetchLeaveConfig() {
      try {
        const { data: configuration } = await fetchConfiguration(LEAVE_MANAGEMENT);
        const jsonObject = JSON.parse(configuration.configuration.configuration);
        setLeaveConfiguration(jsonObject);
      } catch (error) {
        console.error('Error fetching leave configuration:', error);
      }
    }
    fetchLeaveConfig();
  }, []);

  // Fetch pending reimbursement requests
  const fetchReimbursementRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllTimeReimbursementsOfAllEmp();
      const pendingData: IReimbursementsFetch[] = [];
      data.forEach((ele) => {
        if (ele.id && ele.status === "Pending") {
          pendingData.push(ele);
        }
      });
      setReimbursementRequests(pendingData);
    } catch (error) {
      console.error('Error fetching reimbursement requests:', error);
      setReimbursementRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all data on component mount to show notification badges
  useEffect(() => {
    fetchAttendanceRequests();
    fetchLeaveRequests();
    fetchReimbursementRequests();
  }, [fetchAttendanceRequests, fetchLeaveRequests, fetchReimbursementRequests]);

  // Fetch grace-based thresholds for attendance
  useEffect(() => {
    const initThresholds = async () => {
      if (!attendanceRequests || attendanceRequests.length === 0) {
        return;
      }

      try {
        const thresholds = await getGraceBasedThresholds(attendanceRequests);

        if (thresholds) {
          setEmployeeThresholds(thresholds.employeesWithThresholds);
          setEarlyCheckOutThreshold(thresholds.defaultThresholds.earlyCheckOutThreshold);
        }
      } catch (error) {
        console.error('Error fetching thresholds:', error);
      }
    };

    initThresholds();
  }, [attendanceRequests]);

  // Approve reimbursement request handler
  const approveReimbursementHandler = async (rowDetails: IReimbursementsFetch) => {
    if (!rowDetails || !rowDetails.id) {
      return;
    }
    try {
      setProcessingRowId(rowDetails.id);
      setProcessingAction('approve');
      await approveEmpReimbursementRequestById(rowDetails.id);
      successConfirmation('Reimbursement Approved Successfully!');
      fetchReimbursementRequests();
    } catch (error) {
      console.log("error in approveReimbursement", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  // Reject reimbursement request handler
  const rejectReimbursementHandler = async (rowDetails: IReimbursementsFetch) => {
    if (!rowDetails || !rowDetails.id) {
      return;
    }
    try {
      setProcessingRowId(rowDetails.id);
      setProcessingAction('reject');
      const val = await deleteConfirmation('Reimbursement Rejected Successfully!', 'Yes, reject it!', 'Rejected!');
      if (val) {
        await rejectEmpReimbursementRequestById(rowDetails.id);
        fetchReimbursementRequests();
      }
    } catch (error) {
      console.log("error in rejectReimbursement", error);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  // View document handler
  const handleViewDocument = (documentUrl: string) => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    }
  };

  const handleEdit = (requestId: string) => {
    console.log("Edit request:", requestId);
    // TODO: Implement edit functionality
  };

  const handleDelete = (requestId: string) => {
    console.log("Delete request:", requestId);
    // TODO: Implement delete functionality with confirmation
  };

  const handleViewAll = () => {
    // Navigate based on active tab
    if (activeTab === "attendance" || activeTab === "leaves") {
      navigate("/employees/attendance-and-leaves");
    } else if (activeTab === "reimbursements") {
      navigate("/finance/bills");
    }
  };

  // Helper function to get leave type color
  const getLeaveTypeColor = (leaveType: string): string => {
    if (!leaveTypeColors) return '#3498DB';

    const normalizedType = leaveType?.toLowerCase() || '';

    if (normalizedType.includes('sick')) return leaveTypeColors.sickLeaveColor || '#E74C3C';
    if (normalizedType.includes('casual')) return leaveTypeColors.casualLeaveColor || '#3498DB';
    if (normalizedType.includes('annual')) return leaveTypeColors.annualLeaveColor || '#2ECC71';
    if (normalizedType.includes('maternal') || normalizedType.includes('maternity')) return leaveTypeColors.maternalLeaveColor || '#9B59B6';
    if (normalizedType.includes('floater')) return leaveTypeColors.floaterLeaveColor || '#F39C12';
    if (normalizedType.includes('unpaid')) return leaveTypeColors.unpaidLeaveColor || '#95A5A6';

    return '#3498DB';
  };

  // Attendance columns
  const attendanceColumns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "day",
        header: "Day",
        size: 80,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "employeeName",
        header: "Employee Name",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "checkIn",
        header: "Check-In",
        size: 90,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const employee = row.original;
          const checkIn = employee.checkIn;

          if (!checkIn || checkIn === '-NA-' || !employeeThresholds) {
            return <span>{checkIn || "N/A"}</span>;
          }

          const employeeData = employeeThresholds.find((emp: any) => emp.id === employee.id);
          const employeeThreshold = employeeData?.lateCheckInThreshold;
          const workingMethod = employee?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
          const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";
          const isWeekendOrHolidays = employee.isWeekendOrHoliday;

          const checkInTime = checkIn.includes(':') ? dayjs(checkIn, ['HH:mm', 'HH:mm:ss']) : null;
          const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, 'HH:mm:ss') : null;

          if (!thresholdTime) return <span>{checkIn || "N/A"}</span>;
          if (!checkInTime) return <span>{checkIn || "N/A"}</span>;

          const isLateCheckIn = checkInTime.isAfter(thresholdTime, 'minute');
          const finalCheckIn = convertTo12HourFormat(checkIn);

          return (
            <span style={{
              color: (((isWeekendOrHolidays || workingMethod == "onsite") && isOnSiteSettingsOn == "1")) ? 'green' : isLateCheckIn ? 'red' : 'green',
            }}>
              {finalCheckIn}
            </span>
          );
        },
      },
      {
        accessorKey: "checkOut",
        header: "Check-Out",
        size: 90,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const employee = row.original;
          const checkOut = employee.checkOut;
          const isWeekendOrHolidays = employee.isWeekendOrHoliday;

          if (!checkOut || checkOut === '-NA-' || !earlyCheckOutThreshold) {
            return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;
          }

          const employeeData = employeeThresholds.find((emp: any) => emp.id === employee.id);
          const employeeThreshold = employeeData?.earlyCheckOutThreshold;
          const workingMethod = employee?.workingMethod?.replace('-', '')?.replace(' ', '')?.toLowerCase();
          const isOnSiteSettingsOn = leaveConfiguration?.[onSiteAndHolidayWeekendSettingsOnOffName] || "0";
          const checkOutTime = checkOut.includes(':') ? dayjs(checkOut, ['HH:mm', 'HH:mm:ss']) : null;
          const thresholdTime = employeeThreshold ? dayjs(employeeThreshold, 'HH:mm:ss') : null;

          if (!thresholdTime) return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;
          if (!checkOutTime) return <span>{checkOut ? convertTo12HourFormat(checkOut) : "N/A"}</span>;

          const isEarlyCheckOut = checkOutTime.isBefore(thresholdTime, 'minute');
          const finalCheckOut = convertTo12HourFormat(checkOut);

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
        accessorKey: "remarks",
        header: "Remarks",
        size: 150,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const isPending = row.original.status === LeaveStatus.ApprovalPending;
          if (!isPending || !row.original.hasApprovalInstance) return null;
          return (
            <button
              className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
              title="Track Approval"
              onClick={() => openTracker(row.original.id, 'AttendanceRequests')}
            >
              <KTIcon iconName="map" className="fs-3" />
            </button>
          );
        },
      },
    ],
    [employeeThresholds, leaveConfiguration, showDateIn12HourFormat, earlyCheckOutThreshold]
  );

  const hasLeaveEditPermission = hasPermission(
    resourceNameMapWithCamelCase.dashboardPendingRequests,
    permissionConstToUseWithHasPermission.editOthers
  );

  // Leave columns
  const leaveColumns = useMemo<MRT_ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Leave Date",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "name",
        header: "Employee Name",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "code",
        header: "Employee Code",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "type",
        header: "Leave Type",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ renderedCellValue }: any) => (
          <span
            className="badge"
            style={{
              backgroundColor: getLeaveTypeColor(renderedCellValue as string),
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
            {renderedCellValue}
          </span>
        )
      },
      {
        accessorKey: "remark",
        header: "Reason",
        size: 200,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const isPending = row.original.status === LeaveStatus.ApprovalPending;
          if (!isPending || !row.original.hasApprovalInstance) return null;
          return (
            <button
              className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
              title="Track Approval"
              onClick={() => openTracker(row.original.id, 'LeaveTracker')}
            >
              <KTIcon iconName="map" className="fs-3" />
            </button>
          );
        },
      },
    ],
    [processingRowId, processingAction, leaveTypeColors]
  );

  // Reimbursement columns
  const reimbursementColumns = useMemo<MRT_ColumnDef<IReimbursementsFetch>[]>(
    () => [
      {
        accessorKey: "expenseDate",
        header: "Date",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "day",
        header: "Day",
        size: 80,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "name",
        header: "Name",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "ID",
        header: "ID",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "amount",
        header: "Amount",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "description",
        header: "Note",
        size: 150,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        muiTableBodyCellProps: { sx: { fontSize: "14px", color: "#000" } },
      },
      {
        accessorKey: "document",
        header: "Document",
        size: 100,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ renderedCellValue }: any) => {
          return (
            <button
              className="btn btn-icon btn-active-color-primary btn-sm"
              onClick={() => handleViewDocument(renderedCellValue)}
              disabled={!renderedCellValue}
            >
              {renderedCellValue ? (
                <KTIcon iconName='eye' className='fs-3' />
              ) : (
                <i className="bi bi-file-earmark-x fs-3 text-danger"></i>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "actions",
        header: "Actions",
        size: 120,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const hasEditPermission = hasPermission(
            resourceNameMapWithCamelCase.dashboardPendingRequests,
            permissionConstToUseWithHasPermission.editOthers
          );

          const isPending = row.original.status === 'Pending';
          return (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {hasEditPermission && <>
                <button
                  className='btn btn-icon btn-sm'
                  onClick={() => approveReimbursementHandler(row.original)}
                  title="Approve"
                  disabled={processingRowId === row.original.id}
                >
                  {processingRowId === row.original.id && processingAction === 'approve' ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} />
                  )}
                </button>
                <button
                  className='btn btn-icon btn-sm'
                  onClick={() => rejectReimbursementHandler(row.original)}
                  title="Reject"
                  disabled={processingRowId === row.original.id}
                >
                  {processingRowId === row.original.id && processingAction === 'reject' ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} />
                  )}
                </button>
              </>}
              {isPending && row.original.hasApprovalInstance && (
                <button
                  className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
                  title="Track Approval"
                  onClick={() => openTracker(row.original.id, 'Reimbursement')}
                >
                  <KTIcon iconName="map" className="fs-3" />
                </button>
              )}
              {!hasEditPermission && !row.original.hasApprovalInstance && "Not Allowed"}
            </div>
          );
        },
      },
    ],
    [processingRowId, processingAction]
  );

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "16px 20px",
          boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
          minHeight: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader />
      </div>
    );
  }

  return (
    <>
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "12px 16px",
        boxShadow: "8px 8px 16px 0px rgba(0,0,0,0.04)",
      }}
      className="pending-requests-container"
    >
      {/* Header Section */}
      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              fontWeight: 600,
              margin: 0,
              fontFamily: "Barlow, sans-serif",
              letterSpacing: "0.2px",
            }}
          >
            Pending Requests
          </h2>
          {hasPermission(
            resourceNameMapWithCamelCase.dashboardPendingRequests,
            permissionConstToUseWithHasPermission.editOthers
          ) && (
            <Button
              variant="outlined"
              onClick={handleViewAll}
              sx={{
                borderColor: "#9d4141",
                color: "#9d4141",
                textTransform: "none",
                fontSize: { xs: "12px", sm: "14px" },
                fontWeight: 500,
                padding: { xs: "8px 12px", sm: "10px 14px" },
                borderRadius: "6px",
                "&:hover": {
                  borderColor: "#9d4141",
                  backgroundColor: "rgba(157, 65, 65, 0.04)",
                },
              }}
            >
              View all
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            paddingTop: "3px",
          }}
          className="tabs-container"
        >
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <button
              onClick={() => setActiveTab("attendance")}
              style={{
                padding: "6px 12px",
                borderRadius: "323px",
                border:
                  activeTab === "attendance"
                    ? "1.5px solid #9d4141"
                    : "1px solid #a0b4d2",
                backgroundColor: "white",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              Attendance
            </button>
            {/* Notification Badge for Attendance */}
            {attendanceRequests.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-1px",
                  width: "10px",
                  height: "11px",
                  backgroundColor: "#b44545",
                  borderRadius: "333px",
                }}
              />
            )}
          </div>
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <button
              onClick={() => setActiveTab("leaves")}
              style={{
                padding: "6px 12px",
                borderRadius: "323px",
                border:
                  activeTab === "leaves"
                    ? "1.5px solid #9d4141"
                    : "1px solid #a0b4d2",
                backgroundColor: "white",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              Leaves
            </button>
            {/* Notification Badge for Leaves */}
            {openLeaveRequestsFromRedux.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-1px",
                  width: "10px",
                  height: "11px",
                  backgroundColor: "#b44545",
                  borderRadius: "333px",
                }}
              />
            )}
          </div>
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <button
              onClick={() => setActiveTab("reimbursements")}
              style={{
                padding: "6px 12px",
                borderRadius: "323px",
                border:
                  activeTab === "reimbursements"
                    ? "1.5px solid #9d4141"
                    : "1px solid #a0b4d2",
                backgroundColor: "white",
                fontSize: "clamp(12px, 2.5vw, 14px)",
                cursor: "pointer",
                fontFamily: "Inter, sans-serif",
                color: "#000",
                whiteSpace: "nowrap",
              }}
            >
              Reimbursements
            </button>
            {/* Notification Badge for Reimbursements */}
            {reimbursementRequests.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-1px",
                  width: "10px",
                  height: "11px",
                  backgroundColor: "#b44545",
                  borderRadius: "333px",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1px solid #eeeeee",
          borderRadius: "12px",
          padding: "clamp(8px, 2vw, 12px)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        className="table-container"
      >
        {activeTab === "attendance" && (
          <MaterialTable
            columns={attendanceColumns}
            data={markWeekendOrHoliday(attendanceRequests.filter((req: any) => req.status === LeaveStatus.ApprovalPending), getAllWeekends, allHolidays)}
            tableName="PendingAttendanceRequests"
            isLoading={isLoading}
            hideFilters={true}
            hideExportCenter={true}
            hidePagination={true}
            enableSorting={false}
            enableColumnActions={false}
            enableFilters={false}
            enableGrouping={false}
            enableColumnDragging={false}
            enableColumnResizing={false}
            enableColumnPinning={false}
            enableExpandAll={false}
            enableHiding={false}
            enableFullScreenToggle={false}
            muiTableProps={{
              sx: {
                "& .MuiTableHead-root": {
                  "& .MuiTableRow-root": {
                    "& .MuiTableCell-root": {
                      backgroundColor: "transparent",
                      borderBottom: "none",
                    },
                  },
                },
                "& .MuiTableBody-root": {
                  "& .MuiTableRow-root": {
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                    },
                    "& .MuiTableCell-root": {
                      borderBottom: "none",
                      padding: "12px",
                    },
                  },
                },
              },
            }}
            muiTablePaperStyle={{
              sx: {
                boxShadow: "none",
                border: "none",
              },
            }}
          />
        )}

        {activeTab === "leaves" && (
          <MaterialTable
            columns={leaveColumns}
            data={openLeaveRequestsFromRedux}
            tableName="PendingLeaveRequests"
            isLoading={isLoading}
            hideFilters={true}
            hideExportCenter={true}
            hidePagination={true}
            enableSorting={false}
            enableColumnActions={false}
            enableFilters={false}
            enableGrouping={false}
            enableColumnDragging={false}
            enableColumnResizing={false}
            enableColumnPinning={false}
            enableExpandAll={false}
            enableHiding={false}
            enableFullScreenToggle={false}
            muiTableProps={{
              sx: {
                "& .MuiTableHead-root": {
                  "& .MuiTableRow-root": {
                    "& .MuiTableCell-root": {
                      backgroundColor: "transparent",
                      borderBottom: "none",
                    },
                  },
                },
                "& .MuiTableBody-root": {
                  "& .MuiTableRow-root": {
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                    },
                    "& .MuiTableCell-root": {
                      borderBottom: "none",
                      padding: "12px",
                    },
                  },
                },
              },
            }}
            muiTablePaperStyle={{
              sx: {
                boxShadow: "none",
                border: "none",
              },
            }}
          />
        )}

        {activeTab === "reimbursements" && (
          <MaterialTable
            columns={reimbursementColumns}
            data={reimbursementRequests}
            tableName="PendingReimbursementRequests"
            isLoading={isLoading}
            hideFilters={true}
            hideExportCenter={true}
            hidePagination={true}
            enableSorting={false}
            enableColumnActions={false}
            enableFilters={false}
            enableGrouping={false}
            enableColumnDragging={false}
            enableColumnResizing={false}
            enableColumnPinning={false}
            enableExpandAll={false}
            enableHiding={false}
            enableFullScreenToggle={false}
            muiTableProps={{
              sx: {
                "& .MuiTableHead-root": {
                  "& .MuiTableRow-root": {
                    "& .MuiTableCell-root": {
                      backgroundColor: "transparent",
                      borderBottom: "none",
                    },
                  },
                },
                "& .MuiTableBody-root": {
                  "& .MuiTableRow-root": {
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.02)",
                    },
                    "& .MuiTableCell-root": {
                      borderBottom: "none",
                      padding: "12px",
                    },
                  },
                },
              },
            }}
            muiTablePaperStyle={{
              sx: {
                boxShadow: "none",
                border: "none",
              },
            }}
          />
        )}
      </div>
    </div>

    <Modal
      show={!!trackingId}
      onHide={() => { setTrackingId(null); setTrackInstanceId(null); }}
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
};

export default PendingRequestsTable;

// Add responsive styles
const styles = `
  @media (max-width: 768px) {
    .pending-requests-container {
      padding: 12px !important;
      border-radius: 12px !important;
    }

    .tabs-container {
      padding-bottom: 4px;
    }

    .tabs-container::-webkit-scrollbar {
      height: 4px;
    }

    .tabs-container::-webkit-scrollbar-thumb {
      background-color: #d1d5db;
      border-radius: 2px;
    }

    .table-container {
      padding: 8px !important;
    }
  }

  @media (max-width: 480px) {
    .pending-requests-container {
      padding: 8px !important;
      border-radius: 8px !important;
    }

    .table-container {
      padding: 4px !important;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  if (!document.head.querySelector('[data-pending-requests-styles]')) {
    styleSheet.setAttribute('data-pending-requests-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}
