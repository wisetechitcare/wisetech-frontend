import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Button } from './button'
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

/** One component, any size: `size-*` scales the ring and its dots together. Colour follows the text. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-6 text-foreground">
      <Spinner className="size-4" aria-label="Loading small" />
      <Spinner className="size-6" aria-label="Loading medium" />
      <Spinner className="size-10 text-primary" aria-label="Loading large" />
      <Spinner className="size-16 text-primary" aria-label="Loading page" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('status')).toHaveLength(4)
  },
}

/** In a busy button the dots take the button's ink, and the button's text is what gets announced. */
export const InButton: Story = {
  render: () => (
    <Button disabled>
      <Spinner aria-hidden />
      Saving…
    </Button>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('status')).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Saving…' })).toBeInTheDocument()
  },
}
