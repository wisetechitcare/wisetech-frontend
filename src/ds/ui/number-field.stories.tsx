import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { NumberField } from './number-field'

/**
 * Locale-formatted number entry on React Aria. en-IN groups digits as 1,00,000; currency comes
 * from `formatOptions`. The value is always a plain number; steppers and arrow keys move by `step`.
 */
const meta = {
  title: 'Components/NumberField',
  component: NumberField,
  args: {
    label: 'Monthly basic pay',
    formatOptions: { style: 'currency', currency: 'INR' },
    step: 500,
    minValue: 0,
    onChange: fn(),
  },
  render: (args) => (
    <div className="w-72">
      <NumberField {...args} />
    </div>
  ),
} satisfies Meta<typeof NumberField>

export default meta
type Story = StoryObj<typeof meta>

/** Typed digits are formatted as INR with Indian grouping on blur; ArrowUp adds one `step`. */
export const Rupees: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Monthly basic pay' })
    await userEvent.type(input, '100000')
    await userEvent.tab()
    await expect(input).toHaveValue('₹1,00,000.00')
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith(100000))
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowUp}')
    await expect(input).toHaveValue('₹1,00,500.00')
    await expect(args.onChange).toHaveBeenLastCalledWith(100500)
  },
}

/** Values past `maxValue` clamp on blur, and the increase button disables at the limit. */
export const ClampsToMax: Story = {
  args: { maxValue: 200000, description: 'Up to ₹2,00,000 for this grade.' },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Monthly basic pay' })
    await userEvent.type(input, '250000')
    await userEvent.tab()
    await expect(input).toHaveValue('₹2,00,000.00')
    await expect(args.onChange).toHaveBeenLastCalledWith(200000)
    await expect(canvas.getByRole('button', { name: /increase/i })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: /decrease/i }))
    await expect(input).toHaveValue('₹1,99,500.00')
  },
}
