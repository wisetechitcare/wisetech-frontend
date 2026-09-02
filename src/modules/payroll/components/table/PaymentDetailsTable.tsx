import React from 'react';
import { Button, Badge } from 'react-bootstrap';
import { KTIcon } from '@metronic/helpers';
import dayjs from 'dayjs';
import { useMediaQuery, useTheme } from '@mui/material';
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
    const theme = useTheme();
    // Same breakpoint the reimbursement payment history switches on, so the two histories
    // change shape together instead of one going to cards a size before the other.
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

    // ── Shared cell content ───────────────────────────────────────────────────
    // The table and the mobile cards render the SAME facts, so the formatting lives here
    // once. Duplicating it inline in both is how one view ends up saying "Full Paid" while
    // the other still says "Partially Paid" after a rule changes.

    const payoutDate = (row: PayrollTableRow) =>
        row.displayDate ? dayjs(row.displayDate).format('DD MMM YYYY') : '--';

    const periodLabel = (row: PayrollTableRow) =>
        row.month ? dayjs(`${row.year}-${String(row.month).padStart(2, '0')}-01`).format('MMM YYYY') : '--';

    /** SALARY / ADVANCE / … or, for a government payout, which deduction it was. */
    const typeBadge = (row: PayrollTableRow) => {
        if (row.paymentType !== 'GOVERNMENT') {
            return <Badge bg="light-info" className="text-info fs-9 py-1 px-2">{row.paymentType}</Badge>;
        }
        const deduction = (row as any).deductionType;
        if (!deduction) return null;
        const value = String(deduction).toLowerCase();
        const short = ['tds', 'professional fees', 'professional fee'].some((k) => value.includes(k))
            ? 'TDS'
            : ['professional tax', 'ptax', 'prof. tax'].some((k) => value.includes(k))
                ? 'PTAX'
                : deduction;
        return <Badge bg="light-warning" className="text-warning fs-9 py-1 px-2">{short}</Badge>;
    };

    const methodLabel = (row: PayrollTableRow) =>
        row.paymentMethod ? row.paymentMethod.replace('_', ' ') : 'BANK TRANSFER';

    /** Negative remaining means they were overpaid — say "extra", never a minus sign. */
    const remainingAmount = (row: PayrollTableRow) => {
        const remaining = row.calculatedRemainingAmount || 0;
        if (remaining < 0) {
            return (
                <span className={`fw-bold ${sensitiveCls} text-info`}>
                    {formatINRRounded(Math.abs(remaining))} <span className="fs-8 fw-semibold">extra</span>
                </span>
            );
        }
        return (
            <span className={`fw-bold ${sensitiveCls} ${remaining === 0 ? 'text-success' : 'text-danger'}`}>
                {formatINRRounded(row.calculatedRemainingAmount)}
            </span>
        );
    };

    /** Notes worth showing. The deduction codes are already said by the type badge, and
     *  "gov payment: …" is machine chatter, so neither is repeated here. */
    const visibleRemark = (row: PayrollTableRow) => {
        const remark = row.remarks?.trim();
        if (!remark) return null;
        const lower = remark.toLowerCase();
        if (['pt', 'tds', 'pf', 'ptax', 'esi'].includes(lower)) return null;
        if (lower.startsWith('gov payment:')) return null;
        return remark;
    };

    return (
        // On mobile the outer card is dropped entirely: its border and padding wrapped a
        // list of cards that already have their own, so every payout sat inside two frames
        // and two paddings. Same treatment the reimbursement payment history uses.
        <div
            className={isMobile ? "mb-6" : "card shadow-sm mb-8 overflow-hidden border-0"}
            style={isMobile ? { background: 'transparent', boxShadow: 'none', border: 'none' } : undefined}
        >
            <div className={
                isMobile
                    ? "d-flex justify-content-between align-items-center gap-3 mb-3"
                    : "card-header border-0 pt-5 pb-2 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 bg-white"
            }>
                <div className="card-title align-items-start flex-column">
                    <h3 className={`card-label fw-bold text-gray-800 ${isMobile ? 'fs-5 mb-0' : 'fs-3 mb-1'}`}>
                        Monthly Payment History
                    </h3>
                    {/* The subtitle explains a table's columns. The cards below label every
                        figure themselves, so on a phone it is a line of filler above the
                        content someone came to read. */}
                    {!isMobile && (
                        <span className="text-muted fw-semibold fs-7">Detailed log of salary payouts and deductions</span>
                    )}
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
            <div className={isMobile ? "p-0" : "card-body py-3"}>
                {/* Mobile: one card per payout. The desktop table has eight columns, which on
                    a phone collapsed into an unreadable horizontal scroll — the same reason
                    the reimbursement payment history renders cards at this width. */}
                {isMobile ? (
                    tableRows.length === 0 ? (
                        <div className="d-flex flex-column align-items-center py-10">
                            <KTIcon iconName="cloud-change" className="fs-3x text-muted mb-3" />
                            <span className="text-gray-400 fw-bold fs-6 text-center">
                                No payout records found for this period
                            </span>
                        </div>
                    ) : (
                        <div className="d-flex flex-column gap-2">
                            {tableRows.map((row, index) => {
                                const remark = visibleRemark(row);
                                return (
                                    <div
                                        key={index}
                                        className="bg-body"
                                        style={{
                                            border: '1px solid var(--bs-gray-300)',
                                            borderRadius: 10,
                                            padding: '11px 12px',
                                        }}
                                    >
                                        {/* Date is the row's identity, so it leads. The calendar
                                            tile went: every row has one, so it distinguished
                                            nothing and cost 35px of the width the figures need. */}
                                        <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                                            <div className="d-flex align-items-baseline gap-2">
                                                <span className="text-dark fw-bold fs-6">{payoutDate(row)}</span>
                                                <span className="text-muted fw-semibold fs-8">{periodLabel(row)}</span>
                                            </div>
                                            {getStatusBadge(row.calculatedStatus)}
                                        </div>

                                        {/* Three figures across, not three rows down — they are
                                            read together (paid AGAINST payable), and stacked they
                                            cost three lines to say what one comparison says. */}
                                        <div className="d-flex align-items-end justify-content-between gap-2">
                                            <div className="d-flex flex-column">
                                                <span className="text-muted fw-semibold fs-9">Net Payable</span>
                                                <span className={`fw-bolder fs-6 ${sensitiveCls} ${row.calculatedNetSalary < 0 ? 'text-info' : 'text-primary'}`}>
                                                    {formatINRRounded(row.calculatedNetSalary)}
                                                </span>
                                            </div>
                                            <div className="d-flex flex-column">
                                                <span className="text-muted fw-semibold fs-9">Paid</span>
                                                <span className={`text-success fw-bold fs-6 ${sensitiveCls}`}>
                                                    {formatINRRounded(row.calculatedPaidAmount)}
                                                </span>
                                            </div>
                                            <div className="d-flex flex-column align-items-end">
                                                <span className="text-muted fw-semibold fs-9">Remaining</span>
                                                <span className="fs-6">{remainingAmount(row)}</span>
                                            </div>
                                        </div>

                                        {/* Metadata only when it says something. Method is BANK
                                            TRANSFER on nearly every row, so it is text beside the
                                            reference rather than a badge competing with status. */}
                                        <div className="d-flex flex-wrap align-items-center gap-2 mt-3 pt-2 border-top border-gray-200">
                                            {typeBadge(row)}
                                            <span className="text-muted fw-semibold fs-9">{methodLabel(row)}</span>
                                            {row.transactionId && (
                                                <span className="text-gray-700 fw-semibold fs-9">· {row.transactionId}</span>
                                            )}
                                            {remark && (
                                                <span className="text-muted fs-9 text-truncate" title={remark} style={{ maxWidth: '100%' }}>
                                                    · {remark}
                                                </span>
                                            )}
                                        </div>

                                        {fromAdmin && (
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <Button variant="light-primary" className="btn-icon btn-sm" onClick={() => onEditPayment(row)}>
                                                    <KTIcon iconName="pencil" className="fs-4" />
                                                </Button>
                                                <Button variant="light-danger" className="btn-icon btn-sm" onClick={() => onDeletePayment(row)}>
                                                    <KTIcon iconName="trash" className="fs-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : (
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
                                                            {payoutDate(row)}
                                                        </span>
                                                        {typeBadge(row)}
                                                    </div>
                                                    <span className="text-muted fw-semibold fs-7">
                                                        {periodLabel(row)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <Badge bg="light-primary" className="text-primary fw-bold">
                                                {methodLabel(row)}
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
                                        <td className="text-end fs-6">
                                            {remainingAmount(row)}
                                        </td>
                                        <td className="text-center">
                                            {getStatusBadge(row.calculatedStatus)}
                                        </td>
                                        <td className="text-center">
                                            <div className="d-flex flex-column align-items-center">
                                                <span className="text-gray-800 fw-bold fs-7">{row.transactionId || '--'}</span>
                                                {visibleRemark(row) && (
                                                    <span className="text-muted fs-8 text-truncate ms-2" style={{ maxWidth: '120px' }} title={visibleRemark(row) as string}>
                                                        {visibleRemark(row)}
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
                )}
            </div>
        </div>
    );
};

export default React.memo(PaymentDetailsTable);
