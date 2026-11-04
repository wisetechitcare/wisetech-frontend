
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Box, Collapse, Popover, Slider, Stack, Table, TableBody, TableCell, TableRow,
    TextField, Tooltip, Typography, useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { KTIcon } from "@metronic/helpers";
import { SegmentedControl, WtButton, WtIconButton, isHexColor, toast } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { SolidChip } from "@pages/billing/operations/TrackerCells";
import { useBillingLabels } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import {
    getBill, type BillOnRow, type DocumentStatus, type ProjectBillingRow, type StageDeliverable, type WorkStatus,
} from "@services/bills";

/**
 * Project → Billing: the stage-based billing workspace.
 *
 *   Stage (the billed unit) → its billing path + the work inside it.
 *
 * A stage row shows where it stands on three INDEPENDENT dimensions — work done,
 * billing, collection — and its money. Opening it shows the bill's path (bill,
 * proforma, payments, tax invoice) and the stage's deliverables, whose work-done
 * percentage is set by hand. Work never gates a bill: an Advance is billed before
 * any work exists.
 *
 * THE COMPANY'S BILLING VOCABULARY — identical to the Billing Tracker and the
 * Invoice Tracker, word for word and rule for rule:
 *
 *   • Bill Amount — the basic amount MINUS the TDS withheld from it (the cash part).
 *   • GST         — with its rate. Bill Amount and GST are each Received / Awaited.
 *   • TDS         — withheld by the client; Deposited / Not deposited.
 *   • Bill Value  — basic + GST = Bill Amount + TDS + GST. The document's face value.
 *   • Pending     — what the client still has to transfer (Bill Value − TDS − received).
 */

// ── shared billing rules (the workspace imports these, so the two agree) ─────

export type BillingFilterTab = "ALL" | "NEEDS_ATTENTION" | "PENDING" | "PAID" | "DRAFT";
/**
 * Master switch for every billing ACTION on Project → Billing: Raise Bill, Open/Edit
 * Proforma, Record payment, Tax invoice, the row ⋮ menu and TDS "Mark deposited".
 * Off while billing is not offered to clients: the buttons still SHOW, but a click
 * goes nowhere (see `ActionGate`). Flip to `true` to make them work again.
 */
export const BILLING_ACTIONS_ENABLED = false;

/**
 * Wraps billing buttons. While actions are off it swallows clicks in the capture
 * phase — before any button's own handler runs — and says why. `display: contents`
 * so the wrapper adds no box and the layout is unchanged.
 */
export const ActionGate: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    BILLING_ACTIONS_ENABLED ? (
        <>{children}</>
    ) : (
        <Box
            sx={{ display: "contents" }}
            onClickCapture={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast({ icon: "info", title: "Coming soon", text: "Billing actions are not available yet." });
            }}
        >
            {children}
        </Box>
    );

export type BillingSortOption = "STAGE" | "ATTENTION" | "DUE" | "PENDING" | "VALUE" | "WORK" | "RECENT";

/** A cancelled bill no longer counts — the stage is billable again. */
export const liveBill = (row: ProjectBillingRow) =>
    row.bill && row.bill.status !== "CANCELLED" ? row.bill : null;

const AWAITING_MONEY = ["PROFORMA", "AWAITING_PAYMENT", "PARTIALLY_PAID"];

/** What, if anything, is waiting on us for this stage. Null when nothing is. */
export const attentionOf = (row: ProjectBillingRow):
    | "READY_TO_BILL" | "PROFORMA" | "PAYMENT" | "TAX_INVOICE" | null => {
    const bill = liveBill(row);
    // Billable any time, but only finished work is a reminder.
    if (!bill) return !row.blockReason && row.work.total > 0 && row.work.progress >= 100 ? "READY_TO_BILL" : null;
    if (bill.status === "DRAFT") return "PROFORMA";
    if (AWAITING_MONEY.includes(bill.status)) return "PAYMENT";
    if (bill.status === "PAID") return "TAX_INVOICE";
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
export const billAmountOf = (bill: BillOnRow) => Math.round((bill.amount - bill.tdsAmount) * 100) / 100;

/**
 * A stage's work done: each deliverable's progress weighted by its share of the stage,
 * or the plain mean when the shares don't total 100. Same rule as the server, so an
 * optimistic edit shows the figure the next read will return.
 */
export const stageWorkProgress = (deliverables: Array<{ percentage: number; progress: number }>) => {
    if (deliverables.length === 0) return 0;
    const shares = deliverables.reduce((sum, d) => sum + d.percentage, 0);
    const value = Math.abs(shares - 100) < 0.01
        ? deliverables.reduce((sum, d) => sum + d.percentage * d.progress, 0) / 100
        : deliverables.reduce((sum, d) => sum + d.progress, 0) / deliverables.length;
    return Math.round(value);
};

/** 0 Not started, 1–99 In progress, 100 Completed — the server's rule. */
export const statusForProgress = (progress: number): WorkStatus =>
    progress >= 100 ? "COMPLETED" : progress > 0 ? "IN_PROGRESS" : "PENDING";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Column totals for the rows on screen. Unbilled stages count toward Bill Value and Pending. */
const totalsOf = (rows: ProjectBillingRow[]) => {
    const totals = rows.reduce(
        (sum, row) => {
            const bill = liveBill(row);
            if (bill) {
                sum.billAmount += billAmountOf(bill);
                sum.gst += bill.gstAmount;
                sum.tds += bill.tdsAmount;
                sum.billValue += bill.totalAmount;
                sum.pending += bill.outstandingAmount;
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

const isOverdue = (bill: BillOnRow) =>
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
const pendingOf = (row: ProjectBillingRow) => liveBill(row)?.outstandingAmount ?? row.amount;
const billValueOf = (row: ProjectBillingRow) => liveBill(row)?.totalAmount ?? row.amount;

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

// ── the three dimensions ────────────────────────────────────────────────────

type Tone = "positive" | "attention" | "critical" | "active" | "neutral";

interface Status { label: string; tone: Tone }

const workStatusOf = (status: WorkStatus): Status =>
    status === "COMPLETED" ? { label: "Completed", tone: "positive" }
        : status === "IN_PROGRESS" ? { label: "In progress", tone: "active" }
            : { label: "Not started", tone: "neutral" };

const billingStatusOf = (row: ProjectBillingRow): Status => {
    const bill = liveBill(row);
    if (!bill) {
        if (row.blockReason === "ZERO_AMOUNT") return { label: "No value", tone: "neutral" };
        return attentionOf(row) ? { label: "Ready to bill", tone: "attention" } : { label: "Not billed", tone: "neutral" };
    }
    switch (bill.status) {
        case "DRAFT": return { label: "Proforma draft", tone: "attention" };
        case "PROFORMA":
        case "PARTIALLY_PAID": return { label: bill.proformaStatus === "SENT" ? "Proforma sent" : "Proforma issued", tone: "active" };
        case "AWAITING_PAYMENT": return { label: "Invoice issued", tone: "active" };
        case "PAID": return { label: bill.invoiceStatus === "DRAFT" ? "Invoice draft" : "Invoice due", tone: "attention" };
        default: return { label: "Invoiced", tone: "positive" };
    }
};

const collectionStatusOf = (row: ProjectBillingRow): Status => {
    const bill = liveBill(row);
    if (!bill || bill.status === "DRAFT") return { label: "Not due yet", tone: "neutral" };
    if (bill.status === "PAID" || bill.status === "INVOICED") return { label: "Paid", tone: "positive" };
    if (isOverdue(bill)) return { label: "Overdue", tone: "critical" };
    return bill.status === "PARTIALLY_PAID"
        ? { label: "Partly paid", tone: "attention" }
        : { label: "Payment pending", tone: "attention" };
};

/** Same solid chip as the Billing Tracker columns. Colour is the tracker's tone, not a second palette. */
const CHIP_COLOR: Record<Tone, string> = {
    positive: tonePair("success").fg,
    attention: tonePair("warning").fg,
    critical: tonePair("danger").fg,
    active: tonePair("brand").fg,
    neutral: tonePair("neutral").fg,
};

/**
 * The same solid chip, stretched to fill its grid cell and left-aligned. Chips in one
 * column then share a left edge and a width, instead of each hugging its own label
 * (which is what made Billing and Collection look ragged). Long labels truncate.
 */
const CellChip: React.FC<{ status: Status }> = ({ status }) => (
    <Box sx={{
        display: "flex", minWidth: 0, maxWidth: "100%",
        "& > *": { flex: 1, minWidth: 0, boxSizing: "border-box", overflow: "hidden" },
        "& .MuiTypography-root": { overflow: "hidden", textOverflow: "ellipsis" },
    }}>
        <SolidChip label={status.label} color={CHIP_COLOR[status.tone]} />
    </Box>
);

const StatusChip: React.FC<{ status: Status }> = ({ status }) => (
    <Box sx={{
        display: "flex",
        justifyContent: "center",
        minWidth: 0,
        maxWidth: "100%",
        "& > *": { maxWidth: "100%", overflow: "hidden" },
        "& .MuiTypography-root": { overflow: "hidden", textOverflow: "ellipsis" },
    }}>
        <SolidChip label={status.label} color={CHIP_COLOR[status.tone]} />
    </Box>
);

// ── small pieces ────────────────────────────────────────────────────────────

const NUM = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

/**
 * Defaults for the bill-component codes in Billing → Configure, used only until
 * that catalogue has loaded. Once it has, the saved name and colour win.
 */
const SETTLEMENT_FALLBACK: Record<string, { label: string; tone: string }> = {
    BASIC_PAID: { label: "Received", tone: "success" },
    BASIC_UNPAID: { label: "Awaited", tone: "neutral" },
    GST_PAID: { label: "Received", tone: "success" },
    GST_UNPAID: { label: "Awaited", tone: "neutral" },
    TDS_PAID: { label: "Deposited", tone: "success" },
    TDS_UNPAID: { label: "Not deposited", tone: "warning" },
    PENDING: { label: "Pending", tone: "neutral" },
    PARTIALLY_PAID: { label: "Partially Paid", tone: "warning" },
    FULLY_PAID: { label: "Fully Paid", tone: "success" },
    OVERPAID: { label: "Overpaid", tone: "indigo" },
};

/**
 * Payment status for the Pending column only.
 * Bill Amount, GST, TDS, and Bill Value always show the full figure on the bill.
 * Pending is the only column that shows what the client still has to pay.
 */
const paymentCodeOf = (bill: BillOnRow): string | undefined => {
    if (bill.outstandingAmount > 0 && bill.receivedAmount > 0) return "PARTIALLY_PAID";
    if (bill.outstandingAmount > 0) return "PENDING";
    if (bill.receivedAmount > 0) return "FULLY_PAID";
    return undefined;
};

/** A right-aligned figure. `statusCode` paints it in the Configure colour and names that status on hover. */
const Amount: React.FC<{
    label?: string;
    value: number | null;
    tone?: string;
    strong?: boolean;
    note?: string;
    statusCode?: string;
    align?: "left" | "right";
    inline?: boolean;
}> = ({ label, value, tone, strong, note, statusCode, align = "right", inline }) => {
    const labels = useBillingLabels();
    const configured = statusCode ? labels.tone(statusCode) : undefined;
    const fallback = statusCode ? SETTLEMENT_FALLBACK[statusCode] : undefined;
    const colourName = configured ?? fallback?.tone;
    const colour = colourName ? (isHexColor(colourName) ? colourName : tonePair(colourName).fg) : undefined;
    const statusName = statusCode ? (configured ? labels.label(statusCode) : fallback?.label ?? labels.label(statusCode)) : "";
    const settledZero = value === 0 && !!statusCode;
    const figure = (
        <Typography sx={{ ...NUM, fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, color: value || settledZero ? colour ?? tone ?? "text.primary" : "text.disabled" }}>
            {value === null ? "—" : formatCurrencyDecimal(value)}
        </Typography>
    );
    const painted = statusName ? (
        <Tooltip title={statusName} placement="top">
            <Box component="span" sx={{ display: "inline-block" }}>{figure}</Box>
        </Tooltip>
    ) : figure;
    if (inline) {
        return (
            <Stack
                direction="row"
                alignItems="baseline"
                spacing={0.75}
                sx={{ width: align === "left" ? "auto" : "100%", justifyContent: align === "left" ? "flex-start" : "flex-end", minWidth: 0 }}
            >
                {label && <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: "text.secondary", whiteSpace: "nowrap" }}>{label}</Typography>}
                {painted}
            </Stack>
        );
    }
    return (
        <Box sx={{ textAlign: align, width: "100%", minWidth: 0 }}>
            {label && <Typography noWrap sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4 }}>{label}</Typography>}
            {painted}
            {note && !statusCode && (
                <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.35, whiteSpace: "normal" }}>{note}</Typography>
            )}
    </Box>
);
};

