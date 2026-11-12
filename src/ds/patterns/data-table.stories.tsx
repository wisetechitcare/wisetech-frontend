import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { Download, MoreHorizontal, UserPlus } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
import { Card, CardContent } from '@/ds/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ds/ui/dropdown-menu'
import { DataTable, SortableHeader, type ColumnDef } from './data-table'
import { EmptyState } from './empty-state'
import { PersonCell } from './person'

type Employee = {
  id: string
  name: string
  code: string
  designation: string
  department: string
  branch: string
  status: 'Active' | 'On leave' | 'Probation'
  joined: string
}

const FIRST = ['Meera', 'Arjun', 'Tara', 'Ishaan', 'Kavya', 'Rohan', 'Ananya', 'Vikram', 'Sara', 'Dev']
const LAST = ['Joshi', 'Rao', 'Menon', 'Verma', 'Iyer', 'Kapoor', 'Shah', 'Nair']
const DEPTS = ['Engineering', 'Projects', 'Finance', 'People', 'Sales']
const BRANCHES = ['Mumbai — Andheri', 'Pune', 'Bengaluru', 'Dubai']
const ROLES = ['MEP Engineer', 'Site Supervisor', 'Draughtsman', 'Accountant', 'HR Executive', 'Sales Manager']
const STATUSES: Employee['status'][] = ['Active', 'Active', 'Active', 'On leave', 'Probation']

const EMPLOYEES: Employee[] = Array.from({ length: 34 }, (_, i) => ({
  id: String(i + 1),
  name: `${FIRST[i % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
  code: `WT-${String(i + 1).padStart(4, '0')}`,
  designation: ROLES[i % ROLES.length],
  department: DEPTS[(i * 7) % DEPTS.length],
  branch: BRANCHES[(i * 5) % BRANCHES.length],
  status: STATUSES[i % STATUSES.length],
  joined: `20${String(18 + (i % 8)).padStart(2, '0')}.${String((i % 12) + 1).padStart(2, '0')}.${String((i % 27) + 1).padStart(2, '0')}`,
}))

const STATUS_VARIANT = { Active: 'success', 'On leave': 'info', Probation: 'warning' } as const

const onRowAction = fn()

const COLUMNS: ColumnDef<Employee, any>[] = [
  {
    accessorKey: 'name',
    meta: { label: 'Employee' },
    enableHiding: false,
    header: ({ column }) => <SortableHeader column={column} title="Employee" />,
    cell: ({ row }) => <PersonCell name={row.original.name} code={row.original.code} subtitle={row.original.designation} />,
  },
  { accessorKey: 'department', meta: { label: 'Department' }, header: ({ column }) => <SortableHeader column={column} title="Department" /> },
  { accessorKey: 'branch', meta: { label: 'Branch' }, header: 'Branch' },
  {
    accessorKey: 'status',
    meta: { label: 'Status' },
    header: 'Status',
    cell: ({ getValue }) => {
      const s = getValue() as Employee['status']
      return <Badge variant={STATUS_VARIANT[s]} dot>{s}</Badge>
    },
  },
  {
    accessorKey: 'joined',
    meta: { label: 'Date of joining' },
    header: ({ column }) => <SortableHeader column={column} title="Joined" />,
    cell: ({ getValue }) => <span className="tabular">{getValue() as string}</span>,
  },
  {
    id: 'actions',
    enableHiding: false,
    header: 'Actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${row.original.name}`} />}>
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onRowAction('view', row.original.id)}>View profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRowAction('edit', row.original.id)}>Edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onRowAction('deactivate', row.original.id)}>Deactivate</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

const onBulk = fn()

/**
 * The one data table (TanStack Table in kit components). Replaces the live `MaterialTable` /
 * `MaterialTableImpl` and `TableSelectionBar`. Scrolls inside its own frame on narrow screens.
 */
const meta = {
  title: 'Patterns/Data Table',
  component: DataTable<Employee>,
  args: {
    caption: 'Employees',
    columns: COLUMNS,
    data: EMPLOYEES,
    getRowId: (r: Employee) => r.id,
    searchPlaceholder: 'Search employees',
    toolbar: (
      <Button variant="outline">
        <Download data-icon="inline-start" aria-hidden /> Export
      </Button>
    ),
  },
  decorators: [(Story) => <div className="w-[min(1200px,calc(100vw-2rem))]"><Story /></div>],
  beforeEach: () => {
    onBulk.mockReset()
    onRowAction.mockReset()
  },
} satisfies Meta<typeof DataTable<Employee>>

export default meta
type Story = StoryObj<typeof meta>

