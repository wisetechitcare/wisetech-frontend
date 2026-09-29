import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert, Box, DialogActions, DialogContent, Divider, IconButton, InputAdornment, Menu, MenuItem,
    Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, toast,
} from "@app/modules/common/components/ui";
import { apiErrorMessage } from "@utils/apiError";
import {
    getProjectStages, createProjectDeliverable, updateProjectDeliverable, deleteProjectDeliverable,
    reorderProjectDeliverables, updateDeliverableStatus, updateDeliverableRemarks,
    type DeliverablePayload, type DeliverableStatus, type ProjectDeliverable, type ProjectStage,
} from "@services/projectExecution";
import DeliverableFormDialog from "../DeliverableFormDialog";
import { confirmDialog } from "@app/modules/common/components/ui/feedback";
import { ToneChip } from "@app/modules/common/components/ui/chips";
import { BillingLoadingState } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import {
    getProjectBilling, raiseBill, recordBillPayment, cancelBill, openProforma,
    openTaxInvoice, setTdsDeposited,
    type ProjectBillingRow, type RaiseBillInput, type RecordPaymentInput,
} from "@services/bills";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import { RaiseBillDialog, RecordPaymentDialog } from "./BillDialogs";
import BillDocumentDialog, { type BillDocumentTarget } from "./BillDocumentDialog";
import ProjectBillingTree, {
    FILTERS, attentionOf, liveBill,
    type BillingFilterTab, type BillingSortOption,
} from "./ProjectBillingTree";

const QUERY_KEY = (projectId: string) => ["project-billing", projectId];

const MENU_ITEM_SX = { fontSize: 13, gap: 1.25, py: 0.85 };

/** The stages + deliverables the Execution tab used to own — now managed from here. */
const STAGES_KEY = (projectId: string) => ["project-execution", "stages", projectId];

const REMARKS_MAX = 2000;

const WORK_STATUS: Record<DeliverableStatus, { label: string; icon: string }> = {
    PENDING: { label: "Not started", icon: "abstract-8" },
    IN_PROGRESS: { label: "In progress", icon: "time" },
    COMPLETED: { label: "Completed", icon: "check-circle" },
};

const NUM = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

/** One figure in the summary panel: label, amount, and the one line that qualifies it. */
const Headline: React.FC<{ label: string; value: number | null; note: string; tone?: string; divider?: boolean }> = ({
    label, value, note, tone, divider = true,
}) => (
    <Box sx={{ pr: 2, borderRight: divider ? { md: "1px solid" } : 0, borderColor: { md: "divider" }, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>{label}</Typography>
        <Typography sx={{ ...NUM, fontSize: { xs: 19, sm: 22 }, fontWeight: 700, lineHeight: 1.25, mt: 0.5, color: value === null ? "text.disabled" : tone ?? "text.primary" }}>
            {value === null ? "—" : formatCurrencyDecimal(value)}
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>{note}</Typography>
    </Box>
);

/** A secondary figure: quiet label, quiet number, no chrome. */
const Aside: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone }) => (
    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
        {label}{" "}
        <Box component="span" sx={{ ...NUM, fontWeight: 600, color: tone ?? "text.primary" }}>{value}</Box>
    </Typography>
);

