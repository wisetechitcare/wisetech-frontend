import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Building2 } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { FormDialog } from './form-dialog'

const onSave = fn()

function AddBranch({ slowSave = false }: { slowSave?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add branch</Button>
      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setName('')
        }}
        title="Add branch"
        description="Employees, holidays and the check-in radius are set per branch."
        icon={<Building2 />}
        formId="add-branch"
        submitLabel="Add branch"
        submitting={saving}
        dirty={name.length > 0}
      >
        <form
          id="add-branch"
          onSubmit={async (e) => {
            e.preventDefault()
            setSaving(true)
            if (slowSave) await new Promise((r) => setTimeout(r, 400))
            onSave(name)
            setSaving(false)
            setOpen(false)
            setName('')
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="branch-name">Branch name</FieldLabel>
              <Input id="branch-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="branch-address">Address</FieldLabel>
              <Textarea id="branch-address" />
              <FieldDescription>Used for the office check-in radius.</FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </FormDialog>
    </>
  )
}

/**
 * The dialog shell for creating or editing a record. Replaces the live kit's `GlassDialog` + `GlassHeader`
 * + `GlassDialogActions` and `UnsavedChangesModal`. The Save button submits the body's `<form>`.
 */
const meta = {
  title: 'Patterns/Form Dialog',
  component: FormDialog,
  args: { open: false, onOpenChange: fn(), title: '', children: null },
  render: () => <AddBranch />,
  beforeEach: () => {
    onSave.mockReset()
  },
} satisfies Meta<typeof FormDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Fill in and Save: the form submits through the footer button. */
export const Submit: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add branch' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add branch' })
    await expect(dialog).toBeVisible()
    await userEvent.type(screen.getByLabelText('Branch name'), 'Pune')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add branch' }).at(-1)!)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pune'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Closing with unsaved changes asks first; "Keep editing" keeps what was typed. */
export const DirtyCloseAsks: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add branch' }))
    await screen.findByRole('dialog', { name: 'Add branch' })
    await userEvent.type(screen.getByLabelText('Branch name'), 'Pune')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(await screen.findByRole('alertdialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await expect(screen.getByLabelText('Branch name')).toHaveValue('Pune')
    await animationsSettled()
  },
}

/** Clean form: Cancel closes straight away. */
export const CleanCloseIsImmediate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add branch' }))
    await screen.findByRole('dialog', { name: 'Add branch' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await animationsSettled()
  },
}
