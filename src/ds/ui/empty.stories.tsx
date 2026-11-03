import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Inbox } from 'lucide-react'
import { Button } from './button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './empty'

/**
 * shadcn's empty-state building blocks. Screens use the `EmptyState` pattern (Patterns/Empty State),
 * which composes these with the house rules; reach for the parts only to build a new pattern.
 */
const meta = {
  title: 'Components/Empty',
  component: Empty,
} satisfies Meta<typeof Empty>

export default meta
type Story = StoryObj<typeof meta>

/** Media, title, description and the next step. */
export const Default: Story = {
  render: () => (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Nothing waiting for you</EmptyTitle>
        <EmptyDescription>New leave and attendance requests from your team appear here.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" size="sm">View past decisions</Button>
      </EmptyContent>
    </Empty>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Nothing waiting for you')).toBeInTheDocument()
  },
}
