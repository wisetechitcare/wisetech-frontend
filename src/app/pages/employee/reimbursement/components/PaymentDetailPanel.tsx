import { fmtDate, formatINR } from '../utils/reimbursementFormat';

/**
 * The rows shown when a paid batch is expanded: one line per payment against it.
 *
 * This markup existed twice, near enough verbatim — once in the admin Payment tab and once in
 * the employee's own payment history. The copies had already drifted on the details that matter
 * to a reader: one showed a missing payment method as "Cash" (inventing a fact about how money
 * moved) and the other showed the raw value, and the two disagreed on how a transaction
 * reference was labelled.
 *
 * One component, both callers. The field names differ slightly between the two data shapes, so
 * the caller maps into `PaymentDetailRow` rather than this file learning about both.
 */

export interface PaymentDetailRow {
    id?: string;
    paymentDate?: string | null;
    /** Resolved display name of whoever recorded the payment. */
    paymentMadeBy?: string | null;
    paymentMethod?: string | null;
    amountPaid?: number | string | null;
    /** UTR / bank reference. Captured since Phase 5; older rows have none. */
    transactionId?: string | null;
    remarks?: string | null;
}

const TH: React.CSSProperties = {
    padding: '8px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    letterSpacing: '0.04em', textTransform: 'uppercase', color: '#616161',
    borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = { padding: '10px 16px', borderRight: '1px solid #eeeeee' };

export default function PaymentDetailPanel({ payments }: { payments: PaymentDetailRow[] }) {
    if (!payments || payments.length === 0) {
        return (
            <div style={{
                padding: '20px 24px', backgroundColor: '#fafafa',
                borderTop: '1px solid #e0e0e0', color: '#9e9e9e',
                fontSize: 13, fontStyle: 'italic',
            }}>
                No payment records found for this period.
            </div>
        );
    }

    return (
        <div style={{ padding: '16px 24px', backgroundColor: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
            {/* The table scrolls inside its own container rather than widening the page — these
                panels used to opt out of the scroll wrapper the shared table provides. */}
            <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead style={{ backgroundColor: '#f5f5f5' }}>
                        <tr>
                            <th style={TH}>Payment Date</th>
                            <th style={TH}>Payment Made By</th>
                            <th style={TH}>Method</th>
                            {/* Reference earns a column now that it is captured and required for
                                bank transfers — a payout you cannot reconcile is not much of a record. */}
                            <th style={TH}>Reference</th>
                            <th style={TH}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map((p, i) => (
                            <tr key={p.id ?? i} style={{ borderTop: i === 0 ? 'none' : '1px solid #eeeeee' }}>
                                <td style={TD}>
                                    <span style={{ fontSize: 13, color: '#424242' }}>{fmtDate(p.paymentDate)}</span>
                                </td>
                                <td style={TD}>
                                    <span style={{ fontSize: 13, fontWeight: 500, color: '#424242' }}>
                                        {p.paymentMadeBy || 'N/A'}
                                    </span>
                                </td>
                                <td style={TD}>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                                        fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                                        backgroundColor: '#e3f2fd', color: '#1565c0', textTransform: 'uppercase',
                                    }}>
                                        {/* A missing method used to render as "Cash" in one of the two
                                            copies, which invents a fact about how money moved. */}
                                        {p.paymentMethod ? String(p.paymentMethod).replace(/_/g, ' ') : '—'}
                                    </span>
                                </td>
                                <td style={TD}>
                                    <span style={{ fontSize: 12, color: p.transactionId ? '#424242' : '#9e9e9e' }}>
                                        {p.transactionId || '—'}
                                    </span>
                                </td>
                                <td style={{ padding: '10px 16px' }}>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>
                                        {formatINR(Number(p.amountPaid || 0))}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
