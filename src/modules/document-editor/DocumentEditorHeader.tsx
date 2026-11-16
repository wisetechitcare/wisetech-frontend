import React from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/ds/ui/button";
import { cn } from "@/ds/lib/utils";

/**
 * One cell of the title block.
 *
 * A drawing's title block carries its number, revision, date and value in ruled
 * cells, always in the same order — you learn where to look once. That is a
 * better fit for a document header than a middle-dot meta string, where every
 * fact has the same weight and the money is impossible to find.
 */
const Cell: React.FC<{ label: string; value: React.ReactNode; grow?: boolean; className?: string }> = ({ label, value, grow, className }) => (
  <div className={cn("min-w-0 border-l border-border px-4", grow ? "flex-auto" : "flex-none", className)}>
    <div className="text-[10px] leading-normal tracking-wide text-muted-foreground">{label}</div>
    <div className="truncate text-[13px] leading-snug font-semibold tabular-nums">{value}</div>
  </div>
);

/**
 * The editor's title block. It sticks, because the thing you scroll is an A4 page and "publish" should never be a
 * scroll away from what you are checking.
 *
 * Responsive by width, never by wrapping into a pile:
 *   - phone: icon Back · number + status, with "R1 · total" on a second line; actions on their own row, full width
 *   - tablet (md): the ruled cells appear (template, revision, total)
 *   - desktop (xl): everything on one line, actions on the right
 * Actions decide for themselves how much label they show (see `DocumentEditor`).
 */
const DocumentEditorHeader: React.FC<{
  documentNumber: string;
  status: React.ReactNode;
  templateName: string;
  versionCount: number;
  figure?: { label: string; value: string } | null;
  onBack: () => void;
  /** "Back" by default; a page that remembers where you came from can name it ("Back to Proforma Tracker"). */
  backLabel?: string;
  actions: React.ReactNode;
  /**
   * Phone only: keep the actions on the title's row (right of it) instead of giving them a row of their own. For a
   * screen whose phone header carries one primary action; a screen with several buttons leaves this off.
   */
  actionsInline?: boolean;
  /**
   * The width and side padding of the content, so its edges are the SAME as the body under it. The default matches the
   * editor's body; a page whose body has its own gutters passes its own width and no padding.
   */
  contentClassName?: string;
}> = ({
  documentNumber, status, templateName, versionCount, figure, onBack, backLabel = "Back", actions, actionsInline,
  contentClassName = "max-w-[1600px] px-3 sm:px-4 lg:px-5",
}) => (
  // Not sticky itself: the editor sticks this together with the phone's Page/Settings switch, as one measured block.
  // No side padding here: it belongs INSIDE the content box, or the content is wider than the body by the padding.
  <div className="border-b border-border bg-background py-2.5">
    {/* Wraps by design, and `order` does the rearranging so the markup stays one tree: identity and actions share the
        first row from sm up; between md and xl the ruled cells drop to a row of their own under them; at xl they join
        the one line, between the two. Only a phone puts the actions on a row alone. */}
    <div className={cn("mx-auto flex flex-wrap items-center gap-x-4 gap-y-2.5", contentClassName)}>
      <div className="flex min-w-0 flex-1 items-center gap-3 xl:flex-none">
        {/* One compact back control at every width (named on hover and for screen readers), then a hairline: a tall
            "Back" pill beside the number was a second, competing headline. */}
        <Button variant="outline" size="icon" onClick={onBack} aria-label={backLabel} title={backLabel} className="size-9 shrink-0">
          <ArrowLeft />
        </Button>
        <span aria-hidden className="h-7 w-px shrink-0 bg-border" />

        {/* The number is the identity of the sheet, so it is the largest thing here and sits outside the ruled cells.
            Not `tabular-nums`: fixed-width digits spaced the hyphens out ("26 - 27"). */}
        <div className="min-w-0 flex-1 md:flex-none">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="truncate text-lg leading-none font-semibold tracking-tight text-foreground sm:text-xl">{documentNumber}</span>
            <span className="flex shrink-0 items-center">{status}</span>
          </div>
          {/* Below md the ruled cells are hidden; the two facts that matter ride under the number instead. */}
          <p className="m-0 mt-0.5 truncate text-[13px] text-muted-foreground tabular-nums md:hidden">
            R{versionCount}
            {figure && <> · <span className="font-semibold text-foreground">{figure.value}</span></>}
          </p>
        </div>

      </div>

      {/* Phone: the actions get the row to themselves. Each keeps its natural size — an icon-only button stays a compact
          square — and the LAST one (the primary, where the thumb is) takes whatever width is left. A long row wraps
          rather than overflowing. From sm up they sit at the right of the identity. */}
      <div
        className={cn(
          // `order-[n]`, not `order-n`: the app also loads Bootstrap's `.order-2` (!important), which beats `xl:order-*`.
          "order-[2] flex items-center gap-2 sm:shrink-0 xl:order-[3]",
          actionsInline ? "max-sm:shrink-0" : "max-sm:w-full max-sm:flex-wrap max-sm:[&>:last-child]:flex-1",
        )}
      >
        {actions}
      </div>

      {/* The first cell has no rule on its left when it starts a row of its own (md–xl). */}
      <div className="order-[3] hidden w-full min-w-0 border-t border-border pt-2 md:flex xl:order-[2] xl:w-auto xl:flex-1 xl:border-t-0 xl:pt-0">
        <Cell label="Template" value={templateName} grow className="max-xl:border-l-0 max-xl:pl-0" />
        <Cell label="Revision" value={`R${versionCount}`} />
        {figure && <Cell label={figure.label} value={figure.value} />}
      </div>
    </div>
  </div>
);

export default DocumentEditorHeader;
