import React from 'react';
import { DeductionBreakdownProps } from '../../types/payroll.types';
import { formatINR2, sumBreakdownEarnings } from '../../utils/payrollFormatters';

const DeductionPanel: React.FC<DeductionBreakdownProps> = ({
    deductionBreakdown,
    grossPay,
    showSensitiveData,
}) => {
    const variableEntries = Object.entries(deductionBreakdown?.variable || {});
    const fixedEntries = Object.entries(deductionBreakdown?.fixed || {});

    const totalVariable = sumBreakdownEarnings(deductionBreakdown?.variable);
    const totalFixed = sumBreakdownEarnings(deductionBreakdown?.fixed);
    const intermediateSalary = Math.max(0, grossPay - totalVariable);

    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    return (
        <div className="deduction-panel">
            {/* 1. Variable Deductions */}
            <div className="mb-3">
                <h6 className="fw-bold mb-2">1. Variable Deductions</h6>
                <div className="table-responsive">
                    <table className="table table-sm table-borderless mb-0">
                        <thead>
                            <tr>
                                <th style={{ fontWeight: 600, fontSize: 12 }}>Name</th>
                                <th style={{ fontWeight: 600, fontSize: 12, textAlign: 'center' }}>Value</th>
                                <th style={{ fontWeight: 600, fontSize: 12, textAlign: 'right' }}>Deduction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variableEntries.length === 0 && (
                                <tr style={{ fontSize: 11 }}>
                                    <td colSpan={3} className="text-muted">No variable deductions</td>
                                </tr>
                            )}
                            {variableEntries.map(([key, item]: [string, any]) => (
                                <tr key={key} style={{ fontSize: 11 }}>
                                    <td>{item.name || key}</td>
                                    <td style={{ textAlign: 'center' }} className={sensitiveCls}>
                                        {item.value ?? '-'}
                                    </td>
                                    <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                        {formatINR2(Number(item.earned || 0))}
                                    </td>
                                </tr>
                            ))}
                            <tr
                                style={{
                                    fontSize: 12,
                                    backgroundColor: '#FBF0F1',
                                    borderTop: '1px solid #E5C8CA',
                                }}
                            >
                                <td colSpan={2} className="fw-bold py-2" style={{ color: '#AA393D' }}>
                                    Total Variable Deductions
                                </td>
                                <td
                                    className={`fw-bold py-2 ${sensitiveCls}`}
                                    style={{ textAlign: 'right', color: '#AA393D' }}
                                >
                                    -{formatINR2(totalVariable)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Intermediate Salary (B) box */}
            <div
                className="mb-4 p-3 rounded-3"
                style={{ backgroundColor: '#FBF0F1', border: '1px solid #E5C8CA' }}
            >
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <div className="fw-bold" style={{ color: '#AA393D' }}>
                            Total Salary After Variable Deductions (B)
                        </div>
                        <div className="text-muted" style={{ fontSize: 11 }}>
                            (A − Variable Deductions)
                        </div>
                    </div>
                    <div
                        className={`fw-bolder fs-5 px-3 py-1 rounded-2 ${sensitiveCls}`}
                        style={{
                            color: '#AA393D',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E5C8CA',
                        }}
                    >
                        {formatINR2(intermediateSalary)}
                    </div>
                </div>
            </div>

            {/* 3. Fixed Deductions */}
            <div className="mb-3">
                <h6 className="fw-bold mb-2">2. Fixed Deductions (Calculated on B)</h6>
                <div className="table-responsive">
                    <table className="table table-sm table-borderless mb-0">
                        <thead>
                            <tr style={{ fontWeight: 600, fontSize: 12 }}>
                                <th>Name</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Rate / Amount</th>
                                <th style={{ textAlign: 'right' }}>Base (B)</th>
                                <th style={{ textAlign: 'right' }}>Deduction</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fixedEntries.length === 0 && (
                                <tr style={{ fontSize: 11 }}>
                                    <td colSpan={5} className="text-muted">No fixed deductions</td>
                                </tr>
                            )}
                            {fixedEntries.map(([key, item]: [string, any]) => {
                                const isPct = String(item.type).toLowerCase() === 'percentage';
                                const rate = isPct ? `${item.value}%` : formatINR2(Number(item.value || 0));
                                const typeLabel = isPct ? 'Percentage' : 'Fixed';
                                return (
                                    <tr key={key} style={{ fontSize: 11 }}>
                                        <td>{item.name || key}</td>
                                        <td>{typeLabel}</td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {rate}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {isPct ? formatINR2(intermediateSalary) : '—'}
                                        </td>
                                        <td style={{ textAlign: 'right' }} className={sensitiveCls}>
                                            {formatINR2(Number(item.earned || 0))}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr
                                style={{
                                    fontSize: 12,
                                    backgroundColor: '#FBF0F1',
                                    borderTop: '1px solid #E5C8CA',
                                }}
                            >
                                <td colSpan={4} className="fw-bold py-2" style={{ color: '#AA393D' }}>
                                    Total Fixed Deductions
                                </td>
                                <td
                                    className={`fw-bold py-2 ${sensitiveCls}`}
                                    style={{ textAlign: 'right', color: '#AA393D' }}
                                >
                                    -{formatINR2(totalFixed)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default React.memo(DeductionPanel);
