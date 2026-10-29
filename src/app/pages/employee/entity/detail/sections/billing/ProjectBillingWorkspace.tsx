import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert, Box, DialogActions, DialogContent, Divider, IconButton, InputAdornment, Menu, MenuItem,
    Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, GlassDialog, GlassHeader, WtButton, toast,
    AutoGrid,  TRIO,  CurrencySymbol,
} from "@app/modules/common/components/ui";
import { apiErrorMessage } from "@utils/apiError";
import { updateDeliverableProgress, updateDeliverableRemarks } from "@services/projectExecution";
import { confirmDialog } from "@app/modules/common/components/ui/feedback";
import { ToneChip } from "@app/modules/common/components/ui/chips";
import { BillingLoadingState } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import {
    getProjectBilling, raiseBill, recordBillPayment, cancelBill, openProforma,
    openTaxInvoice, setTdsDeposited,
    type ProjectBillingPayload, type ProjectBillingRow, type RaiseBillInput, type RecordPaymentInput,
    type StageDeliverable,
} from "@services/bills";
import PeriodTabs from "@app/modules/common/components/PeriodTabs";
import { RaiseBillDialog, RecordPaymentDialog } from "./BillDialogs";
import BillDocumentDialog, { type BillDocumentTarget } from "./BillDocumentDialog";
import ProjectBillingTree, {
    ActionGate, FILTERS, SORTS, liveBill, stageWorkProgress, statusForProgress,
    type BillingFilterTab, type BillingSortOption,
} from "./ProjectBillingTree";

const QUERY_KEY = (projectId: string) => ["project-billing", projectId];

const MENU_ITEM_SX = { fontSize: 13, gap: 1.25, py: 0.85 };

const REMARKS_MAX = 2000;

/** The payload with one deliverable's progress changed — what the next read will return. */
const withProgress = (data: ProjectBillingPayload, deliverableId: string, progress: number): ProjectBillingPayload => ({
    ...data,
    rows: data.rows.map((row) => {
        if (!row.deliverables.some((d) => d.id === deliverableId)) return row;
        const deliverables = row.deliverables.map((d) =>
            d.id === deliverableId ? { ...d, progress, status: statusForProgress(progress) } : d);
        return {
            ...row,
            deliverables,
            work: {
                ...row.work,
                progress: stageWorkProgress(deliverables),
                completed: deliverables.filter((d) => d.progress >= 100).length,
            },
        };
    }),
});

const NUM = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

/**
 * Same inset tile as the open-bill card — label, then the figure. `done` adds how much
 * of that figure has come in, as "₹done / ₹total received" over a bar.
 */
