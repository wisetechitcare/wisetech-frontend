import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KitProvider } from "@/ds/provider";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Card } from "@/ds/ui/card";
import { Progress } from "@/ds/ui/progress";
import { Skeleton } from "@/ds/ui/skeleton";
import { EmptyState } from "@/ds/patterns/empty-state";
import { cn } from "@/ds/lib/utils";
import { toast } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import {
    getProjectBilling, raiseBill, recordBillPayment, recordSplitPayment, openProforma, openTaxInvoice,
    type ProjectBillingRow, type RaiseBillInput, type RecordPaymentInput, type SplitPaymentInput,
} from "@services/bills";
import { RaiseBillDialog, RecordPaymentDialog, SplitPaymentDialog, type PayableBill } from "./BillDialogs";
import BillDocumentDialog, { type BillDocumentTarget } from "./BillDocumentDialog";
import ProjectBillingTree from "./ProjectBillingTree";
import ProjectBillingToolbar from "./ProjectBillingToolbar";
import { FILTERS, billableStagesOf, liveBill, proformaApprovalOf, stepsOf, type BillingFilterTab, type BillingSortOption } from "./projectBillingRules";
import ProformaApprovalDialog, { type ApprovalRequest } from "./ProformaApprovalDialog";
import { NUM, Tip } from "./parts";

const QUERY_KEY = (projectId: string) => ["project-billing", projectId];

/**
 * Summary tile — label, then the figure. `done` adds how much of that figure has come
 * in, as "₹done / ₹total received" over a kit Progress bar.
 */
