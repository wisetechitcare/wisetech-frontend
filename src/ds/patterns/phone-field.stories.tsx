import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Field, FieldDescription, FieldLabel } from '@/ds/ui/field'
import { PhoneField } from './phone-field'

const onChange = fn()

/**
 * International phone: searchable country + a number that formats as you type. Replaces the live
 * `WtPhoneField` (same engine). `onChange` gives E.164 — store that.
 */
const meta = {
  title: 'Patterns/Phone Field',
  component: PhoneField,
  args: { id: 'mobile', onChange, 'aria-describedby': 'mobile-hint' },
  render: (args) => (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="mobile">Mobile</FieldLabel>
      <PhoneField {...args} />
      <FieldDescription id="mobile-hint">Used for OTP sign-in and payslip alerts.</FieldDescription>
    </Field>
  ),
  beforeEach: () => {
    onChange.mockReset()
  },
} satisfies Meta<typeof PhoneField>

export default meta
type Story = StoryObj<typeof meta>

/** Typing a number reports E.164 with the country's dial code. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Mobile'), '9800000210')
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('+919800000210', expect.objectContaining({ iso2: 'in' })))
  },
}

/** Flag and code are one group; the code reads as the start of the number — same size, weight and family as the typed digits. */
export const DialCodeMatchesNumber: Story = {
  play: async ({ canvas, canvasElement }) => {
    const input = canvas.getByLabelText('Mobile')
    const code = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot="input-group-addon"] button span')].find((el) => el.textContent === '+91')!
    await expect(code).toBeDefined()
    const a = getComputedStyle(code)
    const b = getComputedStyle(input)
    for (const prop of ['fontSize', 'fontWeight', 'fontFamily'] as const) {
      await expect(a[prop], `dial code ${prop}`).toBe(b[prop])
    }
  },
}

/** Changing country by searching for it. */
export const ChangeCountry: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: '+91 India, country code' }))
    await userEvent.type(await screen.findByPlaceholderText('Search country or code'), 'United Arab')
    await userEvent.click(await screen.findByRole('option', { name: /United Arab Emirates/ }))
    await waitFor(() => expect(canvas.getByRole('button', { name: '+971 United Arab Emirates, country code' })).toBeInTheDocument())
    await animationsSettled()
  },
}

/** An existing number. */
export const Prefilled: Story = { args: { value: '+971501234567' } }
