import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Search } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Card, CardContent } from './card'
import { Checkbox } from './checkbox'
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from './combobox'
import { DatePicker } from './date-picker'
import { InputGroup, InputGroupAddon, InputGroupInput } from './input-group'
import { NumberField } from './number-field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'
import { Input } from './input'
import { Switch } from './switch'
import { Textarea } from './textarea'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from './field'

/**
 * THE labelled control: label above, control, then hint or error — for every input type. Replaces
 * the live kit's `WtField` frame (and its floating-label notch). The label is always visible; the
 * error is linked to the control so screen readers announce it.
 */
const meta = {
  title: 'Components/Field',
  component: Field,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

/** Label, control and hint. */
export const WithHint: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="work-email">Work email</FieldLabel>
      <Input id="work-email" type="email" placeholder="name@company.com" aria-describedby="work-email-hint" />
      <FieldDescription id="work-email-hint">Payslips and approvals are sent here.</FieldDescription>
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Work email')
    await userEvent.type(input, 'meera@wisetech.in')
    await expect(input).toHaveValue('meera@wisetech.in')
    await expect(input).toHaveAccessibleDescription('Payslips and approvals are sent here.')
  },
}

/** Invalid: the field turns red and the message is announced with the control. */
export const Invalid: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="pan">PAN</FieldLabel>
      <Input id="pan" defaultValue="ABCDE12" aria-invalid aria-describedby="pan-error" />
      <FieldError id="pan-error">PAN has 10 characters: 5 letters, 4 digits, 1 letter.</FieldError>
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('PAN')).toHaveAccessibleDescription(/10 characters/)
  },
}

/** A form section: legend, grouped fields, separator, horizontal toggles. */
export const FormSection: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Leave request</FieldLegend>
      <FieldDescription>Your manager approves first, then HR.</FieldDescription>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="reason">Reason</FieldLabel>
          <Textarea id="reason" placeholder="Family function in Pune" />
        </Field>
        <FieldSeparator />
        <Field orientation="horizontal">
          <Checkbox id="half-day" />
          <FieldLabel htmlFor="half-day">Half day</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor="notify-team">Tell my team</FieldLabel>
            <FieldDescription>Posts on the team calendar once approved.</FieldDescription>
          </FieldContent>
          <Switch id="notify-team" defaultChecked />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Half day' }))
    await expect(canvas.getByRole('checkbox', { name: 'Half day' })).toBeChecked()
    await expect(canvas.getByRole('switch', { name: 'Tell my team' })).toBeChecked()
  },
}

const DEPTS = [
  { value: 'eng', label: 'Engineering' },
  { value: 'people', label: 'People' },
]
const BRANCHES = ['Mumbai — Andheri', 'Pune', 'Dubai']

/**
 * Every floated label must leave its control's rounded corner fully visible: the label's box (its masking
 * background) has to start at or after the point where the top-left curve ends. Reads the real radius, so it
 * holds for pills, textareas and anything added later.
 */
async function expectCornersVisible(root: HTMLElement) {
  await animationsSettled()
  const floated = [...root.querySelectorAll<HTMLElement>('[data-slot="field-label"]')].filter((l) => parseFloat(getComputedStyle(l).top) === 0)
  for (const label of floated) {
    const control = label.parentElement!.querySelector<HTMLElement>(
      ':scope > :is([data-slot="input"], [data-slot="textarea"], [data-slot="input-group"], [data-slot="select-trigger"], [data-slot="combobox-chips"])',
    )!
    const c = control.getBoundingClientRect()
    const curve = Math.min(parseFloat(getComputedStyle(control).borderTopLeftRadius), c.height / 2)
    const labelLeft = label.getBoundingClientRect().left - c.left
    await expect(labelLeft, `"${label.textContent}" covers its control's rounded corner`).toBeGreaterThanOrEqual(curve)
  }
  return floated.length
}

/** The label's vertical position inside its field: ~20px resting in the control, 0 floated on its border. */
const labelTop = (el: HTMLElement) => parseFloat(getComputedStyle(el.closest('[data-slot="field"]')!.querySelector('[data-slot="field-label"]')!).top)

/**
 * Floating labels (decided 2026-11-03, app-wide): the label rests inside an empty control and floats onto its
 * border on focus or once there is a value — for every control type, from one rule (styles/globals.css).
 * A control with a leading icon keeps its label up. Inside a Card the label masks the border with the card.
 */
export const FloatingLabels: Story = {
  decorators: [(Story) => <div className="w-[min(48rem,calc(100vw-2rem))]"><Story /></div>],
  render: () => (
    <Card>
      <CardContent>
        <FieldGroup className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="fl-name">Full name</FieldLabel>
            <Input id="fl-name" />
          </Field>
          <Field>
            <FieldLabel htmlFor="fl-code">Employee code</FieldLabel>
            <Input id="fl-code" defaultValue="WT-0042" />
          </Field>
          <Field>
            <FieldLabel id="fl-dept-label">Department</FieldLabel>
            <Select items={DEPTS}>
              <SelectTrigger className="w-full" aria-labelledby="fl-dept-label">
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {DEPTS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="fl-branch">Branch</FieldLabel>
            <Combobox items={BRANCHES}>
              <ComboboxInput id="fl-branch" placeholder="Search branches" />
              <ComboboxContent>
                <ComboboxEmpty>No branch matches.</ComboboxEmpty>
                <ComboboxList>{(b: string) => <ComboboxItem key={b} value={b}>{b}</ComboboxItem>}</ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
          <DatePicker label="Date of joining" />
          <NumberField label="Notice period (days)" />
          <Field>
            <FieldLabel htmlFor="fl-search">Reporting manager</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput id="fl-search" placeholder="Search people" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel htmlFor="fl-notes">Remarks</FieldLabel>
            <Textarea id="fl-notes" />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas, canvasElement }) => {
    const name = canvas.getByLabelText('Full name')
    // Empty and unfocused: the label rests inside the control.
    await expect(labelTop(name)).toBeGreaterThan(10)
    // Focus floats it onto the border; it stays there once there is a value.
    await userEvent.click(name)
    await waitFor(() => expect(labelTop(name)).toBe(0))
    await userEvent.type(name, 'Meera Joshi')
    await userEvent.tab()
    await waitFor(() => expect(labelTop(name)).toBe(0))
    // A prefilled field and a field with a leading icon start floated.
    await expect(labelTop(canvas.getByLabelText('Employee code'))).toBe(0)
    await expect(labelTop(canvas.getByLabelText('Reporting manager'))).toBe(0)
    // The label stays the field's accessible name.
    await expect(canvas.getByRole('textbox', { name: 'Remarks' })).toBeInTheDocument()
    // Floated labels never cover a rounded corner — check a pill and a textarea.
    await userEvent.click(canvas.getByRole('textbox', { name: 'Remarks' }))
    await expect(await expectCornersVisible(canvasElement)).toBeGreaterThanOrEqual(4)
  },
}

/** Dark theme: the floated label masks the border with the dark card surface; contrast is checked by axe. */
export const FloatingLabelsDark: Story = {
  ...FloatingLabels,
  globals: { mode: 'dark' },
  play: async ({ canvas }) => {
    await expect(document.documentElement).toHaveClass('dark')
    await expect(labelTop(canvas.getByLabelText('Employee code'))).toBe(0)
  },
}