/** Label is optional: a table cell's column header already names the bar. */
const Progress: React.FC<{ label?: string; percent: number; tone: string; hint?: string }> = ({ label, percent, tone, hint = "" }) => (
    <Tooltip title={hint}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            {label && (
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", flexShrink: 0 }}>
                    {label}
                </Typography>
            )}
            <Box
                role="progressbar"
                aria-label={label ?? "Work done"}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                sx={{ flex: 1, minWidth: 36, height: 6, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}
            >
                <Box sx={{ width: `${percent}%`, height: "100%", bgcolor: tone, borderRadius: 3 }} />
            </Box>
            <Typography sx={{ ...NUM, fontSize: 12, fontWeight: 700, flexShrink: 0, minWidth: 32, textAlign: "right" }}>
                {percent}%
            </Typography>
        </Stack>
    </Tooltip>
);

/**
 * Plan stage names carry their terms in brackets — "Advance (To be paid along with the
 * Work Order)". The row shows the title; the terms stay one hover away.
 */
const StageName: React.FC<{ name: string; fontSize: number }> = ({ name, fontSize }) => {
    const match = name.match(/^(.*?)\s*\((.+)\)\s*$/);
    const title = match ? match[1] : name;
    const text = (
        <Typography sx={{ fontSize, fontWeight: 600, lineHeight: 1.35, flex: 1, minWidth: 0 }}>{title}</Typography>
    );
    return match ? <Tooltip title={match[2]} placement="top-start">{text}</Tooltip> : text;
};

const Chevron: React.FC<{ open: boolean; label: string; onClick: () => void }> = ({ open, label, onClick }) => (
    <WtIconButton
        size="small"
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        sx={{
            width: 32, height: 32, borderRadius: "8px", flexShrink: 0,
            // A fingertip needs more than 32px.
            "@media (pointer: coarse)": { width: 40, height: 40 },
            color: open ? "primary.main" : "text.secondary",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 180ms ease",
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
    >
        <KTIcon iconName="right" className="fs-6" />
    </WtIconButton>
);

// ── the workspace ───────────────────────────────────────────────────────────

export interface ProjectBillingTreeProps {
    projectId: string;
    rows: ProjectBillingRow[];
    filterTab: BillingFilterTab;
    searchQuery: string;
    sortBy: BillingSortOption;
    /** The primary step and overflow menu for one stage — owned by the workspace. */
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
    /** Saves a deliverable's work done, 0–100. */
    onSetProgress: (deliverableId: string, progress: number) => void;
    onEditRemarks: (deliverable: StageDeliverable) => void;
    /** Lets the workspace put Expand all beside Sort. Null when nothing is visible. */
    onExpandApi?: (api: { allOpen: boolean; toggle: () => void } | null) => void;
}

const ProjectBillingTree: React.FC<ProjectBillingTreeProps> = ({
    projectId, rows, filterTab, searchQuery, sortBy, actionsFor, onOpenDocument, onToggleTds,
    canRecordPayment, busy, onSetProgress, onEditRemarks, onExpandApi,
}) => {
    const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

    // Opens with ONE stage: the first that needs attention, else none. Set once, not
    // re-derived, so a refetch after a payment never re-folds the page.
    const [openRows, setOpenRows] = useState<Set<string>>(() => {
        const first = rows.find((r) => attentionOf(r));
        return new Set(first ? [first.stageId] : []);
    });

    const query = searchQuery.trim().toLowerCase();

    const visibleRows = useMemo(() => {
        const matches = rows.filter((row) => {
            if (!FILTERS[filterTab].match(row)) return false;
            if (!query) return true;
            const bill = liveBill(row);
            return [row.stageName, bill?.proformaNumber, bill?.invoiceNumber, bill?.billNumber, ...row.deliverables.map((d) => d.name)]
                .some((text) => text?.toLowerCase().includes(query));
        });
        const compare = SORTS[sortBy].compare;
        return compare ? matches.sort(compare) : matches;
    }, [rows, filterTab, query, sortBy]);

    const toggle = (id: string) =>
        setOpenRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    // Which half of an opened stage is showing. Unset means "whatever needs action".
    const [tabs, setTabs] = useState<Record<string, StageTab>>({});
    const setTab = (id: string, tab: StageTab) => setTabs((prev) => ({ ...prev, [id]: tab }));
    /** A row cell jumps straight to its tab — opens the stage, never closes it. */
    const openTo = (id: string, tab: StageTab) => {
        setTab(id, tab);
        setOpenRows((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    };

    const allOpen = visibleRows.length > 0 && visibleRows.every((r) => openRows.has(r.stageId));
    const timeout = reduceMotion ? 0 : 180;

    const toggleAll = React.useCallback(() => {
        setOpenRows(allOpen ? new Set() : new Set(visibleRows.map((r) => r.stageId)));
    }, [allOpen, visibleRows]);

    useEffect(() => {
        if (!onExpandApi) return;
        onExpandApi(visibleRows.length ? { allOpen, toggle: toggleAll } : null);
    }, [onExpandApi, allOpen, toggleAll, visibleRows.length]);

    useEffect(() => () => onExpandApi?.(null), [onExpandApi]);

    // Measured on the tree itself, not the window: the app sidebar and the page
    // padding decide how much room the figures actually get.
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const [width, setWidth] = useState(Infinity);
    useLayoutEffect(() => {
        if (!host || typeof ResizeObserver === "undefined") return;
        const measure = () => setWidth(host.clientWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(host);
        return () => observer.disconnect();
    }, [host]);
    const layout: Layout = width >= TABLE_MIN_WIDTH ? "table" : width >= CARDS_MIN_WIDTH ? "cards" : "narrow";

    const viewProps = (row: ProjectBillingRow): StageViewProps => ({
        projectId,
        row,
        open: openRows.has(row.stageId),
        onToggle: () => toggle(row.stageId),
        tab: tabs[row.stageId] ?? defaultTabOf(row),
        onTabChange: (tab) => setTab(row.stageId, tab),
        onOpenTo: (tab) => openTo(row.stageId, tab),
        actionsFor,
        onOpenDocument,
        onToggleTds,
        canRecordPayment,
        busy,
        timeout,
        onSetProgress,
        onEditRemarks,
    });

    if (visibleRows.length === 0) {
        return (
            <Box sx={{ py: 5, px: 3, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: "10px" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Nothing matches</Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                    {filterTab === "NEEDS_ATTENTION" && !query
                        ? "No stage is waiting on an action right now."
                        : "Clear the search or pick another filter to see more stages."}
                </Typography>
            </Box>
        );
    }

    const totals = totalsOf(visibleRows);

    return (
        <Box ref={setHost}>
            {layout === "table" ? (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper", overflow: "hidden" }}>
                    <Table
                        size="small"
                        sx={{ tableLayout: "fixed", width: "100%", borderCollapse: "collapse", "& .MuiTableCell-root": { borderLeft: 0, borderRight: 0 } }}
                    >
                        <colgroup>
                            {COLUMN_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
                        </colgroup>
                        <TableBody>
                            <StageColumns />
                            {visibleRows.map((row) => <StageRow key={row.stageId} {...viewProps(row)} />)}
                            <GrandTotalRow totals={totals} />
                        </TableBody>
                    </Table>
                </Box>
            ) : (
                <Stack spacing={1.5}>
                    {visibleRows.map((row) => (
                        <StageCard key={row.stageId} {...viewProps(row)} narrow={layout === "narrow"} />
                    ))}
                    <CompactTotal totals={totals} />
                </Stack>
            )}
        </Box>
    );
};

// ── stage columns ───────────────────────────────────────────────────────────

/** Shares of the table width. They sum to 100%, so the table fills the card. */
const COLUMN_WIDTHS = ["21%", "10%", "10%", "9%", "8%", "7%", "7%", "9%", "8%", "11%"];

const HEAD_CELL = {
    fontSize: 12,
    fontWeight: 600,
    color: "text.secondary",
    lineHeight: 1.3,
    py: 1,
    px: 1,
    borderBottom: "1px solid",
    borderColor: "divider",
    bgcolor: "background.paper",
    whiteSpace: "nowrap",
} as const;

const BODY_CELL = {
    py: 1.25,
    px: 1,
    borderBottom: "1px solid",
    borderColor: "divider",
    verticalAlign: "middle",
} as const;

/** Stage chevron sits at 16px; everything a stage opens hangs off a rail under it. */
const TREE = { stage: 16, child: 56 } as const;

const treeRailSx = {
    position: "relative" as const,
    "&::before": {
        content: '""',
        position: "absolute",
        left: 31,
        top: 0,
        bottom: 0,
        width: "1px",
        bgcolor: "divider",
    },
};

const StageColumns: React.FC = () => (
    <TableRow>
        <TableCell sx={{ ...HEAD_CELL, pl: `${TREE.child}px` }}>Stage</TableCell>
        <TableCell sx={HEAD_CELL}>Work</TableCell>
        <TableCell align="center" sx={HEAD_CELL}>Billing</TableCell>
        <TableCell align="center" sx={HEAD_CELL}>Collection</TableCell>
        <TableCell align="right" sx={HEAD_CELL}>Bill Amount</TableCell>
        <TableCell align="right" sx={HEAD_CELL}>GST</TableCell>
        <TableCell align="right" sx={HEAD_CELL}>TDS</TableCell>
        <TableCell align="right" sx={HEAD_CELL}>Bill Value</TableCell>
        <TableCell align="right" sx={HEAD_CELL}>Pending</TableCell>
        <TableCell sx={HEAD_CELL} />
    </TableRow>
);

const TOTAL_CELL = {
    ...BODY_CELL,
    borderBottom: 0,
    bgcolor: "action.hover",
} as const;

const GrandTotalRow: React.FC<{ totals: ReturnType<typeof totalsOf> }> = ({ totals }) => (
    <TableRow>
        <TableCell colSpan={4} sx={{ ...TOTAL_CELL, pl: `${TREE.child}px` }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Total</Typography>
        </TableCell>
        <TableCell align="right" sx={TOTAL_CELL}><Amount value={totals.billAmount} strong /></TableCell>
        <TableCell align="right" sx={TOTAL_CELL}><Amount value={totals.gst} strong /></TableCell>
        <TableCell align="right" sx={TOTAL_CELL}><Amount value={totals.tds} strong /></TableCell>
        <TableCell align="right" sx={TOTAL_CELL}><Amount value={totals.billValue} strong /></TableCell>
        <TableCell align="right" sx={TOTAL_CELL}><Amount value={totals.pending} strong /></TableCell>
        <TableCell sx={TOTAL_CELL} />
    </TableRow>
);

interface Figure { label: string; value: number | null; statusCode?: string; strong?: boolean }

/** A stage's five figures, in column order. Unbilled, its value is the whole Bill Value and Pending. */
const figuresOf = (row: ProjectBillingRow): Figure[] => {
    const bill = liveBill(row);
    if (!bill) {
        return [
            { label: "Bill Amount", value: null },
            { label: "GST", value: null },
            { label: "TDS", value: null },
            { label: "Bill Value", value: row.amount },
            { label: "Pending", value: row.amount },
        ];
    }
    return [
        { label: "Bill Amount", value: billAmountOf(bill), statusCode: bill.basicPaid ? "BASIC_PAID" : "BASIC_UNPAID" },
        { label: "GST", value: bill.gstAmount, statusCode: bill.gstAmount > 0 ? (bill.gstPaid ? "GST_PAID" : "GST_UNPAID") : undefined },
        {
            label: "TDS",
            value: bill.tdsAmount > 0 ? bill.tdsAmount : null,
            statusCode: bill.tdsAmount > 0 ? (bill.tdsDeposited ? "TDS_PAID" : "TDS_UNPAID") : undefined,
        },
        { label: "Bill Value", value: bill.totalAmount, strong: true },
        { label: "Pending", value: bill.outstandingAmount, statusCode: paymentCodeOf(bill) },
    ];
};

const workHintOf = (row: ProjectBillingRow) =>
    row.work.total
        ? `${row.work.completed} of ${row.work.total} deliverables complete`
        : "No deliverables on this stage";

type StageTab = "billing" | "work";

/** A stage with a bill, or one waiting on a billing action, opens on Billing; otherwise Work. */
const defaultTabOf = (row: ProjectBillingRow): StageTab =>
    attentionOf(row) || liveBill(row) ? "billing" : "work";

/** Click handler for a row cell that opens its own tab instead of toggling the row. */
const jumpTo = (onOpenTo: (tab: StageTab) => void, tab: StageTab) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenTo(tab);
};

interface StageViewProps {
    projectId: string;
    row: ProjectBillingRow;
    open: boolean;
    onToggle: () => void;
    tab: StageTab;
    onTabChange: (tab: StageTab) => void;
    onOpenTo: (tab: StageTab) => void;
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
    timeout: number;
    onSetProgress: (deliverableId: string, progress: number) => void;
    onEditRemarks: (deliverable: StageDeliverable) => void;
}

/** What an opened stage shows: its billing path OR the work inside it, one at a time. */
const StageDetail: React.FC<StageViewProps & { stacked: boolean; narrow: boolean; compactPath?: boolean }> = ({
    projectId, row, tab, onTabChange, onOpenDocument, onToggleTds, canRecordPayment, busy, onSetProgress, onEditRemarks, stacked, narrow, compactPath,
}) => (
    <Stack spacing={1.25}>
        <SegmentedControl<StageTab>
            ariaLabel={`${row.stageName} details`}
            value={tab}
            onChange={onTabChange}
            fullWidth={narrow}
            options={[
                { value: "billing", label: "Billing" },
                { value: "work", label: row.work.total ? `Work ${row.work.completed}/${row.work.total}` : "Work" },
            ]}
        />
        <Box role="tabpanel" aria-label={tab === "billing" ? "Billing" : "Work"}>
            {tab === "billing" ? (
                <BillingActivity
                    projectId={projectId}
                    row={row}
                    onOpenDocument={onOpenDocument}
                    onToggleTds={onToggleTds}
                    canRecordPayment={canRecordPayment}
                    busy={busy}
                    stacked={stacked}
                    narrow={narrow}
                    compactPath={compactPath}
                />
            ) : (
                <WorkList row={row} narrow={narrow} onSetProgress={onSetProgress} onEditRemarks={onEditRemarks} />
            )}
        </Box>
    </Stack>
);

const StageRow: React.FC<StageViewProps> = (props) => {
    const { row, open, onToggle, onOpenTo, actionsFor, timeout } = props;
    const cell = { ...BODY_CELL, borderBottom: open ? 0 : BODY_CELL.borderBottom };
    return (
        <>
            <TableRow hover onClick={onToggle} sx={{ cursor: "pointer" }}>
                <TableCell sx={{ ...cell, pl: `${TREE.stage}px` }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                        <Chevron open={open} label={row.stageName} onClick={onToggle} />
                        <StageName name={row.stageName} fontSize={14} />
                        <Tooltip title="Share of the contract">
                            <Typography sx={{ ...NUM, fontSize: 12.5, fontWeight: 600, color: "text.secondary", flexShrink: 0 }}>
                                {row.percentage}%
                            </Typography>
                        </Tooltip>
                    </Stack>
                </TableCell>
                <TableCell sx={cell} onClick={jumpTo(onOpenTo, "work")}>
                    <Progress percent={row.work.progress} tone="primary.main" hint={workHintOf(row)} />
                </TableCell>
                <TableCell align="center" sx={cell} onClick={jumpTo(onOpenTo, "billing")}><StatusChip status={billingStatusOf(row)} /></TableCell>
                <TableCell align="center" sx={cell} onClick={jumpTo(onOpenTo, "billing")}><StatusChip status={collectionStatusOf(row)} /></TableCell>
                {figuresOf(row).map((f) => (
                    <TableCell key={f.label} align="right" sx={cell}>
                        <Amount value={f.value} statusCode={f.statusCode} strong={f.strong} />
                    </TableCell>
                ))}
                <TableCell align="right" sx={cell}>
                    <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ cursor: "default" }} onClick={(e) => e.stopPropagation()}>
                        {actionsFor(row)}
                    </Stack>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={COLUMN_WIDTHS.length} sx={{ p: 0, borderBottom: open ? "1px solid" : 0, borderColor: "divider" }}>
                    <Collapse in={open} timeout={timeout} unmountOnExit>
                        <Box sx={{ pl: `${TREE.child}px`, pr: 2, pt: 0.5, pb: 1.5, ...treeRailSx }}>
                            <StageDetail {...props} stacked={false} narrow={false} />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

// ── work: the stage's deliverables ──────────────────────────────────────────

const QUICK_PROGRESS = [0, 25, 50, 75, 100];

/** The work-done bar, as a button that opens the editor: slider, quick steps, exact value. */
const ProgressControl: React.FC<{ deliverable: StageDeliverable; onSave: (progress: number) => void }> = ({ deliverable, onSave }) => {
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);
    const [draft, setDraft] = useState(deliverable.progress);
    const open = (el: HTMLElement) => { setDraft(deliverable.progress); setAnchor(el); };
    const commit = (value: number) => {
        const clean = Math.min(100, Math.max(0, Math.round(value)));
        if (clean !== deliverable.progress) onSave(clean);
    };
    const tone = deliverable.progress >= 100 ? "success.main" : "primary.main";
    return (
        <>
            <Box
                component="button"
                type="button"
                aria-label={`Work done on ${deliverable.name}: ${deliverable.progress}%. Change`}
                onClick={(e: React.MouseEvent<HTMLElement>) => open(e.currentTarget)}
                sx={{
                    all: "unset",
                    boxSizing: "border-box",
                    display: "block",
                    width: "100%",
                    cursor: "pointer",
                    borderRadius: "8px",
                    px: 1,
                    py: 0.75,
                    "&:hover": { bgcolor: "action.hover" },
                    "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
                }}
            >
                <Progress percent={deliverable.progress} tone={tone} />
            </Box>
            <Popover
                open={Boolean(anchor)}
                anchorEl={anchor}
                onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                slotProps={{ paper: { sx: { p: 2, width: 280, borderRadius: "10px" } } }}
            >
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>{deliverable.name}</Typography>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Slider
                        size="small"
                        value={draft}
                        step={5}
                        min={0}
                        max={100}
                        aria-label="Work done"
                        onChange={(_, v) => setDraft(v as number)}
                        onChangeCommitted={(_, v) => commit(v as number)}
                    />
                    <TextField
                        size="small"
                        type="number"
                        value={draft}
                        onChange={(e) => setDraft(Number(e.target.value))}
                        onBlur={() => commit(draft)}
                        onKeyDown={(e) => { if (e.key === "Enter") { commit(draft); setAnchor(null); } }}
                        inputProps={{ min: 0, max: 100, "aria-label": "Work done, percent" }}
                        InputProps={{ endAdornment: <Typography sx={{ fontSize: 12, color: "text.secondary" }}>%</Typography> }}
                        sx={{ width: 84, flexShrink: 0, "& input": { fontSize: 13, py: 0.75 } }}
                    />
                </Stack>
                <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }}>
                    {QUICK_PROGRESS.map((value) => (
                        <WtButton
                            key={value}
                            size="small"
                            inverted={value !== draft}
                            onClick={() => { setDraft(value); commit(value); setAnchor(null); }}
                            sx={{ minWidth: 0, flex: 1, height: 28, minHeight: 28, fontSize: 12, px: 0 }}
                        >
                            {value === 100 ? "Done" : `${value}%`}
                        </WtButton>
                    ))}
                </Stack>
            </Popover>
        </>
    );
};

/** Deliverables are tracked here, never billed: share of the stage, work done, status, remarks. */
const WorkList: React.FC<{
    row: ProjectBillingRow;
    narrow: boolean;
    onSetProgress: (deliverableId: string, progress: number) => void;
    onEditRemarks: (deliverable: StageDeliverable) => void;
}> = ({ row, narrow, onSetProgress, onEditRemarks }) => (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px", overflow: "hidden" }}>
        <Stack
            direction="row"
            alignItems="baseline"
            justifyContent="space-between"
            spacing={1}
            sx={{ px: 1.5, py: 1, borderBottom: row.deliverables.length ? "1px solid" : 0, borderColor: "divider" }}
        >
            <Typography sx={{ ...NUM, fontSize: 12, color: "text.secondary" }}>
                {row.work.total ? `${row.work.completed} of ${row.work.total} complete · ${row.work.progress}% done` : "No deliverables on this stage"}
            </Typography>
        </Stack>
        {row.deliverables.map((d, index) => {
            const status = workStatusOf(d.status);
            const chip = (
                <Tooltip
                    title={d.completedAt ? `Completed ${formatDate(d.completedAt)}${d.completedByName ? ` by ${d.completedByName}` : ""}` : ""}
                    disableHoverListener={!d.completedAt}
                >
                    <Box sx={{ justifySelf: "start" }}><StatusChip status={status} /></Box>
                </Tooltip>
            );
            const remarksButton = (
                <Tooltip title={d.remarks ? "Edit remarks" : "Add remarks"}>
                    <WtIconButton
                        size="small"
                        aria-label={`${d.remarks ? "Edit" : "Add"} remarks for ${d.name}`}
                        onClick={() => onEditRemarks(d)}
                        sx={{ width: 32, height: 32, borderRadius: "8px", color: d.remarks ? "primary.main" : "text.secondary" }}
                    >
                        <KTIcon iconName="notepad-edit" className="fs-5" />
                    </WtIconButton>
                </Tooltip>
            );
            const name = (
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{d.name}</Typography>
                    {d.remarks && (
                        <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", mt: 0.15 }}>{d.remarks}</Typography>
                    )}
                </Box>
            );
            const share = (
                <Tooltip title="Share of the stage">
                    <Typography sx={{ ...NUM, fontSize: 12.5, fontWeight: 600, color: "text.secondary" }}>{d.percentage}%</Typography>
                </Tooltip>
            );
            return (
                <Box
                    key={d.id}
                    sx={{
                        px: 1.5,
                        py: 0.75,
                        borderTop: index ? "1px solid" : 0,
                        borderColor: "divider",
                        display: "grid",
                        alignItems: "center",
                        columnGap: 1.5,
                        rowGap: 0.5,
                        gridTemplateColumns: narrow
                            ? "minmax(0, 1fr) auto auto"
                            : "minmax(0, 1.4fr) 3.5rem minmax(10rem, 1fr) 7.5rem auto",
                    }}
                >
                    {narrow ? (
                        <>
                            {name}
                            {share}
                            {remarksButton}
                            <Box sx={{ gridColumn: "1 / 3", ml: -1 }}>
                                <ProgressControl deliverable={d} onSave={(p) => onSetProgress(d.id, p)} />
                            </Box>
                            {chip}
                        </>
                    ) : (
                        <>
                            {name}
                            {share}
                            <ProgressControl deliverable={d} onSave={(p) => onSetProgress(d.id, p)} />
                            {chip}
                            {remarksButton}
                        </>
                    )}
                </Box>
            );
        })}
    </Box>
);

// ── compact layout: cards instead of columns ────────────────────────────────

/**
 * Below TABLE_MIN_WIDTH the ten columns cannot hold their figures without
 * overlapping, so each stage becomes a card. Same data, same order, same
 * vocabulary — only the arrangement changes:
 *   cards  — figures keep a five-column grid, aligned from one stage to the next;
 *   narrow — Bill Value and Pending (what decides the next step) lead, the rest wrap below.
 */
type Layout = "table" | "cards" | "narrow";
/** Where the widest totals still fit their 7% columns. */
const TABLE_MIN_WIDTH = 1280;
/** Where the bill path still fits on one line per step. */
const CARDS_MIN_WIDTH = 800;

/** Narrow money: two leading figures side by side, the rest as a wrapping line — any figure length fits. */
const Figures: React.FC<{ primary: Figure[]; secondary: Figure[] }> = ({ primary, secondary }) => (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", overflow: "hidden" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 2, px: 1.25, py: 1, bgcolor: "action.hover" }}>
            {primary.map((f) => (
                <Amount key={f.label} label={f.label} value={f.value} statusCode={f.statusCode} strong align="left" />
            ))}
        </Box>
        {/* Label over figure, auto-fit columns: three across when they fit, two when not — never ragged.
            Figures that do not exist (unbilled stage, no TDS) are left out rather than shown as dashes. */}
        {secondary.some((f) => f.value !== null) && (
            <Box sx={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(6.5rem, 1fr))", columnGap: 2, rowGap: 0.75,
                px: 1.25, py: 1, borderTop: "1px solid", borderColor: "divider",
            }}>
                {secondary.filter((f) => f.value !== null).map((f) => (
                    <Amount key={f.label} align="left" label={f.label} value={f.value} statusCode={f.statusCode} />
                ))}
            </Box>
        )}
    </Box>
);

/** Work, Billing, Collection — each named, since a card has no column headers. Wraps as needed. */
const StatusLine: React.FC<{ row: ProjectBillingRow; onOpenTo: (tab: StageTab) => void; narrow?: boolean }> = ({ row, onOpenTo, narrow }) => narrow ? (
    // Phones: work bar on its own line, then Billing and Collection side by side, name over chip.
    <Stack spacing={1}>
        <Box onClick={jumpTo(onOpenTo, "work")}>
            <Progress label="Work" percent={row.work.progress} tone="primary.main" hint={workHintOf(row)} />
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: 1.5 }} onClick={jumpTo(onOpenTo, "billing")}>
            {([["Billing", billingStatusOf(row)], ["Collection", collectionStatusOf(row)]] as const).map(([label, status]) => (
                <Box key={label} sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4, mb: 0.25 }}>{label}</Typography>
                    <CellChip status={status} />
                </Box>
            ))}
        </Box>
    </Stack>
) : (
    // Cards: the same five tracks as the money row beneath, so Work, Billing and Collection
    // line up over the figures — labels above, in the figures' own label style.
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", columnGap: 2, alignItems: "end" }}>
        <Box sx={{ gridColumn: "span 2", cursor: "pointer", pr: 2 }} onClick={jumpTo(onOpenTo, "work")}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4, mb: 0.5 }}>Work</Typography>
            <Progress percent={row.work.progress} tone="primary.main" hint={workHintOf(row)} />
        </Box>
        {([["Billing", billingStatusOf(row)], ["Collection", collectionStatusOf(row)]] as const).map(([label, status]) => (
            // Wide: each chip hugs its label (a stretched chip across two tracks looks bloated).
            <Box key={label} sx={{ minWidth: 0, cursor: "pointer" }} onClick={jumpTo(onOpenTo, "billing")}>
                <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4, mb: 0.25 }}>{label}</Typography>
                <Box sx={{ display: "flex", maxWidth: "100%", "& > *": { maxWidth: "100%" } }}>
                    <SolidChip label={status.label} color={CHIP_COLOR[status.tone]} />
                </Box>
            </Box>
        ))}
    </Box>
);

