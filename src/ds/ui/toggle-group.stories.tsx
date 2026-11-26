import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Columns3, LayoutGrid, List } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from './toggle-group'

import { animationsSettled } from '@/ds/lib/motion'
import { SegmentedFilter, type SegmentOption } from '@/ds/patterns/segmented-filter'

/**
 * Pick one view or period from a short set — Cards/List/Board, Day/Week/Month. Replaces the live kit's
 * `SegmentedControl`, `ViewModeSwitch` (and its six presets) and `PeriodTabs`.
 *
 * For a status filter with counts use the `SegmentedFilter` pattern (the Segmented Filter stories below): connected
 * outline segments, the selected one in the brand fill, a dot for each state's colour, shares in the tooltip.
 */
const meta = {
  title: 'Components/Toggle Group',
  component: ToggleGroup,
  args: { onValueChange: fn() },
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

/** View switch: icon + text, one always chosen. */
export const ViewMode: Story = {
  args: { defaultValue: ['cards'], variant: 'outline', spacing: 0 },
  render: (args) => (
    <ToggleGroup aria-label="View" {...args}>
      <ToggleGroupItem value="cards">
        <LayoutGrid aria-hidden /> Cards
      </ToggleGroupItem>
      <ToggleGroupItem value="list">
        <List aria-hidden /> List
      </ToggleGroupItem>
      <ToggleGroupItem value="board">
        <Columns3 aria-hidden /> Board
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'List' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true'))
    await expect(args.onValueChange).toHaveBeenCalledWith(['list'], expect.anything())
  },
}

/** Period switch, text only, compact. */
export const Period: Story = {
  args: { defaultValue: ['week'], variant: 'outline', size: 'sm', spacing: 0 },
  render: (args) => (
    <ToggleGroup aria-label="Period" {...args}>
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** Several can be on (filters). */
export const MultipleFilters: Story = {
  args: { multiple: true, defaultValue: ['late'], spacing: 1 },
  render: (args) => (
    <ToggleGroup aria-label="Show" {...args}>
      <ToggleGroupItem value="late">Late</ToggleGroupItem>
      <ToggleGroupItem value="absent">Absent</ToggleGroupItem>
      <ToggleGroupItem value="leave">On leave</ToggleGroupItem>
    </ToggleGroup>
  ),
}

const APPROVAL: SegmentOption[] = [
  { value: 'all', label: 'All', count: 7, tone: 'neutral', share: 1 },
  { value: 'pending', label: 'Pending', count: 2, tone: 'warning', share: 2 / 7 },
  { value: 'needs-info', label: 'Needs Info', count: 0, tone: 'warning', share: 0 },
  { value: 'approved', label: 'Approved', count: 4, tone: 'success', share: 4 / 7 },
  { value: 'rejected', label: 'Rejected', count: 1, tone: 'danger', share: 1 / 7 },
]
const APPROVAL_LABEL = 'Filter by approval status'
const onSegmentChange = fn()

/** `SegmentedFilter`: the selected segment carries the rule; a zero count stays visible but quiet. */
export const SegmentedFilterBasic: Story = {
  name: 'Segmented Filter',
  render: () => <SegmentedFilter options={APPROVAL} value="approved" onValueChange={onSegmentChange} aria-label={APPROVAL_LABEL} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /^Approved 4 records$/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: /^Needs Info 0 records$/ })).toBeInTheDocument()
  },
}

/** `SegmentedFilter size="lg"` (40px) in a filter row beside a search field and Selects; shares and amounts in the tooltip. */
export const SegmentedFilterInFilterRow: Story = {
  render: () => (
    <SegmentedFilter
      options={[
        { value: 'all', label: 'All', count: 14, tone: 'neutral', share: 1, detail: '₹23,905.50' },
        { value: 'UNPAID', label: 'Ready to Pay', count: 10, tone: 'danger', share: 10 / 14, detail: '₹18,200.00' },
        { value: 'PARTIAL', label: 'Partially Paid', count: 3, tone: 'warning', share: 3 / 14, detail: '₹4,705.50' },
        { value: 'PAID', label: 'Paid', count: 1, tone: 'success', share: 1 / 14, detail: '₹1,000.00' },
      ]}
      value="all"
      size="lg"
      onValueChange={onSegmentChange}
      aria-label="Filter the payment queue by status"
    />
  ),
}

function InteractiveSegmentedFilter() {
  const [value, setValue] = useState<string>('all')
  return (
    <SegmentedFilter
      options={APPROVAL}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onSegmentChange(next)
      }}
      aria-label={APPROVAL_LABEL}
    />
  )
}

/** `SegmentedFilter`: clicking a segment reports its value; the parent owns the selection. */
export const SegmentedFilterInteractive: Story = {
  render: () => <InteractiveSegmentedFilter />,
  beforeEach: () => {
    onSegmentChange.mockReset()
  },
  play: async ({ canvas }) => {
    const rejected = canvas.getByRole('button', { name: /^Rejected 1 record$/ })
    await userEvent.click(rejected)
    await expect(onSegmentChange).toHaveBeenCalledWith('rejected')
    await expect(rejected).toHaveAttribute('aria-pressed', 'true')
    // The tint fades in (transition-colors). Let it finish — the accessibility check that follows the play
    // function otherwise samples a half-blended background and reports a contrast failure that never rests.
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    await animationsSettled()
  },
}

/** `SegmentedFilter` narrower than its natural width: the rail scrolls instead of wrapping into two rows. */
export const SegmentedFilterNarrow: Story = {
  render: () => (
    <div className="w-64">
      <SegmentedFilter options={APPROVAL} value="all" onValueChange={onSegmentChange} aria-label={APPROVAL_LABEL} />
    </div>
  ),
}