// The BODY's rows — the header can hold two rows (column filters), so "all rows but the first" is wrong.
const bodyRows = (table: HTMLElement) => within(table.querySelector('tbody')!).getAllByRole('row')

/** Sorting: the header button toggles, and the column header reports `aria-sort`. */
export const Sort: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole('table', { name: 'Employees' })
    await userEvent.click(canvas.getByRole('button', { name: /^Joined/ }))
    await expect(canvas.getByRole('columnheader', { name: /Joined/ })).toHaveAttribute('aria-sort', 'ascending')
    await expect(bodyRows(table)[0]).toHaveTextContent('2018.01.01')
    await expect(canvas.getByText('1–10 of 34')).toBeInTheDocument()
    // Narrow screens scroll the table inside its frame, never the page.
    await expect(getComputedStyle(table.closest('[data-slot="card"]')!).overflowX).toBe('auto')
  },
}

/** Search narrows the rows; a search that finds nothing offers to clear it. */
export const Search: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Search employees' })
    await userEvent.type(box, 'Dubai')
    await waitFor(() => expect(canvas.getByText(/of 8$/)).toBeInTheDocument())
    await userEvent.clear(box)
    await userEvent.type(box, 'zzz')
    await expect(await canvas.findByText('Nothing Matches “Zzz”')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear Search' }))
    await waitFor(() => expect(canvas.getByText('1–10 of 34')).toBeInTheDocument())
  },
}

/** Selecting rows swaps the toolbar for the bulk-action bar (live `TableSelectionBar`). */
export const BulkSelection: Story = {
  args: {
    selectable: true,
    selectionActions: (rows, clear) => (
      <>
        <Button size="sm" onClick={() => { onBulk(rows.map((r) => r.id)); clear() }}>Send payslips</Button>
        <Button size="sm" variant="outline">Export selected</Button>
      </>
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select row 1' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select row 2' }))
    await expect(canvas.getByRole('region', { name: 'Selection in Employees' })).toHaveTextContent('2 selected')
    await userEvent.click(canvas.getByRole('button', { name: 'Send Payslips' }))
    await expect(onBulk).toHaveBeenCalledWith(['1', '2'])
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Selection in Employees' })).not.toBeInTheDocument())
  },
}

/** Columns menu hides and shows columns; Employee and actions can't be hidden. */
export const HideColumns: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show or hide columns' }))
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Branch' }))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByRole('columnheader', { name: 'Branch' })).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Paging and the row actions menu. */
export const PagingAndRowActions: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next page' }))
    await expect(canvas.getByText('11–20 of 34')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: `Actions for ${EMPLOYEES[10].name}` }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'View profile' }))
    await expect(onRowAction).toHaveBeenCalledWith('view', '11')
    await animationsSettled()
  },
}

/** Compact density for people who scan long lists. */
export const Compact: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Compact rows' })
    await userEvent.click(toggle)
    await expect(canvas.getByRole('button', { name: 'Comfortable rows' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** Loading: skeleton rows in the table's shape, the table marked busy. */
export const Loading: Story = {
  args: { loading: true, data: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table', { name: 'Employees' })).toHaveAttribute('aria-busy', 'true')
  },
}

/** No rows yet: the empty state says what to do next. */
export const Empty: Story = {
  args: {
    data: [],
    empty: (
      <EmptyState
        size="sm"
        title="No employees yet"
        description="Add your first employee or import a spreadsheet."
        action={<Button size="sm"><UserPlus data-icon="inline-start" aria-hidden /> Add employee</Button>}
      />
    ),
  },
}

/** Loading failed: an alert with Retry instead of rows. */
export const LoadFailed: Story = {
  args: { data: [], error: 'The server did not respond. Your filters are kept.', onRetry: fn() },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent("Couldn't Load This Table")
  },
}

const onOpen = fn()

/** `initialSorting` opens newest first; `onRowClick` opens a record from anywhere on the row (or Enter). */
export const ClickableRowsSorted: Story = {
  args: {
    initialSorting: [{ id: 'joined', desc: true }],
    onRowClick: (r: Employee) => onOpen(r.id),
    rowLabel: (r: Employee) => `Open ${r.name}`,
  },
  beforeEach: () => onOpen.mockReset(),
  play: async ({ canvas }) => {
    const table = canvas.getByRole('table', { name: 'Employees' })
    await expect(canvas.getByRole('columnheader', { name: /Joined/ })).toHaveAttribute('aria-sort', 'descending')
    const first = bodyRows(table)[0]
    await userEvent.click(within(first).getAllByRole('cell')[1])
    await expect(onOpen).toHaveBeenCalledTimes(1)
    // A control inside the row keeps its own click.
    await userEvent.click(within(first).getByRole('button', { name: /Actions for/ }))
    await expect(onOpen).toHaveBeenCalledTimes(1)
    await userEvent.keyboard('{Escape}')
    first.focus()
    await userEvent.keyboard('{Enter}')
    await expect(onOpen).toHaveBeenCalledTimes(2)
    await animationsSettled()
  },
}

/** `rowTone` tints a row by its state — here people on probation (warning) and on leave (info). */
export const TonedRows: Story = {
  args: {
    rowTone: (r: Employee) => (r.status === 'Probation' ? 'warning' : r.status === 'On leave' ? 'info' : undefined),
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('tbody tr[data-tone]').length).toBeGreaterThan(0)
  },
}

/** `renderDetail`: a chevron per row opens a panel under it (the live `renderDetailPanel`). */
export const ExpandableRows: Story = {
  args: {
    renderDetail: (r: Employee) => (
      <p className="text-sm">
        {r.name} joined on {r.joined} as {r.designation}, {r.branch}.
      </p>
    ),
  },
  play: async ({ canvas }) => {
    const toggle = canvas.getAllByRole('button', { name: 'Show details' })[0]
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(canvas.getByText(/joined on/)).toBeInTheDocument()
    await userEvent.click(toggle)
    await expect(canvas.queryByText(/joined on/)).toBeNull()
  },
}

type Claim = { id: string; employee: string; category: string; amount: number }
const CLAIMS: Claim[] = [
  { id: 'c1', employee: 'Meera Joshi', category: 'Cab', amount: 420 },
  { id: 'c2', employee: 'Arjun Rao', category: 'Meal', amount: 280.5 },
  { id: 'c3', employee: 'Tara Menon', category: 'Hotel', amount: 3600 },
]
const inr = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n)

