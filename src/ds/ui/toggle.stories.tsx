import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Star } from 'lucide-react'
import { Toggle } from './toggle'

/** A button that stays pressed — pin, favourite, bold. For a setting that saves, use Switch. */
const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  args: { 'aria-label': 'Pin to dashboard', onPressedChange: fn() },
  render: (args) => (
    <Toggle {...args}>
      <Star aria-hidden /> Pin
    </Toggle>
  ),
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

/** Pressing reports the new state. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Pin to dashboard' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-pressed', 'true'))
    await expect(args.onPressedChange).toHaveBeenCalledWith(true, expect.anything())
  },
}

/** Outlined, small. */
export const OutlineSmall: Story = { args: { variant: 'outline', size: 'sm' } }

/** Starts pressed. */
export const Pressed: Story = { args: { defaultPressed: true, variant: 'outline' } }
