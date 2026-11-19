import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Flag } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { OptionPickerDialog, OptionPickerTrigger, type PickerOption } from './option-picker-dialog'

const onConfirm = fn()

const STATUSES: PickerOption[] = [
  { id: 'cancelled', name: 'Cancelled', color: '#f59e0b' },
  { id: 'completed', name: 'Completed', color: '#22c55e' },
  { id: 'partly', name: 'Completed Partly', color: '#eab308' },
  { id: 'hold', name: 'On Hold', color: '#ef4444' },
  { id: 'ongoing', name: 'On Ongoing', color: '#3b82f6' },
]

function StatusHarness() {
  const [open, setOpen] = React.useState(false)
  const [current, setCurrent] = React.useState('ongoing')
  const [draft, setDraft] = React.useState(current)
  return (
    <>
      <OptionPickerTrigger
        label="Project"
        value={STATUSES.find((s) => s.id === current)!.name}
        color={STATUSES.find((s) => s.id === current)!.color}
        onClick={() => {
          setDraft(current)
          setOpen(true)
        }}
      />
      <OptionPickerDialog
        open={open}
        onOpenChange={setOpen}
        title="Project status"
        description="Choose how this project is progressing"
        icon={<Flag />}
        options={STATUSES}
        value={draft}
        currentId={current}
        onValueChange={setDraft}
        confirmDisabled={draft === current}
        onConfirm={() => {
          onConfirm(draft)
          setCurrent(draft)
          setOpen(false)
        }}
      />
    </>
  )
}

/**
 * Choose one thing from a short list in a dialog (project status, lead stage, priority). Replaces the live
 * `OptionPickerDialog`. Real radios; Confirm stays off until the choice changes.
 */
const meta = {
  title: 'Patterns/Option Picker Dialog',
  component: OptionPickerDialog,
  args: {
    open: false, onOpenChange: fn(), title: '', options: STATUSES, value: null, onValueChange: fn(), onConfirm: fn(),
  },
  render: () => <StatusHarness />,
  beforeEach: () => {
    onConfirm.mockReset()
  },
} satisfies Meta<typeof OptionPickerDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Pick another status and confirm; the current one is already chosen, so Confirm starts off. */
export const ChangeStatus: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /On Ongoing/ }))
    await screen.findByRole('dialog', { name: 'Project Status' })
    await expect(screen.getByRole('radio', { name: /On Ongoing/ })).toBeChecked()
    const confirm = screen.getByRole('button', { name: 'Confirm' })
    await expect(confirm).toBeDisabled()
    await userEvent.click(screen.getByText('On Hold'))
    await waitFor(() => expect(screen.getByRole('radio', { name: /On Hold/ })).toBeChecked())
    await expect(confirm).toBeEnabled()
    await userEvent.click(confirm)
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('hold'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(canvas.getByRole('button', { name: /On Hold/ })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Without write access the trigger is a plain tag: same look, nothing to click. */
export const ReadOnlyTrigger: Story = {
  render: () => <OptionPickerTrigger label="Project" value="On Hold" color="#ef4444" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('On Hold')).toBeVisible()
    await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
  },
}
