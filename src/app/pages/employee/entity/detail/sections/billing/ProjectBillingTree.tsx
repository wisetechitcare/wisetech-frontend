
import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Box, Collapse, Divider, IconButton, Stack, Tooltip, Typography, useMediaQuery,
} from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { WtButton } from "@app/modules/common/components/ui";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { getBill, type BillOnRow, type ProjectBillingRow } from "@services/bills";
import type { ProjectDeliverable, ProjectStage } from "@services/projectExecution";

/**
 * Project → Billing: the stage-based billing workspace.
 *
 *   Stage → Deliverable → Billing activity → the exact money arithmetic.
 *
 * Progressive disclosure: a stage shows its roll-up, a deliverable shows where it
 * stands on three INDEPENDENT dimensions (work, billing, collection), and only an
 * opened deliverable shows its documents, payments and arithmetic.
 *
 * THE COMPANY'S BILLING VOCABULARY — identical to the Billing Tracker and the
 * Invoice Tracker, word for word and rule for rule, so this tab can be joined to
 * them without a translation layer:
 *
 *   Per bill (Invoice Tracker columns)
 *   • Bill Amount — the basic amount MINUS the TDS withheld from it (the cash part).
 *   • GST         — with its rate. Bill Amount and GST are each Received / Awaited.
 *   • TDS         — withheld by the client; Deposited / Not deposited.
 *   • Bill Value  — basic + GST = Bill Amount + TDS + GST. The document's face value.
 *   • Received / Pending on the bill — cash in, and what the client still has to
 *     transfer (Bill Value − TDS − received).
 *
 *   Per stage / project (Billing Tracker columns)
 *   • Value (PO Value for the project) — commercials, EXCLUDING GST.
 *   • Received — cash in: GST included, TDS already deducted.
 *   • Pending  — Value − Received, exactly the Tracker's "Total Pending".
 */

// ── shared billing rules (the workspace imports these, so the two agree) ─────

export type BillingFilterTab = "ALL" | "NEEDS_ATTENTION" | "PENDING" | "PAID" | "DRAFT";
export type BillingSortOption = "STAGE" | "OUTSTANDING" | "RECENT";

/** A cancelled bill no longer counts — the deliverable is billable again. */
export const liveBill = (row: ProjectBillingRow) =>
    row.bill && row.bill.status !== "CANCELLED" ? row.bill : null;

/** What, if anything, is waiting on us for this deliverable. Null when nothing is. */
export const attentionOf = (row: ProjectBillingRow):
    | "READY_TO_BILL" | "PROFORMA" | "PAYMENT" | "TAX_INVOICE" | null => {
    const bill = liveBill(row);
    if (!bill) return row.workStatus === "COMPLETED" && !row.blockReason ? "READY_TO_BILL" : null;
    if (bill.status === "DRAFT") return "PROFORMA";
    if (bill.status === "PROFORMA" || bill.status === "PARTIALLY_PAID") return "PAYMENT";
    if (bill.status === "PAID") return "TAX_INVOICE";
    return null;
};

/** Filter tabs, as predicates. Each tab is one clear question. */
export const FILTERS: Record<BillingFilterTab, { label: string; match: (row: ProjectBillingRow) => boolean }> = {
    ALL: { label: "All", match: () => true },
    NEEDS_ATTENTION: { label: "Needs attention", match: (r) => attentionOf(r) !== null },
    PENDING: {
        label: "Payment pending",
        match: (r) => ["PROFORMA", "PARTIALLY_PAID"].includes(liveBill(r)?.status ?? ""),
    },
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

const isOverdue = (bill: BillOnRow) =>
    bill.outstandingAmount > 0 && !!bill.dueDate && new Date(bill.dueDate) < new Date(new Date().toDateString());

/** Latest dated thing that happened on a deliverable, for "Recent activity". */
const lastActivityOf = (row: ProjectBillingRow) => {
    const b = liveBill(row);
    const dates = [row.completedAt, b?.billDate, b?.proformaDate, b?.invoiceDate, b?.tdsDepositedAt]
        .filter(Boolean)
        .map((d) => new Date(d as string).getTime());
    return dates.length ? Math.max(...dates) : 0;
};

// ── the three dimensions ────────────────────────────────────────────────────

type Tone = "positive" | "attention" | "critical" | "active" | "neutral";

/** Tone → theme colour. Muted, and never the only signal: every status carries text. */
const TONE_COLOR: Record<Tone, string> = {
    positive: "success.main",
    attention: "warning.main",
    critical: "error.main",
    active: "primary.main",
    neutral: "text.disabled",
};

interface Status { label: string; tone: Tone }

const workStatusOf = (row: ProjectBillingRow): Status =>
    row.workStatus === "COMPLETED" ? { label: "Completed", tone: "positive" }
        : row.workStatus === "IN_PROGRESS" ? { label: "In progress", tone: "active" }
            : { label: "Not started", tone: "neutral" };

const billingStatusOf = (row: ProjectBillingRow): Status => {
    const bill = liveBill(row);
    if (!bill) {
        if (row.workStatus !== "COMPLETED") return { label: "Not billed", tone: "neutral" };
        return row.blockReason ? { label: "Not billable", tone: "neutral" } : { label: "Ready to bill", tone: "attention" };
    }
    switch (bill.status) {
        case "DRAFT": return { label: "Proforma draft", tone: "attention" };
        case "PROFORMA":
        case "PARTIALLY_PAID": return { label: bill.proformaStatus === "SENT" ? "Proforma sent" : "Proforma issued", tone: "active" };
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

/** A status as a coloured dot + text. Never colour alone. */
const StatusText: React.FC<{ status: Status; caption?: string }> = ({ status, caption }) => (
    <Box sx={{ minWidth: 0 }}>
        {caption && <Typography sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4 }}>{caption}</Typography>}
        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: TONE_COLOR[status.tone], flexShrink: 0 }} />
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: "text.primary" }}>{status.label}</Typography>
        </Stack>
    </Box>
);

