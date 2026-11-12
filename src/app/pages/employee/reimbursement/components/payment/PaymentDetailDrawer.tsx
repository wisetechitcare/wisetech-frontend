import { cn } from '@/ds/lib/utils';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { Separator } from '@/ds/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/ds/ui/sheet';
import { DescriptionList } from '@/ds/patterns/description-list';
import { fmtDate, formatMoney, resolveStatusNum, STATUS, STATUS_LABEL } from '../../utils/reimbursementFormat';
import { PaymentBatchRow } from './paymentData';
import PaymentStateBadge from './PaymentStateBadge';

/**
 * One batch, opened beside the queue rather than on top of it.
 *
 * Clicking a row used to throw the full approval modal over the page — the approver's surface,
 * borrowed by an accountant who wanted to know what a payout consists of. A drawer keeps the
 * queue visible behind it, which is what you want when you are working down a list.
 *
 * It shows what a payment decision needs and stops: who, how much is left, what the money was
 * for. The approval history stays in the batch modal, one click further in.
 *
 * The kit Sheet — the rounded floating drawer (shadcn base drawer look); no MUI.
 */

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className="min-w-0">
            <p className="m-0 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={cn('tabular m-0 text-lg leading-snug font-extrabold text-foreground', className)}>{value}</p>
        </div>
    );
}

/** A small uppercase section title inside the drawer. */
function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="m-0 mb-2 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{children}</h3>;
}

export default function PaymentDetailDrawer({
    row,
    onClose,
    onPay,
    onOpenBatch,
    canPay,
}: {
    row: PaymentBatchRow | null;
    onClose: () => void;
    onPay: (row: PaymentBatchRow) => void;
    onOpenBatch: (row: PaymentBatchRow) => void;
    canPay: boolean;
}) {
    const payable = !!row && row.remainingAmount > 0;

    return (
        <Sheet open={!!row} onOpenChange={(open) => { if (!open) onClose(); }}>
            <SheetContent side="right" size="lg">
                {row && (
                    <>
                        <SheetHeader className="border-b border-border">
                            <SheetTitle>Payment Details</SheetTitle>
                            <SheetDescription>{row.employeeName}</SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="brand" className="font-mono tracking-wide">{row.submissionId}</Badge>
                                <PaymentStateBadge state={row.state} />
                            </div>

                            {/* The three numbers a payout decision needs */}
                            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-muted/50 p-3.5">
                                <Figure label="Approved" value={formatMoney(row.approvedAmount)} />
                                <Figure label="Paid" value={formatMoney(row.paidAmount)} className="text-success-foreground" />
                                <Figure
                                    label="Remaining"
                                    value={formatMoney(row.remainingAmount)}
                                    className={row.remainingAmount > 0 ? 'text-foreground' : 'text-success-foreground'}
                                />
                            </div>

                            {/* Two columns (the DescriptionList default): four short facts in two rows, not four. */}
                            <DescriptionList
                                rows={[
                                    { label: 'Requests', value: `${row.totalRequests} approved` },
                                    { label: 'Submitted', value: fmtDate(row.submittedAt) },
                                    { label: 'Approved On', value: fmtDate(row.approvedAt) },
                                    ...(row.periodStart
                                        ? [{ label: 'Expense Period', value: `${fmtDate(row.periodStart)} – ${fmtDate(row.periodEnd)}`, wide: true }]
                                        : []),
                                ]}
                            />

                            {/* Payments already recorded against this batch */}
                            {row.payments.length > 0 && (
                                <section>
                                    <Separator className="mb-4" />
                                    <SectionTitle>Payments Recorded</SectionTitle>
                                    <ul className="m-0 list-none divide-y divide-border p-0">
                                        {row.payments.map((p) => (
                                            <li key={p.id} className="flex justify-between gap-3 py-2">
                                                <div className="min-w-0">
                                                    <p className="m-0 text-sm font-semibold">{fmtDate(p.paymentDate)}</p>
                                                    <p className="m-0 text-xs text-muted-foreground">
                                                        {(p.paymentMethod || '—').replace(/_/g, ' ')}
                                                        {p.transactionId ? ` · ${p.transactionId}` : ''}
                                                        {p.processedBy !== 'N/A' ? ` · by ${p.processedBy}` : ''}
                                                    </p>
                                                </div>
                                                <span className="tabular text-sm font-bold whitespace-nowrap text-success-foreground">
                                                    {formatMoney(p.amountPaid)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* The expenses this payout covers */}
                            <section>
                                <Separator className="mb-4" />
                                <SectionTitle>Reimbursement Items</SectionTitle>
                                <ul className="m-0 list-none divide-y divide-border p-0">
                                    {row.lines.map((line) => {
                                        const status = resolveStatusNum(line.status);
                                        const approved = status === STATUS.APPROVED;
                                        return (
                                            <li key={line.id} className={cn('flex justify-between gap-3 py-2', !approved && 'opacity-60')}>
                                                <div className="min-w-0">
                                                    <p className="m-0 truncate text-sm font-semibold">{line.category}</p>
                                                    <p className="m-0 truncate text-xs text-muted-foreground">
                                                        {fmtDate(line.expenseDate)} · {line.project}
                                                        {/* A rejected line sits in the batch but is never payable — saying so
                                                            is what stops "the total doesn't match the lines". */}
                                                        {!approved ? ` · ${STATUS_LABEL[status] ?? 'Not Approved'}` : ''}
                                                    </p>
                                                </div>
                                                <span
                                                    className={cn(
                                                        'tabular text-sm font-bold whitespace-nowrap',
                                                        approved ? 'text-foreground' : 'text-muted-foreground',
                                                        status === STATUS.REJECTED && 'line-through',
                                                    )}
                                                >
                                                    {formatMoney(line.amount)}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        </div>

                        {/* Actions — only what this state and this user actually allow */}
                        {/* One row, equal halves (the FilterSheet footer recipe); `mt-0` — the drawer is content-tall,
                            so the footer follows the body instead of being pushed to a viewport-tall bottom. */}
                        <SheetFooter className="mt-0 flex-row flex-wrap border-t border-border">
                            {canPay && payable && (
                                <Button className="flex-1" onClick={() => onPay(row)}>Record Payment</Button>
                            )}
                            <Button variant="outline" className="flex-1" onClick={() => onOpenBatch(row)}>View Reimbursement</Button>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
