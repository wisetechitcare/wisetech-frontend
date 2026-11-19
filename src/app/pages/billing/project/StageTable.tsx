import React from "react";
import { Badge } from "@/ds/ui/badge";
import { TableCell, TableHead, TableRow } from "@/ds/ui/table";
import { cn } from "@/ds/lib/utils";
import type { ProjectBillingRow } from "@services/bills";
import {
    billingStatusOf, collectionStatusOf, figuresOf, roundMoney, workHintOf, type StageViewProps, type totalsOf,
} from "./projectBillingRules";
import { Amount, Chevron, NUM, StageName, StatusBadge, Tip, WorkBar } from "./parts";
import { BillPath } from "./BillPath";

/** Shares of the table width. They sum to 100%, so the table fills the card. */
export const COLUMN_WIDTHS = ["14%", "5%", "8%", "9%", "9%", "8%", "7%", "7%", "8%", "8%", "17%"];

const HEAD = "h-auto px-2 py-3 text-[11px] font-bold text-slate-700 uppercase tracking-wider dark:text-slate-200";
const CELL = "px-2 py-2.5";

/** Stage chevron sits at 16px; everything a stage opens hangs off a rail under it. */
const STAGE_PAD = "pl-4";
const CHILD_PAD = "pl-14";

export const StageColumns: React.FC = () => (
    <TableRow className="bg-slate-100 hover:bg-slate-100 border-b border-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800/80 dark:border-slate-700">
        <TableHead className={cn(HEAD, CHILD_PAD)}>Stage</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>
            <Tip title="Share of the total contract value">Stage Share</Tip>
        </TableHead>
        <TableHead className={cn(HEAD, "pl-5")}>
            <Tip title="Work done / progress on deliverables">Work Done</Tip>
        </TableHead>
        <TableHead className={cn(HEAD, "text-center!")}>Billing</TableHead>
        <TableHead className={cn(HEAD, "text-center!")}>Collection</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>Bill Amount</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>GST</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>TDS</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>Bill Value</TableHead>
        <TableHead className={cn(HEAD, "text-right!")}>Pending</TableHead>
        <TableHead className={HEAD}><span className="sr-only">Actions</span></TableHead>
    </TableRow>
);

export const GrandTotalRow: React.FC<{ totals: ReturnType<typeof totalsOf> }> = ({ totals }) => (
    <TableRow className="bg-muted/50 hover:bg-muted/50">
        <TableCell colSpan={5} className={cn(CELL, CHILD_PAD, "text-[13.5px] font-bold")}>Total</TableCell>
        <TableCell className={CELL}><Amount value={totals.billAmount} strong /></TableCell>
        <TableCell className={CELL}><Amount value={totals.gst} strong /></TableCell>
        <TableCell className={CELL}><Amount value={totals.tds} strong /></TableCell>
        <TableCell className={CELL}><Amount value={totals.billValue} strong /></TableCell>
        <TableCell className={CELL}><Amount value={totals.pending} strong /></TableCell>
        <TableCell className={CELL} />
    </TableRow>
);

/** A row expands on click, except from its action buttons (marked `data-row-actions`). */
const toggleFromRow = (onToggle: () => void) => (e: React.MouseEvent) => {
    if (!(e.target as Element).closest("[data-row-actions]")) onToggle();
};

