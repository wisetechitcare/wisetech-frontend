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
    const code = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot="combobox-trigger"] span')].find((el) => el.textContent === '+91')!
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
    await userEvent.click(canvas.getByRole('combobox', { name: '+91 India, country code' }))
    // The search box takes focus when the list opens; type into it as a person would (no extra click).
    await waitFor(() => expect(screen.getByPlaceholderText('Search country or code')).toHaveFocus())
    await userEvent.keyboard('United Arab')
    await userEvent.click(await screen.findByRole('option', { name: /United Arab Emirates/ }))
    await waitFor(() => expect(canvas.getByRole('combobox', { name: '+971 United Arab Emirates, country code' })).toBeInTheDocument())
    await animationsSettled()
  },
}

/** An existing number. */
export const Prefilled: Story = { args: { value: '+971501234567' } }

/** Every gap in the row is equal: flag · code · arrow · separator · number. Measured, so it cannot drift. */
export const EvenSpacing: Story = {
  args: { value: '+971501234567' },
  play: async ({ canvasElement }) => {
    const R = (el: Element) => el.getBoundingClientRect()
    const trigger = canvasElement.querySelector('[data-slot="combobox-trigger"]')!
    const [flag, code, arrow] = [trigger.querySelector('img')!, trigger.querySelector('span')!, trigger.querySelector('svg')!]
    const sep = canvasElement.querySelector('[data-slot="phone-field-separator"]')!
    const input = canvasElement.querySelector<HTMLInputElement>('input[type="tel"]')!
    const numberStart = R(input).left + parseFloat(getComputedStyle(input).paddingLeft)
    const gaps = [R(code).left - R(flag).right, R(arrow).left - R(code).right, R(sep).left - R(arrow).right, numberStart - R(sep).right]
    for (const g of gaps) await expect(Math.abs(g - gaps[0]), `gaps ${gaps.map((x) => x.toFixed(1)).join(' / ')}`).toBeLessThan(1)
  },
}
