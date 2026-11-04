import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Label } from './label'
import { Switch } from './switch'

/** An immediate on/off setting (takes effect without a Save). */
const meta = {
  title: 'Components/Switch',
  component: Switch,
  args: { onCheckedChange: fn() },
  render: (args) => (
    <div className="flex items-center gap-3">
      <Switch id="notify" {...args} />
      <Label htmlFor="notify">Notify reporting manager</Label>
    </div>
  ),
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

/** Toggling flips `aria-checked` and reports the new value. */
export const Toggle: Story = {
  play: async ({ args, canvas }) => {
    const sw = canvas.getByRole('switch', { name: 'Notify reporting manager' })
    await userEvent.click(sw)
    await expect(sw).toBeChecked()
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true, expect.anything())
  },
}

/** Keyboard: Space toggles a focused switch. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    const sw = canvas.getByRole('switch')
    sw.focus()
    await userEvent.keyboard(' ')
    await expect(sw).toBeChecked()
  },
}

/** Disabled. */
export const Disabled: Story = { args: { disabled: true, defaultChecked: true } }
