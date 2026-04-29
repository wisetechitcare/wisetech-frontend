import MaterialTable from '@app/modules/common/components/MaterialTable';
import { InstallmentTypeEnum, LoanType, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { fetchEmployeeLoans } from '@services/employee';
import { formatNumber, getCompletionAmountOfLoanByLoanIdAndEndDate } from '@utils/statistics';
import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'material-react-table';
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

    const columns = useMemo<MRT_ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "loanAmount",
                header: "Loan Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "paidAmt",
                header: "Paid Amt.",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "pendingAmt",
                header: "Pending Amt.",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
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
                accessorKey: "installment",
                header: "Installment",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "loanDuration",
                header: "Loan Duration",
                enableSorting: false,
                enableColumnActions: false,
                // Cell: ({ renderedCellValue }: any) => renderedCellValue,
                Cell: ({ cell }) => {
                    const duration = cell.getValue<number | null>();
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
            tableName="Ongoing Loan Data"
            resource={resource}
            viewOwn={viewOwn}
            viewOthers={viewOthers}
            employeeId={employeeIdCurrent}
        />
    )
}

export default OngoingLoan