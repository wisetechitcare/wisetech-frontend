import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { MasterList, type MasterItem } from './master-list'

const START: MasterItem[] = [
  { id: '1', name: 'Website', tone: 'blue', caption: 'Used by 214 leads' },
  { id: '2', name: 'Referral', tone: 'green', caption: 'Used by 88 leads' },
  { id: '3', name: 'Trade show', tone: 'amber', caption: 'Used by 31 leads' },
  { id: '4', name: 'Walk-in', tone: 'slate', caption: 'System value', badge: 'Default', locked: true },
]

const onDelete = fn()
const onEdit = fn()

function Harness({ reorderable = true }: { reorderable?: boolean }) {
  const [items, setItems] = React.useState(START)
  return (
    <div className="max-w-lg">
      <MasterList
        label="Lead sources"
        items={items}
        onReorder={reorderable ? setItems : undefined}
        onAdd={(name) => setItems((xs) => [...xs, { id: String(xs.length + 1), name, tone: 'purple' }])}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <p data-testid="order" className="sr-only">{items.map((i) => i.name).join(',')}</p>
    </div>
  )
}

/**
 * The editable list behind a configuration master. Replaces the live `MasterListSection` rows,
 * `ConfigColorChip` and `ReorderableGroup` + `DragHandle`. The caller owns the data.
 */
const meta = {
  title: 'Patterns/Master List',
  component: MasterList,
  args: { label: 'Lead sources', items: START },
  render: () => <Harness />,
  beforeEach: () => {
    onDelete.mockReset()
    onEdit.mockReset()
  },
} satisfies Meta<typeof MasterList>

export default meta
type Story = StoryObj<typeof meta>

/** Add with Enter; a duplicate is refused with a reason. */
export const AddValue: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByLabelText('Add to Lead sources')
    await userEvent.type(box, 'LinkedIn{Enter}')
    await expect(canvas.getByText('LinkedIn')).toBeInTheDocument()
    await userEvent.type(box, 'referral')
    await expect(canvas.getByText(/is already in the list/)).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()

    // The Add button nests evenly inside the pill: the same ring top, bottom and right (within a pixel).
    const button = canvas.getByRole('button', { name: 'Add' }).getBoundingClientRect()
    const group = box.closest('[data-slot="input-group"]')!.getBoundingClientRect()
    const top = button.top - group.top
    const bottom = group.bottom - button.bottom
    const right = group.right - button.right
    await expect(Math.abs(top - bottom)).toBeLessThanOrEqual(1)
    await expect(Math.abs(right - top)).toBeLessThanOrEqual(1)
  },
}

/** Keyboard reorder: focus a handle, press ArrowDown; the move is announced. */
export const KeyboardReorder: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: /Move Website/ }).focus()
    await userEvent.keyboard('{ArrowDown}')
    await waitFor(() => expect(canvas.getByTestId('order')).toHaveTextContent('Referral,Website,Trade show,Walk-in'))
    await expect(canvas.getByText('Website moved to position 2 of 4.')).toBeInTheDocument()
  },
}

/** Row actions are named; a system row has none. */
export const RowActions: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete Trade show' }))
    await expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ name: 'Trade show' }))
    await expect(canvas.queryByRole('button', { name: 'Delete Walk-in' })).not.toBeInTheDocument()
    // Row actions carry a Tooltip; judge the page once it has faded.
    await animationsSettled()
  },
}

/** Fixed order (no `onReorder`): no handles. */
export const FixedOrder: Story = { render: () => <Harness reorderable={false} /> }

const onRename = fn()

function TownsHarness({ canWrite = true }: { canWrite?: boolean }) {
  const [items, setItems] = React.useState<MasterItem[]>([
    { id: 't1', name: 'Andheri', tone: 'cyan' },
    { id: 't2', name: 'Bandra', tone: 'cyan' },
    { id: 't3', name: 'Thane', tone: 'cyan' },
  ])
  return (
    <div className="w-[min(720px,calc(100vw-2rem))]">
      <MasterList
        label="Towns"
        items={items}
        layout="grid"
        filterOnType
        addLabel="Add town"
        addPlaceholder={canWrite ? 'Town name, e.g. Andheri' : 'Town name'}
        onAdd={canWrite ? (name) => setItems((xs) => [...xs, { id: `t${xs.length + 1}`, name, tone: 'cyan' }]) : undefined}
        onRename={
          canWrite
            ? (item, name) => {
                onRename(item.name, name)
                setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, name } : x)))
              }
            : undefined
        }
      />
    </div>
  )
}

/** Towns-style master: tiles, the box narrows the list as you type, and a value is renamed in place. */
export const FilterAndRenameTiles: Story = {
  render: () => <TownsHarness />,
  beforeEach: () => {
    onRename.mockReset()
  },
  play: async ({ canvas }) => {
    const box = canvas.getByRole('textbox', { name: 'Add to Towns' })
    await userEvent.type(box, 'th')
    await expect(canvas.getByText('Thane')).toBeInTheDocument()
    await expect(canvas.queryByText('Bandra')).not.toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await expect(canvas.getByText('Bandra')).toBeInTheDocument()

    await userEvent.click(canvas.getByRole('button', { name: 'Rename Thane' }))
    const field = canvas.getByRole('textbox', { name: 'Rename Thane' })
    await userEvent.clear(field)
    await userEvent.type(field, 'bandra')
    await expect(canvas.getByText(/is already in the list/)).toBeInTheDocument()
    await userEvent.clear(field)
    await userEvent.type(field, 'Thane West{Enter}')
    await waitFor(() => expect(onRename).toHaveBeenCalledWith('Thane', 'Thane West'))
    await expect(canvas.getByText('Thane West')).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Without `onAdd` (no Write access) the same box is a search box; nothing can be added or renamed. */
export const SearchOnly: Story = {
  render: () => <TownsHarness canWrite={false} />,
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('textbox', { name: 'Find in Towns' }), 'and')
    await expect(canvas.getByText('Andheri')).toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Rename/ })).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: /Add town/i })).not.toBeInTheDocument()
  },
}

/** No values yet: the caller's Empty State takes the list's place. */
export const EmptySlot: Story = {
  args: { items: [], empty: <p className="text-sm text-muted-foreground">No towns yet.</p> },
  render: (args) => <div className="max-w-lg"><MasterList {...args} /></div>,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No towns yet.')).toBeInTheDocument()
  },
}

/** A rename whose save fails keeps the field open with what was typed (the caller reports the error). */
export const RenameFailureKeepsField: Story = {
  args: {
    items: [{ id: 'x1', name: 'Andheri', tone: 'cyan' }],
    onRename: () => Promise.reject(new Error('offline')),
  },
  render: (args) => <div className="max-w-lg"><MasterList {...args} /></div>,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Rename Andheri' }))
    const field = canvas.getByRole('textbox', { name: 'Rename Andheri' })
    await userEvent.clear(field)
    await userEvent.type(field, 'Andheri East{Enter}')
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Rename Andheri' })).toHaveValue('Andheri East'))
    await animationsSettled()
  },
}
