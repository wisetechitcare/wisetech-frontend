import * as React from "react"
import { ArrowLeft, Check, Copy } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"

/**
 * The header of one record's page (a project, a lead, an employee): back, an avatar, the record's reference with a
 * one-click copy, small meta tags, the name, and the record's status + actions on the right.
 *
 * Alignment is the point: the back button, the avatar and the text block share one centre line; the actions sit on
 * the title's line on wide screens and drop under it, full width, on a phone. The name truncates instead of
 * pushing the actions off screen, and its full text is the tooltip.
 */
export function RecordHeader({
  title,
  reference,
  referenceTone = "brand",
  meta,
  avatar,
  onBack,
  actions,
  className,
}: {
  title: string
  /** The record's number, e.g. "WT/PROJECT/26-27/787" — shown with a copy button. */
  reference?: string
  /** `brand` for the live identifier (a project number), `muted` for a secondary one (a lead number). */
  referenceTone?: "brand" | "muted"
  /** Small tags after the reference: revision, priority… */
  meta?: React.ReactNode
  avatar?: React.ReactNode
  onBack?: () => void
  /** Status control and buttons, right-aligned. */
  actions?: React.ReactNode
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <header
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-xs sm:px-5 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        {onBack && (
          <Button variant="outline" size="icon-sm" onClick={onBack} aria-label="Back" className="shrink-0">
            <ArrowLeft />
          </Button>
        )}
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 space-y-1">
          {(reference || meta) && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              {reference && (
                <span className="inline-flex min-w-0 items-center gap-0.5">
                  <span
                    className={cn(
                      "truncate font-mono text-xs font-semibold tracking-tight",
                      referenceTone === "brand" ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    #{reference}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={copied ? "Copied" : `Copy ${reference}`}
                    title={copied ? "Copied" : "Copy number"}
                    className="text-muted-foreground"
                    onClick={() => {
                      void navigator.clipboard?.writeText(reference).then(() => setCopied(true))
                    }}
                  >
                    {copied ? <Check className="text-success" /> : <Copy />}
                  </Button>
                </span>
              )}
              {meta}
            </div>
          )}
          <h1
            title={title}
            className="m-0 truncate text-xl leading-tight font-semibold tracking-tight text-foreground sm:text-2xl"
          >
            {title}
          </h1>
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 *:max-md:flex-1 md:justify-end">{actions}</div>
      )}
    </header>
  )
}
