import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
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
