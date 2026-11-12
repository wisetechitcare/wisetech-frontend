import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { parseDate, type CalendarDate } from '@internationalized/date';
import { Info, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/ds/ui/alert';
import { DatePicker } from '@/ds/ui/date-picker';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/ds/ui/field';
import { Input } from '@/ds/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select';
import { Textarea } from '@/ds/ui/textarea';
import { FormDialog } from '@/ds/patterns/form-dialog';
import { cn } from '@/ds/lib/utils';
import { fmtAmount, formatMoney } from '../../utils/reimbursementFormat';
import { PaymentBatchRow } from './paymentData';
import { currencyPrefix } from '@utils/currency';
import { formatDate } from '@utils/dateFormats';

/**
 * Confirming a payout before it is recorded.
 *
 * Nothing is posted from the table — the button opens this, and this states the exact amount,
 * against which batch, for whom, before anything is written. That was already true for a single
 * batch; the change here is that a payment RUN (several batches at once) gets the same treatment
 * instead of firing N silent requests.
 *
 * The capture rules are unchanged, because they are the ones the backend enforces:
 *  · the amount can never exceed the batch's remaining balance (the server re-checks inside the
 *    transaction, so an optimistic client-side epsilon would only produce a rejected request)
 *  · a BANK_TRANSFER with no reference cannot be reconciled against a statement later, so it is
 *    refused here rather than stored as an unusable row
 *  · the date cannot be back-posted before the current month, which would reopen a period
 *    finance has already reported
 *
 * In run mode each batch is settled in FULL. Splitting one arbitrary sum across several batches
 * is an allocation policy the backend does not define, and inventing one in the UI would put a
 * number in the ledger that no rule can reproduce.
 */

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Cash' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'UPI', label: 'UPI' },
];

const FORM_ID = 'record-payment-form';
const WIRE_DATE = 'YYYY-MM-DD';

export interface PaymentSubmission {
    paymentDate: string;
    paymentMethod: string;
    transactionId: string;
    remarks: string;
    /** Per batch: how much of its remaining balance to record. */
    allocations: { row: PaymentBatchRow; amount: number }[];
}

function SummaryRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0">
            <span className="min-w-0 text-[12.5px] font-semibold text-muted-foreground">{label}</span>
            <span className={cn('min-w-0 text-right text-[12.5px] font-bold tabular-nums text-foreground', valueClassName)}>
                {value}
            </span>
        </div>
    );
}

/** A wire date (`YYYY-MM-DD`) as the picker's value; null when empty or unreadable. */
const toCalendarDate = (value: string): CalendarDate | null => {
    try {
        return value ? parseDate(value) : null;
    } catch {
        return null;
    }
};

