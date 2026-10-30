import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from './popover'

/** Small interactive panel anchored to a control — quick edits, filters, pickers. Not for long forms. */
const meta = {
  title: 'Components/Popover',
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
    const trigger = canvas.getByRole('button', { name: 'Set reminder' })
    await userEvent.click(trigger)
    await expect(await screen.findByLabelText('Remind after (days)')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByLabelText('Remind after (days)')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
