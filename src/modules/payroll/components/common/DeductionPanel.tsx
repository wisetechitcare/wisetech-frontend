import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { DeductionBreakdownProps } from '../../types/payroll.types';
import { formatINRDecimal, formatINRDecimalTruncated, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const DeductionPanel: React.FC<DeductionBreakdownProps> = ({
    deductionBreakdown,
    grossPay,
    showSensitiveData,
    dailySalary,
}) => {
    // IMPORTANT: many deductions keep entries even when `isActive=false`.
    // If we include them in sums/rendering, enable/disable logic appears broken.
    const variableEntriesAll = Object.entries(deductionBreakdown?.variable || {});
    const fixedEntriesAll = Object.entries(deductionBreakdown?.fixed || {});

    const variableEntries = variableEntriesAll.filter(([, item]: [string, any]) => item?.isActive !== false);
    const fixedEntries = fixedEntriesAll.filter(([, item]: [string, any]) => item?.isActive !== false);

    const totalVariable = variableEntries.reduce((acc, [, item]: [string, any]) => acc + Number(item?.earned || 0), 0);
    const totalFixed = fixedEntries.reduce((acc, [, item]: [string, any]) => acc + Number(item?.earned || 0), 0);
    const intermediateSalary = Math.max(0, grossPay - totalVariable);
    const grandTotalDeductions = totalVariable + totalFixed;

    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';
    const getVariableRateLabel = (key: string, item: any) => {
        const isLateCheckin = /late\s*check/i.test(key) || /late\s*attendance/i.test(key);
        
        if (isLateCheckin && dailySalary) {
            const percent = Number(item?.ratePercent ?? item?.deductionPercent ?? 50); // Default to 50% if not provided
            if (percent > 0) {
                return `${formatINRDecimalTruncated(dailySalary * (percent / 100))} / Day`;
            }
        }

        const explicitRate = item?.rateDisplay || item?.rateLabel;
        if (explicitRate) return explicitRate;

        return dailySalary ? `${formatINRDecimalTruncated(dailySalary)} / Day` : '-';
    };
    const formatAdjustmentFormula = (calculatedAmount: number, extraAmount: number) => {
        const sign = extraAmount < 0 ? '-' : '+';
        return `(${formatINRDecimal(calculatedAmount)} ${sign} ${formatINRDecimal(Math.abs(extraAmount))})`;
    };
    const totalHighlightCellStyle = {
        backgroundColor: '#fffbeb',
        border: 'none',
    } as const;
    const totalHighlightLeftCellStyle = {
        ...totalHighlightCellStyle,
        borderTopLeftRadius: '12px',
        borderBottomLeftRadius: '12px',
    } as const;
    const totalHighlightRightCellStyle = {
        ...totalHighlightCellStyle,
        borderTopRightRadius: '12px',
        borderBottomRightRadius: '12px',
    } as const;

    const renderTooltip = (props: any) => (
        <Tooltip id="deduction-explanation" {...props} className="fs-7">
            These are cuts from your salary. Variable cuts are for things like late marks. 
            Fixed cuts (like PF/TDS) are calculated from your salary AFTER variable cuts.
        </Tooltip>
    );
    const formatAmountOrDash = (amount: number) => (amount === 0 ? '—' : formatINRDecimal(amount));

    return (
        <div className="deduction-panel d-flex flex-column flex-grow-1">
            <div className="flex-grow-1">
            {/* 1. Attendance Adjustments */}
            <div className="mb-6">
                <div className="d-flex align-items-center mb-4">
                    <div className="bullet bullet-vertical h-25px bg-danger me-3" style={{ width: '4px' }}></div>
                    <h6 className="fw-bolder text-gray-800 mb-0 fs-5">1. Attendance Adjustments</h6>
                </div>
                <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200">
                    <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                        <thead>
                            <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                <th>Description</th>
                                <th className="text-center">Details</th>
                                <th className="text-center">Rate</th>
                                <th className="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variableEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-muted fs-7">No variable deductions</td>
                                </tr>
                            ) : (
                                variableEntries.map(([key, item]: [string, any]) => {
                                    const itemName = item.name || key;
                                    const isLateCheckin = /late\s*check/i.test(itemName) || /late\s*attendance/i.test(itemName);
                                    
                                    return (
                                    <tr key={key}>
                                        <td>
                                            {isLateCheckin && item.ruleDisplay ? (
                                                <OverlayTrigger 
                                                    placement="right" 
                                                    overlay={
                                                        <Tooltip id={`tooltip-${key}`} className="fs-8">
                                                            <strong>Custom Rule:</strong> {item.ruleDisplay}
                                                        </Tooltip>
                                                    }
                                                >
                                                    <span className="text-gray-800 fw-bold d-block fs-7" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>{itemName}</span>
                                                </OverlayTrigger>
                                            ) : (
                                                <span className="text-gray-800 fw-bold d-block fs-7">{itemName}</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>
                                                {item.value ?? '-'}
                                            </span>
                                        </td>
                                            <td className="text-center">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>
                                                    {getVariableRateLabel(key, item)}
                                                </span>
                                            </td>
                                        <td className="text-end">
                                            <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>
                                                -{formatINRDecimal(Number(item.earned || 0))}
                                            </span>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                             {/* Added attendance status rows */}
                             <tr>
                                 <td className="text-gray-800 fw-bold d-block fs-7">Early Checkout</td>
                                 <td className="text-center"><span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-center"><span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-end"><span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-₹0</span></td>
                             </tr>
                             <tr>
                                 <td className="text-gray-800 fw-bold d-block fs-7">Unpaid Leave</td>
                                 <td className="text-center"><span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-center"><span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-end"><span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-₹0</span></td>
                             </tr>
                             <tr>
                                 <td className="text-gray-800 fw-bold d-block fs-7">Half Day</td>
                                 <td className="text-center"><span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-center"><span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-end"><span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-₹0</span></td>
                             </tr>
                             <tr>
                                 <td className="text-gray-800 fw-bold d-block fs-7">Missed Punch</td>
                                 <td className="text-center"><span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-center"><span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>-</span></td>
                                 <td className="text-end"><span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>-₹0</span></td>
                             </tr>
                            <tr className="border-0">
                                <td
                                    colSpan={3}
                                    className="py-4 ps-6"
                                    style={totalHighlightLeftCellStyle}
                                >
                                    <span className="fw-bolder text-gray-700 fs-7">Total Attendance Adjustments Deductions</span>
                                </td>
                                <td
                                    className="text-end py-4 pe-6"
                                    style={totalHighlightRightCellStyle}
                                >
                                    <span className={`fw-bolder fs-6 text-danger ${sensitiveCls}`}>
                                        -{formatINRDecimal(totalVariable)}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Intermediate Salary (B) highlight */}
            <div
                className="mb-6 p-6 rounded-4 border shadow-sm"
                style={{
                    backgroundColor: '#FDF2F2', // soft filled background like deduction card
                    borderColor: '#F5D6D6',
                }}
            >
                <div className="d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center text-center text-md-start gap-4">
                    <div className="d-flex flex-column align-items-center align-items-md-start">
                        <div className="d-flex align-items-center mb-1">
                            <span className="fw-bolder fs-5">
                                Total Salary After Attendance Adjustments
                            </span>
                        </div>

                        <span
                            className="fw-bold fs-7"
                            style={{ color: '#6B7280' }}
                        >
                            (Gross Pay − Attendance Deductions)
                        </span>
                    </div>

                    <div
                        className="d-flex align-items-center justify-content-center rounded-3 px-4 py-2 w-100 w-md-auto"
                        style={{
                            backgroundColor: '#DBEAFE', // filled light blue
                            border: '1px solid #BFDBFE',
                        }}
                    >
                        <span
                            className={`fw-bolder fs-2 ${sensitiveCls}`}
                            style={{ color: '#2563EB' }}
                        >
                            {formatINRDecimal(intermediateSalary)}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Fixed Deductions */}
            <div className="mb-6">
                <div className="d-flex align-items-center mb-4">
                    <div className="bullet bullet-vertical h-25px bg-danger me-3" style={{ width: '4px' }}></div>
                    <h6 className="fw-bolder text-gray-800 mb-0 fs-5">2. Government & Payroll Deductions</h6>
                </div>
                <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200">
                    <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                        <thead>
                            <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                <th>Component</th>
                                <th>Type</th>
                                <th className="text-end">Rate</th>
                                <th className="text-end">Base</th>
                                <th className="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fixedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-10 text-muted fs-7">No fixed deductions</td>
                                </tr>
                            ) : (
                                fixedEntries.map(([key, item]: [string, any]) => {
                                    const isPct = String(item.type).toLowerCase() === 'percentage';
                                    const rate = isPct ? `${item.value}%` : formatINRDecimal(Number(item.value || 0));
                                    const typeLabel = isPct ? 'Percentage' : 'Fixed';
                                    const extraAmount = Number(item.extraAmount || 0);
                                    const calculatedAmount = Number(item.calculatedAmount || 0);
                                    const earnedAmount = Math.max(0, Number(item.earned || 0));
                                    const displayName = (item.name || key) === 'Professional Fees'
                                        ? 'Tax Deducted at Source (TDS)'
                                        : (item.name || key);
                                    const isTdsRow = displayName === 'Tax Deducted at Source (TDS)';
                                    const isPTaxRow = displayName.toLowerCase().includes('professional tax');
                                    return (
                                        <tr key={key}>
                                            <td>
                                                <span className="text-gray-800 fw-bold d-block fs-7">{displayName}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-light-secondary fw-bold fs-8">{typeLabel}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>{rate}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>
                                                    {isPct || isTdsRow ? formatAmountOrDash(intermediateSalary) : '—'}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex flex-column align-items-end">
                                                    <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>
                                                        -{formatINRDecimal(earnedAmount)}
                                                    </span>
                                                    {extraAmount !== 0 && calculatedAmount !== 0 && (
                                                        <span className="text-muted fs-9 fw-bold">
                                                            {formatAdjustmentFormula(calculatedAmount, extraAmount)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            <tr className="border-0">
                                <td
                                    colSpan={4}
                                    className="py-4 ps-6"
                                    style={totalHighlightLeftCellStyle}
                                >
                                    <span className="fw-bolder text-gray-700 fs-7">Total Government & Payroll deductions</span>
                                </td>
                                <td
                                    className="text-end py-4 pe-6"
                                    style={totalHighlightRightCellStyle}
                                >
                                    <span className={`fw-bolder fs-6 text-danger ${sensitiveCls}`}>
                                        -{formatINRDecimal(totalFixed)}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            </div>

            {/* Final Grand Total for Deductions */}
            <div
                className="p-5 rounded-3 d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center text-center gap-3 mt-auto"
                style={{ backgroundColor: '#fef2f2', border: 'none', boxShadow: 'none' }}
            >
                <div className="d-flex align-items-center justify-content-center">
                    <span className="fw-bolder text-danger fs-4 me-0 me-md-3">TOTAL DEDUCTIONS</span>
                    <div className="d-none d-md-block">
                        <OverlayTrigger placement="top" overlay={renderTooltip}>
                            <span className="btn btn-icon btn-circle btn-sm bg-light">
                                <i className="bi bi-info-circle text-gray-600 fs-6"></i>
                            </span>
                        </OverlayTrigger>
                    </div>
                </div>
                {/* Desktop amount */}
                <div className="d-none d-md-flex justify-content-end">
                    <span className={`text-danger fw-bolder fs-2 ${sensitiveCls}`}>
                        -{formatINRDecimal(grandTotalDeductions)}
                    </span>
                </div>
                {/* Mobile amount container */}
                <div className="d-flex d-md-none justify-content-center align-items-center rounded-3 px-4 py-2 w-100" style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA' }}>
                    <span className={`text-danger fw-bolder fs-2 ${sensitiveCls}`}>
                        -{formatINRDecimal(grandTotalDeductions)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DeductionPanel);
