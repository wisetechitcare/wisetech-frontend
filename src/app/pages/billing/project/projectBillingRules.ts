import type React from "react";
import type {
    BillOnRow, BillSettlement, BillSlice, DocumentStatus, PaymentComponent, PaymentMethod, ProjectBillingRow, SettlementLine, SettlementTone,
} from "@services/bills";

/**
 * What a payment's details form asks for, per method. Cash has no reference and no bank; a cheque has a number and
 * is drawn on a bank; a bank transfer has a UTR and a bank; UPI and online payments have a transaction id and no
 * bank worth recording. `null` = the field is not shown (and is never sent).
 */
export interface MethodDetails {
    reference: { label: string; placeholder: string } | null;
    bank: { label: string; placeholder: string } | null;
}

const BANK = { label: "Bank", placeholder: "e.g. HDFC Bank" };
const UTR = { label: "UTR No.", placeholder: "e.g. UTR12345678" };

export const METHOD_DETAILS: Record<PaymentMethod, MethodDetails> = {
    CASH: { reference: null, bank: null },
    CHEQUE: { reference: { label: "Cheque No.", placeholder: "e.g. 004512" }, bank: { label: "Drawn on (Bank)", placeholder: "e.g. HDFC Bank" } },
    NEFT: { reference: UTR, bank: BANK },
    RTGS: { reference: UTR, bank: BANK },
    IMPS: { reference: UTR, bank: BANK },
    BANK_TRANSFER: { reference: { label: "Transaction / UTR No.", placeholder: "e.g. UTR12345678" }, bank: BANK },
    UPI: { reference: { label: "UPI Transaction ID", placeholder: "e.g. 4231 5678 9012" }, bank: null },
    ONLINE: { reference: { label: "Transaction ID", placeholder: "e.g. TXN-20261113-001" }, bank: null },
    OTHER: { reference: { label: "Reference", placeholder: "Any reference worth keeping" }, bank: null },
};

/** The reference and bank to SAVE: a field the method does not ask for is dropped, even if it was typed before the method changed. */
export const paymentDetailsFor = (method: PaymentMethod, reference: string, bankName: string) => ({
    reference: METHOD_DETAILS[method].reference ? reference.trim() || null : null,
    bankName: METHOD_DETAILS[method].bank ? bankName.trim() || null : null,
});

/**
 * Project → Billing's rules: what a stage needs next, how it filters and sorts, and the figures and words it shows.
 * The company's billing vocabulary, identical to the Billing Tracker and the Invoice Tracker:
 *
 *   • Bill Amount — the basic amount MINUS the TDS withheld from it (the cash part).
 *   • GST         — with its rate. Bill Amount and GST are each Received / Awaited.
 *   • TDS         — withheld by the client; Deposited / Not deposited.
 *   • Bill Value  — basic + GST = Bill Amount + TDS + GST. The document's face value.
 *   • Pending     — what the client still has to transfer (Bill Value − TDS − received).
 */

export type BillingFilterTab = "ALL" | "NEEDS_ATTENTION" | "PENDING" | "PAID" | "DRAFT";
export type BillingSortOption = "STAGE" | "ATTENTION" | "DUE" | "PENDING" | "VALUE" | "WORK" | "RECENT";

/** A cancelled bill no longer counts — the stage is billable again. */
export const liveBill = (row: ProjectBillingRow) =>
    row.bill && row.bill.status !== "CANCELLED" ? row.bill : null;

const AWAITING_MONEY = ["PROFORMA", "AWAITING_PAYMENT", "PARTIALLY_PAID"];

type LiveBill = NonNullable<ProjectBillingRow["bill"]>;

/**
 * What can be done on a bill right now. Once the proforma is finalised, getting paid and raising the
 * bill (tax invoice) are INDEPENDENT: either can come first, or both, so each has its own flag.
 */
