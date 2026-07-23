import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useEffect, useMemo, useState } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { ILeaves } from "@models/employee";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";

import { deleteLeaveRequestById, deleteLeaveSegment, fetchEmployeeLeaves, fetchEmployeeLeavesGrouped, fetchApprovalInstanceByRequest, type GroupedLeaveRequest } from "@services/employee";
import { transformLeaves } from "../../OverviewView";
import LeaveSegmentChips, { useLeaveTypeColor } from "@app/modules/common/components/LeaveSegmentChips";
import { rgba } from "@utils/leaveTypeColors";
import ApplyLeave, { type ExistingLeaveView } from "./ApplyLeave";
import { fromGroupedLeave } from "./toExistingLeaveView";
// Shared glass UI kit — single source of truth for the leave-management look.
import { GlassDialog, GlassHeader, WtIconButton, StatusBadge, Spinner, TRIO, type Trio } from "@app/modules/common/components/ui/tw";
import { deleteConfirmation } from "@utils/modal";
import { savePersonalLeaves } from "@redux/slices/leaves";
import { getSocket } from "@utils/socketClient";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, Status } from "@constants/statistics";
import { FormattedDate } from "react-intl";
import dayjs, { Dayjs } from "dayjs";
import { formatDateFromISTString } from "@utils/statistics";
import { fetchColorAndStoreInSlice } from "@utils/file";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";

