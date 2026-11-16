import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Progress } from './progress'

/** Determinate progress (onboarding completion, upload). Always has an accessible label. */
const meta = {
  title: 'Components/Progress',
  component: Progress,
  args: { value: 62, 'aria-label': 'Onboarding progress' },
  render: (args) => (
    <div className="flex w-80 items-center gap-3">
      <Progress {...args} className="h-2" />
      <span className="tabular text-xs text-muted-foreground">{args.value}%</span>
    </div>
  ),
} satisfies Meta<typeof Progress>

export default meta
type Story = StoryObj<typeof meta>

/** Part-way through. */
export const InProgress: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar', { name: 'Onboarding progress' })).toBeInTheDocument()
  },
}

/** Complete. */
export const Complete: Story = { args: { value: 100 } }

/** Not started. */
export const Empty: Story = { args: { value: 0 } }
