import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Input } from './input'
import { Label } from './label'

/** Text input. Always paired with a visible `Label`; errors are linked with `aria-describedby`. */
const meta = {
  title: 'Components/Input',
  component: Input,
  args: { placeholder: 'e.g. Aarav Sharma' },
  render: (args) => (
    <div className="w-80 space-y-1.5">
      <Label htmlFor="name">Full name</Label>
      <Input id="name" {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

/** Typing updates the value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Full name')
    await userEvent.type(input, 'Aarav Sharma')
    await expect(input).toHaveValue('Aarav Sharma')
  },
}

/** Invalid input: `aria-invalid` plus a described error message. */
export const Invalid: Story = {
  render: () => (
    <div className="w-80 space-y-1.5">
      <Label htmlFor="email">Work email</Label>
      <Input id="email" type="email" defaultValue="aarav@" aria-invalid aria-describedby="email-error" />
      <p id="email-error" className="text-label text-destructive-foreground">
        Enter a complete email address.
      </p>
    </div>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Work email')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription('Enter a complete email address.')
  },
}

/** Disabled inputs are not editable. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'E-1042' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Full name')).toBeDisabled()
  },
}
