import MaterialTable from "@app/modules/common/components/MaterialTable";
import EmployeeIdentityCell from "@app/modules/common/components/EmployeeIdentityCell";
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
import { useFocusTrap } from "@hooks/useFocusTrap";
import Loader from "@app/modules/common/utils/Loader";
import { fetchColorAndStoreInSlice, generateFiscalYearFromGivenYear } from "@utils/file";
// Tailwind UI kit (tw/) — the re-platformed glass design system, zero MUI.
import { GlassDialog, GlassHeader, WtIconButton, IconBox, TRIO, StatusBadge, Spinner, type Trio } from "@app/modules/common/components/ui/tw";
import { LeaveStatus } from "@constants/attendance";

/**
 * Status → tone. Approved reads as settled (green), anything still awaiting a human
 * is amber, rejected is rose, and revoked is deliberately neutral: it is a withdrawn
 * request, not a refused one, and colouring it like a rejection misreports it.
 */
const LEAVE_STATUS_TRIO: Record<LeaveStatus, Trio> = {
    [LeaveStatus.ApprovalPending]: TRIO.amber,
    [LeaveStatus.PendingHR]: TRIO.amber,
    [LeaveStatus.Approved]: TRIO.green,
    [LeaveStatus.Rejected]: TRIO.rose,
    [LeaveStatus.Revoked]: TRIO.slate,
};
import ApplyLeave from "@pages/employee/attendance/personal/views/my-leaves/ApplyLeave";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";
import dayjs from "dayjs";
import { useTeamFilter } from '@/contexts/TeamFilterContext';
import type { PeriodRange } from "@app/modules/common/components/PeriodFilter";
import { toPeriodParams, periodKey } from "@utils/periodRange";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";

interface AllLeaveRequestProps {
    fromAdmin?: boolean;
    /**
     * Overview's Daily/Weekly/Monthly selection. Omit (or pass null) to list all time —
     * which is what the personal/non-Overview usages want.
     */
    range?: PeriodRange | null;
    /**
     * Hide employees flagged inactive. The Overview passes this so every table matches
     * its stat cards; personal views leave it off so someone's own history stays intact.
     */
    activeOnly?: boolean;
}

