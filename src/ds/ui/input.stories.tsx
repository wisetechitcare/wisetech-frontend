import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Field, FieldDescription, FieldError, FieldLabel } from './field'
import { Input } from './input'

/**
 * Text input. In a form it always sits in a `Field` with a `FieldLabel`, so it gets the app-wide floating
 * label (rests inside the empty pill, floats onto the border on focus or once filled), a hint below, and
 * an error linked with `aria-describedby`. The bare `Input` is only for places that label it otherwise
 * (a table filter with an `aria-label`).
 */
const meta = {
  title: 'Components/Input',
  component: Input,
  args: { placeholder: 'e.g. Aarav Sharma' },
  render: (args) => (
    <Field className="w-80">
      <FieldLabel htmlFor="name">Full name</FieldLabel>
      <Input id="name" aria-describedby="name-hint" {...args} />
      <FieldDescription id="name-hint">As it appears on the PAN card.</FieldDescription>
    </Field>
  ),
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

/** Typing updates the value; the label floats on focus and stays up once there is a value. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Full Name')
    await userEvent.type(input, 'Aarav Sharma')
    await expect(input).toHaveValue('Aarav Sharma')
    await expect(input).toHaveAccessibleDescription('As it appears on the PAN card.')
  },
}

/** Invalid input: `aria-invalid` plus a described error message; label, border and message turn red. */
export const Invalid: Story = {
  render: () => (
    <Field data-invalid className="w-80">
      <FieldLabel htmlFor="email">Work email</FieldLabel>
      <Input id="email" type="email" defaultValue="aarav@" aria-invalid aria-describedby="email-error" />
      <FieldError id="email-error">Enter a complete email address.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Work Email')
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(input).toHaveAccessibleDescription('Enter a complete email address.'))
  },
}

/** Disabled inputs are not editable. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'E-1042' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Full Name')).toBeDisabled()
  },
}

/**
 * Large (`size="lg"`): 44px with 16px text — Button `lg`'s height — for a form that is the whole page (sign-in).
 * The floating label follows: it rests centred at 16px, and floats clear of the rounder 22px curve.
 */
export const Large: Story = {
  args: { size: 'lg' },
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByLabelText('Full Name')
    const label = canvasElement.querySelector<HTMLElement>('[data-slot="field-label"]')!
    await expect(input.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(input).fontSize).toBe('16px')
    const box = input.getBoundingClientRect()
    const rest = label.getBoundingClientRect()
    await expect(Math.abs(rest.top + rest.height / 2 - (box.top + box.height / 2))).toBeLessThan(1.5)
    await expect(getComputedStyle(label).fontSize).toBe('16px')
    await userEvent.click(input)
    // Floated: starts past the 22px curve (28px), not the default size's 26px.
    await waitFor(() => expect(getComputedStyle(label).insetInlineStart).toBe('28px'))
  },
}
