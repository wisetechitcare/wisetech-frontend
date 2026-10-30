import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent } from 'storybook/test'
import { toast } from 'sonner'
import { Button } from './button'
import { Toaster } from './sonner'

/**
 * Toast notifications for completed actions. The `<Toaster />` is mounted once (the Storybook
 * decorator mounts it here; the app shell will in production). Call `toast.*()` anywhere.
 */
const meta = {
  title: 'Components/Toast',
  component: Toaster,
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => toast.success('Leave approved', { description: 'Diya Nair · 28–30 Oct · 3 days' })}>
        Success toast
      </Button>
      <Button variant="outline" onClick={() => toast.error('Could not save', { description: 'Branch is required.' })}>
        Error toast
      </Button>
      <Button variant="secondary" onClick={() => toast.info('Payroll run scheduled for 31 Oct')}>
        Info toast
      </Button>
    </div>
  ),
} satisfies Meta<typeof Toaster>

export default meta
type Story = StoryObj<typeof meta>

/** Clicking shows a toast with its title and description. */
export const Success: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Success toast' }))
    await expect(await screen.findByText('Leave approved')).toBeInTheDocument()
    await expect(screen.getByText('Diya Nair · 28–30 Oct · 3 days')).toBeInTheDocument()
  },
}
