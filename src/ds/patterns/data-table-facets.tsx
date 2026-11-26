import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/ds/lib/utils"
import { Button } from "@/ds/ui/button"
import type { Column, DataTableColumnMeta, RowData } from "./data-table-features"

export type FacetOption = { value: string; label?: string }

export type FacetMeta = boolean | {
  /** Explicit choices (server-paged tables should pass these). When omitted, unique values come from `data`. */
  options?: FacetOption[]
  /** Cap how many chips show before truncation. Default 8. */
  limit?: number
}

type FacetDef = {
  columnId: string
  label: string
  options: FacetOption[]
}

/** Minimal table surface the facet strip / active-filter bar need (TanStack v9: `state`, not `getState`). */
export type FacetTable<T extends RowData> = {
  getAllLeafColumns: () => Column<T, unknown>[]
  getColumn: (id: string) => Column<T, unknown> | undefined
  setPageIndex: (index: number) => void
  setGlobalFilter: (value: string) => void
  resetColumnFilters: () => void
  setSorting: (updater: [] | ((old: { id: string; desc: boolean }[]) => { id: string; desc: boolean }[])) => void
  state: {
    sorting: { id: string; desc: boolean }[]
    globalFilter: unknown
    columnFilters: { id: string; value: unknown }[]
  }
}

const columnLabel = (c: { id: string; columnDef: { meta?: unknown } }) => {
  const meta = c.columnDef.meta as DataTableColumnMeta | undefined
  return meta?.label ?? c.id
}

function readFacet(meta: DataTableColumnMeta | undefined): FacetMeta | undefined {
  return meta?.facet
}