export const stepsOf = (bill: LiveBill) => {
    const issued = bill.status !== "DRAFT" && bill.status !== "CANCELLED";
    // A proforma is still to be created: a draft bill, or one still in progress that has lost its proforma (archived)
    // and has no tax invoice either. A settled bill with no documents (imported history) is left alone.
    const lostProforma = ["PROFORMA", "AWAITING_PAYMENT", "PARTIALLY_PAID"].includes(bill.status)
        && !bill.proformaDocumentId && !bill.invoiceDocumentId;
    // A proforma that was issued and then REVISED: its current version is a draft again (the repository's
    // `createRevision` writes DRAFT), while the bill stays issued. Until that revision is published, the client's
    // terms are in flux — so the only step is to finish it. No payment against it, no tax invoice from it.
    const revisingProforma = issued && !!bill.proformaDocumentId && bill.proformaStatus === "DRAFT";
    const proforma = bill.status === "DRAFT" || lostProforma || revisingProforma;
    // A bill that is waiting on its (new) proforma and has had no money yet starts there: paying and billing come after.
    const proformaFirst = (proforma && bill.receivedAmount === 0) || revisingProforma;
    return {
        proforma,
        /** The proforma is being revised: show "Edit proforma" alone. */
        revisingProforma,
        pay: issued && bill.outstandingAmount > 0 && !proformaFirst,
        /** No bill yet, or one still in draft. A finalised bill has nothing left to raise. */
        raiseBill: issued && !proformaFirst && !(bill.invoiceDocumentId && bill.invoiceStatus !== "DRAFT"),
    };
};

/**
 * Where a bill's proforma stands with the client, for the approval check before money is recorded or a tax invoice
 * raised against it:
 *
 *   APPROVED — the client accepted it (or there is nothing to approve: no proforma, imported history). Go ahead.
 *   PENDING  — issued but not answered (generated / sent / viewed). Ask "has the client approved it?" first.
 *   REJECTED — the client turned it down. Stop: it has to be revised, not paid.
 */
export type ProformaApproval = "APPROVED" | "PENDING" | "REJECTED";

export const proformaApprovalOf = (bill: Pick<LiveBill, "proformaVersionId" | "proformaVersionStatus">): ProformaApproval => {
    if (!bill.proformaVersionId) return "APPROVED";
    switch (bill.proformaVersionStatus) {
        case "GENERATED": case "SENT": case "VIEWED": return "PENDING";
        case "CLIENT_REJECTED": return "REJECTED";
        default: return "APPROVED";
    }
};

/** What, if anything, is waiting on us for this stage. Null when nothing is. */
export const attentionOf = (row: ProjectBillingRow):
    | "READY_TO_BILL" | "PROFORMA" | "PAYMENT" | "TAX_INVOICE" | null => {
    const bill = liveBill(row);
    // Billable any time, but only finished work is a reminder.
    if (!bill) return !row.blockReason && row.work.total > 0 && row.work.progress >= 100 ? "READY_TO_BILL" : null;
    const steps = stepsOf(bill);
    if (steps.proforma) return "PROFORMA";
    // Money first when both are open: it is the one with a due date.
    if (steps.pay) return "PAYMENT";
    if (steps.raiseBill) return "TAX_INVOICE";
    return null;
};

/** Filter tabs, as predicates. Each tab is one clear question. */
export const FILTERS: Record<BillingFilterTab, { label: string; match: (row: ProjectBillingRow) => boolean }> = {
    ALL: { label: "All", match: () => true },
    NEEDS_ATTENTION: { label: "Needs attention", match: (r) => attentionOf(r) !== null },
    PENDING: { label: "Payment pending", match: (r) => AWAITING_MONEY.includes(liveBill(r)?.status ?? "") },
    PAID: { label: "Paid", match: (r) => ["PAID", "INVOICED"].includes(liveBill(r)?.status ?? "") },
    DRAFT: {
        // A document someone started and has not finalised.
        label: "Draft",
        match: (r) => {
            const b = liveBill(r);
            return !!b && (b.status === "DRAFT" || b.proformaStatus === "DRAFT" || b.invoiceStatus === "DRAFT");
        },
    },
};

