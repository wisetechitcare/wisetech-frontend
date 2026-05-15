import React from 'react';
import { Button } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import dayjs from 'dayjs';
import { PayrollTableRow } from '../../types/payroll.types';
import { formatINR2 } from '../../utils/payrollFormatters';
import StatusBadge from '../common/StatusBadge';

interface PaymentDetailsTableProps {
    tableRows: PayrollTableRow[];
    showSensitiveData: boolean;
    fromAdmin: boolean;
    onAddPayment: () => void;
    onEditPayment: (item: any) => void;
    onDeletePayment: (item: any) => void;
}

const PaymentDetailsTable: React.FC<PaymentDetailsTableProps> = ({
    tableRows,
    showSensitiveData,
    fromAdmin,
    onAddPayment,
    onEditPayment,
    onDeletePayment
}) => {
    const sensitiveCls = showSensitiveData ? 'sensitive-data-visible' : 'sensitive-data-hidden';

    return (
        <div className="payroll-table-container">
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom">
                <h4 className="fw-bold mb-0">Payment Details</h4>
                {fromAdmin && (
                    <Button
                        className="btn btn-sm wt-btn-primary d-inline-flex align-items-center"
                        onClick={onAddPayment}
                        
                    >
                        <KTIcon iconName="plus" className="fs-3 me-1" />
                        Add Payment
                    </Button>
                )}
            </div>
            <div className="table-responsive">
                <table className="payroll-table">
                    <thead>
                        <tr>
                            <th>Payment Date</th>
                            <th className="text-end">Gross Pay</th>
                            <th className="text-end">Variable Deduction</th>
                            <th className="text-end">Fixed Deduction</th>
                            <th className="text-end">Total Deduction</th>
                            <th className="text-end">Net Salary</th>
                            <th className="text-center">Status</th>
                            <th className="text-end">Paid Amount</th>
                            <th className="text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="text-center py-5 text-muted">
                                    <div className="d-flex flex-column align-items-center">
                                        <KTIcon iconName="information-5" className="fs-1 mb-2" />
                                        <span>No payroll records available for the selected period.</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            tableRows.map((row, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="fw-semibold">
                                            {row.monthEndDate ? dayjs(row.monthEndDate).format('DD-MM-YYYY') : '--'}
                                        </div>
                                        <div className="text-muted fs-7">{row.month}</div>
                                    </td>
                                    <td className="text-end">
                                        <span className={`currency-text ${sensitiveCls}`}>
                                            {formatINR2(row.calculatedGrossPay)}
                                        </span>
                                    </td>
                                    <td className="text-end text-danger">
                                        <span className={sensitiveCls}>
                                            -{formatINR2(row.calculatedVariableDeduction)}
                                        </span>
                                    </td>
                                    <td className="text-end text-danger">
                                        <span className={sensitiveCls}>
                                            -{formatINR2(row.calculatedFixedDeduction)}
                                        </span>
                                    </td>
                                    <td className="text-end fw-bold">
                                        <span className={sensitiveCls}>
                                            {formatINR2(row.calculatedTotalDeduction)}
                                        </span>
                                    </td>
                                    <td className="text-end fw-bolder text-primary">
                                        <span className={`currency-text ${sensitiveCls}`}>
                                            {formatINR2(row.calculatedNetSalary)}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <StatusBadge status={row.calculatedStatus} />
                                    </td>
                                    <td className="text-end fw-bold text-success">
                                        <span className={sensitiveCls}>
                                            {formatINR2(row.calculatedPaidAmount)}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <div className="d-flex justify-content-center gap-2">
                                            {fromAdmin && (
                                                <>
                                                    <button 
                                                        className="payroll-action-btn"
                                                        onClick={() => onEditPayment(row.item)}
                                                        title="Edit Payment"
                                                    >
                                                        <KTIcon iconName="pencil" className="fs-5" />
                                                    </button>
                                                    <button 
                                                        className="payroll-action-btn payroll-action-btn-danger"
                                                        onClick={() => onDeletePayment(row.item)}
                                                        title="Delete Payment"
                                                    >
                                                        <KTIcon iconName="trash" className="fs-5" />
                                                    </button>
                                                </>
                                            )}
                                            {!fromAdmin && <span className="text-muted">--</span>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(PaymentDetailsTable);
