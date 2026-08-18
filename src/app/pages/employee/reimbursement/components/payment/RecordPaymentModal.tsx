import { useEffect, useMemo, useState } from 'react';
import {
    Box, DialogContent, DialogActions, MenuItem, TextField, Typography, Alert,
} from '@mui/material';
import dayjs from 'dayjs';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/glass';
import { WtButton } from '@app/modules/common/components/ui/buttons';
import { WtDateField } from '@app/modules/common/components/ui/dates';
import { fmtAmount, formatINR } from '../../utils/reimbursementFormat';
import { PaymentBatchRow } from './paymentData';

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

export interface PaymentSubmission {
    paymentDate: string;
    paymentMethod: string;
    transactionId: string;
    remarks: string;
    /** Per batch: how much of its remaining balance to record. */
    allocations: { row: PaymentBatchRow; amount: number }[];
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: string }) {
    return (
        <Box sx={{
            px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid', borderColor: 'divider',
            '&:last-of-type': { borderBottom: 0 },
        }}>
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
            <Typography sx={{
                fontSize: 12.5, fontWeight: 700, color: tone ?? 'text.primary',
                fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: 0,
            }}>
                {value}
            </Typography>
        </Box>
    );
}

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

    const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [method, setMethod] = useState('CASH');
    const [transactionId, setTransactionId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [amountInput, setAmountInput] = useState('');
    const [amountError, setAmountError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reopening for a different batch must not inherit the previous one's amount or reference.
    useEffect(() => {
        if (!open) return;
        setDate(dayjs().format('YYYY-MM-DD'));
        setMethod('CASH');
        setTransactionId('');
        setRemarks('');
        setAmountInput(single ? String(single.remainingAmount.toFixed(2)) : '');
        setAmountError('');
    }, [open, single]);

    const amount = single ? Number(amountInput) : remainingTotal;
    const isPartial = !!single && amount > 0 && amount < single.remainingAmount;

    const validate = (): string => {
        if (!single) return '';
        if (!amountInput.trim() || isNaN(amount) || amount <= 0) return 'Enter an amount greater than 0';
        if (amount > single.remainingAmount) {
            return `Amount cannot exceed the remaining balance of ₹${fmtAmount(single.remainingAmount)}`;
        }
        return '';
    };

    const referenceMissing = method === 'BANK_TRANSFER' && !transactionId.trim();
    const blocked = submitting || !!validate() || referenceMissing || batches.length === 0;

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
        <GlassDialog
            open={open}
            onClose={submitting ? undefined : onClose}
            maxWidth="sm"
            header={
                <GlassHeader
                    title={isRun ? 'Confirm payment run' : 'Confirm payment'}
                    subtitle={isRun
                        ? `${batches.length} batches, settled in full`
                        : 'Review the amount before it is recorded'}
                    icon="wallet"
                    onClose={submitting ? undefined : onClose}
                />
            }
        >
            <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
                {/* What is being paid */}
                <Box sx={{ borderRadius: '10px', border: '1px solid', borderColor: 'divider', mb: 2.5, overflow: 'hidden' }}>
                    {single ? (
                        <>
                            <SummaryRow label="Employee" value={`${single.employeeName} · ${single.employeeCode}`} />
                            <SummaryRow label="Batch" value={single.submissionId} />
                            <SummaryRow label="Requests" value={String(single.totalRequests)} />
                            <SummaryRow label="Approved" value={formatINR(single.approvedAmount)} />
                            {single.paidAmount > 0 && (
                                <SummaryRow label="Already paid" value={formatINR(single.paidAmount)} tone="#16a34a" />
                            )}
                            <SummaryRow label="Remaining" value={formatINR(single.remainingAmount)} tone="#1E3A8A" />
                        </>
                    ) : (
                        <>
                            <Box sx={{ maxHeight: 190, overflowY: 'auto' }}>
                                {batches.map((b) => (
                                    <SummaryRow
                                        key={b.id}
                                        label={`${b.employeeName} · ${b.submissionId}`}
                                        value={formatINR(b.remainingAmount)}
                                    />
                                ))}
                            </Box>
                            <Box sx={{ px: 2, py: 1.25, display: 'flex', justifyContent: 'space-between', bgcolor: 'action.hover' }}>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>Total to pay</Typography>
                                <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: '#1E3A8A', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatINR(remainingTotal)}
                                </Typography>
                            </Box>
                        </>
                    )}
                </Box>

                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                    <WtDateField
                        label="Payment date"
                        value={date}
                        onChange={(v: string) => v && setDate(v)}
                        minDate={dayjs().startOf('month').format('YYYY-MM-DD')}
                        maxDate={dayjs().format('YYYY-MM-DD')}
                    />

                    <TextField
                        select
                        size="small"
                        label="Payment method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    >
                        {PAYMENT_METHODS.map((m) => (
                            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                        ))}
                    </TextField>

                    {single && (
                        <TextField
                            size="small"
                            label="Amount to pay"
                            value={amountInput}
                            onChange={(e) => {
                                if (/^\d*\.?\d*$/.test(e.target.value)) {
                                    setAmountInput(e.target.value);
                                    setAmountError('');
                                }
                            }}
                            error={!!amountError}
                            helperText={amountError || `Maximum payable ₹${fmtAmount(single.remainingAmount)}`}
                            inputProps={{ inputMode: 'decimal' }}
                        />
                    )}

                    <TextField
                        size="small"
                        label={method === 'BANK_TRANSFER' ? 'UTR / reference' : 'Reference'}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder={method === 'BANK_TRANSFER' ? 'e.g. UTR123456789' : 'Optional'}
                        error={referenceMissing}
                        helperText={referenceMissing
                            ? 'Needed to reconcile this payout against the bank statement'
                            : ' '}
                    />

                    <TextField
                        size="small"
                        label="Remarks"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Optional note for the payment record"
                        multiline
                        rows={2}
                        sx={{ gridColumn: { sm: '1 / -1' } }}
                    />
                </Box>

                {isPartial && (
                    <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                        This records a part payment. {formatINR(single!.remainingAmount - amount)} stays outstanding
                        and the batch remains in the queue.
                    </Alert>
                )}
                {isRun && (
                    <Alert severity="info" sx={{ mt: 2, fontSize: 12.5 }}>
                        Each batch is recorded as its own payment against the same date and reference. If one
                        fails, the rest still go through and the failures are listed.
                    </Alert>
                )}
            </DialogContent>

            <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, gap: 1 }}>
                <WtButton ghost onClick={onClose} disabled={submitting}>Cancel</WtButton>
                <WtButton onClick={handleConfirm} disabled={blocked}>
                    {submitting ? 'Recording…'
                        : isRun ? `Pay ${batches.length} batches · ${formatINR(remainingTotal)}`
                        : isPartial ? `Record part payment · ${formatINR(amount || 0)}`
                        : `Confirm payment · ${formatINR(amount || 0)}`}
                </WtButton>
            </DialogActions>
        </GlassDialog>
    );
}
