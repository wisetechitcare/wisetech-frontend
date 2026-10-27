import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Download, Plus, Settings, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from './button'

/** The one button. Variants carry meaning: one primary action per view, destructive only for irreversible actions. */
const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Add employee', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg', 'icon'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** The primary action of a view. Clicking calls `onClick`. */
export const Primary: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add employee' }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

/** Secondary and outline actions sit beside a primary one. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args}>
        <Plus /> Add employee
      </Button>
      <Button {...args} variant="secondary">
        Save draft
      </Button>
      <Button {...args} variant="outline">
        <Download /> Export
      </Button>
      <Button {...args} variant="ghost">
        Cancel
      </Button>
      <Button {...args} variant="link">
        View policy
      </Button>
    </div>
  ),
}

/** Irreversible actions only. */
export const Destructive: Story = {
  args: { variant: 'destructive', children: <><Trash2 /> Delete</> },
}

/** Sizes for dense toolbars through to prominent CTAs. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args} size="xs">Extra small</Button>
      <Button {...args} size="sm">Small</Button>
      <Button {...args}>Default</Button>
      <Button {...args} size="lg">Large</Button>
    </div>
  ),
}

/** Icon-only buttons must have an accessible name. */
export const IconOnly: Story = {
  args: { size: 'icon', variant: 'outline', 'aria-label': 'Settings', children: <Settings /> },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
  },
}

/** Disabled buttons cannot be activated. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Add employee' })
    await expect(button).toBeDisabled()
    await userEvent.click(button, { pointerEventsCheck: 0 })
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

/** Navigation is a link, not a button: put `buttonVariants` on a real <a> so it keeps role="link". */
export const AsLink: Story = {
  render: () => (
    <a href="#policy" className={buttonVariants({ variant: 'outline' })}>
      Read the leave policy
    </a>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: 'Read the leave policy' })).toHaveAttribute('href', '#policy')
  },
}
