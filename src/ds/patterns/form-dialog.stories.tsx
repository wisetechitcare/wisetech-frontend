import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { BarChart3, Briefcase, Building2, ChevronLeft, ChevronRight, IdCard, Landmark, UserRound, UserPlus } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from '@/ds/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/ds/ui/field'
import { Input } from '@/ds/ui/input'
import { Textarea } from '@/ds/ui/textarea'
import { AutoGrid } from './auto-grid'
import { DescriptionList } from './description-list'
import { FormDialog, FormDialogActions } from './form-dialog'
import { Stepper } from './stepper'
import { DateRangePicker } from '@/ds/ui/date-picker'
import { parseDate } from '@internationalized/date'

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

/**
 * Wide form (`size="2xl"`): a long form on a wide screen uses the width. Each section's fields sit in an
 * `AutoGrid stretch` — two or three across while there is room, one column on a phone — instead of one long column
 * that scrolls. A field that needs the whole row (an address) takes `col-span-full`.
 */
export const WideForm: Story = {
  render: () => (
    <OpenButton label="New branch">
      {(open, setOpen) => (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title="New branch"
          icon={<Building2 />}
          tone="cyan"
          size="2xl"
          formId="wide-branch"
          sections={[{ id: 'wide-details', label: 'Branch details' }, { id: 'wide-location', label: 'Location' }]}
        >
          <form id="wide-branch" onSubmit={(e) => e.preventDefault()} className="space-y-8">
            <section id="wide-details" aria-labelledby="wide-details-h" className="scroll-mt-4 space-y-4">
              <h3 id="wide-details-h" className="text-base font-medium">Branch details</h3>
              <AutoGrid min={220} stretch>
                <Field><FieldLabel htmlFor="wide-name">Branch name</FieldLabel><Input id="wide-name" required /></Field>
                <Field><FieldLabel htmlFor="wide-code">Branch code</FieldLabel><Input id="wide-code" /></Field>
              </AutoGrid>
            </section>
            <section id="wide-location" aria-labelledby="wide-location-h" className="scroll-mt-4 space-y-4">
              <h3 id="wide-location-h" className="text-base font-medium">Location</h3>
              <AutoGrid min={220} stretch>
                <Field><FieldLabel htmlFor="wide-city">City</FieldLabel><Input id="wide-city" required /></Field>
                <Field><FieldLabel htmlFor="wide-state">State</FieldLabel><Input id="wide-state" required /></Field>
                <Field><FieldLabel htmlFor="wide-postal">Postal code</FieldLabel><Input id="wide-postal" required /></Field>
                <Field className="col-span-full"><FieldLabel htmlFor="wide-address">Address</FieldLabel><Textarea id="wide-address" /></Field>
              </AutoGrid>
            </section>
          </form>
        </FormDialog>
      )}
    </OpenButton>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'New Branch' }))
    const dialog = await screen.findByRole('dialog', { name: 'New Branch' })
    await waitFor(() => expect(dialog).toBeVisible())
    // On a wide screen the location fields share one row; the address takes a row of its own.
    const top = (label: string) => screen.getByLabelText(label).getBoundingClientRect().top
    if (window.innerWidth >= 1024) {
      await expect(Math.round(top('City'))).toBe(Math.round(top('State')))
      await expect(Math.round(top('State'))).toBe(Math.round(top('Postal Code')))
      await expect(top('Address')).toBeGreaterThan(top('City'))
    }
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
          <FormDialogActions onCancel={requestClose}>
            {step > 0 && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStep(step - 1)}>
                <ChevronLeft data-icon="inline-start" aria-hidden /> Back
              </Button>
            )}
            <Button
              className="w-full sm:min-w-28 sm:w-auto"
              onClick={() => (last ? setOpen(false) : setStep(step + 1))}
            >
              {last ? 'Send offer' : (
                <>
                  Next <ChevronRight data-icon="inline-end" aria-hidden />
                </>
              )}
            </Button>
          </FormDialogActions>
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

/** A part with validation errors is flagged in the rail — dot, red ink and words — so an off-screen error is found. */
export const SectionsFlagErrors: Story = {
  render: () => (
    <OpenButton label="Edit employee">
      {(open, setOpen) => (
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title="Edit employee"
          icon={<UserRound />}
          size="lg"
          formId="edit-emp-errors"
          sections={SECTIONS.map((s) => (s.id === 'sec-bank' ? { ...s, invalid: true } : s))}
        >
          <form id="edit-emp-errors" onSubmit={(e) => e.preventDefault()} className="space-y-8">
            {SECTIONS.map((sec) => (
              <section key={sec.id} id={sec.id} aria-labelledby={`${sec.id}-eh`} className="scroll-mt-4 space-y-4">
                <h3 id={`${sec.id}-eh`} className="text-base font-medium">{sec.label}</h3>
                <Field>
                  <FieldLabel htmlFor={`${sec.id}-e`}>{sec.label} field</FieldLabel>
                  <Input id={`${sec.id}-e`} />
                </Field>
              </section>
            ))}
          </form>
        </FormDialog>
      )}
    </OpenButton>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Employee' }))
    await screen.findByRole('navigation', { name: 'Form sections' })
    const bank = screen.getByRole('link', { name: 'Bank (has errors)' })
    await expect(bank).toHaveAttribute('data-invalid')
    await expect(screen.getByRole('link', { name: 'Job' })).not.toHaveAttribute('data-invalid')
    await animationsSettled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Pickers inside the dialog: the date popover portals out, yet using it keeps the dialog open. */
export const PickerInsideDialog: Story = {
  render: () => (
    <OpenButton label="Edit fiscal year">
      {(open, setOpen) => (
        <FormDialog open={open} onOpenChange={setOpen} title="Edit fiscal year" icon={<Building2 />} formId="fy" >
          <form id="fy" onSubmit={(e) => e.preventDefault()}>
            <DateRangePicker
              label="Fiscal year"
              presets={[{ label: 'Apr–Mar', value: { start: parseDate('2026-04-01'), end: parseDate('2027-03-31') } }]}
            />
          </form>
        </FormDialog>
      )}
    </OpenButton>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit Fiscal Year' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit Fiscal Year' })
    await userEvent.click(within(dialog).getByRole('button', { name: /calendar/i }))
    await userEvent.click(await screen.findByRole('button', { name: 'Apr–Mar' }))
    await waitFor(() => expect(within(dialog).getByRole('group', { name: 'Fiscal Year' })).toHaveTextContent('2026.04.01–2027.03.31'))
    await expect(screen.getByRole('dialog', { name: 'Edit Fiscal Year' })).toBeInTheDocument()
    await animationsSettled()
  },
}