function Leaves({ fromAdmin = false, resource, viewOwn=false, viewOthers=false, startDateNew, endDateNew }: { fromAdmin?: boolean, resource?: string, viewOwn?: boolean, viewOthers?: boolean, startDateNew?: string|Dayjs, endDateNew?: string|Dayjs }) {

    useEffect(() => {
        fetchColorAndStoreInSlice();
    }, []);
    const columns = useMemo<MRT_ColumnDef<GroupedLeaveRequest>[]>(() => [
        {
            accessorKey: 'createdAt',
            header: 'Created At',
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue)
        },
        {
            accessorKey: "dateFrom",
            header: "Leave Date",
            Cell: ({ row }: any) => {
                const g = row.original as GroupedLeaveRequest;
                if (!g.dateFrom) return <span className='text-muted fs-7'>-</span>;
                const from = dayjs(g.dateFrom), to = dayjs(g.dateTo || g.dateFrom);
                const isRange = !!g.dateTo && g.dateTo !== g.dateFrom;
                return (
                    <div>
                        <div className='fw-semibold fs-7'>{from.format('DD MMM, YYYY')}{isRange ? ` - ${to.format('DD MMM, YYYY')}` : ''}</div>
                        <div className='text-muted fs-8'>{from.format('ddd')}{isRange ? ` - ${to.format('ddd')}` : ''}</div>
                    </div>
                );
            }
        },
        {
            accessorKey: "totalDays",
            header: "Total Days",
            Cell: ({ row }: any) => {
                const g = row.original as GroupedLeaveRequest;
                if (g.isHalfDay && !g.isGroup) {
                    const session = String(g.halfDaySession || '').toUpperCase();
                    return <StatusBadge trio={TRIO.blue} label={`½ day${session === 'AM' || session === 'PM' ? ` (${session})` : ''}`} />;
                }
                return <StatusBadge trio={TRIO.blue} label={`${g.totalDays} ${g.totalDays === 1 ? 'day' : 'days'}`} />;
            }
        },
        {
            accessorKey: "subType",
            header: "Type",
            Cell: ({ row }: any) => {
                const g = row.original as GroupedLeaveRequest;
                // Single request → show its REAL leave type (old/existing data displays unchanged).
                if (!g.isGroup) return <LeaveSegmentChips singleType={g.segments[0]?.leaveType ?? g.subType} />;
                // Multi-segment auto-allocated group → one summary chip; per-type breakdown in the detail modal.
                return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: 'rgba(30,58,138,0.06)', border: '1px solid rgba(30,58,138,0.18)', fontSize: 12, fontWeight: 700, color: '#1E3A8A', whiteSpace: 'nowrap' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(135deg,#2F5E8C,#C2606B,#3E8E6E)' }} />
                        Auto-Paid
                    </span>
                );
            }
        },
        {
            accessorKey: "reason",
            header: "Remark",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ row }: any) => {
                const g = row.original as GroupedLeaveRequest;
                const isApproved = g.status === Status.Approved;
                const isRejected = g.status === Status.Rejected;
                const label = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Approval Pending';
                const trio: Trio = isApproved ? TRIO.green : isRejected ? TRIO.rose : TRIO.amber;
                return <StatusBadge trio={trio} label={label} pulse={!isApproved && !isRejected} />;
            }
        },
        {
            accessorKey: "approvedByName",
            header: "Approved / Rejected By",
            Cell: ({ row }: any) => {
                const g = row.original as GroupedLeaveRequest;
                const isApproved = g.status === Status.Approved;
                const isRejected = g.status === Status.Rejected;
                const name = isApproved ? g.approvedByName : isRejected ? g.rejectedByName : null;
                if (!name) return <span className="text-slate-400 text-[12.5px]">-NA-</span>;
                const trio: Trio = isApproved ? TRIO.green : TRIO.rose;
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-[30px] h-[30px] rounded-lg shrink-0 grid place-items-center font-extrabold text-[12.5px] border"
                            style={{ color: trio.c, backgroundColor: trio.bg, borderColor: trio.bd }}>
                            {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <p className="text-slate-900 font-semibold text-[12.5px] leading-tight m-0">{name}</p>
                            {g.actedAt && (
                                <p className="text-slate-500 text-[11px] m-0">{formatDateFromISTString(g.actedAt)}</p>
                            )}
                        </div>
                    </div>
                );
            }
        },
        ...(!fromAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => {
                    const g = row.original as GroupedLeaveRequest;
                    const editRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.editOwn);
                    const deleteRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.deleteOwn);
                    const isPending = g.status !== Status.Approved && g.status !== Status.Rejected;
                    return (
                        <div className="flex items-center gap-1.5">
                            {/* Lifecycle-gated: canEdit/canDelete are false once the 1st approver acts.
                                Editing a group re-allocates the whole request (backend group-aware). */}
                            {editRes && g.canEdit && (
                                <WtIconButton title='Edit' color={TRIO.blue.c} size={34}
                                    onClick={(e) => { e.stopPropagation(); setDetailGroup(g); setDetailMode('edit'); }}>
                                    <KTIcon iconName='pencil' className='fs-4' />
                                </WtIconButton>
                            )}
                            {deleteRes && g.canDelete && (
                                <WtIconButton title={g.isGroup ? 'Delete whole request' : 'Delete'} color={TRIO.rose.c} size={34}
                                    onClick={(e) => { e.stopPropagation(); deleteLeaveRequest(g.segments[0]?.id ?? g.groupId); }}>
                                    <KTIcon iconName='trash' className='fs-4' />
                                </WtIconButton>
                            )}
                            {isPending && g.hasApprovalInstance && (
                                <WtIconButton title='Track Approval' color={TRIO.cyan.c} size={34}
                                    onClick={(e) => { e.stopPropagation(); openTracker(g); }}>
                                    <KTIcon iconName='map' className='fs-4' />
                                </WtIconButton>
                            )}
                        </div>
                    );
                },
            }]
            : []),
    ], []);

    const dispatch = useDispatch();
    const selectedEmployeeLeaves = useSelector((state: RootState) => state.leaves.personalLeaves); 
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id); 
    
    // datesReady: true once the parent has resolved the fiscal-year start/end strings.
    // When false (e.g. IndividualView is still awaiting fetchDateSettings), we show the
    // MRT loading skeleton rather than "No records to display" — this fixes the race
    // condition where the admin view briefly (or permanently) renders an empty table.
    const startDate = startDateNew?.toString();
    const endDate = endDateNew?.toString();
    const dateRange = startDate && endDate ? { startDate, endDate } : null;
    const datesReady = Boolean(dateRange);

    const filteredLeaves = dateRange
        ? selectedEmployeeLeaves.filter((leave: any) => {
            const leaveDate = leave.dateFrom || leave.dateTo;
            return leaveDate && leaveDate >= dateRange.startDate && leaveDate <= dateRange.endDate;
          })
        : [];

    
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const [isFetchingLeaves, setIsFetchingLeaves] = useState(false);
    const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
    const [trackingLeaveId, setTrackingLeaveId] = useState<string | null>(null);
    const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);
    // Grouped rows for THIS table only — fetched from the backend grouped endpoint (single source
    // of truth for segments/totals). We do NOT reshape the shared `personalLeaves` slice, which 6
    // other screens render from (see [[apply_leave_self_sufficient]]); it stays flat below.
    const [groupedRows, setGroupedRows] = useState<GroupedLeaveRequest[]>([]);
    // Row-click detail modal (shows the full per-type allocation breakdown + a colour-coded calendar).
    const [detailGroup, setDetailGroup] = useState<GroupedLeaveRequest | null>(null);
    const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
    const leaveColor = useLeaveTypeColor();

    // Map a grouped row → the shape ApplyLeave's view/edit modes consume. The mapper is shared with
    // the approval queue (see toExistingLeaveView.ts) so both routes feed ApplyLeave identically.
    const toExisting = (g: GroupedLeaveRequest): ExistingLeaveView => fromGroupedLeave(g as any);

    async function fetchLeaves() {
        if (!selectedEmployeeId) return;
        setIsFetchingLeaves(true);
        try {
            // Flat rows → shared slice (unchanged, for the 6 other consumers).
            const { data: { leaves } } = await fetchEmployeeLeaves(selectedEmployeeId);
            dispatch(savePersonalLeaves(transformLeaves(leaves)));
            // Grouped rows → local state (this table renders one row per requestGroupId).
            const { groups } = await fetchEmployeeLeavesGrouped(selectedEmployeeId);
            setGroupedRows(groups);
        } catch (err) {
            console.error('Error fetching leaves:', err);
            dispatch(savePersonalLeaves([]));
            setGroupedRows([]);
        } finally {
            setIsFetchingLeaves(false);
        }
    }

    const deleteLeaveRequest = async (id: string) => {
        const sure = await deleteConfirmation('Leave Request Deleted Successfully');
        if(sure) {
            await deleteLeaveRequestById(id); // group-aware on the backend — cascades to all segments
            fetchLeaves();
        }
    };

    // Per-segment delete: remove ONE segment from a group (the rest survive). Backend uses
    // ?scope=segment. Only offered while the segment is still pending and the group has >1 segment.
    const handleDeleteSegment = async (segmentId: string) => {
        const sure = await deleteConfirmation('Segment removed from the request');
        if (sure) {
            await deleteLeaveSegment(segmentId);
            await fetchLeaves();
            setDetailGroup(null);
        }
    };

    const openTracker = async (g: GroupedLeaveRequest) => {
        // A grouped request resolves via its LeaveRequestGroup instance (keyed by requestGroupId);
        // a single via LeaveTracker (keyed by the row id).
        const model = g.isGroup ? 'LeaveRequestGroup' : 'LeaveTracker';
        const reqId = g.isGroup ? g.groupId : (g.segments[0]?.id ?? g.groupId);
        setTrackingLeaveId(reqId);
        setTrackInstanceId(null);
        setTrackInstanceLoading(true);
        try {
            const res = await fetchApprovalInstanceByRequest(model, reqId);
            const instance = res?.data ?? res;
            setTrackInstanceId(instance?.id ?? null);
        } catch {
            setTrackInstanceId(null);
        } finally {
            setTrackInstanceLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, [selectedEmployeeId]);

    // Realtime: refresh My Leaves live when an approver approves/rejects, a request is cancelled,
    // or any leave request is applied/edited/deleted anywhere — the backend emits these to the
    // requester's room.
    useEffect(() => {
        const socket = getSocket();
        const handler = () => fetchLeaves();
        socket.on('approval:updated', handler);
        socket.on('approval:cancelled', handler);
        socket.on('leaveRequests:updated', handler);
        return () => {
            socket.off('approval:updated', handler);
            socket.off('approval:cancelled', handler);
            socket.off('leaveRequests:updated', handler);
        };
    }, [selectedEmployeeId]);

    // Same date-window filter as before, applied to the grouped rows (by the request's start date).
    const filteredGroups = dateRange
        ? groupedRows.filter((g) => {
            const d = g.dateFrom || g.dateTo;
            return d && d >= dateRange.startDate && d <= dateRange.endDate;
          })
        : [];

    return (
        <>
            <MaterialTable
                columns={columns}
                data={filteredGroups}
                tableName="Leaves"
                resource={fromAdmin ? "" : resource}
                viewOwn={viewOwn}
                viewOthers={viewOthers}
                employeeId={employeeIdCurrent}
                isLoading={isFetchingLeaves || !datesReady}
                muiTableProps={{
                    muiTableBodyRowProps: ({ row }: any) => (fromAdmin ? {} : {
                        onClick: () => { setDetailGroup(row.original as GroupedLeaveRequest); setDetailMode('view'); },
                        sx: { cursor: 'pointer' },
                    }),
                }}
            />

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
                            <KTIcon iconName='information' className='fs-3x text-muted mb-3' />
                            <p className="text-[13px] text-slate-500 m-0">No approval workflow found for this request.</p>
                        </div>
                    )}
                </div>
            </GlassDialog>


            {/* View AND edit both use the SAME canonical Apply-Leave modal (mode-driven). It owns
                its own card chrome, so we provide the backdrop (as MyLeaveView does). */}
            {detailGroup && (
                <div
                    onClick={(e) => { if (e.target === e.currentTarget) { setDetailGroup(null); fetchLeaves(); } }}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,.45)', display: 'flex',
                        alignItems: (typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex-end' : 'center',
                        justifyContent: 'center', padding: (typeof window !== 'undefined' && window.innerWidth < 768) ? 0 : 24, overflowY: 'auto',
                    }}
                >
                    <ApplyLeave
                        mode={detailMode}
                        existing={toExisting(detailGroup)}
                        onEdit={() => setDetailMode('edit')}
                        onDeleteSegment={(id) => { handleDeleteSegment(id); setDetailGroup(null); }}
                        onClose={() => { setDetailGroup(null); fetchLeaves(); }}
                    />
                </div>
            )}
        </>
    );
}

export default Leaves;