const SummaryTile: React.FC<{
    label: string;
    value: number | null;
    toneClass?: string;
    hint?: string;
    done?: { amount: number; verb: string };
}> = ({ label, value, toneClass, hint, done }) => {
    const pct = done && value ? Math.min(100, Math.round((done.amount / value) * 100)) : 0;
    const full = pct >= 100;
    return (
        <div className="min-w-0 rounded-xl bg-muted/50 px-2.5 py-2 ring-1 ring-border">
            <p className="mb-1 truncate text-xs leading-snug text-muted-foreground">{label}</p>
            <Tip title={hint}>
                <span className={cn(NUM, "text-base leading-snug font-bold sm:text-lg", value === null ? "text-muted-foreground/60" : toneClass ?? "text-foreground")}>
                    {value === null ? "—" : formatCurrencyDecimal(value)}
                </span>
            </Tip>
            {done && value !== null && value > 0 && (
                <div className="mt-1.5">
                    <Progress
                        value={pct}
                        aria-label={`${label} ${done.verb}`}
                        className={cn(
                            "gap-0 [&_[data-slot=progress-track]]:h-1",
                            full ? "[&_[data-slot=progress-indicator]]:bg-success" : "[&_[data-slot=progress-indicator]]:bg-warning",
                        )}
                    />
                    <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2">
                        <span className={cn(NUM, "text-xs text-muted-foreground")}>
                            {done.verb}{" "}
                            <span className={cn("font-bold", full ? "text-success-foreground" : "text-foreground")}>
                                {formatCurrencyDecimal(done.amount)}
                            </span>
                        </span>
                        <span className={cn(NUM, "text-xs font-bold", full ? "text-success-foreground" : "text-muted-foreground")}>{pct}%</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const LoadingState: React.FC = () => (
    <div className="flex flex-col gap-3" aria-busy aria-label="Loading billing">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
);

const ProjectBillingWorkspace: React.FC<{ projectId: string }> = ({ projectId }) => {
    const queryClient = useQueryClient();

    const [raiseOn, setRaiseOn] = useState<ProjectBillingRow | null>(null);
    const [payOn, setPayOn] = useState<ProjectBillingRow | null>(null);
    const [splitOpen, setSplitOpen] = useState(false);
    const [docTarget, setDocTarget] = useState<BillDocumentTarget | null>(null);

    // Filter, search and sort state
    const [filterTab, setFilterTab] = useState<BillingFilterTab>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<BillingSortOption>("STAGE");

    const queryKey = QUERY_KEY(projectId);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => getProjectBilling(projectId),
        enabled: Boolean(projectId),
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey });

    const openDocument = React.useCallback(
        (documentId: string, status?: string | null) =>
            setDocTarget({ documentId, mode: status === "DRAFT" ? "edit" : "manage" }),
        [],
    );

    const fail = (fallback: string) => (err: any) =>
        toast({ icon: "error", title: err?.response?.data?.message ?? fallback });

    /**
     * Money is recorded and tax invoices raised only against a proforma the client APPROVED. A pending one (generated /
     * sent / viewed) asks first — "Yes" records the approval, then continues. A rejected one stops: it needs revising.
     * Bills with no proforma (imported history) are never held up.
     */
    const [approvalAsk, setApprovalAsk] = useState<ApprovalRequest | null>(null);
    const requireApproved = (bills: NonNullable<ProjectBillingRow["bill"]>[], action: string, run: () => void) => {
        const rejected = bills.find((b) => proformaApprovalOf(b) === "REJECTED");
        if (rejected) {
            toast({
                icon: "error",
                title: `${rejected.proformaNumber ?? "The proforma"} was rejected by the client`,
                text: `Revise the proforma and get it approved before you ${action}.`,
            });
            return;
        }
        const pending = bills.filter((b) => proformaApprovalOf(b) === "PENDING");
        if (pending.length) setApprovalAsk({ bills: pending, action, run });
        else run();
    };

    const raise = useMutation({
        mutationFn: (input: RaiseBillInput) => raiseBill(input),
        onSuccess: ({ bill, documentId }) => {
            setRaiseOn(null);
            refresh();
            toast({ icon: "success", title: `Proforma raised${bill?.billNumber ? ` · ${bill.billNumber}` : ""}` });
            if (documentId) openDocument(documentId, "DRAFT");
        },
        onError: fail("Could not raise the proforma"),
    });

    const pay = useMutation({
        mutationFn: ({ billId, input }: { billId: string; input: RecordPaymentInput }) =>
            recordBillPayment(billId, input),
        onSuccess: () => {
            setPayOn(null);
            refresh();
            toast({ icon: "success", title: "Payment recorded" });
        },
        onError: fail("Could not record the payment"),
    });

    const split = useMutation({
        mutationFn: (input: SplitPaymentInput) => recordSplitPayment(input),
        onSuccess: (bills) => {
            setSplitOpen(false);
            refresh();
            toast({ icon: "success", title: `Payment recorded across ${bills?.length ?? 0} bills` });
        },
        onError: fail("Could not record the payment"),
    });

    const proforma = useMutation({
        mutationFn: (billId: string) => openProforma(billId),
        onSuccess: ({ documentId }) => { refresh(); openDocument(documentId, "DRAFT"); },
        onError: fail("Could not open the proforma"),
    });

    const invoice = useMutation({
        mutationFn: (billId: string) => openTaxInvoice(billId),
        onSuccess: ({ documentId }) => { refresh(); openDocument(documentId, "DRAFT"); },
        onError: fail("Could not open the tax invoice"),
    });

    const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
    /** Every stage with value left to bill — the Raise dialog lists them all, so one bill can cover several. */
    const billableStages = useMemo(() => billableStagesOf(rows), [rows]);
    /** Each bill with money pending, once (a bill over several stages has several rows), oldest first. */
    const payableBills = useMemo<PayableBill[]>(() => {
        const byId = new Map<string, PayableBill>();
        for (const row of rows) {
            const bill = liveBill(row);
            if (!bill || byId.has(bill.id) || !stepsOf(bill).pay) continue;
            byId.set(bill.id, { bill, label: row.covers.length ? row.covers.join(" + ") : row.stageName });
        }
        const dateOf = (item: PayableBill) => new Date(item.bill.billDate ?? 0).getTime();
        return [...byId.values()].sort((a, b) => dateOf(a) - dateOf(b));
    }, [rows]);
    const summary = data?.summary;
    const canBill = data?.capabilities.canBill ?? false;
    const canPay = data?.capabilities.canRecordPayment ?? false;
    const expandToggleRef = React.useRef<() => void>(() => undefined);
    const [expandAllOpen, setExpandAllOpen] = useState<boolean | null>(null);
    const onExpandApi = React.useCallback((api: { allOpen: boolean; toggle: () => void } | null) => {
        if (!api) {
            setExpandAllOpen(null);
            return;
        }
        expandToggleRef.current = api.toggle;
        setExpandAllOpen((prev) => (prev === api.allOpen ? prev : api.allOpen));
    }, []);

    /**
     * The page's money, in the company's billing vocabulary — the same words and the
     * same arithmetic as the Billing Tracker and the Invoice Tracker, so a project
     * reads identically on all three screens:
     *
     *   PO Value       commercials total (excl. GST) — Tracker's "PO Value".
     *   Total Received cash in — Tracker's "Total Received".
     *   Total Pending  PO Value − Total Received — Tracker's "Total Pending", with
     *                  its "% of PO". Server-computed (`summary.pending`).
     *   Both PO figures show only once the PO is approved, as in the Tracker.
     *
     *   Per bill (Invoice Tracker): Bill Amount = basic − TDS, GST, TDS, and
     *   Bill Value = basic + GST = Bill Amount + TDS + GST.
     */
    const money = useMemo(() => {
        // Each component's total and the part still open, settled flag by flag exactly as
        // the Invoice Tracker marks them (Received / Awaited, Deposited / Not deposited).
        const m = {
            billValue: 0, billReceived: 0,
            billAmount: 0, billAmountReceived: 0,
            gst: 0, gstReceived: 0,
            tds: 0, tdsDeposited: 0,
        };
        const seen = new Set<string>();
        rows.forEach((row) => {
            const bill = liveBill(row);
            if (!bill || seen.has(bill.id)) return;
            seen.add(bill.id);
            const basic = bill.amount - bill.tdsAmount;
            m.billValue += bill.totalAmount;
            m.billReceived += bill.receivedAmount;
            m.billAmount += basic;
            if (bill.basicPaid) m.billAmountReceived += basic;
            m.gst += bill.gstAmount;
            if (bill.gstPaid) m.gstReceived += bill.gstAmount;
            m.tds += bill.tdsAmount;
            if (bill.tdsDeposited) m.tdsDeposited += bill.tdsAmount;
        });
        return m;
    }, [rows]);

    const poApproved = data?.project.poApproved ?? false;
    const poValue = poApproved ? summary?.totalBilling ?? 0 : null;
    const totalPending = poApproved ? summary?.pending ?? 0 : null;
    /** Tracker's "% of PO", and its complement for the progress bar. */
    const pendingPct = poValue && totalPending !== null ? Math.round((totalPending / poValue) * 1000) / 10 : null;
    const receivedPct = pendingPct === null ? null : Math.min(100, Math.max(0, Math.round(100 - pendingPct)));

    const filterCount = (tab: BillingFilterTab) => rows.filter(FILTERS[tab].match).length;

    /** One stage's next steps, as buttons. */
    const actionsFor = (row: ProjectBillingRow) => {
        const bill = liveBill(row);
        // Contextual, not a CTA: the kit's quiet `inverted` look at row size.
        const step = (label: string, onClick: () => void, disabled: boolean) => (
            <Button size="xs" variant="inverted" disabled={disabled} onClick={onClick} className="h-7 whitespace-nowrap text-xs px-2.5 font-medium">{label}</Button>
        );

        if (!bill) {
            // Billable at any work done.
            return (
                <div data-billing-actions className="flex flex-nowrap items-center justify-end gap-1.5">
                    {!row.blockReason && step("Raise proforma", () => setRaiseOn(row), !canBill || raise.isPending)}
                </div>
            );
        }

        const steps = stepsOf(bill);
        // One rule for both documents: Raise it when it does not exist, Edit it while it is a draft, Open it once it is final.
        const docStep = (noun: string, documentId: string | null, status: string | null | undefined) =>
            !documentId ? `Raise ${noun}` : status === "DRAFT" ? `Edit ${noun}` : `Open ${noun}`;
        return (
            <div data-billing-actions className="flex flex-nowrap items-center justify-end gap-1.5">
                {steps.proforma && step(
                    docStep("proforma", bill.proformaDocumentId, bill.proformaStatus),
                    () => bill.proformaDocumentId && bill.proformaStatus === "DRAFT"
                        ? openDocument(bill.proformaDocumentId, "DRAFT")
                        : proforma.mutate(bill.id),
                    !canBill || proforma.isPending,
                )}

                {/* After the proforma, paying and billing are separate steps — either order, or both. */}
                {steps.pay && step(
                    "Record payment",
                    () => requireApproved([bill], "record a payment", () => setPayOn(row)),
                    !canPay || pay.isPending,
                )}

                {steps.raiseBill && step(
                    docStep("bill", bill.invoiceDocumentId, bill.invoiceStatus),
                    () => requireApproved(
                        [bill],
                        bill.invoiceDocumentId ? "edit the bill" : "raise the bill",
                        () => bill.invoiceDocumentId && bill.invoiceStatus === "DRAFT"
                            ? openDocument(bill.invoiceDocumentId, "DRAFT")
                            : invoice.mutate(bill.id),
                    ),
                    !canPay || invoice.isPending,
                )}

                {!steps.raiseBill && !steps.revisingProforma && bill.invoiceDocumentId && (
                    <Button size="xs" variant="ghost" className="h-7 whitespace-nowrap text-xs px-2 text-primary" onClick={() => openDocument(bill.invoiceDocumentId!, bill.invoiceStatus)}>
                        Open bill
                    </Button>
                )}
            </div>
        );
    };

    let body: React.ReactNode;
    if (!projectId) {
        body = <EmptyState title="No project loaded." />;
    } else if (isError) {
        body = (
            <EmptyState
                title="Could not load this project's billing"
                description={(error as any)?.response?.data?.message}
                action={<Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>}
            />
        );
    } else if (isLoading || !data || !summary) {
        body = <LoadingState />;
    } else {
        body = (
            <>
                <Card role="region" aria-label="Financial summary" variant="panel" className="gap-0 py-0">
                    <div className={cn("h-[3px]", totalPending && totalPending > 0 ? "bg-warning" : "bg-success")} />
                    <div className="p-3 sm:p-4">
                        <div className="mb-2.5 flex items-baseline justify-between gap-4">
                            <p className="text-xs font-semibold text-muted-foreground">Overview</p>
                            {receivedPct !== null && <p className={cn(NUM, "text-[13px] font-bold")}>{receivedPct}% received</p>}
                        </div>
                        {/* The flow of the contract: what was agreed, what has been billed (and how
                            much of that the client still owes), what is left to bill. One grid, so six
                            tiles pair up 2×3 on phones and 3×2 from sm — no orphan. */}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <SummaryTile
                                label="PO Value"
                                value={poValue}
                                hint={poApproved ? "Commercials total, excluding GST" : `PO not approved yet${data.project.poStatus ? ` (${data.project.poStatus})` : ""}`}
                            />
                            <SummaryTile
                                label="Total Billed"
                                value={money.billValue}
                                hint="Bill Value of raised bills: basic + GST"
                                done={{ amount: money.billReceived, verb: "Received" }}
                            />
                            <SummaryTile
                                label="Not billed"
                                value={summary.notBilled}
                                toneClass={summary.notBilled > 0 ? "text-warning-foreground" : undefined}
                                hint="Stage values with no bill raised yet, excluding GST"
                            />
                            <SummaryTile
                                label="Bill Amount"
                                value={money.billAmount}
                                hint="Basic minus TDS: the cash part of the bills"
                                done={{ amount: money.billAmountReceived, verb: "Received" }}
                            />
                            <SummaryTile label="GST" value={money.gst} done={{ amount: money.gstReceived, verb: "Received" }} />
                            <SummaryTile
                                label="TDS"
                                value={money.tds}
                                hint="Withheld by the client and deposited with the government"
                                done={{ amount: money.tdsDeposited, verb: "Deposited" }}
                            />
                        </div>
                    </div>
                </Card>

                <ProjectBillingToolbar
                    filterTab={filterTab}
                    onFilterTab={setFilterTab}
                    countOf={filterCount}
                    searchQuery={searchQuery}
                    onSearch={setSearchQuery}
                    sortBy={sortBy}
                    onSort={setSortBy}
                    expandAllOpen={expandAllOpen}
                    onToggleExpand={() => expandToggleRef.current()}
                />

                {/* ── stages ────────────────────────────────────────────────── */}
                {rows.length === 0 ? (
                    <EmptyState
                        title="No stages yet"
                        description="Stages are copied from the lead's payment plan when it becomes a project. Select a payment plan on the lead, then reopen this tab."
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        {/* Which fee split these stages are — every project's table looks alike otherwise. */}
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
                            <span className="text-[12.5px] text-muted-foreground">Payment plan</span>
                            <span className="text-sm font-bold">{data.project.paymentPlan?.name ?? "No plan selected on the lead"}</span>
                            {data.project.stagesCustomised && (
                                <Tip title="The plan's stages were edited on the lead for this project.">
                                    <Badge variant="warning" className="border-warning/40">Customised for this project</Badge>
                                </Tip>
                            )}
                            <span className="text-[12.5px] text-muted-foreground">{rows.length} stage{rows.length === 1 ? "" : "s"}</span>
                        </div>
                        <ProjectBillingTree
                            projectId={projectId}
                            rows={rows}
                            filterTab={filterTab}
                            searchQuery={searchQuery}
                            sortBy={sortBy}
                            actionsFor={actionsFor}
                            onOpenDocument={openDocument}
                            onExpandApi={onExpandApi}
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <KitProvider>
            {/* data-slot opts this subtree into the kit's px scale (main.css: the app root is 13px).
                Phones: extra bottom room so the fixed bottom nav never covers the last card. */}
            <div data-slot="project-billing" className="mx-auto flex max-w-[1600px] flex-col gap-4 pb-28 text-foreground sm:gap-5 md:pb-12">
                {body}

                {/* Document and Mutation Dialogs */}
                <BillDocumentDialog
                    target={docTarget}
                    onClose={() => { setDocTarget(null); refresh(); }}
                    onModeChange={setDocTarget}
                />

                <RaiseBillDialog
                    open={Boolean(raiseOn)}
                    stages={billableStages}
                    fromStageId={raiseOn?.stageId ?? null}
                    busy={raise.isPending}
                    onClose={() => setRaiseOn(null)}
                    onSubmit={(input) => raise.mutate(input)}
                />

                <RecordPaymentDialog
                    open={Boolean(payOn)}
                    bill={payOn?.bill ?? null}
                    stageName={payOn?.stageName}
                    busy={pay.isPending}
                    onClose={() => setPayOn(null)}
                    onSubmit={(input) => payOn?.bill && pay.mutate({ billId: payOn.bill.id, input })}
                    onSplit={payableBills.length > 1 ? () => { setPayOn(null); setSplitOpen(true); } : undefined}
                />

                <SplitPaymentDialog
                    open={splitOpen}
                    bills={payableBills}
                    busy={split.isPending}
                    onClose={() => setSplitOpen(false)}
                    // Checked on the bills actually chosen in the split, not every payable bill on the project.
                    onSubmit={(input) => requireApproved(
                        payableBills.filter((p) => input.allocations.some((a) => a.billId === p.bill.id)).map((p) => p.bill),
                        "record this payment",
                        () => split.mutate(input),
                    )}
                />

                <ProformaApprovalDialog
                    request={approvalAsk}
                    onClose={() => setApprovalAsk(null)}
                    onApproved={refresh}
                />

            </div>
        </KitProvider>
    );
};

export default ProjectBillingWorkspace;
