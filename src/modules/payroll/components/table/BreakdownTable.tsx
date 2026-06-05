import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BreakdownTableProps } from '../../types/payroll.types';
import { formatINRDecimal, formatValue, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const BreakdownTable: React.FC<BreakdownTableProps> = ({
    data,
    type,
    title,
    showSensitiveData,
    hourlySalary,
    dailySalary
}) => {
    const hasFixedData = Object.keys(data.fixed || {}).length > 0;
    const hasVariableData = Object.keys(data.variable || {}).length > 0;

    if (!hasFixedData && !hasVariableData) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center py-10 bg-light rounded-3">
                <span className="text-muted fs-7">No {type} components configured</span>
            </div>
        );
    }

    const fixedSubtotal = hasFixedData ? sumBreakdownEarnings(data.fixed) : 0;
    const variableSubtotal = hasVariableData ? sumBreakdownEarnings(data.variable) : 0;
    const grandTotal = fixedSubtotal + variableSubtotal;

    const isDeduction = type === 'deduction';
    const subtotalColorClass = isDeduction ? 'text-gray-800' : 'text-success';
    const subtotalBgClass = 'bg-light';
    const subtotalPrefix = isDeduction ? '−' : '+';
    
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const renderTooltip = (props: any) => (
        <Tooltip id="gross-explanation" {...props} className="fs-7">
            This is your total earned amount before any taxes or cuts. 
            It includes your working time, holidays, and all fixed monthly allowances.
        </Tooltip>
    );

    const totalHighlightCellStyle = {
        backgroundColor: '#f0fdf4',
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

    return (
        <div className="breakdown-tables d-flex flex-column flex-grow-1">
            <div className="flex-grow-1">
            {hasVariableData && (
                <div className="mb-6">
                    <div className="d-flex align-items-center mb-4">
                        <div className="bullet bullet-vertical h-25px bg-success me-3" style={{ width: '4px' }}></div>
                        <h6 className="fw-bolder text-gray-800 mb-0 fs-5">Work Earnings</h6>
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
                                {Object.entries(data.variable).map(([key, item]: [string, any], index: number) => {
                                    // 1st two are Hourly, rest are Daily
                                    const isHourly = index < 2;
                                    const rateValue = isHourly ? hourlySalary : dailySalary;
                                    const rateLabel = rateValue && typeof rateValue === 'number' && rateValue > 0 
                                        ? `${formatINRDecimal(rateValue)} / ${isHourly ? 'Hour' : 'Day'}`
                                        : '-';

                                    return (
                                        <tr key={key}>
                                            <td>
                                                <span className="text-gray-800 fw-bold d-block fs-7">{item.name || key}</span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>
                                                    {formatValue(item.value, item.type)}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>
                                                    {rateLabel}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>
                                                    {formatINRDecimal(item.earned)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="border-0">
                                    <td colSpan={3} className="py-4 ps-6" style={totalHighlightLeftCellStyle}>
                                        <span className="fw-bolder text-gray-700 fs-7">Subtotal Variable Earnings</span>
                                    </td>
                                    <td className="text-end py-4 pe-6" style={totalHighlightRightCellStyle}>
                                        <span className={`fw-bolder fs-6 text-nowrap ${subtotalColorClass} ${sensitiveCls}`}>
                                            {subtotalPrefix}{formatINRDecimal(variableSubtotal)}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasFixedData && (
                <div className="mb-6">
                    <div className="d-flex align-items-center mb-4">
                        <div className="bullet bullet-vertical h-25px bg-success me-3" style={{ width: '4px' }}></div>
                        <h6 className="fw-bolder text-gray-800 mb-0 fs-5">Allowances & Benefits</h6>
                    </div>
                    <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200">
                        <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                            <thead>
                                <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                    <th>Description</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.fixed).map(([key, item]: [string, any]) => (
                                    <tr key={key}>
                                        <td>
                                            <span className="text-gray-800 fw-bold d-block fs-7">{item.name || key}</span>
                                        </td>
                                        <td className="text-end">
                                            <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>
                                                {formatINRDecimal(item.earned)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="border-0">
                                    <td className="py-4 ps-6" style={totalHighlightLeftCellStyle}>
                                        <span className="fw-bolder text-success fs-7">Subtotal Fixed Earnings</span>
                                    </td>
                                    <td className="text-end py-4 pe-6" style={totalHighlightRightCellStyle}>
                                        <span className={`fw-bolder fs-6 text-success text-nowrap ${sensitiveCls}`}>
                                            {subtotalPrefix}{formatINRDecimal(fixedSubtotal)}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </div>

            {/* Final Grand Total for Gross */}
            {!isDeduction && (
                <div 
                    className="p-5 rounded-3 d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center text-center gap-3 mt-auto"
                    style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}
                >
                    <div className="d-flex align-items-center justify-content-center">
                        <span className="fw-bolder fs-4 me-0 me-md-3" style={{ color: '#2563eb' }}>TOTAL GROSS PAY</span>
                        <div className="d-none d-md-block">
                            <OverlayTrigger placement="top" overlay={renderTooltip}>
                                <span className="btn btn-icon btn-circle btn-sm" style={{ backgroundColor: '#dbeafe' }}>
                                    <i className="bi bi-info-circle text-gray-600 fs-6"></i>
                                </span>
                            </OverlayTrigger>
                        </div>
                    </div>
                    {/* Desktop amount */}
                    <div className="d-none d-md-flex justify-content-end">
                        <span className={`fw-bolder fs-2 ${sensitiveCls}`} style={{ color: '#2563eb' }}>
                            {formatINRDecimal(grandTotal)}
                        </span>
                    </div>
                    {/* Mobile amount container */}
                    <div className="d-flex d-md-none justify-content-center align-items-center rounded-3 px-4 py-2 w-100" style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe' }}>
                        <span className={`fw-bolder fs-2 ${sensitiveCls}`} style={{ color: '#2563eb' }}>
                            {formatINRDecimal(grandTotal)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(BreakdownTable);