const Tile: React.FC<{
    label: string;
    value: number | null;
    tone?: string;
    hint?: string;
    done?: { amount: number; verb: string };
}> = ({ label, value, tone, hint, done }) => {
    const figure = (
        <Typography sx={{
            ...NUM, fontSize: { xs: 16, sm: 18 }, fontWeight: 700, lineHeight: 1.3,
            color: value === null ? "text.disabled" : tone ?? "text.primary",
        }}>
            {value === null ? "—" : formatCurrencyDecimal(value)}
        </Typography>
    );
    return (
        <Box
            sx={{
                minWidth: 0,
                px: 1.25,
                py: 1,
                borderRadius: "10px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.05 : 0.03),
            }}
        >
            <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", mb: 0.45, lineHeight: 1.3 }}>{label}</Typography>
            {hint ? (
                <Tooltip title={hint} placement="top">
                    <Box component="span" sx={{ display: "inline-block" }}>{figure}</Box>
                </Tooltip>
            ) : figure}
            {done && value !== null && value > 0 && (() => {
                const pct = Math.min(100, Math.round((done.amount / value) * 100));
                const full = pct >= 100;
                return (
                    <Box sx={{ mt: 0.75 }}>
                        <Box
                            role="progressbar"
                            aria-label={`${label} ${done.verb}`}
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            sx={{ height: 4, borderRadius: 2, bgcolor: "action.hover", overflow: "hidden" }}
                        >
                            <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: full ? "success.main" : "warning.main" }} />
                        </Box>
                        <Stack direction="row" flexWrap="wrap" justifyContent="space-between" alignItems="baseline" columnGap={1} sx={{ mt: 0.5 }}>
                            <Typography sx={{ ...NUM, fontSize: 12, color: "text.secondary" }}>
                                {done.verb}{" "}
                                <Box component="span" sx={{ fontWeight: 700, color: full ? "success.main" : "text.primary" }}>
                                    {formatCurrencyDecimal(done.amount)}
                                </Box>
                            </Typography>
                            <Typography sx={{ ...NUM, fontSize: 12, fontWeight: 700, color: full ? "success.main" : "text.secondary" }}>
                                {pct}%
                            </Typography>
                        </Stack>
                    </Box>
                );
            })()}
        </Box>
    );
};

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

    // Remarks on a deliverable — the one thing besides work done that is edited here.
    const [remarksOn, setRemarksOn] = useState<StageDeliverable | null>(null);
    const [remarks, setRemarks] = useState("");

    const queryKey = QUERY_KEY(projectId);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => getProjectBilling(projectId),
        enabled: Boolean(projectId),
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey });

    // ── work done (deliverables are tracked here, never created) ────────────

    /** Optimistic: the bar moves on release, and rolls back if the save fails. */
    const progress = useMutation({
        mutationFn: ({ deliverableId, value }: { deliverableId: string; value: number }) =>
            updateDeliverableProgress(deliverableId, value),
        onMutate: async ({ deliverableId, value }) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<ProjectBillingPayload>(queryKey);
            if (previous) queryClient.setQueryData(queryKey, withProgress(previous, deliverableId, value));
            return { previous };
        },
        onError: (err: unknown, _vars, context) => {
            if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
            toast({ icon: "error", title: apiErrorMessage(err, "Could not save the work done") });
        },
        onSettled: () => { void refresh(); },
    });

    const openRemarks = (deliverable: StageDeliverable) => {
        setRemarksOn(deliverable);
        setRemarks(deliverable.remarks ?? "");
    };

    const saveRemarks = async () => {
        if (!remarksOn) return;
        try {
            await updateDeliverableRemarks(remarksOn.id, remarks.trim() || null);
            toast({ icon: "success", title: "Remarks saved" });
            setRemarksOn(null);
            void refresh();
        } catch (err) {
            toast({ icon: "error", title: apiErrorMessage(err, "Could not save the remarks") });
        }
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
            text: "The bill keeps its number and stays in the history. The stage becomes billable again.",
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
        rows.forEach((row) => {
            const bill = liveBill(row);
            if (!bill) return;
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

    /** Actions ladder for deliverables */
    const actionsFor = React.useCallback((row: ProjectBillingRow) => {
        const bill = liveBill(row);
        const btnSx = {
            // Contextual, not a CTA: the kit's quiet `inverted` look at row size,
            // with a squarer corner so a column of them does not read as pills.
            height: 30, minHeight: 30, fontSize: 12, fontWeight: 600, borderRadius: "8px",
            whiteSpace: "nowrap" as const, boxShadow: "none", px: 1.5,
        };

        // The ⋮ carries the bill's secondary actions: documents, TDS, cancel.
        const more = (
            <Tooltip title="More actions">
                <IconButton
                    size="small"
                    aria-label={`More actions for ${row.stageName}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        setRowMenu({ el: event.currentTarget, row });
                    }}
                    sx={{
                        width: 28, height: 28, borderRadius: "6px", color: "text.secondary",
                        // A fingertip needs more than 28px.
                        "@media (pointer: coarse)": { width: 40, height: 40 },
                    }}
                >
                    <KTIcon iconName="dots-vertical" className="fs-5" />
                </IconButton>
            </Tooltip>
        );

        if (!bill) {
            return (
                // Billable at any work done; nothing else to do on an unbilled stage, so no ⋮.
                <ActionGate>
                    <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                        {!row.blockReason && (
                            <WtButton
                                size="small" inverted disabled={!canBill || raise.isPending}
                                onClick={() => setRaiseOn(row)}
                                sx={btnSx}
                            >
                                Raise bill
                            </WtButton>
                        )}
                    </Stack>
                </ActionGate>
            );
        }

        return (
            <ActionGate>
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

                {(bill.status === "PROFORMA" || bill.status === "AWAITING_PAYMENT" || bill.status === "PARTIALLY_PAID") && (
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
            </ActionGate>
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
        // Phones: extra bottom room so the fixed bottom nav never covers the last card.
        <Stack spacing={{ xs: 2, sm: 2.5 }} sx={{ maxWidth: 1600, mx: "auto", pb: { xs: 14, md: 6 } }}>
            <Box
                component="section"
                aria-label="Financial summary"
                sx={{
                    bgcolor: "background.paper",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "12px",
                    overflow: "hidden",
                }}
            >
                <Box sx={{ height: 3, bgcolor: totalPending && totalPending > 0 ? "warning.main" : "success.main" }} />
                <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} sx={{ mb: 1.25 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Overview</Typography>
                        {receivedPct !== null && (
                            <Typography sx={{ ...NUM, fontSize: 13, fontWeight: 700 }}>
                                {receivedPct}% received
                            </Typography>
                        )}
                    </Stack>
                    {/* The flow of the contract: what was agreed, what has been billed (and how
                        much of that the client still owes), what is left to bill. */}
                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))" }, gap: 1 }}>
                        <Tile
                            label="PO Value"
                            value={poValue}
                            hint={poApproved ? "Commercials total, excluding GST" : `PO not approved yet${data.project.poStatus ? ` (${data.project.poStatus})` : ""}`}
                        />
                        <Tile
                            label="Total Billed"
                            value={money.billValue}
                            hint="Bill Value of raised bills: basic + GST"
                            done={{ amount: money.billReceived, verb: "Received" }}
                        />
                        <Tile
                            label="Not billed"
                            value={summary.notBilled}
                            tone={summary.notBilled > 0 ? "warning.dark" : undefined}
                            hint="Stage values with no bill raised yet, excluding GST"
                        />
                        {/* What each bill is made of, and what of each part is still open.
                            One grid, so six tiles pair up 2×3 on phones and 3×2 from sm — no orphan. */}
                        <Tile
                            label="Bill Amount"
                            value={money.billAmount}
                            hint="Basic minus TDS: the cash part of the bills"
                            done={{ amount: money.billAmountReceived, verb: "Received" }}
                        />
                        <Tile
                            label="GST"
                            value={money.gst}
                            done={{ amount: money.gstReceived, verb: "Received" }}
                        />
                        <Tile
                            label="TDS"
                            value={money.tds}
                            hint="Withheld by the client and deposited with the government"
                            done={{ amount: money.tdsDeposited, verb: "Deposited" }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* ── filter, search, sort: one compact line ────────────────── */}
            {/* Wraps instead of switching direction at a breakpoint: tabs and controls share
                a line while they fit, and the controls drop below as one block when not. */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                }}
            >
                <PeriodTabs
                    value={filterTab}
                    onChange={(v) => setFilterTab(v as BillingFilterTab)}
                    ariaLabel="Filter deliverables"
                    // Phones: one swipeable row instead of a two-row wrap; tabs keep a
                    // readable width and a 40px touch height.
                    sx={{
                        "@media (max-width: 599.95px)": {
                            flexWrap: "nowrap",
                            overflowX: "auto",
                            scrollbarWidth: "none",
                            "&::-webkit-scrollbar": { display: "none" },                        },
                        "&& .MuiToggleButtonGroup-grouped": {
                            "@media (max-width: 599.95px)": { flex: "0 0 auto", minHeight: 40, px: 1.75 },
                        },
                    }}
                    options={(Object.keys(FILTERS) as BillingFilterTab[]).map((tab) => ({
                        value: tab,
                        label: tab === "ALL" ? FILTERS[tab].label : `${FILTERS[tab].label} ${filterCount(tab)}`,
                    }))}
                />
                {/* One line from sm up (search takes the slack, sort and Expand all keep their size);
                    when the tabs leave too little room the whole block drops below them intact. */}
                <Stack direction="row" flexWrap={{ xs: "wrap", sm: "nowrap" }} justifyContent="flex-end" gap={1} sx={{ flex: "1 1 28rem", minWidth: 0 }}>
                    <TextField
                        size="small"
                        placeholder="Search deliverables, proformas, invoices"
                        sx={{ flex: { xs: "1 1 100%", sm: "1 1 10rem" }, minWidth: 0, maxWidth: { sm: 360 } }}
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
                            sx: { height: { xs: 40, sm: 34 }, fontSize: 12.5, bgcolor: "background.paper" },
                        }}
                    />
                    <TextField
                        select
                        size="small"
                        sx={{ flex: { xs: 1, sm: "0 0 auto" } }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as BillingSortOption)}
                        inputProps={{ "aria-label": "Sort deliverables" }}
                        InputProps={{ sx: { height: { xs: 40, sm: 34 }, fontSize: 12.5, minWidth: { xs: 0, sm: 176 }, bgcolor: "background.paper" } }}
                    >
                        {(Object.keys(SORTS) as BillingSortOption[]).map((key) => (
                            <MenuItem key={key} value={key} sx={{ fontSize: 12.5 }}>Sort: {SORTS[key].label}</MenuItem>
                        ))}
                    </TextField>
                    {expandAllOpen !== null && (
                        <WtButton
                            size="small"
                            ghost
                            onClick={() => expandToggleRef.current()}
                            sx={{ minHeight: { xs: 40, sm: 34 }, height: { xs: 40, sm: 34 }, fontSize: 12.5, color: "text.secondary", px: 1.25, whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                            {expandAllOpen ? "Collapse all" : "Expand all"}
                        </WtButton>
                    )}
                </Stack>
            </Box>

            {/* ── stages ────────────────────────────────────────────────── */}
            {rows.length === 0 ? (
                <Box sx={{ py: 5, px: 3, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: "10px" }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>No stages yet</Typography>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                        Stages are copied from the lead&apos;s payment plan when it becomes a project.
                        Select a payment plan on the lead, then reopen this tab.
                    </Typography>
                </Box>
            ) : (
                <Stack spacing={1}>
                {/* Which fee split these stages are — every project's table looks alike otherwise. */}
                <Stack direction="row" flexWrap="wrap" alignItems="baseline" columnGap={1} rowGap={0.5} sx={{ px: 0.5 }}>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Payment plan</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                        {data.project.paymentPlan?.name ?? "No plan selected on the lead"}
                    </Typography>
                    {data.project.stagesCustomised && (
                        <Tooltip title="The plan's stages were edited on the lead for this project.">
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "warning.dark" }}>
                                Customised for this project
                            </Typography>
                        </Tooltip>
                    )}
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
                        {rows.length} stage{rows.length === 1 ? "" : "s"}
                    </Typography>
                </Stack>
                <ProjectBillingTree
                    projectId={projectId}
                    rows={rows}
                    filterTab={filterTab}
                    searchQuery={searchQuery}
                    sortBy={sortBy}
                    actionsFor={actionsFor}
                    onOpenDocument={openDocument}
                    onToggleTds={(billId, deposited) => tds.mutate({ billId, deposited })}
                    canRecordPayment={canPay}
                    busy={tds.isPending}
                    onSetProgress={(deliverableId, value) => progress.mutate({ deliverableId, value })}
                    onEditRemarks={openRemarks}
                    onExpandApi={onExpandApi}
                />
                </Stack>
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

                    // ── Billing ─────────────────────────────────────────────────
                    if (bill) {
                        // The overflow never repeats the row's primary button.
                        const primaryIs =
                            bill.status === "DRAFT" ? "proforma"
                                : bill.status === "PROFORMA" || bill.status === "AWAITING_PAYMENT" || bill.status === "PARTIALLY_PAID" ? "pay"
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
                        items.push(...billing);
                        // Refused once money has arrived — that is a payment to unpick first.
                        if (bill.status !== "CANCELLED" && bill.status !== "INVOICED" && bill.receivedAmount <= 0) {
                            danger.unshift(item("cancel", "cross-circle", "Cancel bill", () => void confirmCancel(row), { danger: true }));
                        }
                    }

                    if (danger.length) items.push(...(items.length ? [<Divider key="danger-sep" sx={{ my: 0.5 }} />] : []), ...danger);
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
                stageName={payOn?.stageName}
                busy={pay.isPending}
                onClose={() => setPayOn(null)}
                onSubmit={(input) =>
                    payOn?.bill && pay.mutate({ billId: payOn.bill.id, input })
                }
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
                    <WtButton tone="accent" onClick={() => void saveRemarks()}>Save remarks</WtButton>
                </DialogActions>
            </GlassDialog>
        </Stack>
    );
};

export default ProjectBillingWorkspace;
