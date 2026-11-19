import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { today as todayIn, getLocalTimeZone, type CalendarDate } from "@internationalized/date";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Checkbox } from "@/ds/ui/checkbox";
import { DateField } from "@/ds/ui/date-field";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/ds/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/ds/ui/field";
import { Input } from "@/ds/ui/input";
import { NumberField } from "@/ds/ui/number-field";
import { Progress } from "@/ds/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select";
import { Separator } from "@/ds/ui/separator";
import { Textarea } from "@/ds/ui/textarea";
import { Tabs, TabsTrigger, ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";
import { cn } from "@/ds/lib/utils";
import { formatCurrencyDecimal, getCurrencySymbol } from "@utils/currency";
import { getBillingTaxRates } from "@services/billingConfig";
import { sectionLabel } from "@pages/billing/configure/TaxRateSections";
import type {
    RaiseBillInput, RecordPaymentInput, SplitPaymentInput, PaymentMethod, BillOnRow,
    SettlementLine as BillSettlementLine,
} from "@services/bills";
import {
    allocateAcrossStages, allocatePayment, amountPerPercentOf, roundMoney, METHOD_DETAILS, paymentDetailsFor, type BillableStage,
} from "./projectBillingRules";

/**
 * The dialogs the Billing tab writes through: raise a bill, record a payment, split one payment across bills.
 *
 * Both show their arithmetic as you type. A bill is the first thing a client
 * sees, and "what will they actually pay after TDS" is the question the person
 * raising it is holding in their head — answering it in the form is cheaper than
 * answering it in a support call.
 */

const TAX_RATES_KEY = ["billing-tax-rates"];

/** Cached across both dialogs and every project — these change a few times a year. */
const useTaxRates = () =>
    useQuery({ queryKey: TAX_RATES_KEY, queryFn: getBillingTaxRates, staleTime: 5 * 60 * 1000 });

/** A calendar day, no time zone — the kit's date fields take these; the API takes `toString()`. */
const today = () => todayIn(getLocalTimeZone());

/** Base UI Select has no empty value; this stands for "none" (No GST / No TDS). */
const NONE = "__none__";

const Line: React.FC<{ label: string; value: string; strong?: boolean; accent?: boolean }> = ({
    label, value, strong, accent,
}) => (
    <div className="flex items-baseline justify-between gap-3 py-1">
        <span className={cn("text-[13px] text-muted-foreground", strong && "font-semibold")}>{label}</span>
        <span className={cn(
            "tabular-nums",
            strong ? "text-[15px] font-bold" : "text-[13.5px] font-semibold",
            accent ? "text-primary" : "text-foreground",
        )}>
            {value}
        </span>
    </div>
);

/** Inset panel the running totals sit in. */
const Breakdown: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-border">{children}</div>
);

/**
 * Where a bill stands before money is recorded against it: the three figures side by side (what is still pending is
 * the one the eye lands on), then how much of the bill is already in, as a bar. Stacks on a phone.
 */
const SettlementSummary: React.FC<{ total: number; received: number; pending: number }> = ({ total, received, pending }) => {
    const pct = total > 0 ? Math.min(100, Math.max(0, (received / total) * 100)) : 0;
    const settled = pending <= 0.004;
    const figure = (label: string, value: number, tone: "plain" | "good" | "due") => (
        <div className={cn("flex min-w-0 flex-col gap-0.5 px-4 py-3", tone === "due" && "bg-primary/[0.06]")}>
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
            <span
                className={cn(
                    "truncate tabular-nums",
                    tone === "due" ? "text-lg font-bold text-primary" : "text-[15px] font-semibold text-foreground",
                    tone === "good" && value > 0 && "text-emerald-600 dark:text-emerald-400",
                )}
            >
                {formatCurrencyDecimal(value)}
            </span>
        </div>
    );
    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-border">
            <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {figure("Bill value", total, "plain")}
                {figure("Received", received, "good")}
                {figure(settled ? "Settled" : "Pending", pending, settled ? "good" : "due")}
            </div>
            <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-4 py-2.5">
                <Progress
                    value={pct}
                    aria-label="Share of the bill received"
                    className="min-w-0 flex-1 [&_[data-slot=progress-indicator]]:bg-emerald-500 [&_[data-slot=progress-track]]:h-1.5"
                />
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {settled ? "Fully received" : `${Math.round(pct)}% received`}
                </span>
            </div>
        </div>
    );
};

/**
 * A titled step inside a dialog: heading + action on one line, the help full width under them, then the fields.
 * The heading is a <p>, not an <h3>: Metronic's unlayered `h3` rule outranks Tailwind's layered `text-sm`.
 */