/** A totals row: give a column a `footer` and the table renders a footer row (the live `showColumnFooter`). */
export const FooterTotals: StoryObj<typeof DataTable<Claim>> = {
  render: () => (
    <DataTable<Claim>
      caption="Claims"
      data={CLAIMS}
      getRowId={(r) => r.id}
      columns={[
        { accessorKey: 'employee', header: 'Employee', footer: 'Total' },
        { accessorKey: 'category', header: 'Category' },
        {
          accessorKey: 'amount',
          header: () => <span className="block text-right">Amount</span>,
          cell: ({ getValue }) => <span className="block text-right tabular">{inr(getValue() as number)}</span>,
          footer: ({ table }) => (
            <span className="block text-right tabular">
              {inr(table.getFilteredRowModel().rows.reduce((s, r) => s + r.original.amount, 0))}
            </span>
          ),
        },
      ]}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Total')).toBeInTheDocument()
    await expect(canvas.getByText(inr(4300.5))).toBeInTheDocument()
  },
}

/** `renderCard`: below 640px of table width the rows become cards; search and paging stay. */
export const PhoneCards: Story = {
  decorators: [(Story) => <div className="w-[360px]"><Story /></div>],
  args: {
    renderCard: (r: Employee) => (
      <Card size="sm" variant="panel">
        <CardContent className="text-sm">
          <div className="font-semibold">{r.name}</div>
          <div className="text-muted-foreground">{r.designation} · {r.department}</div>
        </CardContent>
      </Card>
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('list', { name: 'Employees' })).toBeVisible()
    await expect(canvasElement.querySelector('[data-slot="card"] table')?.closest('[data-slot="card"]')).not.toBeVisible()
    await expect(canvas.getByText('1–10 of 34')).toBeInTheDocument()
  },
}

/** `toolbar` as a function gets the live table — rows after search, the selection, visible columns — so an
 *  Export acts on exactly what is on screen. */
export const ToolbarWithTableState: Story = {
  args: {
    selectable: true,
    toolbar: ({ rows, selected, visibleColumnIds }) => (
      <Button variant="outline" data-columns={visibleColumnIds.length}>
        <Download data-icon="inline-start" aria-hidden /> Export {selected.length ? `${selected.length} selected` : `${rows.length} rows`}
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Export 34 Rows' })).toBeInTheDocument()
    // Search narrows what an export would take…
    await userEvent.type(canvas.getByRole('textbox', { name: 'Search employees' }), 'Pune')
    const narrowed = await canvas.findByRole('button', { name: /^Export \d+ Rows$/ })
    await expect(Number(narrowed.textContent?.match(/\d+/)?.[0])).toBeLessThan(34)
    // …and a selection wins over the search result.
    await userEvent.click(canvas.getAllByRole('checkbox', { name: /Select row/ })[0])
    await expect(await canvas.findByRole('button', { name: 'Export 1 Selected' })).toBeInTheDocument()
  },
}

/** `resizableColumns`: drag a column's edge — or focus it and use ← / → (Shift for bigger steps); Enter or a
 *  double-click resets it. The handle is a separator that announces its width. */
export const ResizableColumns: Story = {
  args: { resizableColumns: true },
  play: async ({ canvas }) => {
    const handle = canvas.getByRole('separator', { name: 'Resize Department' })
    const before = Number(handle.getAttribute('aria-valuenow'))
    handle.focus()
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before + 20)
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    await expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before - 20)
    await userEvent.keyboard('{Enter}')
    await expect(Number(handle.getAttribute('aria-valuenow'))).toBe(before)
  },
}

