import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { CalendarDays, LayoutDashboard, Plus, Users } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './command'

const onRun = fn()

/** The command palette (Ctrl K in the app shell): search people, pages and actions. */
const meta = {
  title: 'Components/Command',
  component: Command,
  render: (args) => (
    <Command {...args} className="w-96 rounded-xl border shadow-e2">
      <CommandInput placeholder="Search people, pages and actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => onRun('add-employee')}>
            <Plus aria-hidden /> Add employee <CommandShortcut>N E</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => onRun('apply-leave')}>
            <CalendarDays aria-hidden /> Apply leave <CommandShortcut>A L</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          <CommandItem onSelect={() => onRun('dashboard')}>
            <LayoutDashboard aria-hidden /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => onRun('employees')}>
            <Users aria-hidden /> Employees
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
} satisfies Meta<typeof Command>

export default meta
type Story = StoryObj<typeof meta>

/** Typing filters the list; Enter runs the highlighted command. */
export const FilterAndRun: Story = {
  beforeEach: () => {
    onRun.mockClear()
  },
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'leave')
    await expect(canvas.getByRole('option', { name: /Apply leave/ })).toBeInTheDocument()
    await expect(canvas.queryByRole('option', { name: /Dashboard/ })).not.toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    await expect(onRun).toHaveBeenCalledWith('apply-leave')
  },
}

/** No match shows the empty message. */
export const NoResults: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole('combobox'), 'zzz')
    await expect(canvas.getByText('No results.')).toBeInTheDocument()
  },
}
