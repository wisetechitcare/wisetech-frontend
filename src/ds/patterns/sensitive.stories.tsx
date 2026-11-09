import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { DescriptionList } from './description-list'
import { SensitiveProvider, SensitiveToggle, SensitiveValue } from './sensitive'

/**
 * One eye switch hides every amount on the screen — salary, reimbursements, loans. Replaces the live
 * `SensitiveData`. Hidden figures are hidden from screen readers too, not just blurred.
 */
const meta = {
  title: 'Patterns/Sensitive Value',
  component: SensitiveProvider,
  args: { children: null },
  render: (args) => (
    <SensitiveProvider defaultVisible={args.defaultVisible}>
      <div className="max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">October salary</h2>
          <SensitiveToggle />
        </div>
        <DescriptionList
          rows={[
            { label: 'Gross', value: <SensitiveValue>₹1,48,000</SensitiveValue> },
            { label: 'Deductions', value: <SensitiveValue>₹35,600</SensitiveValue> },
            { label: 'Net pay', value: <SensitiveValue>₹1,12,400</SensitiveValue>, strong: true },
          ]}
        />
      </div>
    </SensitiveProvider>
  ),
} satisfies Meta<typeof SensitiveProvider>

export default meta
type Story = StoryObj<typeof meta>

/** Hidden by default; the switch reveals every figure at once. */
export const HiddenByDefault: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Show amounts' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await expect(canvas.getAllByText('Hidden', { selector: '.sr-only' })).toHaveLength(3)
    await userEvent.click(toggle)
    await waitFor(() => expect(canvas.getByText('₹1,12,400')).toBeVisible())
    await expect(canvas.queryByText('Hidden', { selector: '.sr-only' })).not.toBeInTheDocument()
  },
}

/** One's own payslip may open revealed. */
export const Revealed: Story = { args: { defaultVisible: true } }
