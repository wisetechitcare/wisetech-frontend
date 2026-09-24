import { useMemo } from 'react';
import MaterialTable from '@app/modules/common/components/MaterialTable';
import { fmtDate, formatMoney } from '../utils/reimbursementFormat';

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

export default function PaymentDetailPanel({ payments }: { payments: PaymentDetailRow[] }) {
    // Flattened to real values (raw date, numeric amount) so sorting and per-column
    // search work on the values; the cells render exactly what they rendered before.
    const rows = useMemo(
        () => (payments || []).map((p, i) => ({
            id: p.id ?? String(i),
            paymentDate: p.paymentDate || '',
            paymentMadeBy: p.paymentMadeBy || 'N/A',
            paymentMethod: p.paymentMethod ? String(p.paymentMethod).replace(/_/g, ' ') : '',
            transactionId: p.transactionId || '',
            amountPaid: Number(p.amountPaid || 0),
        })),
        [payments],
    );

    const columns = useMemo(() => [
        {
            accessorKey: 'paymentDate',
            header: 'Payment Date',
            Cell: ({ cell }: any) => (
                <span style={{ fontSize: 13, color: '#424242' }}>{fmtDate(cell.getValue())}</span>
            ),
        },
        {
            accessorKey: 'paymentMadeBy',
            header: 'Payment Made By',
            Cell: ({ cell }: any) => (
                <span style={{ fontSize: 13, fontWeight: 500, color: '#424242' }}>{cell.getValue()}</span>
            ),
        },
        {
            accessorKey: 'paymentMethod',
            header: 'Method',
            Cell: ({ cell }: any) => (
                <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                    backgroundColor: '#e3f2fd', color: '#1565c0', textTransform: 'uppercase',
                }}>
                    {/* A missing method used to render as "Cash" in one of the two
                        copies, which invents a fact about how money moved. */}
                    {cell.getValue() || '—'}
                </span>
            ),
        },
        {
            // Reference earns a column now that it is captured and required for
            // bank transfers — a payout you cannot reconcile is not much of a record.
            accessorKey: 'transactionId',
            header: 'Reference',
            Cell: ({ cell }: any) => (
                <span style={{ fontSize: 12, color: cell.getValue() ? '#424242' : '#9e9e9e' }}>
                    {cell.getValue() || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'amountPaid',
            header: 'Amount',
            Cell: ({ cell }: any) => (
                <span style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>
                    {formatMoney(cell.getValue())}
                </span>
            ),
        },
    ], []);

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
            <MaterialTable
                tableName="ReimbursementPaymentDetail"
                data={rows}
                columns={columns}
                hidePagination
                hideExportCenter
                enableColumnActions={false}
            />
        </div>
    );
}