/** Invoice Tracker's "Bill Amount": the basic minus the TDS withheld from it. */
export const billAmountOf = (money: Pick<BillSlice, "amount" | "tdsAmount">) => Math.round((money.amount - money.tdsAmount) * 100) / 100;

/** The money a billed row shows: its slice of the bill (the whole bill when it covers one stage). */
const sliceOf = (row: ProjectBillingRow): BillSlice | null => (liveBill(row) ? row.slice : null);

export const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Column totals for the rows on screen. Unbilled stages count toward Bill Value and Pending. */
export const totalsOf = (rows: ProjectBillingRow[]) => {
    const totals = rows.reduce(
        (sum, row) => {
            const slice = sliceOf(row);
            if (slice) {
                sum.billAmount += billAmountOf(slice);
                sum.gst += slice.gstAmount;
                sum.tds += slice.tdsAmount;
                sum.billValue += slice.totalAmount;
                sum.pending += slice.outstandingAmount;
            } else {
                sum.billValue += row.amount;
                sum.pending += row.amount;
            }
            return sum;
        },
        { billAmount: 0, gst: 0, tds: 0, billValue: 0, pending: 0 },
    );
    return {
        billAmount: roundMoney(totals.billAmount),
        gst: roundMoney(totals.gst),
        tds: roundMoney(totals.tds),
        billValue: roundMoney(totals.billValue),
        pending: roundMoney(totals.pending),
    };
};

export const isOverdue = (bill: BillOnRow) =>
    bill.outstandingAmount > 0 && !!bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());

/** Latest dated thing that happened on a stage, for "Recent activity". */
const lastActivityOf = (row: ProjectBillingRow) => {
    const b = liveBill(row);
    const dates = [b?.billDate, b?.proformaDate, b?.invoiceDate, b?.tdsDepositedAt, ...row.deliverables.map((d) => d.completedAt)]
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime());
    return dates.length ? Math.max(...dates) : 0;
};

/** The Pending and Bill Value columns' figures — an unbilled stage counts its full amount. */
const pendingOf = (row: ProjectBillingRow) => sliceOf(row)?.outstandingAmount ?? row.amount;
const billValueOf = (row: ProjectBillingRow) => sliceOf(row)?.totalAmount ?? row.amount;

/** Overdue money first, then the billing pipeline in the order the work happens. */
const ATTENTION_RANK = { READY_TO_BILL: 1, PROFORMA: 2, PAYMENT: 3, TAX_INVOICE: 4 } as const;
const attentionRankOf = (row: ProjectBillingRow) => {
    const bill = liveBill(row);
    if (bill && isOverdue(bill)) return 0;
    const attention = attentionOf(row);
    return attention ? ATTENTION_RANK[attention] : 5;
};

/** Money still owed with a due date, soonest first; owed with no date next; settled or unbilled last. */
const dueRankOf = (row: ProjectBillingRow) => {
    const bill = liveBill(row);
    if (!bill || bill.status === "DRAFT" || bill.outstandingAmount <= 0) return Number.MAX_SAFE_INTEGER;
    return bill.dueDate ? new Date(bill.dueDate).getTime() : Number.MAX_SAFE_INTEGER - 1;
};

/**
 * Sort options, as comparators. Rows arrive in stage order and `sort` is stable, so
 * ties keep stage order. `null` means "leave stage order alone".
 */
export const SORTS: Record<BillingSortOption, { label: string; compare: ((a: ProjectBillingRow, b: ProjectBillingRow) => number) | null }> = {
    STAGE: { label: "Stage order", compare: null },
    ATTENTION: { label: "Needs action first", compare: (a, b) => attentionRankOf(a) - attentionRankOf(b) },
    DUE: { label: "Collection due date", compare: (a, b) => dueRankOf(a) - dueRankOf(b) },
    PENDING: { label: "Pending amount (high → low)", compare: (a, b) => pendingOf(b) - pendingOf(a) },
    VALUE: { label: "Bill value (high → low)", compare: (a, b) => billValueOf(b) - billValueOf(a) },
    WORK: { label: "Work done (least first)", compare: (a, b) => a.work.progress - b.work.progress },
    RECENT: { label: "Recent activity", compare: (a, b) => lastActivityOf(b) - lastActivityOf(a) },
};

