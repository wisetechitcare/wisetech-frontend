import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Clock } from 'lucide-react'
import { Button } from '@/ds/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/ds/ui/input-group'
import { Switch } from '@/ds/ui/switch'
import { SettingsRow, SettingsSection } from './settings-section'

/**
 * The frame every configuration screen shares, filled with `SettingsRow`s. Replaces the live
 * `SettingsSection`.
 */
const meta = {
  title: 'Patterns/Settings Section',
  component: SettingsSection,
  args: { title: 'Attendance', description: 'How check-in and lateness are judged', icon: <Clock />, tone: 'green', count: 3 },
  render: (args) => (
    <SettingsSection {...args} action={<Button size="sm" variant="ghost">Reset to defaults</Button>}>
      <SettingsRow
        label="Grace period"
        description="Minutes after shift start before a check-in counts as late."
        htmlFor="grace"
        control={
          <InputGroup className="w-36">
            <InputGroupInput id="grace" inputMode="numeric" defaultValue="10" />
            <InputGroupAddon align="inline-end">
              <InputGroupText>min</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        }
      />
      <SettingsRow
        label="Allow check-in from phone"
        description="Employees inside the office radius can check in with the mobile app."
        htmlFor="phone-checkin"
        control={<Switch id="phone-checkin" defaultChecked />}
      />
      <SettingsRow
        label="Late-night waiver"
        description="Someone who worked past midnight is not marked late the next morning."
        htmlFor="waiver"
        control={<Switch id="waiver" />}
      />
    </SettingsSection>
  ),
  decorators: [(Story) => <div className="max-w-3xl"><Story /></div>],
} satisfies Meta<typeof SettingsSection>

export default meta
type Story = StoryObj<typeof meta>

/** Each row's label names its control. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: /Attendance/ })).toBeInTheDocument()
    await expect(canvas.getByLabelText('Grace Period')).toHaveValue('10')
    const waiver = canvas.getByRole('switch', { name: 'Late-night Waiver' })
    await userEvent.click(waiver)
    await waitFor(() => expect(waiver).toBeChecked())
  },
}

/** First paint: skeletons stand in for the title, the description and the body. */
export const Loading: Story = {
  args: { loading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Loading section')).toBeInTheDocument()
    // A write stays hidden until the real state is on screen, and so do the count and status.
    await expect(canvas.queryByRole('button', { name: 'Reset to defaults' })).not.toBeInTheDocument()
    await expect(canvas.queryByText('3')).not.toBeInTheDocument()
  },
}

/** A state pill beside the title, carrying its word — never colour alone. */
export const WithStatus: Story = {
  args: { status: 'warning' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Warning')).toBeInTheDocument()
  },
}

/** `size="sm"` tightens the padding for a dense configuration page. */
export const Dense: Story = { args: { size: 'sm' } }

function Refetching() {
  const [loading, setLoading] = React.useState(false)
  return (
    <SettingsSection
      title="Attendance"
      description="How check-in and lateness are judged"
      icon={<Clock />}
      tone="green"
      loading={loading}
      action={<Button size="sm" variant="ghost" onClick={() => setLoading(true)}>Refetch</Button>}
    >
      <SettingsRow label="Grace period" htmlFor="grace2" control={<InputGroupInput id="grace2" defaultValue="10" />} />
    </SettingsSection>
  )
}

/**
 * A LATER load keeps the body on screen. Replacing rendered children with skeletons on every
 * `loading` pass unmounts them — which collapsed open trees and threw the scroll to the top.
 */
export const RefetchKeepsTheBody: Story = {
  render: () => <Refetching />,
  play: async ({ canvas }) => {
    const grace = canvas.getByLabelText('Grace Period')
    await userEvent.click(canvas.getByRole('button', { name: 'Refetch' }))
    // Still the real control, not a skeleton — and it kept what was typed in it.
    await waitFor(() => expect(canvas.queryByLabelText('Loading section')).not.toBeInTheDocument())
    await expect(grace).toHaveValue('10')
  },
}
