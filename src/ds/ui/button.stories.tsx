import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { CloudUpload, Download, Plus, Send, Settings, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from './button'

/** The one button. Variants carry meaning: one primary action per view, destructive only for irreversible actions. */
const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Add employee', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'inverted', 'secondary', 'outline', 'ghost', 'destructive', 'link'] },
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
      <Button {...args} variant="inverted">
        <CloudUpload /> Choose image
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

/**
 * The live app's dialog footer (New Announcement), rebuilt on the kit: WtButton `inverted` →
 * `inverted`, `ghost` (the standard Cancel) → `outline`, the accent CTA → `default`.
 */
export const DialogFooter: Story = {
  render: () => (
    <div className="flex w-[34rem] flex-col gap-4 rounded-2xl border bg-card p-5">
      <div>
        <Button variant="inverted" size="sm">
          <CloudUpload data-icon="inline-start" /> Choose Image
        </Button>
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline">Cancel</Button>
        <Button>
          <Send data-icon="inline-start" /> Post Announcement
        </Button>
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    for (const name of ['Choose Image', 'Cancel', 'Post Announcement']) {
      await expect(canvas.getByRole('button', { name })).toBeEnabled()
    }
  },
}

const STATE_VARIANTS = ['default', 'inverted', 'outline', 'secondary', 'ghost', 'destructive'] as const
const STATES = ['rest', 'hover', 'focus', 'pressed', 'disabled'] as const

/** Every variant in every state, forced with real CSS states (storybook-addon-pseudo-states), not simulated events. */
export const States: Story = {
  parameters: {
    pseudo: { hover: ['[data-state-demo="hover"]'], focusVisible: ['[data-state-demo="focus"]'], active: ['[data-state-demo="pressed"]'] },
  },
  render: () => (
    <table className="border-separate border-spacing-x-4 border-spacing-y-3 text-left text-xs text-muted-foreground">
      <thead>
        <tr>
          <th scope="col" className="font-medium">Variant</th>
          {STATES.map((state) => (
            <th key={state} scope="col" className="font-medium capitalize">{state}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {STATE_VARIANTS.map((variant) => (
          <tr key={variant}>
            <th scope="row" className="font-medium">{variant}</th>
            {STATES.map((state) => (
              <td key={state}>
                <Button variant={variant} data-state-demo={state} disabled={state === 'disabled'}>
                  {variant === 'destructive' ? 'Delete' : 'Save'}
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}

/** The same grid in dark mode. */
export const StatesDark: Story = { ...States, globals: { mode: 'dark' } }
