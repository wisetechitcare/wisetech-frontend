import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/ds/ui/button";
import { Card } from "@/ds/ui/card";
import { Tabs, TabsTrigger } from "@/ds/ui/tabs";
import { ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";
import { cn } from "@/ds/lib/utils";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getBill, type ArchivedDocument, type ProjectBillingRow, type SettlementLine } from "@services/bills";
import {
    COMPONENT_LABEL, COMPONENT_OF, METHOD_LABEL, READY_FOR_PROFORMA, docChipOf, isOverdue, lineStatusOf, liveBill, settlementLinesOf,
    type BillView, type ComponentKey, type PathFocus, type PathPayment, type Status,
} from "./projectBillingRules";
import { NUM, StatusBadge } from "./parts";
import { BillFocusPanel } from "./BillFocusPanel";

/** Same tracks on every step — kind, number, date, chip, amount. Chip grows so amount stays at the end. */
const PATH_COLS = "grid-cols-[6.75rem_13rem_9.5rem_minmax(6.25rem,1fr)_8.75rem]";
/** A receipt sits `ml-5` (1.25rem) in under its amount: its first track gives that back so every column lines up. */
const PATH_COLS_NESTED = "grid-cols-[5.5rem_13rem_9.5rem_minmax(6.25rem,1fr)_8.75rem]";

/** Marker colours for a path step: selected, done, next, or still ahead. */
const markerOf = (selected?: boolean, done?: boolean, next?: boolean) =>
    selected ? "border-primary bg-primary"
        : done ? "border-success bg-success"
            : next ? "border-warning bg-warning"
                : "border-muted-foreground/40 bg-card";

/** The path's rail: a single unbroken line through every dot. Green once the step above it is done. */
const RAIL_DONE = "bg-success/70";
const RAIL_IDLE = "bg-muted-foreground/30";

/**
 * One step on the path — kind, number, date, chip and amount stay on one line
 * with reserved tracks so they cannot collide.
 */
const PathStep: React.FC<{
    done: boolean;
    next?: boolean;
    selected?: boolean;
    /** First / last dot of the visible path: the rail starts at the first dot's centre and ends at the last's. */
    first?: boolean;
    last?: boolean;
    /** A receipt hanging off an amount: a short branch back to the rail beside it. */
    elbow?: boolean;
    kind: string;
    title?: string;
    meta?: string;
    chip?: Status | null;
    amount?: number;
    /** Two lines — kind, number, amount / date, chip — instead of five reserved tracks. */
    narrow?: boolean;
    onSelect: () => void;
}> = ({ done, next, selected, first, last, elbow, kind, title, meta, chip, amount, narrow, onSelect }) => {
    const kindText = (
        <span className={cn("text-[13px] leading-snug font-bold whitespace-nowrap", selected || done || next ? "text-foreground" : "text-muted-foreground")}>
            {kind}
        </span>
    );
    const titleText = <span className="min-w-0 truncate text-[13px] text-muted-foreground">{title ?? ""}</span>;
    // Wide enough for "₹12,34,567.89 pending"; anything longer truncates rather than running under the chip.
    const metaText = <span title={meta} className={cn(NUM, "min-w-0 truncate whitespace-nowrap text-[12.5px] text-muted-foreground")}>{meta ?? ""}</span>;
    const chipBox = <span className={cn("min-w-0", narrow ? "justify-self-end" : "justify-self-start")}>{chip && <StatusBadge status={chip} />}</span>;
    const amountText = (
        <span className={cn(NUM, "text-right text-[13px] font-bold")}>
            {amount !== undefined ? formatCurrencyDecimal(amount) : ""}
        </span>
    );
    return (
        <div className="relative grid w-full grid-cols-[18px_minmax(0,1fr)] gap-x-2.5">
            {elbow && <span aria-hidden className="absolute top-1/2 left-[-11px] h-0.5 w-[20px] -translate-y-1/2 rounded-full bg-muted-foreground/30" />}
            <div className="relative flex flex-col items-center justify-center">
                {/* Dot, rail ends and branch all key off the row's vertical centre, so they meet whatever the row height. */}
                {!(first && last) && (
                    <span
                        aria-hidden
                        className={cn(
                            "absolute left-1/2 w-0.5 -translate-x-1/2 rounded-full",
                            first ? "top-1/2" : "top-0",
                            last ? "h-1/2" : "bottom-0",
                            done ? RAIL_DONE : RAIL_IDLE,
                        )}
                    />
                )}
                <span aria-hidden className={cn("relative z-10 size-3 shrink-0 rounded-full border-2 border-solid", markerOf(selected, done, next))} />
            </div>
            <Button
                variant="ghost"
                aria-current={selected ? "true" : undefined}
                onClick={onSelect}
                className={cn(
                    "h-auto w-full min-w-0 justify-stretch rounded-lg px-2.5 py-1.5 text-left font-normal whitespace-normal",
                    "my-px",
                    selected && "bg-primary/10 hover:bg-primary/15",
                )}
            >
                {narrow ? (
                    <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
                        <span className="flex min-w-0 items-baseline gap-2">
                            {kindText}
                            {titleText}
                        </span>
                        {amountText}
                        {metaText}
                        {chipBox}
                    </span>
                ) : (
                    <span className={cn("grid w-full items-center gap-x-3", elbow ? PATH_COLS_NESTED : PATH_COLS)}>
                        {kindText}
                        {titleText}
                        {metaText}
                        {chipBox}
                        {amountText}
                    </span>
                )}
            </Button>
        </div>
    );
};