// ── small pieces ────────────────────────────────────────────────────────────

const NUM = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } as const;

/** Label over a right-aligned figure — the unit every money column is built from. */
const Amount: React.FC<{
    label: string;
    value: number | null;
    tone?: string;
    strong?: boolean;
    note?: string;
    /** This component's settlement, as the Invoice Tracker labels it (Received / Awaited …). */
    settle?: Status;
}> = ({ label, value, tone, strong, note, settle }) => (
    <Box sx={{ textAlign: "right", minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 11, color: "text.secondary", lineHeight: 1.4 }}>{label}</Typography>
        <Typography sx={{ ...NUM, fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, color: value ? tone ?? "text.primary" : "text.disabled" }}>
            {value === null ? "—" : formatCurrencyDecimal(value)}
        </Typography>
        {settle && (
            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: TONE_COLOR[settle.tone], flexShrink: 0 }} />
                <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>{settle.label}</Typography>
            </Stack>
        )}
        {note && <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>{note}</Typography>}
    </Box>
);

const Progress: React.FC<{ label: string; percent: number; tone: string; hint: string }> = ({ label, percent, tone, hint }) => (
    <Tooltip title={hint}>
        <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{label}</Typography>
                <Typography sx={{ ...NUM, fontSize: 11.5, fontWeight: 700 }}>{percent}%</Typography>
            </Stack>
            <Box
                role="progressbar"
                aria-label={label}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                sx={{ height: 5, borderRadius: 3, bgcolor: "action.hover", overflow: "hidden" }}
            >
                <Box sx={{ width: `${percent}%`, height: "100%", bgcolor: tone, borderRadius: 3 }} />
            </Box>
        </Box>
    </Tooltip>
);

const Chevron: React.FC<{ open: boolean; label: string; onClick: () => void }> = ({ open, label, onClick }) => (
    <IconButton
        size="small"
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        sx={{
            width: 32, height: 32, borderRadius: "8px", flexShrink: 0,
            color: open ? "primary.main" : "text.secondary",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 180ms ease",
            "@media (prefers-reduced-motion: reduce)": { transition: "none" },
        }}
    >
        <KTIcon iconName="right" className="fs-6" />
    </IconButton>
);

/**
 * "Advance (To be paid along with the Work Order)" → title + description. The
 * project's own stage names carry their terms in brackets; this shows them as the
 * stage's subtitle instead of inventing one.
 */
const splitStageName = (name: string) => {
    const m = name.match(/^(.*?)\s*\((.+)\)\s*$/);
    return m ? { title: m[1], note: m[2] } : { title: name, note: null };
};

// ── the workspace ───────────────────────────────────────────────────────────

export interface ProjectBillingTreeProps {
    projectId: string;
    rows: ProjectBillingRow[];
    filterTab: BillingFilterTab;
    searchQuery: string;
    sortBy: BillingSortOption;
    /** The primary step and overflow menu for one deliverable — owned by the workspace. */
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
    /**
     * The project's stages as execution sees them. Supplies what billing rows cannot:
     * stages with no deliverables yet, each stage's percentage allocation, and each
     * deliverable's remarks and completer.
     */
    stages?: ProjectStage[];
    /** Opens the add-deliverable form for a stage. */
    onAddDeliverable?: (stageId: string) => void;
}

interface StageNode {
    id: string;
    title: string;
    note: string | null;
    sort: number;
    rows: ProjectBillingRow[];
    value: number;
    received: number;
    outstanding: number;
    notBilled: number;

    done: number;
    billed: number;
    attention: number;
    /** Deliverable shares within the stage must total 100%; null until execution data loads. */
    allocation: { percentageTotal: number; isBalanced: boolean } | null;
}

