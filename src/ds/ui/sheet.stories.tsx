import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { SlidersHorizontal } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Label } from './label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet'

const STATUSES = ['Pending', 'Approved', 'Rejected']

/**
 * A side panel for a supporting task that keeps the page in view — filters, history, quick edit.
 * Replaces the live kit's `WtSheet`, `FilterSheet` and `ShadcnDrawer`. Primary work stays on the page.
 */
const meta = {
  title: 'Components/Sheet',
  component: Sheet,
  render: (args) => (
    <Sheet {...args}>
      <SheetTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal data-icon="inline-start" aria-hidden /> Filters
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter leave requests</SheetTitle>
          <SheetDescription>Changes apply when you press Apply.</SheetDescription>
        </SheetHeader>
        <fieldset className="grid gap-3 px-4">
          <legend className="mb-2 text-sm font-medium">Status</legend>
          {STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <Checkbox id={`status-${s}`} defaultChecked={s === 'Pending'} />
              <Label htmlFor={`status-${s}`}>{s}</Label>
            </div>
          ))}
        </fieldset>
        <SheetFooter>
          <SheetClose render={<Button />}>Apply</SheetClose>
          <SheetClose render={<Button variant="outline" />}>Reset</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<typeof Sheet>

export default meta
type Story = StoryObj<typeof meta>

/** Opens from the right as a labelled dialog; Apply closes it. */
export const FilterPanel: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const sheet = await screen.findByRole('dialog', { name: 'Filter leave requests' })
    await expect(sheet).toBeVisible()
    await expect(screen.getByRole('checkbox', { name: 'Pending' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
