import CommonCard from '@app/modules/common/components/CommonCard';
import { Donut } from '@app/modules/common/components/Graphs';
import { customPaidLoanInstallment, fetchLoanById, skipLoanInstallment } from '@services/employee'
import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom';
import InstallmentAndPayment from '../components/InstallmentAndPayment';
import { Modal } from 'react-bootstrap';
import { InstallmentTypeEnum, LoanType, LoanTypeVal, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase, Status } from '@constants/statistics';
import dayjs from 'dayjs';
import { MRT_ColumnDef } from 'material-react-table';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { Form, Formik } from 'formik';
import TextInput from '@app/modules/common/inputs/TextInput';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons';
import { useNavigate } from 'react-router-dom';
import { formatNumber } from '@utils/statistics';
import { hasPermission } from '@utils/authAbac';
import { RootState } from '@redux/store';
import { useSelector } from 'react-redux';


function LoanDetails() {
    const { loanId } = useParams();
    const navigate = useNavigate();
    // const loanId = data?.loanId
    const [passedLoanId, setPassedLoanId] = useState(loanId)
    const [completeLoanData, setCompleteLoanData] = useState<any>({})
    const [showInstallmentPaymentModal, SetShowInstallmentPaymentModal] = useState(false);
    const [paymentChangeRequest, setPaymentChangeRequest] = useState([])
    const [totalLoanAmount, setTotalLoanAmount] = useState(0)
    const [totalLoanPaid, setTotalLoanPaid] = useState(0)
    const [totalLoanAmountPending, setTotalLoanAmountPending] = useState(0)
    const [loanType, setLoanType] = useState('')
    const [loanDuration, setLoanDuration] = useState(0)
    const [requestDate, setRequestDate] = useState('')
    const [loanStartDate, setLoanStartDate] = useState('')
    const [loanEndDate, setLoanEndDate] = useState('')
    const [loanReason, setLoanReason] = useState('implement reason field in DB')
    const [loanStatus, setLoanStatus] = useState('')
    const [pendingInstallments, setPendingInstallments] = useState(0)
    const [paidInstallments, setPaidInstallments] = useState(0)
    const [customPaid, setCustomPaid] = useState(0)
    const [skippedInstallments, setSkippedInstallments] = useState(0)
    const [loanData, setLoanData] = useState<any[]>([])
    const [completeInstallmentData, setCompleteInstallmentData] = useState([])
    const [paymentChangeData, setPaymentChangeData] = useState<any[]>([])
    const [showSkipAndCustomPaymentModal, setShowSkipAndCustomPaymentModal] = useState(false)
    const [showSkipForm, setShowSkipForm] = useState(false)
    const [showCustomPaymentForm, setShowCustomPaymentForm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isUpdate, setIsUpdate] = useState(false)
    const [selectedInstallmentForEdit, setSelectedInstallmentForEdit] = useState<any>()
    const [isEditMode, setIsEditMode] = useState(false)
    const employeeIdCurrent = useSelector((state: RootState) => state.employee.currentEmployee.id);

    useEffect(() => {

        if (!loanId) return;

        const getLoanDetails = async () => {
            // const res = await fetchLoanById('8d664432-0c82-4387-adb0-a064eb7ac1d6')
            const res = await fetchLoanById(loanId)
            const fetchedLoanDetails = res?.data;
            setCompleteLoanData(res?.data)
            setCompleteInstallmentData(res?.data?.loanInstallments)
            const paymentChangeRequestData = res?.data?.loanInstallments?.filter((ele: any) => ele.status == Status?.ApprovalNeeded && (ele?.installmentType == InstallmentTypeEnum?.Skipped || ele?.installmentType == InstallmentTypeEnum?.Custom_Paid))

            setPaymentChangeRequest(paymentChangeRequestData)
            setTotalLoanAmount(Number(fetchedLoanDetails?.loanAmount || 0))
            let totalPaid = 0;
            const allInstallments = fetchedLoanDetails?.loanInstallments
            allInstallments?.forEach((ele: any) => {
                totalPaid += Number(ele?.paidAmount || 0) || 0
            });
            setTotalLoanPaid(totalPaid)
            setTotalLoanAmountPending(Number(fetchedLoanDetails?.loanAmount || 0) - totalPaid)
            setRequestDate(dayjs(fetchedLoanDetails?.createdAt).format('DD MMM YYYY') || 'NA')
            setLoanStartDate(fetchedLoanDetails?.approvedAt ? dayjs(fetchedLoanDetails.approvedAt).format('DD MMM YYYY') : 'NA' );
            setLoanType(fetchedLoanDetails?.loanType == LoanType?.EMI ? LoanTypeVal?.EMI : LoanTypeVal?.ONE_TIME)
            const finalLoanStatus = fetchedLoanDetails?.status == Status?.Approved ? "Approved" : fetchedLoanDetails?.status == Status?.Rejected ? "Rejected" : "Pending"
            setLoanStatus(finalLoanStatus)
            const sortedData = res?.data?.loanInstallments?.sort((a: any, b: any) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())

            const endDateFinal = sortedData?.[0]?.dueDate
            
            setLoanEndDate(endDateFinal ? dayjs(endDateFinal).format('DD MMM YYYY') : 'NA');
            
            setLoanReason(fetchedLoanDetails?.loanReason)

            const loanType = fetchedLoanDetails?.loanType
            let duration = 0;
            if (loanType == LoanType?.EMI) {
                duration = allInstallments?.length || 0
            }
            else {
                const startMonth = dayjs(fetchedLoanDetails?.approvedAt).month()
                const endMonth = dayjs(fetchedLoanDetails?.deductionMonth).month()
                duration = endMonth - startMonth
            }
            let pendingInstallments = 0;
            let paidInstallments = 0;
            let customPaid = 0;
            let skippedInstallments = 0;
            allInstallments?.forEach((ele: any) => {
                if (ele?.installmentType == InstallmentTypeEnum.Upcoming) {
                    pendingInstallments++
                }
                else if (ele?.installmentType == InstallmentTypeEnum.Paid) {
                    paidInstallments++
                }
                else if (ele?.installmentType == InstallmentTypeEnum.Custom_Paid) {
                    customPaid++
                }
                else if (ele?.installmentType == InstallmentTypeEnum.Skipped) {
                    skippedInstallments++
                }
            });
            setPaidInstallments(paidInstallments)
            setCustomPaid(customPaid)
            setSkippedInstallments(skippedInstallments)
            setPendingInstallments(pendingInstallments)
            setLoanDuration(duration)

            const paymentChangeInstallments = allInstallments?.filter((ele: any) => ele?.status == Status?.ApprovalNeeded && (ele?.installmentType == InstallmentTypeEnum?.Skipped || ele?.installmentType == InstallmentTypeEnum?.Custom_Paid))
        }
        getLoanDetails()
    }, [loanId])

    useEffect(() => {
        if (completeInstallmentData?.length == 0 || Object.entries(completeLoanData)?.length == 0) {
            return;
        }
        let isActive = true;

        async function getThePreviousLoansData() {

            // later filter with status of approved because without that the conditions is not applicable
            const totalLength = completeInstallmentData?.length || 0
            const sortedDataFinal = completeInstallmentData?.sort((a: any, b: any) => new Date(dayjs(b?.dueDate).format('DD MMM YYYY')).getTime() - new Date(dayjs(a?.dueDate).format('DD MMM YYYY')).getTime())

            const finalData = sortedDataFinal?.map((ele: any, index: number) => {
                return {
                    id: ele?.id,
                    employeeId: ele?.employeeId,
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
            }).filter(ele => !((ele?.status == InstallmentTypeEnum?.Custom_Paid || ele?.status == InstallmentTypeEnum?.Skipped) && (!ele?.approvedById && !ele?.approvedAt)))

            const newPaymentChangeData = sortedDataFinal?.map((ele: any, index: number) => ({
                id: ele?.id,
                employeeId: ele?.employeeId,
                loanAmount: completeLoanData?.loanAmount,
                payment: `Payment ${totalLength - index}`,
                dueDate: dayjs(ele?.dueDate).format('DD MMM YYYY'),
                installment: `${totalLength - index}/${totalLength}`,
                dueAmount: ele?.installmentAmount,
                paidAmount: ele?.paidAmount,
                status: ele?.installmentType,
                request: ele?.installmentType == InstallmentTypeEnum?.Skipped ? "Skip Payment" : "Custom Payment",
                isApproved: ele?.status,
                approvedById: ele?.approvedById,
                approvedAt: ele?.approvedAt,
                installmentType: ele?.installmentType,
                note: ele?.note,
            })).filter(ele => (ele?.status == InstallmentTypeEnum?.Custom_Paid || ele?.status == InstallmentTypeEnum?.Skipped) && (!ele?.approvedById && !ele?.approvedAt))
            // later add upcoming based on the data  
            if (isActive) {
                setLoanData(finalData)
                setPaymentChangeData(newPaymentChangeData)
            }
            // setPaymentChangeData(paymentChangeInstallments)
        }
        getThePreviousLoansData()

        return () => {
            isActive = false;
        };
    }, [completeInstallmentData, completeLoanData])

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
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "paidAmount",
                header: "Paid Amount",
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
                            {!resEdit && <p className='text-primary cursor-pointer'>NA</p>}
                        </div>
                    )
                }
            }]),
        ],
        []
    );

    const columns2 = useMemo<MRT_ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "loanAmount",
                header: "Loan Amount",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "payment",
                header: "Payment",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "installment",
                header: "Installment",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
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
                Cell: ({ renderedCellValue }: any) => formatNumber(renderedCellValue),
            },
            {
                accessorKey: "request",
                header: "Request",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "note",
                header: "Note",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ renderedCellValue }: any) => renderedCellValue,
            },
            {
                accessorKey: "actions",
                header: "Actions",
                enableSorting: false,
                enableColumnActions: false,
                Cell: ({ row }: any) => {
                    return (
                        <div className="flex items-center justify-center space-x-4">
                            <p className='text-primary cursor-pointer' onClick={() => {
                                if(row?.original?.installmentType == InstallmentTypeEnum?.Skipped){
                                    setShowSkipForm(true)
                                }else{
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
                            }}>Edit</p>
                        </div>
                    )
                }
            }
        ], []
    )

    return (
      <div className="container-fluid px-2 px-md-4">
        <div className="d-flex flex-row align-items-center justify-content-start gap-2 py-3 px-2">
          <img
            src={miscellaneousIcons.leftArrow}
            alt=""
            style={{ width: "36px", height: "36px", cursor: "pointer" }}
            onClick={() => navigate(-1)}
          />
          <h2 className="my-auto">Loan Details</h2>
        </div>
        <div className="d-flex flex-column flex-lg-row flex-wrap align-items-start justify-content-between gap-3">
          <CommonCard
            styles={{ width: "100%", maxWidth: "100%", flex: "1 1 65%" }}
          >
            <h4 className="mb-12">Loan Information</h4>
            <div className="row">
              {[
                {
                  label: "Loan Amount",
                  value: formatNumber(totalLoanAmount),
                  color: "#CB2C2C",
                },
                {
                  label: "Total Loan Paid",
                  value: formatNumber(totalLoanPaid),
                  color: "#1DD12C",
                },
                {
                  label: "Total Pending",
                  value: formatNumber(totalLoanAmountPending),
                  color: "#7397C5",
                },
                {
                  label: "Duration",
                  value: `${loanDuration} Months`,
                  color: "#7397C5",
                },
                { label: "Status", value: loanStatus, color: "#7397C5" },
                { label: "Type", value: loanType, color: "#7397C5" },
                { label: "Request Date", value: requestDate, color: "#7397C5" },
                { label: "Start Date", value: loanStartDate, color: "#7397C5" },
                { label: "End Date", value: loanEndDate, color: "#7397C5" },
                { label: "Reason", value: loanReason, color: "#7397C5" },
              ].map((item, index) => (
                <div key={index} className="col-6 col-sm-6 col-md-4 mb-2">
                  <div
                    className="d-flex flex-column h-100"
                    style={{
                      borderLeft: `3px solid ${item.color}`,
                      paddingLeft: "10px",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </CommonCard>
          <div
            className="mt-4 d-flex justify-content-center align-items-center"
            style={{ width: "100%", flex: "1 1 30%", minHeight: "250px" }}
          >
            <Donut
              donutLabels={["Pending", "Paid", "Custom Paid", "Skipped"]}
              donutSeries={[
                pendingInstallments,
                paidInstallments,
                customPaid,
                skippedInstallments,
              ]}
              customHeading="Installments"
              customStylesForCol={{ width: "100%", height: "auto" }}
              customColorsForDonut={[
                "#7DA9F3",
                "#9FD893",
                "#CEA452",
                "#EB7F7F",
              ]}
            />
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center py-3 px-2 mt-4">
          <h3 className="fs-5 fs-md-4 fw-bold">Installment And Payments</h3>
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
          employeeId={employeeIdCurrent}
          // resource={loanData}
          // viewOwn={viewOwn}
          // viewOthers={viewOthers}
        />

        <div className="d-flex justify-content-between align-items-center py-3 px-2 mt-4">
          <h3 className="fs-5 fs-md-4 fw-bold">Payment Change Request</h3>
        </div>
        <MaterialTable
          columns={columns2}
          data={paymentChangeData}
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
          employeeId={employeeIdCurrent}
          // resource={loanData}
          // viewOwn={viewOwn}
          // viewOthers={viewOthers}
        />

        <Modal
          size="lg"
          show={showInstallmentPaymentModal}
          onHide={() => SetShowInstallmentPaymentModal(false)}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Pay your Installment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* <InstallmentPaymentForm setShowModalFunc={SetShowInstallmentPaymentModal} /> */}
          </Modal.Body>
        </Modal>

        <Modal
          size="lg"
          show={showSkipAndCustomPaymentModal}
          onHide={() => {
            setShowSkipAndCustomPaymentModal(false);
            setShowSkipForm(false);
            setShowCustomPaymentForm(false);
          }}
          centered
        >
          <Modal.Body className="">
            <div className="mb-10 px-4">
              <h3 className="my-3">
                {showSkipForm && "Skip Installment Payment"}{" "}
                {showCustomPaymentForm && "Custom Installment Payment"}
              </h3>
            </div>
            <div className="d-flex flex-column flex-md-row gap-2 gap-md-4 px-3 py-2 align-items-start align-items-md-center">
              <div className="d-flex flex-column align-items-start justify-content-center gap-1">
                <span className="text-muted small">Installment</span>
                <span>{selectedInstallmentForEdit?.installment}</span>
              </div>
              <div className="d-flex flex-column align-items-start justify-content-center gap-1">
                <span className="text-muted small">Total Due This Month</span>
                <span>
                  {formatNumber(selectedInstallmentForEdit?.dueThisMonth)}
                </span>
              </div>
              <div className="d-flex flex-column align-items-start justify-content-center gap-1">
                <span className="text-muted small">Total Due Next Month</span>
                <span>
                  {formatNumber(selectedInstallmentForEdit?.dueThisMonth)}
                </span>
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
                  const data = values;
                  if (isEditMode) {
                    if (showCustomPaymentForm) {
                    } else {
                      data.deductionMonth = null;
                    }
                    successConfirmation("Loan Updated Successfully!");
                  } else {
                    if (showCustomPaymentForm) {
                      const res = await customPaidLoanInstallment(
                        selectedInstallmentForEdit?.id,
                        values?.paidAmount,
                        values?.note
                      );
                    } else {
                      const res = await skipLoanInstallment(
                        selectedInstallmentForEdit?.id,
                        values?.note
                      );
                    }
                    successConfirmation(
                      "Installment Request Applied Successfully!"
                    );
                  }
                } catch (err) {
                  errorConfirmation("Failed to update installments");
                  console.log(err);
                  return;
                } finally {
                  setLoading(false);
                }
                setShowSkipAndCustomPaymentModal(false);
              }}
            >
              {(formikProps) => {
                useEffect(() => {
                  if (!isEditMode) return;
                  formikProps.setFieldValue(
                    "paidAmount",
                    selectedInstallmentForEdit?.dueThisMonth
                  );
                  formikProps.setFieldValue(
                    "note",
                    selectedInstallmentForEdit?.note
                  );
                }, [isEditMode, selectedInstallmentForEdit]);

                return (
                  <Form className="form" placeholder={""}>
                    {/* Attendance Request Limit */}
                    {!showSkipForm && (
                      <div className="row px-3 my-3">
                        <div className="col-lg-12 fv-row">
                          <TextInput
                            isRequired={true}
                            label="Enter Deduction AMount"
                            margin="mb-1"
                            formikField="paidAmount"
                            inputTypeNumber={true}
                          />
                        </div>
                      </div>
                    )}
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
                          ) : isUpdate ? (
                            "Update"
                          ) : (
                            "Send Request"
                          )}
                        </button>
                      </div>
                    </div>
                  </Form>
                );
              }}
            </Formik>
          </Modal.Body>
        </Modal>
      </div>
    );
}

export default LoanDetails