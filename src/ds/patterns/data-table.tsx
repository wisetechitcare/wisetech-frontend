import * as React from "react"
import {
  flexRender,
  useTable,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type RowData,
} from "@tanstack/react-table"
// TanStack Table v9: the features, row models and column types live in one place (shadcn's data-table guide).
import { dataTableFeatures, type Column, type ColumnDef, type Header, type Row } from "./data-table-features"
import { useLocale } from "react-aria-components"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Columns3, Rows3, Search } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { Button } from "@/ds/ui/button"
import { Card } from "@/ds/ui/card"
import { Checkbox } from "@/ds/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ds/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/ds/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ds/ui/select"
import { Skeleton } from "@/ds/ui/skeleton"
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/ds/ui/table"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem } from "@/ds/ui/pagination"
import { EmptyState } from "./empty-state"

export type { ColumnDef, DataTableColumnMeta, RowData } from "./data-table-features"

/** What a toolbar control (Export, a bulk menu) needs to act on exactly what the table is showing. */
export type DataTableToolbarContext<T> = {
  /** Rows after search, all pages. */
  rows: T[]
  /** Ticked rows (empty without `selectable`). */
  selected: T[]
  /** Columns currently shown, by id — an export should leave out what the user hid. */
  visibleColumnIds: string[]
}

/**
 * A sortable column header: the button names the column and its sort state; the `<th>` carries
 * `aria-sort`. Use it in a column's `header` when that column may be sorted.
 */
export function SortableHeader<T extends RowData>({ column, title }: { column: Column<T, unknown>; title: string }) {
  const dir = column.getIsSorted()
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown
  return (
    <Button
      variant="ghost"
      size="sm"
      // The header's own type (heading-case: uppercase, letter-spacing; size, weight): a sortable column must
      // read exactly like its plain neighbours — the button only adds the arrow and the click.
      className="-ml-2 h-8 px-2 font-[inherit] text-[length:inherit] tracking-[inherit] [text-transform:inherit]"
      onClick={() => column.toggleSorting(dir === "asc")}
    >
      {title}
      <Icon aria-hidden className={cn(!dir && "text-muted-foreground/60")} />
    </Button>
  )
}

const SELECT_COLUMN_ID = "__select"
const EXPAND_COLUMN_ID = "__expand"

function expandColumn<T extends RowData>(): ColumnDef<T> {
  return {
    id: EXPAND_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 40,
    header: () => <span className="sr-only">Details</span>,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={row.getIsExpanded() ? "Hide details" : "Show details"}
        aria-expanded={row.getIsExpanded()}
        onClick={(e) => {
          e.stopPropagation()
          row.toggleExpanded()
        }}
      >
        <ChevronDown aria-hidden className={cn("transition-transform duration-(--duration-control) ease-move", row.getIsExpanded() && "rotate-180")} />
      </Button>
    ),
  }
}

/**
 * A column's resize handle. Mouse/touch drag like any table; it is ALSO a focusable separator, so a keyboard
 * user resizes with ← / → (Shift = bigger steps) and a screen reader hears the width — a drag-only handle
 * shuts both out. Double-click (or Enter) puts the column back to its default width.
 */
