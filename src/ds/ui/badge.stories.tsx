import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Badge } from './badge'

/** Status and metadata labels. Status badges always carry text — never colour alone. */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Present', variant: 'success', dot: true },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'success', 'warning', 'danger', 'info', 'brand', 'neutral'],
    },
    dot: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

/** A single status badge with its dot. */
export const Status: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Present')).toHaveAttribute('data-variant', 'success')
  },
}

/** The WiseTech status set — one meaning per colour (attendance shown as the example). */
export const StatusSet: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" dot>Present</Badge>
      <Badge variant="warning" dot>Late</Badge>
      <Badge variant="danger" dot>Absent</Badge>
      <Badge variant="info" dot>On leave</Badge>
      <Badge variant="brand" dot>Remote</Badge>
      <Badge variant="neutral">Draft</Badge>
    </div>
  ),
}

/** Neutral metadata: counts, categories, plan names. */
export const Metadata: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Primary</Badge>
      <Badge variant="secondary">Full-time</Badge>
      <Badge variant="outline">Mumbai</Badge>
      <Badge variant="brand">Probation</Badge>
    </div>
  ),
}