const StageCard: React.FC<StageViewProps & { narrow: boolean }> = (props) => {
    const { narrow, row, open, onToggle, onOpenTo, actionsFor, timeout } = props;
    const figures = figuresOf(row);
    const actions = (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            sx={{
                cursor: "default", flexShrink: 0,
                // Phones: the primary action is a full-width, thumb-sized button beside the ⋮.
                // `actionsFor` returns its own inner Stack, so that is what has to stretch.
                ...(narrow && {
                    width: "100%",
                    // Descendant, not child: ActionGate's `display: contents` box sits in between in the DOM.
                    "& .MuiStack-root": { flex: 1, minWidth: 0, width: "100%", justifyContent: "stretch", gap: 1 },
                    "& .MuiStack-root > *": { marginLeft: "0 !important" },
                    "& .MuiButtonBase-root:not(.MuiIconButton-root)": { flex: 1, minHeight: 40, fontSize: 13 },
                    "& span:has(> .MuiButtonBase-root:not(.MuiIconButton-root))": { flex: 1, display: "flex" },
                    // The row's ⋮ (ProjectBillingWorkspace). `&&` outranks the button's own raised sx.
                    "&& .billing-row-more": { width: 40, height: 40, border: "1px solid", borderColor: "divider" },
                }),
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {actionsFor(row)}
        </Stack>
    );
    return (
        <Box component="section" aria-label={row.stageName} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper", overflow: "hidden" }}>
            <Box onClick={onToggle} sx={{ cursor: "pointer", px: 1.5, py: 1.25, "&:hover": { bgcolor: "action.hover" } }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Chevron open={open} label={row.stageName} onClick={onToggle} />
                    <StageName name={row.stageName} fontSize={15} />
                    <Typography sx={{ ...NUM, fontSize: 12.5, fontWeight: 600, color: "text.secondary", flexShrink: 0 }}>{row.percentage}%</Typography>
                    {!narrow && actions}
                </Stack>
                <Stack spacing={narrow ? 1.25 : 0} sx={{
                    ml: narrow ? 0 : 5, mt: 1,
                    // Cards: status and money share one tinted panel, split by a hairline.
                    ...(!narrow && { border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "action.hover", overflow: "hidden", "& > *": { px: 1.5, py: 1.1 } }),
                }}>
                    <StatusLine row={row} onOpenTo={onOpenTo} narrow={narrow} />
                    {narrow ? (
                        <Figures primary={figures.slice(3)} secondary={figures.slice(0, 3)} />
                    ) : (
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", columnGap: 2, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                            {/* A figure that does not exist (unbilled stage, no TDS) leaves its column
                                empty instead of printing a dash, so Bill Value and Pending stay aligned
                                from card to card without a row of placeholders. */}
                            {figures.map((f) => f.value === null
                                ? <Box key={f.label} aria-hidden />
                                : <Amount key={f.label} label={f.label} value={f.value} statusCode={f.statusCode} strong={f.strong} align="left" />)}
                        </Box>
                    )}
                    {narrow && actions}
                </Stack>
            </Box>
            <Collapse in={open} timeout={timeout} unmountOnExit>
                <Box sx={{ px: 1.5, pb: 1.5, pl: narrow ? 1.5 : 6.5 }}>
                    {/* Cards layout: path and detail sit side by side, with the path in its two-line
                        form — the five reserved tracks of the wide path would leave gaps and crowd the detail. */}
                    <StageDetail {...props} stacked={narrow} narrow={narrow} compactPath />
                </Box>
            </Collapse>
        </Box>
    );
};

/** Totals as label/figure pairs that wrap — the table's total row, for cards. */
const CompactTotal: React.FC<{ totals: ReturnType<typeof totalsOf> }> = ({ totals }) => (
    <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="baseline"
        columnGap={2.5}
        rowGap={0.5}
        sx={{ px: 1.5, py: 1.25, border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "action.hover" }}
    >
        <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Total</Typography>
        <Amount inline align="left" label="Bill Amount" value={totals.billAmount} />
        <Amount inline align="left" label="GST" value={totals.gst} />
        <Amount inline align="left" label="TDS" value={totals.tds} />
        <Amount inline align="left" label="Bill Value" value={totals.billValue} strong />
        <Amount inline align="left" label="Pending" value={totals.pending} strong />
    </Stack>
);

// ── billing activity ────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
    CASH: "Cash", CHEQUE: "Cheque", NEFT: "NEFT", RTGS: "RTGS", IMPS: "IMPS", UPI: "UPI",
    BANK_TRANSFER: "Bank transfer", ONLINE: "Online", OTHER: "Other",
};

/** Document lifecycle, in words. */
const DOC_STATUS: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Issued", SENT: "Sent", CANCELLED: "Cancelled" };

const linkSx = { minHeight: 28, height: 28, fontSize: 12, px: 1.25, whiteSpace: "nowrap" as const, flexShrink: 0 };
/** Same quiet filled look as Record Payment / Open Tax Invoice on the row. */
const pathActionSx = {
    height: 30,
    minHeight: 30,
    fontSize: 12,
    fontWeight: 600,
    borderRadius: "8px",
    whiteSpace: "nowrap" as const,
    boxShadow: "none",
    px: 1.5,
    flexShrink: 0,
    alignSelf: "center",
};

/** What the right card is showing — mirrors a click on the path. */
type PathFocus = "OVERVIEW" | "PROFORMA" | "PAYMENT" | "INVOICE";

type PathPayment = {
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string | null;
};

const docChipOf = (status: DocumentStatus | null): Status | null => {
    if (!status) return null;
    switch (status) {
        case "DRAFT": return { label: DOC_STATUS.DRAFT, tone: "attention" };
        case "PUBLISHED": return { label: DOC_STATUS.PUBLISHED, tone: "positive" };
        case "SENT": return { label: DOC_STATUS.SENT, tone: "positive" };
        case "CANCELLED": return { label: DOC_STATUS.CANCELLED, tone: "critical" };
        default: {
            const _never: never = status;
            return _never;
        }
    }
};

/** Same tracks on every step — kind, number, date, chip, amount. Chip grows so amount stays at the end. */
const PATH_COLS = "6.75rem 10.5rem 6.75rem minmax(6.25rem, 1fr) 8.75rem";

/**
 * One step on the path — kind, number, date, chip and amount stay on one line
 * with reserved tracks so they cannot collide.
 */
const PathStep: React.FC<{
    done: boolean;
    next?: boolean;
    selected?: boolean;
    last?: boolean;
    kind: string;
    title?: string;
    meta?: string;
    chip?: Status | null;
    amount?: number;
    /** Two lines — kind, number, amount / date, chip — instead of five reserved tracks. */
    narrow?: boolean;
    onSelect: () => void;
}> = ({ done, next, selected, last, kind, title, meta, chip, amount, narrow, onSelect }) => {
    const kindText = (
        <Typography sx={{
            fontSize: 13,
            fontWeight: 700,
            color: selected || done || next ? "text.primary" : "text.secondary",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
        }}>
            {kind}
        </Typography>
    );
    const titleText = <Typography noWrap sx={{ fontSize: 13, color: "text.secondary", minWidth: 0 }}>{title ?? ""}</Typography>;
    const metaText = <Typography sx={{ ...NUM, fontSize: 12.5, color: "text.secondary" }}>{meta ?? ""}</Typography>;
    const chipBox = <Box sx={{ justifySelf: narrow ? "end" : "start", minWidth: 0 }}>{chip ? <StatusChip status={chip} /> : null}</Box>;
    const amountText = (
        <Typography sx={{ ...NUM, fontSize: 13, fontWeight: 700, textAlign: "right" }}>
            {amount !== undefined ? formatCurrencyDecimal(amount) : ""}
        </Typography>
    );
    const marker = selected
        ? { border: "primary.main", fill: "primary.main" }
        : done
            ? { border: "success.main", fill: "success.main" }
            : next
                ? { border: "warning.main", fill: "warning.main" }
                : { border: "text.disabled", fill: "transparent" };
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", columnGap: 1.25, width: "100%" }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Box
                    aria-hidden
                    sx={{
                        width: 11, height: 11, mt: "6px", borderRadius: "50%", flexShrink: 0,
                        border: "2px solid",
                        borderColor: marker.border,
                        bgcolor: marker.fill,
                    }}
                />
                {!last && (
                    <Box sx={{
                        width: "1px", flex: 1, minHeight: 8, mt: 0.5,
                        bgcolor: done ? "success.main" : "divider",
                    }}
                    />
                )}
            </Box>
            <Box
                role="button"
                tabIndex={0}
                aria-current={selected ? "true" : undefined}
                onClick={onSelect}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect();
                    }
                }}
                sx={{
                    width: "100%",
                    minWidth: 0,
                    px: 1.25,
                    py: 0.7,
                    mb: last ? 0 : 0.25,
                    borderRadius: "8px",
                    cursor: "pointer",
                    bgcolor: selected
                        ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.08)
                        : "transparent",
                    "&:hover": {
                        bgcolor: selected
                            ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.22 : 0.12)
                            : "action.hover",
                    },
                }}
            >
                {narrow ? (
                    <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", columnGap: 1, rowGap: 0.4, alignItems: "center" }}>
                        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
                            {kindText}
                            {titleText}
                        </Stack>
                        {amountText}
                        {metaText}
                        {chipBox}
                    </Box>
                ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: PATH_COLS, columnGap: 1.5, alignItems: "center", width: "100%" }}>
                        {kindText}
                        {titleText}
                        {metaText}
                        {chipBox}
                        {amountText}
                    </Box>
                )}
            </Box>
        </Box>
    );
};

