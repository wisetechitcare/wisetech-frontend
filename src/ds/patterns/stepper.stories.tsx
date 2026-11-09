import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Stepper, type Step } from './stepper'

const ONBOARDING: Step[] = [
  { label: 'Personal', description: 'Name, contact, address' },
  { label: 'Job', description: 'Role, branch, manager' },
  { label: 'Salary', description: 'CTC and structure' },
  { label: 'Documents', optional: true },
  { label: 'Review' },
]

/** Where the user is in a multi-step task. Replaces the live `WtStepper`. */
const meta = {
  title: 'Patterns/Stepper',
  component: Stepper,
  args: { steps: ONBOARDING, activeStep: 2 },
  decorators: [(Story) => <div className="w-[min(900px,calc(100vw-2rem))]"><Story /></div>],
} satisfies Meta<typeof Stepper>

export default meta
type Story = StoryObj<typeof meta>

/** Done steps get a check (and "completed" for screen readers); the current step is marked. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const current = canvas.getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step')
    await expect(current).toHaveTextContent('Salary')
    await expect(canvas.getAllByText('(completed)', { exact: false })).toHaveLength(2)
  },
}

function Navigable() {
  const [active, setActive] = React.useState(2)
  return <Stepper steps={ONBOARDING} activeStep={active} onStepClick={setActive} />
}

/** Done steps are buttons that go back; future steps are not reachable. */
export const ClickToGoBack: Story = {
  render: () => <Navigable />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Personal/ }))
    const current = canvas.getAllByRole('listitem').find((li) => li.getAttribute('aria-current') === 'step')
    await expect(current).toHaveTextContent('Personal')
    await expect(canvas.queryByRole('button', { name: /Review/ })).not.toBeInTheDocument()
  },
}

/** A step with a problem says what it is. */
export const WithError: Story = {
  args: {
    activeStep: 4,
    steps: ONBOARDING.map((s) => (s.label === 'Salary' ? { ...s, error: true, errorText: 'CTC is below the salary floor' } : s)),
  },
}

/** Vertical, for a side rail in long forms. */
export const Vertical: Story = { args: { orientation: 'vertical' } }

/** Phones: "Step 3 of 5 · Salary" and a progress bar. */
export const Mobile: Story = {
  globals: { viewport: { value: 'mobile1' } },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
}
