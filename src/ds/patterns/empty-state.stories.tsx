import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Plus, UserPlus } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { EmptyState } from './empty-state'

const onAdd = fn()

/** Every empty view says what it is and what to do next — never just "No data". */
const meta = {
  title: 'Patterns/Empty State',
  component: EmptyState,
  args: {
    icon: <UserPlus aria-hidden />,
    title: 'No candidates yet',
    description: 'Publish the advert or add a candidate by hand to start the pipeline.',
  },
  decorators: [(Story) => <div className="w-[32rem]"><Story /></div>],
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

/** With a next-step action that works. */
export const WithAction: Story = {
  args: {
    action: (
      <Button size="sm" onClick={onAdd}>
        <Plus aria-hidden /> Add candidate
      </Button>
    ),
  },
  beforeEach: () => {
    onAdd.mockClear()
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add candidate' }))
    await expect(onAdd).toHaveBeenCalledTimes(1)
  },
}

/** Informational only (e.g. a filter returned nothing). */
export const NoAction: Story = {
  args: { title: 'No one matches these filters', description: 'Try clearing the department or status filter.' },
}
