import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Box, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import { GlassDialog, GlassHeader, WtButton, WtDateField } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { getBillingTaxRates } from "@services/billingConfig";
import { sectionLabel } from "@pages/billing/configure/TaxRateSections";
import type {
    ProjectBillingRow, RaiseBillInput, RecordPaymentInput, PaymentMethod, BillOnRow,
} from "@services/bills";

/**
 * The two dialogs the Billing tab writes through.
 *
 * Both show their arithmetic as you type. A bill is the first thing a client
 * sees, and "what will they actually pay after TDS" is the question the person
 * raising it is holding in their head — answering it in the form is cheaper than
 * answering it in a support call.
 */

const TAX_RATES_KEY = ["billing-tax-rates"];

/** Cached across both dialogs and every project — these change a few times a year. */
export const useTaxRates = () =>
    useQuery({ queryKey: TAX_RATES_KEY, queryFn: getBillingTaxRates, staleTime: 5 * 60 * 1000 });

const today = () => new Date().toISOString().slice(0, 10);

const Line: React.FC<{ label: string; value: string; strong?: boolean; muted?: boolean }> = ({
    label, value, strong, muted,
}) => (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ py: 0.4 }}>
        <Typography sx={{ fontSize: 12.5, color: muted ? "text.disabled" : "text.secondary" }}>
            {label}
        </Typography>
        <Typography sx={{ fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 600 }}>
            {value}
        </Typography>
    </Stack>
);

// ─── raise a bill ────────────────────────────────────────────────────────────

export const RaiseBillDialog: React.FC<{
    open: boolean;
    row: ProjectBillingRow | null;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (input: RaiseBillInput) => void;
}> = ({ open, row, busy, onClose, onSubmit }) => {
    const { data: rates } = useTaxRates();
    const [gstSlabId, setGstSlabId] = useState("");
    const [tdsSectionId, setTdsSectionId] = useState("");
    const [billDate, setBillDate] = useState(today());
    const [termsDays, setTermsDays] = useState(30);
    const [remarks, setRemarks] = useState("");
    const [asDraft, setAsDraft] = useState(false);

    // Re-seed from the configured defaults each time the dialog opens on a row,
    // rather than keeping whatever the last bill used.
    React.useEffect(() => {
        if (!open || !rates) return;
        setGstSlabId(rates.gstSlabs.find((s) => s.isDefault && s.isActive)?.id ?? "");
        setTdsSectionId(rates.tdsSections.find((s) => s.isDefault && s.isActive)?.id ?? "");
        setBillDate(today());
        setTermsDays(30);
        setRemarks("");
        setAsDraft(false);
    }, [open, rates]);

    const gstSlabs = useMemo(
        () => (rates?.gstSlabs ?? []).filter((s) => s.isActive),
        [rates],
    );
    const tdsSections = useMemo(
        () => (rates?.tdsSections ?? []).filter((s) => s.isActive),
        [rates],
    );

    const gstRate = gstSlabs.find((s) => s.id === gstSlabId)?.rate ?? 0;
    const tdsRate = tdsSections.find((s) => s.id === tdsSectionId)?.rate ?? 0;
    const tdsSectionLabel = sectionLabel(tdsSections.find((s) => s.id === tdsSectionId)?.section);

    // Mirrors `computeBillMoney` on the server. Duplicated on purpose: a preview
    // that round-trips would either lag the typing or need an endpoint of its own,
    // and the server stays the one that decides what is actually stored.
    const amount = row?.amount ?? 0;
    const gstAmount = Math.round(((amount * gstRate) / 100) * 100) / 100;
    const tdsAmount = Math.round(((amount * tdsRate) / 100) * 100) / 100;
    const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
    const expected = Math.round((totalAmount - tdsAmount) * 100) / 100;

    if (!row) return null;

    return (
        <GlassDialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={false}>
            <GlassHeader title="Raise bill" subtitle={row.deliverableName} onClose={onClose} />
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 1.5 }}>
                    {row.stageName} · {row.percentage}% of the stage
                </Typography>

                <Stack spacing={1.75}>
                    <TextField
                        select fullWidth size="small" label="GST slab"
                        value={gstSlabId} onChange={(e) => setGstSlabId(e.target.value)}
                        helperText="Charged on top of the deliverable value."
                    >
                        <MenuItem value="">No GST</MenuItem>
                        {gstSlabs.map((s) => (
                            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                        ))}
                    </TextField>

                    <TextField
                        select fullWidth size="small" label="TDS section"
                        value={tdsSectionId} onChange={(e) => setTdsSectionId(e.target.value)}
                        helperText="Deducted by the client from what it pays you."
                    >
                        <MenuItem value="">No TDS</MenuItem>
                        {tdsSections.map((s) => {
                            const section = sectionLabel(s.section);
                            return (
                                <MenuItem key={s.id} value={s.id}>
                                    {s.name}
                                    {section && (
                                        <Typography
                                            component="span"
                                            sx={{ fontSize: 12, color: "text.disabled", ml: 0.75 }}
                                        >
                                            {section} · {s.rate}%
                                        </Typography>
                                    )}
                                </MenuItem>
                            );
                        })}
                    </TextField>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <WtDateField
                            fullWidth label="Bill date"
                            value={billDate} onChange={setBillDate}
                        />
                        <TextField
                            type="number" fullWidth size="small" label="Payment terms (days)"
                            value={termsDays}
                            onChange={(e) => setTermsDays(Math.max(0, Number(e.target.value)))}
                        />
                    </Stack>

                    <TextField
                        fullWidth size="small" label="Remarks" multiline minRows={2}
                        value={remarks} onChange={(e) => setRemarks(e.target.value)}
                    />

                    <Box sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", p: 1.5 }}>
                        <Line label="Deliverable value" value={formatCurrencyDecimal(amount)} />
                        <Line label={`GST ${gstRate}%`} value={formatCurrencyDecimal(gstAmount)} />
                        <Line label="Bill total" value={formatCurrencyDecimal(totalAmount)} strong />
                        <Line
                            label={`Less TDS ${tdsRate}%${tdsSectionLabel ? ` · ${tdsSectionLabel}` : ""}`}
                            value={`− ${formatCurrencyDecimal(tdsAmount)}`}
                            muted
                        />
                        <Box sx={{ borderTop: "1px dashed", borderColor: "divider", mt: 0.75, pt: 0.75 }}>
                            <Line label="Client will pay" value={formatCurrencyDecimal(expected)} strong />
                        </Box>
                    </Box>

                    <FormControlLabel
                        control={<Checkbox checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} />}
                        label={
                            <Typography sx={{ fontSize: 13 }}>
                                Save as draft — do not send the proforma yet
                            </Typography>
                        }
                    />
                </Stack>

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <WtButton ghost onClick={onClose} disabled={busy}>Cancel</WtButton>
                    <WtButton
                        tone="primary"
                        disabled={busy || amount <= 0}
                        onClick={() =>
                            onSubmit({
                                deliverableId: row.deliverableId,
                                gstSlabId: gstSlabId || null,
                                tdsSectionId: tdsSectionId || null,
                                billDate,
                                paymentTermsDays: termsDays,
                                remarks: remarks.trim() || null,
                                asDraft,
                            })
                        }
                    >
                        {asDraft ? "Save draft" : "Raise proforma"}
                    </WtButton>
                </Stack>
            </Box>
        </GlassDialog>
    );
};