export type Tone = "positive" | "attention" | "critical" | "active" | "neutral";

/**
 * A chip. With `code` (a Bill Stage code) it renders Billing → Configure's wording and colour, the same as the Billing
 * Tracker; `label` / `tone` are only for states Configure has no code for (Not billed, Overdue…).
 */
export interface Status { label: string; tone: Tone; code?: string }

const stage = (code: string): Status => ({ label: code, tone: "neutral", code });

/** No proforma exists for the bill (never created, or archived): it is ready for one. Billing → Configure's wording. */
export const READY_FOR_PROFORMA: Status = stage("READY_FOR_PROFORMA");

export const billingStatusOf = (row: ProjectBillingRow): Status => {
    const bill = liveBill(row);
    if (!bill) {
        if (row.blockReason === "ZERO_AMOUNT") return { label: "No value", tone: "neutral" };
        return attentionOf(row) ? stage("READY_FOR_PROFORMA") : { label: "Not billed", tone: "neutral" };
    }
    // Documents only: how much has been paid is the Collection column's job.
    if (stepsOf(bill).proforma && !bill.proformaDocumentId) return READY_FOR_PROFORMA;
    if (bill.status === "DRAFT") return stage("PROFORMA_DRAFT");
    if (bill.invoiceDocumentId) return docChipOf(bill.invoiceStatus, "INVOICE")!;
    return docChipOf(bill.proformaStatus, "PROFORMA") ?? stage("PROFORMA_GENERATED");
};

export const collectionStatusOf = (row: ProjectBillingRow): Status => {
    const bill = liveBill(row);
    if (!bill || bill.status === "DRAFT") return { label: "Not due yet", tone: "neutral" };
    if (bill.status === "PAID" || bill.status === "INVOICED") return stage("FULLY_PAID");
    if (isOverdue(bill)) return { label: "Overdue", tone: "critical" };
    return stage(bill.status === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "PENDING");
};

/**
 * Defaults for the bill-component codes in Billing → Configure, used only until
 * that catalogue has loaded. Once it has, the saved name and colour win.
 */
export const SETTLEMENT_FALLBACK: Record<string, { label: string; tone: string }> = {
    PENDING: { label: "Pending", tone: "neutral" },
    PARTIALLY_PAID: { label: "Partially Paid", tone: "warning" },
    FULLY_PAID: { label: "Fully Paid", tone: "success" },
};

/**
 * Payment status for the Pending column only.
 * Bill Amount, GST, TDS, and Bill Value always show the full figure on the bill.
 * Pending is the only column that shows what the client still has to pay.
 */
export const paymentCodeOf = (bill: BillOnRow): string | undefined => {
    if (bill.outstandingAmount > 0 && bill.receivedAmount > 0) return "PARTIALLY_PAID";
    if (bill.outstandingAmount > 0) return "PENDING";
    if (bill.receivedAmount > 0) return "FULLY_PAID";
    return undefined;
};

export interface Figure { label: string; value: number | null; statusCode?: string; strong?: boolean }

/** The status mark a component's figure wears: from the receipts, so a part payment reads as partly paid. */
const componentCodeOf = (prefix: "BASIC" | "GST" | "TDS", line: SettlementLine) =>
    line.tone === "received" ? `${prefix}_PAID` : line.tone === "partial" ? "PARTIALLY_PAID" : `${prefix}_UNPAID`;

