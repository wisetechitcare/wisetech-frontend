import MaterialTable from '@app/modules/common/components/MaterialTable';
import TextInput from '@app/modules/common/inputs/TextInput';
import { InstallmentTypeEnum, LoanType, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import { KTIcon } from '@metronic/helpers';
import { RootState } from '@redux/store';
import { customPaidLoanInstallment, fetchEmployeeLoans, skipLoanInstallment } from '@services/employee';
import { hasPermission } from '@utils/authAbac';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { formatNumber, getCompletionAmountOfLoanByLoanIdAndEndDate } from '@utils/statistics';
import dayjs from 'dayjs';
import { Form, Formik } from 'formik';
import { MRT_ColumnDef } from 'material-react-table';
import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

function PaymentChangeRequest({ completeLoanData }: { completeLoanData: any[] }) {
    const [loanData, setLoanData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [pendingLoanData, setPendingLoanData] = useState<any[]>([])
    const navigate = useNavigate();
    const [showSkipAndCustomPaymentModal, setShowSkipAndCustomPaymentModal] = useState(false)
    const [showSkipForm, setShowSkipForm] = useState(false)
    const [showCustomPaymentForm, setShowCustomPaymentForm] = useState(false)
    const [isUpdate, setIsUpdate] = useState(false)
    const [selectedInstallmentForEdit, setSelectedInstallmentForEdit] = useState<any>()
    const [isEditMode, setIsEditMode] = useState(false)
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee?.id);

    useEffect(() => {
        const pendingLoans = completeLoanData;
        async function getThePreviousLoansData() {
            const filteredPendingLoans = pendingLoans?.filter(ele => ele?.loanInstallments?.length > 0)
            let completeInstallmentDataWithendingRequest: any[] = []
            filteredPendingLoans?.forEach((ele: any) => {
                completeInstallmentDataWithendingRequest = [
                    ...completeInstallmentDataWithendingRequest,
                    ...ele?.loanInstallments
                ]
            })

            const loanInstallmentsNotApproved = completeInstallmentDataWithendingRequest?.filter(ele => (
                ele?.installmentType == InstallmentTypeEnum.Custom_Paid && !ele?.approvedById || ele?.installmentType == InstallmentTypeEnum.Skipped && !ele?.approvedById
            ))

            const finalData = (loanInstallmentsNotApproved?.map((ele: any) => {
                
                const totalAmount = Number(ele.loanAmount)
                // const completionPercent = ((totalPaid / totalAmount) * 100).toFixed(2)   
                const loanId = ele?.loanId

                const loanDetails = filteredPendingLoans?.find((ele: any) => ele?.id == loanId)
                const loanAmount = loanDetails?.loanAmount;
                return {
                    id: ele?.id,
                    employeeId: loanDetails?.employeeId,
                    loanAmount: Number(loanAmount),
                    payment: Number(ele.installmentAmount),
                    installment: ele.installmentOutOf,
                    installmentType: ele.installmentType,
                    dueDate: dayjs(ele.dueDate).format('DD MMM'),
                    dueAmount: ele.installmentAmount,
                    payAmount: Number(ele.installmentAmount) - Number(ele?.paidAmount),
                    request: ele.request || "Add field in DB",
                    note: ele.note,
                    paidAmount: ele?.paidAmount,
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
                accessorKey: "payment",
                header: "Payment",
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
                accessorKey: "dueDate",
                header: "Due Date",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "dueAmount",
                header: "Due Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "payAmount",
                header: "Pay Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "note",
                header: "Request",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue || "-",
            },
            // {
            //     accessorKey: "status",
            //     header: "status",
            //     enableSorting: false,
            //     enableColumnActions: false,
            //     Cell: ({ renderedCellValue }: any) => renderedCellValue,
            // },
            // {
            //     accessorKey: "note",
            //     header: "Note",
            //     enableSorting: false,
            //     enableColumnActions: false,
            //     Cell: ({ renderedCellValue }: any) => renderedCellValue,
            // },
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
                            {resEdit ? <p className='text-primary cursor-pointer' onClick={() => {
                                if (row?.original?.installmentType == InstallmentTypeEnum?.Skipped) {
                                    setShowSkipForm(true)
                                } else {
                                    setShowCustomPaymentForm(true)
                                }
                                setShowSkipAndCustomPaymentModal(true)
                                setSelectedInstallmentForEdit({
                                    id: row?.original?.id,
                                    installment: row?.original?.installment,
                                    dueThisMonth: row?.original?.dueAmount,
                                    note: row?.original?.note,
                                    paidAmount: row?.original?.paidAmount
                                })
                                setIsEditMode(true)
                            }}>Edit</p> : "Not Allowed"}
                        </div>
                    )
                }
            }]),
        ],
        []
    );

    return (
        <>
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
                tableName="PaymentChangeRequest"
                resource={resourceNameMapWithCamelCase.loan}
                viewOwn={true}
                viewOthers={true}
                employeeId={employeeIdCurrent}
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
                            <span>{formatNumber(selectedInstallmentForEdit?.dueThisMonth)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: "column", alignItems: "start", justifyContent: "center", gap: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#7A8597' }}>Total Due Next Month</span>
                            <span>{formatNumber(selectedInstallmentForEdit?.dueThisMonth)}</span>
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
                                if (showCustomPaymentForm) {
                                    const res = await customPaidLoanInstallment(selectedInstallmentForEdit?.id, values?.paidAmount, values?.note)
                                }
                                else {
                                    const res = await skipLoanInstallment(selectedInstallmentForEdit?.id, values?.note)
                                }
                                
                                successConfirmation("Installment Request Applied Successfully!");
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

    )
}

export default PaymentChangeRequest