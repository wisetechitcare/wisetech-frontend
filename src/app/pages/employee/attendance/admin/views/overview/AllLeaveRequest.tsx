import MaterialTable from "@app/modules/common/components/MaterialTable";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
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
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassDialog, GlassHeader, WtIconButton, IconBox, TRIO, Spinner } from "@app/modules/common/components/ui/tw";
import ApplyLeave from "@pages/employee/attendance/personal/views/my-leaves/ApplyLeave";
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
            Cell: ({ renderedCellValue }: any) => {
                const c = getLeaveTypeColor(renderedCellValue);
                return (
                    <span
                        className="inline-block min-w-[60px] text-center font-bold text-[11px] px-2 py-1 rounded-full border"
                        style={{ color: c, backgroundColor: `${c}1a`, borderColor: `${c}3d` }}
                    >
                        {renderedCellValue}
                    </span>
                );
            }
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

                if (!name) return <span className="text-slate-400 text-[12.5px]">-NA-</span>;

                const trio = isApproved ? TRIO.green : TRIO.rose;
                return (
                    <div className="flex items-center gap-2">
                        <div
                            className="w-[30px] h-[30px] rounded-lg shrink-0 grid place-items-center font-extrabold text-[12.5px]"
                            style={{ color: trio.c, backgroundColor: trio.bg, borderColor: trio.bd, borderWidth: 1, borderStyle: 'solid' }}
                        >
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-slate-900 font-semibold text-[12.5px] leading-[1.3]">{name}</span>
                            {date && <span className="text-slate-500 text-[11px]">{date}</span>}
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
                    <div className="flex items-center gap-1.5">
                        {editRes && (
                            <WtIconButton title="Edit Leave" color={TRIO.blue.c} onClick={() => handleEditClick(row)} size={34}>
                                <KTIcon iconName="pencil" className="fs-4" />
                            </WtIconButton>
                        )}
                        {deleteRes && isApproved && isFutureOrToday && (
                            <WtIconButton title="Revoke Leave" color={TRIO.rose.c} onClick={() => deleteLeaveRequest(row.original.id)} size={34}>
                                <KTIcon iconName="trash" className="fs-4" />
                            </WtIconButton>
                        )}
                        {pending && row.original.hasApprovalInstance && (
                            <WtIconButton title="Track Approval" color={TRIO.cyan.c} onClick={() => openTracker(row.original.id)} size={34}>
                                <KTIcon iconName="map" className="fs-4" />
                            </WtIconButton>
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
            <div className="pt-6 mb-2.5 flex items-center gap-3">
                <IconBox icon="document" trio={TRIO.blue} size={44} fs="fs-1" />
                <span className="font-bold text-[20px] text-slate-900">All Leave Requests</span>
            </div>
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

            {/* Approval-status tracker */}
            <GlassDialog
                open={!!trackingLeaveId}
                onClose={() => { setTrackingLeaveId(null); setTrackInstanceId(null); }}
                maxWidth="md"
                fullWidth
            >
                <GlassHeader
                    title="Approval Status"
                    icon={<KTIcon iconName="map" className="fs-1 text-white" />}
                    onClose={() => { setTrackingLeaveId(null); setTrackInstanceId(null); }}
                />
                <div className="p-4 sm:p-6">
                    {trackInstanceLoading ? (
                        <div className="text-center py-5 flex items-center justify-center gap-2">
                            <Spinner size={16} />
                            <p className="text-[13px] text-slate-500 m-0">Loading approval status…</p>
                        </div>
                    ) : trackInstanceId ? (
                        <ApprovalStatusTracker instanceId={trackInstanceId} showAuditLog />
                    ) : (
                        <div className="text-center py-5">
                            <KTIcon iconName="information" className="fs-3x text-muted mb-3" />
                            <p className="text-[13px] text-slate-500 m-0">No approval workflow found for this request.</p>
                        </div>
                    )}
                </div>
            </GlassDialog>

            {/* Admin edit — the shared canonical ApplyLeave modal (edit mode) on behalf of the
                employee via `target`. Owns its own card chrome, so we provide the backdrop. */}
            {showEditModal && selectedLeave && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) handleCloseEditModal(); }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,.45)', display: 'flex',
                        alignItems: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex-end' : 'center',
                        justifyContent: 'center', padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : 24, overflowY: 'auto',
                    }}
                >
                    <ApplyLeave
                        mode="edit"
                        onClose={handleCloseEditModal}
                        existing={{
                            id: (selectedLeave as any)?.id,
                            dateFrom: (selectedLeave as any)?.dateFrom ? dayjs((selectedLeave as any).dateFrom).format('YYYY-MM-DD') : '',
                            dateTo: (selectedLeave as any)?.dateTo ? dayjs((selectedLeave as any).dateTo).format('YYYY-MM-DD') : '',
                            reason: (selectedLeave as any)?.reason ?? '',
                            isHalfDay: (selectedLeave as any)?.isHalfDay,
                            halfDaySession: (selectedLeave as any)?.halfDaySession ?? null,
                            status: (selectedLeave as any)?.statusNumber ?? (selectedLeave as any)?.status,
                        }}
                        target={{
                            employeeId: (selectedLeave as any)?.employeeId,
                            branchId: (selectedLeave as any)?.branchId,
                            dateOfJoining: (selectedLeave as any)?.dateOfJoining,
                        }}
                    />
                </div>
            )}
        </>
    );
}

export default AllLeaveRequest;