/** A stage's five figures, in column order. Unbilled, its value is the whole Bill Value and Pending. */
export const figuresOf = (row: ProjectBillingRow): Figure[] => {
    const bill = liveBill(row);
    const slice = sliceOf(row);
    if (!bill || !slice) {
        return [
            { label: "Bill Amount", value: null },
            { label: "GST", value: null },
            { label: "TDS", value: null },
            { label: "Bill Value", value: row.amount },
            { label: "Pending", value: row.amount },
        ];
    }
    return [
        { label: "Bill Amount", value: billAmountOf(slice), statusCode: componentCodeOf("BASIC", bill.settlement.basic) },
        { label: "GST", value: slice.gstAmount, statusCode: slice.gstAmount > 0 ? componentCodeOf("GST", bill.settlement.gst) : undefined },
        {
            label: "TDS",
            value: slice.tdsAmount > 0 ? slice.tdsAmount : null,
            statusCode: bill.settlement.tds ? componentCodeOf("TDS", bill.settlement.tds) : undefined,
        },
        { label: "Bill Value", value: slice.totalAmount, strong: true },
        { label: "Pending", value: slice.outstandingAmount, statusCode: paymentCodeOf(bill) },
    ];
};

/** A stage with value still to bill, as the Raise dialog lists it. */
export interface BillableStage {
    stageId: string;
    stageName: string;
    /** Taxable value still to bill on it. */
    left: number;
    stageAmount: number;
    /** The whole stage's share of the contract, in percent. */
    stageShare: number;
}

/** Every stage with something left to bill, in stage order. */
export const billableStagesOf = (rows: ProjectBillingRow[]): BillableStage[] =>
    rows
        .filter((row) => !liveBill(row) && !row.blockReason && row.amount > 0)
        .map((row) => ({
            stageId: row.stageId,
            stageName: row.stageName.replace(/ \(Part \d+\)$/, ""),
            left: row.amount,
            stageAmount: row.stageAmount,
            stageShare: row.stageShare,
        }));

/** Rupees per 1% of the contract — the same for every stage, since each is a share of one contract. */
export const amountPerPercentOf = (stages: BillableStage[]) => {
    const stage = stages.find((s) => s.stageShare > 0 && s.stageAmount > 0);
    return stage ? stage.stageAmount / stage.stageShare : 0;
};

/**
 * Spread a total over the stages: each takes what is left on it until the total runs out. The ticked stages fill first,
 * in stage order; then the stages after the first ticked one; earlier stages only as a last resort. Nothing ticked =
 * start at `fromStageId`. So 35% from a 30% Advance is all of Advance and 5% of the next stage, and ticking Design
 * Concept alone skips Advance: 30% is Design Concept's 20% and 10% of the stage after it.
 * Returns the amount per stage, only for stages that get some.
 */
export const allocateAcrossStages = (
    stages: BillableStage[],
    fromStageId: string | null,
    total: number,
    ticked: readonly string[] = [],
): Record<string, number> => {
    const firstTicked = stages.findIndex((s) => ticked.includes(s.stageId));
    const start = Math.max(0, firstTicked >= 0 ? firstTicked : stages.findIndex((s) => s.stageId === fromStageId));
    const ring = [...stages.slice(start), ...stages.slice(0, start)];
    const order = [...ring.filter((s) => ticked.includes(s.stageId)), ...ring.filter((s) => !ticked.includes(s.stageId))];
    const out: Record<string, number> = {};
    let rest = roundMoney(total);
    for (const stage of order) {
        if (rest <= 0) break;
        const take = roundMoney(Math.min(rest, stage.left));
        if (take > 0) out[stage.stageId] = take;
        rest = roundMoney(rest - take);
    }
    return out;
};

/**
 * Spread one payment over bills, oldest first: each takes its pending Bill Amount, then its pending GST, until the
 * payment runs out. TDS is never filled — the client deposits it with the tax office, not with us.
 */
