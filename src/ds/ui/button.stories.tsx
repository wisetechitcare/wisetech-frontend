import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CSSProperties } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { Check, ChevronLeft, ChevronRight, CloudUpload, Download, Pencil, Plus, Send, Settings, Trash2, X } from 'lucide-react'
import { Button, buttonVariants } from './button'

/**
 * The one button: the live app's WtButton recipe (colours, gradients, depth, motion, 40px
 * height) in shadcn's pill shape. Variants carry meaning: one strong action per view, destructive only for irreversible
 * actions. Every ordinary action is `default` (there is no navy "primary": default always).
 * WtButton mapping: default tone (accent) → `default`, `tone="danger"` → `destructive`, `tone="success"` → `success`, `ghost` → `outline`,
 * `inverted` → `inverted`, `size="medium"` → `lg`, `flat={false}` → `glow`.
 */
const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Add employee', onClick: fn() },
  argTypes: {
    variant: { control: 'select', options: ['default', 'success', 'inverted', 'secondary', 'outline', 'ghost', 'destructive', 'link', 'tinted'] },
    size: { control: 'select', options: ['xs', 'sm', 'default', 'lg', 'icon'] },
    glow: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** The everyday action: `default`, used for every main action in the app. Clicking calls `onClick`. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add employee' }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

/** Every variant; secondary and outline actions sit beside the main (default) one. */
export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      <Button {...args}>
        <Plus /> Add employee
      </Button>
      <Button {...args} variant="success">
        <Check /> Approve
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

/** One hero action may glow in its own colour (WtButton `flat={false}`); never two side by side. */
export const Glow: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="lg" glow>Create Event</Button>
      <Button {...args} size="lg" variant="destructive" glow>Delete</Button>
      <Button {...args} size="lg" variant="success" glow>Approve</Button>
    </div>
  ),
}

/**
 * Row and card actions (the live ActionIconButton / WtIconButton): a pastel of the tone that deepens on
 * hover. Set the tone with the --tint CSS variable; white is the close control on coloured headers.
 */
export const Tinted: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="tinted" size="icon" aria-label="Edit"><Pencil /></Button>
      <Button variant="tinted" size="icon" aria-label="Delete" style={{ '--tint': 'var(--cta-danger)' } as CSSProperties}><Trash2 /></Button>
      <Button variant="tinted" size="icon" aria-label="Approve" style={{ '--tint': 'var(--cta-success)' } as CSSProperties}><Check /></Button>
      <Button variant="tinted" size="sm" style={{ '--tint': 'var(--cta-success)' } as CSSProperties}><Send data-icon="inline-start" /> Share</Button>
      <div className="rounded-2xl bg-(--brand) p-3">
        <Button variant="tinted" size="icon-sm" aria-label="Close" style={{ '--tint': 'white', '--tint-ink': 'white' } as CSSProperties}><X /></Button>
      </div>
    </div>
  ),
}

/** Busy: disabled and announced as busy, with a spinner; icon-only buttons swap the glyph for it. */
export const Loading: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button loading>Saving</Button>
      <Button variant="outline" loading>Exporting</Button>
      <Button variant="tinted" size="icon" aria-label="Refresh" loading><Settings /></Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const saving = canvas.getByRole('button', { name: 'Saving' })
    await expect(saving).toBeDisabled()
    await expect(saving).toHaveAttribute('aria-busy', 'true')
  },
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

/** The live discard confirmation: Keep Editing (WtButton `ghost`) beside Discard (`tone="danger"`). */
export const ConfirmDiscard: Story = {
  render: () => (
    <div className="grid w-[26rem] grid-cols-2 gap-4 rounded-2xl border bg-card p-5">
      <Button variant="outline">Keep Editing</Button>
      <Button variant="destructive">Discard</Button>
    </div>
  ),
}

/** The live wizard footer (Lead edit): Cancel, Save Changes, Back (disabled on the first step), Save &amp; Continue. */
export const WizardFooter: Story = {
  render: () => (
    <div className="flex w-[48rem] items-center justify-between gap-2 rounded-2xl border bg-card p-3">
      <div className="flex gap-2">
        <Button variant="outline">Cancel</Button>
        <Button variant="inverted">Save Changes</Button>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled>
          <ChevronLeft data-icon="inline-start" /> Back
        </Button>
        <Button>
          Save &amp; Continue <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Save & Continue' })).toBeEnabled()
  },
}

const STATE_VARIANTS = ['default', 'success', 'destructive', 'inverted', 'outline', 'secondary', 'ghost', 'tinted'] as const
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
                  {variant === 'destructive' ? 'Delete' : variant === 'success' ? 'Approve' : 'Save'}
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
