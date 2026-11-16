import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ScrollArea } from './scroll-area'

const PEOPLE = Array.from({ length: 30 }, (_, i) => `Employee ${String(i + 1).padStart(2, '0')}`)

/** A bounded region that scrolls on its own, with a themed scrollbar — long lists inside cards and popovers. */
const meta = {
  title: 'Components/ScrollArea',
  component: ScrollArea,
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

/** Fixed height, content scrolls. Keyboard users reach it with Tab. */
export const Default: Story = {
  render: () => (
    <ScrollArea className="h-56 w-64 rounded-xl border" tabIndex={0} aria-label="Team members">
      <ul className="p-3 text-sm">
        {PEOPLE.map((p) => (
          <li key={p} className="border-b py-2 last:border-0">{p}</li>
        ))}
      </ul>
    </ScrollArea>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Employee 30')).toBeInTheDocument()
  },
}