export default function RecordPaymentModal({
    batches,
    open,
    onClose,
    onConfirm,
}: {
    batches: PaymentBatchRow[];
    open: boolean;
    onClose: () => void;
    onConfirm: (submission: PaymentSubmission) => Promise<void>;
}) {
    const isRun = batches.length > 1;
    const single = batches.length === 1 ? batches[0] : null;
    const remainingTotal = useMemo(
        () => batches.reduce((s, b) => s + b.remainingAmount, 0),
        [batches],
    );

    const [date, setDate] = useState(dayjs().format(WIRE_DATE));
    const [method, setMethod] = useState('CASH');
    const [transactionId, setTransactionId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [amountError, setAmountError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reopening for a different batch must not inherit the previous one's amount or reference.
    useEffect(() => {
        if (!open) return;
        setDate(dayjs().format(WIRE_DATE));
        setMethod('CASH');
        setTransactionId('');
        setRemarks('');
        setAmountInput(single ? String(single.remainingAmount.toFixed(2)) : '');
        setAmountError('');
    }, [open, single]);

    const amount = single ? Number(amountInput) : remainingTotal;
    const isPartial = !!single && amount > 0 && amount < single.remainingAmount;

    // Bounds of the payment date: this month's first day through today (see the note above).
    const minDate = dayjs().startOf('month').format(WIRE_DATE);
    const maxDate = dayjs().format(WIRE_DATE);
    const dateError = !date
        ? 'Enter a payment date'
        : date < minDate || date > maxDate
            ? `Pick a date from ${formatDate(minDate)} to ${formatDate(maxDate)}`
            : '';

    const validate = (): string => {
        if (!single) return '';
        if (!amountInput.trim() || isNaN(amount) || amount <= 0) return 'Enter an amount greater than 0';
        if (amount > single.remainingAmount) {
            return `Amount cannot exceed the remaining balance of ${currencyPrefix()}${fmtAmount(single.remainingAmount)}`;
        }
        return '';
    };

    const referenceMissing = method === 'BANK_TRANSFER' && !transactionId.trim();
    const blocked = submitting || !!validate() || referenceMissing || !!dateError || batches.length === 0;

    const handleConfirm = async () => {
        const err = validate();
        if (err) { setAmountError(err); return; }
        setSubmitting(true);
        try {
            await onConfirm({
                paymentDate: date,
                paymentMethod: method,
                transactionId: transactionId.trim(),
                remarks: remarks.trim(),
                allocations: single
                    ? [{ row: single, amount }]
                    : batches.map((b) => ({ row: b, amount: b.remainingAmount })),
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <FormDialog
            open={open}
            onOpenChange={(next) => { if (!next) onClose(); }}
            title={isRun ? 'Confirm payment run' : 'Confirm payment'}
            description={isRun
                ? `${batches.length} batches, settled in full`
                : 'Review the amount before it is recorded'}
            icon={<Wallet />}
            formId={FORM_ID}
            submitting={submitting}
            submitDisabled={blocked}
            submitLabel={submitting ? 'Recording…'
                : isRun ? `Pay ${batches.length} batches · ${formatMoney(remainingTotal)}`
                : isPartial ? `Record part payment · ${formatMoney(amount || 0)}`
                : `Confirm payment · ${formatMoney(amount || 0)}`}
        >
            <form
                id={FORM_ID}
                noValidate
                className="flex min-w-0 flex-col gap-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!blocked) void handleConfirm();
                }}
            >
                {/* What is being paid */}
                <div className="overflow-hidden rounded-[10px] border border-border">
                    {single ? (
                        <>
                            <SummaryRow label="Employee" value={`${single.employeeName} · ${single.employeeCode}`} />
                            <SummaryRow label="Batch" value={single.submissionId} />
                            <SummaryRow label="Requests" value={String(single.totalRequests)} />
                            <SummaryRow label="Approved" value={formatMoney(single.approvedAmount)} />
                            {single.paidAmount > 0 && (
                                <SummaryRow label="Already paid" value={formatMoney(single.paidAmount)} valueClassName="text-success-foreground" />
                            )}
                            <SummaryRow label="Remaining" value={formatMoney(single.remainingAmount)} valueClassName="text-primary" />
                        </>
                    ) : (
                        <>
                            <div className="max-h-[190px] overflow-y-auto">
                                {batches.map((b) => (
                                    <SummaryRow
                                        key={b.id}
                                        label={`${b.employeeName} · ${b.submissionId}`}
                                        value={formatMoney(b.remainingAmount)}
                                    />
                                ))}
                            </div>
                            <div className="flex justify-between gap-3 bg-muted/50 px-4 py-2.5">
                                <span className="text-[12.5px] font-extrabold">Total to pay</span>
                                <span className="text-[13.5px] font-extrabold tabular-nums text-primary">
                                    {formatMoney(remainingTotal)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
                    <DatePicker
                        label="Payment date"
                        value={toCalendarDate(date)}
                        onChange={(d) => setDate(d ? d.toString() : '')}
                        minValue={toCalendarDate(minDate)}
                        maxValue={toCalendarDate(maxDate)}
                        isInvalid={!!dateError}
                        errorMessage={dateError}
                        validationBehavior="aria"
                    />

                    <Field>
                        <FieldLabel id="record-payment-method-label">Payment method</FieldLabel>
                        <Select items={PAYMENT_METHODS} value={method} onValueChange={(v) => setMethod(String(v))}>
                            <SelectTrigger className="w-full" aria-labelledby="record-payment-method-label">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_METHODS.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    {single && (
                        <Field data-invalid={!!amountError || undefined}>
                            <FieldLabel htmlFor="record-payment-amount">Amount to pay</FieldLabel>
                            <Input
                                id="record-payment-amount"
                                inputMode="decimal"
                                value={amountInput}
                                onChange={(e) => {
                                    if (/^\d*\.?\d*$/.test(e.target.value)) {
                                        setAmountInput(e.target.value);
                                        setAmountError('');
                                    }
                                }}
                                aria-invalid={!!amountError || undefined}
                                aria-describedby="record-payment-amount-note"
                            />
                            {amountError
                                ? <FieldError id="record-payment-amount-note">{amountError}</FieldError>
                                : (
                                    <FieldDescription id="record-payment-amount-note" className="text-xs">
                                        {`Maximum payable ${currencyPrefix()}${fmtAmount(single.remainingAmount)}`}
                                    </FieldDescription>
                                )}
                        </Field>
                    )}

                    <Field data-invalid={referenceMissing || undefined}>
                        <FieldLabel htmlFor="record-payment-reference">
                            {method === 'BANK_TRANSFER' ? 'UTR / reference' : 'Reference'}
                        </FieldLabel>
                        <Input
                            id="record-payment-reference"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder={method === 'BANK_TRANSFER' ? 'e.g. UTR123456789' : 'Optional'}
                            aria-invalid={referenceMissing || undefined}
                            aria-describedby={referenceMissing ? 'record-payment-reference-error' : undefined}
                        />
                        {referenceMissing && (
                            <FieldError id="record-payment-reference-error">
                                Needed to reconcile this payout against the bank statement
                            </FieldError>
                        )}
                    </Field>

                    <Field className="sm:col-span-2">
                        <FieldLabel htmlFor="record-payment-remarks">Remarks</FieldLabel>
                        <Textarea
                            id="record-payment-remarks"
                            rows={2}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Optional note for the payment record"
                        />
                    </Field>
                </div>

                {isPartial && (
                    <Alert variant="info">
                        <Info aria-hidden />
                        <AlertDescription className="text-[12.5px]">
                            This records a part payment. {formatMoney(single!.remainingAmount - amount)} stays outstanding
                            and the batch remains in the queue.
                        </AlertDescription>
                    </Alert>
                )}
                {isRun && (
                    <Alert variant="info">
                        <Info aria-hidden />
                        <AlertDescription className="text-[12.5px]">
                            Each batch is recorded as its own payment against the same date and reference. If one
                            fails, the rest still go through and the failures are listed.
                        </AlertDescription>
                    </Alert>
                )}
            </form>
        </FormDialog>
    );
}
