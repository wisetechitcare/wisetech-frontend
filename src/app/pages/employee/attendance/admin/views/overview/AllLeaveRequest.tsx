import MaterialTable from "@app/modules/common/components/MaterialTable";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import { deleteLeaveRequestById, fetchApprovalInstanceByRequest } from "@services/employee";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { hasPermission } from "@utils/authAbac";
import { usePermission } from "@hooks/usePermission";
import { fetchLeaveRequest } from "@services/employee";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, Status } from "@constants/statistics";
import { formatDateFromISTString } from "@utils/statistics";
import { pageSize, useServerPagination } from "@hooks/useServerPagination";
import Loader from "@app/modules/common/utils/Loader";
import { fetchColorAndStoreInSlice, generateFiscalYearFromGivenYear } from "@utils/file";
import { Modal } from "react-bootstrap";
import LeaveRequestForm from "@pages/employee/attendance/personal/views/my-leaves/LeaveRequestForm";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";
import dayjs from "dayjs";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
function AllLeaveRequest({ fromAdmin = false }: { fromAdmin?: boolean }) {
    const { filterIds } = useTeamFilter();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const isAdmin = usePermission('approvals.approve.team');
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);

    const dispatch = useDispatch();

    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
    const [trackingLeaveId, setTrackingLeaveId] = useState<string | null>(null);
    const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);

    const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);

    const openTracker = async (leaveId: string) => {
        setTrackingLeaveId(leaveId);
        setTrackInstanceId(null);
        setTrackInstanceLoading(true);
        try {
            const res = await fetchApprovalInstanceByRequest('LeaveTracker', leaveId);
            const instance = res?.data ?? res;
            setTrackInstanceId(instance?.id ?? null);
        } catch {
            setTrackInstanceId(null);
        } finally {
            setTrackInstanceLoading(false);
        }
    };
    const [fiscalYearStart, setFiscalYearStart] = useState<string>('');
    const [fiscalYearEnd, setFiscalYearEnd] = useState<string>('');

    // Calculate fiscal year on mount
    useEffect(() => {
        const calculateFiscalYear = async () => {
            const { startDate, endDate } = await generateFiscalYearFromGivenYear(dayjs());
            setFiscalYearStart(startDate);
            setFiscalYearEnd(endDate);
        };
        calculateFiscalYear();
    }, []);

    // Handler for edit button click
    const handleEditClick = (row: any) => {
        setSelectedLeave(row.original);
        setShowEditModal(true);
    };

    // Handler to close edit modal
    const handleCloseEditModal = async () => {
        setShowEditModal(false);
        setSelectedLeave(null);
        refetch(); // Refresh AllLeaveRequest data

        // Also refresh OpenLeaveRequests by updating Redux state
        const { data: { leaveRequest } } = await fetchLeaveRequest();
        dispatch(saveLeaveRequests(transformLeaveRequests(leaveRequest)));
    };

    // Map leave type names to color keys
    const getLeaveTypeColor = (leaveType: string): string => {
        if (!leaveTypeColors) return '#3498DB'; // default color

        const normalizedType = leaveType?.toLowerCase() || '';

        if (normalizedType.includes('sick')) return leaveTypeColors.sickLeaveColor || '#E74C3C';
        if (normalizedType.includes('casual')) return leaveTypeColors.casualLeaveColor || '#3498DB';
        if (normalizedType.includes('annual')) return leaveTypeColors.annualLeaveColor || '#2ECC71';
        if (normalizedType.includes('maternal') || normalizedType.includes('maternity')) return leaveTypeColors.maternalLeaveColor || '#9B59B6';
        if (normalizedType.includes('floater')) return leaveTypeColors.floaterLeaveColor || '#F39C12';
        if (normalizedType.includes('unpaid')) return leaveTypeColors.unpaidLeaveColor || '#95A5A6';

        return '#3498DB'; // default color
    };

    // Fetch function for server pagination
    const fetchLeaves = useCallback(async (page: number, limit: number) => {
        const { data: { leaveRequest, pagination } } = await fetchLeaveRequest(undefined, undefined, page, limit);

        return {
            data: leaveRequest || [],
            totalRecords: pagination?.totalRecords || leaveRequest?.length || 0,
        };
    }, []);

    // Use the server pagination hook
    const {
        data: leaveRequests,
        pagination,
        totalRecords,
        isLoading,
        isInitialLoading,
        setPagination,
        refetch,
    } = useServerPagination({
        fetchFunction: fetchLeaves,
        initialPageSize: pageSize,
        transformData: transformLeaveRequests,
    });

    const deleteLeaveRequest = async (id: string) => {
        const confirmed = await deleteConfirmation("Leave Request deleted successfully!");
        if (!confirmed) return;
        await deleteLeaveRequestById(id);
        successConfirmation("Leave Request Deleted Successfully");
        refetch();
    };

    useEffect(() => {
        refetch();
    }, [selectedEmployeeId]);

    useEventBus(EVENT_KEYS.leaveRequestCreated, refetch);
    useEventBus(EVENT_KEYS.leaveRequestUpdated, refetch);

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
        fetchColorAndStoreInSlice();
    }, []);

    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: "createdDate",
            header: "CreatedAt",
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue)
        },
        {
            accessorKey: "date",
            header: "Leave Date",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "name",
            header: "Name",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "code",
            header: "Employee Code",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "type",
            header: "Leave Type",
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
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "statusText",
            header: "Status",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "approvedByName",
            header: "Approved / Rejected By",
            Cell: ({ row }: any) => {
                const { statusNumber, approvedByName, rejectedByName, updatedAt } = row.original;
                const isApproved = statusNumber === Status.Approved;
                const isRejected = statusNumber === Status.Rejected;
                const name = isApproved ? approvedByName : isRejected ? rejectedByName : null;
                const date = updatedAt ? dayjs(updatedAt).format('DD MMM YYYY, hh:mm A') : null;

                if (!name) return <span className='text-muted fs-7'>-NA-</span>;

                return (
                    <div className='d-flex align-items-center gap-2'>
                        <div className='symbol symbol-30px'>
                            <span className={`symbol-label fw-bold fs-7 ${isApproved ? 'bg-light-success text-success' : 'bg-light-danger text-danger'}`}>
                                {name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className='d-flex flex-column'>
                            <span className='text-dark fw-semibold fs-7'>{name}</span>
                            {date && <span className='text-muted fs-8'>{date}</span>}
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "actions",
            header: "Actions",
            Cell: ({ row }: any) => {
                const editRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.editOthers);
                const deleteRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.deleteOthers);
                const isApproved = row.original.statusText;
                const pending = row.original.statusNumber === 0;
                const today = new Date();
                const dateTo = new Date(row.original.dateTo);
                const isFutureOrToday = dateTo >= new Date(today.setHours(0, 0, 0, 0));

                return (
                    <div className='d-flex align-items-center gap-1'>
                        {editRes && (
                            <button
                                title="Edit Leave"
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                onClick={() => handleEditClick(row)}
                            >
                                <KTIcon iconName="pencil" className="fs-3" />
                            </button>
                        )}
                        {deleteRes && isApproved && isFutureOrToday && (
                            <button
                                title="Revoke Leave"
                                className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                onClick={() => deleteLeaveRequest(row.original.id)}
                            >
                                <KTIcon iconName="trash" className="fs-3" />
                            </button>
                        )}
                        {pending && row.original.hasApprovalInstance && (
                            <button
                                title="Track Approval"
                                className="btn btn-icon btn-bg-light btn-active-color-info btn-sm"
                                onClick={() => openTracker(row.original.id)}
                            >
                                <KTIcon iconName="map" className="fs-3" />
                            </button>
                        )}
                    </div>
                );
            },
        },
    ], []);

    if (isInitialLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Loader />
            </div>
        );
    }

    const visibleLeaveRequests = filterIds
        ? leaveRequests.filter((l: any) => filterIds.includes(l.employeeId))
        : leaveRequests;

    return (
        <>
            <h3 className='pt-8 fw-bold'>All Leave Requests</h3>
            <MaterialTable
                data={visibleLeaveRequests}
                columns={columns}
                tableName="All Leave Requests"
                resource={resourceNameMapWithCamelCase.leave}
                viewOthers={true}
                viewOwn={true}
                employeeId={employeeIdCurrent}
                manualPagination={true}
                rowCount={totalRecords}
                paginationState={pagination}
                onPaginationChange={setPagination}
                isLoading={isLoading}
            />

            {/* Edit Leave Modal */}
            <Modal
                show={!!trackingLeaveId}
                onHide={() => { setTrackingLeaveId(null); setTrackInstanceId(null); }}
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

            <Modal show={showEditModal} onHide={handleCloseEditModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Leave Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <LeaveRequestForm
                        onClose={handleCloseEditModal}
                        leave={selectedLeave}
                        isAdmin={true}
                        employeeIdProp={selectedLeave?.employeeId}
                        employeeBranchIdProp={selectedLeave?.branchId}
                        dateOfJoiningProp={selectedLeave?.dateOfJoining}
                        startDateNew={fiscalYearStart}
                        endDateNew={fiscalYearEnd}
                    />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default AllLeaveRequest;