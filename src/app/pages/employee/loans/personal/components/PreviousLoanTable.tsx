import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import { LoanType, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchEmployeeLoans } from '@services/employee';
import { getCompletionAmountOfLoanByLoanIdAndEndDate } from '@utils/statistics';
import dayjs from 'dayjs';

import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/ds/ui/button';

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

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "loanAmount",
                header: "Loan Amount",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "paidAmt",
                header: "Paid Amount",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "pendingAmt",
                header: "Pending Amount",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "status",
                header: "Status",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "loanStartDate",
                header: "Loan Start Date",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "loanEndDate",
                header: "Loan End Date",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "loanType",
                header: "Loan Type",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "loanDuration",
                header: "Loan Duration",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }) => {
                    const duration = cell.getValue<number>();
                    return duration ? `${duration} Months` : "N/A";
                }
            },
            ...([{
                accessorKey: "actions",
                header: "Actions",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ row }: any) => {
                    //   const resEdit = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.editOwn, row?.original);
                    //   const resDelete = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
                    return (
                        <Button variant="link" size="sm"
                        onClick={() => navigate(`/finance/loans/${row?.original?.id}`)}>
                            {" "}
                          <p className='text-primary'>View Details</p>
                        </Button>
                    )
                }
            }]),
        ],
        []
    );

    return (
        <DataTable
        caption="Previous Loan Data"
        columns={columns}
        data={loanData}
        getRowId={(r: any, i) => String(r.id ?? r.loanId ?? r.employeeId ?? i)}
        
        
        stateKey="loans.personal.previous"
        groupableColumns={false}
        searchPlaceholder="Search…"
      />
    )
}

export default PreviousLoanTable