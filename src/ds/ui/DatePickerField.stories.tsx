import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, mocked, screen, userEvent, waitFor, within } from 'storybook/test'

import {
  DatePickerField,
  DateRangePickerField,
  type DatePickerFieldProps,
  type DateRangePickerFieldProps,
} from './date-picker-field'

import type { IsoDate, IsoDateRange } from '@/ds/lib/iso-date'

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
 * The kit pickers with ISO strings in and out — no CalendarDate on the consumer side:
 * `<DatePickerField value={date} onChange={setDate} />` and
 * `<DateRangePickerField value={range} onChange={setRange} />`. Same calendar and props as Date Picker;
 * min / max / unavailable days / placeholder / presets are ISO too.
 */
const meta = {
  title: 'Forms/Date & Time/Date Picker Field',
  component: DatePickerField,
  args: { label: 'Effective from', value: '', placeholderValue: '2026-10-01', onChange: fn() },
  render: (args) => <SingleDemo {...args} />,
} satisfies Meta<typeof DatePickerField>

export default meta
type Story = StoryObj<typeof meta>

const rangeChange = (onChange: DatePickerFieldProps['onChange']) =>
  onChange as unknown as DateRangePickerFieldProps['onChange']

/** Picking a day reports `"YYYY-MM-DD"`. */
export const PickDay: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /28 October 2026/ }))
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith('2026-10-28'))
    await expect(canvas.getByRole('group', { name: 'Effective From' })).toHaveTextContent('2026.10.28')
  },
}

/** ISO `minValue` / `maxValue`: days outside the window are disabled. */
export const MinMax: Story = {
  args: { minValue: '2026-10-10', maxValue: '2026-10-20' },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await expect(within(dialog).getByRole('button', { name: /, 9 October 2026/ })).toHaveAttribute('aria-disabled', 'true')
    await expect(within(dialog).getByRole('button', { name: /15 October 2026/ })).not.toHaveAttribute('aria-disabled')
  },
}

/** `isClearable`: the clear button reports `''`. */
export const Clearable: Story = {
  args: { value: '2026-10-28', isClearable: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }))
    await expect(args.onChange).toHaveBeenLastCalledWith('')
  },
}

/** A normal range reports `{ start, end }` in ISO. */
export const Range: Story = {
  render: (args) => (
    <RangeDemo label="Leave dates" value={null} placeholderValue={args.placeholderValue} onChange={rangeChange(args.onChange)} />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /28 October 2026/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: /31 October 2026/ }))
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith({ start: '2026-10-28', end: '2026-10-31' }))
    await expect(canvas.getByRole('group', { name: 'Leave Dates' })).toHaveTextContent('2026.10.28–2026.10.31')
  },
}

/** `confirmSelection`: picks are a draft. Cancel reports nothing; OK reports the range. */
export const RangeWithConfirm: Story = {
  render: (args) => (
    <RangeDemo
      label="Leave dates"
      value={null}
      placeholderValue={args.placeholderValue}
      confirmSelection
      presets={[{ label: 'First week', value: { start: '2026-10-01', end: '2026-10-07' } }]}
      onChange={rangeChange(args.onChange)}
    />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    let dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'First Week' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onChange).not.toHaveBeenCalled()

    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }))
    dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'First Week' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(mocked(args.onChange).mock.lastCall?.[0]).toEqual({ start: '2026-10-01', end: '2026-10-07' })
  },
}
