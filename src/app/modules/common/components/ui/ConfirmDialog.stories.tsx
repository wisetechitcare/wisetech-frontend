import { useState, type ReactNode } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent } from 'storybook/test'
import { Archive } from 'lucide-react'
import { DialogTitle } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'

import { Button } from '@/ds/ui/button'
import { ConfirmDialog, ConfirmDialogKind } from './ConfirmDialog'
import { GlassDialog } from './glass'
import { GlassDialogActions } from './GlassDialogActions'

import { BRAND_PRESETS } from '@/app/theme/appearance'
import { makeWisetechTheme } from '@/app/theme/wisetechTheme'

const OPEN_DIALOG_LABEL = 'Open modal'
const CANCEL_LABEL = 'Cancel'
const FOOTER_FILL_RATIO = 0.8

interface DialogTriggerProps {
  onClose: () => void
  renderDialog: (open: boolean, close: () => void) => ReactNode
}

function DialogTrigger({ onClose, renderDialog }: DialogTriggerProps) {
  const [open, setOpen] = useState<boolean>(false)
  const close = () => {
    setOpen(false)
    onClose()
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        {OPEN_DIALOG_LABEL}
      </Button>
      {renderDialog(open, close)}
    </>
  )
}

const widthOf = (element: Element) => element.getBoundingClientRect().width

const openDialogAndCompareFooterButtons: Story['play'] = async ({ canvas }) => {
  await userEvent.click(canvas.getByRole('button', { name: new RegExp(OPEN_DIALOG_LABEL, 'i') }))
  const cancel = await screen.findByRole('button', { name: CANCEL_LABEL })
  const confirm = cancel.nextElementSibling!
  const footerWidth = widthOf(cancel.parentElement!)

  await expect(Math.abs(widthOf(cancel) - widthOf(confirm))).toBeLessThan(1)
  await expect(widthOf(cancel) + widthOf(confirm)).toBeGreaterThan(footerWidth * FOOTER_FILL_RATIO)
}

/**
 * **The one modal for the whole app.** Use it for every confirm, delete, discard, warning
 * and success / error / info notice. Don't build a new modal for these.
 *
 * - Import: `import { ConfirmDialog } from '@/app/modules/common/components/ui'`
 * - Pick a `variant`. It sets the icon, colour, title and button labels. Override any of them with props.
 * - `showCancel={false}` gives a single acknowledge button (notices).
 * - `secondaryAction` adds a third button, `loading` locks the modal while the action runs,
 *   `children` adds extra content under the message.
 * - Two buttons always split the footer 50/50. Form modals use the same footer (`GlassDialogActions`).
 */
const meta = {
  title: 'Components/Modal',
  component: ConfirmDialog,
  decorators: [
    (Story, { globals }) => {
      const brandPreset = BRAND_PRESETS.find((preset) => preset.id === globals.brand) ?? BRAND_PRESETS[0]
      return (
        <ThemeProvider theme={makeWisetechTheme(globals.mode, brandPreset.brand)}>
          <Story />
        </ThemeProvider>
      )
    },
  ],
  render: (args) => (
    <DialogTrigger
      onClose={args.onClose}
      renderDialog={(open, close) => <ConfirmDialog {...args} open={open} onClose={close} />}
    />
  ),
  args: {
    open: false,
    variant: ConfirmDialogKind.CONFIRM,
    title: 'Publish Announcement?',
    message: 'Everyone in the organization will be notified.',
    confirmLabel: 'Publish',
    onClose: fn(),
    onConfirm: fn(),
  },
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Default: ask before an action. Cancel and the action share the footer width equally. */
export const Confirm: Story = {
  play: openDialogAndCompareFooterButtons,
}

/** Destructive action: danger button, named after what it does. */
export const Delete: Story = {
  args: {
    variant: ConfirmDialogKind.DELETE,
    title: 'Delete Meera Joshi?',
    message: 'Her attendance, leave and payslips stay in reports. This cannot be undone.',
    confirmLabel: 'Delete employee',
  },
  play: openDialogAndCompareFooterButtons,
}

/** Leaving a form with unsaved edits. Cancel keeps the user where they are. */
export const Discard: Story = {
  args: {
    variant: ConfirmDialogKind.DISCARD,
    title: undefined,
    message: "Your changes to this employee haven't been saved.",
    confirmLabel: undefined,
  },
}

/** Risky but allowed: warning icon. Use `confirmTone="danger"` for a red button. */
export const Warning: Story = {
  args: {
    variant: ConfirmDialogKind.WARNING,
    title: 'Run October Payroll?',
    message: '248 payslips will be generated and locked.',
    confirmLabel: 'Run payroll',
  },
}

/** Notice: one acknowledge button (`showCancel={false}`). */
export const SuccessNotice: Story = {
  args: {
    variant: ConfirmDialogKind.SUCCESS,
    title: 'Payslips Sent',
    message: '248 employees received their October payslip.',
    confirmLabel: undefined,
    showCancel: false,
  },
}

/** Notice: something failed. */
export const ErrorNotice: Story = {
  args: {
    variant: ConfirmDialogKind.ERROR,
    title: "Couldn't Send Payslips",
    message: 'The mail server rejected the batch. Nothing was sent.',
    confirmLabel: undefined,
    showCancel: false,
  },
}

/** Notice: information only. */
export const InfoNotice: Story = {
  args: {
    variant: ConfirmDialogKind.INFO,
    title: 'Probation Extended',
    message: 'Ishaan Verma stays on probation until 12 December.',
    confirmLabel: undefined,
    showCancel: false,
  },
}

/** A third choice between Cancel and the action. */
export const WithSecondaryAction: Story = {
  args: {
    variant: ConfirmDialogKind.DISCARD,
    title: undefined,
    message: "Your changes to this employee haven't been saved.",
    confirmLabel: undefined,
    secondaryAction: { label: 'Save as draft', onClick: fn() },
  },
}

/** Extra content under the message (lists, hints). */
export const WithExtraContent: Story = {
  args: {
    variant: ConfirmDialogKind.DELETE,
    title: 'Delete 3 Branches?',
    message: 'These branches and their devices will be removed:',
    confirmLabel: 'Delete branches',
    children: (
      <ul className="list-disc ps-5 text-sm">
        <li>Pune</li>
        <li>Nashik</li>
        <li>Nagpur</li>
      </ul>
    ),
  },
}

/** Any icon: pass an AppIcon name or your own node. */
export const CustomIcon: Story = {
  args: {
    variant: ConfirmDialogKind.DELETE,
    title: 'Archive Gift Run',
    message: 'Archive “Diwali Sweets”? You can unarchive it later.',
    confirmLabel: 'Archive',
    icon: <Archive className="size-6" aria-hidden />,
  },
}

/** While the action runs: buttons are disabled and the action shows `loadingLabel`. */
export const Loading: Story = {
  args: {
    loading: true,
    loadingLabel: 'Publishing…',
  },
}

/** Form modals use the same footer (GlassDialogActions): Cancel + Save split 50/50 too. */
export const FormFooter: Story = {
  render: (args) => (
    <DialogTrigger
      onClose={args.onClose}
      renderDialog={(open, close) => (
        <GlassDialog open={open} onClose={close} maxWidth="xs" fullWidth>
          <DialogTitle>Edit album</DialogTitle>
          <GlassDialogActions onCancel={close} onSubmit={args.onConfirm} />
        </GlassDialog>
      )}
    />
  ),
  play: openDialogAndCompareFooterButtons,
}
