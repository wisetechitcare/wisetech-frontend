import React from "react";
import { Info } from "lucide-react";
import { Separator } from "@/ds/ui/separator";
import { cn } from "@/ds/lib/utils";
import { SummaryRow } from "../../types/formEngine.types";

interface SummarySidebarProps {
  title: string;
  rows: SummaryRow[];
  warningMessage?: string;
  /** Extra content under the rows. */
  extra?: React.ReactNode;
}

export const SummarySidebar: React.FC<SummarySidebarProps> = ({ title, rows, warningMessage, extra }) => (
  <div className="flex flex-col gap-3 px-4 pt-1 pb-5">
    <h3 className="m-0 text-xs font-bold tracking-wider text-foreground uppercase">{title}</h3>
    <Separator />

    {rows.length > 0 ? (
      <dl className="m-0 flex flex-col">
        {rows.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className="flex items-start justify-between gap-3 border-b border-border/60 py-2.5 last:border-b-0"
          >
            <dt className="shrink-0 text-xs font-medium text-muted-foreground">{row.label}</dt>
            <dd className={cn("m-0 min-w-0 text-right text-xs font-semibold break-words text-foreground", row.isStrong && "text-primary")}>
              {row.value || <span className="font-normal text-muted-foreground italic">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    ) : extra ? null : (
      <div className="flex flex-col items-center gap-1.5 py-6 text-muted-foreground">
        <Info className="size-5" />
        <span className="text-xs font-medium">Fill in the form to see a summary</span>
      </div>
    )}

    {extra}

    {warningMessage && (
      <div className="rounded-xl bg-warning-soft px-3 py-2.5 text-xs font-medium text-warning-foreground ring-1 ring-warning/30">
        {warningMessage}
      </div>
    )}
  </div>
);

export default SummarySidebar;
