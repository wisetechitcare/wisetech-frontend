import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Checkbox } from './checkbox'
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
