import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Star } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/ds/ui/avatar'
import { Badge } from '@/ds/ui/badge'
import { OptionPickerTrigger } from './option-picker-dialog'
import { RecordHeader } from './record-header'

const onBack = fn()

/**
 * The header of one record's page: back, avatar, the reference (copyable), meta tags, the name, and the status +
 * actions on the right. Stacks on a phone; the name truncates rather than pushing the actions away.
 */
const meta = {
  title: 'Patterns/Record Header',
  component: RecordHeader,
  args: {
    title: 'Mahavir Prakash at Ghatkopar East',
    reference: 'WT/PROJECT/26-27/787',
    onBack,
    avatar: (
      <Avatar className="size-11 rounded-xl after:rounded-xl">
        <AvatarFallback className="rounded-xl bg-accent font-semibold text-accent-foreground">MP</AvatarFallback>
      </Avatar>
    ),
    meta: (
      <>
        <Badge variant="neutral">Rev 3</Badge>
        <Badge variant="amber"><Star aria-hidden /> High</Badge>
      </>
    ),
    actions: <OptionPickerTrigger label="Project" value="On Ongoing" color="#3b82f6" onClick={fn()} />,
  },
  beforeEach: () => {
    onBack.mockReset()
  },
} satisfies Meta<typeof RecordHeader>

export default meta
type Story = StoryObj<typeof meta>

/** A project: name as the page's h1, back works, the status trigger sits on the right. */
export const Project: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Mahavir Prakash at Ghatkopar East' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(onBack).toHaveBeenCalled()
    await expect(canvas.getByRole('button', { name: /On Ongoing/ })).toBeInTheDocument()
  },
}

/** A lead: secondary reference colour, no avatar, read-only status. */
export const Lead: Story = {
  args: {
    reference: 'WT/OFFER/26-27/1204',
    referenceTone: 'muted',
    avatar: undefined,
    actions: <OptionPickerTrigger label="Lead" value="Proposal Sent" color="#8b5cf6" />,
  },
}

/** A very long name truncates; the actions keep their place. */
export const LongTitle: Story = {
  args: { title: 'Residential tower redevelopment, Plot 14-B, Near Railway Station, Ghatkopar East, Mumbai 400077' },
}
