import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Banknote, Landmark, Wallet } from 'lucide-react'

import { ChoiceCards } from './choice-cards'

const onValueChange = fn()

const PAYMENT_OPTIONS = [
  { value: 'salary', label: 'With salary', description: 'Added to the next payroll run.', icon: <Wallet /> },
  { value: 'bank', label: 'Bank transfer', description: 'Paid within 3 working days of approval.', icon: <Landmark /> },
  {
    value: 'cash',
    label: 'Cash',
    icon: <Banknote />,
    disabled: true,
    disabledReason: 'Cash payouts are switched off for this branch.',
  },
]

/**
 * Pick one of a few options that each need a sentence of explanation. Replaces the live `WtChoice` /
 * `WtChoiceField` cards variant. Real radios: arrow keys move between options.
 */
const meta = {
  title: 'Forms/Choice/Choice Cards',
  component: ChoiceCards,
  args: {
    label: 'How is this reimbursement paid?',
    defaultValue: 'salary',
    onValueChange,
    options: PAYMENT_OPTIONS,
  },
  beforeEach: () => {
    onValueChange.mockReset()
  },
  decorators: [(Story) => <div className="max-w-2xl"><Story /></div>],
} satisfies Meta<typeof ChoiceCards<string>>

export default meta
type Story = StoryObj<typeof meta>

/** Clicking anywhere on a card selects it; a disabled card says why. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'How Is This Reimbursement Paid?' })).toBeInTheDocument()
    await userEvent.click(canvas.getByText('Bank Transfer'))
    await waitFor(() => expect(canvas.getByRole('radio', { name: /Bank Transfer/ })).toBeChecked())
    await expect(onValueChange).toHaveBeenCalledWith('bank')
    await expect(canvas.getByText(/switched off for this branch/)).toBeVisible()
  },
}

/** Labels only — no icons or descriptions. */
export const LabelsOnly: Story = {
  args: {
    options: [
      { value: 'salary', label: 'With salary' },
      { value: 'bank', label: 'Bank transfer' },
      { value: 'cash', label: 'Cash' },
    ],
  },
}

/** Descriptions without icons. */
export const WithDescriptions: Story = {
  args: {
    options: [
      { value: 'salary', label: 'With salary', description: 'Added to the next payroll run.' },
      { value: 'bank', label: 'Bank transfer', description: 'Paid within 3 working days of approval.' },
      { value: 'cash', label: 'Cash', description: 'Collect from the accounts desk.' },
    ],
  },
}

/** Whole group disabled via RadioGroup. */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvas }) => {
    for (const radio of canvas.getAllByRole('radio')) {
      await expect(radio).toBeDisabled()
    }
  },
}

/** Three across on wide screens. */
export const ThreeColumns: Story = { args: { columns: 3 } }
