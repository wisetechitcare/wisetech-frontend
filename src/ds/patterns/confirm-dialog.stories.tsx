import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from '@/ds/ui/button'
import { Field, FieldLabel } from '@/ds/ui/field'
import { Textarea } from '@/ds/ui/textarea'
import { ConfirmDialog, type ConfirmVariant } from './confirm-dialog'

type Props = React.ComponentProps<typeof ConfirmDialog>

/** Story harness: a button that opens the dialog, the way screens use it. */
function Harness({ trigger, ...props }: Omit<Props, 'open' | 'onOpenChange'> & { trigger: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>{trigger}</Button>
      <ConfirmDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  )
}

const onConfirm = fn()

/**
 * A decision before continuing, or a notice to acknowledge. Replaces the live kit's `ConfirmDialog`,
 * `confirmDialog()` / `alertDialog()` and SweetAlert. The confirm button names the action.
 */
const meta = {
  title: 'Patterns/Confirm Dialog',
  component: ConfirmDialog,
  args: { open: false, onOpenChange: fn(), title: '' },
  beforeEach: () => {
    onConfirm.mockReset()
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Delete: destructive confirm, named after the action. */
export const Delete: Story = {
  render: () => (
    <Harness
      trigger="Delete employee"
      variant="delete"
      title="Delete Meera Joshi?"
      description="Her attendance, leave and payslips stay in reports. This cannot be undone."
      confirmLabel="Delete employee"
      onConfirm={onConfirm}
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Employee' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Meera Joshi?' })
    await expect(dialog).toHaveAccessibleDescription(/cannot be undone/)
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete Employee' }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await expect(onConfirm).toHaveBeenCalledTimes(1)
    await animationsSettled()
  },
}

/** An async action: spinner while it runs; a failure keeps the dialog open to retry. */
export const AsyncFailureStaysOpen: Story = {
  render: () => (
    <Harness
      trigger="Run payroll"
      variant="warning"
      title="Run October payroll?"
      description="248 payslips will be generated and locked."
      confirmLabel="Run payroll"
      onConfirm={() => {
        onConfirm()
        return Promise.reject(new Error('Bank file failed'))
      }}
    />
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Run Payroll' }))
    await screen.findByRole('alertdialog')
    await userEvent.click(screen.getAllByRole('button', { name: 'Run Payroll' }).at(-1)!)
    await waitFor(() => expect(onConfirm).toHaveBeenCalled())
    await expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Run Payroll' }).at(-1)).toBeEnabled())
    await animationsSettled()
  },
}

/** Extra content: a reason field the decision needs. */
export const WithReason: Story = {
  render: () => (
    <Harness trigger="Reject request" variant="confirm" title="Reject Tara's leave request?" confirmLabel="Reject request">
      <Field>
        <FieldLabel htmlFor="reject-reason">Reason (sent to Tara)</FieldLabel>
        <Textarea id="reject-reason" placeholder="Project deadline that week" />
      </Field>
    </Harness>
  ),
}

/** Discard with a third choice. */
export const DiscardWithDraft: Story = {
  render: () => (
    <Harness
      trigger="Close wizard"
      variant="discard"
      title="Discard unsaved changes?"
      description="Your changes to this employee haven't been saved."
      cancelLabel="Keep editing"
      secondaryAction={{ label: 'Save as draft', onClick: () => undefined }}
    />
  ),
}

const NOTICES: Array<[ConfirmVariant, string, string]> = [
  ['success', 'Payslips sent', '248 employees received their October payslip.'],
  ['info', 'Probation extended', 'Ishaan Verma stays on probation until 12 December.'],
  ['error', "Couldn't send payslips", 'The mail server rejected the batch. Nothing was sent.'],
]

/** Notices: one acknowledge button (`showCancel={false}`). */
export const Notices: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {NOTICES.map(([variant, title, description]) => (
        <Harness key={variant} trigger={`Show ${variant}`} variant={variant} title={title} description={description} showCancel={false} />
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show Success' }))
    await expect(await screen.findByRole('alertdialog', { name: 'Payslips Sent' })).toBeInTheDocument()
    await expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