const ProjectBillingTree: React.FC<ProjectBillingTreeProps> = ({
    projectId, rows, filterTab, searchQuery, sortBy, actionsFor, onOpenDocument, onToggleTds,
    canRecordPayment, busy, stages: executionStages = [], onAddDeliverable,
}) => {
    const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

    /** Execution detail per deliverable (remarks, completer) — billing rows do not carry it. */
    const detailById = useMemo(() => {
        const map = new Map<string, ProjectDeliverable>();
        executionStages.forEach((s) => s.deliverables.forEach((d) => map.set(d.id, d)));
        return map;
    }, [executionStages]);

    /** Roll-ups over ALL deliverables — a stage's figures are facts about the stage, not the filter. */
    const stages = useMemo<StageNode[]>(() => {
        const byStage = new Map<string, StageNode>();
        const blank = (id: string, name: string, sort: number): StageNode => ({
            id, ...splitStageName(name), sort, rows: [],
            value: 0, received: 0, outstanding: 0, notBilled: 0,
            done: 0, billed: 0, attention: 0, allocation: null,
        });
        // Seeded from execution first, so a stage with no deliverables yet still
        // appears — it is where the first one gets added.
        executionStages.forEach((s) => {
            const node = blank(s.id, s.name, s.sortOrder);
            node.allocation = s.allocation ?? null;
            byStage.set(s.id, node);
        });
        rows.forEach((row) => {
            let node = byStage.get(row.stageId);
            if (!node) {
                node = blank(row.stageId, row.stageName, row.stageSortOrder);
                byStage.set(row.stageId, node);
            }
            const bill = liveBill(row);
            node.rows.push(row);
            node.value += row.amount;
            if (bill) {
                node.billed += 1;
                node.received += bill.receivedAmount;
                node.outstanding += bill.outstandingAmount;
            } else {
                node.notBilled += row.amount;
            }
            if (row.workStatus === "COMPLETED") node.done += 1;
            if (attentionOf(row)) node.attention += 1;
        });
        return [...byStage.values()].sort((a, b) => a.sort - b.sort);
    }, [rows, executionStages]);

    // Opens with ONE stage: the first that needs attention, else the first. Set
    // once, not re-derived, so a refetch after a payment never re-folds the page.
    const [openStages, setOpenStages] = useState<Set<string>>(() => {
        const first = stages.find((s) => s.attention > 0) ?? stages[0];
        return new Set(first ? [first.id] : []);
    });
    const [openRows, setOpenRows] = useState<Set<string>>(() => new Set());

    const query = searchQuery.trim().toLowerCase();
    const filtering = filterTab !== "ALL" || query !== "";

    const visibleStages = useMemo(() => stages
        .map((stage) => {
            const matches = stage.rows.filter((row) => {
                if (!FILTERS[filterTab].match(row)) return false;
                if (!query) return true;
                const bill = liveBill(row);
                return [row.deliverableName, row.stageName, bill?.proformaNumber, bill?.invoiceNumber, bill?.billNumber]
                    .some((text) => text?.toLowerCase().includes(query));
            });
            if (sortBy === "OUTSTANDING") {
                matches.sort((a, b) => (liveBill(b)?.outstandingAmount ?? 0) - (liveBill(a)?.outstandingAmount ?? 0));
            } else if (sortBy === "RECENT") {
                matches.sort((a, b) => lastActivityOf(b) - lastActivityOf(a));
            }
            return { ...stage, visible: matches };
        })
        // Unfiltered, an empty stage stays visible (its body offers "Add deliverable");
        // a filter or search shows only stages it actually matched in.
        .filter((stage) => stage.visible.length > 0 || (!filtering && stage.rows.length === 0)), [stages, filterTab, query, sortBy, filtering]);

    // A filter or search opens every stage it matched in, so its results are never
    // hidden inside a closed section. Keyed on the filter only, not on the data.
    useEffect(() => {
        if (filtering) setOpenStages(new Set(visibleStages.map((s) => s.id)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterTab, query]);

    const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
        setter((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });

    const allOpen = visibleStages.every((s) => openStages.has(s.id));
    const timeout = reduceMotion ? 0 : 180;

    if (visibleStages.length === 0) {
        return (
            <Box sx={{ py: 5, px: 3, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: "10px" }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Nothing matches</Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.5 }}>
                    {filterTab === "NEEDS_ATTENTION" && !query
                        ? "No deliverable is waiting on an action right now."
                        : "Clear the search or pick another filter to see more deliverables."}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
                    {visibleStages.length} stage{visibleStages.length === 1 ? "" : "s"}
                </Typography>
                <WtButton
                    size="small" ghost
                    onClick={() => setOpenStages(allOpen ? new Set() : new Set(visibleStages.map((s) => s.id)))}
                    sx={{ minHeight: 28, height: 28, fontSize: 12, color: "text.secondary" }}
                >
                    {allOpen ? "Collapse all" : "Expand all"}
                </WtButton>
            </Stack>

            <Stack spacing={1.5}>
                {visibleStages.map((stage) => {
                    const open = openStages.has(stage.id);
                    const workPct = stage.rows.length ? Math.round((stage.done / stage.rows.length) * 100) : 0;
                    const unbalanced = stage.allocation && stage.rows.length > 0 && !stage.allocation.isBalanced;
                    // The Tracker's rule, applied to one stage: Pending = Value − Received.
                    const pending = Math.round((stage.value - stage.received) * 100) / 100;
                    const collectedPct = stage.value > 0
                        ? Math.min(100, Math.max(0, Math.round((stage.received / stage.value) * 100)))
                        : 0;
                    return (
                        <Box
                            component="section"
                            key={stage.id}
                            aria-label={stage.title}
                            sx={{ border: "1px solid", borderColor: "divider", borderRadius: "10px", bgcolor: "background.paper", overflow: "hidden" }}
                        >
                            {/* ── stage header ─────────────────────────────── */}
                            <Box
                                onClick={() => toggle(setOpenStages, stage.id)}
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(260px, 1.25fr) minmax(220px, 0.9fr) 384px" },
                                    columnGap: 4,
                                    rowGap: 1.5,
                                    alignItems: "center",
                                    px: { xs: 1.5, sm: 2 },
                                    py: 1.75,
                                    cursor: "pointer",
                                    transition: "background-color 150ms ease",
                                    "&:hover": { bgcolor: "action.hover" },
                                }}
                            >
                                <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ minWidth: 0 }}>
                                    <Chevron open={open} label={stage.title} onClick={() => toggle(setOpenStages, stage.id)} />
                                    <Box sx={{ minWidth: 0, pt: 0.25 }}>
                                        <Typography sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.35 }}>{stage.title}</Typography>
                                        {stage.note && (
                                            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>{stage.note}</Typography>
                                        )}
                                        <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={2} rowGap={0.5} sx={{ mt: 0.75 }}>
                                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                                {stage.done} of {stage.rows.length} deliverables complete, {stage.billed} billed
                                            </Typography>
                                            {stage.attention > 0 && (
                                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                                    <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "warning.main" }} />
                                                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "warning.dark" }}>
                                                        {stage.attention} action{stage.attention === 1 ? "" : "s"} pending
                                                    </Typography>
                                                </Stack>
                                            )}
                                            {unbalanced && (
                                                <Tooltip title="Deliverable shares in a stage must add up to 100%, or its amounts will not match the stage value.">
                                                    <Stack direction="row" alignItems="center" spacing={0.75}>
                                                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "error.main" }} />
                                                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: "error.main" }}>
                                                            Shares total {stage.allocation!.percentageTotal}%, must be 100%
                                                        </Typography>
                                                    </Stack>
                                                </Tooltip>
                                            )}
                                            {onAddDeliverable && (
                                                <WtButton
                                                    size="small"
                                                    ghost
                                                    onClick={(e) => { e.stopPropagation(); onAddDeliverable(stage.id); }}
                                                    startIcon={<KTIcon iconName="plus" className="fs-7" />}
                                                    sx={{ minHeight: 24, height: 24, fontSize: 12, px: 1, color: "primary.main", border: 0 }}
                                                >
                                                    Add deliverable
                                                </WtButton>
                                            )}
                                        </Stack>
                                    </Box>
                                </Stack>

                                {/* Work and collection are different questions — two bars, never one. */}
                                <Stack spacing={1.25} sx={{ pl: { xs: 5.5, lg: 0 } }}>
                                    <Progress
                                        label="Work"
                                        percent={workPct}
                                        tone="primary.main"
                                        hint={`${stage.done} of ${stage.rows.length} deliverables marked complete`}
                                    />
                                    <Progress
                                        label="Collection"
                                        percent={collectedPct}
                                        tone="success.main"
                                        hint={`${formatCurrencyDecimal(stage.received)} received against ${formatCurrencyDecimal(stage.value)} stage value`}
                                    />
                                </Stack>

                                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 2, pl: { xs: 5.5, lg: 0 } }}>
                                    <Amount label="Stage Value" value={stage.value} strong />
                                    <Amount label="Received" value={stage.received} strong />
                                    <Amount
                                        label="Pending"
                                        value={pending}
                                        tone="warning.dark"
                                        strong
                                        note={stage.outstanding > 0 ? `${formatCurrencyDecimal(stage.outstanding)} awaited on bills` : undefined}
                                    />
                                </Box>
                            </Box>

                            {/* ── deliverables ─────────────────────────────── */}
                            <Collapse in={open} timeout={timeout} unmountOnExit>
                                <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                                    {stage.visible.length === 0 && (
                                        <Box sx={{ pl: { xs: 1.5, sm: 7.25 }, pr: 2, py: 2 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>No deliverables yet</Typography>
                                            <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
                                                Bills are raised against deliverables. Add one, and give the stage&apos;s deliverables shares that total 100%.
                                            </Typography>
                                        </Box>
                                    )}
                                    {stage.visible.map((row, index) => (
                                        <DeliverableRow
                                            key={row.deliverableId}
                                            projectId={projectId}
                                            row={row}
                                            detail={detailById.get(row.deliverableId)}
                                            first={index === 0}
                                            open={openRows.has(row.deliverableId)}
                                            onToggle={() => toggle(setOpenRows, row.deliverableId)}
                                            actionsFor={actionsFor}
                                            onOpenDocument={onOpenDocument}
                                            onToggleTds={onToggleTds}
                                            canRecordPayment={canRecordPayment}
                                            busy={busy}
                                            timeout={timeout}
                                        />
                                    ))}
                                </Box>
                            </Collapse>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
};

// ── deliverable row ─────────────────────────────────────────────────────────

const DeliverableRow: React.FC<{
    projectId: string;
    row: ProjectBillingRow;
    /** Execution detail — remarks and who completed it. */
    detail?: ProjectDeliverable;
    first: boolean;
    open: boolean;
    onToggle: () => void;
    actionsFor: (row: ProjectBillingRow) => React.ReactNode;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
    timeout: number;
}> = ({ projectId, row, detail, first, open, onToggle, actionsFor, onOpenDocument, onToggleTds, canRecordPayment, busy, timeout }) => {
    const bill = liveBill(row);
    const work = workStatusOf(row);

    return (
        <Box sx={{ borderTop: first ? 0 : "1px solid", borderColor: "divider" }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "minmax(0, 1fr)",
                        md: "minmax(220px, 1fr) 460px",
                        xl: "minmax(200px, 1fr) 270px 460px 220px",
                    },
                    columnGap: 3,
                    rowGap: 1.5,
                    alignItems: "center",
                    // Indented under the stage title, so the hierarchy reads without boxes.
                    pl: { xs: 1.5, sm: 7.25 },
                    pr: { xs: 1.5, sm: 2 },
                    py: 1.5,
                    // The whole row opens its billing activity, exactly like a stage
                    // header — one disclosure pattern at every level.
                    cursor: "pointer",
                    bgcolor: open ? "action.hover" : "transparent",
                    transition: "background-color 150ms ease",
                    "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={onToggle}
            >
                {/* What */}
                <Stack direction="row" alignItems="flex-start" spacing={1.25} sx={{ minWidth: 0 }}>
                    <Box sx={{ mt: "-5px" }}>
                        <Chevron open={open} label={`billing activity for ${row.deliverableName}`} onClick={onToggle} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{row.deliverableName}</Typography>
                        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                            {row.percentage}% of stage
                            {row.completedAt ? `, completed ${formatDate(row.completedAt)}` : ""}
                            {row.completedAt && detail?.completedByName ? ` by ${detail.completedByName}` : ""}
                        </Typography>
                    </Box>
                </Stack>

                {/* Work · Billing · Collection — three dimensions, three answers */}
                <Box
                    sx={{
                        display: { xs: "grid", md: "none", xl: "grid" },
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        columnGap: 1.5,
                        pl: { xs: 5.25, xl: 0 },
                    }}
                >
                    <StatusText caption="Work" status={work} />
                    <StatusText caption="Billing" status={billingStatusOf(row)} />
                    <StatusText caption="Collection" status={collectionStatusOf(row)} />
                </Box>

                {/* Money — the Invoice Tracker's four columns, each with its own settlement:
                    Bill Amount + TDS + GST = Bill Value. */}
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", columnGap: 2, pl: { xs: 5.25, md: 0 } }}>
                    {bill ? (
                        <>
                            <Amount
                                label="Bill Amount"
                                value={billAmountOf(bill)}
                                settle={bill.basicPaid ? { label: "Received", tone: "positive" } : { label: "Awaited", tone: "attention" }}
                            />
                            <Amount
                                label={`GST ${bill.gstRate}%`}
                                value={bill.gstAmount}
                                settle={bill.gstAmount > 0
                                    ? bill.gstPaid ? { label: "Received", tone: "positive" } : { label: "Awaited", tone: "attention" }
                                    : undefined}
                            />
                            <Amount
                                label={bill.tdsAmount > 0 ? `TDS ${bill.tdsRate}%` : "TDS"}
                                value={bill.tdsAmount > 0 ? bill.tdsAmount : null}
                                note={bill.tdsAmount > 0 ? undefined : "No TDS"}
                                settle={bill.tdsAmount > 0
                                    ? bill.tdsDeposited ? { label: "Deposited", tone: "positive" } : { label: "Not deposited", tone: "attention" }
                                    : undefined}
                            />
                            <Amount
                                label="Bill Value"
                                value={bill.totalAmount}
                                strong
                                note={bill.outstandingAmount > 0
                                    ? `${formatCurrencyDecimal(bill.outstandingAmount)} pending`
                                    : bill.receivedAmount > 0 ? "Fully received" : undefined}
                            />
                        </>
                    ) : (
                        // Not billed: there is no Bill Amount / GST / TDS yet — only the
                        // deliverable's value, which is exclusive of GST.
                        <Box sx={{ gridColumn: "1 / -1" }}>
                            <Amount label="Value, not billed yet" value={row.amount} note="Excluding GST" />
                        </Box>
                    )}
                </Box>

                {/* Action — next to the object it affects */}
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent={{ xs: "flex-start", xl: "flex-end" }}
                    spacing={0.5}
                    sx={{ gridColumn: { md: "1 / -1", xl: "auto" }, pl: { xs: 5.25, xl: 0 }, cursor: "default" }}
                    // Buttons act on the deliverable; they must not also fold the row.
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* md only: the status triplet moves here, beside the actions. */}
                    <Box sx={{ display: { xs: "none", md: "grid", xl: "none" }, gridTemplateColumns: "repeat(3, 150px)", mr: "auto" }}>
                        <StatusText caption="Work" status={work} />
                        <StatusText caption="Billing" status={billingStatusOf(row)} />
                        <StatusText caption="Collection" status={collectionStatusOf(row)} />
                    </Box>
                    {actionsFor(row)}
                </Stack>
            </Box>

            <Collapse in={open} timeout={timeout} unmountOnExit>
                {/* Attached to its row: same band colour, same indent — not a floating card. */}
                {/* Indented to the deliverable NAME (past the chevron), so it reads as its child. */}
                <Box sx={{ bgcolor: "action.hover", pl: { xs: 1.5, sm: 12.5 }, pr: { xs: 1.5, sm: 2 }, pb: 2.5, pt: 0.5 }}>
                    {detail?.remarks && (
                        <Box sx={{ pt: 1, pb: 0.5 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}>Remarks</Typography>
                            <Typography sx={{ fontSize: 12.5, mt: 0.25, whiteSpace: "pre-line", maxWidth: 720 }}>{detail.remarks}</Typography>
                        </Box>
                    )}
                    <BillingActivity
                        projectId={projectId}
                        row={row}
                        onOpenDocument={onOpenDocument}
                        onToggleTds={onToggleTds}
                        canRecordPayment={canRecordPayment}
                        busy={busy}
                    />
                </Box>
            </Collapse>
        </Box>
    );
};

// ── billing activity ────────────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
    CASH: "Cash", CHEQUE: "Cheque", NEFT: "NEFT", RTGS: "RTGS", IMPS: "IMPS", UPI: "UPI",
    BANK_TRANSFER: "Bank transfer", ONLINE: "Online", OTHER: "Other",
};

