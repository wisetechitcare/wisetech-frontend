import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { CircleCheck, CircleAlert, Info, TriangleAlert } from 'lucide-react'
import { Button } from './button'
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert'

/**
 * A line of explanation inside a form, panel or page — never a popup. Replaces the live kit's
 * `InlineNotice` / `InlineHint`. Status tones carry an icon and a title, never colour alone.
 */
const meta = {
  title: 'Components/Alert',
  component: Alert,
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

/** Neutral explanation on the card surface. */
export const Default: Story = {
  render: () => (
    <Alert>
      <Info aria-hidden />
      <AlertTitle>Leave year runs April to March</AlertTitle>
      <AlertDescription>Balances reset on 1 April. Unused leave above the carry-forward limit lapses.</AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Leave year runs April to March')
  },
}

/** The WiseTech status set: one meaning per colour, same roles as Badge. */
export const StatusTones: Story = {
  render: () => (
    <div className="grid gap-3">
      <Alert variant="success">
        <CircleCheck aria-hidden />
        <AlertTitle>Payroll locked</AlertTitle>
        <AlertDescription>October payroll is final. Payslips go out on 31 October.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <Info aria-hidden />
        <AlertTitle>Probation ends 12 November</AlertTitle>
        <AlertDescription>Paid leave balances become visible after confirmation.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <TriangleAlert aria-hidden />
        <AlertTitle>3 attendance corrections pending</AlertTitle>
        <AlertDescription>They must be decided before the payroll run.</AlertDescription>
      </Alert>
      <Alert variant="danger">
        <CircleAlert aria-hidden />
        <AlertTitle>Bank details missing</AlertTitle>
        <AlertDescription>This employee will be skipped in the salary transfer file.</AlertDescription>
      </Alert>
    </div>
  ),
}

/** shadcn's own destructive style (red text on the card surface). */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle>Import failed</AlertTitle>
      <AlertDescription>Row 14 has an invalid date of joining. Fix it and upload again.</AlertDescription>
    </Alert>
  ),
}

/** With an action on the right, e.g. the way out of the situation. */
export const WithAction: Story = {
  render: () => (
    <Alert variant="warning">
      <TriangleAlert aria-hidden />
      <AlertTitle>Unsaved draft from yesterday</AlertTitle>
      <AlertDescription>Pick up where you left off, or start again.</AlertDescription>
      <AlertAction>
        <Button size="sm" variant="outline">Resume</Button>
      </AlertAction>
    </Alert>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Resume' })).toBeEnabled()
  },
}
