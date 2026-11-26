'use client'

import type { ComponentType, ReactNode } from 'react'
import type { ColumnDef, DataTableColumnMeta, DataTableToolbarContext, RowData } from '@/ds/patterns/data-table'

/** Kit-internal columns (selection, expand) and row actions never belong in a file. */
const NOT_DATA = new Set(['__select', '__expand', 'actions'])

/** Minimal ExportButton contract — app injects the real engine (CSV/Excel + toast + currency). */
export type DataTableExportButtonProps<T> = {
  data: T[]
  /** Server-paged tables: load every matching row for the file (MaterialTable `fetchAllRows`). */
  getData?: () => Promise<T[]>
  columns: Array<{
    key: string
    header: string
    type?: 'text' | 'number' | 'currency' | 'status'
    showTotal?: boolean
    format?: (value: unknown, row: T) => string
  }>
  filename: string
  title?: string
  subtitle?: string
  scope?: string
  sheetName?: string
  showTotals?: boolean
  totalLabel?: string
  disabled?: boolean
  size?: 'small' | 'medium'
  label?: string
}

export type DataTableExportButtonComponent = <T,>(props: DataTableExportButtonProps<T>) => ReactNode

let registeredExportButton: DataTableExportButtonComponent | null = null

/**
 * Wire the app's ExportButton once (e.g. from app bootstrap). Kit DataTableExport stays free of @app imports.
 * Stories may skip this and pass `ExportButton` per call, or register a stub.
 */
export function registerDataTableExportButton(component: DataTableExportButtonComponent) {
  registeredExportButton = component
}

/**
 * Export for the design system's DataTable — MaterialTable's automatic "Export", on the app ExportButton engine
 * (CSV/Excel, currency, totals). Put it in the table's `toolbar` function:
 *
 *   toolbar={(ctx) => <DataTableExport columns={columns} ctx={ctx} filename="Submissions" />}
 *
 * It exports what the table shows: the ticked rows if any, otherwise every row after search (all pages), and
 * only the columns the user has not hidden. Call {@link registerDataTableExportButton} from the app, or pass
 * `ExportButton` explicitly.
 */
export function DataTableExport<T extends RowData>({
  columns,
  ctx,
  filename,
  title,
  subtitle,
  disabled,
  size,
  label,
  sheetName,
  getData,
  ExportButton: ExportButtonProp,
}: {
  columns: ColumnDef<T, any>[]
  ctx: DataTableToolbarContext<T>
  filename: string
  title?: string
  /** A line under the title in the file, e.g. what the rows are. */
  subtitle?: string
  disabled?: boolean
  /** `small` in the compact selection bar; default in the toolbar. */
  size?: 'small' | 'medium'
  /** The button's text when a toolbar offers two exports; default "Export". */
  label?: string
  /** The workbook sheet's name; defaults to the file name. */
  sheetName?: string
  /**
   * Server-paged lists: fetch every matching row for the export (MaterialTable `fetchAllRows`).
   * Ignored when rows are selected — selection always wins.
   */
  getData?: () => Promise<T[]>
  /** Override the registered export engine (tests / Storybook). */
  ExportButton?: DataTableExportButtonComponent | ComponentType<DataTableExportButtonProps<T>>
}) {
  const ExportButton = (ExportButtonProp ?? registeredExportButton) as DataTableExportButtonComponent | null
  if (!ExportButton) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'DataTableExport: call registerDataTableExportButton(ExportButton) from the app, or pass ExportButton.',
      )
    }
    return null
  }

  const visible = new Set(ctx.visibleColumnIds)
  const exportColumns = columns.flatMap((col) => {
    const meta = (col.meta ?? {}) as DataTableColumnMeta<T>
    const key = ('accessorKey' in col && col.accessorKey ? String(col.accessorKey) : col.id) ?? ''
    const columnId = col.id ?? key.replace(/\./g, '_')
    if (!key || !meta.label || meta.export === false || NOT_DATA.has(key)) return []
    if (!visible.has(columnId) && !meta.exportOnly) return []
    const accessorFn = 'accessorFn' in col ? col.accessorFn : undefined
    const value = meta.exportValue ?? (accessorFn ? (row: T) => accessorFn(row, 0) : undefined)
    return [{
      key,
      header: meta.label,
      type: meta.exportType ?? ('text' as const),
      ...(meta.exportTotal ? { showTotal: true } : {}),
      ...(value ? { format: (_v: unknown, row: T) => String(value(row) ?? '') } : {}),
    }]
  })
  const showTotals = exportColumns.some((c) => c.showTotal)
  const rows = ctx.selected.length > 0 ? ctx.selected : ctx.rows
  const useGetData = ctx.selected.length === 0 && !!getData
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`
  const scope = ctx.selected.length > 0
    ? `${n(ctx.selected.length, 'selected row')} · ${n(exportColumns.length, 'column')}`
    : useGetData
      ? `All matching rows · ${n(exportColumns.length, 'column')}`
      : `${n(ctx.rows.length, 'row')} · ${n(exportColumns.length, 'column')}`
  const safe = filename.replace(/[\\/:*?[\]]+/g, ' ').trim()
  return (
    <ExportButton
      data={rows}
      {...(useGetData ? { getData } : {})}
      columns={exportColumns}
      filename={safe}
      title={title ?? filename}
      subtitle={subtitle}
      scope={scope}
      sheetName={(sheetName ?? safe).slice(0, 31)}
      showTotals={showTotals}
      totalLabel="TOTAL"
      disabled={disabled || (!useGetData && rows.length === 0)}
      size={size}
      {...(label ? { label } : {})}
    />
  )
}

export default DataTableExport
