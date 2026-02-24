import MaterialTable from "@app/modules/common/components/MaterialTable";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KTIcon } from "@metronic/helpers";
import { deleteConfirmation, successConfirmation } from "@utils/modal";
import { deleteLeaveRequestById } from "@services/employee";
import { saveLeaveRequests } from "@redux/slices/attendance";
import { transformLeaveRequests } from "@pages/employee/attendance/admin/OverviewView";
import { hasPermission } from "@utils/authAbac";
import { fetchLeaveRequest } from "@services/employee";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { formatDateFromISTString } from "@utils/statistics";
import { pageSize, useServerPagination } from "@hooks/useServerPagination";
import Loader from "@app/modules/common/utils/Loader";
import { fetchColorAndStoreInSlice, generateFiscalYearFromGivenYear } from "@utils/file";
import { Modal } from "react-bootstrap";
import LeaveRequestForm from "@pages/employee/attendance/personal/views/my-leaves/LeaveRequestForm";
import dayjs from "dayjs";
function AllLeaveRequest({ fromAdmin = false }: { fromAdmin?: boolean }) {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const isAdmin = useSelector((state: RootState) => state.auth.currentUser.isAdmin);
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const leaveTypeColors = useSelector((state: RootState) => state.customColors?.leaveTypes);

    const dispatch = useDispatch();

    // State for edit modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState<any>(null);
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
            header: "Approved By",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || '-NA-'
        },
        {
            accessorKey: "rejectedByName",
            header: "Rejected By",
            Cell: ({ renderedCellValue }: any) => renderedCellValue || '-NA-'
        },
        {
            accessorKey: "updatedAt",
            header: "Updated At",
            Cell: ({ renderedCellValue }: any) => renderedCellValue ? dayjs(renderedCellValue).format('DD MMM YYYY, hh:mm A') : '-NA-'
        },
        ...(isAdmin
                    ? [{
                        accessorKey: "actions",
                        header: "Actions",
                        Cell: ({ row }: any) => {

                            const editRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.editOthers);
                            const deleteRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.deleteOthers);
                            const isApproved = row.original.statusText;

                            const today = new Date();
                            const dateTo = new Date(row.original.dateTo);
                            const isFutureOrToday = dateTo >= new Date(today.setHours(0, 0, 0, 0));

                            return (
                                <>
                                {/* Edit button - always visible for admin */}
                                {editRes && (
                                  <button
                                    title="Edit Leave"
                                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm me-1"
                                    onClick={() => handleEditClick(row)}
                                  >
                                    <KTIcon iconName="pencil" className="fs-3" />
                                  </button>
                                )}
                                {/* Delete button */}
                                {deleteRes && isApproved && isFutureOrToday && (
                                  <button
                                    title="Revoke Leave"
                                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                                    onClick={() => deleteLeaveRequest(row.original.id)}
                                  >
                                    <KTIcon iconName="trash" className="fs-3 text-red-500" />
                                  </button>
                                )}

                                {(!editRes && (!isApproved || !isFutureOrToday)) && "Not Allowed"}
                              </>

                            );
                        },
                    }]
                    : []),
    ], []);

    if (isInitialLoading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Loader />
            </div>
        );
    }

    return (
        <>
            <h3 className='pt-8 fw-bold'>All Leave Requests</h3>
            <MaterialTable
                data={leaveRequests}
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