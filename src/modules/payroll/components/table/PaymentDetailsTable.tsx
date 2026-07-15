import React from 'react';
import { Button, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import dayjs from 'dayjs';
import { PayrollTableRow } from '../../types/payroll.types';
import { formatINRRounded } from '../../utils/payrollFormatters';

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

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase().trim();

        if (s === 'paid extra') {
            return <Badge bg="light-info" className="text-info fw-bold px-4 py-2">Paid Extra</Badge>;
        }
        if (s === 'full paid' || s === 'paid') {
            return <Badge bg="light-success" className="text-success fw-bold px-4 py-2">Full Paid</Badge>;
        }
        if (s === 'partially paid' || s === 'partial') {
            return <Badge bg="light-warning" className="text-warning fw-bold px-4 py-2">Partially Paid</Badge>;
        }
        if (s === 'overdue' || s === 'due' || s === 'pending') {
            return <Badge bg="light-danger" className="text-danger fw-bold px-4 py-2">Pending</Badge>;
        }
        if (s === 'upcoming') {
            return <Badge bg="light-info" className="text-info fw-bold px-4 py-2">Upcoming</Badge>;
        }
        if (s === 'unpaid') {
            return <Badge bg="light-danger" className="text-danger fw-bold px-4 py-2">Unpaid</Badge>;
        }
        return <Badge bg="light-secondary" className="text-gray-600 fw-bold px-4 py-2">No Payment</Badge>;
    };

    return (
        <div className="card shadow-sm mb-8 overflow-hidden border-0">
            <div className="card-header border-0 pt-5 pb-2 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 bg-white">
                <div className="card-title align-items-start flex-column">
                    <h3 className="card-label fw-bold text-gray-800 fs-3 mb-1">Monthly Payment History</h3>
                    <span className="text-muted fw-semibold fs-7">Detailed log of salary payouts and deductions</span>
                </div>
                {fromAdmin && (
                    <div className="card-toolbar">
                        <Button
                            className="btn btn-sm btn-primary d-inline-flex align-items-center px-4 py-2 rounded-2 shadow-sm"
                            onClick={onAddPayment}
                            style={{ backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' }}
                        >
                            <KTIcon iconName="plus" className="fs-3 me-2" />
                            Record Payout
                        </Button>
                    </div>
                )}
            </div>
            <div className="card-body py-3">
                <div className="table-responsive">
                    <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">
                        <thead>
                            <tr className="fw-bold text-muted bg-light">
                                <th className="ps-4 rounded-start">Payout Date</th>
                                <th className="text-center">Method</th>
                                <th className="text-end">Net Payable</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Remaining</th>
                                <th className="text-center">Status</th>
                                <th className="text-center">Ref / Notes</th>
                                <th className="text-center rounded-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableRows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-10">
                                        <div className="d-flex flex-column align-items-center">
                                            <KTIcon iconName="cloud-change" className="fs-3x text-muted mb-3" />
                                            <span className="text-gray-400 fw-bold fs-6">No payout records found for this period</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tableRows.map((row, index) => (
                                    <tr key={index}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center">
                                                <div className="symbol symbol-35px me-3">
                                                    <div className="symbol-label bg-light-primary text-primary">
                                                        <KTIcon iconName="calendar-8" className="fs-2 text-primary" />
                                                    </div>
                                                </div>
                                                <div className="d-flex flex-column">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <span className="text-dark fw-bold text-hover-primary fs-6 me-2">
                                                            {row.displayDate 
                                                                ? dayjs(row.displayDate).format('DD MMM YYYY') 
                                                                : '--'}
                                                        </span>
                                                        {row.paymentType !== 'GOVERNMENT' && (
                                                            <Badge bg="light-info" className="text-info fs-9 py-1 px-2">
                                                                {row.paymentType}
                                                            </Badge>
                                                        )}
                                                        {row.paymentType === 'GOVERNMENT' && (row as any).deductionType && (
                                                            <Badge bg="light-warning" className="text-warning fs-9 py-1 px-2">
                                                                {(['tds', 'professional fees', 'professional fee'].some((k: string) => String((row as any).deductionType).toLowerCase().includes(k))) ? 'TDS'
                                                                : (['professional tax', 'ptax', 'prof. tax'].some((k: string) => String((row as any).deductionType).toLowerCase().includes(k))) ? 'PTAX'
                                                                : (row as any).deductionType}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-muted fw-semibold fs-7">
                                                        {row.month ? dayjs(`${row.year}-${String(row.month).padStart(2, '0')}-01`).format('MMM YYYY') : '--'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg="light-primary" className="text-primary fw-bold">
                                                {row.paymentMethod ? row.paymentMethod.replace('_', ' ') : 'BANK TRANSFER'}
                                            </Badge>
                                        </td>
                                        <td className="text-end">
                                            <span className={`fw-bolder fs-6 ${sensitiveCls} ${row.calculatedNetSalary < 0 ? 'text-info' : 'text-primary'}`}>
                                                {formatINRRounded(row.calculatedNetSalary)}
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            <span className={`text-success fw-bold fs-6 ${sensitiveCls}`}>
                                                {formatINRRounded(row.calculatedPaidAmount)}
                                            </span>
                                        </td>
                                        <td className="text-end">
                                            {(row.calculatedRemainingAmount || 0) < 0 ? (
                                                <span className={`fw-bold fs-6 ${sensitiveCls} text-info`}>
                                                    {formatINRRounded(Math.abs(row.calculatedRemainingAmount || 0))} <span className="fs-8 fw-semibold">extra</span>
                                                </span>
                                            ) : (
                                                <span className={`fw-bold fs-6 ${sensitiveCls} ${(row.calculatedRemainingAmount || 0) === 0 ? 'text-success' : 'text-danger'}`}>
                                                    {formatINRRounded(row.calculatedRemainingAmount)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {getStatusBadge(row.calculatedStatus)}
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex flex-column align-items-center">
                                                <span className="text-gray-800 fw-bold fs-7">{row.transactionId || '--'}</span>
                                                {row.remarks && !['pt', 'tds', 'pf', 'ptax', 'esi'].includes(row.remarks.toLowerCase().trim()) && !row.remarks.toLowerCase().startsWith('gov payment:') && (
                                                    <span className="text-muted fs-8 text-truncate ms-2" style={{ maxWidth: '120px' }} title={row.remarks}>
                                                        {row.remarks}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex justify-content-center gap-2">
                                                {fromAdmin ? (
                                                    <>
                                                        <Button 
                                                            variant="light-primary" 
                                                            className="btn-icon btn-sm"
                                                            onClick={() => onEditPayment(row)}
                                                        >
                                                            <KTIcon iconName="pencil" className="fs-3" />
                                                        </Button>
                                                        <Button 
                                                            variant="light-danger" 
                                                            className="btn-icon btn-sm"
                                                            onClick={() => onDeletePayment(row)}
                                                        >
                                                            <KTIcon iconName="trash" className="fs-3" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted">--</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default React.memo(PaymentDetailsTable);