/** Document lifecycle, in words. */
const DOC_STATUS: Record<string, string> = { DRAFT: "Draft", PUBLISHED: "Issued", SENT: "Sent", CANCELLED: "Cancelled" };

const linkSx = { minHeight: 28, height: 28, fontSize: 12, px: 1.25, whiteSpace: "nowrap" as const, flexShrink: 0 };

/** Width of the Open / Edit slot on a timeline event. */
const ACTION_SLOT = 64;
/** Right padding that puts a sub-line's amount under its event's amount (slot + gap). */
const AMOUNT_INSET = `${ACTION_SLOT + 12}px`;

/** One event on the timeline. ● happened, ○ still to happen. */
const Event: React.FC<{
    done: boolean;
    last?: boolean;
    title: string;
    status?: string | null;
    meta?: string | null;
    amount?: number;
    action?: React.ReactNode;
    children?: React.ReactNode;
}> = ({ done, last, title, status, meta, amount, action, children }) => (
    <Box sx={{ display: "grid", gridTemplateColumns: "16px minmax(0, 1fr)", columnGap: 1.5 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box
                aria-hidden
                sx={{
                    width: 10, height: 10, mt: "5px", borderRadius: "50%", flexShrink: 0,
                    border: "2px solid",
                    borderColor: done ? "text.primary" : "text.disabled",
                    bgcolor: done ? "text.primary" : "background.paper",
                }}
            />
            {!last && <Box sx={{ width: "1px", flex: 1, bgcolor: "divider", mt: 0.5 }} />}
        </Box>
        <Box sx={{ pb: last ? 0 : 2, minWidth: 0 }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: done ? "text.primary" : "text.secondary" }}>
                        {title}
                        <Box component="span" sx={visuallyHidden}>{done ? ", done" : ", pending"}</Box>
                        {status && (
                            <Box component="span" sx={{ ml: 1, fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
                                {status}
                            </Box>
                        )}
                    </Typography>
                    {meta && <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>{meta}</Typography>}
                </Box>
                {/* Fixed amount column + fixed button slot: every amount on the
                    timeline — events and payment lines alike — ends on one edge. */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ flexShrink: 0 }}>
                    <Typography sx={{ ...NUM, fontSize: 13, fontWeight: 600, textAlign: "right", minWidth: 110 }}>
                        {amount !== undefined ? formatCurrencyDecimal(amount) : ""}
                    </Typography>
                    <Box sx={{ width: ACTION_SLOT, display: "flex", justifyContent: "flex-end" }}>{action}</Box>
                </Stack>
            </Stack>
            {children}
        </Box>
    </Box>
);

const visuallyHidden = {
    position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
} as const;

const BillingActivity: React.FC<{
    projectId: string;
    row: ProjectBillingRow;
    onOpenDocument: (documentId: string, status?: string | null) => void;
    onToggleTds: (billId: string, deposited: boolean) => void;
    canRecordPayment: boolean;
    busy?: boolean;
}> = ({ projectId, row, onOpenDocument, onToggleTds, canRecordPayment, busy }) => {
    const bill = liveBill(row);

    // Under the project's query key, so the workspace's refresh re-reads it too.
    const { data: detail, isLoading, isError, refetch } = useQuery({
        queryKey: ["project-billing", projectId, "bill", bill?.id],
        queryFn: () => getBill(bill!.id),
        enabled: Boolean(bill && bill.paymentCount > 0),
    });

    if (!bill) {
        return (
            <Box sx={{ pt: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {row.bill?.status === "CANCELLED" ? `${row.bill.billNumber} was cancelled` : "No billing activity yet"}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>
                    {row.blockMessage ?? (row.workStatus === "COMPLETED"
                        ? "The work is complete, so this deliverable can be billed now."
                        : "It can be billed once the work is marked complete.")}
                </Typography>
            </Box>
        );
    }

    // Chronological, oldest first — this is a record of what happened, in order.
    const payments = ((detail?.payments ?? []) as any[])
        .map((p) => ({ ...p, amount: Number(p.amount) }))
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

    const proformaDone = Boolean(bill.proformaNumber) && bill.proformaStatus !== "DRAFT";
    const paidInFull = bill.status === "PAID" || bill.status === "INVOICED";
    const invoiceDone = Boolean(bill.invoiceNumber) && bill.invoiceStatus !== "DRAFT";
    const overdue = isOverdue(bill);

    const open = (documentId: string | null, status: string | null) =>
        documentId ? (
            <WtButton size="small" ghost sx={linkSx} onClick={() => onOpenDocument(documentId, status)}>
                {status === "DRAFT" ? "Edit" : "Open"}
            </WtButton>
        ) : null;

    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 1fr) 320px" },
                gap: { xs: 2.5, lg: 4 },
                alignItems: "start",
                pt: 1,
            }}
        >
            <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1.5 }}>Billing activity</Typography>

                <Event
                    done={proformaDone}
                    title={bill.proformaNumber ? `Proforma ${bill.proformaNumber}` : "Proforma"}
                    // The state and its date say one thing once: "Issued 2026.09.21".
                    status={bill.proformaStatus
                        ? `${DOC_STATUS[bill.proformaStatus]}${proformaDone && bill.proformaDate ? ` ${formatDate(bill.proformaDate)}` : ""}`
                        : "Not created"}
                    meta={proformaDone
                        ? [
                            bill.dueDate ? `Payment due ${formatDate(bill.dueDate)}` : null,
                            bill.proformaVersions > 1 ? `revision ${bill.proformaVersions}` : null,
                        ].filter(Boolean).join(", ") || null
                        : "Not yet sent to the client"}
                    amount={bill.totalAmount}
                    action={open(bill.proformaDocumentId, bill.proformaStatus)}
                />

                <Event
                    done={paidInFull}
                    title={bill.paymentCount > 0 ? "Payments received" : "Payment"}
                    meta={bill.paymentCount === 0
                        ? proformaDone
                            ? `${overdue ? "Overdue: " : "Awaiting "}${formatCurrencyDecimal(bill.expectedAmount)}${bill.dueDate ? `, due ${formatDate(bill.dueDate)}` : ""}`
                            : "Starts once the proforma is issued"
                        : null}
                >
                    {bill.paymentCount > 0 && (
                        <Box sx={{ mt: 0.75 }}>
                            {isLoading && <Typography sx={{ fontSize: 12, color: "text.secondary", py: 0.5 }}>Loading payments…</Typography>}
                            {isError && (
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                                    <Typography sx={{ fontSize: 12, color: "error.main" }}>Unable to load billing activity.</Typography>
                                    <WtButton size="small" ghost sx={linkSx} onClick={() => refetch()}>Retry</WtButton>
                                </Stack>
                            )}
                            {payments.map((p) => (
                                <Stack
                                    key={p.id}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="baseline"
                                    spacing={2}
                                    sx={{ py: 0.6, pr: AMOUNT_INSET, borderBottom: "1px dashed", borderColor: "divider" }}
                                >
                                    <Typography sx={{ fontSize: 12.5 }}>
                                        {formatDate(p.paymentDate)}
                                        <Box component="span" sx={{ color: "text.secondary", ml: 1 }}>
                                            {METHOD_LABEL[p.method] ?? p.method}
                                            {p.reference ? `, ref ${p.reference}` : ""}
                                        </Box>
                                    </Typography>
                                    <Typography sx={{ ...NUM, fontSize: 13 }}>{formatCurrencyDecimal(p.amount)}</Typography>
                                </Stack>
                            ))}
                            {payments.length > 0 && (
                                <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ pt: 0.75, pr: AMOUNT_INSET }}>
                                    <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>Total received</Typography>
                                    <Typography sx={{ ...NUM, fontSize: 13, fontWeight: 700 }}>
                                        {formatCurrencyDecimal(bill.receivedAmount)}
                                    </Typography>
                                </Stack>
                            )}
                        </Box>
                    )}
                    {bill.tdsAmount > 0 && (
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mt: 1.25 }}>
                            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                                TDS {bill.tdsRate}% ({formatCurrencyDecimal(bill.tdsAmount)}) withheld by the client,{" "}
                                <Box component="span" sx={{ fontWeight: 600, color: bill.tdsDeposited ? "text.primary" : "warning.dark" }}>
                                    {bill.tdsDeposited
                                        ? `deposited${bill.tdsDepositedAt ? ` ${formatDate(bill.tdsDepositedAt)}` : ""}`
                                        : "not yet deposited"}
                                </Box>
                            </Typography>
                            <WtButton
                                size="small" ghost sx={linkSx}
                                disabled={!canRecordPayment || busy}
                                onClick={() => onToggleTds(bill.id, !bill.tdsDeposited)}
                            >
                                {bill.tdsDeposited ? "Mark not deposited" : "Mark deposited"}
                            </WtButton>
                        </Stack>
                    )}
                </Event>

                <Event
                    last
                    done={invoiceDone}
                    title={bill.invoiceNumber ? `Tax invoice ${bill.invoiceNumber}` : "Tax invoice"}
                    status={bill.invoiceStatus
                        ? `${DOC_STATUS[bill.invoiceStatus]}${invoiceDone && bill.invoiceDate ? ` ${formatDate(bill.invoiceDate)}` : ""}`
                        : null}
                    meta={bill.invoiceNumber
                        ? null
                        : paidInFull ? "Ready to raise: the proforma is paid in full" : "Raised once the proforma is paid in full"}
                    amount={bill.invoiceNumber ? bill.totalAmount : undefined}
                    action={open(bill.invoiceDocumentId, bill.invoiceStatus)}
                />
            </Box>

            <FinancialSummary bill={bill} />
        </Box>
    );
};

