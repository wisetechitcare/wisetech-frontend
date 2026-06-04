import React from 'react';
import { NetAmountPayableProps } from '../../types/payroll.types';
import { formatINRDecimal, formatINRRounded, roundPayrollAmount } from '../../utils/payrollFormatters';
import './NetAmountPayable.css';

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

    const isNegative = net < 0;
    
    // Calculate percentage retained
    const retentionPercentage = grossPay > 0 ? Math.max(0, Math.round((net / grossPay) * 100)) : 0;
    
    let insightText = '';
    if (isNegative) {
        insightText = 'You had higher deductions than earnings this month.';
    } else if (grossPay === 0) {
        insightText = 'No earnings calculated for this month.';
    } else {
        insightText = `${retentionPercentage}% of gross salary retained after deductions.`;
    }

    return (
        <div className="payroll-summary-container mt-3">
            <div className="payroll-summary-card">
                {/* Header */}
                <div className="payroll-summary-header">
                    <div>
                        <h5 className="payroll-summary-title">Salary In Hand</h5>
                        <p className="payroll-summary-desc mb-0">Final payroll summary after attendance and tax adjustments</p>
                    </div>
                    {canShowPayableTrail && (
                        <div className="badge-verified">
                            <i className="bi bi-check2"></i> Verified
                        </div>
                    )}
                </div>

                {/* Horizontal / Stacked Flow */}
                {canShowPayableTrail && (
                    <div className="salary-flow-container">
                        <div className="salary-flow-item">
                            <span className="flow-label">Gross Pay</span>
                            <span className={`flow-amount ${sensitiveCls}`}>{formatINRDecimal(grossPay)}</span>
                        </div>
                        
                        <div className="flow-arrow d-none d-md-flex"><i className="bi bi-arrow-right"></i></div>
                        
                        <div className="salary-flow-item item-deduction">
                            <span className="flow-label">Attendance Adj.</span>
                            <span className={`flow-amount ${sensitiveCls}`}>-{formatINRDecimal(totalVariable)}</span>
                        </div>
                        
                        <div className="flow-arrow d-none d-md-flex"><i className="bi bi-arrow-right"></i></div>
                        
                        <div className="salary-flow-item">
                            <span className="flow-label">After Adj.</span>
                            <span className={`flow-amount ${sensitiveCls}`}>{formatINRDecimal(intermediateSalary)}</span>
                        </div>
                        
                        <div className="flow-arrow d-none d-md-flex"><i className="bi bi-arrow-right"></i></div>
                        
                        <div className="salary-flow-item item-deduction">
                            <span className="flow-label">Tax Deductions</span>
                            <span className={`flow-amount ${sensitiveCls}`}>-{formatINRDecimal(totalFixed)}</span>
                        </div>
                        
                        <div className="flow-arrow d-none d-md-flex"><i className="bi bi-arrow-right"></i></div>
                        
                        <div className={`salary-flow-item ${isNegative ? 'item-net-negative' : 'item-net'}`}>
                            <span className="flow-label">Net Pay</span>
                            <span className={`flow-amount ${sensitiveCls}`}>
                                {isNegative ? `-${formatINRRounded(Math.abs(net))}` : formatINRRounded(net)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Salary Summary Breakdown */}
                <div className="summary-section d-flex gap-4 flex-column flex-md-row">
                    <div className="flex-grow-1">
                        <div className="summary-insight-card h-100">
                            <div className="d-flex flex-column h-100 justify-content-between">
                                <div>
                                    <h6 className="fw-bolder text-gray-800 mb-4">Payroll Summary</h6>
                                    
                                    <div className="summary-breakdown-row">
                                        <span className="breakdown-label">Gross Pay</span>
                                        <span className={`breakdown-value ${sensitiveCls}`}>{formatINRDecimal(grossPay)}</span>
                                    </div>
                                    <div className="summary-breakdown-row">
                                        <span className="breakdown-label">Total Deductions</span>
                                        <span className={`breakdown-value text-danger ${sensitiveCls}`}>-{formatINRDecimal(totalDeductions)}</span>
                                    </div>
                                    
                                    <div className="progress-bar-container">
                                        <div 
                                            className={`progress-bar-fill ${isNegative ? 'negative' : 'positive'}`}
                                            style={{ width: `${isNegative ? 100 : retentionPercentage}%` }}
                                        ></div>
                                    </div>
                                    
                                    <p className="insight-text mb-0">
                                        <i className="bi bi-lightbulb text-warning me-1"></i>
                                        {insightText}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="d-flex flex-column align-items-md-end justify-content-center min-w-md-250px mt-4 mt-md-0">
                        <span className="summary-net-label">Net Salary</span>
                        <div className={`summary-net-amount ${isNegative ? 'negative' : 'positive'} ${sensitiveCls}`}>
                            {isNegative ? `-${formatINRRounded(Math.abs(net))}` : formatINRRounded(net)}
                        </div>
                        
                        <div className={`summary-status ${isNegative ? 'status-adjustment' : 'status-clear'}`}>
                            {isNegative ? (
                                <><i className="bi bi-exclamation-triangle-fill"></i> Needs Adjustment</>
                            ) : (
                                <><i className="bi bi-check-circle-fill"></i> Ready to Pay</>
                            )}
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    );
};

export default React.memo(NetAmountPayable);
