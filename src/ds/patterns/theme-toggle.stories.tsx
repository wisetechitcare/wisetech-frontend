import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { ThemeToggle } from './theme-toggle'

/** Light / dark switch: an icon button named by the kit Tooltip. The app owns the theme; this shows and flips it. */
const meta = {
  title: 'Patterns/Theme Toggle',
  component: ThemeToggle,
  args: { mode: 'light', onToggle: () => {} },
  render: function Render(args) {
    const [mode, setMode] = React.useState(args.mode)
    return <ThemeToggle mode={mode} onToggle={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))} />
  },
} satisfies Meta<typeof ThemeToggle>

export default meta
type Story = StoryObj<typeof meta>

/** Says what it will do, and flips. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Switch to dark mode' })
    await expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    await expect(canvas.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true')
  },
}

/** The icon-only button is named by the kit Tooltip on keyboard focus. */
export const TooltipOnFocus: Story = {
  tags: ['!autodocs'], // a test, not a demo
  play: async () => {
    await userEvent.tab()
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toHaveTextContent('Switch to dark mode'))
    await animationsSettled()
  },
}
