import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
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
  },
}

/** Fixed order (no `onReorder`): no handles. */
export const FixedOrder: Story = { render: () => <Harness reorderable={false} /> }
