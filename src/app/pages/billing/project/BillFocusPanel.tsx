import React from "react";
import { Button } from "@/ds/ui/button";
import { cn } from "@/ds/lib/utils";
import { isHexColor } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { useBillingLabels } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import type { BillOnRow, SettlementLine } from "@services/bills";
import {
    COMPONENT_LABEL, COMPONENT_OF, KEY_OF, METHOD_LABEL, READY_FOR_PROFORMA, SETTLEMENT_FALLBACK, billAmountOf, docChipOf, isOverdue,
    lineStatusOf, paymentCodeOf, settlementLinesOf, type ComponentKey, type PathFocus, type PathPayment,
} from "./projectBillingRules";
import { Amount, NUM, StatusBadge } from "./parts";

/** "₹50,000 of ₹1,35,000" with its status — one component's money at a glance. */
const LineValue: React.FC<{ line: SettlementLine }> = ({ line }) => (
    <span className="flex flex-wrap items-baseline justify-end gap-x-2 gap-y-0.5">
        <span className={cn(NUM, "text-[15px] font-bold", line.received === 0 && "text-muted-foreground")}>{formatCurrencyDecimal(line.received)}</span>
        <span className={cn(NUM, "text-xs text-muted-foreground")}>of {formatCurrencyDecimal(line.amount)}</span>
        <StatusBadge status={lineStatusOf(line.tone)} />
    </span>
);

/** Right pane of the path+detail shell — no second card, just the selected step. */
const DetailShell: React.FC<{
    eyebrow: string;
    title: string;
    /** Kit background class for the top accent bar. */
    accent: string;
    aside?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}> = ({ eyebrow, title, accent, aside, action, children }) => (
    <div className="flex h-fit w-full flex-col">
        <div className={cn("h-[3px] shrink-0", accent)} />
        <div className="min-w-0 flex-1 px-3 py-3 md:px-3.5">
            <div className="mb-2.5 flex min-w-0 items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold tracking-[0.01em] text-muted-foreground">{eyebrow}</p>
                    <p className="mt-0.5 text-[15px] leading-snug font-bold text-foreground">{title}</p>
                    {aside}
                </div>
                {action && <div className="shrink-0 pt-0.5">{action}</div>}
            </div>
            {children}
        </div>
    </div>
);

const DueLine: React.FC<{ dueDate: string; overdue: boolean }> = ({ dueDate, overdue }) => (
    <p className={cn("mt-0.5 text-xs", overdue ? "font-bold text-destructive" : "font-medium text-muted-foreground")}>
        {overdue ? "Overdue" : "Due"} {formatDate(dueDate)}
    </p>
);

/** Inset tiles — same tile language as the workspace summary. */
const Bento: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={cn("flex min-w-0 flex-wrap gap-2", className)}>{children}</div>
);

const INSET = "rounded-xl bg-muted/50 ring-1 ring-border";

const Tile: React.FC<{
    label: string;
    wide?: boolean;
    min?: string;
    children: React.ReactNode;
}> = ({ label, wide, min = "8.5rem", children }) => (
    <div
        className={cn(INSET, "px-2.5 py-2")}
        style={{ flex: wide ? "1 1 100%" : `1 0 ${min}`, minWidth: wide ? "100%" : min }}
    >
        <p className="mb-1 truncate text-xs leading-snug text-muted-foreground">{label}</p>
        <div className="min-w-0 overflow-hidden">{children}</div>
    </div>
);

/** One aligned label / value row — used when the card is too narrow for a 3-tile grid. */
const FactList: React.FC<{ items: Array<{ label: string; value: React.ReactNode }> }> = ({ items }) => (
    <div className={cn(INSET, "min-w-0 overflow-hidden")}>
        {items.map((item, index) => (
            <div
                key={item.label}
                className={cn("flex min-w-0 items-center justify-between gap-4 px-2.5 py-1.5", index > 0 && "border-t border-border")}
            >
                <span className="shrink-0 text-[12.5px] text-muted-foreground">{item.label}</span>
                <div className="flex min-w-0 justify-end overflow-hidden text-right">{item.value}</div>
            </div>
        ))}
    </div>
);

