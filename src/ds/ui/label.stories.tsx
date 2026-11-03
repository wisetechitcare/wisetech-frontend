import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Checkbox } from './checkbox'
import { Input } from './input'
import { Label } from './label'

/**
 * The visible name of a control. Always present, always above (or beside, for checkboxes and
 * switches) — never a placeholder standing in for a label. Inside forms, prefer Field.
 */
const meta = {
  title: 'Components/Label',
  component: Label,
} satisfies Meta<typeof Label>

export default meta
type Story = StoryObj<typeof meta>

/** Clicking the label focuses its input. */
export const WithInput: Story = {
  render: () => (
    <div className="grid max-w-xs gap-1.5">
      <Label htmlFor="emp-code">Employee code</Label>
      <Input id="emp-code" placeholder="WT-0042" />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Employee code'))
    await expect(canvas.getByLabelText('Employee code')).toHaveFocus()
  },
}

/** Beside a checkbox. */
export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">I have read the leave policy</Label>
    </div>
  ),
}
