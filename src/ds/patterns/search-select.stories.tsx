import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Bike, Car, Hotel, Utensils } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { SearchSelect, type SearchSelectOption } from './search-select'

const PROJECTS: SearchSelectOption[] = [
  { value: 'p1', label: 'Andheri Metro — Phase 2' },
  { value: 'p2', label: 'BKC Tower Fit-out' },
  { value: 'p3', label: 'Pune Data Centre' },
  { value: 'p4', label: 'Riyadh Mall Signage' },
]

const CATEGORIES: SearchSelectOption[] = [
  { value: 'bike', label: 'Bike', icon: <Bike /> },
  { value: 'cab', label: 'Cab', icon: <Car /> },
  { value: 'hotel', label: 'Hotel', icon: <Hotel /> },
  { value: 'meal', label: 'Meal', icon: <Utensils /> },
]

function Controlled(props: Partial<React.ComponentProps<typeof SearchSelect>> & { initial?: string | null }) {
  const [value, setValue] = React.useState<string | null>(props.initial ?? null)
  return (
    <SearchSelect
      id="project"
      label="Project"
      placeholder="Search projects"
      options={PROJECTS}
      {...props}
      value={value}
      onValueChange={(v, o) => {
        setValue(v)
        props.onValueChange?.(v, o)
      }}
    />
  )
}

/**
 * One value from a searchable list, as a complete field: floating label, clear button, hint or error. Replaces
 * the live kit's `WtField searchable` / `WtSelect`. Controlled by the option value, so any form engine binds it.
 */
const meta = {
  title: 'Patterns/Search Select',
  component: SearchSelect,
  args: { id: 'project', label: 'Project', value: null, options: PROJECTS, onValueChange: fn() },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof SearchSelect>

export default meta
type Story = StoryObj<typeof meta>

/** Type to narrow, pick one; the label floats and a clear button appears. */
export const Default: Story = {
  render: (args) => <Controlled onValueChange={args.onValueChange} hint="Only ongoing projects are listed." />,
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('combobox', { name: 'Project' })
    await expect(input).toHaveAccessibleDescription('Only ongoing projects are listed.')
    await userEvent.type(input, 'pune')
    await userEvent.click(await screen.findByRole('option', { name: 'Pune Data Centre' }))
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith('p3', PROJECTS[2]))
    await waitFor(() => expect(input).toHaveValue('Pune Data Centre'))
    await animationsSettled()
  },
}

/** Clearing empties the value (null) — the caller's dependent fields can reset on it. */
export const Clearable: Story = {
  render: (args) => <Controlled initial="p2" onValueChange={args.onValueChange} />,
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Project' })).toHaveValue('BKC Tower Fit-out')
    await userEvent.click(canvas.getByRole('button', { name: /clear/i }))
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith(null, null))
    await animationsSettled()
  },
}

/** Options with icons — an icon element or an uploaded image URL. */
export const WithIcons: Story = {
  render: () => <Controlled id="category" label="Category" placeholder="Search categories" options={CATEGORIES} initial="cab" />,
}

/** Invalid: red, and the message is linked to the control and announced. */
export const Invalid: Story = {
  render: () => <Controlled required error="Project is required" />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole('combobox', { name: 'Project' })
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(input).toHaveAccessibleDescription('Project is required')
  },
}

/** Disabled until something it depends on is chosen — the hint says what. */
export const DisabledWithReason: Story = {
  render: () => <Controlled id="company" label="Company name (optional)" disabled hint="Choose a company type first." />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Company Name (Optional)' })).toBeDisabled()
  },
}