/** The parent of a stage billed in parts: one line summing its parts, which nest beneath it. */
export const PartsRow: React.FC<{ rows: ProjectBillingRow[]; open: boolean; onToggle: () => void }> = ({
    rows, open, onToggle,
}) => {
    const first = rows[0];
    const stageName = first.stageName.replace(/ \(Part \d+\)$/, "");
    const figures = rows.map(figuresOf);
    const sum = (i: number) => {
        const values = figures.map((f) => f[i].value).filter((v): v is number => v !== null);
        return values.length ? roundMoney(values.reduce((a, b) => a + b, 0)) : null;
    };
    return (
        <TableRow onClick={toggleFromRow(onToggle)} className={cn("cursor-pointer", open && "border-b-0")}>
            <TableCell className={cn(CELL, STAGE_PAD, "whitespace-normal")}>
                <div className="flex min-w-0 items-center gap-2">
                    <Chevron open={open} label={stageName} onClick={onToggle} />
                    <StageName name={stageName} />
                </div>
            </TableCell>
            <TableCell className={cn(CELL, NUM, "text-right text-[13px] font-semibold text-muted-foreground")}>
                {roundMoney(rows.reduce((a, r) => a + r.percentage, 0))}%
            </TableCell>
            <TableCell className={cn(CELL, "pl-5")}>
                <Tip title={workHintOf(first)} className="flex w-full">
                    <WorkBar percent={first.work.progress} />
                </Tip>
            </TableCell>
            <TableCell colSpan={2} className={cn(CELL, "text-center")}>
                <Badge variant="neutral" dot className="max-w-full">
                    <span>{rows.length} parts</span>
                </Badge>
            </TableCell>
            {figures[0].map((f, i) => (
                <TableCell key={f.label} className={CELL}>
                    <Amount value={sum(i)} strong={f.strong} />
                </TableCell>
            ))}
            <TableCell className={CELL} />
        </TableRow>
    );
};

export const StageRow: React.FC<StageViewProps & { nested?: boolean; isLastChild?: boolean }> = ({
    projectId, row, open, onToggle, actionsFor, onOpenDocument, nested, isLastChild,
}) => {
    return (
        <>
            <TableRow onClick={toggleFromRow(onToggle)} className={cn("cursor-pointer", open && "border-b-0", nested && "bg-muted/15 hover:bg-muted/30")}>
                <TableCell className={cn(CELL, "whitespace-normal relative", nested ? "pl-12" : STAGE_PAD)}>
                    {/* Tree connector lines */}
                    {nested && (
                        <div className="pointer-events-none absolute left-[29px] top-0 bottom-0 w-4">
                            {/* Vertical spine from parent: full height if not last child, half height if last child */}
                            <span
                                className={cn(
                                    "absolute left-0 top-0 w-px bg-border",
                                    isLastChild ? "h-1/2" : "h-full"
                                )}
                            />
                            {/* Horizontal branch to the child item */}
                            <span className="absolute left-0 top-1/2 h-px w-3.5 bg-border rounded-bl-sm" />
                        </div>
                    )}
                    <div className="flex min-w-0 items-center gap-2">
                        {/* Under its parent a part is just "Part n"; the full "Stage (Part n)" is on the bill. */}
                        <Chevron open={open} label={row.stageName} onClick={onToggle} />
                        <StageName name={nested && row.partNo ? `Part ${row.partNo}` : row.stageName} covers={row.covers} self={row.stageName} />
                    </div>
                </TableCell>
                <TableCell className={cn(CELL, NUM, "text-right text-[13px] font-semibold text-muted-foreground")}>
                    {row.percentage}%
                </TableCell>
                <TableCell className={cn(CELL, "pl-5")}>
                    {/* Work belongs to the stage, so the parent row carries it. */}
                    {!nested && (
                        <Tip title={workHintOf(row)} className="flex w-full">
                            <WorkBar percent={row.work.progress} />
                        </Tip>
                    )}
                </TableCell>
                <TableCell className={cn(CELL, "text-center")}>
                    <StatusBadge status={billingStatusOf(row)} />
                </TableCell>
                <TableCell className={cn(CELL, "text-center")}>
                    <StatusBadge status={collectionStatusOf(row)} />
                </TableCell>
                {figuresOf(row).map((f) => (
                    <TableCell key={f.label} className={CELL}>
                        <Amount value={f.value} statusCode={f.statusCode} strong={f.strong} />
                    </TableCell>
                ))}
                <TableCell className={CELL}>
                    <div data-row-actions className="flex cursor-default items-center justify-end">
                        {actionsFor(row)}
                    </div>
                </TableCell>
            </TableRow>
            {open && (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMN_WIDTHS.length} className="p-0 whitespace-normal relative">
                        {/* If nested and not the last child, continue the vertical spine downward across the expanded detail */}
                        {nested && !isLastChild && (
                            <span className="pointer-events-none absolute left-[29px] top-0 bottom-0 w-px bg-border z-10" />
                        )}
                        <div className={cn(CHILD_PAD, "relative pt-1 pr-4 pb-3")}>
                            <BillPath projectId={projectId} row={row} onOpenDocument={onOpenDocument} />
                        </div>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
};
