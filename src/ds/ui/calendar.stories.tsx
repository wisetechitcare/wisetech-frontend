import type { Meta, StoryObj } from '@storybook/react-vite'
import { parseDate, type DateValue } from '@internationalized/date'
import type { RangeValue } from 'react-aria-components'
import { expect, fn, mocked, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { Calendar, CalendarLegend, RangeCalendar } from './calendar'

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
    // The title is a stop of its own: it opens the month and year views.
    await expect(document.activeElement).toHaveAccessibleName('October 2026, choose a month')
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

/** Month and year jump: click the title for the month grid, again for years — two clicks to any date. */
export const MonthYearJump: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'October 2026, choose a month' }))
    await userEvent.click(await canvas.findByRole('button', { name: '2026, choose a year' }))
    await userEvent.click(await canvas.findByRole('button', { name: '2030' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'January 2030' }))
    await expect(await canvas.findByRole('button', { name: 'January 2030, choose a month' })).toBeInTheDocument()
    await expect(canvas.getByRole('grid')).toBeInTheDocument()
    // The new month slides in; judge the settled frame.
    await animationsSettled()
  },
}

const ISO = (d: DateValue) => d.toString()
const HOLIDAYS = new Set(['2026-11-09', '2026-11-10', '2026-11-11'])
const CHARGED = new Set(['2026-11-18', '2026-11-19'])
const SANDWICH = new Set(['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23', '2026-11-24'])
const TEAM_OFF = new Set(['2026-11-12'])

/**
 * Day states, as Apply Leave uses them: the engine only paints tones — the consumer maps its own rules
 * (holidays, charged leave, sandwich) to them. Large tiles; the range keeps each day's tone and rings its ends.
 */
export const DayStatesWithLegend: Story = {
  render: () => {
    const getDayState = (d: DateValue) => {
      const iso = ISO(d)
      if (SANDWICH.has(iso)) return { tone: 'amber' as const, marker: true, label: 'Sandwich — unpaid' }
      if (CHARGED.has(iso)) return { tone: 'warning' as const, label: 'Charged' }
      if (HOLIDAYS.has(iso)) return { tone: 'rose' as const, label: 'Holiday' }
      if (TEAM_OFF.has(iso)) return { tone: 'cyan' as const, pattern: 'dashed' as const, label: 'Team off' }
      const dow = new Date(iso + 'T00:00:00Z').getUTCDay()
      if (dow === 0) return { tone: 'rose' as const, label: 'Sunday' }
      if (dow === 6) return { tone: 'slate' as const, label: 'Saturday' }
      return undefined
    }
    return (
      <div className="w-[min(34rem,calc(100vw-2rem))] space-y-3 rounded-2xl border p-2">
        <RangeCalendar
          aria-label="Leave dates"
          size="lg"
          rangeStyle="outline"
          firstDayOfWeek="mon"
          defaultValue={{ start: parseDate('2026-11-18'), end: parseDate('2026-11-25') }}
          getDayState={getDayState}
        />
        <CalendarLegend
          className="px-3 pb-2"
          items={[
            { label: 'Today', today: true },
            { label: 'Charged', tone: 'warning' },
            { label: 'Team Off', tone: 'cyan', pattern: 'dashed' },
            { label: 'Holiday', tone: 'rose' },
            { label: 'Saturday', tone: 'slate' },
            { label: 'Sunday', tone: 'rose' },
            { label: 'Sandwich · Unpaid', tone: 'amber', marker: true },
          ]}
        />
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[title="Holiday"]')).toBeTruthy()
    await expect(canvasElement.querySelectorAll('[data-marker]').length).toBeGreaterThan(0)
  },
}

/** Range band: one continuous tint from start to end — no gaps between days (the fiscal year improvement). */
export const ContinuousRange: Story = {
  render: () => (
    <RangeCalendar
      aria-label="Fiscal year"
      defaultFocusedValue={parseDate('2025-04-01')}
      defaultValue={{ start: parseDate('2025-04-01'), end: parseDate('2026-03-31') }}
    />
  ),
}

/**
 * `granularity="month"`: a month picker on the same engine. It opens on the month grid, a click commits the
 * 1st of that month, and months wholly past `maxValue` are disabled. The title still opens the year grid.
 */
export const MonthPicker: Story = {
  args: {
    'aria-label': 'Payroll month',
    granularity: 'month',
    defaultValue: parseDate('2026-10-01'),
    maxValue: parseDate('2026-11-09'),
  },
  play: async ({ args, canvas }) => {
    // The grid scales in on mount; let it settle so the a11y check measures the resting colours.
    await animationsSettled()
    await expect(canvas.getByRole('button', { name: 'October 2026' })).toHaveAttribute('aria-current', 'date')
    await expect(canvas.getByRole('button', { name: 'December 2026' })).toBeDisabled()
    // November is still pickable: the bound falls inside it.
    await userEvent.click(canvas.getByRole('button', { name: 'November 2026' }))
    await waitFor(() => expect(args.onChange).toHaveBeenCalledTimes(1))
    await expect((mocked(args.onChange!).mock.lastCall?.[0] as DateValue).toString()).toBe('2026-11-01')
    // The selected tile's colour transitions; let it finish so the a11y check measures resting colours.
    await animationsSettled()
  },
}

/** `granularity="year"`: the year grid alone; a click commits 1 January of that year. */
export const YearPicker: Story = {
  args: { 'aria-label': 'Year', granularity: 'year', defaultValue: parseDate('2026-01-01') },
  play: async ({ args, canvas }) => {
    await animationsSettled()
    await userEvent.click(canvas.getByRole('button', { name: '2024' }))
    await waitFor(() => expect(args.onChange).toHaveBeenCalledTimes(1))
    await expect((mocked(args.onChange!).mock.lastCall?.[0] as DateValue).toString()).toBe('2024-01-01')
  },
}
