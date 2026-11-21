import React from "react";
import { Card } from "@/ds/ui/card";
import { cn } from "@/ds/lib/utils";
import type { ProjectBillingRow } from "@services/bills";
import {
    billingStatusOf, collectionStatusOf, figuresOf, workHintOf, type Figure, type StageViewProps, type totalsOf,
} from "./projectBillingRules";
import { Amount, Chevron, NUM, StageName, StatusBadge, Tip, WorkBar } from "./parts";
import { BillPath } from "./BillPath";

/** Narrow money: two leading figures side by side, the rest as a wrapping line — any figure length fits. */
const Figures: React.FC<{ primary: Figure[]; secondary: Figure[] }> = ({ primary, secondary }) => (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
        <div className="grid grid-cols-2 gap-x-4 bg-muted/50 px-3 py-2">
            {primary.map((f) => (
                <Amount key={f.label} label={f.label} value={f.value} statusCode={f.statusCode} strong align="left" />
            ))}
        </div>
        {/* Label over figure, auto-fit columns: three across when they fit, two when not — never ragged.
            Figures that do not exist (unbilled stage, no TDS) are left out rather than shown as dashes. */}
        {secondary.some((f) => f.value !== null) && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-x-4 gap-y-1.5 border-t border-border px-3 py-2">
                {secondary.filter((f) => f.value !== null).map((f) => (
                    <Amount key={f.label} align="left" label={f.label} value={f.value} statusCode={f.statusCode} />
                ))}
            </div>
        )}
    </div>
);

const FieldLabelText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="mb-1 text-[11px] leading-snug text-muted-foreground">{children}</p>
);

/** Work, Billing, Collection — each named, since a card has no column headers. Wraps as needed. */
const StatusLine: React.FC<{ row: ProjectBillingRow; narrow?: boolean }> = ({ row, narrow }) => {
    const statuses = [["Billing", billingStatusOf(row)], ["Collection", collectionStatusOf(row)]] as const;
    return narrow ? (
        // Phones: work bar on its own line, then Billing and Collection side by side, name over chip.
        <div className="flex flex-col gap-2">
            <WorkBar label="Work" percent={row.work.progress} />
            <div className="grid grid-cols-2 gap-x-3">
                {statuses.map(([label, status]) => (
                    <div key={label} className="min-w-0">
                        <FieldLabelText>{label}</FieldLabelText>
                        <StatusBadge status={status} className="w-full justify-start" />
                    </div>
                ))}
            </div>
        </div>
    ) : (
        // Cards: the same five tracks as the money row beneath, so Work, Billing and Collection
        // line up over the figures — labels above, in the figures' own label style.
        <div className="grid grid-cols-5 items-end gap-x-4">
            <div className="col-span-2 pr-4">
                <FieldLabelText>Work</FieldLabelText>
                <Tip title={workHintOf(row)} className="flex w-full">
                    <WorkBar percent={row.work.progress} />
                </Tip>
            </div>
            {statuses.map(([label, status]) => (
                <div key={label} className="min-w-0">
                    <FieldLabelText>{label}</FieldLabelText>
                    <StatusBadge status={status} />
                </div>
            ))}
        </div>
    );
};

/** Phones: the workspace's step buttons (its `data-billing-actions` strip) stretch full-width and thumb-sized. */
const STRETCH_ACTIONS =
    "w-full [&_[data-billing-actions]]:w-full [&_[data-billing-actions]>*]:flex-1 [&_[data-billing-actions]_[data-slot=button]]:h-10 [&_[data-billing-actions]_[data-slot=button]]:w-full";

export const StageCard: React.FC<StageViewProps & { narrow: boolean }> = ({
    projectId, row, open, onToggle, actionsFor, onOpenDocument, narrow,
}) => {
    const figures = figuresOf(row);
    const actions = (
        <div className={cn("flex shrink-0 cursor-default items-center justify-end", narrow && STRETCH_ACTIONS)}>
            {actionsFor(row)}
        </div>
    );
    // The card expands from its chevron only: the header is not a click target, so the actions need no stopPropagation.
    return (
        <Card size="sm" role="region" aria-label={row.stageName} className="gap-0 py-0">
            <div className="px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                    <Chevron open={open} label={row.stageName} onClick={onToggle} />
                    <StageName name={row.stageName} large covers={row.covers} />
                    <span className={cn(NUM, "shrink-0 text-[12.5px] font-semibold text-muted-foreground")}>{row.percentage}%</span>
                    {!narrow && actions}
                </div>
                <div className={cn(
                    "mt-2 flex flex-col",
                    narrow
                        ? "gap-2.5"
                        // Cards: status and money share one tinted panel, split by a hairline.
                        : "ml-10 overflow-hidden rounded-xl bg-muted/50 ring-1 ring-border *:px-3 *:py-2",
                )}>
                    <StatusLine row={row} narrow={narrow} />
                    {narrow ? (
                        <Figures primary={figures.slice(3)} secondary={figures.slice(0, 3)} />
                    ) : (
                        <div className="grid grid-cols-5 gap-x-4 border-t border-border bg-card">
                            {/* A figure that does not exist (unbilled stage, no TDS) leaves its column
                                empty instead of printing a dash, so Bill Value and Pending stay aligned
                                from card to card without a row of placeholders. */}
                            {figures.map((f) => f.value === null
                                ? <div key={f.label} aria-hidden />
                                : <Amount key={f.label} label={f.label} value={f.value} statusCode={f.statusCode} strong={f.strong} align="left" />)}
                        </div>
                    )}
                    {narrow && actions}
                </div>
            </div>
            {open && (
                <div className={cn("px-3 pb-3", !narrow && "pl-13")}>
                    {/* Cards layout: path and detail sit side by side, with the path in its two-line
                        form — the five reserved tracks of the wide path would leave gaps and crowd the detail. */}
                    <BillPath projectId={projectId} row={row} onOpenDocument={onOpenDocument} stacked={narrow} narrow={narrow} compactPath />
                </div>
            )}
        </Card>
    );
};

/** Totals as label/figure pairs that wrap — the table's total row, for cards. */
export const CompactTotal: React.FC<{ totals: ReturnType<typeof totalsOf> }> = ({ totals }) => (
    <Card size="sm" className="flex-row flex-wrap items-baseline gap-x-5 gap-y-1 bg-muted/50 px-3 py-2.5">
        <span className="text-[13.5px] font-bold">Total</span>
        <Amount inline align="left" label="Bill Amount" value={totals.billAmount} />
        <Amount inline align="left" label="GST" value={totals.gst} />
        <Amount inline align="left" label="TDS" value={totals.tds} />
        <Amount inline align="left" label="Bill Value" value={totals.billValue} strong />
        <Amount inline align="left" label="Pending" value={totals.pending} strong />
    </Card>
);
