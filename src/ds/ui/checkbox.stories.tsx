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

/** Every state side by side: 22px tile, 7px radius, crisp 2px border, 16px stroke-3 tick. */
export const States: Story = {
  render: (args) => (
    <div className="flex items-center gap-6">
      {([
        ['Off', {}],
        ['On', { defaultChecked: true }],
        ['Mixed', { indeterminate: true }],
        ['Disabled', { disabled: true }],
        ['Disabled on', { disabled: true, defaultChecked: true }],
      ] as const).map(([label, state]) => (
        <div key={label} className="flex items-center gap-2">
          <Checkbox id={`cb-${label.replace(' ', '-')}`} {...args} {...state} />
          <Label htmlFor={`cb-${label.replace(' ', '-')}`}>{label}</Label>
        </div>
      ))}
    </div>
  ),
}

/** Toggling bounces the box (movin.design "Bounce" style) — never on initial mount. */
export const Bounce: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByRole('checkbox', { name: 'Send welcome email' })
    await expect(box).not.toHaveAttribute('data-bounce')
    await userEvent.click(box)
    await expect(box).toHaveAttribute('data-bounce', 'in')
    await userEvent.click(box)
    await expect(box).toHaveAttribute('data-bounce', 'out')
  },
}
