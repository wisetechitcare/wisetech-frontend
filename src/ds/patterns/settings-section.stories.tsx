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
