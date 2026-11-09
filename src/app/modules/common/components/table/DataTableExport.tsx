import type { ColumnDef, DataTableToolbarContext } from '@/ds/patterns/data-table';
import ExportButton, { type ExportColumn } from '@app/modules/common/components/ExportButton';

type ExportMeta<T> = {
  /** The column's name in the file (and in the Columns menu). Columns without one are not exported. */
  label?: string;
  /** What the file holds when the cell decorates its value (a badge, a chip): the plain text. */
  exportValue?: (row: T) => unknown;
  /** `false` keeps a column out of the file (a thumbnail, a link). */
  export?: boolean;
};

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
 * `meta.exportValue(row)`, else the column's accessor.
 */
export function DataTableExport<T>({
  columns,
  ctx,
  filename,
  title,
  disabled,
}: {
  columns: ColumnDef<T, any>[];
  ctx: DataTableToolbarContext<T>;
  filename: string;
  title?: string;
  disabled?: boolean;
}) {
  const visible = new Set(ctx.visibleColumnIds);
  const exportColumns: ExportColumn<T>[] = columns.flatMap((col) => {
    const meta = (col.meta ?? {}) as ExportMeta<T>;
    const key = ('accessorKey' in col && col.accessorKey ? String(col.accessorKey) : col.id) ?? '';
    // TanStack ids a nested accessor 'a.b' as 'a_b'; match its id, not the raw key.
    const columnId = col.id ?? key.replace(/\./g, '_');
    if (!key || !meta.label || meta.export === false || NOT_DATA.has(key) || !visible.has(columnId)) return [];
    const accessorFn = 'accessorFn' in col ? col.accessorFn : undefined;
    const value = meta.exportValue ?? (accessorFn ? (row: T) => accessorFn(row, 0) : undefined);
    return [{
      key,
      header: meta.label,
      type: 'text' as const,
      ...(value ? { format: (_v: unknown, row: T) => String(value(row) ?? '') } : {}),
    }];
  });
  const rows = ctx.selected.length > 0 ? ctx.selected : ctx.rows;
  // File and sheet names cannot hold \ / : * ? [ ]
  const safe = filename.replace(/[\\/:*?[\]]+/g, ' ').trim();
  return (
    <ExportButton
      data={rows}
      columns={exportColumns}
      filename={safe}
      title={title ?? filename}
      sheetName={safe.slice(0, 31)}
      disabled={disabled || rows.length === 0}
    />
  );
}

export default DataTableExport;
