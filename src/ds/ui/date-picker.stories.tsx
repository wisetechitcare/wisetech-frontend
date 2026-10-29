import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'
import { isWeekend, parseDate, type DateValue } from '@internationalized/date'
import { useLocale, type RangeValue } from 'react-aria-components'
import { expect, fn, mocked, screen, userEvent, waitFor, within } from 'storybook/test'
import { DatePicker, DateRangePicker } from './date-picker'

/**
 * Typed date entry (DateField segments) plus a calendar popover. `placeholderValue` sets the
 * month the calendar opens on while empty. Values are `CalendarDate`; send `value.toString()`.
 */
const meta = {
  title: 'Components/DatePicker',
  component: DatePicker,
  args: { label: 'Effective from', placeholderValue: parseDate('2026-10-01'), onChange: fn() },
  render: (args) => (
    <div className="w-72">
      <DatePicker {...args} />
    </div>
  ),
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

/** The trigger opens the calendar; picking a day closes it and fills the segments. */
export const PickDay: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /28 October 2026/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(canvas.getByRole('group', { name: 'Effective from' })).toHaveTextContent('28/10/2026')
    const value = mocked(args.onChange!).mock.lastCall?.[0] as DateValue
    await expect(value.toString()).toBe('2026-10-28')
  },
}

/**
 * The date input fills the pill, so a click in its empty part lands on it and React Aria focuses
 * the first empty segment, as in an input pill; only the button opens the calendar.
 */
export const ClickToType: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Effective from' })
    const segments = within(group).getAllByRole('spinbutton')
    const last = segments[segments.length - 1].getBoundingClientRect()
    const button = within(group).getByRole('button', { name: /calendar/i }).getBoundingClientRect()
    // A synthetic click cannot replay React Aria's focus hand-off, so check where a real one lands:
    // the button closes the pill, and the gap between the date and the button is the date input.
    await expect(group.getBoundingClientRect().right - button.right).toBeLessThan(4)
    const hit = document.elementFromPoint((last.right + button.left) / 2, button.top + button.height / 2)
    await expect(hit?.closest('[data-slot=date-input]')).not.toBeNull()
  },
}

function WeekdaysOnlyPicker(props: ComponentProps<typeof DatePicker>) {
  const { locale } = useLocale()
  return <DatePicker {...props} isDateUnavailable={(date) => isWeekend(date, locale)} />
}

/** `isDateUnavailable` (weekends here, by the locale's week) greys days out and blocks picking them. */
export const WeekdaysOnly: Story = {
  args: { label: 'Interview date' },
  render: (args) => (
    <div className="w-72">
      <WeekdaysOnlyPicker {...args} />
    </div>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    const saturday = within(dialog).getByRole('button', { name: /Saturday, 31 October 2026/ })
    await expect(saturday).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(saturday)
    await expect(args.onChange).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: /Friday, 30 October 2026/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const value = mocked(args.onChange!).mock.lastCall?.[0] as DateValue
    await expect(value.toString()).toBe('2026-10-30')
  },
}

/** Leave-style range: two clicks in one calendar, start and end typed fields stay in sync. */
export const Range: Story = {
  render: (args) => (
    <div className="w-80">
      <DateRangePicker
        label="Leave dates"
        placeholderValue={args.placeholderValue}
        onChange={args.onChange as (value: RangeValue<DateValue> | null) => void}
      />
    </div>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /28 October 2026/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: /31 October 2026/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const range = mocked(args.onChange!).mock.lastCall?.[0] as unknown as RangeValue<DateValue>
    await expect(range.start.toString()).toBe('2026-10-28')
    await expect(range.end.toString()).toBe('2026-10-31')
    await expect(canvas.getByRole('group', { name: 'Leave dates' })).toHaveTextContent('28/10/2026–31/10/2026')
  },
}
