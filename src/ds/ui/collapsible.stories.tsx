import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { ChevronsUpDown } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

/** Show or hide one secondary block — "advanced options", "show history". */
const meta = {
  title: 'Components/Collapsible',
  component: Collapsible,
  render: (args) => (
    <Collapsible className="max-w-sm space-y-2" {...args}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Advanced options</p>
        <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Toggle advanced options" />}>
          <ChevronsUpDown aria-hidden />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2 text-sm text-muted-foreground">
        <p>Round worked hours to the nearest 15 minutes.</p>
        <p>Count early check-in as overtime.</p>
      </CollapsibleContent>
    </Collapsible>
  ),
} satisfies Meta<typeof Collapsible>

export default meta
type Story = StoryObj<typeof meta>

/** Closed by default; the trigger opens it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Toggle advanced options' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await waitFor(() => expect(canvas.getByText(/nearest 15 minutes/)).toBeVisible())
    await animationsSettled()
  },
}

/** Starts open. */
export const Open: Story = {
  args: { defaultOpen: true },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(/nearest 15 minutes/)).toBeVisible())
    await animationsSettled()
  },
}
