import React from "react";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/ds/ui/badge";
import { Button } from "@/ds/ui/button";
import { Progress } from "@/ds/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { cn } from "@/ds/lib/utils";
import { isHexColor } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { BillingStatusBadge, useBillingLabels } from "@pages/billing/components";
import { formatCurrencyDecimal } from "@utils/currency";
import { SETTLEMENT_FALLBACK, type Status, type Tone } from "./projectBillingRules";

/** Kit Tooltip around any content. No title, no tooltip. */
export const Tip: React.FC<{
    title?: React.ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    className?: string;
    children: React.ReactNode;
}> = ({ title, side, className, children }) =>
    title ? (
        <Tooltip>
            <TooltipTrigger render={<span className={cn("inline-flex min-w-0", className)} />}>{children}</TooltipTrigger>
            <TooltipContent side={side}>{title}</TooltipContent>
        </Tooltip>
    ) : (
        <>{children}</>
    );

/** The kit's status set — one meaning per colour, always with text and a dot. */
const BADGE_VARIANT = {
    positive: "success",
    attention: "warning",
    critical: "danger",
    active: "brand",
    neutral: "neutral",
} as const satisfies Record<Tone, string>;

export const StatusBadge: React.FC<{ status: Status; className?: string }> = ({ status, className }) => status.code ? (
    <BillingStatusBadge status={status.code} />
) : (
    <Badge variant={BADGE_VARIANT[status.tone]} dot className={cn("max-w-full", className)}>
        <span className="truncate">{status.label}</span>
    </Badge>
);

export const NUM = "tabular-nums whitespace-nowrap";

/**
 * A figure. `statusCode` paints it in the Configure colour (a saved, per-tenant colour,
 * so an inline style) and names that status on hover. `toneClass` is a kit text colour.
 */
export const Amount: React.FC<{
    label?: string;
    value: number | null;
    toneClass?: string;
    strong?: boolean;
    statusCode?: string;
    align?: "left" | "right";
    inline?: boolean;
}> = ({ label, value, toneClass, strong, statusCode, align = "right", inline }) => {
    const labels = useBillingLabels();
    const configured = statusCode ? labels.tone(statusCode) : undefined;
    const fallback = statusCode ? SETTLEMENT_FALLBACK[statusCode] : undefined;
    const colourName = configured ?? fallback?.tone;
    const colour = colourName ? (isHexColor(colourName) ? colourName : tonePair(colourName).fg) : undefined;
    const statusName = statusCode ? (configured ? labels.label(statusCode) : fallback?.label ?? labels.label(statusCode)) : "";
    const lit = Boolean(value) || (value === 0 && !!statusCode);
    const figure = (
        <span
            className={cn(
                NUM,
                strong ? "text-sm font-bold" : "text-[13px] font-semibold",
                !lit ? "text-muted-foreground/60" : !colour && (toneClass ?? "text-foreground"),
            )}
            style={lit && colour ? { color: colour } : undefined}
        >
            {value === null ? "—" : formatCurrencyDecimal(value)}
        </span>
    );
    const painted = <Tip title={statusName}>{figure}</Tip>;
    if (inline) {
        return (
            <div className="flex min-w-0 items-baseline gap-1.5">
                {label && <span className="text-[11.5px] font-semibold whitespace-nowrap text-muted-foreground">{label}</span>}
                {painted}
            </div>
        );
    }
    return (
        <div className={cn("flex w-full min-w-0 flex-col", align === "right" ? "items-end text-right" : "items-start text-left")}>
            {label && <span className="truncate text-[11px] leading-snug text-muted-foreground">{label}</span>}
            {painted}
        </div>
    );
};

/** Kit Progress sized for a row. Label is optional: a table cell's column header already names it. */
export const WorkBar: React.FC<{ label?: string; percent: number; done?: boolean; showPercentText?: boolean }> = ({
    label, percent, done, showPercentText = false,
}) => (
    <div className="flex w-full min-w-0 items-center gap-1.5">
        {label && <span className="shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>}
        <Progress
            value={percent}
            aria-label={label ?? "Work done"}
            className={cn(
                "min-w-8 flex-1 gap-0 [&_[data-slot=progress-track]]:h-1.5",
                done && "[&_[data-slot=progress-indicator]]:bg-success",
            )}
        />
        {showPercentText && (
            <span className={cn(NUM, "shrink-0 text-right text-xs font-semibold text-muted-foreground")}>{percent}% done</span>
        )}
    </div>
);

/**
 * Plan stage names carry their terms in brackets — "Advance (To be paid along with the
 * Work Order)". The row shows the title; the terms stay one hover away.
 */
const TERMS = /^(.*?)\s*\((.+)\)\s*$/;
/** "Advance (To be paid …)" → "Advance"; "Design Concept (Part 1)" → "Design Concept". */
const titleOf = (stage: string) => stage.match(TERMS)?.[1] ?? stage;

/**
 * `covers` are the stages one bill spans; the row names only the OTHER ones ("With Design Concept"),
 * since its own stage is already the title. `self` is the row's full stage name, used to drop it.
 */
export const StageName: React.FC<{ name: string; large?: boolean; covers?: string[]; self?: string }> = ({
    name, large, covers, self,
}) => {
    const match = name.match(TERMS);
    const others = covers && covers.length > 1
        ? covers.map(titleOf).filter((c) => c !== titleOf(self ?? name))
        : [];
    return (
        <Tip title={match?.[2]} className="flex-1">
            <span className={cn("min-w-0 flex-1 leading-snug font-semibold whitespace-normal", large ? "text-[15px]" : "text-sm")}>
                {match ? match[1] : name}
                {others.length > 0 && (
                    // One line: the first other stage, then a count. The full list is one hover away.
                    <span className="block truncate text-[11.5px] font-normal text-muted-foreground" title={`One bill with ${covers!.join(" + ")}`}>
                        With {others[0]}{others.length > 1 && ` +${others.length - 1} more`}
                    </span>
                )}
            </span>
        </Tip>
    );
};

export const Chevron: React.FC<{ open: boolean; label: string; onClick: () => void }> = ({ open, label, onClick }) => (
    <Button
        variant="ghost"
        size="icon-sm"
        aria-expanded={open}
        aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={cn("rounded-lg pointer-coarse:size-10", open ? "text-primary" : "text-muted-foreground")}
    >
        <ChevronRight className={cn("transition-transform duration-200 motion-reduce:transition-none", open && "rotate-90")} />
    </Button>
);