function ResizeHandle<T extends RowData>({ header, label, naturalWidth }: { header: Header<T, unknown>; label: string; naturalWidth?: number }) {
  const column = header.column
  const size = header.getSize()
  const min = column.columnDef.minSize ?? 60
  const max = column.columnDef.maxSize ?? 800
  // From the CURRENT width inside the updater, never from this render's `size`: two quick key presses (or a
  // held arrow) would both start from the same stale value and the second would be lost.
  const nudge = (delta: number) =>
    header.getContext().table.setColumnSizing((old) => ({
      ...old,
      [column.id]: Math.min(max, Math.max(min, (old[column.id] ?? size) + delta)),
    }))
  // Back to the width the column had when the table first laid out — set directly, so the table never drops to
  // natural layout for a frame (that flickered and re-measured a slightly different width).
  const reset = () =>
    naturalWidth !== undefined
      ? header.getContext().table.setColumnSizing((old) => ({ ...old, [column.id]: naturalWidth }))
      : column.resetSize()
  const handler = header.getResizeHandler()
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label}`}
      aria-valuenow={Math.round(size)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onMouseDown={handler}
      onTouchStart={handler}
      onDoubleClick={reset}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 40 : 10
        if (e.key === "ArrowLeft") { e.preventDefault(); nudge(-step) }
        else if (e.key === "ArrowRight") { e.preventDefault(); nudge(step) }
        else if (e.key === "Enter") { e.preventDefault(); reset() }
      }}
      className={cn(
        "absolute inset-y-1 -end-1 z-[2] w-2 cursor-col-resize touch-none select-none rounded-full outline-none",
        "after:absolute after:inset-y-0 after:start-1/2 after:w-px after:-translate-x-1/2 after:bg-border",
        "hover:after:w-0.5 hover:after:bg-primary focus-visible:after:w-0.5 focus-visible:after:bg-primary focus-visible:ring-2 focus-visible:ring-ring/50",
        column.getIsResizing() && "after:w-0.5 after:bg-primary",
      )}
    />
  )
}

/** What a table remembers for its viewer (`stateKey`): widths, hidden columns, density. Per-viewer convenience. */
type SavedTableState = { sizing?: ColumnSizingState; visibility?: ColumnVisibilityState; density?: "comfortable" | "compact" }
const storageKey = (key: string) => `wt-table:${key}`
function readTableState(key?: string): SavedTableState {
  if (!key) return {}
  try {
    return JSON.parse(localStorage.getItem(storageKey(key)) ?? "{}") as SavedTableState
  } catch {
    return {} // private mode, blocked storage, bad JSON: the table just starts fresh
  }
}
function writeTableState(key: string | undefined, state: SavedTableState) {
  if (!key) return
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(state))
  } catch {
    /* storage unavailable: nothing to remember, nothing breaks */
  }
}

/** Page numbers with gaps: 1 … 4 5 6 … 20 — first, last, and the current page's neighbours. */
function pageList(current: number, count: number): Array<number | "gap"> {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i)
  const keep = new Set([0, count - 1, current - 1, current, current + 1].filter((i) => i >= 0 && i < count))
  const out: Array<number | "gap"> = []
  let prev = -1
  for (const i of [...keep].sort((a, b) => a - b)) {
    if (prev >= 0 && i - prev > 1) out.push("gap")
    out.push(i)
    prev = i
  }
  return out
}

/** A click inside a control (a button, link, input, menu) belongs to that control, not to the row. */
const fromControl = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest("button, a, input, select, textarea, label, [role=menuitem], [role=checkbox], [data-slot=checkbox]")

function selectColumn<T extends RowData>(): ColumnDef<T> {
  return {
    id: SELECT_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 40,
    header: ({ table }) => (
      <Checkbox
        aria-label="Select all rows on this page"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onCheckedChange={(on) => table.toggleAllPageRowsSelected(!!on)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select row ${row.index + 1}`}
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(on) => row.toggleSelected(!!on)}
      />
    ),
  }
}

/**
 * The one data table. Replaces the live `MaterialTable` / `MaterialTableImpl` (material-react-table) with
 * TanStack Table drawn in kit components: sorting, search, column show/hide, row selection with a bulk
 * action bar, paging, density, loading / empty / error states, horizontal scroll inside its own frame.
 *
 * Client-side by default. For server paging pass `rowCount` + `pagination` + `onPaginationChange`
 * (and do the search/sort on the server).
 */
