import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, Calendar, Check, Search, Settings, Trash2, User } from 'lucide-react'
import { expect } from 'storybook/test'

/** Every icon is Lucide (`lucide-react`). One default rule (`svg.lucide` in `src/ds/styles/components.css`): stroke 1.75, middle-aligned, never shrinks. Utilities and an explicit `strokeWidth` still win. */
const meta = {
  title: 'Foundations/Icons',
  parameters: { layout: 'padded' },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const ICONS = [Calendar, Bell, Search, Settings, Trash2, User]

export const Icons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {ICONS.map((Icon) => (
        <Icon key={Icon.displayName} data-testid={Icon === Calendar ? 'default' : undefined} />
      ))}
      <Check data-testid="utility" className="size-5 stroke-2" />
      <Check data-testid="explicit" strokeWidth={3} />
    </div>
  ),
  play: async ({ canvas }) => {
    const icon = await canvas.findByTestId('default')
    const style = getComputedStyle(icon)
    await expect(style.strokeWidth).toBe('1.75px')
    await expect(style.verticalAlign).toBe('middle')
    await expect(style.flexShrink).toBe('0')
    await expect(icon).toHaveAttribute('aria-hidden', 'true')

    const utility = getComputedStyle(await canvas.findByTestId('utility'))
    await expect(utility.width).toBe('20px')
    await expect(utility.strokeWidth).toBe('2px')
    await expect(getComputedStyle(await canvas.findByTestId('explicit')).strokeWidth).toBe('3px')
  },
}
