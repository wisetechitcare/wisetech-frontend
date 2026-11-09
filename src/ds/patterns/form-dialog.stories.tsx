import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { BarChart3, Briefcase, Building2, IdCard, Landmark, UserRound, UserPlus } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { DescriptionList } from './description-list'
import { FormDialog } from './form-dialog'
import { Stepper } from './stepper'

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
    await userEvent.click(canvas.getByRole('button', { name: 'Add Branch' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add Branch' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.type(screen.getByLabelText('Branch Name'), 'Pune')
    await userEvent.click(screen.getAllByRole('button', { name: 'Add Branch' }).at(-1)!)
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Pune'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Closing with unsaved changes asks first; "Keep editing" keeps what was typed. */
export const DirtyCloseAsks: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add Branch' }))
    await screen.findByRole('dialog', { name: 'Add Branch' })
    await userEvent.type(screen.getByLabelText('Branch Name'), 'Pune')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(await screen.findByRole('alertdialog', { name: 'Discard Unsaved Changes?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await expect(screen.getByLabelText('Branch Name')).toHaveValue('Pune')
    await animationsSettled()
  },
}

/** Clean form: Cancel closes straight away. */
export const CleanCloseIsImmediate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add Branch' }))
    await screen.findByRole('dialog', { name: 'Add Branch' })
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await animationsSettled()
  },
}

function OpenButton({ label, children }: { label: string; children: (open: boolean, setOpen: (o: boolean) => void) => React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      {children(open, setOpen)}
    </>
  )
}

const SECTIONS = [
  { id: 'sec-personal', label: 'Personal', icon: <UserRound aria-hidden /> },
  { id: 'sec-job', label: 'Job', icon: <Briefcase aria-hidden /> },
  { id: 'sec-identity', label: 'Identity', icon: <IdCard aria-hidden /> },
  { id: 'sec-bank', label: 'Bank', icon: <Landmark aria-hidden /> },
]

/** Long form (live `WtFormDialog`): a section rail on wide screens jumps to each part. */
export const LongFormWithSections: Story = {
  render: () => (
    <OpenButton label="Edit employee">
      {(open, setOpen) => (
        <FormDialog open={open} onOpenChange={setOpen} title="Edit employee" icon={<UserRound />} size="lg" formId="edit-emp" sections={SECTIONS}>
          <form id="edit-emp" onSubmit={(e) => e.preventDefault()} className="space-y-8">
            {SECTIONS.map((sec) => (
              <section key={sec.id} id={sec.id} aria-labelledby={`${sec.id}-h`} className="scroll-mt-4 space-y-4">
                <h3 id={`${sec.id}-h`} className="text-base font-medium">{sec.label}</h3>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`${sec.id}-a`}>{sec.label} field one</FieldLabel>
                    <Input id={`${sec.id}-a`} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${sec.id}-b`}>{sec.label} field two</FieldLabel>
                    <Input id={`${sec.id}-b`} />
                  </Field>
                </FieldGroup>
              </section>
            ))}
          </form>
        </FormDialog>
      )}
    </OpenButton>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Employee' }))
    const nav = await screen.findByRole('navigation', { name: 'Form sections' })
    await expect(nav).toBeInTheDocument()
    await expect(screen.getByRole('link', { name: 'Bank' })).toHaveAttribute('href', '#sec-bank')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

const WIZARD = [{ label: 'Candidate' }, { label: 'Offer' }, { label: 'Review' }]

function OfferWizard() {
  const [open, setOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const last = step === WIZARD.length - 1
  return (
    <>
      <Button onClick={() => { setStep(0); setOpen(true) }}>Make an offer</Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Make an offer"
        icon={<UserPlus />}
        tone="purple"
        dirty={step > 0}
        subheader={<Stepper steps={WIZARD} activeStep={step} />}
        footer={(requestClose) => (
          <>
            <Button variant="ghost" onClick={requestClose}>Cancel</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
              <Button onClick={() => (last ? setOpen(false) : setStep(step + 1))}>{last ? 'Send offer' : 'Next'}</Button>
            </div>
          </>
        )}
      >
        <p className="text-sm text-muted-foreground">Step content for “{WIZARD[step].label}”.</p>
      </FormDialog>
    </>
  )
}

/** Wizard (live `WtWizardDialog`): Stepper above, Back / Next / Finish below; closing mid-way asks first. */
export const Wizard: Story = {
  render: () => <OfferWizard />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Make an Offer' }))
    await screen.findByRole('dialog', { name: 'Make an Offer' })
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await expect(screen.getByText(/Step content for “Offer”/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await expect(await screen.findByRole('alertdialog', { name: 'Discard Unsaved Changes?' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Keep Editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Read-only, large (live `DrillDownDialog`): no `formId`, one Close button. */
export const ReadOnlyDrillDown: Story = {
  render: () => (
    <OpenButton label="View breakdown">
      {(open, setOpen) => (
        <FormDialog open={open} onOpenChange={setOpen} title="Late arrivals — October" description="By branch" icon={<BarChart3 />} tone="amber" size="xl">
          <DescriptionList
            rows={[
              { label: 'Mumbai — Andheri', value: '41' },
              { label: 'Pune', value: '18' },
              { label: 'Dubai', value: '7' },
              { label: 'Total', value: '66', strong: true },
            ]}
          />
        </FormDialog>
      )}
    </OpenButton>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'View Breakdown' }))
    await screen.findByRole('dialog', { name: 'Late Arrivals — October' })
    await expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
