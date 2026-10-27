import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent } from 'storybook/test'
import { Settings } from 'lucide-react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

/** Short supplementary label on hover or focus. Never the only way to get essential information. */
const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings aria-hidden />
        </Button>
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
    await expect(await screen.findByRole('tooltip')).toHaveTextContent('Settings')
  },
}