/** Numbered pages beside Previous / Next: first, last and the current page's neighbours (1 … 4 5 6 … 20). */
export const NumberedPages: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(canvas.getByRole('button', { name: 'Page 3' }))
    await expect(canvas.getByText('21–30 of 34')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page')
  },
}

/** `stateKey` remembers this viewer's widths, hidden columns and density: resize, remount, still resized. */
function RemountableTable(props: React.ComponentProps<typeof DataTable<Employee>>) {
  const [mounted, setMounted] = React.useState(true)
  return (
    <div className="space-y-3">
      <Button variant="outline" size="sm" onClick={() => { setMounted(false); setTimeout(() => setMounted(true), 0) }}>Remount table</Button>
      {mounted && <DataTable<Employee> {...props} stateKey="story.remembers-widths" />}
    </div>
  )
}

export const RemembersWidths: Story = {
  render: (args) => <RemountableTable {...args} />,
  beforeEach: () => { try { localStorage.removeItem('wt-table:story.remembers-widths') } catch { /* noop */ } },
  play: async ({ canvas }) => {
    const handle = await canvas.findByRole('separator', { name: 'Resize Branch' })
    const before = Number(handle.getAttribute('aria-valuenow'))
    handle.focus()
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}')
    await new Promise((r) => setTimeout(r, 400)) // the save is debounced
    await userEvent.click(canvas.getByRole('button', { name: 'Remount Table' }))
    const again = await canvas.findByRole('separator', { name: 'Resize Branch' })
    await expect(Number(again.getAttribute('aria-valuenow'))).toBe(before + 80)
  },
}

function ReorderableTable(props: React.ComponentProps<typeof DataTable<Employee>>) {
  const [rows, setRows] = React.useState(props.data)
  const byId = React.useMemo(() => new Map(props.data.map((r) => [r.id, r])), [props.data])
  return (
    <DataTable
      {...props}
      data={rows}
      rowReorder={{ onReorder: (ids) => setRows(ids.map((id) => byId.get(id)!)) }}
    />
  )
}

/**
 * Draggable rows: drag a row by its grip (mouse or touch), or focus the grip and press ↑ / ↓ — each move is
 * announced. `onReorder` gets the full id order to persist. Reordering pauses while the table is sorted or
 * searched, since the order on screen is then not the stored order. The same drag engine as the Task board.
 */
export const ReorderableRows: Story = {
  render: (args) => <ReorderableTable {...args} />,
  play: async ({ canvas }) => {
    const table = canvas.getByRole('table', { name: 'Employees' })
    const first = EMPLOYEES[0].name
    const second = EMPLOYEES[1].name
    await expect(bodyRows(table)[0]).toHaveTextContent(first)
    // Every row is wired to the drag engine, with drag starting only on its grip.
    await expect(bodyRows(table)[0]).toHaveAttribute('data-sortable-id', EMPLOYEES[0].id)

    // Keyboard: the focused grip moves its row and keeps focus as it goes.
    const grip = canvas.getByRole('button', { name: 'Move row 1 of 34' })
    grip.focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(bodyRows(table)[0]).toHaveTextContent(second))
    await expect(bodyRows(table)[1]).toHaveTextContent(first)
    await expect(canvas.getByText('Moved to position 2 of 34.')).toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toHaveAccessibleName('Move row 2 of 34'))
    await userEvent.keyboard('{ArrowUp}')
    await waitFor(() => expect(bodyRows(table)[0]).toHaveTextContent(first))

    // Pointer: press the first grip, drag it below the third row, release — the row lands third.
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
    const at = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
    const ptr = (type: string, x: number, y: number) =>
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: x, clientY: y })
    const from = at(canvas.getByRole('button', { name: 'Move row 1 of 34' }))
    const target = bodyRows(table)[2].getBoundingClientRect()
    canvas.getByRole('button', { name: 'Move row 1 of 34' }).dispatchEvent(ptr('pointerdown', from.x, from.y))
    for (let i = 1; i <= 8; i++) {
      window.dispatchEvent(ptr('pointermove', from.x, from.y + ((target.bottom - 4 - from.y) * i) / 8))
      await frame()
    }
    window.dispatchEvent(ptr('pointerup', from.x, target.bottom - 4))
    await waitFor(() => expect(bodyRows(table)[2]).toHaveTextContent(first))
    await expect(bodyRows(table)[0]).toHaveTextContent(second)
    await expect(canvas.getByText('Moved to position 3 of 34.')).toBeInTheDocument()

    // Sorted: the grips pause.
    await userEvent.click(canvas.getByRole('button', { name: /^Joined/ }))
    for (const g of canvas.getAllByRole('button', { name: /^Move row/ })) await expect(g).toBeDisabled()
  },
}

