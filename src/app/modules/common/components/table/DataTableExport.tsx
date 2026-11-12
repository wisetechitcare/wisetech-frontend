import type { ColumnDef, DataTableColumnMeta, DataTableToolbarContext, RowData } from '@/ds/patterns/data-table';
import ExportButton, { type ExportColumn } from '@app/modules/common/components/ExportButton';


/** Kit-internal columns (selection, expand) and row actions never belong in a file. */
const NOT_DATA = new Set(['__select', '__expand', 'actions']);

/**
 * Export for the design system's DataTable — the live MaterialTable's automatic "Export", on the same
 * ExportButton engine (CSV/Excel, currency, totals). Put it in the table's `toolbar` function:
 *
 *   toolbar={(ctx) => <DataTableExport columns={columns} ctx={ctx} filename="Submissions" />}
 *
 * It exports what the table shows: the ticked rows if any, otherwise every row after search (all pages), and
 * only the columns the user has not hidden. A column is exported when it has `meta.label`; its value is
 * `meta.exportValue(row)`, else the column's accessor. `meta.exportType` writes money / counts as typed cells and
 * `meta.exportTotal` sums the column into a TOTAL row (added when any column asks for one).
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
}: {
  columns: ColumnDef<T, any>[];
  ctx: DataTableToolbarContext<T>;
  filename: string;
  title?: string;
  /** A line under the title in the file, e.g. what the rows are. */
  subtitle?: string;
  disabled?: boolean;
  /** `small` in the compact selection bar, beside its other small actions; default (40px) in the toolbar. */
  size?: 'small' | 'medium';
  /** The button's text when a toolbar offers two exports ("Employees" / "Expenses"); default "Export". */
  label?: string;
}) {
  const visible = new Set(ctx.visibleColumnIds);
  const exportColumns: ExportColumn<T>[] = columns.flatMap((col) => {
    // The kit's one column-meta shape (label, exportValue, export) — no second copy here.
    const meta = (col.meta ?? {}) as DataTableColumnMeta<T>;
    const key = ('accessorKey' in col && col.accessorKey ? String(col.accessorKey) : col.id) ?? '';
    // TanStack ids a nested accessor 'a.b' as 'a_b'; match its id, not the raw key.
    const columnId = col.id ?? key.replace(/\./g, '_');
    if (!key || !meta.label || meta.export === false || NOT_DATA.has(key)) return [];
    // Hidden by the viewer → left out; export-only columns are hidden on screen by design → always in.
    if (!visible.has(columnId) && !meta.exportOnly) return [];
    const accessorFn = 'accessorFn' in col ? col.accessorFn : undefined;
    const value = meta.exportValue ?? (accessorFn ? (row: T) => accessorFn(row, 0) : undefined);
    return [{
      key,
      header: meta.label,
      type: meta.exportType ?? ('text' as const),
      ...(meta.exportTotal ? { showTotal: true } : {}),
      ...(value ? { format: (_v: unknown, row: T) => String(value(row) ?? '') } : {}),
    }];
  });
  const showTotals = exportColumns.some((c) => c.showTotal);
  const rows = ctx.selected.length > 0 ? ctx.selected : ctx.rows;
  const n = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
  // The menu says what the file holds: the ticked rows, or every row the search / filters leave.
  const scope = ctx.selected.length > 0
    ? `${n(ctx.selected.length, 'selected row')} · ${n(exportColumns.length, 'column')}`
    : `${n(ctx.rows.length, 'row')} · ${n(exportColumns.length, 'column')}`;
  // File and sheet names cannot hold \ / : * ? [ ]
  const safe = filename.replace(/[\\/:*?[\]]+/g, ' ').trim();
  return (
    <ExportButton
      data={rows}
      columns={exportColumns}
      filename={safe}
      title={title ?? filename}
      subtitle={subtitle}
      scope={scope}
      sheetName={safe.slice(0, 31)}
      showTotals={showTotals}
      totalLabel="TOTAL"
      disabled={disabled || rows.length === 0}
      size={size}
      {...(label ? { label } : {})}
    />
  );
}

export default DataTableExport;
