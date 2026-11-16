import type { Meta, StoryObj } from '@storybook/react-vite'
import { parseDate, parseTime, type DateValue } from '@internationalized/date'
import { expect, fn, mocked, userEvent, waitFor, within } from 'storybook/test'
import { DateField, TimeField } from './date-field'

/**
 * Segmented date entry on React Aria. Segments read the company standard YYYY.MM.DD
 * (src/utils/dateFormats.ts) whatever the kit locale; each segment takes typing and arrow keys. Values are `CalendarDate`.
 */
const meta = {
  title: 'Components/DateField',
  component: DateField,
  args: { label: 'Date of joining', onChange: fn() },
  render: (args) => (
    <div className="w-72">
      <DateField {...args} />
    </div>
  ),
} satisfies Meta<typeof DateField>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Year-month-day with dots (the company standard); typing fills the segments in that order and reports a `CalendarDate`.
 * onChange fires per keystroke once every segment has a value. Year-first entry fills the year before the
 * day, so those emits already carry 2026 (the day arrives as 2, then 28); a field edited in place can still
 * pass through 0002-…: act on blur or submit, not on every change.
 */
export const CompanyFormat: Story = {
  play: async ({ args, canvas }) => {
    const group = canvas.getByRole('group', { name: 'Date of Joining' })
    await expect(group).toHaveTextContent('yyyy.mm.dd')
    await userEvent.click(canvas.getAllByRole('spinbutton')[0])
    await userEvent.keyboard('20261028')
    await expect(group).toHaveTextContent('2026.10.28')
    await waitFor(() => expect(args.onChange).toHaveBeenCalled())
    const value = mocked(args.onChange!).mock.lastCall?.[0] as DateValue
    await expect(value.toString()).toBe('2026-10-28')
    const years = mocked(args.onChange!).mock.calls.map(([v]) => (v as DateValue).year)
    await expect(years).toEqual([2026, 2026])
  },
}

/** Out of range: the segments are marked invalid and the error is an alert, announced when shown. */
export const Invalid: Story = {
  args: {
    description: 'Within the current financial year.',
    defaultValue: parseDate('2026-03-15'),
    minValue: parseDate('2026-04-01'),
    validationBehavior: 'aria',
    errorMessage: 'Pick a date on or after 2026.04.01.',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Pick a date on or after 2026.04.01.')
    await expect(canvas.getByText('Pick a date on or after 2026.04.01.')).toBeVisible()
    for (const segment of canvas.getAllByRole('spinbutton')) {
      await expect(segment).toHaveAttribute('aria-invalid', 'true')
    }
    await expect(canvas.getAllByRole('spinbutton')[0]).toHaveAccessibleDescription(
      /Within the current financial year\. Pick a date on or after 2026\.04\.01\./,
    )
  },
}

/** TimeField takes the app's 12/24-hour display setting as `hourCycle`; the value is the same `Time`. */
export const TimeHourCycle: Story = {
  render: () => (
    <div className="grid w-72 gap-6">
      <TimeField label="Shift starts (12-hour)" hourCycle={12} defaultValue={parseTime('14:30')} />
      <TimeField label="Shift starts (24-hour)" hourCycle={24} defaultValue={parseTime('14:30')} />
    </div>
  ),
  play: async ({ canvas }) => {
    const twelve = canvas.getByRole('group', { name: 'Shift Starts (12-hour)' })
    const twentyFour = canvas.getByRole('group', { name: 'Shift Starts (24-hour)' })
    // React Aria wraps the time in bidi isolates, hence \W around the digits.
    await expect(twelve).toHaveTextContent(/^\W*2:30\W*pm$/i)
    await expect(twentyFour).toHaveTextContent(/^\W*14:30\W*$/)
    await expect(within(twelve).getAllByRole('spinbutton')).toHaveLength(3)
    await expect(within(twentyFour).getAllByRole('spinbutton')).toHaveLength(2)
    await userEvent.click(within(twentyFour).getAllByRole('spinbutton')[0])
    await userEvent.keyboard('{ArrowUp}')
    await expect(twentyFour).toHaveTextContent(/^\W*15:30\W*$/)
  },
}
