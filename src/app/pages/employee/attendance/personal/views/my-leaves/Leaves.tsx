import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useEffect, useMemo, useState } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { ILeaves } from "@models/employee";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";

import { deleteLeaveRequestById, fetchEmployeeLeaves, fetchApprovalInstanceByRequest } from "@services/employee";
import { transformLeaves } from "../../OverviewView";
import { Modal } from "react-bootstrap";
import LeaveRequestForm from "./LeaveRequestForm";
import { deleteConfirmation } from "@utils/modal";
import { savePersonalLeaves } from "@redux/slices/leaves";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, Status } from "@constants/statistics";
import { FormattedDate } from "react-intl";
import dayjs, { Dayjs } from "dayjs";
import { formatDateFromISTString } from "@utils/statistics";
import { fetchColorAndStoreInSlice } from "@utils/file";
import ApprovalStatusTracker from "@app/pages/approvals/ApprovalStatusTracker";

function Leaves({ fromAdmin = false, resource, viewOwn=false, viewOthers=false, startDateNew, endDateNew }: { fromAdmin?: boolean, resource?: string, viewOwn?: boolean, viewOthers?: boolean, startDateNew?: string|Dayjs, endDateNew?: string|Dayjs }) {

      const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);


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
      useEffect(() => {
            fetchColorAndStoreInSlice();
        }, []);
    const columns = useMemo<MRT_ColumnDef<ILeaves>[]>(() => [
        {
            accessorKey: 'createdAt',
            header: 'Created At',
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue)
        },
        {
            accessorKey: "date",
            header: "Leave Date",
            Cell: ({ row }: any) => (
                <div>
                    <div className='fw-semibold fs-7'>{row.original.date}</div>
                    <div className='text-muted fs-8'>{row.original.day}</div>
                </div>
            )
        },
        {
            accessorKey: "totalDays",
            header: "Total Days",
            Cell: ({ row }: any) => {
                const { dateFrom, dateTo, isHalfDay, halfDaySession } = row.original;
                if (!dateFrom || !dateTo) return <span className='text-muted fs-7'>-</span>;
                if (isHalfDay) {
                    const session = String(halfDaySession || '').toUpperCase();
                    return (
                        <span className='badge badge-light-primary fw-bold fs-8'>
                            ½ day{session === 'AM' || session === 'PM' ? ` (${session})` : ''}
                        </span>
                    );
                }
                const days = dayjs(dateTo).diff(dayjs(dateFrom), 'day') + 1;
                return (
                    <span className='badge badge-light-primary fw-bold fs-8'>
                        {days} {days === 1 ? 'day' : 'days'}
                    </span>
                );
            }
        },
        {
            accessorKey: "type",
            header: "Type",
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
            header: "Remark",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "status",
            header: "Status",
            Cell: ({ row }: any) => {
                const { statusNumber, status } = row.original;
                const isApproved = statusNumber === Status.Approved;
                const isRejected = statusNumber === Status.Rejected;
                const badgeClass = isApproved
                    ? 'badge-light-success text-success'
                    : isRejected
                    ? 'badge-light-danger text-danger'
                    : 'badge-light-warning text-warning';
                return <span className={`badge ${badgeClass} fw-bold fs-7`}>{status}</span>;
            }
        },
        {
            accessorKey: "approvedByName",
            header: "Approved / Rejected By",
            Cell: ({ row }: any) => {
                const { statusNumber, approvedByName, rejectedByName, updatedAt } = row.original;
                const isApproved = statusNumber === Status.Approved;
                const isRejected = statusNumber === Status.Rejected;
                const name = isApproved ? approvedByName : isRejected ? rejectedByName : null;

                if (!name) return <span className='text-muted fs-7'>-NA-</span>;

                const date = updatedAt ? dayjs(updatedAt).format('DD MMM YYYY, hh:mm A') : null;

                return (
                    <div className='d-flex align-items-center gap-2'>
                        <div className='symbol symbol-30px flex-shrink-0'>
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
        ...(!fromAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => {
                    const editRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.editOwn);
                    const deleteRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.deleteOwn);
                    
                    const isApproved = row.original.statusNumber === Status.Approved;
                    const isRejected = row.original.statusNumber === Status.Rejected;
                    const isPending = !isApproved && !isRejected;
                    return (
                        <>
                            {editRes && !isApproved && <button
                                className='btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                onClick={() => handleShowLeaveRequestForm(row)}
                            >
                                <KTIcon iconName='pencil' className='fs-3' />
                            </button>}
                            {deleteRes && !isApproved && <button
                                className='ms-2 btn btn-icon btn-bg-light btn-active-color-primary btn-sm'
                                onClick={() => deleteLeaveRequest(row.original.id)}
                            >
                                <KTIcon iconName='trash' className='fs-3' />
                            </button>}
                            {isPending && row.original.hasApprovalInstance && (
                                <button
                                    className='ms-2 btn btn-icon btn-bg-light btn-active-color-info btn-sm'
                                    title='Track Approval'
                                    onClick={() => openTracker(row.original.id)}
                                >
                                    <KTIcon iconName='map' className='fs-3' />
                                </button>
                            )}
                            {((!editRes && !deleteRes) || isApproved) && !row.original.id && "Not Allowed"}
                        </>
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

    
    const [leave, setLeave] = useState();
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);
    const [isFetchingLeaves, setIsFetchingLeaves] = useState(false);
    const [trackInstanceId, setTrackInstanceId] = useState<string | null>(null);
    const [trackingLeaveId, setTrackingLeaveId] = useState<string | null>(null);
    const [trackInstanceLoading, setTrackInstanceLoading] = useState(false);

    async function fetchLeaves() {
        if (!selectedEmployeeId) return;
        setIsFetchingLeaves(true);
        try {
            const { data: { leaves } } = await fetchEmployeeLeaves(selectedEmployeeId);
            const personalLeaves = transformLeaves(leaves);
            dispatch(savePersonalLeaves(personalLeaves));
        } catch (err) {
            console.error('Error fetching leaves:', err);
            dispatch(savePersonalLeaves([]));
        } finally {
            setIsFetchingLeaves(false);
        }
    }

    const handleShowLeaveRequestForm = async (row: any) => {
        setLeave(row.original);
        setShowLeaveRequestForm(true);
    };

    const handleCloseLeaveRequestForm = () => {
        setShowLeaveRequestForm(false);
    };

    const deleteLeaveRequest = async (id: string) => {
        const sure = await deleteConfirmation('Leave Request Deleted Successfully');
        if(sure) {
            await deleteLeaveRequestById(id);
            fetchLeaves();
        }
    };

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

    useEffect(() => {
        fetchLeaves();
    }, [selectedEmployeeId]);

    return (
        <>
            <MaterialTable
                columns={columns}
                data={filteredLeaves}
                tableName="Leaves"
                resource={fromAdmin ? "" : resource}
                viewOwn={viewOwn}
                viewOthers={viewOthers}
                employeeId={employeeIdCurrent}
                isLoading={isFetchingLeaves || !datesReady}
            />

            <Modal
                show={showLeaveRequestForm}
                onHide={handleCloseLeaveRequestForm}
                centered
                size="lg"
                scrollable
                dialogClassName="lrc-leave-modal"
                contentClassName="lrc-leave-modal__content"
            >
                <Modal.Header closeButton className="lrc-leave-modal__header">
                    <Modal.Title>Edit Leave Request</Modal.Title>
                </Modal.Header>
                <Modal.Body className="lrc-leave-modal__body">
                    <LeaveRequestForm
                        onClose={handleCloseLeaveRequestForm}
                        leave={leave}
                        startDateNew={startDate}
                        endDateNew={endDate}
                    />
                </Modal.Body>
            </Modal>

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
        </>
    );
}

export default Leaves;
