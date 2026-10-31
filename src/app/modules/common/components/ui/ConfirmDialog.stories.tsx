import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen } from 'storybook/test'
import { Archive } from 'lucide-react'
import { DialogContent } from '@mui/material'
import { ConfirmDialog } from './ConfirmDialog'
import { GlassDialog } from './glass'
import { GlassDialogActions } from './GlassDialogActions'

/**
 * The common confirm modal (also behind `useConfirmDialog`, `confirmDialog` and `showDialog`).
 * Two CTAs always split the footer 50/50, the same as the kit Dialog's footer.
 */
const meta = {
  title: 'Components/ConfirmDialog',
  component: ConfirmDialog,
  args: {
    open: true,
    variant: 'delete',
    title: 'Archive Gift Run',
    message: 'Archive “Diwali Sweets”? You can unarchive it later.',
    confirmLabel: 'Archive',
    icon: <Archive className="size-6" aria-hidden />,
    onClose: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Cancel and the confirm action share the footer width equally. */
export const TwoButtonFooter: Story = {
  play: async () => {
    const cancel = await screen.findByRole('button', { name: 'Cancel' })
    const confirm = cancel.nextElementSibling as HTMLElement
    const w = (el: HTMLElement) => el.getBoundingClientRect().width
    await expect(Math.abs(w(cancel) - w(confirm))).toBeLessThan(1)
    // Together they fill the footer (minus padding and gap), not two content-sized pills at one end.
    await expect(w(cancel) + w(confirm)).toBeGreaterThan(w(cancel.parentElement!) * 0.8)
  },
}

/** Form dialogs use the same footer (GlassDialogActions): Cancel + Save split 50/50 too. */
export const FormFooter: Story = {
  render: (args) => (
    <GlassDialog open onClose={args.onClose} maxWidth="xs" fullWidth aria-labelledby="form-title">
      <DialogContent>
        <h2 id="form-title">Edit album</h2>
      </DialogContent>
      <GlassDialogActions onCancel={args.onClose} onSubmit={args.onConfirm} />
    </GlassDialog>
  ),
  play: TwoButtonFooter.play,
}
