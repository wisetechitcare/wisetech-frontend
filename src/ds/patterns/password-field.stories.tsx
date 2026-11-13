import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Field, FieldError, FieldLabel } from '@/ds/ui/field'
import { PasswordField } from './password-field'

/**
 * A password: floating label (via Field), reveal toggle with a tooltip, Caps Lock notice.
 * `autoComplete` is required — `current-password` to sign in, `new-password` when choosing one —
 * so password managers and the browser's generator work. Paste is never blocked.
 */
const meta = {
  title: 'Patterns/Password Field',
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
  },
}

/** The icon-only toggle is named by the kit Tooltip on keyboard focus, and is a 32px target. */
export const ToggleTooltip: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByLabelText('Password'))
    await userEvent.tab()
    const toggle = canvas.getByRole('button', { name: 'Show password' })
    await expect(toggle).toHaveFocus()
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Show password'))
    const { width, height } = toggle.getBoundingClientRect()
    await expect(Math.min(width, height)).toBeGreaterThanOrEqual(32)
    // Let the tooltip finish animating in: axe runs after play, and mid-fade colours are not real contrast.
    await animationsSettled()
  },
}

/** Caps Lock is noticed from the first keystroke, announced, and linked to the field. */
export const CapsLock: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Password')
    await userEvent.click(input)
    // The browser reports Caps Lock on every key event (getModifierState); send what it sends.
    const key = (k: string, capsLock: boolean) =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, modifierCapsLock: capsLock } as KeyboardEventInit))
    key('A', true)
    const notice = await canvas.findByRole('status')
    await expect(notice).toHaveTextContent('Caps Lock is on')
    await expect(input.getAttribute('aria-describedby')).toContain(notice.id)
    key('b', false)
    await waitFor(() => expect(canvas.queryByRole('status')).toBeNull())
    await expect(input.getAttribute('aria-describedby') ?? '').not.toContain('caps')
  },
}

/** Choosing a password: `new-password` lets the browser offer a strong one. */
export const NewPassword: Story = {
  args: { id: 'new-password', autoComplete: 'new-password' },
  render: (args) => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor={args.id}>New password</FieldLabel>
      <PasswordField {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('New Password')).toHaveAttribute('autocomplete', 'new-password')
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
