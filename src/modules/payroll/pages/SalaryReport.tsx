import React, { useMemo } from 'react';
import { Container, Card, Row, Col, Button } from 'react-bootstrap';
import dayjs from 'dayjs';
import { KTIcon } from '@metronic/helpers';

import PayrollStatsCards from '../components/cards/PayrollStatsCards';
import PaymentDetailsTable from '../components/table/PaymentDetailsTable';
import BreakdownTable from '../components/table/BreakdownTable';
import DeductionPanel from '../components/common/DeductionPanel';
import SalarySlipSection from '../components/SalarySlipSection';
import GrossDistributionModal from '../components/modals/GrossDistributionModal';
import PaymentModal from '../components/modals/PaymentModal';
import { DeductionDistributionModal } from '@pages/employee/salary/personal/views/my-salary/DeductionDistributionModal';

import { usePayrollData } from '../hooks/usePayrollData';
import { useSalaryCalculations } from '../hooks/useSalaryCalculations';
import { useSalaryReport } from '../hooks/useSalaryReport';
import { useGrossDistribution } from '../hooks/useGrossDistribution';
import { useSalaryMaster } from '../hooks/useSalaryComponentNames';

import { SalaryReportProps } from '../types/payroll.types';
import { BREAKDOWN_TYPES } from '../constants/payroll.constants';
import { transformApiDataToSalarySlipProps } from '@pages/employee/salary/utils/salarySlipDataTransformer';
import { Box } from '@mui/material';
import MonthlyOverviewCard from '@pages/employee/salary/personal/views/my-salary/Toggle/MonthlyOverviewCard';
import MonthlySalaryPieChart from '../components/charts/MonthlySalaryPieChart';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

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
    const { resolveName, resolveComponent } = useSalaryMaster();

    const tableData = useSelector((state: RootState) => isYearly ? state.attendanceStats.yearlyTable : state.attendanceStats.monthlyTable);

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
        <div className="payroll-module" style={{
            minHeight: '100%',
            paddingBottom: '2rem',
        }}>
            <style>{`
                .sensitive-data-hidden { filter: blur(5px); user-select: none; }
                .sensitive-data-visible { filter: none; }
                .wt-btn-primary {
                    background-color: #AA393D !important;
                    border-color: #AA393D !important;
                    color: #fff !important;
                }
            `}</style>

            <div>
                {!hideSummarySection && (
                    <div className="my-5 w-100">
                        <div className="mb-6">
                            <PayrollStatsCards summaryData={summaryData} showSensitiveData={showSensitiveData} month={month} year={year} />
                        </div>
                        <Box
                            sx={{
                                display: { xs: 'none', md: 'grid' },
                                gridTemplateColumns: {
                                    xs: '1fr',
                                    md: 'repeat(2, minmax(0, 1fr))',
                                    lg: 'minmax(0, 1fr) minmax(0, 1.4fr)',
                                },
                                gap: 1.25,
                                alignItems: 'start',
                                mb: 6
                            }}
                        >
                            <MonthlyOverviewCard
                                presentDays={(apiSalaryData as any)?.extraData?.presentDays || tableData?.filter((s: any) => s.status?.toLowerCase().includes('present') || s.status?.toLowerCase().includes('late')).length || 0}
                                absentDays={(apiSalaryData as any)?.extraData?.absentDays || tableData?.filter((s: any) => s.status?.toLowerCase().includes('absent')).length || 0}
                                paidLeaves={salarySlipProps?.paidLeaves || 0}
                                unpaidLeaves={salarySlipProps?.unpaidLeaves || 0}
                                lateCheckins={(apiSalaryData as any)?.extraData?.lateCheckins || tableData?.filter((s: any) => s.status?.toLowerCase().includes('late')).length || 0}
                                netPayable={summaryData.netSalary}
                                showSensitiveData={showSensitiveData}
                            />
                            <Box sx={{ minWidth: 0, '& > .card, & > .MuiPaper-root': { height: '100%', mb: '0 !important' } }}>
                                <MonthlySalaryPieChart salarySlipProps={salarySlipProps} showSensitiveData={showSensitiveData} />
                            </Box>
                        </Box>
                    </div>
                )}

                <div className="my-4 w-100">
                    <Card className="shadow-sm w-100 border-0 overflow-hidden" style={{ borderRadius: '16px' }}>
                        {/* Header */}
                        <div className="p-4 p-lg-6 border-bottom bg-light bg-opacity-50 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">
                            <div>
                                <h4 className="fw-bolder text-gray-800 mb-1">Financial Breakdown</h4>
                                <p className="text-muted fs-7 mb-0">Detailed analysis of earnings and deductions for the selected period</p>
                            </div>
                            {fromAdmin && !isYearly && (
                                <div className="d-flex flex-row gap-2 w-100 w-sm-auto mt-3 mt-sm-0">
                                    <Button variant="light-primary" size="sm" className="fw-bold px-2 px-sm-4 w-50 w-sm-auto text-truncate" onClick={() => grossDist.fetchGrossDistributionData().then(() => ui.setShowGrossModal(true))}>
                                        Modify Gross
                                    </Button>
                                    <Button variant="light-danger" size="sm" className="fw-bold px-2 px-sm-4 w-50 w-sm-auto text-truncate" onClick={() => ui.setShowDeductionModal(true)}>
                                        Modify Deductions
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="p-4 p-lg-6">
                            {/* Download / Email buttons */}
                            <SalarySlipSection
                                salarySlipProps={salarySlipProps}
                                userId={employee.userId}
                                employeeId={employee.id}
                                salaryId={apiSalaryData?.id as string}
                                loading={ui.loading}
                                setLoading={ui.setLoading}
                            />

                            {/* Breakdown tables */}
                            <Row className="g-4 g-lg-6 mb-4 mb-lg-6">
                                <Col xs={12} lg={6}>
                                    <div className="p-4 p-lg-6 rounded-4 h-100 bg-white border border-gray-200 d-flex flex-column">
                                        <div className="d-flex align-items-center mb-5 mb-lg-6">
                                            <div className="symbol symbol-40px me-4">
                                                <div className="symbol-label bg-light-success">
                                                    <KTIcon iconName="wallet" className="fs-2 text-success" />
                                                </div>
                                            </div>
                                            <h5 className="fw-bolder mb-0 text-gray-800">Salary Breakdown</h5>
                                        </div>
                                        <BreakdownTable
                                            data={apiSalaryData?.grossPayBreakdown || { fixed: {}, variable: {} }}
                                            type={BREAKDOWN_TYPES.GROSS}
                                            title="Earnings"
                                            showSensitiveData={showSensitiveData}
                                            hourlySalary={apiSalaryData?.hourlySalary}
                                            dailySalary={apiSalaryData?.hourlySalary ? apiSalaryData.hourlySalary * 8 : undefined}
                                            resolveName={resolveName}
                                            resolveComponent={resolveComponent}
                                        />
                                    </div>
                                </Col>
                                <Col xs={12} lg={6}>
                                    <div className="p-4 p-lg-6 rounded-4 h-100 bg-white border border-gray-200 d-flex flex-column">
                                        <div className="d-flex align-items-center mb-5 mb-lg-6">
                                            <div className="symbol symbol-40px me-4">
                                                <div className="symbol-label bg-light-danger">
                                                    <KTIcon iconName="minus-circle" className="fs-2 text-danger" />
                                                </div>
                                            </div>
                                            <h5 className="fw-bolder mb-0 text-gray-800">Salary Deductions</h5>
                                        </div>
                                        <DeductionPanel
                                            deductionBreakdown={apiSalaryData?.deductionBreakdown || { fixed: {}, variable: {} }}
                                            grossPay={finalTotalGrossPayAmount}
                                            showSensitiveData={showSensitiveData}
                                            dailySalary={apiSalaryData?.hourlySalary ? apiSalaryData.hourlySalary * 8 : undefined}
                                            resolveName={resolveName}
                                            resolveComponent={resolveComponent}
                                        />
                                    </div>
                                </Col>
                            </Row>
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
                govtPayments={(apiSalaryData as any)?.govtPayments || []}
            />
        </div>
    );
};

export default SalaryReport;
