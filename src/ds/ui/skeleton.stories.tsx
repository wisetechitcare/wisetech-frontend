import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

/** Loading placeholder that matches the shape of the content it stands in for — never a full-page spinner. */
const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
} satisfies Meta<typeof Skeleton>

export default meta
type Story = StoryObj<typeof meta>

/** A list row and a card while data loads. */
export const LoadingRow: Story = {
  render: () => (
    <div className="w-96 space-y-4" role="status" aria-busy="true" aria-label="Loading employees">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  ),
}
