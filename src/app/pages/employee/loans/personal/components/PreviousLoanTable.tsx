import MaterialTable from '@app/modules/common/components/MaterialTable';
import { LoanType, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchEmployeeLoans } from '@services/employee';
import { getCompletionAmountOfLoanByLoanIdAndEndDate } from '@utils/statistics';
import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

function PreviousLoanTable({ completeLoanData }: { completeLoanData: any[] }) {
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);
    const [loanData, setLoanData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingLoanData, setPendingLoanData] = useState<any[]>([])
    const navigate = useNavigate();

    useEffect(() => {
        const pendingLoans = completeLoanData
        // const pendingLoans =completeLoanData?.filter(ele=>ele.status==Status?.ApprovalNeeded)
        async function getThePreviousLoansData() {
            
            const finalData = await Promise.all(pendingLoans?.map(async(ele: any) => {
                const result = await getCompletionAmountOfLoanByLoanIdAndEndDate(ele?.id)
                const totalPaid = Number(result?.totalAmount)
                const endDate = result?.endDate
                const totalAmount = Number(ele.loanAmount)
                const completionPercent = ((totalPaid / totalAmount) * 100).toFixed(2)
                return {
                    id: ele?.id,
                    employeeId: ele?.employeeId,
                    loanAmount: ele.loanAmount,
                    paidAmt: totalPaid,
                    pendingAmt: Number(totalAmount) - Number(totalPaid),
                    status: ele.status == 1 ? 'Approved' : 'Pending',
                    loanStartDate: dayjs(ele.approvedAt || ele.createdAt).format('DD MMM YYYY'),
                    loanEndDate: endDate, // last installment date will come here
                    loanType: ele?.loanType === "EMI" ? "EMI" : "One Time",
                    loanDuration: ele.numberOfMonths || (dayjs(ele?.deductionMonth).month() - dayjs().month() + 1),
                    completion: `${completionPercent}%`,
                }
            }))            
            setLoanData(finalData)
        }
        getThePreviousLoansData()
    }, [completeLoanData])

    const columns = useMemo<MRT_ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "loanAmount",
                header: "Loan Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "paidAmt",
                header: "Paid Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "pendingAmt",
                header: "Pending Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "status",
                header: "Status",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "loanStartDate",
                header: "Loan Start Date",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "loanEndDate",
                header: "Loan End Date",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "loanType",
                header: "Loan Type",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "loanDuration",
                header: "Loan Duration",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ cell }) => {
                    const duration = cell.getValue<number>();
                    return duration ? `${duration} Months` : "N/A";
                }
            },
            ...([{
                accessorKey: "actions",
                header: "Actions",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ row }: any) => {
                    //   const resEdit = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOwn, row?.original);
                    //   const resDelete = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
                    return (
                        <div className="flex items-center justify-center space-x-4 cursor-pointer"
                        onClick={() => navigate(`/finance/loans/${row?.original?.id}`)}>
                            {" "}
                          <p className='text-primary'>View Details</p>
                        </div>
                    )
                }
            }]),
        ],
        []
    );

    return (
        <MaterialTable
            columns={columns}
            data={loanData}
            muiTableProps={{
                sx: {
                    "& .MuiTableBody-root .MuiTableCell-root": {
                        borderBottom: "none",
                        paddingY: "5px",
                    },
                    "& .MuiTableBody-root .MuiTableRow-root": {
                        // padding: '0px',
                    },
                },
            }}
            tableName="Previous Loan Data"
            resource={resourceNameMapWithCamelCase.loan}
            viewOwn={true}
            viewOthers={true}
            employeeId={employeeIdCurrent}
        />
    )
}

export default PreviousLoanTable