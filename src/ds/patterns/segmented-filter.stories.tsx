import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { SegmentedFilter, type SegmentOption } from './segmented-filter'

/**
 * A status filter with counts — the kit's counted ToggleGroup (the Filter Toolbar recipe): connected outline
 * segments, the selected one in the brand fill, a dot for each state's colour. Shares read in the tooltip.
 */
const meta = {
  title: 'Patterns/Segmented Filter',
  component: SegmentedFilter,
  args: { value: 'all', onValueChange: fn(), options: [] },
} satisfies Meta<typeof SegmentedFilter>

export default meta
type Story = StoryObj<typeof meta>

const APPROVAL: SegmentOption[] = [
  { value: 'all', label: 'All', count: 7, tone: 'neutral', share: 1 },
  { value: 'pending', label: 'Pending', count: 2, tone: 'warning', share: 2 / 7 },
  { value: 'needs-info', label: 'Needs Info', count: 0, tone: 'warning', share: 0 },
  { value: 'approved', label: 'Approved', count: 4, tone: 'success', share: 4 / 7 },
  { value: 'rejected', label: 'Rejected', count: 1, tone: 'danger', share: 1 / 7 },
]

/** The selected segment carries the rule; a zero count stays visible but quiet. */
export const Basic: Story = {
  args: { options: APPROVAL, value: 'approved', 'aria-label': 'Filter by approval status' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /^Approved 4 records$/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: /^Needs Info 0 records$/ })).toBeInTheDocument()
  },
}

/** `size="lg"` (40px) in a filter row beside a search field and Selects; shares and amounts in the tooltip. */
export const InFilterRow: Story = {
  args: {
    options: [
      { value: 'all', label: 'All', count: 14, tone: 'neutral', share: 1, detail: '₹23,905.50' },
      { value: 'UNPAID', label: 'Ready to Pay', count: 10, tone: 'danger', share: 10 / 14, detail: '₹18,200.00' },
      { value: 'PARTIAL', label: 'Partially Paid', count: 3, tone: 'warning', share: 3 / 14, detail: '₹4,705.50' },
      { value: 'PAID', label: 'Paid', count: 1, tone: 'success', share: 1 / 14, detail: '₹1,000.00' },
    ],
    value: 'all',
    size: 'lg',
    'aria-label': 'Filter the payment queue by status',
  },
}

/** Clicking a segment reports its value; the parent owns the selection. */
export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = useState('all')
    return <SegmentedFilter {...args} options={APPROVAL} value={value} onValueChange={(v) => { setValue(v); args.onValueChange(v) }} />
  },
  args: { 'aria-label': 'Filter by approval status' },
  play: async ({ canvas, args }) => {
    const rejected = canvas.getByRole('button', { name: /^Rejected 1 record$/ })
    await userEvent.click(rejected)
    await expect(args.onValueChange).toHaveBeenCalledWith('rejected')
    await expect(rejected).toHaveAttribute('aria-pressed', 'true')
    // The tint fades in (transition-colors). Let it finish — the accessibility check that follows the play
    // function otherwise samples a half-blended background and reports a contrast failure that never rests.
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    await animationsSettled()
  },
}

/** Narrower than its natural width, the rail scrolls instead of wrapping into two rows. */
export const Narrow: Story = {
  args: { options: APPROVAL, value: 'all', 'aria-label': 'Filter by approval status' },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
}
