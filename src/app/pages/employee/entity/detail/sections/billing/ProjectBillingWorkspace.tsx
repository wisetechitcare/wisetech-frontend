import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Alert, Box, Chip, Divider, IconButton, Menu, MenuItem, Stack, TextField,
    Tooltip, Typography, useTheme,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
    GlassCard, TRIO, WtButton, CurrencySymbol, toast,
} from "@app/modules/common/components/ui";
import { confirmDialog } from "@app/modules/common/components/ui/feedback";
import {
    BillingPageHeader, BillingLoadingState, BillingEmptyState, BillingStatsCard,
    BillingStatusBadge,
} from "@pages/billing/components";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { formatCurrencyDecimal } from "@utils/currency";
import {
    getProjectBilling, raiseBill, recordBillPayment, cancelBill, openProforma,
    openTaxInvoice, setTdsDeposited,
    type ProjectBillingRow, type RaiseBillInput, type RecordPaymentInput,
} from "@services/bills";
import { RaiseBillDialog, RecordPaymentDialog } from "./BillDialogs";
import BillDocumentDialog, { type BillDocumentTarget } from "./BillDocumentDialog";
import BillDetailPanel from "./BillDetailPanel";

/**
 * Project → Billing.
 *
 * THE WHOLE SCREEN ANSWERS THREE QUESTIONS: what have we billed, what has come
 * in, what is still out. Everything else on it exists to make the third one
 * actionable, because "pending" on its own tells nobody what to do.
 *
 * The split that matters is between work that is FINISHED BUT UNBILLED — a job
 * for our own team, raise the bill — and work that is BILLED BUT UNPAID — a job
 * for the client, chase the payment. Those are different phone calls, and a
 * single pending figure hides which one to make.
 *
 * The table is DELIVERABLE-grained, not bill-grained. A bill-only list would show
 * just the rows where somebody has already acted and silently omit the ones that
 * need acting on, which is exactly backwards.
 */

const QUERY_KEY = (projectId: string) => ["project-billing", projectId];

/** Muted placeholder, so an empty cell reads as "nothing yet" and not as a gap. */
const DASH = "—";

/**
 * "What needs doing", as predicates over a row.
 *
 * This is the filter that earns its place: the table is a worklist, and the
 * question people actually arrive with is not "show me PROFORMA rows", it is
 * "what is waiting on me". Each option maps to one step of the flow, so the
 * answer is also the instruction.
 */
const NEEDS: Record<string, { label: string; match: (row: ProjectBillingRow) => boolean }> = {
    TO_BILL: {
        label: "Ready to bill",
        match: (r) => !r.blockReason && !r.bill,
    },
    FINISH_PROFORMA: {
        label: "Proforma not finalised",
        match: (r) => r.bill?.status === "DRAFT",
    },
    AWAITING_PAYMENT: {
        label: "Awaiting payment",
        match: (r) => r.bill?.status === "PROFORMA" || r.bill?.status === "PARTIALLY_PAID",
    },
    TO_INVOICE: {
        label: "Ready to invoice",
        match: (r) => r.bill?.status === "PAID",
    },
    TDS_PENDING: {
        label: "TDS not deposited",
        match: (r) => !!r.bill && r.bill.tdsAmount > 0 && !r.bill.tdsDeposited,
    },
};

/** Bill stages, in the order the flow runs rather than alphabetically. */
const STAGE_OPTIONS: { value: string; label: string }[] = [
    { value: "NONE", label: "Not billed" },
    { value: "DRAFT", label: "Draft" },
    { value: "PROFORMA", label: "Proforma" },
    { value: "PARTIALLY_PAID", label: "Partly paid" },
    { value: "PAID", label: "Paid" },
    { value: "INVOICED", label: "Invoiced" },
    { value: "CANCELLED", label: "Cancelled" },
];

const FILTER_SX = {
    minWidth: 168,
    "& .MuiInputBase-input": { fontSize: 12.5, py: 0.9 },
    "& .MuiInputLabel-root": { fontSize: 12.5 },
};

/** Row-menu items: icon, then label, on one baseline. */
const MENU_ITEM_SX = { fontSize: 13, gap: 1.25, py: 0.85 };

/**
 * One document cell: its number, its date, and a link into the document itself.
 *
 * An em dash rather than a blank when the step has not happened — the difference
 * between "not reached yet" and "something failed to load" should be visible.
 */