const DialogSection: React.FC<{ title: string; hint?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({
    title, hint, action, children,
}) => (
    <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
            <div className="flex min-h-8 items-center justify-between gap-3">
                <p role="heading" aria-level={3} className="m-0 text-sm font-semibold text-foreground">{title}</p>
                {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
            </div>
            {hint && <p className="m-0 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {children}
    </section>
);

/** Label + kit Select, the trigger showing the option's label rather than its value. */
const SelectField: React.FC<{
    label: string;
    hint?: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}> = ({ label, hint, value, options, onChange }) => (
    <Field className="gap-1.5">
        <FieldLabel>{label}</FieldLabel>
        <Select items={options} value={value} onValueChange={(v) => onChange(String(v))}>
            <SelectTrigger className="w-full" aria-label={label}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
        {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
);

// ─── raise a bill ────────────────────────────────────────────────────────────

const MONEY_FORMAT: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const PERCENT_FORMAT: Intl.NumberFormatOptions = { style: "unit", unit: "percent", maximumFractionDigits: 2 };

/** A money field with the branch's currency symbol inside it, so the figure reads as money. */
const MoneyField: React.FC<React.ComponentProps<typeof NumberField>> = ({ className, inputClassName, ...props }) => (
    <div className={cn("relative", className)}>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-sm text-muted-foreground">
            {getCurrencySymbol()}
        </span>
        <NumberField {...props} steppers={false} inputClassName={cn("pl-7", inputClassName)} formatOptions={MONEY_FORMAT} />
    </div>
);

/**
 * One stage on the bill: tick it in or out, then set how much to bill on it — in money or as a share of the contract,
 * whichever is easier; the two are linked and capped at what is left on the stage.
 */
const StageLine: React.FC<{
    stage: BillableStage;
    perPercent: number;
    value: number | undefined;
    onToggle: (on: boolean) => void;
    onChange: (value: number) => void;
}> = ({ stage, perPercent, value, onToggle, onChange }) => {
    const on = value !== undefined;
    const toPct = (amount: number) => (perPercent > 0 ? Math.round((amount / perPercent) * 100) / 100 : 0);
    const setAmount = (v: number) => onChange(Number.isFinite(v) ? Math.min(roundMoney(v), stage.left) : 0);
    const setPct = (p: number) => onChange(Number.isFinite(p) ? Math.min(roundMoney(p * perPercent), stage.left) : 0);
    return (
        <div
            className={cn(
                // Checkbox | name over its figures; once ticked, the amount and share sit on their own line beneath.
                "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 rounded-xl px-3 py-2.5 ring-1 transition-colors",
                on ? "bg-primary/5 ring-primary/40" : "ring-border",
            )}
        >
            <Checkbox
                id={`bill-stage-${stage.stageId}`}
                checked={on}
                onCheckedChange={(checked) => onToggle(Boolean(checked))}
            />
            <label htmlFor={`bill-stage-${stage.stageId}`} className="min-w-0 cursor-pointer">
                <span className="block text-sm leading-snug font-semibold text-foreground">{stage.stageName}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                    {/* What the stage is worth; only a stage already billed in part says what remains. */}
                    {stage.stageShare}% · {stage.left < stage.stageAmount - 0.004
                        ? `${formatCurrencyDecimal(stage.left)} still to bill (of ${formatCurrencyDecimal(stage.stageAmount)})`
                        : formatCurrencyDecimal(stage.stageAmount)}
                </span>
            </label>
            {on && (
                <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Amount</span>
                        <MoneyField
                            aria-label={`${stage.stageName} amount`}
                            className="min-w-0 flex-1 sm:max-w-48"
                            inputClassName="text-right font-semibold"
                            minValue={0}
                            maxValue={stage.left}
                            value={value}
                            onChange={setAmount}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Share</span>
                        <NumberField
                            aria-label={`${stage.stageName} share of the contract`}
                            className="w-24"
                            steppers={false}
                            inputClassName="text-right font-semibold"
                            minValue={0}
                            maxValue={toPct(stage.left)}
                            value={value ? toPct(value) : NaN}
                            onChange={setPct}
                            formatOptions={PERCENT_FORMAT}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

type RaiseMode = "total" | "stages";

/**
 * Raise one bill, two ways — a pill switch picks which:
 *   • Bill a total — type an amount or a share of the contract and where to start; the split across stages is shown
 *     live, stage after stage, each taking what is left on it (skip Advance by starting from Design Concept).
 *   • Pick stages — tick any stages and set each one's amount or share yourself.
 * Switching carries the bill across, so a total can be fine-tuned stage by stage. One proforma, one GST and TDS rate.
 */
export const RaiseBillDialog: React.FC<{
    open: boolean;
    /** Every stage with value left to bill, in stage order. */
    stages: BillableStage[];
    /** The stage the dialog was opened from: where a total starts, and ticked in full when picking stages. */
    fromStageId: string | null;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (input: RaiseBillInput) => void;
}> = ({ open, stages, fromStageId, busy, onClose, onSubmit }) => {
    const { data: rates } = useTaxRates();
    const [gstSlabId, setGstSlabId] = useState(NONE);
    const [tdsSectionId, setTdsSectionId] = useState(NONE);
    const [billDate, setBillDate] = useState<CalendarDate | null>(today());
    const [termsDays, setTermsDays] = useState(30);
    const [remarks, setRemarks] = useState("");
    const [asDraft, setAsDraft] = useState(false);
    const [mode, setMode] = useState<RaiseMode>("total");
    /** "Bill a total": the amount, and the stage it starts filling from. */
    const [total, setTotal] = useState<number>(NaN);
    const [startId, setStartId] = useState<string>("");
    /** "Pick stages": amount per ticked stage. */
    const [picked, setPicked] = useState<Record<string, number>>({});

    // Re-seed each time the dialog opens: the configured default rates, and the stage it was opened from, in full.
    React.useEffect(() => {
        if (!open || !rates) return;
        setGstSlabId(rates.gstSlabs.find((s) => s.isDefault && s.isActive)?.id ?? NONE);
        setTdsSectionId(rates.tdsSections.find((s) => s.isDefault && s.isActive)?.id ?? NONE);
        setBillDate(today());
        setTermsDays(30);
        setRemarks("");
        setAsDraft(false);
        setMode("total");
        const from = stages.find((s) => s.stageId === fromStageId) ?? stages[0];
        setStartId(from?.stageId ?? "");
        setTotal(from?.left ?? NaN);
        setPicked(from ? { [from.stageId]: from.left } : {});
    }, [open, rates, fromStageId, stages]);

    const gstSlabs = useMemo(() => (rates?.gstSlabs ?? []).filter((s) => s.isActive), [rates]);
    const tdsSections = useMemo(() => (rates?.tdsSections ?? []).filter((s) => s.isActive), [rates]);

    const gstRate = gstSlabs.find((s) => s.id === gstSlabId)?.rate ?? 0;
    const tdsRate = tdsSections.find((s) => s.id === tdsSectionId)?.rate ?? 0;
    const tdsSectionLabel = sectionLabel(tdsSections.find((s) => s.id === tdsSectionId)?.section);

    const perPercent = amountPerPercentOf(stages);
    const toPct = (value: number) => (perPercent > 0 ? Math.round((value / perPercent) * 100) / 100 : 0);
    const maxTotal = roundMoney(stages.reduce((sum, s) => sum + s.left, 0));

    // What the bill holds, per stage — from whichever way it is being set.
    const split: Record<string, number> = mode === "total"
        ? (Number.isFinite(total) && total > 0 ? allocateAcrossStages(stages, startId, Math.min(total, maxTotal)) : {})
        : picked;
    const lines = stages.filter((s) => (split[s.stageId] ?? 0) > 0);
    const amount = roundMoney(lines.reduce((sum, s) => sum + split[s.stageId], 0));

    const switchMode = (next: RaiseMode) => {
        if (next === mode) return;
        // Carry the bill across, so either way can finish what the other started.
        if (next === "stages") setPicked(split);
        else {
            setTotal(amount > 0 ? amount : NaN);
            if (lines[0]) setStartId(lines[0].stageId);
        }
        setMode(next);
    };

    // Mirrors `computeBillMoney` on the server, on the bill's total: the server stays the one that decides what is stored.
    const gstAmount = roundMoney((amount * gstRate) / 100);
    const tdsAmount = roundMoney((amount * tdsRate) / 100);
    const totalAmount = roundMoney(amount + gstAmount);
    const expected = roundMoney(totalAmount - tdsAmount);

    const gstOptions = useMemo(() => [
        { value: NONE, label: "No GST" },
        ...gstSlabs.map((s) => ({ value: s.id, label: s.name })),
    ], [gstSlabs]);

    const tdsOptions = useMemo(() => [
        { value: NONE, label: "No TDS" },
        ...tdsSections.map((s) => {
            const sec = sectionLabel(s.section);
            return { value: s.id, label: sec ? `${s.name} (${sec} · ${s.rate}%)` : `${s.name} (${s.rate}%)` };
        }),
    ], [tdsSections]);

    const startOptions = useMemo(
        () => stages.map((s) => ({ value: s.stageId, label: s.stageName })),
        [stages],
    );

    if (!stages.length) return null;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="items-start text-left">
                    <DialogTitle className="text-lg font-semibold">Raise Proforma</DialogTitle>
                    <DialogDescription>
                        {lines.length === 0 ? "Choose what to bill"
                            : lines.length === 1 ? lines[0].stageName
                                : `${lines.length} stages · ${formatCurrencyDecimal(amount)}`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex min-w-0 flex-col gap-5">
                    <Tabs value={mode} onValueChange={(v) => switchMode(v as RaiseMode)}>
                        <ToggleList aria-label="How to bill" className="w-full">
                            <TabsTrigger value="total" className={cn(TOGGLE_TAB, "flex-1")}>Bill a total</TabsTrigger>
                            <TabsTrigger value="stages" className={cn(TOGGLE_TAB, "flex-1")}>Pick stages</TabsTrigger>
                        </ToggleList>
                    </Tabs>

                    {mode === "total" ? (
                        <div className="flex flex-col gap-4">
                            <div className="grid items-start gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                                <Field className="gap-1.5">
                                    <FieldLabel className="whitespace-nowrap">Amount</FieldLabel>
                                    <MoneyField
                                        aria-label="Amount to bill"
                                        inputClassName="text-right font-semibold"
                                        minValue={0}
                                        maxValue={maxTotal}
                                        value={total}
                                        onChange={(v) => setTotal(Number.isFinite(v) ? Math.min(roundMoney(v), maxTotal) : NaN)}
                                    />
                                </Field>
                                <Field className="gap-1.5">
                                    <FieldLabel className="whitespace-nowrap">% of Contract</FieldLabel>
                                    <NumberField
                                        aria-label="Share of the contract to bill"
                                        steppers={false}
                                        inputClassName="text-right font-semibold"
                                        minValue={0}
                                        maxValue={toPct(maxTotal)}
                                        value={total > 0 ? toPct(total) : NaN}
                                        onChange={(p) => setTotal(Number.isFinite(p) ? Math.min(roundMoney(p * perPercent), maxTotal) : NaN)}
                                        formatOptions={PERCENT_FORMAT}
                                    />
                                </Field>
                            </div>
                            <SelectField
                                label="Start from"
                                hint="Fills this stage first, then the ones after it"
                                value={startId}
                                options={startOptions}
                                onChange={setStartId}
                            />

                            {/* The split, live: what the bill will say, stage by stage. */}
                            <div className="rounded-xl ring-1 ring-border">
                                <p className="m-0 border-b border-border px-4 py-2.5 text-[13px] font-semibold text-muted-foreground">
                                    This bill will cover
                                </p>
                                {lines.length === 0 ? (
                                    <p className="m-0 px-4 py-3 text-sm text-muted-foreground">Enter an amount or a share to see the split.</p>
                                ) : (
                                    <ul className="m-0 list-none divide-y divide-border p-0">
                                        {lines.map((s) => {
                                            const value = split[s.stageId];
                                            const partial = value < s.left - 0.004;
                                            return (
                                                <li key={s.stageId} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                                                    <span className="min-w-0">
                                                        <span className="block text-sm font-semibold text-foreground">{s.stageName}</span>
                                                        {partial && (
                                                            <span className="block text-xs text-muted-foreground tabular-nums">
                                                                Part of it — {formatCurrencyDecimal(roundMoney(s.left - value))} stays to bill
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="shrink-0 text-right tabular-nums">
                                                        <span className="block text-sm font-semibold text-foreground">{formatCurrencyDecimal(value)}</span>
                                                        <span className="block text-xs text-muted-foreground">{toPct(value)}%</span>
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                            <p className="m-0 -mt-2 text-xs text-muted-foreground tabular-nums">
                                Up to {formatCurrencyDecimal(maxTotal)} ({toPct(maxTotal)}% of the contract) is left to bill.
                            </p>
                        </div>
                    ) : (
                        <div className="flex min-w-0 flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="m-0 text-sm text-muted-foreground">Tick the stages and set each amount or share.</p>
                                {Object.keys(picked).length > 0 && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setPicked({})}>Clear all</Button>
                                )}
                            </div>
                            {stages.map((stage) => (
                                <StageLine
                                    key={stage.stageId}
                                    stage={stage}
                                    perPercent={perPercent}
                                    value={picked[stage.stageId]}
                                    onToggle={(on) => setPicked((prev) => {
                                        const next = { ...prev };
                                        if (on) next[stage.stageId] = stage.left;
                                        else delete next[stage.stageId];
                                        return next;
                                    })}
                                    onChange={(v) => setPicked((prev) => ({ ...prev, [stage.stageId]: v }))}
                                />
                            ))}
                            <div className="flex items-baseline justify-between gap-3 px-1 pt-1 tabular-nums">
                                <span className="text-sm font-semibold text-muted-foreground">Total</span>
                                <span>
                                    <span className="text-base font-bold text-foreground">{formatCurrencyDecimal(amount)}</span>
                                    <span className="ml-2 text-sm text-muted-foreground">{toPct(amount)}% of the contract</span>
                                </span>
                            </div>
                        </div>
                    )}

                    <Separator />

                    <SelectField
                        label="GST Slab"
                        hint="Charged on top of the bill amount"
                        value={gstSlabId}
                        options={gstOptions}
                        onChange={setGstSlabId}
                    />
                    <SelectField
                        label="TDS Section"
                        hint="Deducted by the client from what they transfer"
                        value={tdsSectionId}
                        options={tdsOptions}
                        onChange={setTdsSectionId}
                    />

                    <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                        <DateField label="Bill Date" value={billDate} onChange={setBillDate} isRequired />
                        <NumberField
                            label="Payment Terms (Days)"
                            minValue={0}
                            value={termsDays}
                            onChange={(v) => setTermsDays(Number.isFinite(v) ? Math.max(0, v) : 0)}
                        />
                    </div>

                    <Field className="gap-1.5">
                        <FieldLabel htmlFor="raise-bill-remarks">Remarks</FieldLabel>
                        <Textarea
                            id="raise-bill-remarks"
                            rows={2}
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Optional remarks on this proforma/bill"
                        />
                    </Field>

                    <Breakdown>
                        <Line label="Bill Amount" value={formatCurrencyDecimal(amount)} />
                        <Line label={`GST (${gstRate}%)`} value={formatCurrencyDecimal(gstAmount)} />
                        <Line label="Bill Total" value={formatCurrencyDecimal(totalAmount)} strong />
                        <Line
                            label={`Less TDS (${tdsRate}%)${tdsSectionLabel ? ` · ${tdsSectionLabel}` : ""}`}
                            value={`− ${formatCurrencyDecimal(tdsAmount)}`}
                        />
                        <Separator className="my-2" />
                        <Line label="Client Will Pay" value={formatCurrencyDecimal(expected)} strong accent />
                    </Breakdown>

                    <Field orientation="horizontal" className="items-center gap-2.5">
                        <Checkbox
                            id="raise-bill-draft"
                            checked={asDraft}
                            onCheckedChange={(checked) => setAsDraft(Boolean(checked))}
                        />
                        <FieldLabel htmlFor="raise-bill-draft" className="font-normal">
                            Save as draft — do not send the proforma yet
                        </FieldLabel>
                    </Field>
                </div>

                <DialogFooter className="sm:justify-end sm:*:flex-none">
                    <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button
                        loading={busy}
                        disabled={amount <= 0 || !billDate}
                        onClick={() =>
                            billDate && onSubmit({
                                lines: lines.map((s) => ({ stageId: s.stageId, amount: split[s.stageId] })),
                                gstSlabId: gstSlabId === NONE ? null : gstSlabId,
                                tdsSectionId: tdsSectionId === NONE ? null : tdsSectionId,
                                billDate: billDate.toString(),
                                paymentTermsDays: termsDays,
                                remarks: remarks.trim() || null,
                                asDraft,
                            })
                        }
                    >
                        {asDraft ? "Save Draft" : "Raise Proforma"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── record a payment ────────────────────────────────────────────────────────

const METHODS: PaymentMethod[] = [
    "NEFT", "RTGS", "IMPS", "UPI", "BANK_TRANSFER", "CHEQUE", "CASH", "ONLINE", "OTHER",
];

const METHOD_OPTIONS = METHODS.map((m) => ({ value: m, label: m.replace(/_/g, " ") }));

/** Method, then only the details that method needs (see METHOD_DETAILS) — shared by both payment dialogs. */
const MethodFields: React.FC<{
    idPrefix: string;
    method: PaymentMethod;
    onMethod: (m: PaymentMethod) => void;
    reference: string;
    onReference: (v: string) => void;
    bankName: string;
    onBank: (v: string) => void;
}> = ({ idPrefix, method, onMethod, reference, onReference, bankName, onBank }) => {
    const { reference: ref, bank } = METHOD_DETAILS[method];
    return (
        <>
            <SelectField label="Method" value={method} options={METHOD_OPTIONS} onChange={(v) => onMethod(v as PaymentMethod)} />
            {ref && (
                <Field className="gap-1.5">
                    <FieldLabel htmlFor={`${idPrefix}-reference`}>{ref.label}</FieldLabel>
                    <Input id={`${idPrefix}-reference`} value={reference} onChange={(e) => onReference(e.target.value)} placeholder={ref.placeholder} />
                </Field>
            )}
            {bank && (
                <Field className="gap-1.5">
                    <FieldLabel htmlFor={`${idPrefix}-bank`}>{bank.label}</FieldLabel>
                    <Input id={`${idPrefix}-bank`} value={bankName} onChange={(e) => onBank(e.target.value)} placeholder={bank.placeholder} />
                </Field>
            )}
        </>
    );
};

type ComponentKey = "basic" | "gst" | "tds";

const COMPONENT_LABEL: Record<ComponentKey, string> = { basic: "Bill Amount", gst: "GST", tds: "TDS" };

/** One of the bill's three amounts: what it is, what has come in, and how much to record now. */
const ComponentRow: React.FC<{
    label: string;
    line: BillSettlementLine;
    value: number;
    onChange: (value: number) => void;
}> = ({ label, line, value, onChange }) => {
    const done = line.pending <= 0;
    const over = Number.isFinite(value) && value > line.pending + 0.004;
    return (
        <div className="flex flex-col gap-2 rounded-2xl p-3 ring-1 ring-border sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    {done && <Badge variant="success" dot>Received</Badge>}
                </div>
                {!done && (
                    <p className="m-0 mt-1 text-sm font-semibold text-foreground tabular-nums">
                        {formatCurrencyDecimal(line.pending)} <span className="text-xs font-normal text-muted-foreground">pending</span>
                    </p>
                )}
            </div>
            <div className="flex shrink-0 items-start gap-2 sm:w-64">
                <NumberField
                    aria-label={`${label} received now`}
                    className="min-w-0 flex-1"
                    minValue={0}
                    value={value}
                    onChange={onChange}
                    isDisabled={done}
                    isInvalid={over}
                    errorMessage={`Only ${formatCurrencyDecimal(line.pending)} is pending`}
                    placeholder={done ? "Received" : "0.00"}
                    formatOptions={{ maximumFractionDigits: 2 }}
                />
                <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={done}
                    onClick={() => onChange(line.pending)}
                    title={`Record all of the pending ${label}`}
                >
                    Full
                </Button>
            </div>
        </div>
    );
};

export const RecordPaymentDialog: React.FC<{
    open: boolean;
    bill: BillOnRow | null;
    stageName?: string;
    busy?: boolean;
    onClose: () => void;
    onSubmit: (input: RecordPaymentInput) => void;
    /** Set when other bills are open too: the client may have paid several at once. */
    onSplit?: () => void;
}> = ({ open, bill, stageName, busy, onClose, onSubmit, onSplit }) => {
    const [amounts, setAmounts] = useState<Record<ComponentKey, number>>({ basic: NaN, gst: NaN, tds: NaN });
    const [paymentDate, setPaymentDate] = useState<CalendarDate | null>(today());
    const [method, setMethod] = useState<PaymentMethod>("NEFT");
    const [reference, setReference] = useState("");
    const [bankName, setBankName] = useState("");

    // Opens empty: what was received, and against which amount, is the person's call.
    React.useEffect(() => {
        if (!open || !bill) return;
        setAmounts({ basic: NaN, gst: NaN, tds: NaN });
        setPaymentDate(today());
        setMethod("NEFT");
        setReference("");
        setBankName("");
    }, [open, bill]);

    if (!bill) return null;

    const { settlement } = bill;
    const lines: Array<{ key: ComponentKey; line: BillSettlementLine }> = [
        { key: "basic", line: settlement.basic },
        { key: "gst", line: settlement.gst },
        ...(settlement.tds ? [{ key: "tds" as const, line: settlement.tds }] : []),
    ];

    const entered = lines.filter(({ key }) => Number.isFinite(amounts[key]) && amounts[key] > 0);
    const recording = entered.reduce((sum, { key }) => sum + amounts[key], 0);
    const tooMuch = entered.some(({ key, line }) => amounts[key] > line.pending + 0.004);
    const maxDate = today();
    const dateValid = !!paymentDate && paymentDate.compare(maxDate) <= 0;
    const valid = entered.length > 0 && !tooMuch && dateValid;
    const anyPending = lines.some(({ line }) => line.pending > 0);

    const fillAll = () =>
        setAmounts({
            basic: settlement.basic.pending > 0 ? settlement.basic.pending : NaN,
            gst: settlement.gst.pending > 0 ? settlement.gst.pending : NaN,
            tds: settlement.tds && settlement.tds.pending > 0 ? settlement.tds.pending : NaN,
        });

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="items-start text-left">
                    <DialogTitle className="text-lg font-semibold">Record Payment</DialogTitle>
                    <DialogDescription>{bill.billNumber}{stageName ? ` · ${stageName}` : ""}</DialogDescription>
                </DialogHeader>

                <SettlementSummary total={settlement.total} received={settlement.received} pending={settlement.pending} />

                <DialogSection
                    title="Amount received"
                    hint="Type how much the client paid for this bill. Full or part payment is fine."
                    action={anyPending && (
                        <Button type="button" variant="outline" size="sm" onClick={fillAll}>Paid in full</Button>
                    )}
                >
                    {lines.map(({ key, line }) => (
                        <ComponentRow
                            key={key}
                            label={COMPONENT_LABEL[key]}
                            line={line}
                            value={amounts[key]}
                            onChange={(v) => setAmounts((prev) => ({ ...prev, [key]: v }))}
                        />
                    ))}
                </DialogSection>

                {/* A different job from the form above (one payment over several bills), so it gets its own box and a real button. */}
                {onSplit && (
                    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-3.5 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                            <p className="m-0 text-sm font-semibold text-foreground">Paid more than one bill together?</p>
                            <p className="m-0 text-xs text-muted-foreground">Record one payment and share it across the client's open bills.</p>
                        </div>
                        <Button type="button" variant="outline" className="shrink-0" onClick={onSplit}>
                            Split payment
                        </Button>
                    </div>
                )}

                <DialogSection title="Payment details" hint="When and how the money came in.">
                    <DateField
                        label="Payment Date"
                        isRequired
                        value={paymentDate}
                        onChange={setPaymentDate}
                        maxValue={maxDate}
                    />
                    <MethodFields
                        idPrefix="payment" method={method} onMethod={setMethod}
                        reference={reference} onReference={setReference} bankName={bankName} onBank={setBankName}
                    />
                </DialogSection>

                <DialogFooter className="items-center sm:justify-between">
                    <p className="m-0 text-sm text-muted-foreground tabular-nums">
                        {recording > 0 ? <>Recording <span className="font-bold text-foreground">{formatCurrencyDecimal(recording)}</span></> : "Nothing entered yet"}
                    </p>
                    <div className="flex gap-2 sm:*:flex-none">
                        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                        <Button
                            loading={busy}
                            disabled={!valid}
                            onClick={() =>
                                paymentDate && onSubmit({
                                    components: Object.fromEntries(entered.map(({ key }) => [key, amounts[key]])),
                                    paymentDate: paymentDate.toString(),
                                    method,
                                    ...paymentDetailsFor(method, reference, bankName),
                                })
                            }
                        >
                            Record Payment
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// ─── one payment over several bills ──────────────────────────────────────────

/** A bill the payment can go to, with how it reads in the list. */
export interface PayableBill { bill: BillOnRow; label: string }

type Share = { basic: number; gst: number };

/** One bill in the split: its pending Bill Amount and GST, and how much of this payment each takes. */
const SplitRow: React.FC<{
    item: PayableBill;
    share: Share | undefined;
    onChange: (share: Share) => void;
}> = ({ item, share, onChange }) => {
    const { basic, gst } = item.bill.settlement;
    const value = share ?? { basic: NaN, gst: NaN };
    const set = (key: keyof Share, v: number) => onChange({ ...{ basic: 0, gst: 0 }, ...share, [key]: Number.isFinite(v) ? v : 0 });
    const taking = roundMoney((Number.isFinite(value.basic) ? value.basic : 0) + (Number.isFinite(value.gst) ? value.gst : 0));
    const pendingTotal = roundMoney(basic.pending + gst.pending);

    const field = (key: keyof Share, label: string, pending: number) => {
        const done = pending <= 0;
        const over = Number.isFinite(value[key]) && value[key] > pending + 0.004;
        return (
            <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    <span className="truncate text-[11px] text-muted-foreground tabular-nums">
                        {done ? "Fully received" : `${formatCurrencyDecimal(pending)} pending`}
                    </span>
                </div>
                {done ? (
                    // Nothing left to take: say so, rather than a greyed input that looks broken.
                    <div className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <span aria-hidden>✓</span> Received
                    </div>
                ) : (
                    <div className="flex items-start gap-1.5">
                        <NumberField
                            aria-label={`${item.bill.billNumber} ${label}`}
                            className="min-w-0 flex-1"
                            minValue={0}
                            value={value[key]}
                            onChange={(v) => set(key, v)}
                            isInvalid={over}
                            errorMessage={`Only ${formatCurrencyDecimal(pending)} is pending`}
                            placeholder="0.00"
                            formatOptions={{ maximumFractionDigits: 2 }}
                        />
                        <Button
                            type="button" variant="outline" className="shrink-0"
                            onClick={() => set(key, pending)}
                            title={`Pay the full ${label}`}
                        >
                            Full
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={cn(
            "flex min-w-0 flex-col gap-3 rounded-2xl p-3.5 ring-1 transition-shadow",
            taking > 0 ? "bg-primary/[0.03] ring-primary/40" : "ring-border",
        )}>
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-foreground">{item.bill.billNumber}</p>
                    {/* Stage names run long ("Advance (…) + Design Concept (Part 1)"): two lines, then the full text on hover. */}
                    <p className="m-0 line-clamp-2 text-xs text-muted-foreground" title={item.label}>{item.label}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                    <span className="text-[11px] text-muted-foreground">Pending</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrencyDecimal(pendingTotal)}</span>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {field("basic", "Bill Amount", basic.pending)}
                {field("gst", "GST", gst.pending)}
            </div>
            {taking > 0 && (
                <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
                    <span className="text-muted-foreground">Paying now</span>
                    <span className="font-semibold text-primary tabular-nums">{formatCurrencyDecimal(taking)}</span>
                </div>
            )}
        </div>
    );
};

/** Received vs shared out: what is left to place, as figures and a bar. Turns red when the shares exceed the payment. */
const AllocationMeter: React.FC<{ received: number; allocated: number }> = ({ received, allocated }) => {
    const left = roundMoney(received - allocated);
    const over = left < -0.004;
    const exact = Math.abs(left) <= 0.004;
    const pct = received > 0 ? Math.min(100, (allocated / received) * 100) : 0;
    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-border">
            <div className="grid grid-cols-3 divide-x divide-border">
                {[
                    { label: "Received", value: received, cls: "text-foreground" },
                    { label: "Used", value: allocated, cls: "text-foreground" },
                    {
                        label: over ? "Too much by" : "Left",
                        value: Math.abs(left),
                        cls: over ? "text-destructive" : exact ? "text-emerald-600 dark:text-emerald-400" : "text-primary",
                    },
                ].map(({ label, value, cls }) => (
                    <div key={label} className="flex min-w-0 flex-col gap-0.5 px-3 py-2.5">
                        <span className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
                        <span className={cn("truncate text-sm font-semibold tabular-nums", cls)}>{formatCurrencyDecimal(value)}</span>
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-3 py-2">
                <Progress
                    value={pct}
                    aria-label="Share of the payment placed on bills"
                    className={cn(
                        "min-w-0 flex-1 [&_[data-slot=progress-track]]:h-1.5",
                        over ? "[&_[data-slot=progress-indicator]]:bg-destructive" : exact ? "[&_[data-slot=progress-indicator]]:bg-emerald-500" : "",
                    )}
                />
                <span className={cn("shrink-0 text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
                    {over ? "More than received" : exact ? "All used" : `${Math.round(pct)}% used`}
                </span>
            </div>
        </div>
    );
};

/**
 * One payment from the client shared across several of its bills. Type what arrived and it fills the oldest bills
 * first — each one's Bill Amount, then its GST — or set each share by hand. Recorded all together or not at all.
 */
export const SplitPaymentDialog: React.FC<{
    open: boolean;
    /** Bills with money still pending, oldest first. */
    bills: PayableBill[];
    busy?: boolean;
    onClose: () => void;
    onSubmit: (input: SplitPaymentInput) => void;
}> = ({ open, bills, busy, onClose, onSubmit }) => {
    const [received, setReceived] = useState<number>(NaN);
    const [shares, setShares] = useState<Record<string, Share>>({});
    const [paymentDate, setPaymentDate] = useState<CalendarDate | null>(today());
    const [method, setMethod] = useState<PaymentMethod>("NEFT");
    const [reference, setReference] = useState("");
    const [bankName, setBankName] = useState("");

    React.useEffect(() => {
        if (!open) return;
        setReceived(NaN);
        setShares({});
        setPaymentDate(today());
        setMethod("NEFT");
        setReference("");
        setBankName("");
    }, [open]);

    const fill = (total: number) => {
        setReceived(total);
        setShares(Number.isFinite(total) && total > 0
            ? allocatePayment(
                bills.map(({ bill }) => ({ id: bill.id, basicPending: bill.settlement.basic.pending, gstPending: bill.settlement.gst.pending })),
                total,
            )
            : {});
    };

    const allocations = bills
        .map(({ bill }) => ({ bill, share: shares[bill.id] }))
        .filter(({ share }) => share && ((share.basic || 0) > 0 || (share.gst || 0) > 0));
    const allocated = roundMoney(allocations.reduce((sum, { share }) => sum + (share!.basic || 0) + (share!.gst || 0), 0));
    const tooMuch = allocations.some(({ bill, share }) =>
        (share!.basic || 0) > bill.settlement.basic.pending + 0.004 || (share!.gst || 0) > bill.settlement.gst.pending + 0.004);
    const unallocated = Number.isFinite(received) ? roundMoney(received - allocated) : 0;
    const openTotal = roundMoney(bills.reduce((sum, { bill }) => sum + bill.settlement.basic.pending + bill.settlement.gst.pending, 0));
    const maxDate = today();
    const dateValid = !!paymentDate && paymentDate.compare(maxDate) <= 0;
    const valid = allocations.length > 0 && !tooMuch && dateValid;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="items-start text-left">
                    <DialogTitle className="text-lg font-semibold">Split a Payment Across Bills</DialogTitle>
                    <DialogDescription>One transfer from the client, shared across its open bills</DialogDescription>
                </DialogHeader>

                <DialogSection
                    title="Amount received"
                    hint={`${formatCurrencyDecimal(openTotal)} is pending on ${bills.length} bill${bills.length === 1 ? "" : "s"}. The oldest bill is paid first.`}
                    action={openTotal > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => fill(openTotal)}>Paid in full</Button>
                    )}
                >
                    <NumberField
                        aria-label="Amount received"
                        minValue={0}
                        value={received}
                        onChange={fill}
                        placeholder="0.00"
                        formatOptions={{ maximumFractionDigits: 2 }}
                    />
                    {Number.isFinite(received) && received > 0 && <AllocationMeter received={received} allocated={allocated} />}
                </DialogSection>

                <DialogSection
                    title="Bills"
                    hint="Change any amount if needed."
                    action={
                        <>
                            {Number.isFinite(received) && received > 0 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => fill(received)}>Auto-fill</Button>
                            )}
                            {allocated > 0 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShares({})}>Clear</Button>
                            )}
                        </>
                    }
                >
                    <div className="flex flex-col gap-2.5">
                        {bills.map((item) => (
                            <SplitRow
                                key={item.bill.id}
                                item={item}
                                share={shares[item.bill.id]}
                                onChange={(share) => setShares((prev) => ({ ...prev, [item.bill.id]: share }))}
                            />
                        ))}
                    </div>
                </DialogSection>


                <DialogSection title="Payment details" hint="When and how the money came in.">
                    <DateField label="Payment Date" isRequired value={paymentDate} onChange={setPaymentDate} maxValue={maxDate} />
                    <MethodFields
                        idPrefix="split" method={method} onMethod={setMethod}
                        reference={reference} onReference={setReference} bankName={bankName} onBank={setBankName}
                    />
                </DialogSection>

                <DialogFooter className="items-center sm:justify-between">
                    <p className="m-0 text-sm text-muted-foreground tabular-nums">
                        {allocated > 0
                            ? <>Recording <span className="font-bold text-foreground">{formatCurrencyDecimal(allocated)}</span> across {allocations.length} bill{allocations.length === 1 ? "" : "s"}</>
                            : "Nothing allocated yet"}
                    </p>
                    <div className="flex gap-2 sm:*:flex-none">
                        <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
                        <Button
                            loading={busy}
                            disabled={!valid || unallocated < -0.004}
                            onClick={() =>
                                paymentDate && onSubmit({
                                    allocations: allocations.map(({ bill, share }) => ({
                                        billId: bill.id,
                                        components: {
                                            ...((share!.basic || 0) > 0 ? { basic: share!.basic } : {}),
                                            ...((share!.gst || 0) > 0 ? { gst: share!.gst } : {}),
                                        },
                                    })),
                                    paymentDate: paymentDate.toString(),
                                    method,
                                    ...paymentDetailsFor(method, reference, bankName),
                                })
                            }
                        >
                            Record Payment
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
