import MaterialTable from '@app/modules/common/components/MaterialTable';
import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { formatNumber } from '@utils/statistics';
import { RootState } from '@redux/store';
import { useSelector } from 'react-redux';

function InstallmentAndPayment({ completeInstallmentData, completeLoanData }: { completeInstallmentData: any[], completeLoanData: any }) {

    const [loanData, setLoanData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingLoanData, setPendingLoanData] = useState<any[]>([])
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee?.id);

    useEffect(() => {
       

        async function getThePreviousLoansData() {

            // later filter with status of approved because without that the conditions is not applicable
            const finalData = completeInstallmentData?.map((ele: any, index: number) => {
                return {
                    id: ele?.id,
                    name: `Payment ${index + 1}`,
                    dueDate: dayjs(ele?.dueDate).format('DD MMM YYYY'),
                    paymentAmount: ele?.installmentAmount,
                    paidAmount: ele?.paidAmount || 0,
                    status: ele?.installmentType
                    // status: dayjs(Date()).isAfter(ele?.approvedAt)?"Pre-Paid":"Paid On Time"
                }
            })
            // later add upcoming based on the data
            const sortedData = finalData?.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())

            setLoanData(finalData)
        }
        getThePreviousLoansData()
    }, [completeInstallmentData])

    const columns = useMemo<MRT_ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "name",
                header: "Name",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "dueDate",
                header: "Due Date",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "paymentAmount",
                header: "Payment Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({value}:any) => {
                    return formatNumber(value)
                }
            },
            {
                accessorKey: "paidAmount",
                header: "Paid Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({value}:any) => {
                    return formatNumber(value)
                },
            },
            {
                accessorKey: "status",
                header: "Status",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
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
                            <p className='text-primary cursor-pointer'>Skip</p>
                            <p className='text-primary cursor-pointer'>Custom Pay</p>
                        </div>
                    )
                }
            }]),
        ],
        []
    );

    return (
        <>
            <div className="d-flex justify-content-between align-items-center m-md-3 p-5 p-md-10 p-lg-2">
                <h3 style={{ fontSize: "19px", fontWeight: "bolder" }}>Installment And Payments</h3>
            </div>
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
                tableName="PendingLoanData"
            // resource={loanData}
            // viewOwn={viewOwn}
            // viewOthers={viewOthers}
            employeeId={employeeIdCurrent}
            />
        </>
    )
}

export default InstallmentAndPayment