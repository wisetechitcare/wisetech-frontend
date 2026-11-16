import type * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Briefcase, CalendarDays, Clock, HeartPulse, Receipt, Users, Wallet } from 'lucide-react'
import { HUE_TONES, STATUS_TONES } from '@/ds/lib/tone'
import { IconBox } from './icon-box'

/**
 * A tinted tile for one icon: the anchor of a stat, a section head or a list row. Replaces the live kit's
 * `IconBox` and its `trio` colours. Decorative — the text beside it carries the meaning.
 */
const meta = {
  title: 'Patterns/Icon Box',
  component: IconBox,
  args: { icon: <Users />, tone: 'brand' },
} satisfies Meta<typeof IconBox>

export default meta
type Story = StoryObj<typeof meta>

/** Brand tone, default size. Hidden from assistive tech. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="icon-box"]')).toHaveAttribute('aria-hidden', 'true')
  },
}

/** Three sizes. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconBox size="sm" icon={<Clock />} />
      <IconBox icon={<Clock />} />
      <IconBox size="lg" icon={<Clock />} />
    </div>
  ),
}

const ICONS = [Users, Clock, CalendarDays, Receipt, Briefcase, HeartPulse, Wallet]

/** Status tones (meaning) and category hues (identity). */
export const Tones: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {STATUS_TONES.map((t, i) => {
          const Icon = ICONS[i % ICONS.length]
          return <IconBox key={t} tone={t} icon={<Icon />} />
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {HUE_TONES.map((t, i) => {
          const Icon = ICONS[i % ICONS.length]
          return <IconBox key={t} tone={t} icon={<Icon />} />
        })}
      </div>
    </div>
  ),
}

/** An admin-configured colour (hex). */
export const CustomColour: Story = {
  args: { tone: '#DB2777' as React.ComponentProps<typeof IconBox>['tone'], icon: <HeartPulse /> },
}
