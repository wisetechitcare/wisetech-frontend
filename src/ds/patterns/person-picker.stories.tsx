import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Field, FieldLabel } from '@/ds/ui/field'
import { PersonPicker, type PersonOption } from './person-picker'

const PEOPLE: PersonOption[] = [
  { id: '42', name: 'Meera Joshi', code: 'WT-0042', subtitle: 'Senior MEP Engineer' },
  { id: '17', name: 'Arjun Rao', code: 'WT-0017', subtitle: 'Engineering Manager' },
  { id: '88', name: 'Tara Menon', code: 'WT-0088', subtitle: 'HR Executive' },
  { id: '91', name: 'Tara Menon', code: 'WT-0091', subtitle: 'Site Supervisor' },
  { id: '23', name: 'Ishaan Verma', code: 'WT-0023', subtitle: 'Draughtsman' },
]

function Single() {
  const [ids, setIds] = React.useState<string[]>([])
  return (
    <Field className="max-w-sm">
      <FieldLabel htmlFor="manager">Reporting manager</FieldLabel>
      <PersonPicker id="manager" people={PEOPLE} value={ids} onChange={setIds} />
      <p className="text-xs text-muted-foreground" data-testid="chosen">{ids.join(',') || 'none'}</p>
    </Field>
  )
}

function Multiple() {
  const [ids, setIds] = React.useState<string[]>(['42'])
  return (
    <div className="grid max-w-md gap-1.5">
      <span id="attendees" className="text-sm font-medium">Interview panel</span>
      <PersonPicker multiple aria-labelledby="attendees" people={PEOPLE} value={ids} onChange={setIds} />
    </div>
  )
}

/**
 * Pick people by name or employee code; avatars, codes and roles tell namesakes apart. Replaces the live
 * `EmployeePickerField`, `AllEmployeesSearchDropdown` and the single-pick `EmployeeSelectionDialog`.
 */
const meta = {
  title: 'Patterns/Person Picker',
  component: PersonPicker,
  args: { people: PEOPLE, value: [], onChange: () => undefined },
  render: () => <Single />,
} satisfies Meta<typeof PersonPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Search by code; the choice is reported as an id. */
export const SearchByCode: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Reporting manager' }), 'WT-0091')
    await userEvent.click(await screen.findByRole('option', { name: /WT-0091/ }))
    await waitFor(() => expect(canvas.getByTestId('chosen')).toHaveTextContent('91'))
    await animationsSettled()
  },
}

/** Two people with the same name are told apart by code and role. */
export const Namesakes: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Reporting manager' }), 'Tara')
    await expect(await screen.findByRole('option', { name: /WT-0088 · HR Executive/ })).toBeInTheDocument()
    await expect(screen.getByRole('option', { name: /WT-0091 · Site Supervisor/ })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await animationsSettled()
  },
}

/** Several people as chips. */
export const MultiplePeople: Story = {
  render: () => <Multiple />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Meera Joshi')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Remove Meera Joshi' })).toBeInTheDocument()
  },
}
