import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Label } from './label'
import { Textarea } from './textarea'

/** Multi-line text — reasons, remarks, descriptions. Grows with its content. */
const meta = {
  title: 'Components/Textarea',
  component: Textarea,
  args: { id: 'remarks', placeholder: 'Add a note for the approver' },
  render: (args) => (
    <div className="grid max-w-md gap-1.5">
      <Label htmlFor="remarks">Remarks</Label>
      <Textarea {...args} />
    </div>
  ),
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

/** Typing fills it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByLabelText('Remarks')
    await userEvent.type(box, 'Travelling to site on Monday.')
    await expect(box).toHaveValue('Travelling to site on Monday.')
  },
}

/** Invalid. */
export const Invalid: Story = { args: { 'aria-invalid': true, defaultValue: 'x' } }

/** Disabled. */
export const Disabled: Story = { args: { disabled: true, defaultValue: 'Locked after approval.' } }
