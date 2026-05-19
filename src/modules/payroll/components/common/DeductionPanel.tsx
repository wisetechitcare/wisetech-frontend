import React from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
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
    const grandTotalDeductions = totalVariable + totalFixed;

    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    const renderTooltip = (props: any) => (
        <Tooltip id="deduction-explanation" {...props} className="fs-7">
            These are cuts from your salary. Variable cuts are for things like late marks. 
            Fixed cuts (like PF/TDS) are calculated from your salary AFTER variable cuts.
        </Tooltip>
    );

    return (
        <div className="deduction-panel">
            {/* 1. Attendance Adjustments */}
            <div className="mb-8">
                <div className="d-flex align-items-center mb-4">
                    <div className="bullet bullet-vertical h-25px bg-danger me-3" style={{ width: '4px' }}></div>
                    <h6 className="fw-bolder text-gray-800 mb-0 fs-5">1. Attendance Adjustments</h6>
                </div>
                <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200">
                    <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                        <thead>
                            <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                <th className="min-w-150px">Description</th>
                                <th className="text-center min-w-100px">Details</th>
                                <th className="text-end min-w-120px">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {variableEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="text-center py-10 text-muted fs-7">No variable deductions</td>
                                </tr>
                            ) : (
                                variableEntries.map(([key, item]: [string, any]) => (
                                    <tr key={key}>
                                        <td>
                                            <span className="text-gray-800 fw-bold d-block fs-7">{item.name || key}</span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge badge-light fw-bold fs-8 ${sensitiveCls}`}>
                                                {item.value ?? '-'}
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>
                                                -{formatINR2(Number(item.earned || 0))}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                            <tr className="bg-light-danger border-0">
                                <td colSpan={2} className="py-4 ps-6">
                                    <span className="fw-bolder text-gray-700 fs-7">Total Attendance Adjustments Deductions</span>
                                </td>
                                <td className="text-end py-4 pe-6">
                                    <span className={`fw-bolder fs-6 text-danger ${sensitiveCls}`}>
                                        -{formatINR2(totalVariable)}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 2. Intermediate Salary (B) highlight */}
            <div className="mb-8 p-6 rounded-4 border border-dashed border-danger bg-white shadow-sm">
                <div className="d-flex flex-stack flex-wrap gap-4">
                    <div className="d-flex flex-column">
                        <div className="d-flex align-items-center mb-1">
                            <span className="fw-bolder text-gray-800 fs-5">Total Salary After Variable Deductions</span>
                            
                        </div>
                        <span className="text-muted fw-bold fs-7">(Gross Pay − Attendance Adjustments Deductions)</span>
                    </div>
                    <div className="d-flex align-items-center bg-light-danger rounded-3 px-4 py-2 border border-danger border-opacity-10">
                        <span className={`text-danger fw-bolder fs-2 ${sensitiveCls}`}>{formatINR2(intermediateSalary)}</span>
                    </div>
                </div>
            </div>

            {/* 3. Fixed Deductions */}
            <div className="mb-8">
                <div className="d-flex align-items-center mb-4">
                    <div className="bullet bullet-vertical h-25px bg-danger me-3" style={{ width: '4px' }}></div>
                    <h6 className="fw-bolder text-gray-800 mb-0 fs-5">2. Government & Payroll Deductions</h6>
                </div>
                <div className="table-responsive bg-white rounded-3 shadow-sm border border-gray-200">
                    <table className="table table-row-dashed table-row-gray-200 align-middle gs-6 gy-4 mb-0">
                        <thead>
                            <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0">
                                <th className="min-w-120px">Component</th>
                                <th className="min-w-100px">Type</th>
                                <th className="text-end min-w-100px">Rate</th>
                                <th className="text-end min-w-100px">Base</th>
                                <th className="text-end min-w-100px">Amount</th>
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
                                    const rate = isPct ? `${item.value}%` : formatINR2(Number(item.value || 0));
                                    const typeLabel = isPct ? 'Percentage' : 'Fixed';
                                    return (
                                        <tr key={key}>
                                            <td>
                                                <span className="text-gray-800 fw-bold d-block fs-7">{item.name || key}</span>
                                            </td>
                                            <td>
                                                <span className="badge badge-light-secondary fw-bold fs-8">{typeLabel}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>{rate}</span>
                                            </td>
                                            <td className="text-end">
                                                <span className={`text-gray-600 fw-bold fs-7 ${sensitiveCls}`}>{isPct ? formatINR2(intermediateSalary) : '—'}</span>
                                            </td>
                                            <td className="text-end">
                                                <div className="d-flex flex-column align-items-end">
                                                    <span className={`text-danger fw-bolder fs-7 ${sensitiveCls}`}>
                                                        -{formatINR2(Number(item.earned || 0))}
                                                    </span>
                                                    {Number(item.extraAmount || 0) > 0 && (
                                                        <span className="text-muted fs-9 fw-bold">
                                                            ({formatINR2(item.calculatedAmount || 0)} + {formatINR2(item.extraAmount || 0)})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                            <tr className="bg-light-danger border-0">
                                <td colSpan={4} className="py-4 ps-6">
                                    <span className="fw-bolder text-gray-700 fs-7">Total government deductions</span>
                                </td>
                                <td className="text-end py-4 pe-6">
                                    <span className={`fw-bolder fs-6 text-danger ${sensitiveCls}`}>
                                        -{formatINR2(totalFixed)}
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Final Grand Total for Deductions */}
            <div className="p-5 rounded-3 bg-light-danger border border-danger border-opacity-10 d-flex justify-content-between align-items-center shadow-sm">
                <div className="d-flex align-items-center">
                    <span className="fw-bolder text-danger fs-4 me-3">TOTAL DEDUCTIONS</span>
                    <OverlayTrigger placement="top" overlay={renderTooltip}>
                        <span className="btn btn-icon btn-circle btn-sm btn-light-danger">
                            <i className="bi bi-info-circle fs-6"></i>
                        </span>
                    </OverlayTrigger>
                </div>
                <span className={`text-danger fw-bolder fs-2 ${sensitiveCls}`}>
                    -{formatINR2(grandTotalDeductions)}
                </span>
            </div>
        </div>
    );
};

export default React.memo(DeductionPanel);
