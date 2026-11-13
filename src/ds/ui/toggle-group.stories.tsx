import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Columns3, LayoutGrid, List } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from './toggle-group'

/**
 * Pick one view or period from a short set — Cards/List/Board, Day/Week/Month. Replaces the live kit's
 * `SegmentedControl`, `ViewModeSwitch` (and its six presets) and `PeriodTabs`.
 */
const meta = {
  title: 'Components/ToggleGroup',
  component: ToggleGroup,
  args: { onValueChange: fn() },
} satisfies Meta<typeof ToggleGroup>

export default meta
type Story = StoryObj<typeof meta>

/** View switch: icon + text, one always chosen. */
export const ViewMode: Story = {
  args: { defaultValue: ['cards'], variant: 'outline', spacing: 0 },
  render: (args) => (
    <ToggleGroup aria-label="View" {...args}>
      <ToggleGroupItem value="cards">
        <LayoutGrid aria-hidden /> Cards
      </ToggleGroupItem>
      <ToggleGroupItem value="list">
        <List aria-hidden /> List
      </ToggleGroupItem>
      <ToggleGroupItem value="board">
        <Columns3 aria-hidden /> Board
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'List' }))
    await waitFor(() => expect(canvas.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true'))
    await expect(args.onValueChange).toHaveBeenCalledWith(['list'], expect.anything())
  },
}

/** Period switch, text only, compact. */
export const Period: Story = {
  args: { defaultValue: ['week'], variant: 'outline', size: 'sm', spacing: 0 },
  render: (args) => (
    <ToggleGroup aria-label="Period" {...args}>
      <ToggleGroupItem value="day">Day</ToggleGroupItem>
      <ToggleGroupItem value="week">Week</ToggleGroupItem>
      <ToggleGroupItem value="month">Month</ToggleGroupItem>
    </ToggleGroup>
  ),
}

/** Several can be on (filters). */
export const MultipleFilters: Story = {
  args: { multiple: true, defaultValue: ['late'], spacing: 1 },
  render: (args) => (
    <ToggleGroup aria-label="Show" {...args}>
      <ToggleGroupItem value="late">Late</ToggleGroupItem>
      <ToggleGroupItem value="absent">Absent</ToggleGroupItem>
      <ToggleGroupItem value="leave">On leave</ToggleGroupItem>
    </ToggleGroup>
  ),
}
