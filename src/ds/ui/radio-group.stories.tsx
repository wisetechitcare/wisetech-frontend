import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Label } from './label'
import { RadioGroup, RadioGroupItem } from './radio-group'

const SESSIONS = [
  { value: 'full', label: 'Full day' },
  { value: 'first', label: 'First half' },
  { value: 'second', label: 'Second half' },
]

/** Choose exactly one of a few visible options (two to five). More than that is a Select. */
const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  args: { defaultValue: 'full', onValueChange: fn() },
  render: (args) => (
    <div className="grid gap-2">
      <p id="session-label" className="text-sm font-medium">Session</p>
      <RadioGroup aria-labelledby="session-label" {...args}>
        {SESSIONS.map((s) => (
          <div key={s.value} className="flex items-center gap-2">
            <RadioGroupItem id={`session-${s.value}`} value={s.value} />
            <Label htmlFor={`session-${s.value}`}>{s.label}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  ),
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Picking an option checks it and reports the value. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Second half' }))
    await waitFor(() => expect(canvas.getByRole('radio', { name: 'Second half' })).toBeChecked())
    await expect(args.onValueChange).toHaveBeenCalledWith('second', expect.anything())
  },
}

/** Disabled. */
export const Disabled: Story = { args: { disabled: true } }
