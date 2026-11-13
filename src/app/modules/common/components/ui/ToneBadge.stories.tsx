import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ToneBadge } from './ToneBadge'

/**
 * The v2 `Badge`, addressed by the kit's semantic tone names — the migration path off `ToneChip`:
 * `<ToneChip dense tone="success" label="Approved" />` becomes `<ToneBadge tone="success">Approved</ToneBadge>`.
 * Every tone carries a dot and a label, so status is never colour alone.
 */
const meta = {
  title: 'Components/Tone Badge',
  component: ToneBadge,
  args: { tone: 'success', children: 'Approved' },
} satisfies Meta<typeof ToneBadge>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Approved')).toBeInTheDocument()
  },
}

/** Every kit tone, with the Badge variant it maps to. `indigo` shares brand, `cyan` is info. */
export const AllTones: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <ToneBadge tone="brand">Brand</ToneBadge>
      <ToneBadge tone="success">Approved</ToneBadge>
      <ToneBadge tone="warning">Pending</ToneBadge>
      <ToneBadge tone="danger">Rejected</ToneBadge>
      <ToneBadge tone="cyan">Partially paid</ToneBadge>
      <ToneBadge tone="indigo">Indigo</ToneBadge>
      <ToneBadge tone="neutral">Responded</ToneBadge>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText(/./).length).toBeGreaterThanOrEqual(7)
  },
}
