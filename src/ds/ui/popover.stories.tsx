import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Avatar, AvatarFallback } from './avatar'
import { Button } from './button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover'

/**
 * Small interactive panel anchored to a control — quick edits, filters, pickers. Not for long forms.
 * For a read-only preview on hover or focus (a person behind their name) use `HoverCard` — see Hover Preview.
 */
const meta = {
  title: 'Feedback & Overlays/Popover',
  component: Popover,
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger render={<Button variant="outline" />}>Set reminder</PopoverTrigger>
      <PopoverContent className="w-72">
        <PopoverHeader>
          <PopoverTitle>Reminder</PopoverTitle>
          <PopoverDescription>We&apos;ll nudge the approver if nothing happens.</PopoverDescription>
        </PopoverHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="remind-after">Remind after (days)</Label>
          <Input id="remind-after" defaultValue="2" inputMode="numeric" />
        </div>
      </PopoverContent>
    </Popover>
  ),
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

/** Opens on click; Escape returns focus to the trigger. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Set Reminder' })
    await userEvent.click(trigger)
    await expect(await screen.findByLabelText('Remind After (Days)')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByLabelText('Remind After (Days)')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/**
 * `HoverCard`: a floating preview on hover or focus — a person's details behind their name in a table or feed.
 * Supplementary only: everything in it must also be reachable by opening the record.
 */
export const HoverPreview: Story = {
  render: () => (
    <HoverCard>
      {/* delay lives on the trigger (Base UI), not the root */}
      <HoverCardTrigger
        href="#employee"
        delay={0}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        Meera Joshi
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <div className="flex gap-3">
          <Avatar>
            <AvatarFallback>MJ</AvatarFallback>
          </Avatar>
          <div className="space-y-1 text-sm">
            <p className="font-medium">Meera Joshi</p>
            <p className="text-muted-foreground">Senior MEP Engineer · Mumbai</p>
            <p className="text-muted-foreground">Reports to Arjun Rao</p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole('link', { name: 'Meera Joshi' }))
    await expect(await screen.findByText('Reports to Arjun Rao')).toBeInTheDocument()
  },
}
