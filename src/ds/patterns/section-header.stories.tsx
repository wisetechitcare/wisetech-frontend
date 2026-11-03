import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { CalendarDays, Settings2 } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { SectionHeader } from './section-header'

/** The title row of a region: icon, title, description, action. Replaces the live `SectionHead`. */
const meta = {
  title: 'Patterns/Section Header',
  component: SectionHeader,
  args: {
    title: 'Leave policy',
    description: 'Types, accrual, carry-forward and sandwich rules',
    icon: <CalendarDays />,
  },
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof SectionHeader>

export default meta
type Story = StoryObj<typeof meta>

/** A section title is an h2. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Leave Policy' })).toBeInTheDocument()
  },
}

/** With an action and a category hue. */
export const WithAction: Story = {
  args: { tone: 'purple', icon: <Settings2 />, action: <Button size="sm" variant="outline">Configure</Button> },
}

/** Text only, nested level. */
export const Plain: Story = { args: { icon: undefined, as: 'h3', description: undefined } }
