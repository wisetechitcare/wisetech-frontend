import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useEffect, useMemo, useState } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { ILeaves } from "@models/employee";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { deleteLeaveRequestById, fetchEmployeeLeaves } from "@services/employee";
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
            header: 'CreatedAt',
            Cell: ({ renderedCellValue }: any) => formatDateFromISTString(renderedCellValue)
        },          
        {   
            accessorKey: "date",
            header: "Leave Date",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
        },
        {
            accessorKey: "day",
            header: "Day",
            Cell: ({ renderedCellValue }: any) => renderedCellValue
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
            Cell: ({ renderedCellValue }: any) => renderedCellValue ? formatDateFromISTString(renderedCellValue) : '-NA-'
        },
        ...(!fromAdmin
            ? [{
                accessorKey: "actions",
                header: "Actions",
                Cell: ({ row }: any) => {
                    const editRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.editOwn);
                    const deleteRes = hasPermission(resourceNameMapWithCamelCase.leave, permissionConstToUseWithHasPermission.deleteOwn);
                    
                    const isApproved = row.original.statusNumber === Status.Approved;
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
                            {((!editRes && !deleteRes) || isApproved) && "Not Allowed"}
                            
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
    const datesReady = Boolean(startDateNew && endDateNew);

    const filteredLeaves = datesReady
        ? selectedEmployeeLeaves.filter((leave: any) => {
            const leaveDate = leave.dateFrom || leave.dateTo;
            return leaveDate && leaveDate >= startDateNew && leaveDate <= endDateNew;
          })
        : [];

    
    const [leave, setLeave] = useState();
    const selectedEmployeeId = useSelector((state: RootState) => fromAdmin ? state.employee.selectedEmployee?.id : state.employee.currentEmployee.id);
    const [showLeaveRequestForm, setShowLeaveRequestForm] = useState(false);
    const [isFetchingLeaves, setIsFetchingLeaves] = useState(false);

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

            <Modal show={showLeaveRequestForm} onHide={handleCloseLeaveRequestForm} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Edit Leave Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <LeaveRequestForm
                        onClose={handleCloseLeaveRequestForm}
                        leave={leave}
                        startDateNew={startDateNew?.toString()}
                        endDateNew={endDateNew?.toString()}
                    />
                </Modal.Body>
            </Modal>
        </>
    );
}

export default Leaves;