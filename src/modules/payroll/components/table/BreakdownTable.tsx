import React from 'react';
import { BreakdownTableProps } from '../../types/payroll.types';
import { formatINR2, formatValue, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const BreakdownTable: React.FC<BreakdownTableProps> = ({
    data,
    type,
    title,
    showSensitiveData
}) => {
    const formatCurrency = formatINR2;
    const hasFixedData = Object.keys(data.fixed || {}).length > 0;
    const hasVariableData = Object.keys(data.variable || {}).length > 0;

    if (!hasFixedData && !hasVariableData) {
        return <div className="text-muted">No {type} data available</div>;
    }

    const fixedSubtotal = hasFixedData ? sumBreakdownEarnings(data.fixed) : 0;
    const variableSubtotal = hasVariableData ? sumBreakdownEarnings(data.variable) : 0;

    const isDeduction = type === 'deduction';
    const subtotalColor = isDeduction ? '#AA393D' : '#008C7C';
    const subtotalPrefix = isDeduction ? '-' : '+';
    const fixedSubtotalLabel = isDeduction ? 'Total Fixed Deductions' : `Total Fixed ${title}`;
    const variableSubtotalLabel = isDeduction ? 'Total Variable Deductions' : `Total Variable ${title}`;

    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    return (
        <div className="breakdown-tables">
            {hasVariableData && (
                <div className="mb-3">
                    <h6 className="fw-bold mb-2">Variable {title}</h6>
                    <div className="table-responsive">
                        <table className="table table-sm table-borderless mb-0">
                            <thead>
                                <tr>
                                    <th style={{ fontWeight: '600', fontSize: '12px' }}>Name</th>
                                    <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'center' }}>Value</th>
                                    <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'right' }}>Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.variable).map(([key, item]: [string, any]) => (
                                    <tr key={key} style={{ fontSize: '11px' }}>
                                        <td>{item.name || key}</td>
                                        <td style={{ textAlign: 'center' }} className={sensitiveCls}>
                                            {formatValue(item.value, item.type)}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {formatCurrency(item.earned)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ fontSize: '11px', borderTop: '1px solid #E5E8ED' }}>
                                    <td colSpan={2} className="fw-bold pt-2">{variableSubtotalLabel}</td>
                                    <td
                                        style={{ textAlign: 'right', color: subtotalColor }}
                                        className={`fw-bold pt-2 ${sensitiveCls}`}
                                    >
                                        {subtotalPrefix}{formatCurrency(variableSubtotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {hasFixedData && (
                <div className="mb-2">
                    <h6 className="fw-bold mb-2">Fixed {title}</h6>
                    <div className="table-responsive">
                        <table className="table table-sm table-borderless mb-0">
                            <thead>
                                <tr>
                                    <th style={{ fontWeight: '600', fontSize: '12px' }}>Name</th>
                                    <th style={{ fontWeight: '600', fontSize: '12px', textAlign: 'right' }}>Earned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(data.fixed).map(([key, item]: [string, any]) => (
                                    <tr key={key} style={{ fontSize: '11px' }}>
                                        <td>{item.name || key}</td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {formatCurrency(item.earned)}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{ fontSize: '11px', borderTop: '1px solid #E5E8ED' }}>
                                    <td className="fw-bold pt-2">{fixedSubtotalLabel}</td>
                                    <td
                                        style={{ textAlign: 'right', color: subtotalColor }}
                                        className={`fw-bold pt-2 ${sensitiveCls}`}
                                    >
                                        {subtotalPrefix}{formatCurrency(fixedSubtotal)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(BreakdownTable);
