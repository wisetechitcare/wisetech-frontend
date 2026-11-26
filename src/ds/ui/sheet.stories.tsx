import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { SlidersHorizontal } from 'lucide-react'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Field, FieldLabel, FieldLegend, FieldSet } from './field'
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
import { Switch } from './switch'

import { countActiveFilters, FilterSheet, FilterSheetButton } from '@/ds/patterns/filter-sheet'

const STATUSES = ['Pending', 'Approved', 'Rejected']

/**
 * A side panel for a supporting task that keeps the page in view — filters, history, quick edit.
 * Replaces the live kit's `WtSheet`, `FilterSheet` and `ShadcnDrawer`. Primary work stays on the page.
 *
 * For table filters use the `FilterSheet` pattern (stories from Apply Filters on): it adds the draft → Apply
 * flow, Reset, the applied count on the button and the phone bottom-sheet layout on top of this Sheet.
 */
const meta = {
  title: 'Feedback & Overlays/Sheet',
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
    const sheet = await screen.findByRole('dialog', { name: 'Filter Leave Requests' })
    // The sheet slides in; judge it once the animation has landed.
    await waitFor(() => expect(sheet).toBeVisible())
    await expect(screen.getByRole('checkbox', { name: 'Pending' })).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

type Filters = { statuses: string[]; mineOnly: boolean }
const EMPTY: Filters = { statuses: [], mineOnly: false }

const onApply = fn()

function LeaveFilters() {
  const [open, setOpen] = useState<boolean>(false)
  const [value, setValue] = useState<Filters>(EMPTY)
  return (
    <>
      <FilterSheetButton count={countActiveFilters(value, EMPTY)} onClick={() => setOpen(true)} />
      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        value={value}
        empty={EMPTY}
        title="Filter leave requests"
        description="Changes apply when you press Apply."
        onApply={(next) => {
          onApply(next)
          setValue(next)
        }}
      >
        {(draft, set) => (
          <>
            <FieldSet>
              <FieldLegend variant="label">Status</FieldLegend>
              {STATUSES.map((s) => (
                <Field key={s} orientation="horizontal">
                  <Checkbox
                    id={`f-${s}`}
                    checked={draft.statuses.includes(s)}
                    onCheckedChange={(on) =>
                      set('statuses', on ? [...draft.statuses, s] : draft.statuses.filter((x) => x !== s))
                    }
                  />
                  <FieldLabel htmlFor={`f-${s}`}>{s}</FieldLabel>
                </Field>
              ))}
            </FieldSet>
            <Field orientation="horizontal">
              <FieldLabel htmlFor="f-mine">Only my team</FieldLabel>
              <Switch id="f-mine" checked={draft.mineOnly} onCheckedChange={(on) => set('mineOnly', on)} />
            </Field>
          </>
        )}
      </FilterSheet>
    </>
  )
}

/** `FilterSheet` pattern: the table filter workspace built on Sheet. */
const filterSheetStory: Story = {
  render: () => <LeaveFilters />,
  beforeEach: () => {
    onApply.mockReset()
  },
}

/** Apply commits the draft (it counts what it will apply); the button then reads "Filters 2 applied". */
export const ApplyFilters: Story = {
  ...filterSheetStory,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    await screen.findByRole('dialog', { name: 'Filter Leave Requests' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pending' }))
    await userEvent.click(screen.getByRole('switch', { name: 'Only My Team' }))
    await userEvent.click(screen.getByRole('button', { name: 'Apply (2)' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(onApply).toHaveBeenCalledWith({ statuses: ['Pending'], mineOnly: true })
    await expect(canvas.getByRole('button', { name: 'Filters 2 applied' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Closing without Apply discards the draft. */
export const CloseDiscardsDraft: Story = {
  ...filterSheetStory,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    await screen.findByRole('dialog')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Approved' }))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(onApply).not.toHaveBeenCalled()
    await expect(canvas.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Nothing picked and nothing applied: Reset is disabled rather than a click that does nothing. */
export const ResetNeedsSomethingToReset: Story = {
  ...filterSheetStory,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    await screen.findByRole('dialog')
    await expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Rejected' }))
    await expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(onApply).toHaveBeenCalledWith({ statuses: [], mineOnly: false })
    await animationsSettled()
  },
}

/**
 * Tablet and up: a fixed 384px right panel, always viewport-tall, so Apply / Reset sit at the bottom edge and never
 * move as fields change.
 */
export const DesktopRightPanel: Story = {
  ...filterSheetStory,
  globals: { viewport: { value: 'desktop' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog')
    await expect(dialog).toHaveAttribute('data-side', 'right')
    await expect(dialog).toHaveAttribute('data-fit', 'full')
    await animationsSettled()
    await expect(Math.round(dialog.getBoundingClientRect().height)).toBe(window.innerHeight - 16)
  },
}

/** Phones: a full-width bottom sheet with a fixed height, footer under the thumb. */
export const PhoneBottomSheet: Story = {
  ...filterSheetStory,
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog).toHaveAttribute('data-side', 'bottom'))
    await animationsSettled()
    const box = dialog.getBoundingClientRect()
    await expect(Math.round(box.width)).toBe(window.innerWidth - 16)
    await expect(Math.round(box.bottom)).toBe(window.innerHeight - 8)
  },
}

/** `iconOnly`: the table toolbar's ToolButton — outline at rest, tinted with a count while filters apply. */
export const IconOnlyTrigger: Story = {
  ...filterSheetStory,
  render: () => (
    <div className="flex gap-2">
      <FilterSheetButton iconOnly count={0} onClick={fn()} />
      <FilterSheetButton iconOnly count={3} onClick={fn()} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Filters 3 applied' })).toHaveTextContent('3')
  },
}