/**
 * One bill's money, in the Invoice Tracker's own columns and order:
 * Bill Amount + TDS + GST = Bill Value, each component with its settlement,
 * then what has been received and what is still pending on the bill.
 */
const FinancialSummary: React.FC<{ bill: BillOnRow }> = ({ bill }) => {
    const line = (
        label: string,
        value: string,
        opts: { strong?: boolean; tone?: string; settle?: Status } = {},
    ) => (
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={2} sx={{ py: 0.4 }}>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: opts.strong ? 13 : 12.5, fontWeight: opts.strong ? 600 : 400, color: opts.strong ? "text.primary" : "text.secondary" }}>
                    {label}
                </Typography>
                {opts.settle && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: TONE_COLOR[opts.settle.tone] }} />
                        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{opts.settle.label}</Typography>
                    </Stack>
                )}
            </Box>
            <Typography sx={{ ...NUM, fontSize: opts.strong ? 14 : 12.5, fontWeight: opts.strong ? 700 : 500, color: opts.tone ?? "text.primary" }}>
                {value}
            </Typography>
        </Stack>
    );
    const received: Status = { label: "Received", tone: "positive" };
    const awaited: Status = { label: "Awaited", tone: "attention" };
    const settled = bill.outstandingAmount <= 0;
    return (
        <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "8px", p: 2 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary", mb: 1 }}>
                Bill {bill.billNumber}
            </Typography>

            {line("Bill Amount", formatCurrencyDecimal(billAmountOf(bill)), { settle: bill.basicPaid ? received : awaited })}
            {bill.tdsAmount > 0 && line(`TDS ${bill.tdsRate}%`, formatCurrencyDecimal(bill.tdsAmount), {
                settle: bill.tdsDeposited ? { label: "Deposited", tone: "positive" } : { label: "Not deposited", tone: "attention" },
            })}
            {line(`GST ${bill.gstRate}%`, formatCurrencyDecimal(bill.gstAmount), bill.gstAmount > 0 ? { settle: bill.gstPaid ? received : awaited } : {})}
            <Divider sx={{ my: 1 }} />
            {line("Bill Value", formatCurrencyDecimal(bill.totalAmount), { strong: true })}
            {/* The reconciliation the Invoice Tracker prints under Bill Value. */}
            <Typography sx={{ ...NUM, fontSize: 11, color: "text.secondary", textAlign: "right", whiteSpace: "normal" }}>
                {formatCurrencyDecimal(billAmountOf(bill))}
                {bill.tdsAmount > 0 ? ` + ${formatCurrencyDecimal(bill.tdsAmount)} TDS` : ""}
                {` + ${formatCurrencyDecimal(bill.gstAmount)} GST`}
            </Typography>

            <Divider sx={{ my: 1 }} />
            {line(`Received${bill.paymentCount ? ` (${bill.paymentCount} payment${bill.paymentCount === 1 ? "" : "s"})` : ""}`, formatCurrencyDecimal(bill.receivedAmount), { strong: true })}
            {line("Pending on this bill", formatCurrencyDecimal(Math.max(0, bill.outstandingAmount)), {
                strong: true,
                tone: settled ? "text.primary" : "warning.dark",
            })}
            <Typography sx={{ fontSize: 12, color: "text.secondary", textAlign: "right" }}>
                {settled
                    ? "Nothing left to collect"
                    : `Client transfers Bill Value − TDS${bill.dueDate ? `, due ${formatDate(bill.dueDate)}` : ""}`}
            </Typography>
        </Box>
    );
};

export default ProjectBillingTree;
