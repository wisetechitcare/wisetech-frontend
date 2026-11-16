import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Building2, ChevronsDownUp, ChevronsUpDown, GitBranch, Network, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { Badge } from '@/ds/ui/badge'
import { SmartAvatar } from '@/ds/ui/smart-avatar'
import { IconBox } from './icon-box'
import { RowAction } from './row-action'
import { EmptyState } from './empty-state'
import { TreeTable, type TreeTableColumn, type TreeTableNode } from './tree-table'

const onOpen = fn()
const onViewPeople = fn()
const onDelete = fn()

const COLUMNS: TreeTableColumn[] = [
  { id: 'subOrgs', header: 'Sub-orgs', tone: 'purple', hideOnPhone: true },
  { id: 'branches', header: 'Branches', tone: 'cyan' },
  { id: 'people', header: 'Employees', tone: 'amber', hideOnPhone: true },
]

const branch = (id: string, title: string, people: number, inactive = false): TreeTableNode => ({
  id,
  title,
  kind: { label: 'Branch', tone: 'cyan' },
  status: inactive ? <Badge variant="neutral">Inactive</Badge> : undefined,
  tone: 'cyan',
  media: <IconBox tone="cyan" size="sm" icon={<GitBranch aria-hidden />} />,
  counts: { people: { value: people, onClick: () => onViewPeople(title), label: `View employees in ${title}` } },
  onOpen: () => onOpen(title),
  openLabel: `Open branch ${title}`,
})

const org = (id: string, title: string, depth: number, children: TreeTableNode[], counts: TreeTableNode['counts'], subtitle?: string): TreeTableNode => ({
  id,
  title,
  subtitle,
  kind: depth === 0 ? { label: 'Group', tone: 'blue' } : { label: 'Sub-org', tone: 'purple' },
  tone: depth === 0 ? 'blue' : 'purple',
  media: <SmartAvatar name={title} seed={id} shape="rounded" size={depth === 0 ? 'default' : 'sm'} decorative />,
  counts,
  children,
  onOpen: () => onOpen(title),
  actions: (
    <>
      <RowAction label="Edit organization" onClick={() => onOpen(title)}><Pencil aria-hidden /></RowAction>
      <RowAction label="Delete organization" tint="danger" onClick={() => onDelete(title)}><Trash2 aria-hidden /></RowAction>
    </>
  ),
})

const NODES: TreeTableNode[] = [
  org('g1', 'Northwind Group', 0, [
    org('s1', 'Northwind Interiors', 1, [branch('b1', 'Pune', 42), branch('b2', 'Nashik', 0, true)], { subOrgs: 0, branches: 2, people: 42 }, 'Fit-out and interiors'),
    org('s2', 'Northwind MEP', 1, [branch('b3', 'Bengaluru', 18)], { subOrgs: 0, branches: 1, people: 18 }),
    branch('b4', 'Head office — Mumbai', 9),
  ], { subOrgs: 2, branches: 4, people: 69 }, 'Consultancy'),
]

/**
 * A hierarchy as rows: ├ └ guide lines, figures in fixed columns that line up at every level, row
 * actions on hover (always on phones). Replaces the live `OrgTree` look. The caller owns the data,
 * including what a figure means (here: rolled-up totals on parents).
 */
const meta = {
  title: 'Patterns/Tree Table',
  component: TreeTable,
  args: { nodes: NODES, columns: COLUMNS, nameHeader: 'Organization' },
  decorators: [(Story) => <div className="w-[min(1100px,calc(100vw-2rem))]"><Story /></div>],
  beforeEach: () => {
    onOpen.mockReset()
    onViewPeople.mockReset()
    onDelete.mockReset()
  },
} satisfies Meta<typeof TreeTable>

export default meta
type Story = StoryObj<typeof meta>

