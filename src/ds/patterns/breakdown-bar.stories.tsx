import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { BreakdownBar } from './breakdown-bar'

/** How a whole splits into parts — a stacked bar with a legend that carries the facts. */
const meta = {
  title: 'Patterns/BreakdownBar',
  component: BreakdownBar,
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
  args: {
    segments: [
      { label: 'Casual Leave', value: 2, tone: 'blue', display: '2 days' },
      { label: 'Annual Leave', value: 1, tone: 'green', display: '1 day' },
      { label: 'Unpaid (LOP)', value: 2, tone: 'danger', display: '2 days', emphasis: true },
    ],
  },
} satisfies Meta<typeof BreakdownBar>

export default meta
type Story = StoryObj<typeof meta>

/** Leave allocation: paid types first, the unpaid part called out. Widths follow the values. */
export const Allocation: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('Unpaid (LOP)')).toBeInTheDocument()
    const bars = canvasElement.querySelectorAll<HTMLElement>('[aria-hidden] > span')
    await expect([...bars].map((b) => b.style.width)).toEqual(['40%', '20%', '40%'])
  },
}

/** Inline legend for tight spaces (a mobile sheet, a table row's detail). */
export const Inline: Story = { args: { legend: 'inline' } }

/** Part of a larger whole: the rest of the track stays empty (e.g. 9 of 12 days used). */
export const PartOfTotal: Story = {
  args: {
    total: 12,
    segments: [
      { label: 'Taken', value: 7, tone: 'brand', display: '7 days' },
      { label: 'Pending Approval', value: 2, tone: 'warning', display: '2 days' },
    ],
  },
}

/** An admin-configured colour (hex) works like any tone. */
export const ConfiguredColours: Story = {
  args: {
    segments: [
      { label: 'Basic', value: 50000, tone: '#0f766e', display: '₹ 50,000' },
      { label: 'HRA', value: 20000, tone: '#7c3aed', display: '₹ 20,000' },
      { label: 'Special Allowance', value: 15000, tone: '#ea580c', display: '₹ 15,000' },
    ],
  },
}