export const allocatePayment = (
    bills: Array<{ id: string; basicPending: number; gstPending: number }>,
    total: number,
): Record<string, { basic: number; gst: number }> => {
    const out: Record<string, { basic: number; gst: number }> = {};
    let rest = roundMoney(total);
    for (const bill of bills) {
        if (rest <= 0) break;
        const basic = roundMoney(Math.min(rest, Math.max(0, bill.basicPending)));
        rest = roundMoney(rest - basic);
        const gst = roundMoney(Math.min(rest, Math.max(0, bill.gstPending)));
        rest = roundMoney(rest - gst);
        if (basic > 0 || gst > 0) out[bill.id] = { basic, gst };
    }
    return out;
};

export const workHintOf = (row: ProjectBillingRow) => {
    const hint = row.work.total
        ? `${row.work.completed} of ${row.work.total} deliverables complete`
        : "No deliverables on this stage";
    return `${hint} · ${row.work.progress}% done`;
};

export const METHOD_LABEL: Record<string, string> = {
    CASH: "Cash", CHEQUE: "Cheque", NEFT: "NEFT", RTGS: "RTGS", IMPS: "IMPS", UPI: "UPI",
    BANK_TRANSFER: "Bank transfer", ONLINE: "Online", OTHER: "Other",
};

/** Document lifecycle, in words. */

/** What the right card is showing — mirrors a click on the path. */
export type PathFocus = "OVERVIEW" | "PROFORMA" | "PAYMENT" | "INVOICE";
/** Billing-path filter: everything, or just one document type. */
export type BillView = "ALL" | Exclude<PathFocus, "OVERVIEW">;

export type PathPayment = {
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string | null;
    /** What the receipt was recorded against; null = a lump from before components existed. */
    component?: PaymentComponent | null;
};

export type ComponentKey = "basic" | "gst" | "tds";
/** The three amounts a bill is paid in, in the company's words — the one place they are spelled. */
export const PAYMENT_COMPONENT_LABEL: Record<PaymentComponent, string> = { BASIC: "Bill Amount", GST: "GST", TDS: "TDS" };
export const COMPONENT_LABEL: Record<ComponentKey, string> = {
    basic: PAYMENT_COMPONENT_LABEL.BASIC, gst: PAYMENT_COMPONENT_LABEL.GST, tds: PAYMENT_COMPONENT_LABEL.TDS,
};
export const COMPONENT_OF: Record<ComponentKey, PaymentComponent> = { basic: "BASIC", gst: "GST", tds: "TDS" };
export const KEY_OF: Record<PaymentComponent, ComponentKey> = { BASIC: "basic", GST: "gst", TDS: "tds" };

/** The three amounts a bill is paid in, each with where it stands. TDS only when the bill has any. */
export const settlementLinesOf = (settlement: BillSettlement): Array<{ key: ComponentKey; line: SettlementLine }> => [
    { key: "basic", line: settlement.basic },
    { key: "gst", line: settlement.gst },
    ...(settlement.tds ? [{ key: "tds" as const, line: settlement.tds }] : []),
];

/** A bill line's settlement, as Billing → Configure's payment codes. */
export const lineStatusOf = (tone: SettlementTone): Status =>
    stage(tone === "received" ? "FULLY_PAID" : tone === "partial" ? "PARTIALLY_PAID" : "PENDING");

/** A proforma's / tax invoice's status as its Bill Stage code — the same chip the Billing Tracker shows. */
export const docChipOf = (status: DocumentStatus | null, kind: "PROFORMA" | "INVOICE"): Status | null => {
    if (!status) return null;
    switch (status) {
        case "DRAFT": return stage(`${kind}_DRAFT`);
        case "PUBLISHED": return stage(`${kind}_GENERATED`);
        case "SENT": return stage(`${kind}_SENT`);
        case "CANCELLED": return stage("CANCELLED");
        default: {
            const _never: never = status;
            return _never;
        }
    }
};

/** One stage as the table row and the card both draw it. */
export interface StageViewProps {
    projectId: string;
    row: ProjectBillingRow;
    open: boolean;
    onToggle: () => void;
    /** The primary step and overflow menu for one stage — owned by the workspace. */
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
}