const ARCHIVED: Status = { label: "Archived", tone: "neutral", code: "ARCHIVED" };

/**
 * A document of this bill that was archived, drawn as the same step as every other on the path (dot, rail, columns,
 * chip) — idle, with the Archived chip. Selecting it opens the document.
 */
const ArchivedStep: React.FC<{ doc: ArchivedDocument; first: boolean; last: boolean; narrow?: boolean; onOpen: () => void }> = ({
    doc, first, last, narrow, onOpen,
}) => (
    <PathStep
        first={first}
        last={last}
        done={false}
        kind={doc.kind === "PROFORMA" ? "Proforma" : "Tax invoice"}
        title={doc.number}
        meta={doc.date ? formatDate(doc.date) : undefined}
        chip={ARCHIVED}
        narrow={narrow}
        onSelect={onOpen}
    />
);

/** One stage's bill as a path — proforma, each amount and its receipts, tax invoice — and the step selected on it. */
export const BillPath: React.FC<{
    projectId: string;
    row: ProjectBillingRow;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    /** Detail card below the path instead of beside it. */
    stacked?: boolean;
    narrow?: boolean;
    /** Two-line path rows without the phone-only changes (full-width tabs, tight padding). */
    compactPath?: boolean;
}> = ({ projectId, row, onOpenDocument, stacked, narrow: phone, compactPath }) => {
    const narrow = phone || compactPath;
    const bill = liveBill(row);

    const proformaDone = Boolean(bill && bill.proformaNumber && bill.proformaStatus !== "DRAFT");
    const paidInFull = bill?.status === "PAID" || bill?.status === "INVOICED";
    const invoiceDone = Boolean(bill && bill.invoiceNumber && bill.invoiceStatus !== "DRAFT");
    const overdue = bill ? isOverdue(bill) : false;

    // After the proforma, payment and the bill are independent: both can be "next" at once.
    const payNext = proformaDone && !paidInFull;
    const invoiceNext = proformaDone && !invoiceDone;
    const nextStep: PathFocus = !proformaDone
        ? "PROFORMA"
        : payNext
            ? "PAYMENT"
            : invoiceNext
                ? "INVOICE"
                : "PROFORMA";

    const [focus, setFocus] = useState<PathFocus>(nextStep);
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
    const [selectedComponent, setSelectedComponent] = useState<ComponentKey | null>(null);
    const [view, setView] = useState<BillView>("ALL");

    useEffect(() => {
        setFocus(nextStep);
        setSelectedPaymentId(null);
        setSelectedComponent(null);
        setView("ALL");
    }, [bill?.id, nextStep]);

    const { data: detail, isLoading, isError, refetch } = useQuery({
        queryKey: ["project-billing", projectId, "bill", bill?.id],
        queryFn: () => getBill(bill!.id),
        enabled: Boolean(bill && bill.paymentCount > 0),
    });

    if (!bill) {
        return (
            <Card size="sm" className="gap-1 px-3 py-2.5">
                <p className="text-[13.5px] font-bold">Not billed yet</p>
                <p className="text-[12.5px] text-muted-foreground">
                    {row.blockMessage ?? `${formatCurrencyDecimal(row.amount)} can be billed now. Raise the proforma to start billing this stage.`}
                </p>
                {row.previousDocuments.length > 0 && (
                    <div className="mt-1 flex flex-col border-t border-border pt-1.5">
                        <span className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Previously</span>
                        {row.previousDocuments.map((doc, i, all) => (
                            <ArchivedStep
                                key={doc.id} doc={doc} narrow={narrow}
                                first={i === 0} last={i === all.length - 1}
                                onOpen={() => onOpenDocument(doc.id, "ARCHIVED")}
                            />
                        ))}
                    </div>
                )}
            </Card>
        );
    }

    const payments: PathPayment[] = ((detail?.payments ?? []) as PathPayment[])
        .map((p) => ({ ...p, amount: Number(p.amount) }))
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    const select = (kind: PathFocus, paymentId: string | null = null, component: ComponentKey | null = null) => {
        setFocus(kind);
        setSelectedPaymentId(paymentId);
        setSelectedComponent(component);
    };
    const componentLines = settlementLinesOf(bill.settlement);
    const unassigned = payments.filter((p) => !p.component);
    const pick = (v: BillView) => {
        setView(v);
        select(v === "ALL" ? nextStep : v);
    };
    const shows = (v: BillView) => view === "ALL" || view === v;

    // The visible path, top to bottom, so the rail knows where it starts and ends.
    const paymentRows: Array<
        | { type: "component"; key: ComponentKey; line: SettlementLine }
        | { type: "receipt"; key: ComponentKey; payment: PathPayment }
        | { type: "unassigned"; payment: PathPayment }
    > = shows("PAYMENT") && (proformaDone || bill.paymentCount > 0)
        ? [
            ...componentLines.flatMap(({ key, line }) => [
                { type: "component" as const, key, line },
                ...payments.filter((p) => p.component === COMPONENT_OF[key]).map((payment) => ({ type: "receipt" as const, key, payment })),
            ]),
            ...unassigned.map((payment) => ({ type: "unassigned" as const, payment })),
        ]
        : [];
    // What was archived on this bill leads the path (it happened first), so the rail starts at the first of them.
    const archived = bill.archivedDocuments.filter((d) => shows(d.kind === "PROFORMA" ? "PROFORMA" : "INVOICE"));
    const led = archived.length > 0;
    const firstStep = shows("PROFORMA") ? "PROFORMA" : paymentRows.length ? "PAYMENT" : "INVOICE";
    const lastStep = shows("INVOICE") ? "INVOICE" : paymentRows.length ? "PAYMENT" : "PROFORMA";

    return (
        <Card size="sm" className={cn("items-stretch gap-0 py-0", stacked ? "flex-col" : "flex-row")}>
            <div className={cn("min-w-0 flex-auto py-2.5", narrow ? "px-2" : "px-3")}>
                <Tabs value={view} onValueChange={(v) => pick(v as BillView)} className="mb-2">
                    <ToggleList aria-label="Billing documents" className={narrow ? "w-full" : "w-fit"}>
                        <TabsTrigger value="ALL" className={TOGGLE_TAB}>All</TabsTrigger>
                        <TabsTrigger value="PROFORMA" className={TOGGLE_TAB}>Proforma</TabsTrigger>
                        <TabsTrigger value="PAYMENT" className={TOGGLE_TAB}>Payments</TabsTrigger>
                        <TabsTrigger value="INVOICE" className={TOGGLE_TAB}>Tax invoice</TabsTrigger>
                    </ToggleList>
                </Tabs>

                {archived.map((doc, i) => (
                    <ArchivedStep key={doc.id} doc={doc} narrow={narrow} first={i === 0} last={false} onOpen={() => onOpenDocument(doc.id, "ARCHIVED")} />
                ))}

                {shows("PROFORMA") && <PathStep
                    first={!led}
                    last={lastStep === "PROFORMA"}
                    done={proformaDone}
                    next={nextStep === "PROFORMA"}
                    selected={focus === "PROFORMA"}
                    kind="Proforma"
                    title={bill.proformaNumber ?? undefined}
                    meta={bill.proformaDate ? formatDate(bill.proformaDate) : undefined}
                    chip={docChipOf(bill.proformaStatus, "PROFORMA") ?? READY_FOR_PROFORMA}
                    narrow={narrow} onSelect={() => select("PROFORMA")}
                />}

                {/* Bill Amount, GST and TDS are paid separately, each in whatever parts: one step per amount, with
                    the receipts recorded against it branching off beneath. One unbroken rail runs through all of it. */}
                {paymentRows.map((row, i) => {
                    const first = firstStep === "PAYMENT" && i === 0 && !led;
                    const last = lastStep === "PAYMENT" && i === paymentRows.length - 1;
                    if (row.type === "component") {
                        const { key, line } = row;
                        return (
                            <PathStep
                                key={`component-${key}`}
                                first={first}
                                last={last}
                                done={line.tone === "received"}
                                next={line.tone !== "received"}
                                selected={focus === "PAYMENT" && selectedComponent === key && !selectedPaymentId}
                                kind={COMPONENT_LABEL[key]}
                                title={line.received > 0 ? `${formatCurrencyDecimal(line.received)} received` : overdue ? "Overdue" : "Awaiting"}
                                meta={line.pending > 0 ? `${formatCurrencyDecimal(line.pending)} pending` : line.settledAt ? formatDate(line.settledAt) : "Settled"}
                                chip={lineStatusOf(line.tone)}
                                amount={line.amount}
                                narrow={narrow} onSelect={() => select("PAYMENT", null, key)}
                            />
                        );
                    }
                    const { payment } = row;
                    const nested = row.type === "receipt";
                    const parentDone = nested && settlementLinesOf(bill.settlement).find((l) => l.key === row.key)?.line.tone === "received";
                    const prev = paymentRows[i - 1];
                    const next = paymentRows[i + 1];
                    const step = (
                        <PathStep
                            first={nested ? prev?.type !== "receipt" : first}
                            last={nested ? next?.type !== "receipt" : last}
                            elbow={nested}
                            done
                            selected={focus === "PAYMENT" && selectedPaymentId === payment.id}
                            kind="Payment"
                            title={nested ? undefined : "Not assigned"}
                            meta={formatDate(payment.paymentDate)}
                            chip={{ label: METHOD_LABEL[payment.method] ?? payment.method, tone: "active" }}
                            amount={payment.amount}
                            narrow={narrow} onSelect={() => select("PAYMENT", payment.id, nested ? row.key : null)}
                        />
                    );
                    if (!nested) return <React.Fragment key={`payment-${payment.id}`}>{step}</React.Fragment>;
                    return (
                        <div key={`payment-${payment.id}`} className="relative ml-5">
                            {/* The component's own rail, carried down beside its receipts so the next amount stays connected. */}
                            <span
                                aria-hidden
                                className={cn("absolute left-[-12px] top-0 w-0.5 rounded-full", last ? "h-1/2" : "bottom-0", parentDone ? RAIL_DONE : RAIL_IDLE)}
                            />
                            {step}
                        </div>
                    );
                })}

                {isLoading && bill.paymentCount > 0 && payments.length === 0 && (
                    <p className="py-1 pl-8 text-xs text-muted-foreground">Loading payments…</p>
                )}
                {isError && (
                    <div className="flex items-center gap-2 py-1 pl-8">
                        <span className="text-xs text-destructive">Could not load payments.</span>
                        <Button size="xs" variant="ghost" onClick={() => { void refetch(); }}>Retry</Button>
                    </div>
                )}

                {shows("INVOICE") && <PathStep
                    first={firstStep === "INVOICE" && !led}
                    last
                    done={invoiceDone}
                    next={invoiceNext}
                    selected={focus === "INVOICE"}
                    kind="Tax invoice"
                    title={bill.invoiceNumber ?? undefined}
                    meta={bill.invoiceDate ? formatDate(bill.invoiceDate) : undefined}
                    chip={docChipOf(bill.invoiceStatus, "INVOICE") ?? { label: proformaDone ? "Ready to raise" : "Waiting", tone: proformaDone ? "attention" : "neutral" }}
                    narrow={narrow} onSelect={() => select("INVOICE")}
                />}
            </div>

            <div className={cn("border-border bg-muted/30", stacked ? "border-t" : "w-88 shrink-0 border-l")}>
                <BillFocusPanel
                    focus={focus}
                    selectedPaymentId={selectedPaymentId}
                    selectedComponent={selectedComponent}
                    bill={bill}
                    payments={payments}
                    paymentsLoading={isLoading}
                    paymentsError={isError}
                    onRetryPayments={() => { void refetch(); }}
                    onOpenDocument={onOpenDocument}
                />
            </div>
        </Card>
    );
};
