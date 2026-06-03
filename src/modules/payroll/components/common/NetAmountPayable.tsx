import React from 'react';
import { NetAmountPayableProps } from '../../types/payroll.types';
import { formatINR2, roundPayrollAmount, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const NetAmountPayable: React.FC<NetAmountPayableProps> = ({
    grossPay,
    deductionBreakdown,
    fallbackNetAmount,
    showSensitiveData,
    isApiDataLoaded,
    payrollTotalDeductions,
}) => {
    const variableEntriesAll = Object.entries(deductionBreakdown?.variable || {});
    const fixedEntriesAll = Object.entries(deductionBreakdown?.fixed || {});

    const variableEntries = variableEntriesAll.filter(([, item]) => item?.isActive !== false);
    const fixedEntries = fixedEntriesAll.filter(([, item]) => item?.isActive !== false);

    const totalVariable = variableEntries.reduce((acc, [, item]: [string, any]) => acc + Number(item?.earned || 0), 0);
    const totalFixed = fixedEntries.reduce((acc, [, item]: [string, any]) => acc + Number(item?.earned || 0), 0);
    const totalDeductions = totalVariable + totalFixed;
    const intermediateSalary = Math.max(0, grossPay - totalVariable);
    const net = isApiDataLoaded ? intermediateSalary - totalFixed : fallbackNetAmount;
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const displayedBreakdownTotal = roundPayrollAmount(totalVariable) + roundPayrollAmount(totalFixed);
    const displayedPayrollTotal = roundPayrollAmount(payrollTotalDeductions ?? totalDeductions);
    const canShowPayableTrail =
        isApiDataLoaded &&
        displayedBreakdownTotal === displayedPayrollTotal;

    if (isApiDataLoaded && !canShowPayableTrail) {
        console.error('[Payroll] Salary in hand validation failed', {
            displayedBreakdownTotal,
            payrollTotalDeductions: displayedPayrollTotal,
            variableDeductions: totalVariable,
            fixedDeductions: totalFixed,
            rawBreakdownTotal: totalDeductions,
            rawPayrollTotalDeductions: payrollTotalDeductions,
        });
    }

    return (
        <div className="card border-0 shadow-sm mt-6 bg-white rounded-3 overflow-hidden">
            <div className="card-body py-4 px-6">
                {canShowPayableTrail && (
                    <div className="mb-5 pb-5 border-bottom border-gray-200">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <h5 className="fw-bolder text-gray-800 mb-1">Salary In Hand Calculation</h5>
                                <span className="text-muted fs-8 fw-semibold">Gross pay after attendance adjustments and tax deductions</span>
                            </div>
                            <span className="badge badge-light-danger fw-bolder fs-9">Verified</span>
                        </div>
                        <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2">
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-2 border border-gray-100 flex-fill">
                                <span className="text-gray-500 fs-9 fw-bold text-uppercase">Total Gross Pay</span>
                                <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>{formatINR2(grossPay)}</span>
                            </div>
                            <span className="d-none d-lg-inline text-gray-400 fw-bolder">-</span>
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-2 border border-gray-100 flex-fill">
                                <span className="text-gray-500 fs-9 fw-bold text-uppercase">Attendance Adjustments</span>
                                <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-{formatINR2(totalVariable)}</span>
                            </div>
                            <span className="d-none d-lg-inline text-gray-400 fw-bolder">=</span>
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light rounded-2 border border-gray-100 flex-fill">
                                <span className="text-gray-500 fs-9 fw-bold text-uppercase">Salary After Adjustment</span>
                                <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>{formatINR2(intermediateSalary)}</span>
                            </div>
                            <span className="d-none d-lg-inline text-gray-400 fw-bolder">-</span>
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light-danger rounded-2 border border-danger border-opacity-10 flex-fill">
                                <span className="text-gray-500 fs-9 fw-bold text-uppercase">Tax Deductions</span>
                                <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-{formatINR2(totalFixed)}</span>
                            </div>
                            <span className="d-none d-lg-inline text-gray-400 fw-bolder">=</span>
                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light-success rounded-2 border border-success border-opacity-10 flex-fill">
                                <span className="text-gray-500 fs-9 fw-bold text-uppercase">Total Payable</span>
                                <span className={`text-success fw-bolder fs-7 ${sensitiveCls}`}>{formatINR2(net)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-4">
                    <div className="d-flex align-items-center">
                        <div className="symbol symbol-40px me-4">
                            <div className="symbol-label bg-light-success text-success shadow-xs" style={{ border: '1px solid rgba(80, 205, 137, 0.2)' }}>
                                <i className="bi bi-wallet2 fs-3"></i>
                            </div>
                        </div>
                        <div>
                            <div className="d-flex align-items-center mb-0">
                                <h4 className="fw-bolder text-gray-800 mb-0 me-3">Salary In Hand</h4>
                                <span className="badge badge-light-success fw-bolder fs-10 px-2 py-1 text-uppercase ls-1">Verified</span>
                            </div>
                            <span className="text-muted fs-8 fw-semibold">Final calculated salary after deductions</span>
                        </div>
                    </div>
                        <div className="bg-success px-6 py-3 rounded-3 shadow-sm min-w-150px text-end position-relative overflow-hidden">
                            <div className="position-absolute top-0 start-0 w-100 h-100 opacity-10" style={{ background: 'linear-gradient(135deg, #ffffff 0%, transparent 100%)' }}></div>
                            <span className="text-white text-opacity-75 fw-bold fs-10 text-uppercase d-block mb-1 ls-1">Payable Amount</span>
                            <div className={`fs-3 fw-bolder text-white ${sensitiveCls} lh-1`}>
                                {formatINR2(net)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
};

export default React.memo(NetAmountPayable);