const DocCell: React.FC<{
    number?: string | null;
    date?: string | null;
    id?: string | null;
    status?: string | null;
    versions?: number;
    onOpen?: (documentId: string) => void;
}> = ({ number, date, id, status, versions = 0, onOpen }) => {
    if (!number) return <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{DASH}</Typography>;
    return (
        <Box
            onClick={id && onOpen ? (e) => { e.stopPropagation(); onOpen(id); } : undefined}
            sx={{ cursor: id && onOpen ? "pointer" : "default", "&:hover": id && onOpen ? { textDecoration: "underline" } : {} }}
        >
            {/* Two lines, not three: the number, then everything that qualifies it
                on one muted line. Stacking the chip, the version and the date
                separately made a 160px column three rows tall and set every row in
                the table to the height of its busiest document cell. */}
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 700 }}>{number}</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25, minWidth: 0 }}>
                {status && <BillingStatusBadge status={status} />}
                {versions > 1 && (
                    <Typography sx={{ fontSize: 10.5, color: "text.disabled" }}>v{versions}</Typography>
                )}
                {date && status !== "DRAFT" && (
                    <Typography noWrap sx={{ fontSize: 10.5, color: "text.disabled" }}>
                        {dayjs(date).format("DD-MM-YYYY")}
                    </Typography>
                )}
            </Stack>
        </Box>
    );
};

/** Chip columns sit centred, header and body alike — the Tracker's geometry. */
const CENTRED = {
    muiTableHeadCellProps: { align: "center" as const },
    muiTableBodyCellProps: { align: "center" as const },
};

/**
 * Money columns: figures right-aligned so the digits line up, headers to match.
 *
 * The `flexDirection` override is the point. MRT mirrors a right-aligned header
 * into `row-reverse`, which puts the sort arrow BEFORE the label — so a table
 * mixing right- and left-aligned columns gets arrows on both sides of its
 * headings and reads as sloppy. Forcing `row` keeps every header in this table
 * label-then-arrow, while `flex-end` keeps the pair hard against the column's
 * right edge where the figures are.
 */
const RIGHT = {
    // NOTE: no `align` on the HEAD cell, only on the body.
    //
    // `align: "right"` is what makes MRT mirror a header into `row-reverse`,
    // which is what put the sort arrow to the LEFT of "Amount", "GST" and "TDS"
    // while every other column had it on the right. Overriding `flexDirection`
    // afterwards loses to the table-wide head-cell style, so the fix is to not
    // trigger the mirroring in the first place. The figures still right-align,
    // because that is set on the body cell, which is where it belongs.
    muiTableBodyCellProps: { align: "right" as const },
};

/**
 * One sort arrow per column, always on the column's right edge.
 *
 * Applied table-wide so the arrows line up down the header instead of landing
 * wherever each label happens to end.
 */
const HEAD_CELL_SX = {
    "& .Mui-TableHeadCell-Content": { justifyContent: "space-between" },
};

/**
 * A secondary figure, as a compact card.
 *
 * The three totals above are the headline and keep the full `BillingStatsCard`
 * treatment — icon tile, large value, hint. Giving these five the same card made
 * eight equal-weight cards and about 280px of vertical chrome before the table
 * even started; nothing was the headline any more.
 *
 * So: still a card, but half the height and none of the furniture. A colour dot
 * instead of an icon tile, no hint line, and the explanation on hover — these
 * are figures you glance at, not ones you read.
 */
const MiniCard: React.FC<{
    label: string; value: number; hint: string; tone: string;
}> = ({ label, value, hint, tone }) => (
    <Tooltip title={hint}>
        <Box
            sx={{
                px: 1.5,
                py: 1.1,
                borderRadius: "10px",
                bgcolor: "background.paper",
                border: (theme) => `1px solid ${theme.palette.divider}`,
                minWidth: 0,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: tone, flexShrink: 0 }} />
                <Typography noWrap sx={{ fontSize: 11, color: "text.secondary", fontWeight: 500 }}>
                    {label}
                </Typography>
            </Stack>
            <Typography
                noWrap
                sx={{
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.3,
                    mt: 0.3,
                    // Tabular figures so the amounts line up across the row.
                    fontVariantNumeric: "tabular-nums",
                }}
            >
                {formatCurrencyDecimal(value)}
            </Typography>
        </Box>
    </Tooltip>
);

/**
 * A money subtotal on a stage's group row.
 *
 * Quieter than the rows it totals — a subtotal that shouts competes with the
 * figures it is summarising, and the reader is scanning the leaves.
 */
const Subtotal: React.FC<{ value: number; tone?: string }> = ({ value, tone }) => (
    <Typography
        sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: tone ?? "text.secondary",
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
        }}
    >
        {formatCurrencyDecimal(value)}
    </Typography>
);

/** Sum one number off every deliverable under a stage's group row. */
const sumRows = (subRows: any[], pick: (row: ProjectBillingRow) => number) =>
    subRows.reduce((total, sub) => total + pick(sub.original as ProjectBillingRow), 0);

