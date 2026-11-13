import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { PeriodNavigator } from './period-navigator'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function MonthStepper() {
  const [m, setM] = React.useState(9) // October
  return (
    <PeriodNavigator
      label={`${MONTHS[m]} 2026`}
      secondaryLabel="22 working days"
      onPrevious={() => setM((x) => Math.max(0, x - 1))}
      onNext={() => setM((x) => Math.min(10, x + 1))}
      onToday={() => setM(10)}
      disablePrevious={m === 0}
      disableNext={m === 10}
    />
  )
}

/** ‹ October 2026 › on attendance, payroll and timesheets. Replaces the live `PeriodNavigator`. */
const meta = {
  title: 'Patterns/Period Navigator',
  component: PeriodNavigator,
  args: { label: 'October 2026', onPrevious: fn(), onNext: fn() },
  render: () => <MonthStepper />,
} satisfies Meta<typeof PeriodNavigator>

export default meta
type Story = StoryObj<typeof meta>

/** Next steps forward; the future past this month is disabled. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Next month' }))
    await expect(canvas.getByText('November 2026')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Next month' })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Previous month' }))
    await expect(canvas.getByText('October 2026')).toBeInTheDocument()
  },
}

function MonthJumper() {
  const [value, setValue] = React.useState('2026-10-01')
  const [y, m] = value.split('-').map(Number)
  const step = (d: number) => {
    const n = new Date(Date.UTC(y, m - 1 + d, 1))
    setValue(n.toISOString().slice(0, 10))
  }
  return (
    <PeriodNavigator
      label={`${MONTHS[m - 1]} ${y}`}
      onPrevious={() => step(-1)}
      onNext={() => step(1)}
      onPick={setValue}
      pickValue={value}
      pickGranularity="month"
      pickMax="2026-11-30"
    />
  )
}

/** Click the label to jump: the kit Calendar opens on the month grid; one click lands on the month. */
export const JumpToMonth: Story = {
  render: () => <MonthJumper />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /October 2026\s*, choose a month/ }))
    const body = within(document.body)
    await userEvent.click(await body.findByRole('button', { name: 'January 2026' }))
    await waitFor(() => expect(canvas.getByText('January 2026')).toBeInTheDocument())
    await animationsSettled()
  },
}

/** On a phone the control fills its row and the label takes the slack. */
export const Phone: Story = {
  render: () => <MonthJumper />,
  globals: { viewport: { value: 'mobile1' } },
}
