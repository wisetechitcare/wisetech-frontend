import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Check, Pencil, Trash2, Users } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { RowAction } from './row-action'

const onRowClick = fn()
const onEdit = fn()

/**
 * An icon action on a row or card: the Button `Tinted` recipe, its label in a Tooltip and as the
 * accessible name. Replaces the live `ActionIconButton` and hand-rolled tinted icon buttons in rows.
 */
const meta = {
  title: 'Patterns/Row Action',
  component: RowAction,
  args: { label: 'Edit', onClick: onEdit, children: <Pencil aria-hidden /> },
  beforeEach: () => {
    onRowClick.mockReset()
    onEdit.mockReset()
  },
} satisfies Meta<typeof RowAction>

export default meta
type Story = StoryObj<typeof meta>

/** The set a row usually carries; destructive actions take the danger tint. */
export const Tints: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <RowAction label="View employees" onClick={fn()}><Users aria-hidden /></RowAction>
      <RowAction label="Edit" onClick={fn()}><Pencil aria-hidden /></RowAction>
      <RowAction label="Approve" tint="success" onClick={fn()}><Check aria-hidden /></RowAction>
      <RowAction label="Delete" tint="danger" onClick={fn()}><Trash2 aria-hidden /></RowAction>
    </div>
  ),
}

/** Keyboard focus shows the label; the label is also the button's name. */
export const LabelOnFocus: Story = {
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Edit' })).toHaveFocus()
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Edit'))
    await animationsSettled()
  },
}

/** Inside a clickable row the action runs alone — the row's own click does not fire. */
export const InsideAClickableRow: Story = {
  render: (args) => (
    <div onClick={onRowClick} className="flex w-80 items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm font-semibold">Pune branch</span>
      <RowAction {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
    await expect(onEdit).toHaveBeenCalledOnce()
    await expect(onRowClick).not.toHaveBeenCalled()
  },
}