/** Columns that opt into facet chips via `meta.facet`. */
export function facetColumns<T extends RowData>(
  table: FacetTable<T>,
  data: T[],
): FacetDef[] {
  const out: FacetDef[] = []
  for (const col of table.getAllLeafColumns()) {
    const meta = col.columnDef.meta as DataTableColumnMeta | undefined
    const facet = readFacet(meta)
    if (!facet || !col.getCanFilter()) continue
    const cfg = typeof facet === "object" ? facet : {}
    const limit = cfg.limit ?? 8
    let options = cfg.options
    if (!options?.length) {
      const seen = new Map<string, string>()
      for (const row of data) {
        const raw = meta?.exportValue
          ? meta.exportValue(row)
          : col.accessorFn
            ? col.accessorFn(row, 0)
            : (row as Record<string, unknown>)[col.id]
        const value = String(raw ?? "").trim()
        if (!value || seen.has(value)) continue
        seen.set(value, value)
      }
      options = [...seen.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((value) => ({ value, label: value }))
    }
    if (!options.length) continue
    out.push({
      columnId: col.id,
      label: columnLabel(col),
      options: options.slice(0, limit),
    })
  }
  return out
}

/** Multi-select facet strip — Hick-friendly enums (status, branch, type), not free text. */
export function DataTableFacets<T extends RowData>({
  facets,
  table,
}: {
  facets: FacetDef[]
  table: FacetTable<T>
}) {
  if (!facets.length) return null
  return (
    <div data-slot="data-table-facets" className="flex w-full min-w-0 flex-col gap-2">
      {facets.map((facet) => {
        const selected = normalizeFilter(table.getColumn(facet.columnId)?.getFilterValue())
        return (
          <div key={facet.columnId} className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="heading-case shrink-0 text-xs font-medium text-muted-foreground">
              {facet.label}
            </span>
            {facet.options.map((opt) => {
              const on = selected.includes(opt.value)
              return (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={on ? "secondary" : "outline"}
                  aria-pressed={on}
                  className={cn("h-7 rounded-full px-2.5 text-xs", on && "border-transparent")}
                  onClick={() => {
                    const col = table.getColumn(facet.columnId)
                    if (!col) return
                    const next = on
                      ? selected.filter((v) => v !== opt.value)
                      : [...selected, opt.value]
                    col.setFilterValue(next.length ? next : undefined)
                    table.setPageIndex(0)
                  }}
                >
                  {opt.label ?? opt.value}
                </Button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function normalizeFilter(value: unknown): string[] {
  if (value == null || value === "") return []
  if (Array.isArray(value)) return value.map(String)
  return [String(value)]
}

type ActiveChip = {
  key: string
  label: string
  onClear: () => void
}

/** Visible filter/sort state (Gestalt + Jakob) — chips + one Clear all. */
export function DataTableActiveFilters<T extends RowData>({
  table,
  searchLabel = "Search",
  totalUnfiltered,
  filteredCount,
}: {
  table: FacetTable<T>
  searchLabel?: string
  /** Rows before search/filters (client). Omit on server-paged tables. */
  totalUnfiltered?: number
  filteredCount: number
}) {
  const sorting = table.state.sorting
  const globalFilter = String(table.state.globalFilter ?? "").trim()
  const chips: ActiveChip[] = []

  if (globalFilter) {
    chips.push({
      key: "search",
      label: `${searchLabel}: “${globalFilter}”`,
      onClear: () => {
        table.setGlobalFilter("")
        table.setPageIndex(0)
      },
    })
  }

  for (const f of table.state.columnFilters ?? []) {
    const col = table.getColumn(f.id)
    if (!col) continue
    const values = normalizeFilter(f.value)
    if (!values.length) continue
    const name = columnLabel(col)
    chips.push({
      key: `col:${f.id}`,
      label: values.length === 1 ? `${name}: ${values[0]}` : `${name}: ${values.length} selected`,
      onClear: () => {
        col.setFilterValue(undefined)
        table.setPageIndex(0)
      },
    })
  }

  if (sorting.length) {
    const s = sorting[0]!
    const col = table.getColumn(s.id)
    const name = col ? columnLabel(col) : s.id
    chips.push({
      key: "sort",
      label: `Sorted by ${name} ${s.desc ? "↓" : "↑"}`,
      onClear: () => table.setSorting([]),
    })
  }

  if (!chips.length) return null

  const narrowed =
    typeof totalUnfiltered === "number" && totalUnfiltered > filteredCount
      ? `${new Intl.NumberFormat().format(filteredCount)} of ${new Intl.NumberFormat().format(totalUnfiltered)}`
      : null

  return (
    <div
      data-slot="data-table-active-filters"
      role="region"
      aria-label="Active filters"
      className="flex flex-wrap items-center gap-1.5"
    >
      {narrowed && (
        <span className="mr-1 text-xs text-muted-foreground tabular">{narrowed} shown</span>
      )}
      {chips.map((chip) => (
        <Button
          key={chip.key}
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs"
          onClick={chip.onClear}
          aria-label={`Clear ${chip.label}`}
        >
          <span className="max-w-[14rem] truncate">{chip.label}</span>
          <X className="size-3.5 opacity-70" aria-hidden />
        </Button>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={() => {
          table.setGlobalFilter("")
          table.resetColumnFilters()
          table.setSorting([])
          table.setPageIndex(0)
        }}
      >
        Clear all
      </Button>
    </div>
  )
}

/**
 * Facet filter: selected values match exactly (multi-select). A plain string (column filter row) still
 * does case-insensitive contains so the two UIs do not fight.
 */
export function facetFilterFn<T extends RowData>(
  row: { original: T; getValue: (columnId: string) => unknown },
  columnId: string,
  filterValue: unknown,
  exportValue?: (row: T) => unknown,
): boolean {
  const shown = String(exportValue ? exportValue(row.original) : row.getValue(columnId) ?? "").trim()
  if (Array.isArray(filterValue)) {
    if (!filterValue.length) return true
    return filterValue.map(String).includes(shown)
  }
  const needle = String(filterValue ?? "").trim().toLowerCase()
  if (!needle) return true
  return shown.toLowerCase().includes(needle)
}
