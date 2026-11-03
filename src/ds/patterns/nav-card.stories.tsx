import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { CalendarDays, Clock, Receipt, ShieldCheck } from 'lucide-react'
import { Badge } from '@/ds/ui/badge'
import { AutoGrid } from './auto-grid'
import { NavCard } from './nav-card'

/** A tile that opens another screen — settings hubs, module launchers. Replaces the live `NavCard`. */
const meta = {
  title: 'Patterns/Nav Card',
  component: NavCard,
  args: {
    title: 'Leave policy',
    description: 'Types, accrual, carry-forward and sandwich rules',
    icon: <CalendarDays />,
    tone: 'blue',
    href: '#leave-policy',
  },
  decorators: [(Story) => <div className="w-[min(1000px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof NavCard>

export default meta
type Story = StoryObj<typeof meta>

/** A real link. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /Leave policy/ })).toHaveAttribute('href', '#leave-policy')
  },
}

/** A settings hub in AutoGrid; a not-yet-available card says why. */
export const SettingsHub: Story = {
  render: () => (
    <AutoGrid min={300}>
      <NavCard title="Leave policy" description="Types, accrual, carry-forward" icon={<CalendarDays />} tone="blue" href="#leave" meta="6 types" />
      <NavCard title="Attendance" description="Shifts, grace, check-in radius" icon={<Clock />} tone="green" href="#attendance" />
      <NavCard title="Payroll" description="Components, statutory, bank file" icon={<Receipt />} tone="amber" href="#payroll" />
      <NavCard
        title="Approvals"
        description="Chains for leave, expenses and offers"
        icon={<ShieldCheck />}
        tone="purple"
        href="#approvals"
        disabled
        meta={<Badge variant="neutral">Not set up</Badge>}
      />
    </AutoGrid>
  ),
}
