import type { Meta, StoryObj } from '@storybook/react-vite'
import { Kbd, KbdGroup } from './kbd'

/** A keyboard key or shortcut in text — "Press Ctrl K to search". */
const meta = {
  title: 'Components/Kbd',
  component: Kbd,
} satisfies Meta<typeof Kbd>

export default meta
type Story = StoryObj<typeof meta>

/** A shortcut in a sentence. */
export const Shortcut: Story = {
  render: () => (
    <p className="text-sm text-muted-foreground">
      Press{' '}
      <KbdGroup>
        <Kbd>Ctrl</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>{' '}
      to search people, pages and actions.
    </p>
  ),
}
