import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ds/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ds/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/ds/ui/toggle-group'
import { FilterSheetButton } from './filter-sheet'
import { FilterToolbar } from './filter-toolbar'

const BRANCHES = [
  { value: 'all', label: 'All branches' },
  { value: 'mum', label: 'Mumbai — Andheri' },
  { value: 'pune', label: 'Pune' },
  { value: 'dxb', label: 'Dubai' },
]

function Toolbar() {
  const [branch, setBranch] = React.useState('all')
  const [status, setStatus] = React.useState('active')
  const active = (branch !== 'all' ? 1 : 0) + (status !== 'active' ? 1 : 0)
  return (
    <FilterToolbar
      activeCount={active}
      onClear={() => {
        setBranch('all')
        setStatus('active')
      }}
      actions={<FilterSheetButton count={0} onClick={() => undefined} />}
    >
      <InputGroup className="w-60">
        <InputGroupAddon>
          <Search aria-hidden />
        </InputGroupAddon>
        <InputGroupInput aria-label="Search employees" placeholder="Search employees" />
      </InputGroup>
      <Select items={BRANCHES} value={branch} onValueChange={(v) => setBranch(String(v))}>
        <SelectTrigger aria-label="Branch" className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BRANCHES.map((b) => (
            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <ToggleGroup
        aria-label="Status"
        variant="outline"
        size="sm"
        spacing={0}
        value={[status]}
        onValueChange={(v: string[]) => v[0] && setStatus(v[0])}
      >
        <ToggleGroupItem value="active">Active <span className="tabular text-muted-foreground">37</span></ToggleGroupItem>
        <ToggleGroupItem value="inactive">Inactive <span className="tabular text-muted-foreground">5</span></ToggleGroupItem>
        <ToggleGroupItem value="all">All <span className="tabular text-muted-foreground">42</span></ToggleGroupItem>
      </ToggleGroup>
    </FilterToolbar>
  )
}

/**
 * Quick filters above a list, with clear-all. Replaces the live `OrgFilterToolbar`; the status pill
 * (`StatusCyclePill`) becomes a ToggleGroup with counts — every option visible, no cycling to find one.
 */
const meta = {
  title: 'Patterns/Filter Toolbar',
  component: FilterToolbar,
  args: { children: null },
  render: () => <Toolbar />,
  decorators: [(Story) => <div className="w-[min(1100px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof FilterToolbar>

export default meta
type Story = StoryObj<typeof meta>

/** Changing a filter shows "Clear filters (1)"; clearing resets it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('toolbar', { name: 'Filters' })).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Clear filters/ })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: /Inactive/ }))
    const clear = await canvas.findByRole('button', { name: 'Clear Filters (1)' })
    await userEvent.click(clear)
    await waitFor(() => expect(canvas.getByRole('button', { name: /Active 37/ })).toHaveAttribute('aria-pressed', 'true'))
  },
}
