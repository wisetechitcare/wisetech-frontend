import * as React from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { toneStyle, type HueTone, type Tone } from "@/ds/lib/tone"
import { Badge } from "@/ds/ui/badge"
import { Button } from "@/ds/ui/button"
import { Collapsible, CollapsibleContent } from "@/ds/ui/collapsible"

/** A figure column (e.g. "Branches"). Its hue tints the header dot and every count in it. */
export type TreeTableColumn = {
  id: string
  header: string
  tone?: HueTone
  /** Phones show the name and the columns without this flag; the rest wait for a wider screen. */
  hideOnPhone?: boolean
}

/** A count cell: a number, or a number that opens something (its `label` names the action). */
export type TreeTableCount = number | { value: number; onClick?: () => void; label?: string }

export type TreeTableNode = {
  id: string
  title: string
  /** What kind of row this is, as a pill after the title ("Group", "Sub-org", "Branch"). */
  kind?: { label: string; tone: Tone }
  /** Extra pills after the kind (e.g. an "Inactive" status badge). */
  status?: React.ReactNode
  subtitle?: string
  /** Leading avatar / logo / icon tile — rows lead with their icon (Introduction: rows left). */
  media?: React.ReactNode
  /** Colour of this row's guide line; the root band uses it too. Default `slate`. */
  tone?: Tone
  /** Keyed by column id. A missing key renders an empty cell. */
  counts?: Record<string, TreeTableCount>
  /** Row actions (kit `Button variant="tinted" size="icon"` inside a Tooltip). Shown on hover / focus
   *  from `md` up, always on phones. */
  actions?: React.ReactNode
  /** Opening the row (title button and row click). */
  onOpen?: () => void
  /** Accessible name of the open action. Default "Open {title}". */
  openLabel?: string
  children?: TreeTableNode[]
}

const INDENT = 26
/** name | one 96px column per figure | actions */
const ACTIONS_COL = "116px"

/**
 * A hierarchy as rows: one row per node, indented with ├ └ guide lines, figures in fixed columns so they
 * line up across every level, and row actions on the right. Parents expand and collapse (Collapsible);
 * `forceExpand` opens everything (e.g. while a search is active) and `expandSignal` drives an
 * "Expand all / Collapse all" button in the host's toolbar.
 *
 * The caller owns the data and decides what the figures mean (e.g. rolled-up totals). Replaces the live
 * `OrgTree` look; not a data table — use Patterns/Data Table for flat, sortable records.
 */
export function TreeTable({
  nodes,
  columns,
  nameHeader,
  defaultExpandedDepth = 1,
  forceExpand = false,
  expandSignal,
  empty,
  className,
}: {
  nodes: TreeTableNode[]
  columns: TreeTableColumn[]
  /** Heading of the name column, e.g. "Organization". */
  nameHeader: string
  /** Open nodes up to this depth on first render (0 = roots collapsed, 1 = roots open). */
  defaultExpandedDepth?: number
  /** Show every node open, whatever its own state. */
  forceExpand?: boolean
  /** Bump `n` to open (or close) every node at once. */
  expandSignal?: { open: boolean; n: number }
  /** Rendered instead of the rows when there are none (Feedback & Overlays/Empty State). */
  empty?: React.ReactNode
  className?: string
}) {
  if (!nodes.length) return <>{empty}</>

  const phoneCols = columns.filter((c) => !c.hideOnPhone).length
  const grid = {
    "--tt-cols": `minmax(0,1fr) repeat(${columns.length}, 96px) ${ACTIONS_COL}`,
    "--tt-cols-phone": `minmax(0,1fr) repeat(${phoneCols}, auto)`,
  } as React.CSSProperties

  return (
    <div data-slot="tree-table" className={cn("min-w-0", className)} style={grid}>
      {/* Column headings: visual only — each count carries its column's name for screen readers. */}
      <div
        aria-hidden
        className="mb-1.5 grid grid-cols-(--tt-cols-phone) items-center gap-x-4 border-b border-border px-2 pb-2 md:grid-cols-(--tt-cols) md:px-3"
      >
        <span className="heading-case text-[11px] font-semibold tracking-wide text-muted-foreground">{nameHeader}</span>
        {columns.map((col) => (
          <span
            key={col.id}
            style={toneStyle(col.tone ?? "slate")}
            className={cn(
              "heading-case flex items-center justify-end gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground",
              col.hideOnPhone && "max-md:hidden",
            )}
          >
            <span className="size-[7px] rounded-full bg-(--tone)" />
            {col.header}
          </span>
        ))}
        <span className="max-md:hidden" />
      </div>
      {nodes.map((node, i) => (
        <TreeRow
          key={node.id}
          node={node}
          columns={columns}
          depth={0}
          guides={[]}
          last={i === nodes.length - 1}
          defaultExpandedDepth={defaultExpandedDepth}
          forceExpand={forceExpand}
          expandSignal={expandSignal}
        />
      ))}
    </div>
  )
}