const Big: React.FC<{ children: React.ReactNode; size?: "lg" | "md" }> = ({ children, size = "md" }) => (
    <span className={cn(NUM, "font-bold", size === "lg" ? "text-[15px]" : "text-sm")}>{children}</span>
);

/** Small inline button for path actions (Edit / Open / Retry / Mark deposited). */
const PathButton: React.FC<React.ComponentProps<typeof Button>> = ({ className, ...props }) => (
    <Button size="sm" variant="inverted" className={cn("shrink-0 self-center", className)} {...props} />
);

/** Right card — content follows the selected path step. */
export const BillFocusPanel: React.FC<{
    focus: PathFocus;
    selectedPaymentId: string | null;
    selectedComponent: ComponentKey | null;
    bill: BillOnRow;
    payments: PathPayment[];
    paymentsLoading: boolean;
    paymentsError: boolean;
    onRetryPayments: () => void;
    onOpenDocument: (documentId: string, status?: string | null) => void;
}> = ({
    focus, selectedPaymentId, selectedComponent, bill, payments, paymentsLoading, paymentsError, onRetryPayments, onOpenDocument,
}) => {
    const labels = useBillingLabels();
    const settlement = bill.settlement;
    const settled = bill.outstandingAmount <= 0;
    const overdue = isOverdue(bill);
    const pending = Math.max(0, bill.outstandingAmount);
    const proformaDone = Boolean(bill.proformaNumber) && bill.proformaStatus !== "DRAFT";
    const invoiceDone = Boolean(bill.invoiceNumber) && bill.invoiceStatus !== "DRAFT";

    const docButton = (documentId: string | null, status: string | null) =>
        documentId ? (
            <PathButton onClick={() => onOpenDocument(documentId, status)}>
                {status === "DRAFT" ? "Edit" : "Open"}
            </PathButton>
        ) : null;

    if (focus === "PROFORMA") {
        return (
            <DetailShell
                eyebrow="Proforma"
                title={bill.proformaNumber ?? "Not created yet"}
                accent={proformaDone ? "bg-success" : bill.proformaDocumentId ? "bg-warning" : "bg-muted-foreground/30"}
                action={docButton(bill.proformaDocumentId, bill.proformaStatus)}
            >
                <FactList
                    items={[
                        { label: "Amount", value: <Big size="lg">{formatCurrencyDecimal(bill.totalAmount)}</Big> },
                        {
                            label: "Status",
                            value: <StatusBadge status={docChipOf(bill.proformaStatus, "PROFORMA") ?? READY_FOR_PROFORMA} />,
                        },
                        { label: "Date", value: <Big>{bill.proformaDate ? formatDate(bill.proformaDate) : "—"}</Big> },
                    ]}
                />
                {bill.proformaVersions > 1 && (
                    <p className="mt-2 text-[12.5px] text-muted-foreground">Revision {bill.proformaVersions}</p>
                )}
            </DetailShell>
        );
    }

    if (focus === "PAYMENT") {
        const selected = selectedPaymentId ? payments.find((p) => p.id === selectedPaymentId) : undefined;
        if (selected) {
            return (
                <DetailShell
                    eyebrow={selected.component ? `Payment · ${COMPONENT_LABEL[KEY_OF[selected.component]]}` : "Payment"}
                    title={formatDate(selected.paymentDate)}
                    accent="bg-success"
                >
                    <FactList
                        items={[
                            { label: "Amount", value: <Big size="lg">{formatCurrencyDecimal(selected.amount)}</Big> },
                            { label: "Against", value: <Big>{selected.component ? COMPONENT_LABEL[KEY_OF[selected.component]] : "Not assigned"}</Big> },
                            {
                                label: "Method",
                                value: <StatusBadge status={{ label: METHOD_LABEL[selected.method] ?? selected.method, tone: "active" }} />,
                            },
                            { label: "Date", value: <Big>{formatDate(selected.paymentDate)}</Big> },
                        ]}
                    />
                    {selected.reference && <p className="mt-2 text-[12.5px] text-muted-foreground">{selected.reference}</p>}
                </DetailShell>
            );
        }
        const componentLine = selectedComponent ? settlement[selectedComponent] : null;
        if (selectedComponent && componentLine) {
            const own = payments.filter((p) => p.component === COMPONENT_OF[selectedComponent]);
            return (
                <DetailShell
                    eyebrow={COMPONENT_LABEL[selectedComponent]}
                    title={lineStatusOf(componentLine.tone).label}
                    accent={componentLine.tone === "received" ? "bg-success" : componentLine.tone === "partial" ? "bg-warning" : "bg-muted-foreground/30"}
                >
                    <FactList
                        items={[
                            { label: "Amount", value: <Big size="lg">{formatCurrencyDecimal(componentLine.amount)}</Big> },
                            {
                                label: "Received",
                                value: <span className={cn(NUM, "text-[15px] font-bold", componentLine.received === 0 && "text-muted-foreground")}>{formatCurrencyDecimal(componentLine.received)}</span>,
                            },
                            { label: "Pending", value: <Big>{formatCurrencyDecimal(componentLine.pending)}</Big> },
                            ...(componentLine.settledAt ? [{ label: "Settled on", value: <Big>{formatDate(componentLine.settledAt)}</Big> }] : []),
                        ]}
                    />
                    {own.length > 0 && (
                        <div className={cn(INSET, "mt-2 min-w-0 overflow-hidden")}>
                            {own.map((p, index) => (
                                <div key={p.id} className={cn("flex min-w-0 items-center justify-between gap-3 px-2.5 py-1.5", index > 0 && "border-t border-border")}>
                                    <span className="min-w-0 truncate text-[12.5px] text-muted-foreground">
                                        {formatDate(p.paymentDate)} · {METHOD_LABEL[p.method] ?? p.method}
                                    </span>
                                    <Big>{formatCurrencyDecimal(p.amount)}</Big>
                                </div>
                            ))}
                        </div>
                    )}
                    {paymentsLoading && <p className="mt-2 text-xs text-muted-foreground">Loading payments…</p>}
                </DetailShell>
            );
        }
        const configuredReceivedTone = labels.tone("FULLY_PAID") ?? SETTLEMENT_FALLBACK.FULLY_PAID?.tone;
        const receivedColor = configuredReceivedTone
            ? (isHexColor(configuredReceivedTone) ? configuredReceivedTone : tonePair(configuredReceivedTone).fg)
            : undefined;

        const configuredPendingTone = labels.tone(paymentCodeOf(bill)) ?? (paymentCodeOf(bill) ? SETTLEMENT_FALLBACK[paymentCodeOf(bill)!]?.tone : undefined);
        const pendingColor = configuredPendingTone
            ? (isHexColor(configuredPendingTone) ? configuredPendingTone : tonePair(configuredPendingTone).fg)
            : undefined;

        return (
            <DetailShell
                eyebrow="Payments"
                title={bill.paymentCount > 0
                    ? `${bill.paymentCount} payment${bill.paymentCount === 1 ? "" : "s"}`
                    : "No payments yet"}
                accent={settled ? "bg-success" : overdue ? "bg-destructive" : "bg-warning"}
                aside={bill.dueDate ? <DueLine dueDate={bill.dueDate} overdue={overdue} /> : undefined}
            >
                <FactList
                    items={[
                        ...settlementLinesOf(settlement).map(({ key, line }) => ({
                            label: key === "gst" ? `GST (${bill.gstRate}%)` : key === "tds" ? `TDS (${bill.tdsRate}%)` : COMPONENT_LABEL[key],
                            value: <LineValue line={line} />,
                        })),
                        { label: "Total Value", value: <Big size="lg">{formatCurrencyDecimal(settlement.total)}</Big> },
                        {
                            label: "Received",
                            value: (
                                <span
                                    className={cn(NUM, "font-bold text-[15px]", settlement.received === 0 && "text-muted-foreground")}
                                    style={settlement.received > 0 && receivedColor ? { color: receivedColor } : undefined}
                                >
                                    {formatCurrencyDecimal(settlement.received)}
                                </span>
                            ),
                        },
                        {
                            label: "Pending",
                            value: (
                                <span
                                    className={cn(NUM, "font-bold text-[15px]")}
                                    style={pendingColor ? { color: pendingColor } : undefined}
                                >
                                    {formatCurrencyDecimal(settlement.pending)}
                                </span>
                            ),
                        },
                    ]}
                />
                {paymentsLoading && <p className="mt-2 text-xs text-muted-foreground">Loading payments…</p>}
                {paymentsError && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-destructive">Could not load payments.</span>
                        <Button size="xs" variant="ghost" onClick={onRetryPayments}>Retry</Button>
                    </div>
                )}
            </DetailShell>
        );
    }

    if (focus === "INVOICE") {
        return (
            <DetailShell
                eyebrow="Tax invoice"
                title={bill.invoiceNumber ?? "Not raised yet"}
                accent={invoiceDone ? "bg-success" : proformaDone ? "bg-warning" : "bg-muted-foreground/30"}
                action={docButton(bill.invoiceDocumentId, bill.invoiceStatus)}
            >
                <FactList
                    items={[
                        { label: "Amount", value: <Big size="lg">{formatCurrencyDecimal(bill.totalAmount)}</Big> },
                        {
                            label: "Status",
                            value: <StatusBadge status={docChipOf(bill.invoiceStatus, "INVOICE")
                                ?? { label: proformaDone ? "Ready to raise" : "Waiting", tone: proformaDone ? "attention" : "neutral" }} />,
                        },
                        { label: "Date", value: <Big>{bill.invoiceDate ? formatDate(bill.invoiceDate) : "—"}</Big> },
                    ]}
                />
            </DetailShell>
        );
    }

    return (
        <DetailShell
            eyebrow="Bill overview"
            title={bill.billNumber}
            accent={settled ? "bg-success" : overdue ? "bg-destructive" : "bg-primary"}
            aside={bill.dueDate ? <DueLine dueDate={bill.dueDate} overdue={overdue} /> : undefined}
        >
            <Bento>
                <Tile label="Bill Value">
                    <Amount value={bill.totalAmount} strong align="left" />
                </Tile>
                <Tile label="Pending">
                    <Amount value={pending} strong align="left" statusCode={paymentCodeOf(bill)} />
                </Tile>
            </Bento>
            <Bento className="mt-2">
                <Tile label="Bill Amount" min="7.25rem">
                    <Amount value={billAmountOf(bill)} strong align="left" statusCode={bill.basicPaid ? "FULLY_PAID" : "PENDING"} />
                </Tile>
                {bill.gstAmount > 0 && (
                    <Tile label={`GST ${bill.gstRate}%`} min="7.25rem">
                        <Amount value={bill.gstAmount} strong align="left" statusCode={bill.gstPaid ? "FULLY_PAID" : "PENDING"} />
                    </Tile>
                )}
                {bill.tdsAmount > 0 && (
                    <Tile label={`TDS ${bill.tdsRate}%`} min="7.25rem">
                        <Amount value={bill.tdsAmount} strong align="left" statusCode={bill.tdsDeposited ? "FULLY_PAID" : "PENDING"} />
                    </Tile>
                )}
            </Bento>
        </DetailShell>
    );
};
