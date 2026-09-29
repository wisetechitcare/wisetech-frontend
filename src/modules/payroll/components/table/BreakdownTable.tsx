import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { BreakdownTableProps } from '../../types/payroll.types';
import { formatMoneyDecimal, formatValue, sumBreakdownEarnings } from '../../utils/payrollFormatters';
import { formatCurrencyDecimal } from '@utils/currency';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';

const BreakdownTable: React.FC<BreakdownTableProps> = ({
    data,
    type,
    title,
    showSensitiveData,
    hourlySalary,
    dailySalary,
    resolveName,
    resolveComponent,
}) => {
    const rn = resolveName ?? ((n: string) => n);
    const rc = resolveComponent ?? ((_n: string) => null);

    // Sort breakdown entries by master sortOrder (lower = first; unknown = last)
    const sortedEntries = (entries: [string, any][]) =>
        [...entries].sort(([a], [b]) => (rc(a)?.sortOrder ?? 999) - (rc(b)?.sortOrder ?? 999));

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

    const activeOnly = ([key, item]: [string, any]) => {
        const meta = rc(item.name || key);
        return meta === null || meta.isActive !== false;
    };

    // One pass over the data feeds both layouts, so the table and the phone list can never
    // disagree about a label, a rate or an amount.
    const variableRows = hasVariableData
        ? sortedEntries(Object.entries(data.variable)).filter(activeOnly).map(([key, item]: [string, any], index: number) => {
            const meta = rc(item.name || key);
            // Use master calculationType if set; fall back to position (0,1 = hourly)
            const masterCalc = meta?.calculationType?.toUpperCase();
            const isHourly = masterCalc === 'DAILY' ? false
                : masterCalc === 'HOURLY' ? true
                : index < 2;
            const rateValue = isHourly ? hourlySalary : dailySalary;
            const rateLabel = rateValue && typeof rateValue === 'number' && rateValue > 0
                ? `${formatCurrencyDecimal(rateValue)} / ${isHourly ? 'Hour' : 'Day'}`
                : '-';
            // If master says DAILY but backend sent HH:MM:SS, convert to days display
            let displayValue = item.value;
            if (!isHourly && typeof item.value === 'string' && /^\d{2}:\d{2}:\d{2}$/.test(item.value)) {
                const [h, m] = item.value.split(':').map(Number);
                const totalHours = h + m / 60;
                const days = totalHours / 8;
                displayValue = days > 1 ? `${days.toFixed(2)} days` : `${days.toFixed(2)} day`;
            }
            const detail = displayValue !== item.value ? displayValue : formatValue(item.value, item.type);
            return { key, meta, displayLabel: rn(item.name || key), detail, rateLabel, earned: item.earned };
        })
        : [];

    const fixedRows = hasFixedData
        ? sortedEntries(Object.entries(data.fixed)).filter(activeOnly).map(([key, item]: [string, any]) => ({
            key, meta: rc(item.name || key), displayLabel: rn(item.name || key), earned: item.earned,
        }))
        : [];

    /**
     * Phones: a ledger list instead of a 4-column table (which scrolled sideways, so the amount
     * sat off-screen from its label). Each row is name + code on the left, amount on the right,
     * and — for work earnings — the calculation spelled out underneath ("3 × ₹1,333.33 / Day"),
     * which is what the Details and Rate columns meant all along.
     */
    const renderPhoneList = (
        rows: Array<{ key: string; meta: any; displayLabel: string; detail?: string; rateLabel?: string; earned: any }>,
        subtotalLabel: string,
        subtotal: number,
        subtotalClass: string,
    ) => (
        <div className="d-md-none bg-white rounded-3 shadow-sm border border-gray-200 overflow-hidden">
            {rows.map((row) => {
                const formula = row.detail !== undefined
                    ? (row.rateLabel && row.rateLabel !== '-' ? `${row.detail} × ${row.rateLabel}` : row.detail)
                    : null;
                return (
                    <div key={row.key} className="px-4 py-3" style={{ borderBottom: '1px dashed #e5e7eb' }}>
                        <div className="d-flex align-items-start justify-content-between gap-3">
                            <div className="d-flex align-items-center flex-wrap gap-2" style={{ minWidth: 0 }}>
                                <span className="text-gray-800 fw-bold fs-7">{row.displayLabel}</span>
                                {row.meta?.shortCode && (
                                    <span className="badge badge-light-primary fs-9 fw-bold px-2 py-1">{row.meta.shortCode}</span>
                                )}
                            </div>
                            <span className={`text-gray-800 fw-bolder fs-7 text-nowrap ${sensitiveCls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formatMoneyDecimal(row.earned)}
                            </span>
                        </div>
                        {formula && (
                            <div className={`text-gray-500 fw-semibold fs-8 mt-1 ${sensitiveCls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                {formula}
                            </div>
                        )}
                    </div>
                );
            })}
            <div className="d-flex align-items-center justify-content-between gap-3 px-4 py-3" style={{ backgroundColor: '#f0fdf4' }}>
                <span className="fw-bolder text-gray-700 fs-7">{subtotalLabel}</span>
                <span className={`fw-bolder fs-6 text-nowrap ${subtotalClass} ${sensitiveCls}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {subtotalPrefix}{formatMoneyDecimal(subtotal)}
                </span>
            </div>
        </div>
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
                    {renderPhoneList(variableRows, 'Subtotal Variable Earnings', variableSubtotal, subtotalColorClass)}
                    <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200 d-none d-md-block">
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
                                {variableRows.map(({ key, meta, displayLabel, detail, rateLabel, earned }) => (
                                        <tr key={key}>
                                            <td>
                                                <div className="d-flex align-items-center gap-2">
                                                    {meta?.description ? (
                                                        <OverlayTrigger placement="right" overlay={<Tooltip>{meta.description}</Tooltip>}>
                                                            <span className="text-gray-800 fw-bold fs-7" style={{ cursor: 'help', textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>{displayLabel}</span>
                                                        </OverlayTrigger>
                                                    ) : (
                                                        <span className="text-gray-800 fw-bold fs-7">{displayLabel}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>
                                                    {detail}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>
                                                    {rateLabel}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>
                                                    {formatMoneyDecimal(earned)}
                                                </span>
                                            </td>
                                        </tr>
                                ))}
                                <tr className="border-0">
                                    <td colSpan={3} className="py-4 ps-6" style={totalHighlightLeftCellStyle}>
                                        <span className="fw-bolder text-gray-700 fs-7">Subtotal Variable Earnings</span>
                                    </td>
                                    <td className="text-end py-4 pe-6" style={totalHighlightRightCellStyle}>
                                        <span className={`fw-bolder fs-6 text-nowrap ${subtotalColorClass} ${sensitiveCls}`}>
                                            {subtotalPrefix}{formatMoneyDecimal(variableSubtotal)}
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
                    {renderPhoneList(fixedRows, 'Subtotal Fixed Earnings', fixedSubtotal, 'text-success')}
                    <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200 d-none d-md-block">
                        <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                            <thead>
                                <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                    <th>Description</th>
                                    <th className="text-end">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fixedRows.map(({ key, meta, displayLabel, earned }) => (
                                    <tr key={key}>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {meta?.description ? (
                                                    <OverlayTrigger placement="right" overlay={<Tooltip>{meta.description}</Tooltip>}>
                                                        <span className="text-gray-800 fw-bold fs-7" style={{ cursor: 'help', textDecorationLine: 'underline', textDecorationStyle: 'dotted' }}>{displayLabel}</span>
                                                    </OverlayTrigger>
                                                ) : (
                                                    <span className="text-gray-800 fw-bold fs-7">{displayLabel}</span>
                                                )}
                                                {meta?.shortCode && (
                                                    <span className="badge badge-light-primary fs-9 fw-bold px-2 py-1">{meta.shortCode}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-end">
                                            <span className={`text-gray-800 fw-bolder fs-7 ${sensitiveCls}`}>
                                                {formatMoneyDecimal(earned)}
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
                                            {subtotalPrefix}{formatMoneyDecimal(fixedSubtotal)}
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
                                    <AppIcon name="bi-info-circle" className="text-gray-600 fs-6" />
                                </span>
                            </OverlayTrigger>
                        </div>
                    </div>
                    {/* Desktop amount */}
                    <div className="d-none d-md-flex justify-content-end">
                        <span className={`fw-bolder fs-2 ${sensitiveCls}`} style={{ color: '#2563eb' }}>
                            {formatMoneyDecimal(grandTotal)}
                        </span>
                    </div>
                    {/* Mobile amount container */}
                    <div className="d-flex d-md-none justify-content-center align-items-center rounded-3 px-4 py-2 w-100" style={{ backgroundColor: '#dbeafe', border: '1px solid #bfdbfe' }}>
                        <span className={`fw-bolder fs-2 ${sensitiveCls}`} style={{ color: '#2563eb' }}>
                            {formatMoneyDecimal(grandTotal)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(BreakdownTable);
