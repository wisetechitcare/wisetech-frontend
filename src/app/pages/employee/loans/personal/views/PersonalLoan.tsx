import React, { useCallback, useEffect, useMemo, useState } from 'react'
import CommonCard from '@app/modules/common/components/CommonCard'
import { KTIcon } from '@metronic/helpers'
import LoanApplicationForm from '../components/LoanApplicationForm'
import { Modal } from 'react-bootstrap'
import { fetchEmployeeLoans } from '@services/employee'
import { useSelector } from 'react-redux'
import { RootState } from '@redux/store'
import MaterialTable from '@app/modules/common/components/MaterialTable'
import { MRT_ColumnDef } from 'material-react-table'
import PendingLoanTable from '../components/PendingLoanTable'
import PreviousLoanTable from '../components/PreviousLoanTable'
import OngoingLoan from '../components/OngoingLoan'
import { useNavigate } from 'react-router-dom'
import { InstallmentTypeEnum, permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from '@constants/statistics'
import PaymentChangeRequest from '../components/PaymentChangeRequest'
import dayjs from 'dayjs'
import { formatNumber } from '@utils/statistics'
import { hasPermission } from '@utils/authAbac'

interface MyComponentProps {
    resource: string;
    viewOthers: boolean;
    viewOwn: boolean;
}

function PersonalLoan({ resource, viewOthers, viewOwn, isSelecteEmployee }: { resource: string; viewOthers: boolean; viewOwn: boolean; isSelecteEmployee?: boolean }) {
    const [showApplyLoanModal, setShowApplyLoanModal] = useState(false)
    let employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id)
    if (isSelecteEmployee) {
        employeeId = useSelector((state: RootState) => state.employee.selectedEmployee.id)
    }
    const [totalLoanAmountTaken, setTotalLoanAmountTaken] = useState(0)
    const [totalLoanAmountPaid, setTotalLoanAmountPaid] = useState(0)
    const [loanData, setLoanData] = useState<any[]>([])
    const [ongoingLoans, setOngoingLoans] = useState(0)
    const [ongoingLoansData, setOngoingLoansData] = useState<any[]>([])
    const [loanApplicationRequestData, setLoanApplicationRequestData] = useState<any[]>([])
    const [previousLoansData, setpreviousLoansData] = useState<any[]>([])
    const [paymentChangeRequestData, setPaymentChangeRequestData] = useState<any[]>([])
    const [amountDueThisMonth, setAmountDueThisMonth] = useState(0)
    const [totalAmountDue, setTotalAmountDue] = useState(0)
    const [allTimeTotalNumberOfLoans, setAllTimeTotalNumberOfLoans] = useState(0)
    const [allTimeTotalLoanTaken, setAllTimeTotalLoanTaken] = useState(0)
    const [allTimeTotalLoanPaid, setAllTimeTotalLoanPaid] = useState(0)
    const [allTimeTotalLoanPending, setAllTimeTotalLoanPending] = useState(0)
    const [allTimeTotalInstallments, setAllTimeTotalInstallments] = useState(0)
    const [allTimeTotalInstallmentPaid, setAllTimeTotalInstallmentPaid] = useState(0)
    const [allTimeTotalInstallmentPending, setAllTimeTotalInstallmentPending] = useState(0)
    const [allTimeTotalInstallmentSkipped, setAllTimeTotalInstallmentSkipped] = useState(0)
    let formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
    });

    const navigate = useNavigate()

    const fetchLoanData = useCallback(async () => {
            if (!employeeId) return;
            
            try {
                const res = await fetchEmployeeLoans(employeeId)
                const unsortedLoanDetails = res?.data?.loans
                unsortedLoanDetails?.forEach((ele: any) => {
                    
                    const currInstallments = ele?.loanInstallments
                    if (currInstallments?.length > 0) {
                        const sortedInstallments = currInstallments?.sort((a: any, b: any) => new Date(b?.dueDate).getTime() - new Date(a?.dueDate).getTime())
                        const sortedInstallmentsFinal = sortedInstallments?.map((ele: any, index: number) => ({
                            ...ele,
                            installmentOutOf: `${Number(sortedInstallments?.length) - index}/${sortedInstallments?.length}`
                        }))
                        if (ele?.loanInstallments) {
                            ele.loanInstallments = sortedInstallmentsFinal
                        }
                    }
                })
                const totalLoanDetails = res?.data?.loans
                const totalLoanTaken = totalLoanDetails?.reduce((acc: any, ele: any) => acc + Number(ele?.loanAmount), 0)
                setLoanData(res?.data?.loans)
                
                const uniqueLoans = new Set()
                totalLoanDetails?.forEach((ele: any) => {
                    uniqueLoans.add(ele?.loanId)
                })
                const ongoingLoansDataFinal = totalLoanDetails?.filter((ele: any) => {
                    const installments = ele?.loanInstallments
                    const anyInstallmentsTypeUpcoming = installments?.some((install: any) => install?.installmentType === InstallmentTypeEnum.Upcoming)
                    return anyInstallmentsTypeUpcoming;
                })
                
                setOngoingLoansData(ongoingLoansDataFinal)

                const applicationRequestDataFinal = totalLoanDetails?.filter((ele: any) => {
                    return !ele?.approvedById;
                })
                
                setLoanApplicationRequestData(applicationRequestDataFinal)

                const previousLoansDataFinal = totalLoanDetails?.filter((ele: any) => {
                    const installments = ele?.loanInstallments
                    const anyInstallmentsTypeUpcoming = installments?.some((install: any) => install?.installmentType === InstallmentTypeEnum.Upcoming)
                    return !anyInstallmentsTypeUpcoming && ele?.approvedById;
                })
                
                setpreviousLoansData(previousLoansDataFinal)

            } catch (error) {
                console.error("error: ", error)
            }
        }, [employeeId])

    useEffect(() => {
        // allTimeTotalNumberOfLoans
        setAllTimeTotalNumberOfLoans(loanData?.length)
        // allTimeTotalLoanTaken
        const totalLoanTaken = loanData?.reduce((acc: number, ele: any) => acc + Number(ele?.loanAmount), 0)
        setAllTimeTotalLoanTaken(totalLoanTaken)
        // allTimeTotalLoanPaid
        let totalLoanPaid = 0
        let installmentCount = 0
        let installmentPaidCount = 0
        let installmentCustomPaidCount = 0
        let installmentSkippedCount = 0
        loanData?.forEach((ele: any) => {
            const installments = ele?.loanInstallments
            installments?.forEach((install: any) => {
                totalLoanPaid += Number(install?.paidAmount)
                installmentCount++
                if (install?.installmentType === InstallmentTypeEnum.Paid) {
                    installmentPaidCount++
                }
                if (install?.installmentType === InstallmentTypeEnum.Custom_Paid) {
                    installmentCustomPaidCount++
                }
                if (install?.installmentType === InstallmentTypeEnum.Skipped) {
                    installmentSkippedCount++
                }
            })
        })
        setAllTimeTotalLoanPaid(totalLoanPaid)
        // allTimeTotalLoanPending
        setAllTimeTotalLoanPending(totalLoanTaken - totalLoanPaid)
        // allTimeTotalInstallmentAmount
        setAllTimeTotalInstallments(installmentCount)
        // allTimeTotalInstallmentPaid
        setAllTimeTotalInstallmentPaid(installmentPaidCount)
        // allTimeTotalInstallmentPending
        const pendingInstallments = Number(installmentCount) - Number(installmentSkippedCount) - Number(installmentCustomPaidCount)
        setAllTimeTotalInstallmentPending(pendingInstallments)
        // allTimeTotalInstallmentSkipped
        setAllTimeTotalInstallmentSkipped(installmentSkippedCount)
    }, [loanData])

    useEffect(() => {
        setOngoingLoans(ongoingLoansData?.length)
        const totalLoanTaken = ongoingLoansData?.reduce((acc: number, ele: any) => acc + Number(ele?.loanAmount), 0)
        setTotalLoanAmountTaken(totalLoanTaken)
        let totalLoanPaid = 0
        let amountDueThisMonth = 0
        let totalAmountToPayThisMonth = 0;
        let totalAmountPaidThisMonth = 0;
        ongoingLoansData?.forEach((ele: any) => {
            const installments = ele?.loanInstallments
            installments?.forEach((install: any) => {
                totalLoanPaid += Number(install?.paidAmount)
                const currDateMonthStart = dayjs().startOf("month")
                const currDateMonthEnd = dayjs().endOf("month")
                if (dayjs(new Date(install?.dueDate)).isSameOrBefore(currDateMonthEnd) && dayjs(new Date(install?.dueDate)).isSameOrAfter(currDateMonthStart)) {
                    totalAmountToPayThisMonth += Number(install?.installmentAmount)
                    totalAmountPaidThisMonth += Number(install?.paidAmount)
                }
            })
        })

        amountDueThisMonth = totalAmountToPayThisMonth - totalAmountPaidThisMonth
        setTotalLoanAmountPaid(totalLoanPaid)
        setAmountDueThisMonth(amountDueThisMonth)
        setTotalAmountDue(totalLoanTaken - totalLoanPaid)
    }, [ongoingLoansData])


    // Load data when component mounts or employeeId changes
    useEffect(() => {
        if(employeeId){
            fetchLoanData()
        }
    }, [fetchLoanData, employeeId]);

    // using callback to get and update state
    const handleLoanSubmited = useCallback(async (loan: any) => {
        await fetchLoanData();
    }, [fetchLoanData])
    

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center">
                <h2>Loans</h2>
            </div>
            <div>
                {/* //Ongoing Loans Overview */}
            <CommonCard>
                <div className="row gx-3 gy-4 align-items-start">
                    <div className="col-12 col-md-6">
                        <h3 
                        className="mt-0 mb-6"
                        style={{ fontSize: '19px', fontWeight: 600, fontFamily:'Inter' }}
                        >
                        Ongoing Loans Overview
                        </h3>
                        <div className="my-2 d-flex flex-column">
                            <span style={{ fontWeight: '600', fontSize: '14px', fontFamily:'Inter' }}>
                                Total Amount Due
                            </span>
                            <span
                                style={{ fontWeight: '600', fontSize: '24px', fontFamily:'Inter' }}
                            >
                                {formatter.format(totalAmountDue)}
                            </span>
                        </div>
                    </div>

                    <div className="col-12 col-md-6">
                        <div className="row gx-2 gy-3">
                            <div
                                className="col-12 col-sm-6 d-flex flex-column"
                                style={{
                                    borderLeft: '3px solid #FF0000',
                                paddingLeft: '10px',
                            }}
                        >
                            <span>Loan Amount Taken</span>
                            <span>{formatter.format(totalLoanAmountTaken)}</span>
                        </div>
                        <div
                            className="col-12 col-sm-6 d-flex flex-column"
                            style={{
                                borderLeft: '3px solid #1DD12C',
                                paddingLeft: '10px',
                            }}
                        >
                            <span>Loans Amount Paid</span>
                            <span>{formatter.format(totalLoanAmountPaid)}</span>
                        </div>
                        <div
                            className="col-12 col-sm-6 d-flex flex-column"
                            style={{
                                borderLeft: '3px solid #7397C5',
                                paddingLeft: '10px',
                            }}
                        >
                            <span>Ongoing Loans</span>
                            <span>{ongoingLoans}</span>
                        </div>
                        <div
                            className="col-12 col-sm-6 d-flex flex-column"
                            style={{
                                borderLeft: '3px solid #FF0000',
                                paddingLeft: '10px',
                            }}
                        >
                            <span>Amount Due This Month</span>
                            <span>{formatter.format(amountDueThisMonth)}</span>
                        </div>
                    </div>
                </div>
                </div>
            </CommonCard>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-12">
                <h3 style={{ fontSize: "19px", fontWeight: "semi-bold" }}>Ongoing Loans</h3>
            </div>
            <OngoingLoan completeLoanData={ongoingLoansData} resource={resource} viewOthers={viewOthers} viewOwn={viewOwn}  />
            {!isSelecteEmployee && <>
                <div className="d-flex justify-content-between align-items-center mt-12">
                    <h3 style={{  fontWeight: "semi-bold" }} className='fs-lg-1 fs-3'>Loan Application Requests</h3>
                    {hasPermission(resourceNameMapWithCamelCase.loan, permissionConstToUseWithHasPermission.create, employeeId) && <button
                        className="d-flex justify-content-between align-items-center bg-primary btn btn-lg btn-primary fs-7 w-auto"
                        onClick={() => setShowApplyLoanModal(true)}
                    >
                        <div>Apply For Loan</div>
                    </button>}
                </div>
                <PendingLoanTable completeLoanData={loanApplicationRequestData} onLoanSubmited={handleLoanSubmited} />
                <div className="d-flex justify-content-between align-items-center mt-12">
                    <h3 style={{ fontSize: "19px", fontWeight: "semi-bold" }}>Payment Change Requests</h3>
                </div>
                <PaymentChangeRequest completeLoanData={loanData} />
                <div className="d-flex justify-content-between align-items-center mt-12">
                    <h3 style={{ fontSize: "19px", fontWeight: "semi-bold" }}>Previous Loan</h3>
                </div>
                <PreviousLoanTable completeLoanData={previousLoansData} />
                <CommonCard>
                    <h3>All Time Stats</h3>

                    <div className="row gx-2 gy-3">
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Total Number Of Loans</span>
                            <span>{allTimeTotalNumberOfLoans}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Total Loan Taken</span>
                            <span>{formatNumber(allTimeTotalLoanTaken)}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Total Loan Paid</span>
                            <span>{formatNumber(allTimeTotalLoanPaid)}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Total Loan Pending</span>
                            <span>{formatNumber(allTimeTotalLoanPending)}</span>
                        </div>
                    </div>

                    <div className="row gx-2 gy-3 mt-2">
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Total Installments</span>
                            <span>{allTimeTotalInstallments}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Paid Installments</span>
                            <span>{formatNumber(allTimeTotalInstallmentPaid)}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Pending Installments</span>
                            <span>{formatNumber(allTimeTotalLoanPending)}</span>
                        </div>
                        <div className="col-12 col-sm-6 col-md-3 my-2 d-flex flex-column">
                            <span>Skipped Installments</span>
                            <span>{formatNumber(allTimeTotalInstallmentSkipped)}</span>
                        </div>
                    </div>
                </CommonCard>
                <Modal show={showApplyLoanModal} onHide={() => setShowApplyLoanModal(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Loan Application Form</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <LoanApplicationForm setShowModalFunc={setShowApplyLoanModal} onLoanSubmited={handleLoanSubmited} />
                    </Modal.Body>
                </Modal>
            </>}
        </div>
    )
}

export default PersonalLoan