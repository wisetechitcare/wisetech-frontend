import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { ChevronsUpDown } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion'
import { Button } from './button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible'

import { animationsSettled } from '@/ds/lib/motion'

const POLICIES = [
  { id: 'carry', q: 'How much leave carries forward?', a: 'Up to the carry-forward limit set in the leave policy. The rest lapses on 31 March.' },
  { id: 'half', q: 'Can I take half a day?', a: 'Yes. A half day counts as 0.5 against your balance.' },
  { id: 'sandwich', q: 'Do weekends between leave days count?', a: 'Only when your branch has the sandwich rule switched on.' },
]

/**
 * Stacked sections that expand in place — FAQs, policy explanations, settings groups.
 * For ONE secondary block ("advanced options", "show history") use `Collapsible` — see Single Section below.
 */
const meta = {
  title: 'Components/Accordion',
  component: Accordion,
  render: (args) => (
    <Accordion className="max-w-lg" {...args}>
      {POLICIES.map((p) => (
        <AccordionItem key={p.id} value={p.id}>
          <AccordionTrigger>{p.q}</AccordionTrigger>
          <AccordionContent>{p.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

/** One open at a time; the trigger reports its state. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Can I take half a day?' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
    await waitFor(() => expect(canvas.getByText(/counts as 0.5/)).toBeVisible())
    await animationsSettled()
  },
}

/** Opened on a section. */
export const DefaultOpen: Story = {
  args: { defaultValue: ['carry'] },
  // The panel fades in on mount; judge the settled frame.
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(/carry-forward limit/)).toBeVisible())
    await animationsSettled()
  },
}

/** Several sections open together. */
export const Multiple: Story = {
  args: { multiple: true, defaultValue: ['carry', 'half'] },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(/counts as 0.5/)).toBeVisible())
    await animationsSettled()
  },
}

function AdvancedOptions({ defaultOpen }: { defaultOpen?: boolean }) {
  return (
    <Collapsible className="max-w-sm space-y-2" defaultOpen={defaultOpen}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">Advanced options</p>
        <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Toggle advanced options" />}>
          <ChevronsUpDown aria-hidden />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2 text-sm text-muted-foreground">
        <p>Round worked hours to the nearest 15 minutes.</p>
        <p>Count early check-in as overtime.</p>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** `Collapsible`: one block with its own trigger, closed by default. */
export const SingleSection: Story = {
  render: () => <AdvancedOptions />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Toggle advanced options' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    await waitFor(() => expect(canvas.getByText(/nearest 15 minutes/)).toBeVisible())
    await animationsSettled()
  },
}

/** `Collapsible` starting open. */
export const SingleSectionOpen: Story = {
  render: () => <AdvancedOptions defaultOpen />,
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByText(/nearest 15 minutes/)).toBeVisible())
    await animationsSettled()
  },
}
