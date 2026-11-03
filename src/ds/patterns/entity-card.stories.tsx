import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Briefcase, Building2, CalendarDays, Clock, HardHat, Receipt, ShieldCheck } from 'lucide-react'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
import { AutoGrid } from './auto-grid'
import { EntityCard } from './entity-card'

const onShare = fn()

/**
 * A tile in a collection — a record or a place to go. Replaces the live `EntityCard` and `NavCard` (one
 * Card, one look). With `href` the whole tile is a link; its own buttons stay clickable.
 */
const meta = {
  title: 'Patterns/Entity Card',
  component: EntityCard,
  args: {
    title: 'Senior MEP Engineer',
    subtitle: 'Engineering · Mumbai — Andheri',
    icon: <Briefcase />,
    tone: 'purple',
    status: <Badge variant="success" dot>Open</Badge>,
    meta: (
      <>
        <Badge variant="neutral">3 openings</Badge>
        <Badge variant="neutral">42 candidates</Badge>
      </>
    ),
    description: 'Lead HVAC and plumbing design for commercial towers; coordinate with structural and architects on site.',
    href: '#role-1',
    actions: <Button size="sm" variant="outline" onClick={onShare}>Share advert</Button>,
  },
  decorators: [(Story) => <div className="w-96"><Story /></div>],
} satisfies Meta<typeof EntityCard>

export default meta
type Story = StoryObj<typeof meta>

/** The tile links to the record; the action button still works on its own. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Senior MEP Engineer' })
    await expect(link).toHaveAttribute('href', '#role-1')
    // The link's click area is the whole card: it is positioned against the card, not a header inside it.
    await expect((link as HTMLElement).offsetParent).toBe(link.closest('[data-interactive]'))
    await userEvent.click(canvas.getByRole('button', { name: 'Share advert' }))
    await expect(onShare).toHaveBeenCalled()
  },
}

/** A collection in AutoGrid: tiles line up, actions pinned to the bottom. */
export const InAutoGrid: Story = {
  decorators: [(Story) => <div className="w-[min(1200px,calc(100vw-2rem))]"><Story /></div>],
  render: (args) => (
    <AutoGrid>
      <EntityCard {...args} />
      <EntityCard
        {...args}
        title="Site Supervisor"
        subtitle="Projects · Pune"
        icon={<HardHat />}
        tone="amber"
        href="#role-2"
        status={<Badge variant="warning" dot>On hold</Badge>}
        description="Short description."
      />
      <EntityCard
        {...args}
        title="Office Administrator"
        subtitle="Admin · Dubai"
        icon={<Building2 />}
        tone="cyan"
        href="#role-3"
        status={<Badge variant="neutral">Closed</Badge>}
        actions={undefined}
      />
    </AutoGrid>
  ),
}

/** Navigation tiles (live `NavCard`): a settings hub. A tile that isn't available yet says why. */
export const NavigationTiles: Story = {
  decorators: [(Story) => <div className="w-[min(1100px,calc(100vw-2rem))]"><Story /></div>],
  render: () => (
    <AutoGrid min={300}>
      <EntityCard title="Leave policy" description="Types, accrual, carry-forward" icon={<CalendarDays />} tone="blue" href="#leave" status={<Badge variant="neutral">6 types</Badge>} />
      <EntityCard title="Attendance" description="Shifts, grace, check-in radius" icon={<Clock />} tone="green" href="#attendance" />
      <EntityCard title="Payroll" description="Components, statutory, bank file" icon={<Receipt />} tone="amber" href="#payroll" />
      <EntityCard
        title="Approvals"
        description="Chains for leave, expenses and offers"
        icon={<ShieldCheck />}
        tone="purple"
        href="#approvals"
        disabled
        status={<Badge variant="neutral">Not set up</Badge>}
      />
    </AutoGrid>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Payroll' })).toHaveAttribute('href', '#payroll')
    await expect(canvas.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument()
  },
}
