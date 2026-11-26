import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';

import { InstallmentTypeEnum, LoanType, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchEmployeeLoans } from '@services/employee';
import { formatNumber, getCompletionAmountOfLoanByLoanIdAndEndDate } from '@utils/statistics';
import dayjs from 'dayjs';

import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

function OngoingLoan({ completeLoanData, resource, viewOthers, viewOwn }: { completeLoanData: any[]; resource: string; viewOthers: boolean; viewOwn: boolean }) {

    const [loanData, setLoanData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingLoanData, setPendingLoanData] = useState<any[]>([])
    const navigate = useNavigate();
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee?.id);

    useEffect(() => {
        
        async function getThePreviousLoansData() {
            
            const finalData = await Promise.all(completeLoanData?.map(async(ele: any) => {
                const result: any = await getCompletionAmountOfLoanByLoanIdAndEndDate(ele?.id)
                const totalPaid = Number(result?.totalAmount)
                const endDate = result?.endDate
                const totalAmount = Number(ele.loanAmount)
                const paidInstallments = ele?.loanInstallments?.filter((install: any) => install?.installmentType === InstallmentTypeEnum.Paid)
                
                const completionPercent = ((totalPaid / totalAmount) * 100).toFixed(2)
                return {
                    id: ele?.id,
                    loanAmount: ele.loanAmount,
                    paidAmt: totalPaid,
                    pendingAmt: totalAmount - totalPaid,
                    loanStartDate: dayjs(ele.approvedAt).format('DD MMM YYYY'),
                    loanEndDate: endDate,
                    loanType: ele?.loanType === "EMI" ? "EMI" : "One Time",
                    installment: `${paidInstallments?.length}/${ele?.loanInstallments?.length}`,
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
                cell: ({ cell }: any) => formatNumber(cell.getValue()),
            },
            {
                accessorKey: "paidAmt",
                header: "Paid Amt.",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => formatNumber(cell.getValue()),
            },
            {
                accessorKey: "pendingAmt",
                header: "Pending Amt.",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => formatNumber(cell.getValue()),
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
                accessorKey: "installment",
                header: "Installment",
                enableSorting: false,
                enableColumnActions: false,
                cell: ({ cell }: any) => cell.getValue(),
            },
            {
                accessorKey: "loanDuration",
                header: "Loan Duration",
                enableSorting: false,
                enableColumnActions: false,
                // cell: ({ cell }: any) => cell.getValue(),
                cell: ({ cell }) => {
                    const duration = cell.getValue<number | null>();
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
                        <div className="flex items-center justify-center space-x-4">
                            {" "}
                          <p className='text-primary cursor-pointer' onClick={()=>{
                            navigate(`/finance/loans/${row?.original?.id}`)
                          }}>View Details</p>
                        </div>
                    )
                }
            }]),
        ],
        []
    );

    return (
        <DataTable
        caption="Ongoing Loan Data"
        columns={columns}
        data={loanData}
        getRowId={(r: any, i) => String(r.id ?? r.loanId ?? r.employeeId ?? i)}
        
        
        stateKey="loans.personal.ongoing"
        groupableColumns={false}
        searchPlaceholder="Search…"
      />
    )
}

export default OngoingLoan