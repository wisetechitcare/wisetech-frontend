import { safeJsonParse } from '@utils/safeJson';
import { resolveActiveOrgId } from '@utils/activeOrg';
import { useState, useMemo, useEffect, useCallback } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { Button } from "@mui/material";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import Loader from "@app/modules/common/utils/Loader";
import { IAttendanceRequests } from "@models/employee";
import { RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchCompanyOverview } from "@services/company";
import {
  getPendingAttendanceRequests,
  fetchLeaveRequest,
  fetchReimbursementBatches,
  fetchPendingApprovals,
  processApprovalAction,
  fetchApprovalInstanceByRequest,
  fetchReimbursementBatchById,
  processBatchRequestAction,
} from "@services/employee";
import {
  transformAttendanceRequest,
} from "@utils/statistics";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { LeaveStatus } from "@constants/attendance";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import dayjs from "dayjs";
import { convertTo12HourFormat } from "@utils/date";
import { getGraceBasedThresholds } from "@utils/getGraceBasedThresholds";
import { markWeekendOrHoliday } from "@utils/statistics";
import { fetchConfiguration } from "@services/company";
import { LEAVE_MANAGEMENT } from "@constants/configurations-key";
import { onSiteAndHolidayWeekendSettingsOnOffName, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { hasPermission } from "@utils/authAbac";
import { Modal } from "react-bootstrap";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";
import {
  BatchRow,
  BatchDetailModal,
  RejectReasonModal,
  fmtDate,
  fmtAmount,
} from "@app/pages/employee/reimbursement/shared/ReimbursementBatchShared";

// ---------------------------------------------------------------------------

type RequestTab = "attendance" | "leaves" | "reimbursements";

const PendingRequestsTable = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RequestTab>("attendance");
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceRequests, setAttendanceRequests] = useState<IAttendanceRequests[]>([]);
  const [leaveConfiguration, setLeaveConfiguration] = useState<any>();

  // Workflow approval state (for attendance & leaves)
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
  const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);
  const [actionableApprovals, setActionableApprovals] = useState<Map<string, string>>(new Map());
  const [approvalProcessingId, setApprovalProcessingId] = useState<string | null>(null);
  const [approvalRejectTarget, setApprovalRejectTarget] = useState<{ requestId: string; instanceId: string } | null>(null);
  const [approvalRejectReason, setApprovalRejectReason] = useState('');
  const [approvalRejectSubmitting, setApprovalRejectSubmitting] = useState(false);

  // Reimbursement batch state
  const [reimbursementBatches, setReimbursementBatches] = useState<BatchRow[]>([]);
  const [batchDetailId, setBatchDetailId] = useState<string | null>(null);
  const [batchDetailInstanceId, setBatchDetailInstanceId] = useState<string | null>(null);
  const [batchRejectTarget, setBatchRejectTarget] = useState<BatchRow | null>(null);
  const [batchRejectSubmitting, setBatchRejectSubmitting] = useState(false);
  const [batchProcessingId, setBatchProcessingId] = useState<string | null>(null);
  const [trackingBatchRow, setTrackingBatchRow] = useState<BatchRow | null>(null);

  const [employeeThresholds, setEmployeeThresholds] = useState<any>([]);
  const [earlyCheckOutThreshold, setEarlyCheckOutThreshold] = useState('');

  const showDateIn12HourFormat = useSelector((state: RootState) => state.employee.currentEmployee.branches.showDateIn12HourFormat);
  const getAllWeekends = useSelector((state: RootState) => state?.employee?.currentEmployee?.branches?.workingAndOffDays);
  const allHolidays = useSelector((state: RootState) => state?.attendanceStats?.publicHolidays);
  const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);
  const openLeaveRequestsFromRedux = useSelector((state: RootState) => {
    const { attendance } = state;
    return attendance.leaveRequests.filter((el: any) => el.status === LeaveStatus.ApprovalPending);
  });

  // Fetch approvals the current user can act on (used for attendance & leaves)
  const fetchActionableApprovals = useCallback(async () => {
    try {
      const res = await fetchPendingApprovals();
      const rows = (res?.data ?? res ?? []) as any[];
      const map = new Map<string, string>();
      rows.forEach((step) => {
        const reqId = step?.instance?.requestId;
        const instId = step?.instance?.id;
        if (reqId && instId) map.set(reqId, instId);
      });
      setActionableApprovals(map);
    } catch {
      setActionableApprovals(new Map());
    }
  }, []);

  const openTracker = useCallback(async (requestId: string, requestModel: 'AttendanceRequests' | 'LeaveTracker' | 'ReimbursementBatch', batchRow?: BatchRow) => {
    setTrackingId(requestId);
    setTrackInstanceId(null);
    setTrackInstanceLoading(true);
    setTrackingBatchRow(batchRow ?? null);
    try {
      const res = await fetchApprovalInstanceByRequest(requestModel, requestId);
      const instance = res?.data ?? res;
      setTrackInstanceId(instance?.id ?? null);
    } catch {
      setTrackInstanceId(null);
    } finally {
      setTrackInstanceLoading(false);
    }
  }, []);

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
        const jsonObject = safeJsonParse(configuration.configuration?.configuration);
        setLeaveConfiguration(jsonObject);
      } catch (error) {
        console.error('Error fetching leave configuration:', error);
      }
    }
    fetchLeaveConfig();
  }, []);

  // Fetch pending reimbursement batches
  const fetchPendingReimbursementBatches = useCallback(async () => {
    try {
      setIsLoading(true);
      const [batchRes, approvalRes] = await Promise.all([
        fetchReimbursementBatches(),
        fetchPendingApprovals(),
      ]);
      const allBatches: any[] = batchRes?.data?.batches || batchRes?.batches || [];
      const approvalSteps: any[] = (approvalRes?.data ?? approvalRes ?? []) as any[];
      const reimbBatchSteps = approvalSteps.filter((s: any) => s.instance?.requestModel === 'ReimbursementBatch');

      const instanceMap: Record<string, string> = {};
      for (const step of reimbBatchSteps) {
        if (step.instance?.requestId) instanceMap[step.instance.requestId] = step.instance.id;
      }
      const pendingBatchIds = new Set(reimbBatchSteps.map((s: any) => s.instance.requestId));
      const filtered = allBatches.filter((b: any) => b.status === 0 || pendingBatchIds.has(b.id));
      const built: BatchRow[] = filtered.map((b: any) => ({
        ...b,
        approvalInstanceId: instanceMap[b.id] ?? null,
        rejectionReason: b.rejectReason ?? null,
      }));
      setReimbursementBatches(built);
    } catch {
      setReimbursementBatches([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load all data on mount
  useEffect(() => {
    fetchAttendanceRequests();
    fetchLeaveRequests();
    fetchPendingReimbursementBatches();
    fetchActionableApprovals();
  }, [fetchAttendanceRequests, fetchLeaveRequests, fetchPendingReimbursementBatches, fetchActionableApprovals]);

  // Approve a request through the multi-level approval workflow (attendance & leaves)
  const approveWorkflowRequest = useCallback(async (requestId: string, refresh: () => void) => {
    const instanceId = actionableApprovals.get(requestId);
    if (!instanceId) return;
    setApprovalProcessingId(requestId);
    try {
      await processApprovalAction(instanceId, 'approve');
      successConfirmation('Request has been approved successfully.', 'Approved!');
      await Promise.all([refresh(), fetchActionableApprovals()]);
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to approve this request.');
    } finally {
      setApprovalProcessingId(null);
    }
  }, [actionableApprovals, fetchActionableApprovals]);

  // Workflow rejection for attendance & leaves
  const confirmWorkflowReject = useCallback(async () => {
    if (!approvalRejectTarget) return;
    const reason = approvalRejectReason.trim();
    setApprovalRejectSubmitting(true);
    try {
      await processApprovalAction(approvalRejectTarget.instanceId, 'reject', reason);
      successConfirmation('Request has been rejected.', 'Rejected');
      setApprovalRejectTarget(null);
      setApprovalRejectReason('');
      await Promise.all([
        fetchAttendanceRequests(),
        fetchLeaveRequests(),
        fetchPendingReimbursementBatches(),
        fetchActionableApprovals(),
      ]);
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to reject this request.');
    } finally {
      setApprovalRejectSubmitting(false);
    }
  }, [approvalRejectTarget, approvalRejectReason, fetchAttendanceRequests, fetchLeaveRequests, fetchPendingReimbursementBatches, fetchActionableApprovals]);

  // Reimbursement batch approve
  const handleBatchApprove = async (row: BatchRow) => {
    setBatchProcessingId(row.id);
    try {
      if (row.approvalInstanceId) {
        await processApprovalAction(row.approvalInstanceId, 'approve');
      } else {
        const res = await fetchReimbursementBatchById(row.id);
        const batch = res?.data?.batch || res?.batch;
        const pending = batch?.reimbursements?.filter((r: any) => r.status === 0) || [];
        for (const r of pending) {
          await processBatchRequestAction(row.id, r.id, 'approve');
        }
      }
      setReimbursementBatches((prev) => prev.filter((r) => r.id !== row.id));
      successConfirmation('Batch approved!', 'Approved');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to approve');
    } finally { setBatchProcessingId(null); }
  };

  // Reimbursement batch reject
  const handleBatchRejectConfirm = async (reason: string) => {
    if (!batchRejectTarget) return;
    setBatchRejectSubmitting(true);
    try {
      if (batchRejectTarget.approvalInstanceId) {
        await processApprovalAction(batchRejectTarget.approvalInstanceId, 'reject', reason);
      } else {
        const res = await fetchReimbursementBatchById(batchRejectTarget.id);
        const batch = res?.data?.batch || res?.batch;
        const pending = batch?.reimbursements?.filter((r: any) => r.status === 0) || [];
        for (const r of pending) {
          await processBatchRequestAction(batchRejectTarget.id, r.id, 'reject', reason);
        }
      }
      setReimbursementBatches((prev) => prev.filter((r) => r.id !== batchRejectTarget.id));
      setBatchRejectTarget(null);
      successConfirmation('Batch rejected', 'Rejected');
    } catch (err: any) {
      errorConfirmation(err?.response?.data?.message || 'Failed to reject');
    } finally { setBatchRejectSubmitting(false); }
  };

  const openBatchDetail = useCallback((r: BatchRow) => {
    setBatchDetailId(r.id);
    setBatchDetailInstanceId(r.approvalInstanceId || null);
  }, []);

  // Fetch grace-based thresholds for attendance
  useEffect(() => {
    const initThresholds = async () => {
      if (!attendanceRequests || attendanceRequests.length === 0) return;
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

  const handleViewAll = () => {
    if (activeTab === "attendance" || activeTab === "leaves") {
      navigate("/employees/attendance-and-leaves");
    } else if (activeTab === "reimbursements") {
      navigate("/finance/bills");
    }
  };

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
          if (!isPending) return null;
          const canAct = actionableApprovals.has(row.original.id);
          if (!canAct && !row.original.hasApprovalInstance) return null;
          const isProcessing = approvalProcessingId === row.original.id;
          return (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {canAct && (
                <>
                  <button
                    className="btn btn-icon btn-sm"
                    title="Approve"
                    disabled={isProcessing}
                    onClick={() => approveWorkflowRequest(row.original.id, fetchAttendanceRequests)}
                  >
                    {isProcessing ? (
                      <span className="spinner-border spinner-border-sm text-success" />
                    ) : (
                      <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} alt="" />
                    )}
                  </button>
                  <button
                    className="btn btn-icon btn-sm"
                    title="Reject"
                    disabled={isProcessing}
                    onClick={() => {
                      setApprovalRejectTarget({ requestId: row.original.id, instanceId: actionableApprovals.get(row.original.id)! });
                      setApprovalRejectReason('');
                    }}
                  >
                    <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} alt="" />
                  </button>
                </>
              )}
              {row.original.hasApprovalInstance && (
                <button
                  className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
                  title="Track Approval"
                  onClick={() => openTracker(row.original.id, 'AttendanceRequests')}
                >
                  <KTIcon iconName="map" className="fs-3" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [employeeThresholds, leaveConfiguration, showDateIn12HourFormat, earlyCheckOutThreshold, actionableApprovals, approvalProcessingId, approveWorkflowRequest, fetchAttendanceRequests]
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
          if (!isPending) return null;
          const canAct = actionableApprovals.has(row.original.id);
          if (!canAct && !row.original.hasApprovalInstance) return null;
          const isProcessing = approvalProcessingId === row.original.id;
          return (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {canAct && (
                <>
                  <button
                    className="btn btn-icon btn-sm"
                    title="Approve"
                    disabled={isProcessing}
                    onClick={() => approveWorkflowRequest(row.original.id, fetchLeaveRequests)}
                  >
                    {isProcessing ? (
                      <span className="spinner-border spinner-border-sm text-success" />
                    ) : (
                      <img src={toAbsoluteUrl("media/svg/misc/tick.svg")} alt="" />
                    )}
                  </button>
                  <button
                    className="btn btn-icon btn-sm"
                    title="Reject"
                    disabled={isProcessing}
                    onClick={() => {
                      setApprovalRejectTarget({ requestId: row.original.id, instanceId: actionableApprovals.get(row.original.id)! });
                      setApprovalRejectReason('');
                    }}
                  >
                    <img src={toAbsoluteUrl("media/svg/misc/cross.svg")} alt="" />
                  </button>
                </>
              )}
              {row.original.hasApprovalInstance && (
                <button
                  className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
                  title="Track Approval"
                  onClick={() => openTracker(row.original.id, 'LeaveTracker')}
                >
                  <KTIcon iconName="map" className="fs-3" />
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [leaveTypeColors, actionableApprovals, approvalProcessingId, approveWorkflowRequest, fetchLeaveRequests]
  );

  const reimbursementTotal = useMemo(
    () => reimbursementBatches.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0),
    [reimbursementBatches],
  );

  // Reimbursement batch columns (same as Approval → Reimbursement)
  const reimbursementColumns = useMemo<MRT_ColumnDef<BatchRow>[]>(
    () => [
      {
        accessorKey: 'employeeName',
        header: 'Employee Name',
        size: 200,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }) => {
          const { firstName, lastName } = row.original.employee?.users || {};
          const fullName = [firstName, lastName].filter(Boolean).join(' ');
          return (
            <button
              className='btn btn-link p-0 text-primary fw-semibold fs-7'
              style={{ textDecoration: 'none', cursor: 'pointer' }}
              onClick={() => openBatchDetail(row.original)}
              title='View submission details'
            >
              {fullName || '—'}
            </button>
          );
        },
        Footer: () => <span style={{ fontWeight: 800, color: '#0f172a' }}>TOTAL</span>,
      },
      {
        accessorKey: 'totalAmount',
        header: 'Total Amount (₹)',
        size: 150,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }) => <span className='text-dark fs-7'>₹{fmtAmount(row.original.totalAmount)}</span>,
        Footer: () => <span className='text-dark fw-bold fs-7'>₹{fmtAmount(reimbursementTotal)}</span>,
      },
      {
        accessorKey: 'totalRequests',
        header: 'Total Requests',
        size: 130,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }) => (
          <button
            className='btn btn-link p-0 text-primary fw-semibold fs-7'
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            onClick={() => openBatchDetail(row.original)}
            title='View submission details'
          >
            {row.original.totalRequests}
          </button>
        ),
      },
      {
        accessorKey: 'submittedAt',
        header: 'Submitted On',
        size: 140,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }) => <span className='fs-7'>{fmtDate(row.original.submittedAt)}</span>,
      },
      {
        accessorKey: 'actions',
        header: 'Action',
        size: 160,
        enableSorting: false,
        enableColumnActions: false,
        muiTableHeadCellProps: { sx: { color: "#7a8597", fontSize: "14px", fontWeight: 400 } },
        Cell: ({ row }: any) => {
          const r = row.original as BatchRow;
          const isActionable = actionableApprovals.has(r.id);
          const isProcessing = batchProcessingId === r.id;
          return (
            <div className='d-flex align-items-center gap-1'>
              {isActionable && (
                <>
                  <button
                    type='button'
                    className='btn btn-icon btn-sm'
                    title='Approve'
                    disabled={isProcessing}
                    onClick={(e) => { e.stopPropagation(); handleBatchApprove(r); }}
                  >
                    {isProcessing
                      ? <span className='spinner-border spinner-border-sm text-success' />
                      : <img src={toAbsoluteUrl('media/svg/misc/tick.svg')} alt='Approve' />
                    }
                  </button>
                  <button
                    type='button'
                    className='btn btn-icon btn-sm'
                    title='Reject'
                    disabled={isProcessing}
                    onClick={(e) => { e.stopPropagation(); setBatchRejectTarget(r); }}
                  >
                    <img src={toAbsoluteUrl('media/svg/misc/cross.svg')} alt='Reject' />
                  </button>
                </>
              )}
              <button
                className='btn btn-icon btn-bg-light btn-active-color-info btn-sm'
                title='View Approval Status'
                onClick={(e) => { e.stopPropagation(); openTracker(r.id, 'ReimbursementBatch', r); }}
              >
                <KTIcon iconName='map' className='fs-3' />
              </button>
            </div>
          );
        },
      },
    ],
    [openBatchDetail, openTracker, reimbursementTotal, actionableApprovals, batchProcessingId, handleBatchApprove, setBatchRejectTarget]
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
                borderColor: "#1E3A8A",
                color: "#1E3A8A",
                textTransform: "none",
                fontSize: { xs: "12px", sm: "14px" },
                fontWeight: 500,
                padding: { xs: "8px 12px", sm: "10px 14px" },
                borderRadius: "6px",
                "&:hover": {
                  borderColor: "#1E3A8A",
                  backgroundColor: "rgba(30, 58, 138, 0.04)",
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
                border: activeTab === "attendance" ? "1.5px solid #1E3A8A" : "1px solid #a0b4d2",
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
            {attendanceRequests.length > 0 && (
              <div style={{ position: "absolute", top: "-2px", right: "-1px", width: "10px", height: "11px", backgroundColor: "#b44545", borderRadius: "333px" }} />
            )}
          </div>
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <button
              onClick={() => setActiveTab("leaves")}
              style={{
                padding: "6px 12px",
                borderRadius: "323px",
                border: activeTab === "leaves" ? "1.5px solid #1E3A8A" : "1px solid #a0b4d2",
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
            {openLeaveRequestsFromRedux.length > 0 && (
              <div style={{ position: "absolute", top: "-2px", right: "-1px", width: "10px", height: "11px", backgroundColor: "#b44545", borderRadius: "333px" }} />
            )}
          </div>
          <div style={{ position: "relative", flex: "0 0 auto" }}>
            <button
              onClick={() => setActiveTab("reimbursements")}
              style={{
                padding: "6px 12px",
                borderRadius: "323px",
                border: activeTab === "reimbursements" ? "1.5px solid #1E3A8A" : "1px solid #a0b4d2",
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
            {reimbursementBatches.length > 0 && (
              <div style={{ position: "absolute", top: "-2px", right: "-1px", width: "10px", height: "11px", backgroundColor: "#b44545", borderRadius: "333px" }} />
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
                "& .MuiTableHead-root .MuiTableRow-root .MuiTableCell-root": { backgroundColor: "transparent", borderBottom: "none" },
                "& .MuiTableBody-root .MuiTableRow-root:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                "& .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root": { borderBottom: "none", padding: "12px" },
              },
            }}
            muiTablePaperStyle={{ sx: { boxShadow: "none", border: "none" } }}
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
                "& .MuiTableHead-root .MuiTableRow-root .MuiTableCell-root": { backgroundColor: "transparent", borderBottom: "none" },
                "& .MuiTableBody-root .MuiTableRow-root:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                "& .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root": { borderBottom: "none", padding: "12px" },
              },
            }}
            muiTablePaperStyle={{ sx: { boxShadow: "none", border: "none" } }}
          />
        )}

        {activeTab === "reimbursements" && (
          <MaterialTable
            columns={reimbursementColumns}
            data={reimbursementBatches}
            tableName="PendingReimbursementBatches"
            isLoading={isLoading}
            hideFilters={true}
            hideExportCenter={false}
            hidePagination={true}
            showColumnFooter={true}
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
                "& .MuiTableHead-root .MuiTableRow-root .MuiTableCell-root": { backgroundColor: "transparent", borderBottom: "none" },
                "& .MuiTableBody-root .MuiTableRow-root:hover": { backgroundColor: "rgba(0, 0, 0, 0.02)" },
                "& .MuiTableBody-root .MuiTableRow-root .MuiTableCell-root": { borderBottom: "none", padding: "12px" },
              },
              muiTableBodyRowProps: ({ row }: any) => ({
                onClick: () => openBatchDetail(row.original),
                sx: { cursor: 'pointer' },
              }),
            }}
            muiTablePaperStyle={{ sx: { boxShadow: "none", border: "none" } }}
          />
        )}
      </div>
    </div>

    {/* Batch detail popup */}
    <BatchDetailModal
      batchId={batchDetailId}
      onClose={() => { setBatchDetailId(null); setBatchDetailInstanceId(null); }}
      onBatchActionDone={fetchPendingReimbursementBatches}
      approvalInstanceId={batchDetailInstanceId}
    />

    {/* Batch rejection modal */}
    <RejectReasonModal
      show={!!batchRejectTarget}
      onClose={() => setBatchRejectTarget(null)}
      onConfirm={handleBatchRejectConfirm}
      submitting={batchRejectSubmitting}
      title='Reject Reimbursement Batch'
    />

    {/* Approval tracker for attendance / leaves / reimbursements */}
    <Modal
      show={!!trackingId}
      onHide={() => { setTrackingId(null); setTrackInstanceId(null); setTrackingBatchRow(null); }}
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

    {/* Workflow reject modal for attendance / leaves */}
    <Modal
      show={!!approvalRejectTarget}
      onHide={() => { setApprovalRejectTarget(null); setApprovalRejectReason(''); }}
      centered
      size='lg'
    >
      <Modal.Header closeButton>
        <Modal.Title style={{ fontSize: 16, fontWeight: 700, color: '#181c32' }}>Reject Request</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ padding: '20px 24px' }}>
        <label style={{ fontWeight: 600, fontSize: 13, color: '#181c32', display: 'block', marginBottom: 6 }}>
          Reason for Rejection <span style={{ color: '#f1416c' }}>*</span>
        </label>
        <textarea
          rows={3}
          className='form-control'
          placeholder='Describe why this request is being rejected…'
          value={approvalRejectReason}
          onChange={(e) => setApprovalRejectReason(e.target.value)}
          style={{ resize: 'vertical', fontSize: 13 }}
          disabled={approvalRejectSubmitting}
        />

      </Modal.Body>
      <Modal.Footer style={{ gap: 8 }}>
        <button
          className='btn btn-sm btn-light'
          onClick={() => { setApprovalRejectTarget(null); setApprovalRejectReason(''); }}
          disabled={approvalRejectSubmitting}
        >
          Cancel
        </button>
        <button
          className='btn btn-sm btn-danger d-flex align-items-center gap-2'
          onClick={confirmWorkflowReject}
          disabled={approvalRejectReason.trim().length === 0 || approvalRejectSubmitting}
        >
          {approvalRejectSubmitting && <span className='spinner-border spinner-border-sm' />}
          Confirm Rejection
        </button>
      </Modal.Footer>
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

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  if (!document.head.querySelector('[data-pending-requests-styles]')) {
    styleSheet.setAttribute('data-pending-requests-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}