/** Right pane of the path+detail shell — no second card, just the selected step. */
const DetailShell: React.FC<{
    eyebrow: string;
    title: string;
    accent: string;
    aside?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}> = ({ eyebrow, title, accent, aside, action, children }) => (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%", height: "fit-content" }}>
        <Box sx={{ height: 3, bgcolor: accent, flexShrink: 0 }} />
        <Box sx={{ px: { xs: 1.5, md: 1.75 }, py: 1.5, minWidth: 0, flex: 1 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.25} sx={{ mb: 1.25, minWidth: 0 }}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", letterSpacing: "0.01em" }}>{eyebrow}</Typography>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: "text.primary", lineHeight: 1.35, mt: 0.25 }}>
                        {title}
                    </Typography>
                    {aside}
                </Box>
                {action && <Box sx={{ flexShrink: 0, pt: 0.25 }}>{action}</Box>}
            </Stack>
            {children}
        </Box>
    </Box>
);

/** Inset tiles — same card language as the bill-open / workspace summary. */
const Bento: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Box
        sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            minWidth: 0,
        }}
    >
        {children}
    </Box>
);

const Tile: React.FC<{
    label: string;
    wide?: boolean;
    min?: string;
    children: React.ReactNode;
}> = ({ label, wide, min = "8.5rem", children }) => (
    <Box
        sx={{
            flex: wide ? "1 1 100%" : `1 0 ${min}`,
            minWidth: wide ? "100%" : min,
            px: 1.25,
            py: 1,
            borderRadius: "10px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.05 : 0.03),
        }}
    >
        <Typography noWrap sx={{ fontSize: 12, color: "text.secondary", mb: 0.45, lineHeight: 1.3 }}>{label}</Typography>
        <Box sx={{ minWidth: 0, overflow: "hidden" }}>{children}</Box>
    </Box>
);

