import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Label } from './label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

const DEPARTMENTS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'people', label: 'People' },
  { value: 'finance', label: 'Finance' },
  { value: 'projects', label: 'Projects (archived)' },
]

/** Single-value picker. Keyboard and screen-reader accessible (Base UI Select). Pass `items` so the trigger shows the label, not the raw value. */
const meta = {
  title: 'Components/Select',
  component: Select,
  args: { onValueChange: fn() },
  render: (args) => (
    <div className="w-72 space-y-1.5">
      <Label id="dept-label">Department</Label>
      <Select items={DEPARTMENTS} {...args}>
        <SelectTrigger className="w-full" aria-labelledby="dept-label">
          <SelectValue placeholder="Choose a department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="engineering">Engineering</SelectItem>
          <SelectItem value="people">People</SelectItem>
          <SelectItem value="finance">Finance</SelectItem>
          <SelectItem value="projects" disabled>
            Projects (archived)
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

/** Choosing an option shows it and calls `onValueChange`. */
export const ChooseOption: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: 'Finance' }))
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith('finance', expect.anything()))
    // The page stays hidden from assistive tech until the listbox finishes closing.
    await waitFor(() => expect(canvas.getByRole('combobox')).toHaveTextContent('Finance'))
  },
}

/** With a preselected value. */
export const Preselected: Story = {
  args: { defaultValue: 'people' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveTextContent('People')
  },
}
