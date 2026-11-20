import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Timeline, type TimelineItem } from './timeline'

const BILL_LIFECYCLE: TimelineItem[] = [
  { key: 'raised', title: 'Billing request raised', meta: '2026.03.02 11:40 · Stage 2 of 4', state: 'done' },
  { key: 'approved', title: 'Approved by Finance', meta: '2026.03.03 09:15 · Neha Iyer', state: 'done' },
  { key: 'proforma', title: 'Proforma issued', meta: '2026.03.04 16:02 · WT/PI/26-27/0041', state: 'current' },
  { key: 'payment', title: 'Payment received', meta: 'Awaiting the client', state: 'upcoming' },
  { key: 'invoice', title: 'Tax invoice issued', state: 'upcoming' },
]

/** What happened to a record, in order. Read-only history — the Stepper is the control for a task in progress. */
const meta = {
  title: 'Patterns/Timeline',
  component: Timeline,
  args: { items: BILL_LIFECYCLE },
  decorators: [(Story) => <div className="w-[min(420px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

/** Finished entries carry a check (and "completed" for screen readers); the one in progress is solid. */
export const Default: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(5)
    await expect(canvas.getAllByText('(completed)', { exact: false })).toHaveLength(2)
    await expect(canvas.getByText('Proforma issued')).toBeInTheDocument()
    // An "upcoming" marker holds a DOT, and it must stay 8px. It is a <span> rather than a
    // Lucide Circle because the marker's `[&>svg]:size-3.5` compiles to `.marker > svg`, which
    // outranks any `size-*` put on the svg itself — the dot would silently render at 14px.
    const dots = canvasElement.querySelectorAll<HTMLElement>('[data-slot="timeline-dot"]')
    await expect(dots).toHaveLength(2)
    await expect(Math.round(dots[0].getBoundingClientRect().width)).toBe(8)
  },
}

/** An entry can carry what happened while it was current, on its own hairline rail. */
export const WithEvents: Story = {
  args: {
    items: BILL_LIFECYCLE.map((item) =>
      item.key === 'proforma'
        ? {
            ...item,
            events: [
              { key: 'd1', message: 'Downloaded as PDF', meta: 'Mustafa Shaikh · 2026.03.04 16:10' },
              { key: 'd2', message: 'Emailed to accounts@acme.example', meta: 'System · 2026.03.04 16:12' },
              { key: 'd3', message: 'Marked as sent', meta: 'Mustafa Shaikh · 2026.03.05 10:01' },
            ],
          }
        : item,
    ),
  },
  play: async ({ canvas }) => {
    // Three nested events on top of the five lifecycle entries.
    await expect(canvas.getAllByRole('listitem')).toHaveLength(8)
    await expect(canvas.getByText('Marked as sent')).toBeInTheDocument()
  },
}

/** A step that failed says so to a screen reader too, not by colour alone. */
export const Failed: Story = {
  args: {
    items: [
      ...BILL_LIFECYCLE.slice(0, 2),
      { key: 'proforma', title: 'Proforma rejected', meta: '2026.03.04 16:02 · GST number missing', state: 'failed' },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('(failed)', { exact: false })).toHaveLength(1)
  },
}

/** Tighter rows, for a card or a side panel. */
export const Dense: Story = { args: { dense: true } }

/** A single entry needs no connector — the rail ends at the marker. */
export const SingleEntry: Story = {
  args: { items: BILL_LIFECYCLE.slice(0, 1) },
}

/** 360px: titles wrap instead of pushing the rail off-screen. */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1' } },
  decorators: [(Story) => <div className="w-[320px]"><Story /></div>],
  args: {
    items: [
      { key: 'long', title: 'Billing request raised against stage 2 of the MEP consultancy deliverable', meta: '2026.03.02 11:40', state: 'done' },
      ...BILL_LIFECYCLE.slice(2),
    ],
  },
}