const ProjectBillingWorkspace: React.FC<{ projectId: string }> = ({ projectId }) => {
    const queryClient = useQueryClient();

    const [raiseOn, setRaiseOn] = useState<ProjectBillingRow | null>(null);
    const [payOn, setPayOn] = useState<ProjectBillingRow | null>(null);
    const [docTarget, setDocTarget] = useState<BillDocumentTarget | null>(null);
    const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; row: ProjectBillingRow } | null>(null);

    // Filter, search and sort state
    const [filterTab, setFilterTab] = useState<BillingFilterTab>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<BillingSortOption>("STAGE");

    // Deliverable management (formerly the Execution tab).
    const [deliverableForm, setDeliverableForm] = useState<{ stage: ProjectStage; editing: ProjectDeliverable | null } | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [remarksOn, setRemarksOn] = useState<ProjectDeliverable | null>(null);
    const [remarks, setRemarks] = useState("");

    const stagesKey = STAGES_KEY(projectId);
    const { data: stages = [] } = useQuery({
        queryKey: stagesKey,
        queryFn: () => getProjectStages(projectId),
        enabled: Boolean(projectId),
    });

    /** Billing rows and execution deliverables share ids — this joins them. */
    const deliverableIndex = useMemo(() => {
        const index = new Map<string, { deliverable: ProjectDeliverable; stage: ProjectStage }>();
        stages.forEach((stage) => stage.deliverables.forEach((deliverable) => index.set(deliverable.id, { deliverable, stage })));
        return index;
    }, [stages]);

    const queryKey = QUERY_KEY(projectId);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => getProjectBilling(projectId),
        enabled: Boolean(projectId),
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey });

    /** A work or deliverable change moves billing figures too, so both re-read. */
    const refreshAll = () => {
        void queryClient.invalidateQueries({ queryKey: stagesKey });
        void refresh();
    };

    // ── deliverable management (was the Execution tab) ──────────────────────

    const saveDeliverable = useMutation({
        mutationFn: async (payload: DeliverablePayload) => {
            if (!deliverableForm) return;
            return deliverableForm.editing
                ? updateProjectDeliverable(deliverableForm.editing.id, payload)
                : createProjectDeliverable(projectId, deliverableForm.stage.id, payload);
        },
        onSuccess: () => {
            toast({ icon: "success", title: deliverableForm?.editing ? "Deliverable updated" : "Deliverable added" });
            setDeliverableForm(null);
            setFormError(null);
            refreshAll();
        },
        onError: (err: unknown) => setFormError(apiErrorMessage(err, "Could not save the deliverable.")),
    });

    const openDeliverableForm = (stageId: string, deliverableId?: string) => {
        const stage = stages.find((s) => s.id === stageId);
        if (!stage) return;
        setFormError(null);
        setDeliverableForm({ stage, editing: deliverableId ? deliverableIndex.get(deliverableId)?.deliverable ?? null : null });
    };

    /** Status only — started/completed dates and the completer are derived server-side. */
    const setWorkStatus = async (deliverableId: string, status: DeliverableStatus) => {
        try {
            await updateDeliverableStatus(deliverableId, status);
            toast({ icon: "success", title: `Marked ${WORK_STATUS[status].label.toLowerCase()}` });
        } catch (err) {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not update the work status") });
        }
        refreshAll();
    };

    const openRemarks = (deliverableId: string) => {
        const deliverable = deliverableIndex.get(deliverableId)?.deliverable;
        if (!deliverable) return;
        setRemarksOn(deliverable);
        setRemarks(deliverable.remarks ?? "");
    };

    const saveRemarks = async () => {
        if (!remarksOn) return;
        try {
            await updateDeliverableRemarks(remarksOn.id, remarks.trim() || null);
            toast({ icon: "success", title: "Remarks saved" });
            setRemarksOn(null);
            refreshAll();
        } catch (err) {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not save the remarks") });
        }
    };

    const removeDeliverable = async (deliverableId: string) => {
        const found = deliverableIndex.get(deliverableId);
        if (!found) return;
        const { deliverable, stage } = found;
        const share = Number(deliverable.percentage) || 0;
        const ok = await confirmDialog({
            icon: "warning",
            title: `Remove "${deliverable.name}"?`,
            // The remaining shares are NOT redistributed — say what that does to the stage.
            text: share > 0
                ? `The stage will drop to ${Math.round((stage.allocation.percentageTotal - share) * 1000) / 1000}% and must be brought back to 100%.`
                : "This removes it from this project only.",
            confirmText: "Remove deliverable",
            danger: true,
        });
        if (!ok) return;
        try {
            const { allocation } = await deleteProjectDeliverable(deliverableId);
            toast(allocation && !allocation.isBalanced
                ? { icon: "warning", title: `Stage is now ${allocation.percentageTotal}% — reallocate to 100%` }
                : { icon: "success", title: "Deliverable removed" });
        } catch (err) {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not remove the deliverable") });
        }
        refreshAll();
    };

    /** One step up or down within its stage — replaces Execution's drag handle. */
    const moveDeliverable = async (deliverableId: string, direction: -1 | 1) => {
        const found = deliverableIndex.get(deliverableId);
        if (!found) return;
        const ids = found.stage.deliverables.map((d) => d.id);
        const from = ids.indexOf(deliverableId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= ids.length) return;
        [ids[from], ids[to]] = [ids[to], ids[from]];
        try {
            await reorderProjectDeliverables(found.stage.id, ids);
        } catch (err) {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not save the new order") });
        }
        refreshAll();
    };

    const openDocument = React.useCallback(
        (documentId: string, status?: string | null) =>
            setDocTarget({ documentId, mode: status === "DRAFT" ? "edit" : "manage" }),
        [],
    );

    const fail = (fallback: string) => (err: any) =>
        toast({ icon: "error", title: err?.response?.data?.message ?? fallback });

    const raise = useMutation({
        mutationFn: (input: RaiseBillInput) => raiseBill(input),
        onSuccess: ({ bill, documentId }) => {
            setRaiseOn(null);
            refresh();
            toast({ icon: "success", title: `Bill ${bill?.billNumber ?? ""} raised` });
            if (documentId) openDocument(documentId, "DRAFT");
        },
        onError: fail("Could not raise the bill"),
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

    const cancel = useMutation({
        mutationFn: (billId: string) => cancelBill(billId),
        onSuccess: () => { refresh(); toast({ icon: "success", title: "Bill cancelled" }); },
        onError: fail("Could not cancel the bill"),
    });

    const tds = useMutation({
        mutationFn: ({ billId, deposited }: { billId: string; deposited: boolean }) =>
            setTdsDeposited(billId, { deposited }),
        onSuccess: (_bill, vars) => {
            refresh();
            toast({
                icon: "success",
                title: vars.deposited ? "TDS marked as deposited" : "TDS deposit cleared",
            });
        },
        onError: fail("Could not update the TDS status"),
    });

    const confirmCancel = React.useCallback(async (row: ProjectBillingRow) => {
        const ok = await confirmDialog({
            title: `Cancel ${row.bill?.billNumber}?`,
            text: "The bill keeps its number and stays in the history. The deliverable becomes billable again.",
            confirmText: "Cancel bill",
            danger: true,
        });
        if (ok) cancel.mutate(row.bill!.id);
    }, [cancel]);

    const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
    const summary = data?.summary;
    const project = data?.project;
    const canBill = data?.capabilities.canBill ?? false;
    const canPay = data?.capabilities.canRecordPayment ?? false;

    /** Needs-attention breakdown — the same rule the "Needs attention" filter applies. */
    const attention = useMemo(() => {
        const counts = { READY_TO_BILL: 0, PROFORMA: 0, PAYMENT: 0, TAX_INVOICE: 0 };
        rows.forEach((row) => {
            const kind = attentionOf(row);
            if (kind) counts[kind] += 1;
        });
        return { ...counts, total: counts.READY_TO_BILL + counts.PROFORMA + counts.PAYMENT + counts.TAX_INVOICE };
    }, [rows]);

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
        let billValue = 0; let billAmount = 0; let gst = 0; let tds = 0; let notBilled = 0;
        rows.forEach((row) => {
            const bill = liveBill(row);
            if (bill) {
                billValue += bill.totalAmount;
                billAmount += bill.amount - bill.tdsAmount;
                gst += bill.gstAmount;
                tds += bill.tdsAmount;
            } else {
                notBilled += row.amount;
            }
        });
        return { billValue, billAmount, gst, tds, notBilled };
    }, [rows]);

    const poApproved = data?.project.poApproved ?? false;
    const poValue = poApproved ? summary?.totalBilling ?? 0 : null;
    const totalPending = poApproved ? summary?.pending ?? 0 : null;
    /** Tracker's "% of PO", and its complement for the progress bar. */
    const pendingPct = poValue && totalPending !== null ? Math.round((totalPending / poValue) * 1000) / 10 : null;
    const receivedPct = pendingPct === null ? null : Math.min(100, Math.max(0, Math.round(100 - pendingPct)));

    const filterCount = (tab: BillingFilterTab) => rows.filter(FILTERS[tab].match).length;

    /** Actions ladder for deliverables */
    const actionsFor = React.useCallback((row: ProjectBillingRow) => {
        const bill = liveBill(row);
        const btnSx = {
            // Contextual, not a CTA: the kit's quiet `inverted` look at row size,
            // with a squarer corner so a column of them does not read as pills.
            height: 30, minHeight: 30, fontSize: 12, fontWeight: 600, borderRadius: "8px",
            whiteSpace: "nowrap" as const, boxShadow: "none", px: 1.5,
        };

        // Every deliverable has a ⋮ now: it carries the work actions (status,
        // remarks, edit, reorder, remove) as well as the billing ones.
        const more = (
            <Tooltip title="More actions">
                <IconButton
                    size="small"
                    aria-label={`More actions for ${row.deliverableName}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        setRowMenu({ el: event.currentTarget, row });
                    }}
                    sx={{ width: 28, height: 28, borderRadius: "6px", color: "text.secondary" }}
                >
                    <KTIcon iconName="dots-vertical" className="fs-5" />
                </IconButton>
            </Tooltip>
        );

        if (!bill) {
            return (
                <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                    {row.workStatus === "COMPLETED" && !row.blockReason ? (
                        <WtButton
                            size="small" inverted disabled={!canBill || raise.isPending}
                            onClick={() => setRaiseOn(row)}
                            sx={btnSx}
                        >
                            Raise bill
                        </WtButton>
                    ) : row.workStatus !== "COMPLETED" ? (
                        // Unfinished work: the next step is finishing it, so that is the button.
                        <WtButton size="small" inverted onClick={() => void setWorkStatus(row.deliverableId, "COMPLETED")} sx={btnSx}>
                            Mark completed
                        </WtButton>
                    ) : null}
                    {more}
                </Stack>
            );
        }

        return (
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                {bill.status === "DRAFT" && (
                    <WtButton
                        size="small" inverted
                        disabled={!canBill || proforma.isPending}
                        onClick={() =>
                            bill.proformaDocumentId && bill.proformaStatus === "DRAFT"
                                ? openDocument(bill.proformaDocumentId, "DRAFT")
                                : proforma.mutate(bill.id)
                        }
                        sx={btnSx}
                    >
                        {bill.proformaDocumentId ? "Open proforma" : "Create proforma"}
                    </WtButton>
                )}

                {(bill.status === "PROFORMA" || bill.status === "PARTIALLY_PAID") && (
                    <WtButton
                        size="small" inverted disabled={!canPay || pay.isPending}
                        onClick={() => setPayOn(row)}
                        sx={btnSx}
                    >
                        Record payment
                    </WtButton>
                )}

                {bill.status === "PAID" && (
                    <Tooltip title="Payment received in full. Tax invoice can be issued.">
                        <span>
                            <WtButton
                                size="small" inverted disabled={!canPay || invoice.isPending}
                                onClick={() =>
                                    bill.invoiceDocumentId && bill.invoiceStatus === "DRAFT"
                                        ? openDocument(bill.invoiceDocumentId, "DRAFT")
                                        : invoice.mutate(bill.id)
                                }
                                sx={btnSx}
                            >
                                {bill.invoiceDocumentId ? "Open tax invoice" : "Create tax invoice"}
                            </WtButton>
                        </span>
                    </Tooltip>
                )}

                {bill.status === "INVOICED" && bill.invoiceDocumentId && (
                    <WtButton
                        size="small" ghost
                        onClick={() => openDocument(bill.invoiceDocumentId!, bill.invoiceStatus)}
                        sx={{ ...btnSx, color: "primary.main" }}
                    >
                        Open invoice
                    </WtButton>
                )}

                {more}
            </Stack>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canBill, canPay, openDocument, raise.isPending, proforma, pay.isPending, invoice]);

    if (!projectId) {
        return (
            <GlassCard preset="section" sx={{ p: 4, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No project loaded.</Typography>
            </GlassCard>
        );
    }

    if (isError) {
        return (
            <Alert
                severity="error"
                action={<WtButton size="small" ghost onClick={() => refetch()}>Retry</WtButton>}
            >
                {(error as any)?.response?.data?.message ?? "Could not load this project's billing."}
            </Alert>
        );
    }

    if (isLoading || !data || !summary) return <BillingLoadingState rows={5} />;

    return (
        <Stack spacing={2.5} sx={{ maxWidth: 1600, mx: "auto", pb: 6 }}>
            {/* ── page header: what this is, for whom ───────────────────── */}
            <Box>
                <Stack direction="row" alignItems="center" spacing={1.25} flexWrap="wrap" useFlexGap>
                    <Typography component="h2" sx={{ fontSize: 22, fontWeight: 600, lineHeight: 1.3 }}>
                        Billing and collections
                    </Typography>
                    {project?.projectNumber && <ToneChip tone="neutral" dense label={project.projectNumber} />}
                </Stack>
                <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={2.5} rowGap={0.25} sx={{ mt: 0.5 }}>
                    {project?.title && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{project.title}</Typography>}
                    {project?.clientName && <Aside label="Client" value={project.clientName} />}
                    {project?.clientGstNumber && <Aside label="GSTIN" value={project.clientGstNumber} />}
                    <Aside label="Currency" value={summary.currency} />
                </Stack>
            </Box>

            {/* ── financial position: one panel, not four cards ─────────── */}
            <Box component="section" aria-label="Financial summary" sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "10px", p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }, gap: 2.5 }}>
                    <Headline
                        label="PO Value"
                        value={poValue}
                        note={poApproved ? "Commercials total, excluding GST" : `PO not approved yet${data.project.poStatus ? ` (${data.project.poStatus})` : ""}`}
                    />
                    <Headline
                        label="Total Billed"
                        value={money.billValue}
                        note={money.notBilled > 0 ? `Bill Value of raised bills. ${formatCurrencyDecimal(money.notBilled)} not yet billed` : "Bill Value of raised bills"}
                    />
                    <Headline
                        label="Total Received"
                        value={summary.received}
                        note={summary.legacyReceived > 0
                            ? `Includes ${formatCurrencyDecimal(summary.legacyReceived)} billed the old way`
                            : "GST included, TDS deducted"}
                    />
                    <Headline
                        label="Total Pending"
                        value={totalPending}
                        tone={totalPending && totalPending > 0 ? "warning.dark" : undefined}
                        note={pendingPct !== null ? `${pendingPct}% of PO, PO Value − Total Received` : "Shown once the PO is approved"}
                        divider={false}
                    />
                </Box>

                <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
                    {receivedPct !== null && (
                        <>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 0.75 }}>
                                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Collection progress</Typography>
                                <Typography sx={{ ...NUM, fontSize: 12.5, color: "text.secondary" }}>
                                    <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>{receivedPct}%</Box> of PO received
                                </Typography>
                            </Stack>
                            <Box
                                role="progressbar"
                                aria-label="Collection progress"
                                aria-valuenow={receivedPct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                sx={{ height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden", mb: 1.5 }}
                            >
                                <Box sx={{ width: `${receivedPct}%`, height: "100%", bgcolor: "success.main", borderRadius: 3 }} />
                            </Box>
                        </>
                    )}
                    {/* The bill breakdown in Invoice Tracker columns: Bill Amount + TDS + GST = Bill Value. */}
                    <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={3} rowGap={0.5}>
                        <Aside label="Bill Amount" value={formatCurrencyDecimal(money.billAmount)} />
                        <Aside label="GST" value={formatCurrencyDecimal(money.gst)} />
                        <Aside
                            label="TDS"
                            value={summary.tdsPending > 0
                                ? `${formatCurrencyDecimal(money.tds)} (${formatCurrencyDecimal(summary.tdsPending)} not deposited)`
                                : formatCurrencyDecimal(money.tds)}
                            tone={summary.tdsPending > 0 ? "warning.dark" : undefined}
                        />
                        <Aside label="Awaited on raised bills" value={formatCurrencyDecimal(summary.billedUnpaid)} />
                        <Aside label="Done, not billed" value={formatCurrencyDecimal(summary.doneNotBilled)} />
                    </Stack>
                </Box>
            </Box>

            {/* ── needs attention: what is waiting on us, by kind ───────── */}
            {attention.total > 0 && (
                <Box
                    component="section"
                    aria-label="Needs attention"
                    sx={{
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: 1.5,
                        px: 2,
                        py: 1.25,
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: filterTab === "NEEDS_ATTENTION" ? "warning.main" : "divider",
                        borderLeft: "3px solid",
                        borderLeftColor: "warning.main",
                        bgcolor: "background.paper",
                    }}
                >
                    <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap columnGap={2.5} rowGap={0.75}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>
                            Needs attention · {attention.total}
                        </Typography>
                        {([
                            ["READY_TO_BILL", "ready to bill"],
                            ["PROFORMA", "proforma to finalise"],
                            ["PAYMENT", "payment pending"],
                            ["TAX_INVOICE", "tax invoice pending"],
                        ] as const).filter(([k]) => attention[k] > 0).map(([k, text]) => (
                            <Typography key={k} sx={{ fontSize: 12.5, color: "text.secondary" }}>
                                <Box component="span" sx={{ ...NUM, fontWeight: 700, color: "text.primary" }}>{attention[k]}</Box> {text}
                            </Typography>
                        ))}
                    </Stack>
                    <WtButton
                        size="small"
                        ghost
                        onClick={() => setFilterTab(filterTab === "NEEDS_ATTENTION" ? "ALL" : "NEEDS_ATTENTION")}
                        sx={{ minHeight: 30, height: 30, fontSize: 12, whiteSpace: "nowrap" }}
                    >
                        {filterTab === "NEEDS_ATTENTION" ? "Show everything" : "Show only these"}
                    </WtButton>
                </Box>
            )}

            {/* ── filter, search, sort: one compact line ────────────────── */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "stretch", md: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                }}
            >
                <PeriodTabs
                    value={filterTab}
                    onChange={(v) => setFilterTab(v as BillingFilterTab)}
                    ariaLabel="Filter deliverables"
                    options={(Object.keys(FILTERS) as BillingFilterTab[]).map((tab) => ({
                        value: tab,
                        label: tab === "ALL" ? FILTERS[tab].label : `${FILTERS[tab].label} ${filterCount(tab)}`,
                    }))}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                        size="small"
                        placeholder="Search deliverables, proformas, invoices"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        inputProps={{ "aria-label": "Search deliverables, proformas and invoices" }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <KTIcon iconName="magnifier" className="fs-6" />
                                </InputAdornment>
                            ),
                            endAdornment: searchQuery ? (
                                <InputAdornment position="end">
                                    <IconButton size="small" aria-label="Clear search" onClick={() => setSearchQuery("")}>
                                        <KTIcon iconName="cross" className="fs-7" />
                                    </IconButton>
                                </InputAdornment>
                            ) : null,
                            sx: { height: 34, fontSize: 12.5, minWidth: { sm: 280 }, bgcolor: "background.paper" },
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as BillingSortOption)}
                        inputProps={{ "aria-label": "Sort deliverables" }}
                        InputProps={{ sx: { height: 34, fontSize: 12.5, minWidth: 190, bgcolor: "background.paper" } }}
                    >
                        <MenuItem value="STAGE" sx={{ fontSize: 12.5 }}>Sort: stage order</MenuItem>
                        <MenuItem value="OUTSTANDING" sx={{ fontSize: 12.5 }}>Sort: pending on bill</MenuItem>
                        <MenuItem value="RECENT" sx={{ fontSize: 12.5 }}>Sort: recent activity</MenuItem>
                    </TextField>
                </Stack>
            </Box>

            {/* ── stages ────────────────────────────────────────────────── */}
            {rows.length === 0 && stages.length === 0 ? (
                <Box sx={{ py: 5, px: 3, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: "10px" }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No stages yet</Typography>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                        Stages are copied from the lead&apos;s payment plan when it becomes a project.
                        Select a payment plan on the lead, then reopen this tab.
                    </Typography>
                </Box>
            ) : (
                <ProjectBillingTree
                    projectId={projectId}
                    rows={rows}
                    stages={stages}
                    onAddDeliverable={(stageId) => openDeliverableForm(stageId)}
                    filterTab={filterTab}
                    searchQuery={searchQuery}
                    sortBy={sortBy}
                    actionsFor={actionsFor}
                    onOpenDocument={openDocument}
                    onToggleTds={(billId, deposited) => tds.mutate({ billId, deposited })}
                    canRecordPayment={canPay}
                    busy={tds.isPending}
                />
            )}

            {/* Overflow Context Menu */}
            <Menu
                open={Boolean(rowMenu)}
                anchorEl={rowMenu?.el}
                onClose={() => setRowMenu(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { minWidth: 210, borderRadius: "10px" } } }}
            >
                {(() => {
                    const row = rowMenu?.row;
                    if (!row) return null;
                    const bill = row.bill;
                    const close = () => setRowMenu(null);
                    const heading = (key: string, text: string) => (
                        <Typography key={key} sx={{ px: 2, pt: 1, pb: 0.5, fontSize: 11.5, fontWeight: 600, color: "text.secondary" }}>
                            {text}
                        </Typography>
                    );
                    const item = (key: string, icon: string, label: string, onClick: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
                        <MenuItem
                            key={key}
                            disabled={opts.disabled}
                            sx={{ ...MENU_ITEM_SX, ...(opts.danger ? { color: "error.main" } : {}) }}
                            onClick={() => { close(); onClick(); }}
                        >
                            <KTIcon iconName={icon} className="fs-6" />
                            {label}
                        </MenuItem>
                    );

                    const items: React.ReactNode[] = [];
                    const danger: React.ReactNode[] = [];

                    // ── Work (formerly the Execution tab) ──────────────────────
                    const found = deliverableIndex.get(row.deliverableId);
                    const billed = Boolean(liveBill(row));
                    items.push(heading("work-h", "Work"));
                    // Billed work stays complete: reopening it would leave a bill
                    // raised against unfinished work.
                    if (!billed) {
                        (["COMPLETED", "IN_PROGRESS", "PENDING"] as DeliverableStatus[])
                            .filter((status) => status !== row.workStatus)
                            .forEach((status) => items.push(item(
                                `status-${status}`,
                                WORK_STATUS[status].icon,
                                `Mark ${WORK_STATUS[status].label.toLowerCase()}`,
                                () => void setWorkStatus(row.deliverableId, status),
                            )));
                    }
                    if (found) {
                        const position = found.stage.deliverables.findIndex((d) => d.id === row.deliverableId);
                        items.push(item("remarks", "notepad-edit", found.deliverable.remarks ? "Edit remarks" : "Add remarks", () => openRemarks(row.deliverableId)));
                        items.push(item("edit", "pencil", "Edit deliverable", () => openDeliverableForm(row.stageId, row.deliverableId)));
                        items.push(item("up", "arrow-up", "Move up", () => void moveDeliverable(row.deliverableId, -1), { disabled: position <= 0 }));
                        items.push(item("down", "arrow-down", "Move down", () => void moveDeliverable(row.deliverableId, 1), {
                            disabled: position < 0 || position >= found.stage.deliverables.length - 1,
                        }));
                        if (!billed) {
                            danger.push(item("remove", "trash", "Remove deliverable", () => void removeDeliverable(row.deliverableId), { danger: true }));
                        }
                    }

                    // ── Billing ─────────────────────────────────────────────────
                    if (bill) {
                        // The overflow never repeats the row's primary button.
                        const primaryIs =
                            bill.status === "DRAFT" ? "proforma"
                                : bill.status === "PROFORMA" || bill.status === "PARTIALLY_PAID" ? "pay"
                                    : bill.status === "PAID" || bill.status === "INVOICED" ? "invoice"
                                        : "none";
                        const billing: React.ReactNode[] = [];
                        if (bill.proformaDocumentId && primaryIs !== "proforma") {
                            billing.push(item("proforma", "document",
                                `${bill.proformaStatus === "DRAFT" ? "Edit" : "Open"} proforma ${bill.proformaNumber ?? ""}`,
                                () => openDocument(bill.proformaDocumentId!, bill.proformaStatus)));
                        }
                        if (bill.invoiceDocumentId && primaryIs !== "invoice") {
                            billing.push(item("invoice", "receipt-square",
                                `${bill.invoiceStatus === "DRAFT" ? "Edit" : "Open"} tax invoice ${bill.invoiceNumber ?? ""}`,
                                () => openDocument(bill.invoiceDocumentId!, bill.invoiceStatus)));
                        }
                        if (canPay && primaryIs !== "pay" && bill.status !== "DRAFT"
                            && bill.status !== "CANCELLED" && bill.outstandingAmount > 0) {
                            billing.push(item("pay", "wallet", "Record payment", () => setPayOn(row)));
                        }
                        if (bill.tdsAmount > 0 && canPay) {
                            billing.push(item("tds", "shield-tick",
                                bill.tdsDeposited ? "Mark TDS not deposited" : "Mark TDS deposited",
                                () => tds.mutate({ billId: bill.id, deposited: !bill.tdsDeposited })));
                        }
                        if (billing.length) {
                            items.push(<Divider key="billing-sep" sx={{ my: 0.5 }} />, heading("billing-h", "Billing"), ...billing);
                        }
                        // Refused once money has arrived — that is a payment to unpick first.
                        if (bill.status !== "CANCELLED" && bill.status !== "INVOICED" && bill.receivedAmount <= 0) {
                            danger.unshift(item("cancel", "cross-circle", "Cancel bill", () => void confirmCancel(row), { danger: true }));
                        }
                    }

                    if (danger.length) items.push(<Divider key="danger-sep" sx={{ my: 0.5 }} />, ...danger);
                    return items;
                })()}
            </Menu>

            {/* Document and Mutation Dialogs */}
            <BillDocumentDialog
                target={docTarget}
                onClose={() => { setDocTarget(null); refresh(); }}
                onModeChange={setDocTarget}
            />

            <RaiseBillDialog
                open={Boolean(raiseOn)}
                row={raiseOn}
                busy={raise.isPending}
                onClose={() => setRaiseOn(null)}
                onSubmit={(input) => raise.mutate(input)}
            />

            <RecordPaymentDialog
                open={Boolean(payOn)}
                bill={payOn?.bill ?? null}
                deliverableName={payOn?.deliverableName}
                busy={pay.isPending}
                onClose={() => setPayOn(null)}
                onSubmit={(input) =>
                    payOn?.bill && pay.mutate({ billId: payOn.bill.id, input })
                }
            />

            {/* Add / edit a deliverable — the same form the Execution tab used. */}
            <DeliverableFormDialog
                open={Boolean(deliverableForm)}
                onClose={() => { setDeliverableForm(null); setFormError(null); }}
                onSubmit={(payload) => saveDeliverable.mutate(payload)}
                saving={saveDeliverable.isPending}
                serverError={formError}
                editing={deliverableForm?.editing ?? null}
                stageName={deliverableForm?.stage.name ?? ""}
                stageAmount={deliverableForm?.stage.amount ?? 0}
                siblings={deliverableForm?.stage.deliverables ?? []}
            />

            <GlassDialog
                open={Boolean(remarksOn)}
                onClose={() => setRemarksOn(null)}
                maxWidth="xs"
                header={
                    <GlassHeader
                        title="Remarks"
                        icon={<KTIcon iconName="notepad-edit" className="fs-2" />}
                        onClose={() => setRemarksOn(null)}
                    />
                }
            >
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{remarksOn?.name}</Typography>
                        <TextField
                            label="Remarks"
                            size="small"
                            fullWidth
                            multiline
                            minRows={3}
                            autoFocus
                            value={remarks}
                            helperText={`${remarks.trim().length}/${REMARKS_MAX}. Leave empty to clear.`}
                            inputProps={{ maxLength: REMARKS_MAX }}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Notes on this deliverable"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <WtButton ghost onClick={() => setRemarksOn(null)}>Cancel</WtButton>
                    <WtButton tone="primary" onClick={() => void saveRemarks()}>Save remarks</WtButton>
                </DialogActions>
            </GlassDialog>
        </Stack>
    );
};

export default ProjectBillingWorkspace;
