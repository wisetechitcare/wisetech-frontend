import MaterialTable from "@app/modules/common/components/MaterialTable";
import { KTIcon } from "@metronic/helpers";
import { useMemo, useState, useEffect } from "react";
import { MRT_ColumnDef } from "material-react-table";
import { IReimbursements, IReimbursementsFetch, IReimbursementsUpdate } from "@models/employee";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import dayjs, { Dayjs } from "dayjs";
import { customPaidLoanInstallment, fetchEmployeeMonthlyInstallments, fetchLoanById, skipLoanInstallment } from "@services/employee";
import { deleteConfirmation, errorConfirmation, successConfirmation } from "@utils/modal";
import { hasPermission } from "@utils/authAbac";
import { InstallmentTypeEnum, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import CommonCard from "@app/modules/common/components/CommonCard";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Form, Formik } from "formik";
import TextInput from "@app/modules/common/inputs/TextInput";
import { formatNumber } from "@utils/statistics";

function Monthly({ month, resource, viewOthers, viewOwn }: { month: Dayjs, resource: string, viewOthers: boolean, viewOwn: boolean }) {
    const leaves = useSelector((state: RootState) => state.leaves.personalLeaves);
    const navigate = useNavigate();
    const [fetchAgain, setFetchAgain] = useState(true);
    const [totalDueThisMonth, setTotalDueThisMonth] = useState(0)
    const [totalActiveLoans, setTotalActiveLoans] = useState(0)
    const [totalBilledDueThisMonth, setTotalBilledDueThisMonth] = useState(0)
    const [totalPreviousDue, setTotalPreviousDue] = useState(0)
    const [totalAmountPaid, setTotalAmountPaid] = useState(0)
    const [installmentsData, setInstallmentsData] = useState<any>([])
    const [autoDeductOn, setAutoDeductOn] = useState('')
    const [showSkipAndCustomPaymentModal, setShowSkipAndCustomPaymentModal] = useState(false)
    const [showSkipForm, setShowSkipForm] = useState(false)
    const [showCustomPaymentForm, setShowCustomPaymentForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isUpdate, setIsUpdate] = useState(false)
    const [selectedInstallmentForEdit, setSelectedInstallmentForEdit] = useState<any>()
    const [isEditMode, setIsEditMode] = useState(false)
    const isAdmin = useSelector(
        (state: RootState) => state.auth.currentUser.isAdmin
    );

    const employeeId = useSelector(
        (state: RootState) => state.employee.currentEmployee.id
    );

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
                accessorKey: "loan",
                header: "Loan Details",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ row }: any) => {

                    return (
                        <div className="flex items-center justify-center space-x-4">
                            {" "}
                            <p className='text-primary cursor-pointer' onClick={() => {
                                navigate(`/finance/loans/${row?.original?.loanId}`)
                            }}>View Details</p>
                        </div>
                    )
                },
            },
            {
                accessorKey: "dueDate",
                header: "Due Date",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "billDueThisMonth",
                header: "Bill Due This Month",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
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
                      const resEdit = hasPermission(resourceNameMapWithCamelCase.loanInstallment, permissionConstToUseWithHasPermission.editOwn, row?.original);
                    //   const resDelete = hasPermission(resourceNameMapWithCamelCase.reimbursement, permissionConstToUseWithHasPermission.deleteOwn, row?.original);
                    
                    return (
                        <div className="flex items-center justify-center space-x-4">
                            {" "}
                            {resEdit && <p className='text-primary cursor-pointer' onClick={() => {

                                setShowSkipForm(true)
                                setShowSkipAndCustomPaymentModal(true)
                                setSelectedInstallmentForEdit({
                                    id: row?.original?.id,
                                    installment: row?.original?.installment,
                                    dueThisMonth: row?.original?.paymentAmount,
                                    note: row?.original?.note,
                                    paidAmount: row?.original?.paidAmount
                                })
                                
                            }}>Skip</p>}
                            {resEdit && <p className='text-primary cursor-pointer' onClick={() => {
                                setShowCustomPaymentForm(true)
                                setShowSkipAndCustomPaymentModal(true)
                                setSelectedInstallmentForEdit({
                                    id: row?.original?.id,
                                    installment: row?.original?.installment,
                                    dueThisMonth: row?.original?.paymentAmount,
                                    note: row?.original?.note,
                                    paidAmount: row?.original?.paidAmount
                                })
                            }}>Custom Pay</p>}
                            {!resEdit && <p className='text-primary'>NA</p>}
                        </div>
                    )
                }
            }]),
        ],
        []
    );
    useEffect(() => {
        if (!employeeId || !month) {
            return;
        }
        async function getInstallments() {
            const date = dayjs(month).format('YYYY-MM-DD')
            const startDate = month.startOf('month').format('YYYY-MM-DD')
            const endDate = month.endOf('month').format('YYYY-MM-DD')
            const response = await fetchEmployeeMonthlyInstallments(startDate, endDate, employeeId);
            const finalData = await Promise.all(response?.data?.loanInstallments?.map(async (ele: any, index: number) => {
                const completeLoanDetails = await fetchLoanById(ele?.loanId);
                const loanData = completeLoanDetails?.data;
                let previousDues = 0;
                const sortedLoanInstallments = loanData?.loanInstallments?.sort((a: any, b: any) => new Date(dayjs(b?.dueDate).format('DD MMM YYYY')).getTime() - new Date(dayjs(a?.dueDate).format('DD MMM YYYY')).getTime())
                const finalData = sortedLoanInstallments?.map((ele: any, index: number) => {
                    const totalLength = sortedLoanInstallments?.length || 0
                    
                    return {
                        id: ele?.id,
                        name: `Payment ${totalLength - index}`,
                        dueDate: dayjs(ele?.dueDate).format('DD MMM YYYY'),
                        paymentAmount: ele?.installmentAmount,
                        paidAmount: ele?.paidAmount || 0,
                        status: ele?.installmentType == InstallmentTypeEnum?.Paid ? "Paid" : ele?.installmentType == InstallmentTypeEnum?.Skipped ? "Skipped" : ele?.installmentType == InstallmentTypeEnum?.Custom_Paid ? "Custom Paid" : ele?.installmentType == InstallmentTypeEnum?.Upcoming ? "Upcoming" : "",
                        isApproved: ele?.status,
                        approvedById: ele?.approvedById,
                        approvedAt: ele?.approvedAt,
                        installment: `${totalLength - index}/${totalLength}`,
                        note: ele?.note,
                    }
                })
                loanData?.loanInstallments?.forEach((ele: any) => {
                    if (ele?.installmentType === InstallmentTypeEnum.Skipped) {
                        previousDues += Number(ele?.installmentAmount);
                    }
                    if (ele?.installmentType === InstallmentTypeEnum.Custom_Paid) {
                        previousDues += Number(ele?.installmentAmount) - Number(ele?.paidAmount);
                    }
                })
                const totalLength = response?.length || 0
                const currInstallmentId = ele?.id
                const installmentToSpread = finalData?.find((ele: any) => ele?.id === currInstallmentId)
                
                
                return {
                    id: ele?.id,
                    name: `Payment ${index + 1}`,
                    dueDate: dayjs(ele?.dueDate).format('DD MMM YYYY'),
                    paidAmount: ele?.paidAmount || 0,
                    status: ele?.installmentType,
                    billDueThisMonth: ele?.installmentAmount,
                    loanId: ele?.loanId,
                    loanAmount: loanData?.loanAmount,
                    previousDues: previousDues,
                    installment: `${totalLength - index}/${totalLength}`,
                    ...installmentToSpread
                    // status: dayjs(Date()).isAfter(ele?.approvedAt) ? "Pre-Paid" : "Paid On Time"
                }
            }))
            let totalDueThisMonth = 0
            let totalPreviousDues = 0
            finalData?.forEach((ele: any) => {
                totalDueThisMonth += Number(ele?.billDueThisMonth) - Number(ele?.paidAmount)
                totalPreviousDues += Number(ele?.previousDues)
            })
            setTotalPreviousDue(totalPreviousDues)
            const totalBilledDueThisMonth = finalData?.reduce((acc: number, ele: any) => acc + Number(ele?.billDueThisMonth), 0)
            let loanIds = new Set()
            finalData?.forEach((ele: any) => {
                loanIds.add(ele?.loanId)
            })
            
            setAutoDeductOn(dayjs(endDate).format('DD MMM YYYY'))
            setTotalDueThisMonth(Number(totalDueThisMonth))
            setTotalBilledDueThisMonth(Number(totalBilledDueThisMonth))
            setTotalActiveLoans(Number(loanIds?.size))
            setInstallmentsData(finalData);
        }
        getInstallments();
    }, [month, employeeId]);

    return (
        <>
            <CommonCard>
                <h4>Total Due This Month</h4>
                <span
                    className="fs-2"
                    style={{ fontWeight: 'bold' }}
                >
                    {formatNumber(totalDueThisMonth)}
                </span>
                <div className="row gx-2 gy-3 my-4">
                    <div
                        className="col-12 col-sm-6 col-md my-2 d-flex flex-column"
                        style={{
                            borderLeft: '3px solid #7397C5',
                            paddingLeft: '10px',
                        }}        
                    >
                    <span style={{ fontWeight: 'bold' }}>Active Loans</span>
                    <span>{totalActiveLoans}</span>
                </div>

                <div
                    className="col-12 col-sm-6 col-md my-2 d-flex flex-column"
                    style={{
                        borderLeft: '3px solid #7397C5',
                        paddingLeft: '10px',
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>Auto Deduct On</span>
                    <span>{autoDeductOn}</span>
                </div>

                <div
                    className="col-12 col-sm-6 col-md my-2 d-flex flex-column"
                    style={{
                        borderLeft: '3px solid #FF0000',
                        paddingLeft: '10px',
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>Billed Due This Month</span>
                    <span>{formatNumber(totalBilledDueThisMonth)}</span>
                </div>

                <div
                    className="col-12 col-sm-6 col-md my-2 d-flex flex-column"
                    style={{
                        borderLeft: '3px solid #FF0000',
                        paddingLeft: '10px',
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>Previous Due</span>
                    <span>{formatNumber(totalPreviousDue)}</span>
                </div>

                <div
                    className="col-12 col-sm-6 col-md my-2 d-flex flex-column"
                    style={{
                        borderLeft: '3px solid #1DD12C',
                        paddingLeft: '10px',
                    }}
                >
                    <span style={{ fontWeight: 'bold' }}>Amount Paid</span>
                    <span>{formatNumber(totalAmountPaid)}</span>
                </div>
            </div>
        </CommonCard>

            <h4 className='d-flex justify-content-between align-items-center mb-5 pt-8'>This month installments</h4>
            <MaterialTable
                columns={columns}
                data={installmentsData}
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
                tableName="MonthlyInstallments"
                resource={resource}
                viewOwn={viewOwn}
                viewOthers={viewOthers}
                employeeId={employeeId}
            />

            <Modal size="lg" show={showSkipAndCustomPaymentModal} onHide={() => {
                setShowSkipAndCustomPaymentModal(false)
                setShowSkipForm(false)
                setShowCustomPaymentForm(false)
            }} centered>
                <Modal.Body className=''>
                    <div className='mb-10 px-4'>
                        <h3 className='my-3'>{showSkipForm && 'Skip Installment Payment'} {showCustomPaymentForm && 'Custom Installment Payment'}</h3>
                    </div>
                    <div style={{ display: 'flex', gap: '25px', padding: '5px 12px', alignItems: "center" }}>
                        <div style={{ display: 'flex', flexDirection: "column", alignItems: "start", justifyContent: "center", gap: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#7A8597' }}>Installment</span>
                            <span>{selectedInstallmentForEdit?.installment}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: "column", alignItems: "start", justifyContent: "center", gap: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#7A8597' }}>Total Due This Month</span>
                            <span>{selectedInstallmentForEdit?.dueThisMonth}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: "column", alignItems: "start", justifyContent: "center", gap: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#7A8597' }}>Total Due Next Month</span>
                            <span>{selectedInstallmentForEdit?.dueThisMonth}</span>
                        </div>
                    </div>
                    <Formik
                        enableReinitialize={true}
                        initialValues={{
                            paidAmount: 0,
                            note: "",
                        }}

                        onSubmit={async (values: any) => {
                            setLoading(true);
                            try {
                                
                                const data = values
                                if (isEditMode) {
                                    
                                    if (showCustomPaymentForm) {
                                       
                                    }
                                    else {
                                        data.deductionMonth = null
                                    }
                                    // data.id = defaultData?.id

                                    // const res = await updateEmployeeLoanById(data?.id, data)
                                    successConfirmation("Loan Updated Successfully!");
                                }
                                else {
                                    // console.log(values);
                                    if (showCustomPaymentForm) {
                                        
                                        const res = await customPaidLoanInstallment(selectedInstallmentForEdit?.id, values?.paidAmount, values?.note)
                                    }
                                    else {

                                        const res = await skipLoanInstallment(selectedInstallmentForEdit?.id, values?.note)
                                    }
                                    // const res = await createEmployeeLoan(data)
                                    successConfirmation("Installment Request Applied Successfully!");
                                }
                            } catch (err) {
                                errorConfirmation("Failed to update installments");
                                console.log(err);
                                return;
                            } finally {
                                setLoading(false);
                            }
                            setShowSkipAndCustomPaymentModal(false)
                        }}
                    >
                        {(formikProps) => {

                            useEffect(() => {
                                // if (!isEditMode) return;
                                formikProps.setFieldValue('paidAmount', selectedInstallmentForEdit?.paidAmount)
                                formikProps.setFieldValue('note', selectedInstallmentForEdit?.note)
                            }, [selectedInstallmentForEdit]);

                            return (
                                <Form className="form" placeholder={''}>
                                    {/* Attendance Request Limit */}
                                    {!showSkipForm && <div className="row px-3 my-3">
                                        <div className="col-lg-12 fv-row">
                                            <TextInput
                                                isRequired={true}
                                                label="Enter Deduction AMount"
                                                margin="mb-1"
                                                formikField="paidAmount"
                                                inputTypeNumber={true} />
                                        </div>
                                    </div>
                                    }
                                    <div>
                                        <div className="row px-3 my-3">
                                            <div className="col-lg-12 fv-row">
                                                <TextInput
                                                    isRequired={true}
                                                    label="Note"
                                                    margin="mb-1"
                                                    formikField="note"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row px-3 mb-0 my-3">
                                        <div className="col-lg-12 text-start mb-5">
                                            <button
                                                type="submit"
                                                className="btn btn-lg btn-primary"
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <span>
                                                        Please wait...
                                                        <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                                                    </span>
                                                ) : (
                                                    isUpdate ? "Update" : "Send Request"
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                </Form>
                            )
                        }
                        }</Formik>
                </Modal.Body>
            </Modal>
        </>
    );
}

export default Monthly;
