import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { DynamicIcon } from './dynamic-icon'
import { Button } from './button'

/**
 * The only way to draw an icon whose name is data (DB columns, persisted config). Static
 * icons are imported from `lucide-react` directly. An unknown name renders nothing.
 */
const meta = {
  title: 'Kit/Dynamic Icon',
  component: DynamicIcon,
  args: { name: 'setting-2' },
} satisfies Meta<typeof DynamicIcon>

export default meta
type Story = StoryObj<typeof meta>

/** A stored registry name resolves to its Lucide glyph at the 18px default. */
export const Known: Story = {
  render: (args) => (
    <span role="img" aria-label="Settings">
      <DynamicIcon {...args} />
    </span>
  ),
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg.lucide')
    await expect(svg).not.toBeNull()
    await expect(svg).toHaveClass('size-[18px]')
  },
}

/** An unregistered name renders nothing (and warns in dev) rather than a blank square. */
export const Unknown: Story = {
  args: { name: 'definitely-not-registered' },
  render: (args) => (
    <div data-testid="slot">
      <DynamicIcon {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('slot')).toBeEmptyDOMElement()
  },
}

/** Inside a button, next to its label. The icon is decorative; the label names the action. */
export const InsideButton: Story = {
  render: (args) => (
    <Button>
      <DynamicIcon {...args} name="bi-trash" />
      Delete
    </Button>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Delete' })).toBeVisible()
  },
}
