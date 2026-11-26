import type { Meta, StoryObj } from '@storybook/react-vite'
// StoryObj used without required args — render owns the tree.
import { expect, fn, userEvent } from 'storybook/test'
import { DataTable, type ColumnDef } from './data-table'
import { DataTableExport, registerDataTableExportButton } from './data-table-export'

type Row = { id: string; name: string; amount: number }

const ROWS: Row[] = [
  { id: '1', name: 'Travel', amount: 1200 },
  { id: '2', name: 'Meals', amount: 450 },
]

const COLUMNS: ColumnDef<Row, any>[] = [
  { accessorKey: 'name', meta: { label: 'Category' }, header: 'Category' },
  {
    accessorKey: 'amount',
    meta: { label: 'Amount', exportType: 'currency', exportTotal: true },
    header: 'Amount',
    cell: ({ getValue }) => String(getValue()),
  },
]

const onExport = fn()

registerDataTableExportButton((props) => (
  <button
    type="button"
    disabled={props.disabled}
    onClick={() => onExport({ rows: props.data.length, cols: props.columns.length, filename: props.filename })}
  >
    {props.label ?? 'Export'}
  </button>
))

const meta = {
  title: 'Patterns/Data Table Export',
  component: DataTableExport,
} satisfies Meta<typeof DataTableExport>

export default meta

/** Toolbar export uses visible columns + filtered rows (stub ExportButton in Storybook). */
export const InToolbar: StoryObj<typeof DataTableExport> = {
  render: () => (
    <DataTable
      caption="Claims"
      data={ROWS}
      getRowId={(r) => r.id}
      columns={COLUMNS}
      toolbar={(ctx) => <DataTableExport columns={COLUMNS} ctx={ctx} filename="Claims" />}
    />
  ),
  play: async ({ canvasElement }) => {
    const btn = canvasElement.querySelector('button')
    expect(btn).toBeTruthy()
    await userEvent.click(btn!)
    expect(onExport).toHaveBeenCalled()
  },
}
