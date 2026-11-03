import type * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { Badge } from './badge'

/** Status and metadata labels. Status badges always carry text — never colour alone. */
const meta = {
  title: 'Components/Badge',
  component: Badge,
  args: { children: 'Present', variant: 'success', dot: true },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'success', 'warning', 'danger', 'info', 'brand', 'neutral', 'blue', 'green', 'amber', 'rose', 'purple', 'cyan', 'slate', 'custom'],
    },
    dot: { control: 'boolean' },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

/** A single status badge with its dot. */
export const Status: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Present')).toHaveAttribute('data-variant', 'success')
  },
}

/** The WiseTech status set — one meaning per colour (attendance shown as the example). */
export const StatusSet: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" dot>Present</Badge>
      <Badge variant="warning" dot>Late</Badge>
      <Badge variant="danger" dot>Absent</Badge>
      <Badge variant="info" dot>On leave</Badge>
      <Badge variant="brand" dot>Remote</Badge>
      <Badge variant="neutral">Draft</Badge>
    </div>
  ),
}

/** Neutral metadata: counts, categories, plan names. */
export const Metadata: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Primary</Badge>
      <Badge variant="secondary">Full-time</Badge>
      <Badge variant="outline">Mumbai</Badge>
      <Badge variant="brand">Probation</Badge>
    </div>
  ),
}

/** Category hues: identity for leave types, departments and modules — never a status. */
export const CategoryHues: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="blue">Annual leave</Badge>
      <Badge variant="rose">Sick leave</Badge>
      <Badge variant="amber">Comp-off</Badge>
      <Badge variant="cyan">Work from home</Badge>
      <Badge variant="purple">Recruitment</Badge>
      <Badge variant="green">Engineering</Badge>
      <Badge variant="slate">Unpaid leave</Badge>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Sick leave')).toHaveAttribute('data-variant', 'rose')
  },
}

/** An admin-configured colour (a leave type's own colour), passed as the `--tone` variable. */
export const CustomColour: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="custom" style={{ '--tone': '#0EA5E9' } as React.CSSProperties}>Paternity leave</Badge>
      <Badge variant="custom" style={{ '--tone': '#DB2777' } as React.CSSProperties}>Maternity leave</Badge>
      <Badge variant="custom" style={{ '--tone': '#65A30D' } as React.CSSProperties}>Bereavement leave</Badge>
      <Badge variant="custom" dot style={{ '--tone': '#F59E0B' } as React.CSSProperties}>Marriage leave</Badge>
    </div>
  ),
}

/** Dark theme: the hues and a custom colour keep readable contrast (checked by axe). */
export const CategoryHuesDark: Story = {
  globals: { mode: 'dark' },
  play: async () => {
    await expect(document.documentElement).toHaveClass('dark')
  },
  render: () => (
    <div className="flex flex-wrap gap-2 bg-background p-3">
      {CategoryHues.render?.({} as never, {} as never)}
      <Badge variant="custom" style={{ '--tone': '#DB2777' } as React.CSSProperties}>Maternity leave</Badge>
    </div>
  ),
}
