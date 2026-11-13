import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { DescriptionList } from './description-list'
import { SensitiveProvider, SensitiveToggle, SensitiveValue, useSensitive } from './sensitive'

/**
 * One eye switch hides every amount on the screen — salary, reimbursements, loans. Replaces the live
 * `SensitiveData`. Hidden figures are hidden from screen readers too, not just blurred.
 */
const meta = {
  title: 'Patterns/Sensitive Value',
  component: SensitiveProvider,
  args: { children: null },
  render: (args) => (
    <SensitiveProvider defaultVisible={args.defaultVisible} disabled={args.disabled}>
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

/**
 * A page-level provider above tabs where only some tabs offer the eye: `disabled` hides nothing, so a tab
 * with no switch never blurs figures the reader cannot reveal. The toggle's state is kept meanwhile.
 */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('₹1,12,400')).toBeVisible()
    await expect(canvas.queryByText('Hidden', { selector: '.sr-only' })).not.toBeInTheDocument()
  },
}

/** A provider nested in another defers to it: ONE switch governs every figure below, whatever the inner asked for. */
export const Nested: Story = {
  render: () => (
    <SensitiveProvider>
      <div className="max-w-md space-y-3">
        <SensitiveToggle />
        <SensitiveProvider defaultVisible>
          <p className="text-sm">
            Reimbursed this month: <SensitiveValue>₹18,450</SensitiveValue>
          </p>
        </SensitiveProvider>
      </div>
    </SensitiveProvider>
  ),
  play: async ({ canvas }) => {
    // The inner provider asked to open revealed; the outer one wins.
    await expect(canvas.getByText('Hidden', { selector: '.sr-only' })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Show amounts' }))
    await waitFor(() => expect(canvas.getByText('₹18,450')).toBeVisible())
  },
}

/** `variant="onPrimary"`: the eye for the primary-coloured sticky tab bar. Resize below 640px: the label drops, the icon stays. */
export const OnPrimary: Story = {
  render: () => (
    <SensitiveProvider>
      <div className="flex max-w-xl items-center justify-between gap-3 rounded-xl bg-primary p-2 text-primary-foreground">
        <span className="px-2 text-sm font-semibold">My reimbursements</span>
        <SensitiveToggle variant="onPrimary" />
      </div>
      <p className="mt-3 text-sm">
        Total: <SensitiveValue>₹18,450</SensitiveValue>
      </p>
    </SensitiveProvider>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Show amounts' })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(canvas.getByText('₹18,450')).toBeVisible())
  },
}

function MaskedCsvPreview() {
  const { visible } = useSensitive()
  return (
    <pre className="rounded-lg bg-muted p-3 text-xs">{`employee,amount
Asha,${visible ? '18450' : '••••'}`}</pre>
  )
}

/** `useSensitive()` for code that must branch on visibility (charts, exports) rather than wrap a figure. */
export const UseSensitiveHook: Story = {
  render: () => (
    <SensitiveProvider>
      <div className="max-w-md space-y-3">
        <SensitiveToggle />
        <MaskedCsvPreview />
      </div>
    </SensitiveProvider>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/••••/)).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Show amounts' }))
    await waitFor(() => expect(canvas.getByText(/18450/)).toBeInTheDocument())
  },
}
