import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './drawer'

/**
 * The phone's bottom sheet: swipe down to dismiss. Use it for short mobile tasks (check in, pick a
 * leave type); on desktop the same task belongs in a Dialog or Sheet.
 */
const meta = {
  title: 'Components/Drawer',
  component: Drawer,
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger render={<Button />}>Check in</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Check in at Andheri office</DrawerTitle>
          <DrawerDescription>You are 40 m from the office — inside the allowed radius.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <DrawerClose render={<Button />}>Confirm check-in</DrawerClose>
          <DrawerClose render={<Button variant="outline" />}>Not now</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

/** Opens as a labelled dialog; a footer button closes it. */
export const MobileCheckIn: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Check in' }))
    await expect(await screen.findByRole('dialog', { name: 'Check in at Andheri office' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