/** One aligned label / value row — used when the card is too narrow for a 3-tile grid. */
const FactList: React.FC<{ items: Array<{ label: string; value: React.ReactNode }> }> = ({ items }) => (
    <Box
        sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "10px",
            overflow: "hidden",
            minWidth: 0,
            bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.05 : 0.03),
        }}
    >
        {items.map((item, index) => (
            <Stack
                key={item.label}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                sx={{
                    px: 1.25,
                    py: 0.7,
                    minHeight: 0,
                    minWidth: 0,
                    borderTop: index ? "1px solid" : 0,
                    borderColor: "divider",
                }}
            >
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", flexShrink: 0 }}>{item.label}</Typography>
                <Box sx={{ minWidth: 0, overflow: "hidden", display: "flex", justifyContent: "flex-end", textAlign: "right" }}>
                    {item.value}
                </Box>
            </Stack>
        ))}
    </Box>
);

/** Right card — content follows the selected path step. */
const BillFocusPanel: React.FC<{
    focus: PathFocus;
    selectedPaymentId: string | null;
    bill: BillOnRow;
    payments: PathPayment[];
    paymentsLoading: boolean;
    paymentsError: boolean;
    onRetryPayments: () => void;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
}> = ({
    focus, selectedPaymentId, bill, payments, paymentsLoading, paymentsError, onRetryPayments,
    onOpenDocument, onToggleTds, canRecordPayment, busy,
}) => {
    const settled = bill.outstandingAmount <= 0;
    const overdue = isOverdue(bill);
    const pending = Math.max(0, bill.outstandingAmount);
    const proformaDone = Boolean(bill.proformaNumber) && bill.proformaStatus !== "DRAFT";
    const paidInFull = bill.status === "PAID" || bill.status === "INVOICED";
    const invoiceDone = Boolean(bill.invoiceNumber) && bill.invoiceStatus !== "DRAFT";

    const docButton = (documentId: string | null, status: string | null) =>
        documentId ? (
            <ActionGate>
                <WtButton
                    size="small"
                    inverted
                    sx={pathActionSx}
                    onClick={() => onOpenDocument(documentId, status)}
                >
                    {status === "DRAFT" ? "Edit" : "Open"}
                </WtButton>
            </ActionGate>
        ) : null;

    if (focus === "PROFORMA") {
        return (
            <DetailShell
                eyebrow="Proforma"
                title={bill.proformaNumber ?? "Not created yet"}
                accent={proformaDone ? "success.main" : bill.proformaDocumentId ? "warning.main" : "text.disabled"}
                action={docButton(bill.proformaDocumentId, bill.proformaStatus)}
            >
                <FactList
                    items={[
                        {
                            label: "Amount",
                            value: (
                                <Typography sx={{ ...NUM, fontSize: 15, fontWeight: 700 }}>
                                    {formatCurrencyDecimal(bill.totalAmount)}
                                </Typography>
                            ),
                        },
                        {
                            label: "Status",
                            value: docChipOf(bill.proformaStatus)
                                ? <StatusChip status={docChipOf(bill.proformaStatus)!} />
                                : <StatusChip status={{ label: "Not created", tone: "neutral" }} />,
                        },
                        {
                            label: "Date",
                            value: (
                                <Typography sx={{ ...NUM, fontSize: 14, fontWeight: 700 }}>
                                    {bill.proformaDate ? formatDate(bill.proformaDate) : "—"}
                                </Typography>
                            ),
                        },
                    ]}
                />
                {bill.proformaVersions > 1 && (
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1 }}>
                        Revision {bill.proformaVersions}
                    </Typography>
                )}
            </DetailShell>
        );
    }

    if (focus === "PAYMENT") {
        const selected = selectedPaymentId ? payments.find((p) => p.id === selectedPaymentId) : undefined;
        if (selected) {
            return (
                <DetailShell
                    eyebrow="Payment"
                    title={formatDate(selected.paymentDate)}
                    accent="success.main"
                >
                    <FactList
                        items={[
                            {
                                label: "Amount",
                                value: (
                                    <Typography sx={{ ...NUM, fontSize: 15, fontWeight: 700 }}>
                                        {formatCurrencyDecimal(selected.amount)}
                                    </Typography>
                                ),
                            },
                            {
                                label: "Method",
                                value: <StatusChip status={{ label: METHOD_LABEL[selected.method] ?? selected.method, tone: "active" }} />,
                            },
                            {
                                label: "Date",
                                value: (
                                    <Typography sx={{ ...NUM, fontSize: 14, fontWeight: 700 }}>
                                        {formatDate(selected.paymentDate)}
                                    </Typography>
                                ),
                            },
                        ]}
                    />
                    {selected.reference && (
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 1 }}>{selected.reference}</Typography>
                    )}
                </DetailShell>
            );
        }
        return (
            <DetailShell
                eyebrow="Payments"
                title={bill.paymentCount > 0
                    ? `${bill.paymentCount} payment${bill.paymentCount === 1 ? "" : "s"}`
                    : "No payments yet"}
                accent={paidInFull ? "success.main" : overdue ? "error.main" : "warning.main"}
                aside={bill.dueDate ? (
                    <Typography sx={{ fontSize: 12, fontWeight: overdue ? 700 : 500, color: overdue ? "error.main" : "text.secondary", mt: 0.25 }}>
                        {overdue ? "Overdue" : "Due"} {formatDate(bill.dueDate)}
                    </Typography>
                ) : undefined}
            >
                <Bento>
                    <Tile label="Received">
                        <Amount value={bill.receivedAmount} strong align="left" />
                    </Tile>
                    <Tile label="Pending">
                        <Amount
                            value={pending}
                            strong
                            align="left"
                            tone={settled ? "success.main" : overdue ? "error.main" : "warning.dark"}
                            statusCode={paymentCodeOf(bill)}
                        />
                    </Tile>
                    {!proformaDone && (
                        <Tile label="Next" wide>
                            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Issue the proforma first.</Typography>
                        </Tile>
                    )}
                    {proformaDone && bill.paymentCount === 0 && (
                        <Tile label="Awaiting" wide>
                            <Amount value={bill.expectedAmount} strong align="left" />
                        </Tile>
                    )}
                    {bill.tdsAmount > 0 && (
                        <Tile label={`TDS ${bill.tdsRate}%`} wide>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
                                <Amount
                                    value={bill.tdsAmount}
                                    strong
                                    align="left"
                                    statusCode={bill.tdsDeposited ? "TDS_PAID" : "TDS_UNPAID"}
                                />
                                <ActionGate>
                                    <WtButton
                                        size="small"
                                        ghost
                                        sx={{ ...linkSx, minHeight: 26, height: 26 }}
                                        disabled={!canRecordPayment || busy}
                                        onClick={() => onToggleTds(bill.id, !bill.tdsDeposited)}
                                    >
                                        {bill.tdsDeposited ? "Undo" : "Mark deposited"}
                                    </WtButton>
                                </ActionGate>
                            </Stack>
                        </Tile>
                    )}
                </Bento>
                {paymentsLoading && <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>Loading payments…</Typography>}
                {paymentsError && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                        <Typography sx={{ fontSize: 12, color: "error.main" }}>Could not load payments.</Typography>
                        <WtButton size="small" ghost sx={linkSx} onClick={onRetryPayments}>Retry</WtButton>
                    </Stack>
                )}
            </DetailShell>
        );
    }

    if (focus === "INVOICE") {
        return (
            <DetailShell
                eyebrow="Tax invoice"
                title={bill.invoiceNumber ?? "Not raised yet"}
                accent={invoiceDone ? "success.main" : paidInFull ? "warning.main" : "text.disabled"}
                action={docButton(bill.invoiceDocumentId, bill.invoiceStatus)}
            >
                <FactList
                    items={[
                        {
                            label: "Amount",
                            value: (
                                <Typography sx={{ ...NUM, fontSize: 15, fontWeight: 700 }}>
                                    {formatCurrencyDecimal(bill.totalAmount)}
                                </Typography>
                            ),
                        },
                        {
                            label: "Status",
                            value: docChipOf(bill.invoiceStatus)
                                ? <StatusChip status={docChipOf(bill.invoiceStatus)!} />
                                : <StatusChip status={{ label: paidInFull ? "Ready" : "Waiting", tone: paidInFull ? "attention" : "neutral" }} />,
                        },
                        {
                            label: "Date",
                            value: (
                                <Typography sx={{ ...NUM, fontSize: 14, fontWeight: 700 }}>
                                    {bill.invoiceDate ? formatDate(bill.invoiceDate) : "—"}
                                </Typography>
                            ),
                        },
                    ]}
                />
            </DetailShell>
        );
    }

    return (
        <DetailShell
            eyebrow="Bill overview"
            title={bill.billNumber}
            accent={settled ? "success.main" : overdue ? "error.main" : "primary.main"}
            aside={bill.dueDate ? (
                <Typography sx={{ fontSize: 12, fontWeight: overdue ? 700 : 500, color: overdue ? "error.main" : "text.secondary", mt: 0.25 }}>
                    {overdue ? "Overdue" : "Due"} {formatDate(bill.dueDate)}
                </Typography>
            ) : undefined}
        >
            <Bento>
                <Tile label="Bill Value">
                    <Amount value={bill.totalAmount} strong align="left" />
                </Tile>
                <Tile label="Pending">
                    <Amount value={pending} strong align="left" statusCode={paymentCodeOf(bill)} />
                </Tile>
            </Bento>
            <Box sx={{ mt: 1 }}>
                <Bento>
                    <Tile label="Bill Amount" min="7.25rem">
                        <Amount
                            value={billAmountOf(bill)}
                            strong
                            align="left"
                            statusCode={bill.basicPaid ? "BASIC_PAID" : "BASIC_UNPAID"}
                        />
                    </Tile>
                    {bill.gstAmount > 0 && (
                        <Tile label={`GST ${bill.gstRate}%`} min="7.25rem">
                            <Amount
                                value={bill.gstAmount}
                                strong
                                align="left"
                                statusCode={bill.gstPaid ? "GST_PAID" : "GST_UNPAID"}
                            />
                        </Tile>
                    )}
                    {bill.tdsAmount > 0 && (
                        <Tile label={`TDS ${bill.tdsRate}%`} min="7.25rem">
                            <Amount
                                value={bill.tdsAmount}
                                strong
                                align="left"
                                statusCode={bill.tdsDeposited ? "TDS_PAID" : "TDS_UNPAID"}
                            />
                        </Tile>
                    )}
                </Bento>
            </Box>
        </DetailShell>
    );
};

