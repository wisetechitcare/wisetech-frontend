import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { TriangleAlert } from 'lucide-react'
import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

/**
 * Modal dialog (Radix). Focus moves in and is trapped; Esc and the close button dismiss.
 * The discard prompt below is the pattern every wizard uses before closing with unsaved work.
 */
const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  args: { onOpenChange: fn() },
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button variant="outline">Close wizard</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-warning-soft text-warning-foreground">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <DialogTitle>Discard unsaved changes?</DialogTitle>
          <DialogDescription>Your changes to this employee haven&apos;t been saved.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep editing</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="destructive">Discard</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

/** Opening shows a labelled dialog; "Keep editing" closes it. */
export const DiscardPrompt: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close wizard' }))
    const dialog = await screen.findByRole('dialog', { name: 'Discard unsaved changes?' })
    await expect(dialog).toHaveAccessibleDescription("Your changes to this employee haven't been saved.")
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false)
  },
}

/** Escape dismisses the dialog. */
export const EscapeCloses: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Close wizard' }))
    await screen.findByRole('dialog')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}
