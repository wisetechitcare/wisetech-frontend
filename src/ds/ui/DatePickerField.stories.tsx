import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, mocked, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  DatePickerField,
  DateRangePickerField,
  type DatePickerFieldProps,
  type DateRangePickerFieldProps,
  type IsoDateRangePreset,
} from './date-picker-field'

import type { IsoDate, IsoDateRange } from '@/ds/lib/iso-date'

const RANGE_PRESETS: IsoDateRangePreset[] = [
  { label: 'Q1 2027', value: { start: '2027-01-01', end: '2027-03-31' } },
  { label: 'Full 2026', value: { start: '2026-01-01', end: '2026-12-31' } },
]

function SingleDemo({ value, onChange, ...props }: DatePickerFieldProps) {
  const [date, setDate] = useState<IsoDate>(value ?? '')
  return (
    <div className="w-72">
      <DatePickerField
        {...props}
        value={date}
        onChange={(next) => {
          setDate(next)
          onChange(next)
        }}
      />
    </div>
  )
}

function RangeDemo({ value, onChange, ...props }: DateRangePickerFieldProps) {
  const [range, setRange] = useState<IsoDateRange | null>(value ?? null)
  return (
    <div className="w-80">
      <DateRangePickerField
        {...props}
        value={range}
        onChange={(next) => {
          setRange(next)
          onChange(next)
        }}
      />
    </div>
  )
}

/**
 * The date pickers used across the app, ISO strings in and out: `DatePickerField` (`"YYYY-MM-DD"`, `''` when
 * cleared) and `DateRangePickerField` (`{ start, end }` or `null`). Monday-first week, outside days hidden.
 */
const meta = {
  title: 'Forms/Date & Time/Date Picker Field',
  component: DatePickerField,
  args: { label: 'Effective from', value: '', placeholderValue: '2026-10-01', isClearable: true, onChange: fn() },
  render: (args) => <SingleDemo {...args} />,
} satisfies Meta<typeof DatePickerField>

export default meta
type Story = StoryObj<typeof meta>

const rangeChange = (onChange: DatePickerFieldProps['onChange']) =>
  onChange as unknown as DateRangePickerFieldProps['onChange']

/** Free date: pick a day and the field reports `"YYYY-MM-DD"`. */
export const Single: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /28 October 2026/ }))
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith('2026-10-28'))
    await expect(canvas.getByRole('group', { name: 'Effective From' })).toHaveTextContent('2026.10.28')
  },
}

/** `minValue` / `maxValue`: days outside the window are disabled. */
export const MinMax: Story = {
  args: { label: 'Constrained date', minValue: '2026-10-10', maxValue: '2026-10-20' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await expect(within(dialog).getByRole('button', { name: /, 9 October 2026/ })).toHaveAttribute('aria-disabled', 'true')
    await expect(within(dialog).getByRole('button', { name: /15 October 2026/ })).not.toHaveAttribute('aria-disabled')
  },
}

/** Range with presets: one click under the calendar sets the whole range. */
export const RangeWithPresets: Story = {
  render: (args) => (
    <RangeDemo
      label="Date range"
      value={null}
      placeholderValue={args.placeholderValue}
      isClearable={args.isClearable}
      presets={RANGE_PRESETS}
      onChange={rangeChange(args.onChange)}
    />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Q1 2027' }))
    await waitFor(() =>
      expect(mocked(args.onChange).mock.lastCall?.[0]).toEqual({ start: '2027-01-01', end: '2027-03-31' }),
    )
  },
}

/** `confirmSelection`: picks are a draft until OK; Cancel reports nothing. */
export const RangeWithConfirm: Story = {
  render: (args) => (
    <RangeDemo
      label="Confirmed range"
      value={null}
      placeholderValue={args.placeholderValue}
      isClearable={args.isClearable}
      confirmSelection
      presets={RANGE_PRESETS}
      onChange={rangeChange(args.onChange)}
    />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    let dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Q1 2027' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onChange).not.toHaveBeenCalled()

    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Q1 2027' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }))
    await waitFor(() =>
      expect(mocked(args.onChange).mock.lastCall?.[0]).toEqual({ start: '2027-01-01', end: '2027-03-31' }),
    )
  },
}

/** `showWeekends={false}` removes the weekend columns, for single and range pickers. */
export const NoWeekends: Story = {
  args: { label: 'No weekends', showWeekends: false },
  render: (args) => (
    <div className="grid gap-6">
      <SingleDemo {...args} />
      <RangeDemo
        label="No weekends (range)"
        value={null}
        placeholderValue={args.placeholderValue}
        isClearable={args.isClearable}
        showWeekends={false}
        onChange={rangeChange(args.onChange)}
      />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getAllByRole('button', { name: /calendar/i })[0])
    const dialog = await screen.findByRole('dialog')
    await expect(within(dialog).getByRole('button', { name: /Friday, 30 October 2026/ })).toBeInTheDocument()
    await expect(within(dialog).queryByRole('button', { name: /Saturday, 31 October 2026/ })).not.toBeInTheDocument()
  },
}

/** `hideOutsideDays={false}` shows the adjacent-month days that are hidden by default. */
export const OutsideDaysShown: Story = {
  args: { label: 'Outside days shown', hideOutsideDays: false },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await expect(within(dialog).getByRole('button', { name: /Monday, 28 September 2026/ })).not.toHaveClass('invisible')
  },
}

/** `showMonthYearSelect={false}` makes the calendar title a plain label. */
export const PlainTitle: Story = {
  args: { label: 'No month/year select', showMonthYearSelect: false },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await expect(within(dialog).queryByRole('button', { name: /October 2026/ })).not.toBeInTheDocument()
  },
}
