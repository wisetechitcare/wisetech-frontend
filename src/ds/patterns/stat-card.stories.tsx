import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Briefcase, CalendarCheck, FolderKanban, Users } from 'lucide-react'
import { StatCard } from './stat-card'

/** KPI tile. Trend direction is shown with an arrow and text, not colour alone. `tone` sets the accent; `sparkline` adds a mini trend chart. */
const meta = {
  title: 'Patterns/Stat Card',
  component: StatCard,
  args: { label: 'Headcount', value: '248', icon: <Users aria-hidden /> },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
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
  args: { label: 'Pending approvals', value: '17', tone: 'danger', trend: { direction: 'up', value: '5 overdue', good: false } },
}

/** With a sparkline: the area chart takes the card's tone. */
export const WithSparkline: Story = {
  args: {
    label: 'Active projects',
    value: '86',
    tone: 'success',
    icon: <FolderKanban aria-hidden />,
    trend: { direction: 'up', value: '12.5%', good: true },
    sparkline: [42, 44, 41, 47, 46, 52, 50, 56, 58],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('12.5%')).toBeInTheDocument()
  },
}

/** Default (compact): a plain hint sits directly under the value, with no separate footer row. */
export const CompactHint: Story = {
  args: { label: 'Pending payment', value: '₹23,905.50', hint: '14 batches', tone: 'warning' },
  play: async ({ canvasElement, canvas }) => {
    await expect(canvas.getByText('14 batches')).toBeInTheDocument()
    await expect(canvasElement.querySelector('[data-slot="card-footer"]')).toBeNull()
  },
}

/** `size="comfortable"`: the roomy tile for a hero number — 3xl value, hint on its own footer row. */
export const Comfortable: Story = {
  args: { size: 'comfortable', label: 'Pending payment', value: '₹23,905.50', hint: '14 batches', tone: 'warning' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="card-footer"]')).not.toBeNull()
  },
}

/** Four compact cards two-up, as on a phone. */
export const CompactPhoneRow: Story = {
  decorators: [(Story) => <div className="w-[358px]"><Story /></div>],
  render: () => (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Pending payment" value="₹23,905.50" hint="14 batches" tone="warning" icon={<Briefcase aria-hidden />} />
      <StatCard label="Total paid" value="₹87,131.00" hint="0% settled" tone="success" icon={<CalendarCheck aria-hidden />} />
      <StatCard label="Pending requests" value="124" hint="awaiting payment" tone="info" icon={<FolderKanban aria-hidden />} />
      <StatCard label="Employees awaiting" value="8" hint="to be paid" tone="brand" icon={<Users aria-hidden />} />
    </div>
  ),
}

/** A dashboard KPI row: one tone per card, trend colour stays semantic. */
export const KpiRow: Story = {
  decorators: [(Story) => <div className="w-[min(1400px,calc(100vw-2rem))]"><Story /></div>],
  render: () => (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active projects" value="86" tone="success" icon={<FolderKanban aria-hidden />} trend={{ direction: 'up', value: '12.5%', good: true }} sparkline={[42, 44, 41, 47, 46, 52, 50, 56, 58]} />
      <StatCard label="Open leads" value="550" tone="warning" icon={<Briefcase aria-hidden />} trend={{ direction: 'down', value: '8.2%', good: false }} sparkline={[60, 58, 59, 55, 57, 54, 55, 52, 51]} />
      <StatCard label="Total employees" value="5,700" tone="info" icon={<Users aria-hidden />} trend={{ direction: 'up', value: '21.77%', good: true }} sparkline={[30, 31, 33, 34, 36, 37, 40, 43, 45]} />
      <StatCard label="Pending approvals" value="90" tone="danger" icon={<CalendarCheck aria-hidden />} trend={{ direction: 'down', value: '3.4%', good: false }} sparkline={[50, 48, 49, 46, 47, 45, 44, 46, 45]} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Open leads')).toBeInTheDocument()
    await expect(canvas.getByText('21.77%')).toBeInTheDocument()
  },
}
