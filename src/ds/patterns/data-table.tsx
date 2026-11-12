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
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Columns3, GripVertical, ListFilter, Maximize2, Minimize2, RotateCcw, Rows3, Search } from "lucide-react"
// The app's one drag engine (also the Task board and the live table's column drag) — never a second one.
import { mergeVisibleOrder, SortableProvider, type SortableProps } from "@/ds/lib/sortable"
import { cn } from "@/ds/lib/utils"
import { toneStyle, type Tone } from "@/ds/lib/tone"
import { Button } from "@/ds/ui/button"
import { ButtonGroup } from "@/ds/ui/button-group"
import { Input } from "@/ds/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip"
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

/** A column's human name: `meta.label`, else its id. */
const columnLabel = (c: { id: string; columnDef: { meta?: unknown } }) =>
  typeof c.columnDef.meta === "object" && c.columnDef.meta && "label" in c.columnDef.meta
    ? String((c.columnDef.meta as { label: string }).label)
    : c.id

/**
 * Column filters match the text a person SEES (`meta.exportValue`, e.g. a formatted date or a status label), not
 * the raw value — typing "Nov" finds November rows, not ISO strings. Case-insensitive "contains".
 */
function displayTextFilter<T extends RowData>(meta: unknown) {
  const exportValue = (meta as { exportValue?: (row: T) => unknown } | undefined)?.exportValue
  return ((row: Row<T>, columnId: string, value: unknown) => {
    const needle = String(value ?? "").trim().toLowerCase()
    if (!needle) return true
    const shown = exportValue ? exportValue(row.original) : row.getValue(columnId)
    return String(shown ?? "").toLowerCase().includes(needle)
  }) as unknown as NonNullable<ColumnDef<T>["filterFn"]>
}