function AllLeaveRequest({ fromAdmin = false, range = null, activeOnly = false }: AllLeaveRequestProps) {
    const { filterIds } = useTeamFilter();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const isAdmin = usePermission('approvals.approve.team');
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);
    const allEmployees = useSelector((state: RootState) => state.allEmployees?.list);

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

    // Accessible-dialog behaviour for the hand-rolled edit overlay.
    const editDialogRef = useFocusTrap<HTMLDivElement>(showEditModal && !!selectedLeave, { onEscape: () => { void handleCloseEditModal(); } });

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

    // Selected Overview period → wire params. Filtering is SERVER-side: this table is
    // paginated, so narrowing a ten-row page in the browser would leave the count and
    // the page contents disagreeing, and rows outside page 1 unfiltered entirely.
    const periodParams = useMemo(() => toPeriodParams(range), [range]);
    // Primitive identity for the window — `range` is rebuilt (with fresh Dayjs objects)
    // on every PeriodFilter render, so depending on it directly would refetch forever.
    // Both server-side filters live in the reset key: changing either can shrink the
    // result set, and staying on page 5 of a now-one-page list renders empty.
    const rangeKey = useMemo(() => `${periodKey(range)}|${activeOnly ? 'active' : 'all'}`, [range, activeOnly]);

    // Sorting is server-side for the same reason paging and filtering are: `data` holds
    // one page, so sorting it in the browser reorders ten rows while the header implies
    // the whole queue. The table reports the resolved sort via onSortingChange.
    const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([]);
    const sortKey = sorting.length ? `${sorting[0].id}:${sorting[0].desc}` : '';

    // Fetch function for server pagination
    const fetchLeaves = useCallback(async (page: number, limit: number) => {
        // activeOnly is server-side for the same reason the period is: filtering a
        // ten-row page in the browser would leave the total count claiming rows the
        // table refuses to show.
        const { data: { leaveRequest, pagination } } = await fetchLeaveRequest(undefined, undefined, page, limit, periodParams, activeOnly, sorting[0]);

        return {
            data: leaveRequest || [],
            totalRecords: pagination?.totalRecords || leaveRequest?.length || 0,
        };
    }, [periodParams, activeOnly, sorting]);

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
        // Changing the period OR the sort must snap back to page 1 — see the hook's docs.
        // Re-sorting while on page 5 would otherwise ask for page 5 of a reordered set,
        // which is a different ten rows than the user expects to land on.
        resetKey: `${rangeKey}|${sortKey}`,
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

    // Realtime. The server already broadcast `leaveRequests:updated` on every leave
    // mutation and useRealtimeSync already bridged it to the eventBus — this table just
    // never listened, so an approval by anyone (including the approver's own action from
    // a different surface) stayed invisible until the whole app was reloaded.
    useEventBus(EVENT_KEYS.leaveRequestUpdated, () => { refetch(); });

    useEffect(() => {
        dispatch(fetchRolesAndPermissions() as any);
        fetchColorAndStoreInSlice();
    }, []);

    const columns = useMemo<MRT_ColumnDef<any>[]>(() => [
        {
            accessorKey: "name",
            header: "Employee",
            size: 220,
            minSize: 180,
            maxSize: 280,
            Cell: ({ row }: any) => (
                <EmployeeIdentityCell
                    name={row.original.name}
                    code={row.original.code}
                    avatarUrl={allEmployees?.find((e: any) => e.employeeId === row.original.employeeId)?.avatar}
                />
            ),
        },
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
            accessorKey: "type",
            header: "Leave Type",
            // Not sortable: the server resolves leave type AFTER the query, so it is absent from
            // LEAVE_REQUEST_SPEC.sort (handlers/employees.ts). Leaving the header clickable meant a
            // full round trip that provably returned the same order — a wait that produces nothing.
            enableSorting: false,
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
            // Not sortable server-side — see the note on "type".
            enableSorting: false,
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "statusText",
            header: "Status",
            size: 150,
            // Was raw text in a table where every other categorical column is a badge,
            // so status — the column an admin actually scans this table for — was the
            // one thing with no visual weight. Keyed off the numeric status, not the
            // label: matching on display strings breaks the moment one is reworded.
            Cell: ({ row }: any) => {
                const trio = LEAVE_STATUS_TRIO[row.original.statusNumber as LeaveStatus] ?? TRIO.slate;
                return <StatusBadge trio={trio} label={row.original.statusText || '—'} />;
            }
        },
        {
            accessorKey: "approvedByName",
            header: "Approved / Rejected By",
            // Approver name comes from a second lookup, so the server cannot sort on it.
            enableSorting: false,
            // Without an explicit width this column collapsed to roughly the header's
            // size, so a two-word name wrapped to two lines AND the timestamp wrapped
            // to two more — four lines in a 52px row. Sized to hold "Firstname
            // Lastname" plus the timestamp on one line each.
            size: 210,
            minSize: 180,
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
                        {/* Both lines truncate rather than wrap: a long name must not be
                            able to grow this cell past the row height. `min-w-0` on the
                            flex child is what actually lets truncate work — without it a
                            flex item refuses to shrink below its content. */}
                        <div className="flex flex-col min-w-0">
                            <span
                                className="text-slate-900 font-semibold text-[12.5px] leading-[1.3] truncate"
                                title={name}
                            >
                                {name}
                            </span>
                            {date && (
                                <span className="text-slate-500 text-[11px] leading-[1.3] truncate" title={date}>
                                    {date}
                                </span>
                            )}
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
                persistPreferences={false}
                resource={resourceNameMapWithCamelCase.leave}
                viewOthers={true}
                viewOwn={true}
                employeeId={employeeIdCurrent}
                manualPagination={true}
                manualSorting={true}
                onSortingChange={setSorting}
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
                    ref={editDialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Edit leave request"
                    tabIndex={-1}
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