function LateDataTable(props: React.ComponentProps<typeof DataTable<Employee>>) {
  // Starts empty and NOT loading — how a screen looks before its first fetch resolves.
  const [rows, setRows] = React.useState<Employee[]>([])
  React.useEffect(() => {
    const t = window.setTimeout(() => setRows(props.data), 150)
    return () => window.clearTimeout(t)
  }, [props.data])
  return <DataTable {...props} data={rows} />
}

/**
 * Rows that arrive after the first render get the same column widths as rows that were there from the start:
 * natural widths are measured from real rows, never from the header-only empty state (which clipped a Batch ID
 * badge in the app when a screen rendered empty and not-yet-loading before its first fetch).
 */
export const DataArrivesLater: Story = {
  render: (args) => (
    <div className="grid gap-6">
      <DataTable {...args} caption="From the start" />
      <LateDataTable {...args} caption="Arrives later" />
    </div>
  ),
  play: async ({ canvas }) => {
    const late = canvas.getByRole('table', { name: 'Arrives later' })
    await waitFor(() => expect(bodyRows(late).length).toBe(10))
    await new Promise((r) => setTimeout(r, 100))
    const widths = (name: string) =>
      within(canvas.getByRole('table', { name })).getAllByRole('columnheader').map((h) => Math.round(h.getBoundingClientRect().width))
    await expect(widths('Arrives later')).toEqual(widths('From the start'))
  },
}

/**
 * Only some rows can be selected (e.g. only batches with money still owed join a payment run): the others show a
 * disabled checkbox, and "select all" skips them.
 */
export const SomeRowsSelectable: Story = {
  args: {
    selectable: true,
    canSelectRow: (r: Employee) => r.status === 'Active',
    selectionActions: (rows) => <Button size="sm">Notify {rows.length}</Button>,
  },
  play: async ({ canvas }) => {
    const table = canvas.getByRole('table', { name: 'Employees' })
    const rows = bodyRows(table)
    const activeOnPage = rows.filter((r) => within(r).queryByText('Active')).length
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select all rows on this page' }))
    await expect(canvas.getByRole('region', { name: 'Selection in Employees' })).toHaveTextContent(`${activeOnPage} selected`)
    const notSelectable = rows.find((r) => !within(r).queryByText('Active'))!
    // Base UI's checkbox is role="checkbox" with aria-disabled (the native input is hidden) — as the Checkbox story.
    await expect(within(notSelectable).getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true')
  },
}

/**
 * The table's tools (one joined group, tinted while ON): column filters — each matches the text the column SHOWS —
 * density, columns, reset layout, and full screen (Esc leaves it).
 */
export const TableTools: Story = {
  play: async ({ canvas, canvasElement }) => {
    const table = canvas.getByRole('table', { name: 'Employees' })
    await expect(canvas.getByRole('group', { name: 'Table tools' })).toBeInTheDocument()

    // Column filters: a row of inputs under the headers; typing narrows the rows.
    await userEvent.click(canvas.getByRole('button', { name: 'Show column filters' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'Filter Department' }), 'Finance')
    await waitFor(() => expect(bodyRows(table).every((r) => within(r).queryByText('Finance'))).toBe(true))

    // Reset layout clears the filter (and widths, density, sorting).
    await userEvent.click(canvas.getByRole('button', { name: 'Reset layout' }))
    await waitFor(() => expect(canvas.getByText('1–10 of 34')).toBeInTheDocument())

    // Full screen covers the viewport; Esc leaves it.
    await userEvent.click(canvas.getByRole('button', { name: 'Full screen' }))
    const root = canvasElement.querySelector('[data-slot="data-table"]') as HTMLElement
    await expect(getComputedStyle(root).position).toBe('fixed')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(getComputedStyle(root).position).not.toBe('fixed'))
  },
}
