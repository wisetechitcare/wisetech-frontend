import React from 'react';
import { NetAmountPayableProps } from '../../types/payroll.types';
import { formatINR2, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const NetAmountPayable: React.FC<NetAmountPayableProps> = ({
    grossPay,
    deductionBreakdown,
    fallbackNetAmount,
    showSensitiveData,
    isApiDataLoaded,
}) => {
    const totalVariable = sumBreakdownEarnings(deductionBreakdown?.variable);
    const totalFixed = sumBreakdownEarnings(deductionBreakdown?.fixed);
    const intermediateSalary = Math.max(0, grossPay - totalVariable);
    const net = isApiDataLoaded ? intermediateSalary - totalFixed : fallbackNetAmount;
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    return (
        <div className="card border-0 shadow-sm mt-6 bg-white rounded-3 overflow-hidden">
            <div className="card-body py-4 px-6">
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

                    <div className="d-flex align-items-center gap-5 w-100 w-md-auto justify-content-between justify-content-md-end">
                        {isApiDataLoaded && (
                            <div className="d-none d-lg-flex align-items-center gap-2 text-gray-400 fs-8 fw-bold">
                                <div className="d-flex align-items-center px-3 py-1 bg-light rounded-2 border border-gray-100">
                                    <span className="text-gray-500 me-2 fs-9">GROSS</span>
                                    <span className={`text-gray-700 ${sensitiveCls}`}>{formatINR2(grossPay)}</span>
                                </div>
                                <span>−</span>
                                <div className="d-flex align-items-center px-3 py-1 bg-light rounded-2 border border-gray-100">
                                    <span className="text-gray-500 me-2 fs-9">DEDUCTIONS</span>
                                    <span className={`text-danger ${sensitiveCls}`}>{formatINR2(totalVariable + totalFixed)}</span>
                                </div>
                                <span className="fs-6 text-gray-300">=</span>
                            </div>
                        )}

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
        </div>
    );
};

export default React.memo(NetAmountPayable);
