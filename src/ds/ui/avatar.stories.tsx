import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Avatar, AvatarFallback } from './avatar'

/** Person avatar. Falls back to initials when there is no photo. */
const meta = {
  title: 'Components/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

/** Initials fallback, in three sizes. */
export const Initials: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar className="size-6">
        <AvatarFallback className="text-[10px]">AS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback className="bg-accent text-accent-foreground">DN</AvatarFallback>
      </Avatar>
      <Avatar className="size-14">
        <AvatarFallback className="bg-primary text-title font-semibold text-primary-foreground">KR</AvatarFallback>
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('DN')).toBeInTheDocument()
  },
}
