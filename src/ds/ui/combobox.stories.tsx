import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import { Label } from './label'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from './combobox'

const BRANCHES = ['Mumbai — Andheri', 'Mumbai — BKC', 'Pune', 'Bengaluru', 'Hyderabad', 'Dubai', 'Riyadh']

/**
 * A searchable picker for long lists — employees, branches, designations. Replaces the live kit's
 * `WtSelect` engine (react-select) and `MultiSelectWithInlineCreate`. A single value is never a dialog.
 */
const meta = {
  title: 'Components/Combobox',
  component: Combobox,
  args: { onValueChange: fn() },
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

/** Type to filter, pick one. */
export const Searchable: Story = {
  render: (args) => (
    <div className="grid w-72 gap-1.5">
      <Label htmlFor="branch">Branch</Label>
      <Combobox items={BRANCHES} onValueChange={args.onValueChange}>
        <ComboboxInput id="branch" placeholder="Search branches" />
        <ComboboxContent>
          <ComboboxEmpty>No branch matches.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole('combobox', { name: 'Branch' })
    await userEvent.type(input, 'pun')
    await userEvent.click(await screen.findByRole('option', { name: 'Pune' }))
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith('Pune', expect.anything()))
    await waitFor(() => expect(input).toHaveValue('Pune'))
    await animationsSettled()
  },
}

/** Nothing matches: the list says so instead of going blank. */
export const NoMatch: Story = {
  render: () => (
    <div className="grid w-72 gap-1.5">
      <Label htmlFor="branch-none">Branch</Label>
      <Combobox items={BRANCHES}>
        <ComboboxInput id="branch-none" placeholder="Search branches" />
        <ComboboxContent>
          <ComboboxEmpty>No branch matches.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox', { name: 'Branch' }), 'Chennai')
    await expect(await screen.findByText('No branch matches.')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await animationsSettled()
  },
}

function MultiBranches() {
  const anchor = useComboboxAnchor()
  return (
    <div className="grid w-96 gap-1.5">
      <Label id="branches-label">Branches</Label>
      <Combobox multiple autoHighlight items={BRANCHES} defaultValue={['Pune', 'Dubai']}>
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values: string[]) => (
              <React.Fragment>
                {values.map((v) => (
                  <ComboboxChip key={v}>{v}</ComboboxChip>
                ))}
                <ComboboxChipsInput aria-labelledby="branches-label" placeholder="Add a branch" />
              </React.Fragment>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No branch matches.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

/** Several values as removable chips. */
export const Multiple: Story = {
  render: () => <MultiBranches />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Pune')).toBeInTheDocument()
    await expect(canvas.getByText('Dubai')).toBeInTheDocument()
  },
}

const DESIGNATIONS = ['MEP Engineer', 'Site Supervisor', 'Draughtsman', 'HR Executive']

function WithCreate() {
  const [items, setItems] = React.useState(DESIGNATIONS)
  const [value, setValue] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState('')
  const exists = items.some((i) => i.toLowerCase() === query.trim().toLowerCase())
  return (
    <div className="grid w-72 gap-1.5">
      <Label htmlFor="designation">Designation</Label>
      <Combobox items={items} value={value} onValueChange={setValue} inputValue={query} onInputValueChange={setQuery}>
        <ComboboxInput id="designation" placeholder="Search or add" />
        <ComboboxContent>
          <ComboboxEmpty>
            {query.trim() && !exists ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  const next = query.trim()
                  setItems((xs) => [...xs, next])
                  setValue(next)
                }}
              >
                + Add “{query.trim()}”
              </Button>
            ) : (
              'No designation matches.'
            )}
          </ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}

/** Inline "+ Add": when nothing matches, offer to create it (live `WtAddOption` / `MultiSelectWithInlineCreate`). */
export const InlineCreate: Story = {
  render: () => <WithCreate />,
  play: async ({ canvas }) => {
    // Keep the element: while the popup is open the page is hidden from assistive tech, so role queries miss it.
    const input = canvas.getByRole('combobox', { name: 'Designation' })
    await userEvent.type(input, 'Quantity Surveyor')
    await userEvent.click(await screen.findByRole('button', { name: /Add “Quantity Surveyor”/ }))
    await waitFor(() => expect(input).toHaveValue('Quantity Surveyor'))
    await userEvent.keyboard('{Escape}')
    await animationsSettled()
  },
}
