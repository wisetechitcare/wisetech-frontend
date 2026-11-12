import { useMemo } from 'react';
import { cn } from '@/ds/lib/utils';
import { Badge } from '@/ds/ui/badge';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/ds/ui/table';
import { SensitiveValue } from '@/ds/patterns/sensitive';
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
 *
 * A plain kit Table, not a DataTable: a batch carries a handful of payments, so search, paging
 * and column controls would be chrome around three lines. Payments read in date order.
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

const byDate = (a: { paymentDate: string }, b: { paymentDate: string }) =>
    new Date(a.paymentDate || 0).getTime() - new Date(b.paymentDate || 0).getTime();

export default function PaymentDetailPanel({ payments }: { payments: PaymentDetailRow[] }) {

    const rows = useMemo(
        () => (payments || []).map((p, i) => ({
            id: p.id ?? String(i),
            paymentDate: p.paymentDate || '',
            paymentMadeBy: p.paymentMadeBy || 'N/A',
            paymentMethod: p.paymentMethod ? String(p.paymentMethod).replace(/_/g, ' ') : '',
            transactionId: p.transactionId || '',
            amountPaid: Number(p.amountPaid || 0),
        })).sort(byDate),
        [payments],
    );

    if (rows.length === 0) {
        return (
            <p className="px-4 py-5 text-sm text-muted-foreground italic">
                No payment records found for this period.
            </p>
        );
    }

    return (
        <div className="px-2 py-3 sm:px-4">
            <Table>
                <TableCaption className="sr-only">Payments against this batch</TableCaption>
                <TableHeader>
                    <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Payment Made By</TableHead>
                        <TableHead>Method</TableHead>
                        {/* Reference earns a column now that it is captured and required for bank
                            transfers — a payout you cannot reconcile is not much of a record. */}
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.map((r) => (
                        <TableRow key={r.id}>
                            <TableCell>{fmtDate(r.paymentDate)}</TableCell>
                            <TableCell className="font-medium">{r.paymentMadeBy}</TableCell>
                            <TableCell>
                                {/* A missing method used to render as "Cash" in one of the two
                                    copies, which invents a fact about how money moved. */}
                                {r.paymentMethod
                                    ? <Badge variant="info" className="uppercase tracking-wide">{r.paymentMethod}</Badge>
                                    : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className={cn(!r.transactionId && 'text-muted-foreground')}>
                                {r.transactionId || '—'}
                            </TableCell>
                            <TableCell className="tabular text-right font-semibold text-success-foreground">
                                {/* "Hide amounts" applies here too: this panel used to print every payment in clear under a row whose totals were blurred. */}
                                <SensitiveValue>{formatMoney(r.amountPaid)}</SensitiveValue>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
