import React, { useMemo } from 'react';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';

// Components
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

// Hooks
import { usePayrollData } from '../hooks/usePayrollData';
import { useSalaryCalculations } from '../hooks/useSalaryCalculations';
import { useSalaryReport } from '../hooks/useSalaryReport';
import { useGrossDistribution } from '../hooks/useGrossDistribution';

// Types & Utils
import { SalaryReportProps } from '../types/payroll.types';
import { formatINR2, parseCurrencyString } from '../utils/payrollFormatters';
import { BREAKDOWN_TYPES } from '../constants/payroll.constants';
import { transformApiDataToSalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';

const SalaryReport: React.FC<SalaryReportProps> = (props) => {
    const {
        stats,
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

    // 1. Data & Logic Hooks
    const payrollData = usePayrollData(employee, year, month, isYearly, fromAdmin);
    const ui = useSalaryReport();
    const grossDist = useGrossDistribution(employee, month, year, ui.handleRefresh);
    
    const {
        summaryData,
        tableRows,
        apiSalaryData,
        finalTotalGrossPayAmount
    } = useSalaryCalculations(
        monthlyApiData,
        employee,
        !!monthlyApiData?.salaryData?.[0],
        0 // Add calculation logic for fallback if needed
    );

    // 2. Transformed Data for PDF
    const salarySlipProps = useMemo(() => {
        if (!monthlyApiData?.salaryData?.[0]) return null;
        return transformApiDataToSalarySlipProps(monthlyApiData.salaryData[0], employee);
    }, [monthlyApiData, employee]);

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

            {!hideSummarySection && (
                <Container fluid className="my-5 w-100 px-0">
                    <PayrollStatsCards summaryData={summaryData} showSensitiveData={showSensitiveData} />
                    <PaymentDetailsTable 
                        tableRows={tableRows as any}
                        showSensitiveData={showSensitiveData}
                        fromAdmin={fromAdmin}
                        onAddPayment={() => ui.handlePaymentEdit()}
                        onEditPayment={ui.handlePaymentEdit}
                        onDeletePayment={(item) => ui.handleDeletePayment(item.id)}
                    />
                </Container>
            )}

            <Container fluid className="my-4 w-100 px-0">
                <Card className="p-4 shadow-sm w-100">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h4 className="fw-bold mb-0">Salary Report</h4>
                        <div className="d-flex gap-2">
                            {fromAdmin && !isYearly && (
                                <>
                                    <Button variant="outline-secondary" size="sm" onClick={() => ui.setShowIncrementModal(true)} >
                                        Increment Salary
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={() => grossDist.fetchGrossDistributionData().then(() => ui.setShowGrossModal(true))} >
                                        Modify Gross
                                    </Button>
                                    <Button variant="outline-secondary" size="sm" onClick={() => ui.setShowDeductionModal(true)} >
                                        Modify Deductions
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <SalarySlipSection 
                        salarySlipProps={salarySlipProps}
                        userId={employee.userId}
                        employeeId={employee.id}
                        loading={ui.loading}
                        setLoading={ui.setLoading}
                    />

                    <Row className="g-4">
                        <Col lg={6}>
                            <div className="p-4 rounded-3 h-100" style={{ backgroundColor: '#F0F7FF', border: '1px solid #D0E3F7' }}>
                                <h5 className="fw-bold mb-4" style={{ color: '#295D8E' }}>Gross Pay Breakdown</h5>
                                <BreakdownTable 
                                    data={apiSalaryData?.grossPayBreakdown || { fixed: {}, variable: {} }} 
                                    type={BREAKDOWN_TYPES.GROSS}
                                    title="Pay"
                                    showSensitiveData={showSensitiveData}
                                />
                            </div>
                        </Col>
                        <Col lg={6}>
                            <div className="p-4 rounded-3 h-100" style={{ backgroundColor: '#FBF0F1', border: '1px solid #E5C8CA' }}>
                                <h5 className="fw-bold mb-4" style={{ color: '#AA393D' }}>Deductions Breakdown</h5>
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
                </Card>
            </Container>

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
                onSuccess={ui.handleRefresh}
                monthlyApiData={monthlyApiData}
            />

            <PaymentModal 
                show={ui.showPaymentModal}
                onHide={() => ui.setShowPaymentModal(false)}
                loading={ui.loading}
                initialValues={ui.paymentInitialValues}
                editMode={ui.editMode}
                onSubmit={(values) => ui.handlePaymentSubmit(values, employee.id)}
            />
        </div>
    );
};

export default SalaryReport;
