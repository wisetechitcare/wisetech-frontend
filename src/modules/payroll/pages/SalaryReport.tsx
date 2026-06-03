import React, { useMemo } from 'react';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';

import PayrollStatsCards from '../components/cards/PayrollStatsCards';
import PaymentDetailsTable from '../components/table/PaymentDetailsTable';
import BreakdownTable from '../components/table/BreakdownTable';
import NetAmountPayable from '../components/common/NetAmountPayable';
import DeductionPanel from '../components/common/DeductionPanel';
import SalarySlipSection from '../components/SalarySlipSection';
import GrossDistributionModal from '../components/modals/GrossDistributionModal';
import PaymentModal from '../components/modals/PaymentModal';
import SalaryIncrementModal from '@app/modules/employee/salary/SalaryIncrementModal';
import { DeductionDistributionModal } from '@pages/employee/salary/personal/views/my-salary/DeductionDistributionModal';

import { usePayrollData } from '../hooks/usePayrollData';
import { useSalaryCalculations } from '../hooks/useSalaryCalculations';
import { useSalaryReport } from '../hooks/useSalaryReport';
import { useGrossDistribution } from '../hooks/useGrossDistribution';

import { SalaryReportProps } from '../types/payroll.types';
import { BREAKDOWN_TYPES } from '../constants/payroll.constants';
import { transformApiDataToSalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';

const SalaryReport: React.FC<SalaryReportProps> = (props) => {
    const {
        employee,
        year,
        month = dayjs().format('MM'),
        fromAdmin = false,
        isYearly = false,
        hideSummarySection = false,
        showSensitiveData,
        monthlyApiData,
        isApiDataLoading,
        onRefreshSalaryData
    } = props;

    const payrollData = usePayrollData(employee, year, month, isYearly, fromAdmin);
    const ui = useSalaryReport();
    const grossDist = useGrossDistribution(employee, month, year, ui.handleRefresh);

    const { summaryData, tableRows, apiSalaryData, finalTotalGrossPayAmount } = useSalaryCalculations(
        monthlyApiData,
        employee,
        !!monthlyApiData,
        0,
        month,
        year
    );

    const salarySlipProps = useMemo(() => {
        if (!apiSalaryData) return null;
        return transformApiDataToSalarySlipProps(apiSalaryData, employee);
    }, [apiSalaryData, employee]);

    if (payrollData.isLoading || isApiDataLoading) {
        return (
            <Container fluid className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </Container>
        );
    }

    return (
        <div className="payroll-module">
            <style jsx>{`
                .sensitive-data-hidden { filter: blur(5px); user-select: none; }
                .sensitive-data-visible { filter: none; }
                :global(.wt-btn-primary) {
                    background-color: #AA393D !important;
                    border-color: #AA393D !important;
                    color: #fff !important;
                }
            `}</style>

            <div className="px-4 px-lg-5">
                {!hideSummarySection && (
                    <div className="my-5 w-100">
                        <div className="mb-6">
                            <PayrollStatsCards summaryData={summaryData} showSensitiveData={showSensitiveData} />
                        </div>
                    </div>
                )}

                <div className="my-4 w-100">
                    <Card className="shadow-sm w-100 border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
                        <div className="p-6 border-bottom bg-light bg-opacity-50 d-flex justify-content-between align-items-center">
                            <div>
                                <h4 className="fw-bolder text-gray-800 mb-1">Financial Breakdown</h4>
                                <p className="text-muted fs-7 mb-0">Detailed analysis of earnings and deductions for the selected period</p>
                            </div>
                            <div className="d-flex gap-3">
                                {fromAdmin && !isYearly && (
                                    <>
                                        <Button variant="outline-danger" size="sm" className="fw-bold px-4 border-2" onClick={() => ui.setShowIncrementModal(true)}>
                                            Increment Salary
                                        </Button>
                                        <Button variant="outline-primary" size="sm" className="fw-bold px-4 border-2" onClick={() => grossDist.fetchGrossDistributionData().then(() => ui.setShowGrossModal(true))}>
                                            Modify Gross
                                        </Button>
                                        <Button variant="outline-secondary" size="sm" className="fw-bold px-4 border-2" onClick={() => ui.setShowDeductionModal(true)}>
                                            Modify Deductions
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="mb-8 p-6 rounded-4 bg-white border border-dashed border-gray-300">
                                <SalarySlipSection
                                    salarySlipProps={salarySlipProps}
                                    userId={employee.userId}
                                    employeeId={employee.id}
                                    loading={ui.loading}
                                    setLoading={ui.setLoading}
                                />
                            </div>

                            <Row className="g-8 mb-8">
                                <Col lg={6}>
                                    <div className="p-6 rounded-4 h-100 shadow-sm" style={{ backgroundColor: '#F0F7FF', border: '1px solid rgba(41, 93, 142, 0.1)' }}>
                                        <div className="d-flex align-items-center mb-6">
                                            <div className="symbol symbol-40px me-4">
                                                <div className="symbol-label bg-primary bg-opacity-10">
                                                    <KTIcon iconName="wallet" className="fs-2 text-primary" />
                                                </div>
                                            </div>
                                            <h5 className="fw-bolder mb-0" style={{ color: '#295D8E' }}>Salary Breakdown</h5>
                                        </div>
                                        <BreakdownTable
                                            data={apiSalaryData?.grossPayBreakdown || { fixed: {}, variable: {} }}
                                            type={BREAKDOWN_TYPES.GROSS}
                                            title="Earnings"
                                            showSensitiveData={showSensitiveData}
                                        />
                                    </div>
                                </Col>
                                <Col lg={6}>
                                    <div className="p-6 rounded-4 h-100 shadow-sm" style={{ backgroundColor: '#FBF0F1', border: '1px solid rgba(170, 57, 61, 0.1)' }}>
                                        <div className="d-flex align-items-center mb-6">
                                            <div className="symbol symbol-40px me-4">
                                                <div className="symbol-label bg-danger bg-opacity-10">
                                                    <KTIcon iconName="minus-circle" className="fs-2 text-danger" />
                                                </div>
                                            </div>
                                            <h5 className="fw-bolder mb-0" style={{ color: '#AA393D' }}>Salary Deductions</h5>
                                        </div>
                                        <DeductionPanel
                                            deductionBreakdown={apiSalaryData?.deductionBreakdown || { fixed: {}, variable: {} }}
                                            grossPay={finalTotalGrossPayAmount}
                                            showSensitiveData={showSensitiveData}
                                        />
                                    </div>
                                </Col>
                            </Row>

                            <NetAmountPayable
                                grossPay={finalTotalGrossPayAmount}
                                deductionBreakdown={apiSalaryData?.deductionBreakdown || { fixed: {}, variable: {} }}
                                fallbackNetAmount={0}
                                showSensitiveData={showSensitiveData}
                                isApiDataLoaded={!!apiSalaryData}
                            />
                        </div>
                    </Card>
                </div>

                {!hideSummarySection && (
                    <div className="my-5 w-100">
                        <PaymentDetailsTable
                            tableRows={tableRows as any}
                            showSensitiveData={showSensitiveData}
                            fromAdmin={fromAdmin}
                            onAddPayment={() => ui.handlePaymentEdit()}
                            onEditPayment={ui.handlePaymentEdit}
                            onDeletePayment={(item) => ui.handleDeletePayment(item)}
                        />
                    </div>
                )}
            </div>

            {/* Modals */}
            <GrossDistributionModal
                show={ui.showGrossModal}
                onHide={() => ui.setShowGrossModal(false)}
                loading={grossDist.loading}
                initialValues={grossDist.initialValues}
                validationSchema={grossDist.validationSchema}
                grossDistributionData={grossDist.grossDistributionData}
                dynamicFields={grossDist.dynamicFields}
                deletedFields={grossDist.deletedFields}
                onAddComment={grossDist.addNewField}
                onRemoveField={grossDist.removeField}
                onUpdateFieldName={grossDist.updateFieldName}
                onSubmit={grossDist.handleSubmit}
            />

            <SalaryIncrementModal
                show={ui.showIncrementModal}
                onHide={() => ui.setShowIncrementModal(false)}
                employee={employee}
                onSuccess={ui.handleRefresh}
                fromAdmin={fromAdmin}
            />

            <DeductionDistributionModal
                show={ui.showDeductionModal}
                onClose={() => ui.setShowDeductionModal(false)}
                employeeId={employee.id}
                month={month}
                year={year}
                onSuccess={() => ui.handleRefresh(onRefreshSalaryData)}
                monthlyApiData={monthlyApiData}
            />

            <PaymentModal
                show={ui.showPaymentModal}
                onHide={() => ui.setShowPaymentModal(false)}
                loading={ui.loading}
                initialValues={ui.paymentInitialValues}
                editMode={ui.editMode}
                onSubmit={(values) => {
                    ui.handlePaymentSubmit(values, apiSalaryData?.id, employee.id, month, year, employee.companyId, onRefreshSalaryData);
                }}
                employeeName={`${employee.users.firstName} ${employee.users.lastName}`}
                month={dayjs().month(parseInt(month as string) - 1).format('MMMM')}
                year={year.toString()}
                netPayable={summaryData.netSalary}
                salaryPaid={summaryData.salaryPaid}
                governmentPaid={summaryData.governmentPaid}
                grossSalary={summaryData.totalGrossPay}
                variableDeductions={summaryData.totalVariableDeduction}
                fixedDeductions={summaryData.totalFixedDeduction}
                statutoryBreakdown={apiSalaryData?.deductionBreakdown?.fixed || {}}
            />
        </div>
    );
};

export default SalaryReport;
