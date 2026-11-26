import {
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createFilteredRowModel,
  createGroupedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFns,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  type Column as TanColumn,
  type ColumnDef as TanColumnDef,
  type Header as TanHeader,
  type Row as TanRow,
  type RowData,
} from "@tanstack/react-table"

/**
 * What every column may carry in `meta` — read by the kit DataTable (Columns menu, pinning) and by the app's
 * DataTableExport (file column names and values). Typed through the features' `columnMeta` slot, so a typo in
 * a column's meta is a compile error, not a silently missing label.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- one meta type serves every row type's columns
export interface DataTableColumnMeta<TData = any> {
  /** The column's name in the Columns menu and in an export. */
  label?: string
  /**
   * Pinned by default (the viewer can change it in the Columns panel): `"end"` stays at the right edge while the
   * table scrolls sideways (row actions); `"start"` at the left (the record's name).
   */
  pin?: "start" | "end"
  /** The plain value an export writes when the cell decorates it (a badge, a chip). */
  exportValue?: (row: TData) => unknown
  /** `false` keeps the column out of exports (a thumbnail, a button). */
  export?: boolean
  /**
   * How an export writes the value — and how the on-screen column aligns:
   * `number` / `currency` ⇒ right-aligned header + body + tabular figures (default text stays left).
   * Dates and status stay text (left); do not mark them `number`.
   */
  exportType?: "text" | "number" | "currency"
  /** Sum this column in the export's TOTAL row (number / currency columns). */
  exportTotal?: boolean
  /**
   * Explicit horizontal align. When omitted, `exportType` `number`/`currency` ⇒ right; everything else ⇒ left.
   * Prefer `exportType` for counts/money so export and screen stay one rule.
   */
  align?: "left" | "center" | "right"
  /**
   * In the export only — never drawn in the table or offered in the Columns menu. For a value the screen already
   * shows inside another cell (an employee code under the name) that a spreadsheet still wants as its own column.
   */
  exportOnly?: boolean
  /**
   * When fixed layout is on, cells wrap by default so longer values stay visible. Set `false` for dates, IDs,
   * counts, and other tokens that must stay on one line (pair with `size` / `minSize` so the column is wide enough).
   */
  wrap?: boolean
  /**
   * When `false`, the column starts hidden (Columns menu can show it). MaterialTable used the same flag on CRM lists.
   */
  defaultVisible?: boolean
  /**
   * Opt into the DataTable facet strip (multi-select chips for enum-like columns: status, branch, type).
   * `true` derives unique values from client `data`; pass `{ options }` on server-paged tables.
   */
  facet?: boolean | {
    options?: { value: string; label?: string }[]
    /** Cap chips before truncation. Default 8. */
    limit?: number
  }
}

/** Resolve horizontal align from column meta (SSOT for DataTable head / body / footer). */
export function columnHAlign(meta?: DataTableColumnMeta | null): "left" | "center" | "right" {
  if (meta?.align) return meta.align
  if (meta?.exportType === "number" || meta?.exportType === "currency") return "right"
  return "left"
}

/** Tailwind classes for head/body/footer cells from {@link columnHAlign}. */
export function columnAlignClass(meta?: DataTableColumnMeta | null): string | undefined {
  const align = columnHAlign(meta)
  if (align === "right") return "text-right tabular"
  if (align === "center") return "text-center"
  return undefined
}

/**
 * The table features the kit's DataTable is built from — TanStack Table v9 (shadcn's data-table guide declares
 * these in `data-table-features.ts`; this is that file). Only what the table uses is registered, so the rest of
 * TanStack stays out of the bundle: sorting, global + column filtering, grouping, visibility, selection, pagination,
 * expansion (detail panels and group rows), sizing + resizing.
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  globalFilteringFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  columnVisibilityFeature,
  rowSelectionFeature,
  rowPaginationFeature,
  rowExpandingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  groupedRowModel: createGroupedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  expandedRowModel: createExpandedRowModel(),
  sortFns,
  filterFns,
  columnMeta: {} as DataTableColumnMeta,
})

export type DataTableFeatures = typeof dataTableFeatures
export type { RowData }

/**
 * A kit DataTable column. Same shape as before the v9 upgrade (`ColumnDef<Row, Value>`), so screens don't name
 * the feature set.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack's own idiom: each column has its own value type
export type ColumnDef<TData extends RowData, TValue = any> = TanColumnDef<DataTableFeatures, TData, TValue>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Column<TData extends RowData, TValue = any> = TanColumn<DataTableFeatures, TData, TValue>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Header<TData extends RowData, TValue = any> = TanHeader<DataTableFeatures, TData, TValue>
export type Row<TData extends RowData> = TanRow<DataTableFeatures, TData>
