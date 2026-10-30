import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Trash2 } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog'

/**
 * A decision the user must make before continuing — delete, discard, overwrite. Unlike Dialog it
 * cannot be dismissed by clicking outside. Replaces the live kit's `ConfirmDialog` / `confirmDialog()`
 * and the SweetAlert prompts. The confirming button names the action ("Delete employee"), never "OK".
 */
const meta = {
  title: 'Components/AlertDialog',
  component: AlertDialog,
} satisfies Meta<typeof AlertDialog>

export default meta
type Story = StoryObj<typeof meta>

function DeleteEmployee({ onConfirm, size }: { onConfirm: () => void; size?: 'default' | 'sm' }) {
  const [open, setOpen] = React.useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <Trash2 data-icon="inline-start" aria-hidden /> Delete employee
      </AlertDialogTrigger>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive-soft text-destructive-foreground">
            <Trash2 aria-hidden />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Meera Joshi?</AlertDialogTitle>
          <AlertDialogDescription>
            Her attendance, leave and payslips stay in reports. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep employee</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            Delete employee
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Confirming runs the action and closes. */
export const ConfirmDelete: Story = {
  args: { onOpenChange: fn() },
  render: (args) => <DeleteEmployee onConfirm={args.onOpenChange as () => void} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete employee' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Meera Joshi?' })
    await expect(dialog).toHaveAccessibleDescription(/cannot be undone/)
    await userEvent.click(screen.getAllByRole('button', { name: 'Delete employee' }).at(-1)!)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await expect(args.onOpenChange).toHaveBeenCalledTimes(1)
    await animationsSettled()
  },
}

/** Cancelling does nothing and closes. */
export const Cancel: Story = {
  args: { onOpenChange: fn() },
  render: (args) => <DeleteEmployee onConfirm={args.onOpenChange as () => void} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Delete employee' }))
    await screen.findByRole('alertdialog')
    await userEvent.click(screen.getByRole('button', { name: 'Keep employee' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    await expect(args.onOpenChange).not.toHaveBeenCalled()
    await animationsSettled()
  },
}

/** Compact: centred, two equal buttons — for short questions on small screens. */
export const Small: Story = {
  args: { onOpenChange: fn() },
  render: (args) => <DeleteEmployee size="sm" onConfirm={args.onOpenChange as () => void} />,
}
