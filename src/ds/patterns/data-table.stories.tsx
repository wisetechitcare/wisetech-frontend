import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { Download, MoreHorizontal, UserPlus } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
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
    header: () => <span className="sr-only">Actions</span>,
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

const bodyRows = (table: HTMLElement) => within(table).getAllByRole('row').slice(1)

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
    await expect(await canvas.findByText('Nothing matches “zzz”')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }))
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
    await expect(canvas.getByRole('region', { name: 'Selection' })).toHaveTextContent('2 selected')
    await userEvent.click(canvas.getByRole('button', { name: 'Send payslips' }))
    await expect(onBulk).toHaveBeenCalledWith(['1', '2'])
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Selection' })).not.toBeInTheDocument())
  },
}

/** Columns menu hides and shows columns; Employee and actions can't be hidden. */
export const HideColumns: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Columns' }))
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
    await expect(canvas.getByRole('alert')).toHaveTextContent("Couldn't load this table")
  },
}
