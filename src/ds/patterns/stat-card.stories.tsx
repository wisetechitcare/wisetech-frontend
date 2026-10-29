import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Users } from 'lucide-react'
import { StatCard } from './stat-card'

/** KPI tile. Trend direction is shown with an arrow and text, not colour alone. */
const meta = {
  title: 'Patterns/Stat Card',
  component: StatCard,
  args: { label: 'Headcount', value: '248', icon: <Users aria-hidden /> },
  decorators: [(Story) => <div className="w-72"><Story /></div>],
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

/** Number only. */
export const Basic: Story = {}

/** A good trend. */
export const PositiveTrend: Story = {
  args: { trend: { direction: 'up', value: '4.2%', good: true }, hint: 'vs September' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('4.2%')).toBeInTheDocument()
  },
}

/** A trend that needs attention (an increase can be bad, e.g. overdue approvals). */
export const NegativeTrend: Story = {
  args: { label: 'Pending approvals', value: '17', trend: { direction: 'up', value: '5 overdue', good: false } },
}