/** Roots open on load; deeper levels open on demand. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await animationsSettled()
    await expect(canvas.getByRole('button', { name: 'Open Northwind Interiors' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Open branch Pune' })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Expand Northwind Interiors' }))
    await animationsSettled()
    await expect(await canvas.findByRole('button', { name: 'Open branch Pune' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Collapse Northwind Interiors' })).toHaveAttribute('aria-expanded', 'true')
  },
}

/** The title opens the row; a clickable figure does its own thing without opening the row. */
export const OpenAndFigures: Story = {
  args: { defaultExpandedDepth: 2 },
  play: async ({ canvas }) => {
    await animationsSettled()
    await userEvent.click(canvas.getByRole('button', { name: 'Open Northwind MEP' }))
    await expect(onOpen).toHaveBeenCalledWith('Northwind MEP')
    onOpen.mockReset()
    await userEvent.click(canvas.getByRole('button', { name: 'View employees in Bengaluru: 18' }))
    await expect(onViewPeople).toHaveBeenCalledWith('Bengaluru')
    await expect(onOpen).not.toHaveBeenCalled()
    await animationsSettled()
  },
}

/** Row actions: tinted icon buttons, each with a tooltip; the delete tint is the danger CTA. */
export const RowActions: Story = {
  play: async ({ canvas }) => {
    await animationsSettled()
    await userEvent.click(canvas.getAllByRole('button', { name: 'Delete organization' })[0])
    await expect(onDelete).toHaveBeenCalledWith('Northwind Group')
    await expect(onOpen).not.toHaveBeenCalled()
    await animationsSettled()
  },
}

function ExpandAllHarness() {
  const [signal, setSignal] = React.useState({ open: false, n: 0 })
  const willOpen = !signal.open
  return (
    <div className="flex flex-col gap-3">
      <Button variant="inverted" size="sm" className="self-end" onClick={() => setSignal((s) => ({ open: willOpen, n: s.n + 1 }))}>
        {willOpen ? <ChevronsUpDown aria-hidden /> : <ChevronsDownUp aria-hidden />}
        {willOpen ? 'Expand all' : 'Collapse all'}
      </Button>
      <TreeTable nodes={NODES} columns={COLUMNS} nameHeader="Organization" expandSignal={signal} />
    </div>
  )
}

/** "Expand all / Collapse all" in the host's toolbar drives every node through `expandSignal`. */
export const ExpandAll: Story = {
  render: () => <ExpandAllHarness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Expand All' }))
    await animationsSettled()
    await expect(await canvas.findByRole('button', { name: 'Open branch Bengaluru' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Collapse All' }))
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Open Northwind MEP' })).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** While a search is active the host passes `forceExpand`, so deep matches are never hidden. */
export const ForcedOpenForSearch: Story = {
  args: { forceExpand: true, defaultExpandedDepth: 0 },
  play: async ({ canvas }) => {
    await animationsSettled()
    await expect(canvas.getByRole('button', { name: 'Open branch Nashik' })).toBeVisible()
  },
}

/** No rows: the host's Empty State takes the panel. */
export const Empty: Story = {
  args: {
    nodes: [],
    empty: (
      <EmptyState
        icon={<Building2 aria-hidden />}
        title="No organizations yet"
        description="Create an organization to start building the hierarchy."
      />
    ),
  },
  play: async ({ canvas }) => {
    // Empty State title-cases its title ("No Organizations Yet").
    await expect(canvas.getByText(/no organizations yet/i)).toBeInTheDocument()
  },
}

/**
 * Phone width: the name and the phone columns share a row; actions drop to their own line and stay
 * visible (a phone has no hover). Breakpoints follow the viewport, so check this with the toolbar's
 * mobile viewport rather than a narrow box.
 */
export const Phone: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await animationsSettled()
    await expect(canvas.getAllByRole('button', { name: 'Delete organization' })[0]).toBeVisible()
  },
}

/** Without onOpen a row is plain text — nothing pretends to be clickable. */
export const ReadOnly: Story = {
  args: {
    nodes: [{ id: 'r', title: 'Head office', kind: { label: 'Group', tone: 'blue' }, tone: 'blue', media: <IconBox tone="blue" size="sm" icon={<Network aria-hidden />} />, counts: { subOrgs: 0, branches: 1, people: 12 } }],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Head office')).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Head office/ })).not.toBeInTheDocument()
  },
}
