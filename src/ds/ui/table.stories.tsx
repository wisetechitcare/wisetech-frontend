import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Badge } from './badge'
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from './table'

const ROWS = [
  { name: 'Aarav Sharma', dept: 'Engineering', status: ['success', 'Present'], leave: 12.5 },
  { name: 'Diya Nair', dept: 'People', status: ['info', 'On leave'], leave: 6 },
  { name: 'Rohan Mehta', dept: 'Finance', status: ['warning', 'Late'], leave: 9.5 },
] as const

/** Data table. Numbers are right-aligned with tabular figures; status uses badges. */
const meta = {
  title: 'Components/Table',
  component: Table,
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

/** A small employee table with a caption for screen readers. */
export const Employees: Story = {
  render: () => (
    <Table>
      <TableCaption className="sr-only">Employees and today's attendance</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Today</TableHead>
          <TableHead className="text-right">Leave left</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ROWS.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-muted-foreground">{r.dept}</TableCell>
            <TableCell>
              <Badge variant={r.status[0]} dot>
                {r.status[1]}
              </Badge>
            </TableCell>
            <TableCell className="tabular text-right">{r.leave.toFixed(1)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('row')).toHaveLength(ROWS.length + 1)
    await expect(canvas.getByRole('columnheader', { name: 'Leave left' })).toBeInTheDocument()
  },
}
