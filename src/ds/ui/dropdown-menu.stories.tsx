import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { ChevronDown, Mail, Trash2, Upload } from 'lucide-react'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

const onEmail = fn()
const onDeactivate = fn()

/** Row and page actions. Destructive items are separated and coloured. */
const meta = {
  title: 'Components/Dropdown Menu',
  component: DropdownMenu,
  render: (args) => (
    <DropdownMenu {...args}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Actions <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Employee</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onEmail}>
          <Mail aria-hidden /> Send email
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Upload aria-hidden /> Upload document
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDeactivate}>
          <Trash2 aria-hidden /> Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
} satisfies Meta<typeof DropdownMenu>

export default meta
type Story = StoryObj<typeof meta>

/** Choosing an item runs its action and closes the menu. */
export const ChooseAction: Story = {
  beforeEach: () => {
    onEmail.mockClear()
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Actions' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Send email' }))
    await expect(onEmail).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
  },
}

/** Keyboard: arrow keys move through items, Enter selects. */
export const Keyboard: Story = {
  beforeEach: () => {
    onDeactivate.mockClear()
  },
  play: async ({ canvas }) => {
    canvas.getByRole('button', { name: 'Actions' }).focus()
    await userEvent.keyboard('{Enter}')
    await screen.findByRole('menu')
    await userEvent.keyboard('{End}{Enter}')
    await expect(onDeactivate).toHaveBeenCalledTimes(1)
    // Focus returns to the trigger once the menu has fully closed.
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Actions' })).toHaveFocus())
  },
}
