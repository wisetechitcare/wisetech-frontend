import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent } from 'storybook/test'
import { Avatar, AvatarFallback } from './avatar'
import { HoverCard, HoverCardContent, HoverCardTrigger } from './hover-card'

/**
 * Not a card: a floating preview that appears on hover or focus — a person's details behind their name in
 * a table or feed (shadcn calls it HoverCard). Supplementary only: everything in it must also be reachable
 * by opening the record. For a card on the page, use Card.
 */
const meta = {
  title: 'Components/Hover Preview',
  component: HoverCard,
  render: (args) => (
    <HoverCard {...args}>
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
} satisfies Meta<typeof HoverCard>

export default meta
type Story = StoryObj<typeof meta>

/** Keyboard focus opens the preview too. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole('link', { name: 'Meera Joshi' }))
    await expect(await screen.findByText('Reports to Arjun Rao')).toBeInTheDocument()
  },
}