export function DataTable<T extends RowData>({
  caption,
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search",
  selectable = false,
  selectionActions,
  toolbar,
  loading = false,
  error,
  onRetry,
  empty,
  initialPageSize = 10,
  rowCount,
  pagination: controlledPagination,
  onPaginationChange,
  minWidth = 720,
  initialSorting,
  onRowClick,
  rowLabel,
  rowTone,
  renderDetail,
  renderCard,
  resizableColumns = true,
  stateKey,
}: {
  /** Names the table for assistive tech (rendered visually hidden). */
  caption: string
  /** `any` is TanStack's own idiom here: each column has a different value type. */
  columns: ColumnDef<T, any>[]
  data: T[]
  getRowId?: (row: T, index: number) => string
  searchPlaceholder?: string
  selectable?: boolean
  /** Bulk actions shown in the selection bar while rows are selected (live `TableSelectionBar`). */
  selectionActions?: (rows: Row<T>[], clear: () => void, ctx: DataTableToolbarContext<T>) => React.ReactNode
  /** Extra controls in the toolbar (Filters button, export). A function receives the table's live state. */
  toolbar?: React.ReactNode | ((ctx: DataTableToolbarContext<T>) => React.ReactNode)
  loading?: boolean
  /** Loading failed: shown instead of rows, with Retry. */
  error?: string
  onRetry?: () => void
  /** Shown when there are no rows at all (a no-match search gets its own message). */
  empty?: React.ReactNode
  initialPageSize?: number
  /** Server paging: total rows on the server. */
  rowCount?: number
  pagination?: PaginationState
  onPaginationChange?: (next: PaginationState) => void
  /** Columns keep at least this width (px); narrower screens scroll the table, not the page. */
  minWidth?: number
  /** The order rows open in, e.g. newest first: `[{ id: "date", desc: true }]`. */
  initialSorting?: SortingState
  /** The whole row opens the record (also Enter / Space on the focused row). Controls inside keep their own clicks. */
  onRowClick?: (row: T) => void
  /** What a clickable row is called for assistive tech, e.g. "Batch RB-1042" (default: "Open row N"). */
  rowLabel?: (row: T) => string
  /** Tints a row by its state (a status, a category hue) — e.g. rejected rows in danger. */
  rowTone?: (row: T) => Tone | (string & {}) | undefined
  /** Adds a chevron to each row that opens this panel underneath it (the live `renderDetailPanel`). */
  renderDetail?: (row: T) => React.ReactNode
  /**
   * Below 640px of table width the rows become these cards (the live `renderMobileCard`); search, paging and
   * the toolbar stay. Measured on the table's own width, so a table in a narrow column gets cards too.
   */
  renderCard?: (row: T) => React.ReactNode
  /**
   * Drag a column's edge (or ← / → on the focused edge) to resize it. On by default: each column starts at its
   * NATURAL width (measured once from the normal layout), so a table looks as it always did until someone
   * resizes it. `false` keeps a purely natural layout.
   */
  resizableColumns?: boolean
  /**
   * Remember this viewer's column widths, hidden columns and density for this table (localStorage). A stable,
   * unique name per table, e.g. "reimbursement.inbox".
   */
  stateKey?: string
}) {
  // The kit's locale (KitProvider) — the same grouping as every other number in v2.
  const { locale } = useLocale()
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting ?? [])
  const [globalFilter, setGlobalFilter] = React.useState("")
  // Read once per table: what this viewer chose last time (widths, hidden columns, density).
  const saved = React.useMemo(() => readTableState(stateKey), [stateKey])
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(saved.visibility ?? {})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [density, setDensity] = React.useState<"comfortable" | "compact">(saved.density ?? "comfortable")
  const headRefs = React.useRef(new Map<string, HTMLTableCellElement>())
  /** Each column's natural width, as first measured — what "reset" returns to. */
  const naturalWidths = React.useRef(new Map<string, number>())
  const [localPagination, setLocalPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize })
  const server = rowCount !== undefined
  const pagination = controlledPagination ?? localPagination

  // Unique per table: several tables share a page (My Reimbursements has three), so a fixed id collides.
  const rowsPerPageId = React.useId()

  const allColumns = React.useMemo(
    () => [...(selectable ? [selectColumn<T>()] : []), ...(renderDetail ? [expandColumn<T>()] : []), ...columns],
    [selectable, renderDetail, columns],
  )

  const table = useTable({
    features: dataTableFeatures,
    data,
    columns: allColumns,
    getRowId,
    state: { sorting, globalFilter, columnVisibility, rowSelection, pagination },
    // Column sizing is OWNED by the table (v9): with an onColumnSizingChange the table stops writing its own
    // sizing and reads ours back a render late, so widths lagged behind the drag/keys. Start from what the
    // viewer saved; read the live value from table.state.
    initialState: { columnSizing: saved.sizing ?? {} },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater
      if (onPaginationChange) onPaginationChange(next)
      else setLocalPagination(next)
    },
    enableRowSelection: selectable,
    manualPagination: server,
    rowCount,
    enableColumnResizing: resizableColumns,
    columnResizeMode: "onChange",
    getRowCanExpand: renderDetail ? () => true : () => false,
  })

  const rows = table.getRowModel().rows
  const selected = table.getSelectedRowModel().rows
  const total = server ? rowCount! : table.getFilteredRowModel().rows.length
  const from = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const to = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize)
  const visibleColumns = table.getVisibleLeafColumns().length
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide())
  const cellPad = density === "compact" ? "py-1.5" : "py-3"
  const hasFooter = table.getAllLeafColumns().some((c) => c.columnDef.footer !== undefined)
  const visibleIds = table.getVisibleLeafColumns().map((c) => c.id)
  const columnSizing: ColumnSizingState = table.state.columnSizing ?? {}
  // Debounced: a drag fires a sizing change per pointer move; storage needs only where it ended.
  React.useEffect(() => {
    if (!stateKey) return
    const t = window.setTimeout(() => writeTableState(stateKey, { sizing: columnSizing, visibility: columnVisibility, density }), 300)
    return () => window.clearTimeout(t)
  }, [stateKey, columnSizing, columnVisibility, density])
  // Fixed layout (drag to resize) once every visible column has a width — measured or remembered. Until then
  // the table lays out naturally, which is exactly what gets measured.
  const fixedLayout = resizableColumns && visibleIds.every((id) => columnSizing[id] !== undefined)
  React.useLayoutEffect(() => {
    if (!resizableColumns || loading || fixedLayout) return
    const missing: ColumnSizingState = {}
    for (const id of visibleIds) {
      if (columnSizing[id] !== undefined) continue
      const w = headRefs.current.get(id)?.getBoundingClientRect().width ?? 0
      if (w <= 0) return // hidden (phone cards) or not laid out yet: measure on a later render
      missing[id] = Math.round(w)
    }
    for (const [id, w] of Object.entries(missing)) naturalWidths.current.set(id, w)
    table.setColumnSizing((old) => ({ ...old, ...missing }))
  })
  const narrowCol = (id: string) => (id === SELECT_COLUMN_ID || id === EXPAND_COLUMN_ID) && "w-10"
  // `meta: { pin: "end" }` keeps a column (row actions) at the right edge while the rest scrolls sideways —
  // otherwise on a wide table the actions are the first thing to fall off screen.
  const pinEnd = (c: Column<T, unknown>) =>
    (c.columnDef.meta as { pin?: string } | undefined)?.pin === "end" &&
    // Opaque (it covers scrolled cells) yet in its row's tint: the tint layered over the card colour.
    "sticky right-0 z-[1] [background:linear-gradient(var(--row-bg,transparent),var(--row-bg,transparent)),var(--card)] shadow-[-10px_0_10px_-10px_rgb(0_0_0/0.18)]"

  let body: React.ReactNode
  if (loading) {
    body = Array.from({ length: Math.min(pagination.pageSize, 5) }, (_, i) => (
      <TableRow key={i}>
        {table.getVisibleLeafColumns().map((c) => (
          <TableCell key={c.id} className={cellPad}>
            <Skeleton className="h-4 w-full max-w-40" />
          </TableCell>
        ))}
      </TableRow>
    ))
  } else if (error) {
    body = (
      <TableRow>
        <TableCell colSpan={visibleColumns} className="p-4">
          <EmptyState
            variant="error"
            size="sm"
            title="Couldn't load this table"
            description={error}
            action={onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}
          />
        </TableCell>
      </TableRow>
    )
  } else if (rows.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={visibleColumns} className="p-4">
          {globalFilter ? (
            <EmptyState
              variant="no-match"
              size="sm"
              title={`Nothing matches “${globalFilter}”`}
              description="Check the spelling or search for something else."
              action={<Button size="sm" variant="outline" onClick={() => setGlobalFilter("")}>Clear search</Button>}
            />
          ) : (
            empty ?? <EmptyState size="sm" title="Nothing here yet" />
          )}
        </TableCell>
      </TableRow>
    )
  } else {
    body = rows.map((row) => {
      const tone = rowTone?.(row.original)
      return (
        <React.Fragment key={row.id}>
          <TableRow
            data-state={row.getIsSelected() ? "selected" : undefined}
            data-tone={tone ? "" : undefined}
            style={tone ? toneStyle(tone) : undefined}
            // A soft tint and a 3px edge in the row's tone: the state reads at a glance, the text stays readable.
            className={cn(
              tone && "[--row-bg:color-mix(in_oklch,var(--tone)_7%,transparent)] bg-(--row-bg) shadow-[inset_3px_0_0_var(--tone)] hover:[--row-bg:color-mix(in_oklch,var(--tone)_12%,transparent)]",
              onRowClick && "cursor-pointer outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
            )}
            tabIndex={onRowClick ? 0 : undefined}
            aria-label={onRowClick ? (rowLabel?.(row.original) ?? `Open row ${row.index + 1}`) : undefined}
            onClick={onRowClick ? (e) => { if (!fromControl(e.target)) onRowClick(row.original) } : undefined}
            onKeyDown={onRowClick ? (e) => {
              if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                e.preventDefault()
                onRowClick(row.original)
              }
            } : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                style={fixedLayout ? { width: cell.column.getSize() } : undefined}
                className={cn(cellPad, narrowCol(cell.column.id), pinEnd(cell.column), fixedLayout && "overflow-hidden text-ellipsis")}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
          {renderDetail && row.getIsExpanded() && (
            <TableRow data-slot="data-table-detail" className="bg-muted/30 hover:bg-muted/30">
              <TableCell colSpan={visibleColumns} className="p-4 whitespace-normal">
                {renderDetail(row.original)}
              </TableCell>
            </TableRow>
          )}
        </React.Fragment>
      )
    })
  }

  return (
    <div data-slot="data-table" className="@container/data-table space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {selected.length > 0 && selectionActions ? (
          <div
            role="region"
            aria-label="Selection"
            className="flex flex-1 flex-wrap items-center gap-2 rounded-xl bg-accent px-3 py-1.5 text-accent-foreground"
          >
            <span className="text-sm font-medium" aria-live="polite">
              {selected.length} selected
            </span>
            <div className="flex flex-wrap gap-2">{selectionActions(selected, () => table.resetRowSelection(), {
                rows: table.getFilteredRowModel().rows.map((r) => r.original),
                selected: selected.map((r) => r.original),
                visibleColumnIds: visibleIds,
              })}</div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => table.resetRowSelection()}>
              Clear selection
            </Button>
          </div>
        ) : (
          <>
            <InputGroup className="w-full sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={globalFilter}
                onChange={(e) => {
                  setGlobalFilter(e.target.value)
                  table.setPageIndex(0)
                }}
              />
            </InputGroup>
            <div className="ml-auto flex items-center gap-2">
              {typeof toolbar === "function"
                ? toolbar({
                    rows: table.getFilteredRowModel().rows.map((r) => r.original),
                    selected: selected.map((r) => r.original),
                    visibleColumnIds: table.getVisibleLeafColumns().map((c) => c.id),
                  })
                : toolbar}
              <Button
                variant="outline"
                size="icon"
                aria-label={density === "compact" ? "Comfortable rows" : "Compact rows"}
                aria-pressed={density === "compact"}
                onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))}
              >
                <Rows3 aria-hidden />
              </Button>
              {hideable.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="outline" />}>
                    <Columns3 data-icon="inline-start" aria-hidden /> Columns
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                      {hideable.map((c) => (
                        <DropdownMenuCheckboxItem
                          key={c.id}
                          checked={c.getIsVisible()}
                          onCheckedChange={(on) => c.toggleVisibility(!!on)}
                        >
                          {typeof c.columnDef.meta === "object" && c.columnDef.meta && "label" in c.columnDef.meta
                            ? String((c.columnDef.meta as { label: string }).label)
                            : c.id}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>

      {renderCard && !loading && !error && rows.length > 0 && (
        <ul data-slot="data-table-cards" aria-label={caption} className="hidden gap-3 @max-[640px]/data-table:grid">
          {rows.map((row) => (
            <li key={row.id}>{renderCard(row.original)}</li>
          ))}
        </ul>
      )}

      <Card
        variant="panel"
        className={cn(
          "gap-0 overflow-x-auto py-0",
          // With cards, the table frame steps aside on narrow widths (loading / empty / error still show here).
          renderCard && !loading && !error && rows.length > 0 && "@max-[640px]/data-table:hidden",
        )}
      >
        <Table
          // Fixed: columns take their widths and the table still fills its frame (extra space is shared out).
          style={fixedLayout ? { width: table.getTotalSize(), minWidth: `max(${minWidth}px, 100%)` } : { minWidth }}
          className={cn(fixedLayout && "table-fixed")}
          aria-busy={loading || undefined}
        >
          <TableCaption className="sr-only">{caption}</TableCaption>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const dir = h.column.getIsSorted()
                  return (
                    <TableHead
                      key={h.id}
                      ref={(el) => {
                        if (el) headRefs.current.set(h.column.id, el)
                        else headRefs.current.delete(h.column.id)
                      }}
                      style={fixedLayout ? { width: h.getSize() } : undefined}
                      aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : h.column.getCanSort() ? "none" : undefined}
                      className={cn(narrowCol(h.column.id), pinEnd(h.column), fixedLayout && "relative")}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {fixedLayout && h.column.getCanResize() && !narrowCol(h.column.id) && (
                        <ResizeHandle
                          header={h}
                          naturalWidth={naturalWidths.current.get(h.column.id)}
                          label={
                            typeof h.column.columnDef.meta === "object" && h.column.columnDef.meta && "label" in h.column.columnDef.meta
                              ? String((h.column.columnDef.meta as { label: string }).label)
                              : h.column.id
                          }
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{body}</TableBody>
          {hasFooter && rows.length > 0 && !loading && !error && (
            <TableFooter>
              {table.getFooterGroups().map((fg) => (
                <TableRow key={fg.id}>
                  {fg.headers.map((h) => (
                    <TableCell key={h.id} className={cn(cellPad, "font-semibold", narrowCol(h.column.id), pinEnd(h.column))}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.footer, h.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableFooter>
          )}
        </Table>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p aria-live="polite" className="tabular">
          {total === 0 ? "No rows" : `${from}–${to} of ${new Intl.NumberFormat(locale).format(total)}`}
        </p>
        <div className="flex items-center gap-2">
          <span id={rowsPerPageId}>Rows per page</span>
          <Select
            items={[10, 25, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
            value={String(pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger size="sm" aria-labelledby={rowsPerPageId} className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            <ChevronLeft aria-hidden />
          </Button>
          {table.getPageCount() > 1 && (
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                {pageList(pagination.pageIndex, table.getPageCount()).map((p, i) =>
                  p === "gap" ? (
                    <PaginationItem key={`gap-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <Button
                        variant={p === pagination.pageIndex ? "outline" : "ghost"}
                        size="icon-sm"
                        aria-label={`Page ${p + 1}`}
                        aria-current={p === pagination.pageIndex ? "page" : undefined}
                        onClick={() => table.setPageIndex(p)}
                        className="tabular"
                      >
                        {p + 1}
                      </Button>
                    </PaginationItem>
                  ),
                )}
              </PaginationContent>
            </Pagination>
          )}
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}
