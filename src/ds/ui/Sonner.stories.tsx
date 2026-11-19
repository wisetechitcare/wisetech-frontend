import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'

import { Button } from './button'
import { Toaster, toast } from './sonner'

/**
 * The one notification system for WiseTech. `<Toaster />` is mounted once (the Storybook decorator mounts it
 * here, the app shell in production); call `toast.success | error | warning | info()` anywhere. Every variant
 * shares the same card, washed in its tone: a Lucide icon, a title, an optional description, a close button and
 * a time-left bar.
 */
const meta = {
  title: 'Components/Toast',
  component: Toaster,
  beforeEach: () => {
    toast.dismiss()
  },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success('Leave approved', { description: 'Diya Nair · 28–30 Oct · 3 days' })}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error('Could not save employee', { description: 'Branch is required.' })}>
        Error toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning('Attendance not marked', { description: '3 employees have no punch-in today.' })}
      >
        Warning toast
      </Button>
      <Button variant="outline" onClick={() => toast.info('Payroll run scheduled', { description: 'Runs on 31 Oct at 9:00 PM.' })}>
        Info toast
      </Button>
      <Button variant="ghost" onClick={() => toast('Profile updated')}>
        Title only
      </Button>
    </div>
  ),
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

/** Title and description in the success tone; the close button dismisses it. */
export const Success: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Success Toast' }))
    const title = await screen.findByText('Leave approved')
    await expect(screen.getByText('Diya Nair · 28–30 Oct · 3 days')).toBeInTheDocument()
    const card = title.closest<HTMLElement>('[data-sonner-toast]')
    await expect(card).not.toBeNull()
    await userEvent.click(within(card!).getByRole('button', { name: /close toast/i }))
    await waitFor(() => expect(screen.queryByText('Leave approved')).not.toBeInTheDocument())
  },
}

/** Error, warning and info share the same card; only the icon and its tone change. */
export const ErrorWarningInfo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Error Toast' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Warning Toast' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Info Toast' }))
    await expect(await screen.findByText('Could not save employee')).toBeInTheDocument()
    await expect(await screen.findByText('Attendance not marked')).toBeInTheDocument()
    await expect(await screen.findByText('Payroll run scheduled')).toBeInTheDocument()
  },
}