// ─── record a payment ────────────────────────────────────────────────────────

const METHODS: PaymentMethod[] = [
    "NEFT", "RTGS", "IMPS", "UPI", "BANK_TRANSFER", "CHEQUE", "CASH", "ONLINE", "OTHER",
];

export const RecordPaymentDialog: React.FC<{
    open: boolean;
    bill: BillOnRow | null;
    deliverableName?: string;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (input: RecordPaymentInput) => void;
}> = ({ open, bill, deliverableName, busy, onClose, onSubmit }) => {
    const [amount, setAmount] = useState("");
    const [paymentDate, setPaymentDate] = useState(today());
    const [method, setMethod] = useState<PaymentMethod>("NEFT");
    const [reference, setReference] = useState("");
    const [bankName, setBankName] = useState("");

    // Open pre-filled with what is still owed — the overwhelmingly common case is
    // the client clearing the balance, and typing it again invites a typo.
    React.useEffect(() => {
        if (!open || !bill) return;
        setAmount(bill.outstandingAmount > 0 ? String(bill.outstandingAmount) : "");
        setPaymentDate(today());
        setMethod("NEFT");
        setReference("");
        setBankName("");
    }, [open, bill]);

    if (!bill) return null;

    const value = Number(amount);
    const valid = Number.isFinite(value) && value > 0 && !!paymentDate;
    const over = valid && value > bill.outstandingAmount;

    return (
        <GlassDialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <GlassHeader
                title="Record payment"
                subtitle={`${bill.billNumber}${deliverableName ? ` · ${deliverableName}` : ""}`}
                onClose={onClose}
            />
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ borderRadius: "10px", border: "1px solid", borderColor: "divider", p: 1.5, mb: 2 }}>
                    <Line label="Client will pay" value={formatCurrencyDecimal(bill.expectedAmount)} />
                    <Line label="Already received" value={formatCurrencyDecimal(bill.receivedAmount)} />
                    <Line label="Still outstanding" value={formatCurrencyDecimal(bill.outstandingAmount)} strong />
                </Box>

                <Stack spacing={1.75}>
                    <TextField
                        type="number" fullWidth size="small" label="Amount received"
                        value={amount} onChange={(e) => setAmount(e.target.value)}
                        error={over}
                        helperText={
                            over
                                ? "More than the outstanding amount. It will be recorded as an overpayment."
                                : "The amount that actually reached the bank, after TDS."
                        }
                    />
                    {/* Capped at today: money that has not arrived is not collected,
                        and every days-outstanding figure built on tomorrow's receipt
                        is wrong today. The server refuses it too. */}
                    <WtDateField
                        fullWidth label="Payment date" required
                        value={paymentDate} onChange={setPaymentDate}
                        maxDate={today()}
                    />
                    <TextField
                        select fullWidth size="small" label="Method"
                        value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    >
                        {METHODS.map((m) => (
                            <MenuItem key={m} value={m}>{m.replace(/_/g, " ")}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth size="small" label="Reference (UTR / cheque no.)"
                        value={reference} onChange={(e) => setReference(e.target.value)}
                    />
                    <TextField
                        fullWidth size="small" label="Bank"
                        value={bankName} onChange={(e) => setBankName(e.target.value)}
                    />
                </Stack>

                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2.5 }}>
                    <WtButton ghost onClick={onClose} disabled={busy}>Cancel</WtButton>
                    <WtButton
                        tone="primary"
                        disabled={busy || !valid}
                        onClick={() =>
                            onSubmit({
                                amount: value,
                                paymentDate,
                                method,
                                reference: reference.trim() || null,
                                bankName: bankName.trim() || null,
                            })
                        }
                    >
                        Record payment
                    </WtButton>
                </Stack>
            </Box>
        </GlassDialog>
    );
};
