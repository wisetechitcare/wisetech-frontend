import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'

import { Field, FieldError, FieldLabel } from '@/ds/ui/field'
import { PasswordField } from './password-field'

import { animationsSettled } from '@/ds/lib/motion'

/**
 * A password: floating label (via Field), reveal toggle with a tooltip, Caps Lock notice.
 * `autoComplete` is required — `current-password` to sign in, `new-password` when choosing one —
 * so password managers and the browser's generator work. Paste is never blocked.
 */
const meta = {
  title: 'Forms/Input/Password Field',
  component: PasswordField,
  args: { id: 'password', autoComplete: 'current-password' },
  render: (args) => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={args.id}>Password</FieldLabel>
      <PasswordField {...args} />
    </Field>
  ),
} satisfies Meta<typeof PasswordField>

export default meta
type Story = StoryObj<typeof meta>

/** Revealing shows the text without touching the value, and says which state it is in. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password') as HTMLInputElement
    await expect(input).toHaveAttribute('type', 'password')
    await expect(input).toHaveAttribute('autocomplete', 'current-password')
    await userEvent.type(input, 'S3cret!pass')

    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    await expect(input).toHaveAttribute('type', 'text')
    await expect(input.value).toBe('S3cret!pass')
    await expect(canvas.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(canvas.getByRole('button', { name: 'Hide password' }))
    await expect(input).toHaveAttribute('type', 'password')
    // Let the toggle's tooltip finish closing: the axe check after play otherwise measures it mid-fade (1.09:1).
    await animationsSettled()
  },
}

/** Large (`size="lg"`, 44px) — the sign-in size; the group, its input and the floating label all follow. */
export const Large: Story = {
  args: { size: 'lg' },
  play: async ({ canvas, canvasElement }) => {
    const group = canvasElement.querySelector<HTMLElement>('[data-slot="input-group"]')!
    await expect(group).toHaveAttribute('data-size', 'lg')
    await expect(group.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(canvas.getByLabelText('Password')).fontSize).toBe('16px')
  },
}

/** Invalid: the error is the field's description, and the group shows the danger ring. */
export const Invalid: Story = {
  args: { id: 'pw-invalid', invalid: true, 'aria-describedby': 'pw-invalid-error' },
  render: (args) => (
    <Field className="max-w-sm" data-invalid>
      <FieldLabel htmlFor={args.id}>Password</FieldLabel>
      <PasswordField {...args} />
      <FieldError id="pw-invalid-error">Enter your password.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription('Enter your password.')
  },
}

/** Disabled: neither the field nor the toggle can be used. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'hunter22' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Password')).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Show password' })).toBeDisabled()
  },
}
