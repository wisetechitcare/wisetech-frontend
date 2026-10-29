import type { Meta, StoryObj } from '@storybook/react-vite'
import { parseDate, type DateValue } from '@internationalized/date'
import type { RangeValue } from 'react-aria-components'
import { expect, fn, mocked, userEvent, waitFor } from 'storybook/test'
import { Calendar, RangeCalendar } from './calendar'

/**
 * Month grid on React Aria: arrow keys move between days, Page Up/Down between months, and labels
 * follow the locale. Values are `CalendarDate` (no time zone); send `value.toString()` → 'YYYY-MM-DD'.
 */
const meta = {
  title: 'Components/Calendar',
  component: Calendar,
  args: {
    'aria-label': 'Joining date',
    defaultFocusedValue: parseDate('2026-10-28'),
    onChange: fn(),
  },
} satisfies Meta<typeof Calendar>

export default meta
type Story = StoryObj<typeof meta>

/** Keyboard only: Tab reaches the focused day, arrows move, Enter selects. */
export const Keyboard: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.tab()
    await expect(document.activeElement).toHaveAccessibleName('Previous')
    await userEvent.tab()
    await userEvent.tab()
    await expect(document.activeElement).toHaveAccessibleName(/28 October 2026/)
    await userEvent.keyboard('{ArrowLeft}{ArrowUp}')
    await expect(document.activeElement).toHaveAccessibleName(/20 October 2026/)
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(args.onChange).toHaveBeenCalledTimes(1))
    const value = mocked(args.onChange!).mock.lastCall?.[0] as DateValue
    await expect(value.toString()).toBe('2026-10-20')
    await expect(canvas.getByRole('gridcell', { selected: true })).toHaveTextContent('20')
  },
}

/** Range selection: the first click anchors the range, the second closes it. */
export const Range: Story = {
  render: (args) => (
    <RangeCalendar
      aria-label="Leave dates"
      defaultFocusedValue={args.defaultFocusedValue}
      onChange={args.onChange as (value: RangeValue<DateValue>) => void}
    />
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /28 October 2026/ }))
    await userEvent.click(canvas.getByRole('button', { name: /31 October 2026/ }))
    await waitFor(() => expect(args.onChange).toHaveBeenCalledTimes(1))
    const range = mocked(args.onChange!).mock.lastCall?.[0] as unknown as RangeValue<DateValue>
    await expect(range.start.toString()).toBe('2026-10-28')
    await expect(range.end.toString()).toBe('2026-10-31')
    await expect(canvas.getAllByRole('gridcell', { selected: true })).toHaveLength(4)
  },
}

// Paints a computed colour (oklch, translucent…) over the surface and reads it back as sRGB.
function srgb(color: string, over: string) {
  const ctx = document.createElement('canvas').getContext('2d')!
  for (const fill of [over, color]) {
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, 1, 1)
  }
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)]
}

function contrast(a: number[], b: number[]) {
  const luminance = (rgb: number[]) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Dark mode: the days inside a range carry a primary tint edged in primary, so the band clears
 * the 3:1 WCAG asks of a state against the surface (a muted band measured about 1.1:1).
 */
export const RangeDark: Story = {
  globals: { mode: 'dark' },
  render: () => (
    <RangeCalendar
      aria-label="Leave dates"
      defaultValue={{ start: parseDate('2026-10-12'), end: parseDate('2026-10-16') }}
    />
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('gridcell', { selected: true })).toHaveLength(5)
    const surface = getComputedStyle(canvasElement.querySelector('[data-slot=calendar]')!).backgroundColor
    const middle = getComputedStyle(canvas.getByRole('button', { name: /14 October 2026/ }).firstElementChild!)
    const edge = middle.boxShadow.match(/(\w+\([^)]*\))[^,]*inset/)?.[1]
    await expect(edge).toBeDefined()
    await expect(contrast(srgb(edge!, surface), srgb(surface, surface))).toBeGreaterThanOrEqual(3)
    const band = srgb(middle.backgroundColor, surface)
    await expect(contrast(srgb(middle.color, surface), band)).toBeGreaterThanOrEqual(4.5)
  },
}
