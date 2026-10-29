import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Checkbox } from './checkbox'
import { Label } from './label'

/** Multi-select and opt-in choices. Always labelled. */
const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { onCheckedChange: fn() },
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="welcome" {...args} />
      <Label htmlFor="welcome">Send welcome email</Label>
    </div>
  ),
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

/** Clicking the label toggles the box. */
export const Toggle: Story = {
  play: async ({ args, canvas }) => {
    const box = canvas.getByRole('checkbox', { name: 'Send welcome email' })
    await expect(box).not.toBeChecked()
    await userEvent.click(canvas.getByText('Send welcome email'))
    await expect(box).toBeChecked()
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  },
}

/** Checked by default. */
export const Checked: Story = { args: { defaultChecked: true } }

/** Disabled — cannot be changed. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    // Base UI renders the box as role="checkbox" with aria-disabled (the native input is hidden).
    await expect(canvas.getByRole('checkbox')).toHaveAttribute('aria-disabled', 'true')
  },
}