const BillingActivity: React.FC<{
    projectId: string;
    row: ProjectBillingRow;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
    /** Detail card below the path instead of beside it. */
    stacked?: boolean;
    narrow?: boolean;
    /** Two-line path rows without the phone-only changes (full-width tabs, tight padding). */
    compactPath?: boolean;
}> = ({ projectId, row, onOpenDocument, onToggleTds, canRecordPayment, busy, stacked, narrow: phone, compactPath }) => {
    const narrow = phone || compactPath;
    const bill = liveBill(row);

    const proformaDone = Boolean(bill && bill.proformaNumber && bill.proformaStatus !== "DRAFT");
    const paidInFull = bill?.status === "PAID" || bill?.status === "INVOICED";
    const invoiceDone = Boolean(bill && bill.invoiceNumber && bill.invoiceStatus !== "DRAFT");
    const overdue = bill ? isOverdue(bill) : false;

    const nextStep: PathFocus = !bill
        ? "OVERVIEW"
        : !proformaDone
            ? "PROFORMA"
            : !paidInFull
                ? "PAYMENT"
                : !invoiceDone
                    ? "INVOICE"
                    : "OVERVIEW";

    const [focus, setFocus] = useState<PathFocus>(nextStep);
    const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

    useEffect(() => {
        setFocus(nextStep);
        setSelectedPaymentId(null);
    }, [bill?.id, nextStep]);

    const { data: detail, isLoading, isError, refetch } = useQuery({
        queryKey: ["project-billing", projectId, "bill", bill?.id],
        queryFn: () => getBill(bill!.id),
        enabled: Boolean(bill && bill.paymentCount > 0),
    });

    if (!bill) {
        return (
            <Box sx={{ px: 1.5, py: 1.25, border: "1px solid", borderColor: "divider", borderRadius: "12px" }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>Not billed yet</Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.35 }}>
                    {row.blockMessage ?? `${formatCurrencyDecimal(row.amount)} can be billed now. Raise the bill to start its proforma.`}
                </Typography>
            </Box>
        );
    }

    const payments: PathPayment[] = ((detail?.payments ?? []) as PathPayment[])
        .map((p) => ({ ...p, amount: Number(p.amount) }))
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    const awaitingPayment = proformaDone && !paidInFull;
    const select = (kind: PathFocus, paymentId: string | null = null) => {
        setFocus(kind);
        setSelectedPaymentId(paymentId);
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: stacked ? "column" : "row",
                alignItems: "stretch",
                width: "100%",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
                overflow: "hidden",
                bgcolor: "background.paper",
            }}
        >
            <Box sx={{ flex: "1 1 auto", minWidth: 0, px: narrow ? 1 : 1.5, py: 1.25 }}>
                <PathStep
                    done={false}
                    selected={focus === "OVERVIEW"}
                    kind="Bill"
                    title={bill.billNumber}
                    amount={bill.totalAmount}
                    narrow={narrow} onSelect={() => select("OVERVIEW")}
                />

                <PathStep
                    done={proformaDone}
                    next={nextStep === "PROFORMA"}
                    selected={focus === "PROFORMA"}
                    kind="Proforma"
                    title={bill.proformaNumber ?? undefined}
                    meta={bill.proformaDate ? formatDate(bill.proformaDate) : undefined}
                    chip={docChipOf(bill.proformaStatus) ?? { label: "Not created", tone: "neutral" }}
                    narrow={narrow} onSelect={() => select("PROFORMA")}
                />

                {payments.map((payment) => (
                    <PathStep
                        key={payment.id}
                        done
                        selected={focus === "PAYMENT" && selectedPaymentId === payment.id}
                        kind="Payment"
                        meta={formatDate(payment.paymentDate)}
                        chip={{ label: METHOD_LABEL[payment.method] ?? payment.method, tone: "active" }}
                        amount={payment.amount}
                        narrow={narrow} onSelect={() => select("PAYMENT", payment.id)}
                    />
                ))}

                {isLoading && bill.paymentCount > 0 && payments.length === 0 && (
                    <Typography sx={{ fontSize: 12, color: "text.secondary", pl: 4, py: 0.5 }}>Loading payments…</Typography>
                )}
                {isError && (
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 4, py: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: "error.main" }}>Could not load payments.</Typography>
                        <WtButton size="small" ghost sx={linkSx} onClick={() => { void refetch(); }}>Retry</WtButton>
                    </Stack>
                )}

                {awaitingPayment && (
                    <PathStep
                        done={false}
                        next
                        selected={focus === "PAYMENT" && !selectedPaymentId}
                        kind="Payment"
                        title={overdue ? "Overdue" : "Awaiting"}
                        chip={{ label: overdue ? "Overdue" : "Pending", tone: overdue ? "critical" : "attention" }}
                        amount={bill.outstandingAmount}
                        narrow={narrow} onSelect={() => select("PAYMENT")}
                    />
                )}

                <PathStep
                    last
                    done={invoiceDone}
                    next={nextStep === "INVOICE"}
                    selected={focus === "INVOICE"}
                    kind="Tax invoice"
                    title={bill.invoiceNumber ?? undefined}
                    meta={bill.invoiceDate ? formatDate(bill.invoiceDate) : undefined}
                    chip={docChipOf(bill.invoiceStatus) ?? { label: paidInFull ? "Ready" : "Waiting", tone: paidInFull ? "attention" : "neutral" }}
                    narrow={narrow} onSelect={() => select("INVOICE")}
                />
            </Box>

            <Box
                sx={{
                    flex: stacked ? "none" : "0 0 22rem",
                    borderLeft: stacked ? 0 : "1px solid",
                    borderTop: stacked ? "1px solid" : 0,
                    borderColor: "divider",
                    bgcolor: (theme) => alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.02),
                }}
            >
                <BillFocusPanel
                    focus={focus}
                    selectedPaymentId={selectedPaymentId}
                    bill={bill}
                    payments={payments}
                    paymentsLoading={isLoading}
                    paymentsError={isError}
                    onRetryPayments={() => { void refetch(); }}
                    onOpenDocument={onOpenDocument}
                    onToggleTds={onToggleTds}
                    canRecordPayment={canRecordPayment}
                    busy={busy}
                />
            </Box>
        </Box>
    );
};

export default ProjectBillingTree;