function TreeRow({
  node,
  columns,
  depth,
  guides,
  last,
  defaultExpandedDepth,
  forceExpand,
  expandSignal,
}: {
  node: TreeTableNode
  columns: TreeTableColumn[]
  depth: number
  /** Per ancestor level: does a vertical through-line continue past this row? */
  guides: boolean[]
  last: boolean
  defaultExpandedDepth: number
  forceExpand: boolean
  expandSignal?: { open: boolean; n: number }
}) {
  const [open, setOpen] = React.useState(depth < defaultExpandedDepth)
  React.useEffect(() => {
    if (expandSignal?.n) setOpen(expandSignal.open)
  }, [expandSignal])
  const kids = node.children ?? []
  const hasChildren = kids.length > 0
  const isOpen = forceExpand || open
  const tone = node.tone ?? "slate"
  const root = depth === 0
  const bodyId = React.useId()
  // Children draw a through-line at this level only if this row has siblings below it.
  const childGuides = root ? [] : [...guides, !last]
  const openLabel = node.openLabel ?? `Open ${node.title}`

  return (
    <Collapsible open={isOpen} onOpenChange={setOpen}>
      <div
        data-slot="tree-table-row"
        data-depth={depth}
        style={toneStyle(tone)}
        onClick={node.onOpen}
        className={cn(
          "group/tt-row relative grid min-h-14 grid-cols-(--tt-cols-phone) items-center gap-x-4 rounded-lg px-2 transition-colors md:grid-cols-(--tt-cols) md:px-3",
          node.onOpen && "cursor-pointer",
          root
            ? "mb-1 rounded-l-none bg-[color-mix(in_oklch,var(--tone)_6%,transparent)] shadow-[inset_3px_0_0_var(--tone)] hover:bg-[color-mix(in_oklch,var(--tone)_10%,transparent)]"
            : "hover:bg-muted/60",
        )}
      >
        {!root && <Guides guides={guides} last={last} />}

        <div className="flex min-w-0 items-center gap-2.5" style={{ paddingLeft: root ? 0 : depth * INDENT + 10 }}>
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-expanded={isOpen}
              aria-controls={bodyId}
              aria-label={isOpen ? `Collapse ${node.title}` : `Expand ${node.title}`}
              onClick={(e) => {
                e.stopPropagation()
                setOpen((o) => !o)
              }}
              className="shrink-0 text-(--tone-ink) hover:bg-[color-mix(in_oklch,var(--tone)_14%,transparent)]"
            >
              <ChevronRight aria-hidden className={cn("motion-safe:transition-transform", isOpen && "rotate-90")} />
            </Button>
          ) : (
            <span aria-hidden className="size-6 shrink-0" />
          )}
          {node.media}
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1.5">
              {node.onOpen ? (
                // The kit `link` Button laid flush: reads as the record's name, opens it like a link.
                <Button
                  variant="link"
                  aria-label={openLabel}
                  onClick={(e) => {
                    e.stopPropagation()
                    node.onOpen?.()
                  }}
                  className={cn(
                    "h-auto min-w-0 justify-start truncate p-0 font-semibold text-foreground hover:text-primary",
                    root ? "text-[15px]" : "text-sm",
                  )}
                >
                  {node.title}
                </Button>
              ) : (
                <span className={cn("min-w-0 truncate font-semibold", root ? "text-[15px]" : "text-sm")}>{node.title}</span>
              )}
              {node.kind && <KindBadge kind={node.kind} />}
              {node.status}
            </div>
            {node.subtitle && <p className="truncate text-xs text-muted-foreground">{node.subtitle}</p>}
          </div>
        </div>

        {columns.map((col) => (
          <CountCell key={col.id} column={col} count={node.counts?.[col.id]} />
        ))}

        <div
          data-slot="tree-table-actions"
          className={cn(
            "col-span-full flex justify-end gap-1.5 pb-2 md:col-auto md:pb-0",
            // Revealed with the row from md up; a phone has no hover, so they stay visible there.
            "md:opacity-0 md:group-focus-within/tt-row:opacity-100 md:group-hover/tt-row:opacity-100 motion-safe:transition-opacity",
            !node.actions && "max-md:hidden",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {node.actions}
        </div>
      </div>

      {hasChildren && (
        <CollapsibleContent id={bodyId}>
          {kids.map((child, i) => (
            <TreeRow
              key={child.id}
              node={child}
              columns={columns}
              depth={depth + 1}
              guides={childGuides}
              last={i === kids.length - 1}
              defaultExpandedDepth={defaultExpandedDepth}
              forceExpand={forceExpand}
              expandSignal={expandSignal}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  )
}

/** The kind pill: a hue or status badge, never colour alone (it carries its label). */
function KindBadge({ kind }: { kind: { label: string; tone: Tone } }) {
  return (
    <Badge variant={kind.tone as React.ComponentProps<typeof Badge>["variant"]} className="shrink-0">
      {kind.label}
    </Badge>
  )
}

/** A figure in its column's hue: a soft pill when there is something, a quiet zero when not. */
function CountCell({ column, count }: { column: TreeTableColumn; count?: TreeTableCount }) {
  const hidden = column.hideOnPhone && "max-md:hidden"
  if (count === undefined) return <span className={cn(hidden)} />
  const { value, onClick, label } = typeof count === "number" ? { value: count, onClick: undefined, label: undefined } : count
  const name = <span className="sr-only">{column.header}: </span>
  if (!value) {
    return (
      <span className={cn("flex justify-end pr-2 text-xs font-semibold tabular-nums text-muted-foreground", hidden)}>
        {name}0
      </span>
    )
  }
  const variant = (column.tone ?? "slate") as React.ComponentProps<typeof Badge>["variant"]
  return (
    <span className={cn("flex justify-end", hidden)} style={toneStyle(column.tone ?? "slate")}>
      {onClick ? (
        // A figure that opens something: the Button `tinted` recipe in the column's hue (the Tinted
        // story's small pill), so it looks like the static Badge beside it but is plainly pressable.
        <Button
          variant="tinted"
          size="xs"
          className="min-w-9 font-bold tabular-nums [--tint:var(--tone)]"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
        >
          {/* The name is built from text, not aria-label, so it CONTAINS the visible figure (WCAG 2.5.3). */}
          <span className="sr-only">{label ?? column.header}: </span>
          {value}
        </Button>
      ) : (
        <Badge variant={variant} className="min-w-9 font-bold tabular-nums">
          {name}
          {value}
        </Badge>
      )}
    </span>
  )
}

/** ├ └ │ guides for one row: a through-line per ancestor with siblings below, then this row's elbow. */
function Guides({ guides, last }: { guides: boolean[]; last: boolean }) {
  const at = (level: number) => ({ left: level * INDENT + 11 })
  return (
    <>
      {guides.map((through, i) => through && <span key={i} aria-hidden className="absolute inset-y-0 w-[1.5px] bg-border" style={at(i)} />)}
      <span
        aria-hidden
        className={cn("absolute top-0 w-[1.5px] bg-[color-mix(in_oklch,var(--tone)_35%,transparent)]", last ? "h-1/2" : "h-full")}
        style={at(guides.length)}
      />
      <span aria-hidden className="absolute top-1/2 h-[1.5px] w-[13px] bg-[color-mix(in_oklch,var(--tone)_35%,transparent)]" style={at(guides.length)} />
      <span
        aria-hidden
        className="absolute top-[calc(50%-2.5px)] size-[5px] rounded-full bg-(--tone)"
        style={{ left: guides.length * INDENT + 22 }}
      />
    </>
  )
}