/** One tool in the table's tool group (Tooltip + ButtonGroup story recipes): tinted while ON. */
function ToolButton({ label, active, pressed, onClick, children }: {
  label: string
  active?: boolean
  /** For on/off tools: exposes aria-pressed. */
  pressed?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "tinted" : "outline"}
            size="icon"
            aria-label={label}
            aria-pressed={pressed}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

const SELECT_COLUMN_ID = "__select"
const DRAG_COLUMN_ID = "__drag"
/** One stable empty sizing, so "no widths yet" does not re-run the save effect every render. */
const NO_SIZING: ColumnSizingState = Object.freeze({}) as ColumnSizingState
/** The one container id rows live in for the drag engine. */
const ROWS_CONTAINER = "rows"

/** What the grip cells need, read live through a ref so the columns are not rebuilt on every move. */
type ReorderHandle = { canDrag: boolean; pausedReason: string; move: (id: string, delta: -1 | 1) => void; position: (id: string) => [number, number] }

function dragColumn<T extends RowData>(live: React.RefObject<ReorderHandle | null>): ColumnDef<T> {
  return {
    id: DRAG_COLUMN_ID,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 40,
    header: () => <span className="sr-only">Reorder</span>,
    cell: ({ row }) => {
      const h = live.current
      const [pos, total] = h?.position(row.id) ?? [row.index + 1, row.index + 1]
      return (
        <Button
          variant="ghost"
          size="icon-sm"
          data-row-grip=""
          data-row-id={row.id}
          disabled={!h?.canDrag}
          aria-label={`Move row ${pos} of ${total}`}
          aria-keyshortcuts="ArrowUp ArrowDown"
          title={h?.canDrag ? "Drag to reorder, or use ↑ / ↓" : h?.pausedReason}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          onKeyDown={(e) => {
            if (!h?.canDrag) return
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault()
              h.move(row.id, e.key === "ArrowUp" ? -1 : 1)
            }
          }}
        >
          <GripVertical aria-hidden />
        </Button>
      )
    },
  }
}
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
  rowReorder,
  canSelectRow,
  filters,
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
  /**
   * Rows can be dragged into a new order (a grip column; touch works too) or moved with ↑ / ↓ on the focused
   * grip — every move announced. `onReorder` receives the full order of row ids (give `getRowId`); persist it.
   * Paused while the table is sorted or searched, because the order on screen is then not the stored order.
   */
  rowReorder?: { onReorder: (orderedIds: string[]) => void }
  /**
   * With `selectable`: which rows may be ticked (others show a disabled checkbox, and "select all" skips them) —
   * e.g. only batches with money still owed can join a payment run.
   */
  canSelectRow?: (row: T) => boolean
  /**
   * Quick filters (org, branch, status) placed right after the search box — they narrow the same rows, so they
   * sit together; `toolbar` actions (export…) stay on the right.
   */
  filters?: React.ReactNode
}) {
  // The kit's locale (KitProvider) — the same grouping as every other number in v2.
  const { locale } = useLocale()
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting ?? [])
  const [globalFilter, setGlobalFilter] = React.useState("")
  // Read once per table: what this viewer chose last time (widths, hidden columns, density).
  const saved = React.useMemo(() => readTableState(stateKey), [stateKey])
  // Export-only columns are never shown; that wins over anything remembered.
  const [columnVisibility, setColumnVisibility] = React.useState<ColumnVisibilityState>(() => ({
    ...(saved.visibility ?? {}),
    ...Object.fromEntries(
      columns
        .filter((c) => (c.meta as { exportOnly?: boolean } | undefined)?.exportOnly)
        .map((c) => [c.id ?? String((c as { accessorKey?: unknown }).accessorKey), false]),
    ),
  }))
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [density, setDensity] = React.useState<"comfortable" | "compact">(saved.density ?? "comfortable")
  const [showFilters, setShowFilters] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const headRefs = React.useRef(new Map<string, HTMLTableCellElement>())
  /** Each column's natural width, as first measured — what "reset" returns to. */
  const naturalWidths = React.useRef(new Map<string, number>())
  const [localPagination, setLocalPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: initialPageSize })
  const server = rowCount !== undefined
  const pagination = controlledPagination ?? localPagination

  // Unique per table: several tables share a page (My Reimbursements has three), so a fixed id collides.
  const rowsPerPageId = React.useId()

  const reorderLive = React.useRef<ReorderHandle | null>(null)
  const allColumns = React.useMemo(
    () => [
      ...(rowReorder ? [dragColumn<T>(reorderLive)] : []),
      ...(selectable ? [selectColumn<T>()] : []),
      ...(renderDetail ? [expandColumn<T>()] : []),
      ...columns.map((c) => (c.filterFn ? c : { ...c, filterFn: displayTextFilter<T>(c.meta) })),
    ],
    [rowReorder, selectable, renderDetail, columns],
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
    enableRowSelection: selectable ? (canSelectRow ? (row) => canSelectRow(row.original) : true) : false,
    manualPagination: server,
    rowCount,
    enableColumnResizing: resizableColumns,
    columnResizeMode: "onChange",
    getRowCanExpand: renderDetail ? () => true : () => false,
  })

  const rows = table.getRowModel().rows
  const selected = table.getSelectedRowModel().rows
  const activeColumnFilters = (table.state.columnFilters ?? []).length
  // Column filters filter what the table holds; on a server-paged table that is one page — misleading, so off.
  const canFilterColumns = !server

  /** Back to the table as designed: widths, hidden columns, density, sorting, column filters; forgets the saved layout. */
  const resetLayout = () => {
    naturalWidths.current.clear()
    table.setColumnSizing({})
    setColumnVisibility(
      Object.fromEntries(
        columns
          .filter((c) => (c.meta as { exportOnly?: boolean } | undefined)?.exportOnly)
          .map((c) => [c.id ?? String((c as { accessorKey?: unknown }).accessorKey), false]),
      ),
    )
    setDensity("comfortable")
    setSorting(initialSorting ?? [])
    table.resetColumnFilters()
    if (stateKey) {
      try { window.localStorage.removeItem(`wt-table:${stateKey}`) } catch { /* storage unavailable */ }
    }
  }

  // Full screen: Esc leaves it, and the page behind does not scroll while it is open.
  React.useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false) }
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = previous
    }
  }, [fullscreen])
  const total = server ? rowCount! : table.getFilteredRowModel().rows.length
  const from = total === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1
  const to = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize)
  const visibleColumns = table.getVisibleLeafColumns().length
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide())
  const cellPad = density === "compact" ? "py-1.5" : "py-3"
  const hasFooter = table.getAllLeafColumns().some((c) => c.columnDef.footer !== undefined)
  const visibleIds = table.getVisibleLeafColumns().map((c) => c.id)
  const columnSizing: ColumnSizingState = table.state.columnSizing ?? NO_SIZING
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
    // Only from REAL rows: an empty, failed or loading table lays out on its headers alone, and those widths
    // would lock in and clip the data that arrives next (a screen renders empty, not yet loading, before its
    // first fetch). Until rows exist the table keeps its natural layout.
    if (!resizableColumns || loading || error || rows.length === 0 || fixedLayout) return
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
  const narrowCol = (id: string) => (id === SELECT_COLUMN_ID || id === EXPAND_COLUMN_ID || id === DRAG_COLUMN_ID) && "w-10"

  // ── Row reorder ────────────────────────────────────────────────────────────
  const dragSurface = `rows-${React.useId()}`
  const allIds = React.useMemo(() => data.map((r, i) => (getRowId ? getRowId(r, i) : String(i))), [data, getRowId])
  const canDrag = !!rowReorder && sorting.length === 0 && !globalFilter
  const [announcement, setAnnouncement] = React.useState("")
  const refocusId = React.useRef<string | null>(null)
  const commitOrder = (order: string[], movedId: string) => {
    rowReorder?.onReorder(order)
    setAnnouncement(`Moved to position ${order.indexOf(movedId) + 1} of ${order.length}.`)
  }
  reorderLive.current = rowReorder ? {
    canDrag,
    pausedReason: "Clear sorting and search to reorder",
    position: (id) => [allIds.indexOf(id) + 1, allIds.length],
    move: (id, delta) => {
      const from = allIds.indexOf(id)
      const to = from + delta
      if (from < 0 || to < 0 || to >= allIds.length) return
      const order = [...allIds]
      order.splice(from, 1)
      order.splice(to, 0, id)
      refocusId.current = id // keep the grip focused as its row moves (and across a page boundary)
      // Follow the row onto the next / previous page when it crosses one.
      const page = Math.floor(to / pagination.pageSize)
      if (!server && page !== pagination.pageIndex) table.setPageIndex(page)
      commitOrder(order, id)
    },
  } : null
  React.useEffect(() => {
    const id = refocusId.current
    if (!id) return
    refocusId.current = null
    document.querySelector<HTMLElement>(`[data-row-grip][data-row-id="${CSS.escape(id)}"]`)?.focus()
  })
  // `meta: { pin: "end" }` keeps a column (row actions) at the right edge while the rest scrolls sideways —
  // otherwise on a wide table the actions are the first thing to fall off screen.
  const pinEnd = (c: Column<T, unknown>) =>
    (c.columnDef.meta as { pin?: string } | undefined)?.pin === "end" &&
    // Opaque (it covers scrolled cells) yet painted exactly like the rest of its row, over the card colour: at rest
    // the row's tone (--row-bg); hovered / expanded / selected, the row's tint (--row-hover, published by TableRow)
    // REPLACES the tone — just as the row's own hover background replaces it for every other cell. (Layering the
    // two left the frozen cell a different shade from the rest of a hovered toned row.)
    "sticky right-0 z-[1] transition-colors [background:linear-gradient(var(--row-hover,var(--row-bg,transparent)),var(--row-hover,var(--row-bg,transparent))),var(--card)] shadow-[-10px_0_10px_-10px_rgb(0_0_0/0.18)]"

  let body: React.ReactNode
  let rowsBody: ((sp?: SortableProps) => React.ReactNode) | null = null
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
    rowsBody = (sp) => rows.map((row) => {
      const tone = rowTone?.(row.original)
      // The engine's wiring for this row: drag starts only on the grip, so text stays selectable and
      // controls keep their clicks. Its touch-action style merges with the tone style.
      const { style: dragStyle, ...drag } = (sp?.itemProps(row.id, ROWS_CONTAINER, { handle: "[data-row-grip]", disabled: !canDrag }) ?? {}) as { style?: React.CSSProperties }
      return (
        <React.Fragment key={row.id}>
          <TableRow
            {...drag}
            data-state={row.getIsSelected() ? "selected" : undefined}
            data-tone={tone ? "" : undefined}
            style={tone || dragStyle ? { ...dragStyle, ...(tone ? toneStyle(tone) : {}) } : undefined}
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
                // Once widths are fixed, text that no longer fits WRAPS — never "…". Widths are measured from the first
                // rows shown, so later, longer data ("office → station") used to be cut off: hidden content.
                className={cn(cellPad, narrowCol(cell.column.id), pinEnd(cell.column), fixedLayout && "whitespace-normal break-words")}
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

  const renderFrame = (sp?: SortableProps) => (
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
                      // `sticky` LAST: it also anchors the resize handle, and a later `relative` silently un-froze the header.
                      className={cn(narrowCol(h.column.id), fixedLayout && "relative", pinEnd(h.column))}
                    >
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      {fixedLayout && h.column.getCanResize() && !narrowCol(h.column.id) && (
                        <ResizeHandle
                          header={h}
                          naturalWidth={naturalWidths.current.get(h.column.id)}
                          label={columnLabel(h.column)}
                        />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
            {showFilters && canFilterColumns && (
              <TableRow className="hover:bg-transparent">
                {/* Cells, not headers: they hold inputs (an empty <th> is an a11y error for columns with no filter). */}
                {table.getVisibleLeafColumns().map((c) => (
                  <TableCell key={c.id} className={cn("px-3 py-1.5", narrowCol(c.id), pinEnd(c))}>
                    {c.getCanFilter() ? (
                      <Input
                        value={String(c.getFilterValue() ?? "")}
                        onChange={(e) => {
                          c.setFilterValue(e.target.value || undefined)
                          table.setPageIndex(0)
                        }}
                        aria-label={`Filter ${columnLabel(c)}`}
                        placeholder="Filter"
                        className="h-8 min-w-20 text-xs font-normal normal-case"
                      />
                    ) : null}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableHeader>
          <TableBody {...(sp?.listProps(ROWS_CONTAINER, !canDrag) ?? {})}>{body ?? rowsBody?.(sp)}</TableBody>
          {hasFooter && rows.length > 0 && !loading && !error && (
            // The frozen cell paints `--row-bg` over the card colour; give the footer its own (TableFooter's
            // `bg-muted/50`), or the pinned TOTAL cell shows as a white patch in a grey row.
            <TableFooter className="[--row-bg:color-mix(in_oklab,var(--muted)_50%,transparent)]">
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
  )

  return (
    <div
      data-slot="data-table"
      data-fullscreen={fullscreen ? "" : undefined}
      className={cn(
        "@container/data-table space-y-3",
        // Above the page, below popovers (kit layer tokens), so menus and selects still open over it.
        fullscreen && "fixed inset-0 z-(--z-modal) overflow-auto bg-background p-4 sm:p-6",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {selected.length > 0 && selectionActions ? (
          <div
            role="region"
            // Named after the table: two tables on one page must not expose two identical landmarks.
            aria-label={`Selection in ${caption}`}
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
            <div className="flex min-w-0 flex-wrap items-center gap-2">
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
              {filters}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {typeof toolbar === "function"
                ? toolbar({
                    rows: table.getFilteredRowModel().rows.map((r) => r.original),
                    selected: selected.map((r) => r.original),
                    visibleColumnIds: table.getVisibleLeafColumns().map((c) => c.id),
                  })
                : toolbar}
              {/* The table's tools, one joined group (ButtonGroup story): what the old table's icon strip had —
                  column filters, density, columns, reset layout, full screen. A tool is tinted only while ON. */}
              <ButtonGroup aria-label="Table tools">
                {canFilterColumns && (
                  <ToolButton
                    label={showFilters ? "Hide column filters" : "Show column filters"}
                    active={showFilters || activeColumnFilters > 0}
                    pressed={showFilters}
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    <ListFilter aria-hidden />
                  </ToolButton>
                )}
                <ToolButton
                  label={density === "compact" ? "Comfortable rows" : "Compact rows"}
                  active={density === "compact"}
                  pressed={density === "compact"}
                  onClick={() => setDensity((d) => (d === "compact" ? "comfortable" : "compact"))}
                >
                  <Rows3 aria-hidden />
                </ToolButton>
                {hideable.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="icon" aria-label="Show or hide columns" title="Show or hide columns" />}
                    >
                      <Columns3 aria-hidden />
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
                            {columnLabel(c)}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <ToolButton label="Reset layout" onClick={resetLayout}>
                  <RotateCcw aria-hidden />
                </ToolButton>
                <ToolButton
                  label={fullscreen ? "Exit full screen" : "Full screen"}
                  active={fullscreen}
                  pressed={fullscreen}
                  onClick={() => setFullscreen((v) => !v)}
                >
                  {fullscreen ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
                </ToolButton>
              </ButtonGroup>
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

      {rowReorder ? (
        <SortableProvider
          surface={dragSurface}
          axis="y"
          // The rows ON SCREEN (this page, displayed order): the engine pairs them with the DOM at drop time.
          itemsByContainer={{ [ROWS_CONTAINER]: rows.map((r) => r.id) }}
          onDrop={(d) => {
            if (d.unchanged) return
            commitOrder(mergeVisibleOrder(allIds, d.order), d.id)
          }}
        >
          {(sp) => renderFrame(sp)}
        </SortableProvider>
      ) : (
        renderFrame()
      )}
      <p aria-live="assertive" className="sr-only">{announcement}</p>

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
            <Pagination className="mx-0 w-auto" aria-label={`${caption} pages`}>
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
