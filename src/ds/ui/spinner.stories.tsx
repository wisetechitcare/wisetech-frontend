import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Spinner } from './spinner'

/**
 * Indeterminate busy indicator for a short wait inside a control or region. For a page or a card that
 * is loading content, use Skeleton in the content's shape instead (replaces the live kit's `PageLoader`).
 */
const meta = {
  title: 'Components/Spinner',
  component: Spinner,
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

/** Announced as "Loading" to screen readers. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  },
}

/** Inline with text, larger size. */
export const WithText: Story = {
  render: () => (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-5" aria-label="Generating payslips" /> Generating payslips…
    </p>
  ),
}
