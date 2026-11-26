import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { parseDate } from '@internationalized/date'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Button } from '@/ds/ui/button'
import { ApplyLeaveScreen } from './ApplyLeaveScreen'

type Props = Omit<ComponentProps<typeof ApplyLeaveScreen>, 'open' | 'onOpenChange'>

function Demo(props: Props) {
  const [open, setOpen] = useState(true)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Apply Leave</Button>
      <ApplyLeaveScreen open={open} onOpenChange={setOpen} {...props} />
    </>
  )
}

/**
 * The live Apply Leave (My Leaves), rebuilt from the kit: Form Dialog, Select, the shared calendar engine,
 * Toggle Group, Breakdown Bar, Description List, Alert, Checkbox, Person. Nothing here is drawn by hand —
 * the screen only maps its leave rules to day tones. Demo data; "today" is pinned to 3 Nov 2026.
 */
const meta = {
  title: 'Screens/Apply Leave',
  component: Demo,
  parameters: { layout: 'fullscreen' },
  args: { today: parseDate('2026-11-03') },
} satisfies Meta<typeof Demo>

export default meta
type Story = StoryObj<typeof meta>

const day = (label: string) => screen.getByRole('button', { name: new RegExp(`(^|\\s)${label} 2026`) })
const submit = () => screen.getByRole('button', { name: 'Submit Request' })

/** Nothing picked yet: the summary explains what will appear, and Submit waits for dates. */
export const Empty: Story = {
  play: async () => {
    await expect(await screen.findByText('Pick a start date, then an end date.')).toBeInTheDocument()
    await expect(submit()).toBeDisabled()
    await animationsSettled()
  },
}

/**
 * Paid first, then unpaid: Casual and Annual run out, one day is LOP, and the weekend between the dates
 * is sandwiched. Submit unlocks only once the unpaid days are acknowledged.
 */
export const UnpaidNeedsAcknowledgement: Story = {
  args: { defaultRange: { start: parseDate('2026-11-13'), end: parseDate('2026-11-18') } },
  play: async () => {
    const summary = within(await screen.findByRole('complementary', { name: 'Leave summary' }))
    await expect(summary.getByText('4 days')).toBeInTheDocument()
    await expect(summary.getByText('2 Days Sandwiched')).toBeInTheDocument()
    await expect(summary.getByText('Unpaid (LOP)')).toBeInTheDocument()
    await expect(summary.getByText('₹7,350')).toBeInTheDocument()
    await expect(submit()).toBeDisabled()
    await userEvent.click(summary.getByRole('checkbox', { name: 'I understand 3 days will be unpaid' }))
    await waitFor(() => expect(submit()).toBeEnabled())
    await animationsSettled()
  },
}

/** Pick on the calendar, then halve the first day: 3 working days become 2.5, all paid. */
export const PickRangeAndHalfDay: Story = {
  play: async () => {
    await userEvent.click(await waitFor(() => day('4 November')))
    await userEvent.click(day('6 November'))
    await expect(await screen.findByText('3 days · 3 chargeable')).toBeInTheDocument()
    const firstDay = screen.getByRole('group', { name: 'First Day' })
    await userEvent.click(within(firstDay).getByRole('button', { name: 'Second Half' }))
    await expect(await screen.findByText('3 days · 2.5 chargeable')).toBeInTheDocument()
    await expect(screen.getByText('Fully covered by paid leave')).toBeInTheDocument()
    await expect(submit()).toBeEnabled()
    await userEvent.click(submit())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}

/** Tomorrow in one tap: a single day offers the session choice instead of the range boundaries. */
export const Tomorrow: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Tomorrow' }))
    const summary = within(screen.getByRole('complementary', { name: 'Leave summary' }))
    await expect(summary.getByText('4 Nov 2026')).toBeInTheDocument()
    await expect(screen.getByRole('group', { name: 'This Day' })).toBeInTheDocument()
    await animationsSettled()
  },
}
