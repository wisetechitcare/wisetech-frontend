import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Settings } from 'lucide-react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

/**
 * Short supplementary label on hover or focus. Never the only way to get essential information:
 * Base UI treats the popup as visual only (no role="tooltip"), so the trigger needs its own
 * accessible name (here `aria-label`).
 */
const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger render={<Button variant="outline" size="icon" aria-label="Settings" />}>
        <Settings aria-hidden />
      </TooltipTrigger>
      <TooltipContent>Settings</TooltipContent>
    </Tooltip>
  ),
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

/** Keyboard focus shows the tooltip. */
export const OnFocus: Story = {
  play: async () => {
    await userEvent.tab()
    await waitFor(() =>
      expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Settings'),
    )
  },
}