/** The em dash, so an empty cell reads as "nothing yet" rather than as a gap. */
const Muted: React.FC = () => (
    <Typography sx={{ fontSize: 13, color: "text.disabled" }}>{DASH}</Typography>
);

const Money: React.FC<{ value: number; tone?: string; bold?: boolean }> = ({ value, tone, bold }) => (
    <Typography sx={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: tone, whiteSpace: "nowrap" }}>
        {formatCurrencyDecimal(value)}
    </Typography>
);

const ProjectBillingWorkspace: React.FC<{ projectId: string }> = ({ projectId }) => {
    const theme = useTheme();
    const queryClient = useQueryClient();

    const [raiseOn, setRaiseOn] = useState<ProjectBillingRow | null>(null);
    const [payOn, setPayOn] = useState<ProjectBillingRow | null>(null);
    /** The document being worked on, shown over this tab rather than routed to. */
    const [docTarget, setDocTarget] = useState<BillDocumentTarget | null>(null);
    /** The row whose overflow menu is open. One Menu, reused. */
    const [rowMenu, setRowMenu] = useState<{ el: HTMLElement; row: ProjectBillingRow } | null>(null);
    /** Client-side, because one call already returned every row on the project. */
    const [filters, setFilters] = useState({ needs: "", stage: "", projectStage: "" });

    const queryKey = QUERY_KEY(projectId);
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey,
        queryFn: () => getProjectBilling(projectId),
        enabled: Boolean(projectId),
    });

    const refresh = () => queryClient.invalidateQueries({ queryKey });

    /**
     * Open a document WITHOUT leaving the project.
     *
     * A DRAFT opens the editor, where it is filled in and published; a finalised
     * one opens its revision chain, which owns the PDF, the versions and the send
     * history. Two modes because they are two jobs — but both render over this
     * tab, because everything about one project's billing belongs to the project.
     *
     * Memoised so the column definitions can depend on it without rebuilding.
     */
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
            // Straight into the editor: the proforma is a DRAFT and the next thing
            // anyone does is check it before the client sees it.
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

    /** The project's own stages, in execution order, for the stage filter. */
    const projectStages = useMemo(() => {
        const seen = new Map<string, number>();
        rows.forEach((r) => { if (!seen.has(r.stageName)) seen.set(r.stageName, r.stageSortOrder); });
        return [...seen.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name);
    }, [rows]);

    const visibleRows = useMemo(() => rows.filter((row) => {
        if (filters.needs && !NEEDS[filters.needs]?.match(row)) return false;
        if (filters.stage) {
            const stage = row.bill?.status ?? "NONE";
            if (stage !== filters.stage) return false;
        }
        if (filters.projectStage && row.stageName !== filters.projectStage) return false;
        return true;
    }), [rows, filters]);

    const filtered = Boolean(filters.needs || filters.stage || filters.projectStage);
    const summary = data?.summary;
    const canBill = data?.capabilities.canBill ?? false;
    const canPay = data?.capabilities.canRecordPayment ?? false;

    /** Actions for one row, shared by the table and the phone list. */
    /**
     * The ladder: exactly one step is ever next, so exactly one primary button
     * shows. Which step it is comes from the bill's status, never from the UI's
     * own idea of the sequence.
     *
     * Deliberately ONE action wide. Everything secondary — opening a finalised
     * document, the TDS deposit toggle — lives in the expanded row, because
     * crowding it here squeezed the column until "Cancel" wrapped to two lines.
     */
    const actionsFor = React.useCallback((row: ProjectBillingRow) => {
        const bill = row.bill;
        const btn = { minHeight: 30, fontSize: 12, whiteSpace: "nowrap" as const };

        if (!bill || bill.status === "CANCELLED") {
            if (row.blockReason) {
                return (
                    <Tooltip title={row.blockMessage ?? ""}>
                        <span>
                            <WtButton size="small" ghost disabled sx={btn}>Raise bill</WtButton>
                        </span>
                    </Tooltip>
                );
            }
            return (
                <WtButton
                    size="small" tone="primary" disabled={!canBill || raise.isPending}
                    onClick={() => setRaiseOn(row)}
                    sx={btn}
                >
                    Raise bill
                </WtButton>
            );
        }

        return (
            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                {bill.status === "DRAFT" && (
                    <WtButton
                        size="small" tone="primary"
                        disabled={!canBill || proforma.isPending}
                        onClick={() =>
                            bill.proformaDocumentId && bill.proformaStatus === "DRAFT"
                                ? openDocument(bill.proformaDocumentId, "DRAFT")
                                : proforma.mutate(bill.id)
                        }
                        sx={btn}
                    >
                        {bill.proformaDocumentId ? "Open proforma" : "Create proforma"}
                    </WtButton>
                )}

                {(bill.status === "PROFORMA" || bill.status === "PARTIALLY_PAID") && (
                    <WtButton
                        size="small" tone="primary" disabled={!canPay || pay.isPending}
                        onClick={() => setPayOn(row)}
                        sx={btn}
                    >
                        Record payment
                    </WtButton>
                )}

                {bill.status === "PAID" && (
                    <Tooltip title="The client has settled the proforma, so the tax invoice can be raised.">
                        <span>
                            <WtButton
                                size="small" tone="primary" disabled={!canPay || invoice.isPending}
                                onClick={() =>
                                    bill.invoiceDocumentId && bill.invoiceStatus === "DRAFT"
                                        ? openDocument(bill.invoiceDocumentId, "DRAFT")
                                        : invoice.mutate(bill.id)
                                }
                                sx={btn}
                            >
                                {bill.invoiceDocumentId ? "Open tax invoice" : "Create tax invoice"}
                            </WtButton>
                        </span>
                    </Tooltip>
                )}

                {bill.status === "INVOICED" && (
                    <Typography sx={{ fontSize: 12, color: "success.main", fontWeight: 600 }}>
                        Complete
                    </Typography>
                )}

                {/*
                    Everything else this row can do. An overflow menu rather than a
                    second and third button, because the column has to stay one
                    width — but the documents must stay reachable at EVERY stage,
                    not only the stage whose primary action happens to open them.
                */}
                <Tooltip title="More actions">
                    <IconButton
                        size="small"
                        onClick={(event) => setRowMenu({ el: event.currentTarget, row })}
                        sx={{ width: 28, height: 28, borderRadius: "8px" }}
                    >
                        <KTIcon iconName="dots-vertical" className="fs-5" />
                    </IconButton>
                </Tooltip>
            </Stack>
        );
    }, [canBill, canPay, openDocument, raise.isPending, proforma, pay.isPending, invoice]);

    /**
     * MaterialTable columns — the same engine, geometry and preference bucket as
     * the Billing Tracker, so column show/hide, resizing, per-user ordering and
     * export all come for free instead of being rebuilt here.
     *
     * Everything is CLIENT-side: one call returns every deliverable on the
     * project, which is tens of rows and not thousands. Manual filtering would
     * mean a round trip per keystroke for a list already in memory.
     */
    const columns = useMemo(
        () => [
            {
                /*
                 * The column the table is grouped by. `groupedColumnMode:
                 * "remove"` takes it out of the body, so it exists only as the
                 * stage header row — the stage is named once, above its
                 * deliverables, instead of repeating down a column.
                 */
                accessorKey: "stageName",
                // "Stage" twice in one header row — here and on the bill's own
                // status — left the reader working out which was which against a
                // toolbar that already says "Bill stage" and "Project stage".
                header: "Project Stage",
                size: 340,
                GroupedCell: ({ row }: any) => {
                    const subRows = row.subRows ?? [];
                    const deliverables = subRows.map((sub: any) => sub.original as ProjectBillingRow);
                    const done = deliverables.filter((d: ProjectBillingRow) => d.workStatus === "COMPLETED").length;
                    const value = sumRows(subRows, (d) => d.amount);
                    const percentage = deliverables.reduce(
                        (t: number, d: ProjectBillingRow) => t + d.percentage, 0,
                    );
                    const name = row.groupingValue as string;
                    return (
                        <Box sx={{ minWidth: 0, py: 0.25 }}>
                            {/* Stage names run long ("Advance (To be paid along with
                                the Work Order)") and were wrapping to three lines,
                                which pushed every group row to a different height and
                                buried the summary underneath. One line, the full name
                                on hover, and the numbers always in the same place. */}
                            <Tooltip title={name}>
                                <Typography
                                    noWrap
                                    sx={{ fontSize: 13, fontWeight: 700, minWidth: 0 }}
                                >
                                    {name}
                                </Typography>
                            </Tooltip>
                            <Typography noWrap sx={{ fontSize: 11.5, color: "text.secondary" }}>
                                {done} of {deliverables.length} done
                                {percentage > 0 ? ` · ${Math.round(percentage)}% of stage` : ""}
                                {` · ${formatCurrencyDecimal(value)}`}
                            </Typography>
                        </Box>
                    );
                },
            },
            {
                accessorKey: "deliverableName",
                header: "Deliverable",
                size: 240,
                enableGrouping: false,
                /*
                 * The stage summary lives HERE, not in the grouped column's
                 * `GroupedCell`.
                 *
                 * With `groupedColumnMode: "remove"` the grouping column's own cell
                 * renderer never runs — the group row gets MRT's stock "name (3)"
                 * and nothing else, which is why the tree read as a bare label with
                 * a stray count. An `AggregatedCell` on a normal column DOES run on
                 * a group row (that is how the Amount and Received subtotals have
                 * always appeared), so the progress belongs in the first column
                 * after the stage name.
                 */
                AggregatedCell: ({ row }: any) => {
                    const subRows = row.subRows ?? [];
                    const deliverables = subRows.map((sub: any) => sub.original as ProjectBillingRow);
                    const done = deliverables.filter(
                        (d: ProjectBillingRow) => d.workStatus === "COMPLETED",
                    ).length;
                    const billed = deliverables.filter((d: ProjectBillingRow) => !!d.bill).length;
                    const percentage = deliverables.reduce(
                        (t: number, d: ProjectBillingRow) => t + d.percentage, 0,
                    );
                    return (
                        <Typography sx={{ fontSize: 11.5, color: "text.secondary", whiteSpace: "nowrap" }}>
                            {done} of {deliverables.length} done
                            {` · ${billed} billed`}
                            {percentage > 0 ? ` · ${Math.round(percentage)}% of stage` : ""}
                        </Typography>
                    );
                },
                Cell: ({ row }: any) => {
                    const r: ProjectBillingRow = row.original;
                    return (
                        <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontSize: "inherit", fontWeight: 600 }}>
                                {r.deliverableName}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: "text.disabled" }}>
                                {r.percentage}% of stage
                            </Typography>
                        </Box>
                    );
                },
            },
            {
                accessorKey: "workStatus",
                header: "Work",
                size: 120,
                ...CENTRED,
                Cell: ({ row }: any) => <BillingStatusBadge status={row.original.workStatus} />,
            },
            {
                accessorKey: "amount",
                header: "Amount",
                size: 130,
                aggregationFn: "sum",
                AggregatedCell: ({ row }: any) => (
                    <Subtotal value={sumRows(row.subRows ?? [], (d) => d.amount)} tone="text.primary" />
                ),
                ...RIGHT,
                Cell: ({ row }: any) => <Money value={row.original.amount} bold />,
            },
            {
                id: "gst",
                aggregationFn: "sum",
                AggregatedCell: ({ row }: any) => (
                    <Subtotal value={sumRows(row.subRows ?? [], (d) => d.bill?.gstAmount ?? 0)} />
                ),
                accessorFn: (r: ProjectBillingRow) => r.bill?.gstAmount ?? 0,
                header: "GST",
                /*
                 * Hidden by default, not removed. Ten columns of financial data need
                 * about 1500px, and this table lives inside a project's detail panel
                 * — so the screen opened on a horizontal scrollbar and the columns
                 * people actually act on were off the right edge. These three are the
                 * ones you check on a specific bill rather than scan down, and the
                 * column menu brings any of them back per user, for good.
                 */
                meta: { defaultVisible: false },
                size: 120,
                ...RIGHT,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    if (!bill) return <Muted />;
                    // The rate lives on hover. Printed under every amount it added a
                    // second line to every row for a number that is the same on
                    // almost all of them — the amounts are what people scan.
                    return (
                        <Tooltip title={`GST at ${bill.gstRate}%`}>
                            <Box component="span"><Money value={bill.gstAmount} /></Box>
                        </Tooltip>
                    );
                },
            },
            {
                id: "tds",
                aggregationFn: "sum",
                AggregatedCell: ({ row }: any) => (
                    <Subtotal value={sumRows(row.subRows ?? [], (d) => d.bill?.tdsAmount ?? 0)} />
                ),
                accessorFn: (r: ProjectBillingRow) => r.bill?.tdsAmount ?? 0,
                header: "TDS",
                meta: { defaultVisible: false },
                size: 120,
                ...RIGHT,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    if (!bill || bill.tdsAmount <= 0) return <Muted />;
                    return (
                        <Tooltip title={`TDS deducted at ${bill.tdsRate}%`}>
                            <Box component="span"><Money value={bill.tdsAmount} tone="warning.dark" /></Box>
                        </Tooltip>
                    );
                },
            },
            {
                id: "stage",
                accessorFn: (r: ProjectBillingRow) => r.bill?.status ?? "",
                // Named for what it is — where the BILL stands — matching the
                // toolbar's own "Bill stage" filter.
                header: "Bill Stage",
                size: 135,
                ...CENTRED,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    return bill
                        ? <BillingStatusBadge status={bill.status} />
                        : <Typography sx={{ fontSize: 12.5, color: "text.disabled" }}>Not billed</Typography>;
                },
            },
            {
                id: "proforma",
                accessorFn: (r: ProjectBillingRow) => r.bill?.proformaNumber ?? "",
                header: "Proforma",
                size: 160,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    return (
                        <DocCell
                            number={bill?.proformaNumber} date={bill?.proformaDate}
                            id={bill?.proformaDocumentId} status={bill?.proformaStatus}
                            versions={bill?.proformaVersions}
                            onOpen={(docId) => openDocument(docId, bill?.proformaStatus)}
                        />
                    );
                },
            },
            {
                id: "invoice",
                accessorFn: (r: ProjectBillingRow) => r.bill?.invoiceNumber ?? "",
                header: "Tax Invoice",
                size: 160,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    return (
                        <DocCell
                            number={bill?.invoiceNumber} date={bill?.invoiceDate}
                            id={bill?.invoiceDocumentId} status={bill?.invoiceStatus}
                            onOpen={(docId) => openDocument(docId, bill?.invoiceStatus)}
                        />
                    );
                },
            },
            {
                id: "received",
                aggregationFn: "sum",
                AggregatedCell: ({ row }: any) => (
                    <Subtotal value={sumRows(row.subRows ?? [], (d) => d.bill?.receivedAmount ?? 0)} tone="success.main" />
                ),
                accessorFn: (r: ProjectBillingRow) => r.bill?.receivedAmount ?? 0,
                header: "Received",
                meta: { defaultVisible: false },
                size: 145,
                ...RIGHT,
                Cell: ({ row }: any) => {
                    const bill = (row.original as ProjectBillingRow).bill;
                    if (!bill) return <Muted />;
                    return (
                        <Box>
                            <Money value={bill.receivedAmount} tone="success.main" />
                            {bill.outstandingAmount > 0 && (
                                <Typography sx={{ fontSize: 11, color: "error.main" }}>
                                    {formatCurrencyDecimal(bill.outstandingAmount)} due
                                </Typography>
                            )}
                        </Box>
                    );
                },
            },
            {
                id: "actions",
                header: "Actions",
                size: 260,
                minSize: 220,
                enableSorting: false,
                enableColumnFilter: false,
                ...RIGHT,
                Cell: ({ row }: any) => actionsFor(row.original as ProjectBillingRow),
            },
        ],
        [openDocument, actionsFor],
    );

    if (!projectId) {
        return (
            <GlassCard preset="section" sx={{ p: 3, textAlign: "center" }}>
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
        <Stack spacing={1.5} sx={{ maxWidth: 1600, mx: "auto" }}>
            <BillingPageHeader
                icon="wallet"
                trio={TRIO.green}
                title="Project Billing"
                description="One bill per deliverable: raise the proforma when the work is done, record what the client pays, then issue the tax invoice."
            />

            {/* The three totals. `received + pending = totalBilling` by construction,
                and `pending` uses the Billing Tracker's definition (contract minus
                received) so a project reads the same on both screens. */}
            <Box
                sx={{
                    display: "grid",
                    gap: 1.5,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
                }}
            >
                <BillingStatsCard
                    label="Total Billing"
                    value={formatCurrencyDecimal(summary.totalBilling)}
                    icon={<CurrencySymbol />}
                    trio={TRIO.blue}
                    hint="Contract value, before GST"
                />
                <BillingStatsCard
                    label="Received"
                    value={formatCurrencyDecimal(summary.received)}
                    icon="wallet"
                    trio={TRIO.green}
                    hint={
                        summary.totalBilling > 0
                            ? `${Math.round((summary.received / summary.totalBilling) * 1000) / 10}% of contract`
                            : "Nothing collected yet"
                    }
                />
                <BillingStatsCard
                    label="Pending"
                    value={formatCurrencyDecimal(summary.pending)}
                    icon="time"
                    trio={TRIO.amber}
                    hint="Contract still to come in"
                />
            </Box>

            {/*
                What the pending figure is actually made of. Still cards, but
                compact ones — see `MiniCard` for why they are not the same card
                as the three totals above.
            */}
            <Box
                sx={{
                    display: "grid",
                    // auto-fit, because the row carries between three and six
                    // figures depending on whether the project has TDS, GST or
                    // legacy billing — a fixed column count would leave a hole on
                    // the projects that have none of them.
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        sm: "repeat(auto-fit, minmax(172px, 1fr))",
                    },
                    gap: 1.25,
                }}
            >
                <MiniCard
                    label="Done, not billed"
                    value={summary.doneNotBilled}
                    tone={theme.palette.warning.main}
                    hint="Deliverables marked complete that nobody has raised a bill for. Ours to act on. Excludes GST."
                />
                <MiniCard
                    label="Billed, unpaid"
                    value={summary.billedUnpaid}
                    tone={theme.palette.error.main}
                    hint="Issued and still outstanding — what the client has yet to transfer, GST included and TDS already deducted."
                />
                <MiniCard
                    label="Not started"
                    value={summary.notStarted}
                    tone={theme.palette.text.disabled}
                    hint="Contract value with no completed work behind it yet. Excludes GST."
                />
                {summary.tdsDeducted > 0 && (
                    <MiniCard
                        label="TDS withheld"
                        value={summary.tdsDeducted}
                        tone={summary.tdsPending > 0 ? theme.palette.warning.dark : theme.palette.success.main}
                        hint={
                            summary.tdsPending > 0
                                ? `${formatCurrencyDecimal(summary.tdsPending)} of this is not yet confirmed as deposited by the client.`
                                : "All deposited by the client."
                        }
                    />
                )}
                {summary.legacyReceived > 0 && (
                    <MiniCard
                        label="Billed the old way"
                        value={summary.legacyReceived}
                        tone={theme.palette.text.disabled}
                        hint="Collected through the earlier billing-request flow, before this project moved to per-deliverable bills. Counted in Received, but it has no row in the table below."
                    />
                )}
                {summary.gstBilled > 0 && (
                    <MiniCard
                        label="GST billed"
                        value={summary.gstBilled}
                        tone={theme.palette.info.main}
                        hint="GST charged on issued bills — collected from the client and paid over."
                    />
                )}
            </Box>

            {rows.length === 0 ? (
                <BillingEmptyState
                    icon="wallet"
                    title="This project has no deliverables yet"
                    description="Bills are raised against deliverables. Add stages and deliverables in the Execution tab first."
                />
            ) : (
                <MaterialTable
                    data={visibleRows}
                    columns={columns}
                    tableName="ProjectBillingDeliverables"
                    isLoading={isLoading}
                    searchPlaceholder="Search deliverable, stage, proforma or invoice…"
                    enableColumnSpecificSearch={true}
                    enableColumnResizing={true}
                    layoutMode="semantic"
                    muiTableHeadCellStyle={HEAD_CELL_SX}
                    // Deliverables live under their stage, which is how the
                    // project is planned and how the client is billed.
                    initialGrouping={["stageName"]}
                    renderTopToolbarRightActions={() => (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ py: 0.5 }}>
                            <TextField
                                select size="small" label="Needs action" sx={FILTER_SX}
                                value={filters.needs}
                                onChange={(e) => setFilters((f) => ({ ...f, needs: e.target.value }))}
                            >
                                <MenuItem value="" sx={{ fontSize: 13 }}>Anything</MenuItem>
                                {Object.entries(NEEDS).map(([value, { label, match }]) => {
                                    // The count is the point: an option reading "Ready
                                    // to bill (0)" saves selecting it to find out.
                                    const count = rows.filter(match).length;
                                    return (
                                        <MenuItem key={value} value={value} sx={{ fontSize: 13 }}>
                                            {label} ({count})
                                        </MenuItem>
                                    );
                                })}
                            </TextField>

                            <TextField
                                select size="small" label="Bill stage" sx={FILTER_SX}
                                value={filters.stage}
                                onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
                            >
                                <MenuItem value="" sx={{ fontSize: 13 }}>All stages</MenuItem>
                                {STAGE_OPTIONS.map((o) => (
                                    <MenuItem key={o.value} value={o.value} sx={{ fontSize: 13 }}>
                                        {o.label}
                                    </MenuItem>
                                ))}
                            </TextField>

                            <TextField
                                select size="small" label="Project stage" sx={FILTER_SX}
                                value={filters.projectStage}
                                onChange={(e) => setFilters((f) => ({ ...f, projectStage: e.target.value }))}
                            >
                                <MenuItem value="" sx={{ fontSize: 13 }}>All stages</MenuItem>
                                {projectStages.map((name) => (
                                    <MenuItem key={name} value={name} sx={{ fontSize: 13 }}>{name}</MenuItem>
                                ))}
                            </TextField>

                            {filtered && (
                                <WtButton
                                    ghost size="small"
                                    onClick={() => setFilters({ needs: "", stage: "", projectStage: "" })}
                                    sx={{ minHeight: 36, fontSize: 12.5, whiteSpace: "nowrap" }}
                                >
                                    Clear
                                </WtButton>
                            )}
                        </Stack>
                    )}
                    renderDetailPanel={({ row }: any) => (
                        <BillDetailPanel
                            row={row.original as ProjectBillingRow}
                            canRecordPayment={canPay}
                            onOpenDocument={openDocument}
                            onToggleTds={(billId, deposited) => tds.mutate({ billId, deposited })}
                            busy={tds.isPending}
                        />
                    )}
                    muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
                    muiTableProps={{
                        sx: {
                            // Separated rows with a 4px gutter — the Leads & Projects
                            // geometry the Tracker already uses, so the two billing
                            // screens read as one product.
                            borderCollapse: "separate",
                            borderSpacing: "0 4px !important",
                            minWidth: "1080px",
                        },
                        /*
                         * A stage row is a heading, so it should look like one. Without
                         * this it is a body row carrying bold numbers, and the eye has
                         * to work out where one stage ends and the next begins — the
                         * thing grouping was supposed to make obvious.
                         *
                         * Nested inside `muiTableProps` because that is where the table
                         * wrapper reads it from; passed at the top level it is silently
                         * ignored.
                         */
                        muiTableBodyRowProps: ({ row }: any) =>
                            (row?.getIsGrouped?.()
                                ? {
                                    sx: {
                                        "& .MuiTableCell-root": {
                                            backgroundColor: "action.hover",
                                            fontWeight: 700,
                                        },
                                    },
                                }
                                : {}),
                    }}
                />
            )}

            {/*
                One menu for whichever row asked for it. Items are built from that
                row's bill, so a stage that cannot do something never offers it.
            */}
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
                    const bill = row?.bill;
                    if (!row || !bill) return <MenuItem disabled>No bill on this row yet</MenuItem>;

                    const close = () => setRowMenu(null);
                    const items: React.ReactNode[] = [];

                    /*
                     * The menu is the OVERFLOW, so it never repeats the primary
                     * button. Which action is primary is a function of the bill's
                     * status, and this mirrors the ladder in `actionsFor` — the
                     * two have to name the same step for the same status, or the
                     * row offers "Record payment" twice.
                     */
                    const primaryIs =
                        bill.status === "DRAFT" ? "proforma"
                            : bill.status === "PROFORMA" || bill.status === "PARTIALLY_PAID" ? "pay"
                                : bill.status === "PAID" ? "invoice"
                                    : "none";

                    if (bill.proformaDocumentId && primaryIs !== "proforma") {
                        items.push(
                            <MenuItem
                                key="proforma"
                                sx={MENU_ITEM_SX}
                                onClick={() => { close(); openDocument(bill.proformaDocumentId!, bill.proformaStatus); }}
                            >
                                <KTIcon iconName="document" className="fs-6" />
                                {bill.proformaStatus === "DRAFT"
                                    ? `Edit ${bill.proformaNumber}`
                                    : `Open ${bill.proformaNumber}`}
                            </MenuItem>,
                        );
                    }

                    if (bill.invoiceDocumentId && primaryIs !== "invoice") {
                        items.push(
                            <MenuItem
                                key="invoice"
                                sx={MENU_ITEM_SX}
                                onClick={() => { close(); openDocument(bill.invoiceDocumentId!, bill.invoiceStatus); }}
                            >
                                <KTIcon iconName="receipt-square" className="fs-6" />
                                {bill.invoiceStatus === "DRAFT"
                                    ? `Edit ${bill.invoiceNumber}`
                                    : `Open ${bill.invoiceNumber}`}
                            </MenuItem>,
                        );
                    }

                    if (canPay && primaryIs !== "pay" && bill.status !== "DRAFT"
                        && bill.status !== "CANCELLED" && bill.outstandingAmount > 0) {
                        items.push(
                            <MenuItem key="pay" sx={MENU_ITEM_SX} onClick={() => { close(); setPayOn(row); }}>
                                <KTIcon iconName="wallet" className="fs-6" />
                                Record payment
                            </MenuItem>,
                        );
                    }

                    if (bill.tdsAmount > 0 && canPay) {
                        items.push(
                            <MenuItem
                                key="tds"
                                sx={MENU_ITEM_SX}
                                onClick={() => { close(); tds.mutate({ billId: bill.id, deposited: !bill.tdsDeposited }); }}
                            >
                                <KTIcon iconName="shield-tick" className="fs-6" />
                                {bill.tdsDeposited ? "Mark TDS not deposited" : "Mark TDS deposited"}
                            </MenuItem>,
                        );
                    }

                    // Cancelling lives here rather than in the row: it is
                    // destructive, it is rarely the next thing anyone wants, and
                    // keeping the row to one primary button is what stops the
                    // column squeezing its labels onto two lines. Refused once
                    // money has arrived — that is a payment to unpick first.
                    if (bill.status !== "CANCELLED" && bill.status !== "INVOICED"
                        && bill.receivedAmount <= 0) {
                        items.push(<Divider key="sep" sx={{ my: 0.5 }} />);
                        items.push(
                            <MenuItem
                                key="cancel"
                                sx={{ ...MENU_ITEM_SX, color: "error.main" }}
                                onClick={() => { close(); confirmCancel(row); }}
                            >
                                <KTIcon iconName="cross-circle" className="fs-6" />
                                Cancel bill
                            </MenuItem>,
                        );
                    }

                    return items.length ? items : <MenuItem disabled>Nothing else to do here</MenuItem>;
                })()}
            </Menu>

            {/* Publishing inside the dialog advances the bill server-side, so the
                tab has to re-read when it closes — otherwise the row still shows
                the draft that was just finalised. */}
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
        </Stack>
    );
};

export default ProjectBillingWorkspace;
