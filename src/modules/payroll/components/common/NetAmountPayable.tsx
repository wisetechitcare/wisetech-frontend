import React from 'react';
import { NetAmountPayableProps } from '../../types/payroll.types';
import { formatINR2, sumBreakdownEarnings } from '../../utils/payrollFormatters';
import { miscellaneousIcons } from '@metronic/assets/miscellaneousicons/index';

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
        <div
            className="mt-4 p-4 rounded-3"
            style={{ backgroundColor: '#E8F9F6', border: '1px solid #BDEFE8' }}
        >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div className="d-flex align-items-center">
                    <div
                        className="d-flex align-items-center justify-content-center me-3 rounded-circle"
                        style={{ width: 44, height: 44, backgroundColor: '#008C7C' }}
                    >
                        <img
                            src={miscellaneousIcons.grossPayIcon}
                            alt=""
                            style={{ width: 22, height: 22, filter: 'brightness(0) invert(1)' }}
                        />
                    </div>
                    <div>
                        <div className="fw-bold fs-5" style={{ color: '#008C7C' }}>Net Amount Payable</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                            (Total Salary After Variable Deductions − Fixed Deductions)
                        </div>
                    </div>
                </div>
                <div
                    className={`fs-2 fw-bolder ${net < 0 ? 'text-danger' : ''} ${sensitiveCls}`}
                    style={{ color: net < 0 ? undefined : '#008C7C' }}
                >
                    {formatINR2(Math.abs(net))}
                </div>
            </div>
            {isApiDataLoaded && (
                <div
                    className={`mt-3 d-flex justify-content-center align-items-center gap-2 px-3 py-2 rounded-2 ${sensitiveCls}`}
                    style={{ backgroundColor: '#D6F4EE', fontSize: 13 }}
                >
                    <span className="fw-semibold">{formatINR2(intermediateSalary)}</span>
                    <span className="text-muted">−</span>
                    <span className="fw-semibold">{formatINR2(totalFixed)}</span>
                    <span className="text-muted">=</span>
                    <span className="fw-bolder" style={{ color: '#008C7C' }}>
                        {formatINR2(net)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default React.memo(NetAmountPayable);
