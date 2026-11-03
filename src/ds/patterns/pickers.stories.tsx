import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Briefcase, CalendarDays, Clock, FileText, Receipt, Users } from 'lucide-react'
import { Badge } from '@/ds/ui/badge'
import { ColorPicker, IconPicker } from './pickers'

function ColorHarness({ initial = 'blue' }: { initial?: string }) {
  const [value, setValue] = React.useState(initial)
  return (
    <div className="space-y-4">
      <ColorPicker label="Leave type colour" value={value} onChange={setValue} />
      <p className="text-sm">
        Preview:{' '}
        {value.startsWith('#') ? (
          <Badge variant="custom" style={{ '--tone': value } as React.CSSProperties}>Annual leave</Badge>
        ) : (
          <Badge variant={value as 'blue'}>Annual leave</Badge>
        )}
      </p>
    </div>
  )
}

/**
 * Colour and icon pickers for things an admin configures. Replace the live `WtColorPicker`, `IconPicker`
 * and `SwatchPicker`. One choice is always selected; every tile has a name for screen readers.
 */
const meta = {
  title: 'Patterns/Pickers',
  component: ColorPicker,
  args: { label: 'Leave type colour', value: 'blue', onChange: () => undefined },
  render: () => <ColorHarness />,
} satisfies Meta<typeof ColorPicker>

export default meta
type Story = StoryObj<typeof meta>

/** Pick a kit hue; clicking it again keeps it chosen. */
export const Colour: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Rose' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Rose' })).toHaveAttribute('aria-pressed', 'true'))
    await userEvent.click(canvas.getByRole('button', { name: 'Rose' }))
    await expect(canvas.getByRole('button', { name: 'Rose' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** A custom hex replaces the palette choice. */
export const CustomHex: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText('Custom colour (hex)'), '#DB2777')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'false'))
  },
}

const ICONS = [
  { value: 'users', label: 'People', icon: <Users /> },
  { value: 'clock', label: 'Attendance', icon: <Clock /> },
  { value: 'calendar', label: 'Leave', icon: <CalendarDays /> },
  { value: 'receipt', label: 'Payroll', icon: <Receipt /> },
  { value: 'briefcase', label: 'Recruitment', icon: <Briefcase /> },
  { value: 'file', label: 'Documents', icon: <FileText /> },
]

function IconHarness() {
  const [value, setValue] = React.useState('calendar')
  return <IconPicker label="Section icon" value={value} onChange={setValue} options={ICONS} />
}

/** Icons are read out by name. */
export const Icon: Story = {
  render: () => <IconHarness />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Payroll' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Payroll' })).toHaveAttribute('aria-pressed', 'true'))
    await expect(canvas.getByRole('button', { name: 'Leave' })).toHaveAttribute('aria-pressed', 'false')
  },
}
