import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Clipboard, CreditCard, ReceiptText, Search, Settings } from 'lucide-react'
import { PageTabs, type PageTabItem } from './page-tabs'
import { SensitiveProvider, SensitiveToggle, SensitiveValue } from './sensitive'

const items: PageTabItem[] = [
  { value: 'mine', label: 'My Reimbursements', icon: ReceiptText, content: <p className="text-sm">Your claims this month.</p> },
  { value: 'details', label: 'Reimbursement Details', icon: Clipboard, content: <p className="text-sm">Every employee, by period.</p> },
  { value: 'search', label: 'Search Employee', icon: Search, content: <p className="text-sm">Find the claims of one person.</p> },
  { value: 'payment', label: 'Payment', icon: CreditCard, badge: 4, content: <p className="text-sm">Payouts waiting on you.</p> },
  { value: 'configure', label: 'Configure', icon: Settings, content: <p className="text-sm">Categories and limits.</p> },
]

/**
 * A module's top-level tab bar: primary-coloured, sticky under the app header, icon + label tabs and a
 * `headerAction` slot. Replaces `MaterialHeaderTab`. On a phone (under 640px) the labels drop and every
 * tab is an icon square, named for screen readers and by its `title`.
 */
const meta = {
  title: 'Patterns/Page Tabs',
  component: PageTabs,
  args: { items },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageTabs>

export default meta
type Story = StoryObj<typeof meta>

/** Selecting a tab shows its panel; the count badge rides on its tab. */
export const Basic: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: /My Reimbursements/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(canvas.getByRole('tab', { name: /Payment/ }))
    await waitFor(() => expect(canvas.getByRole('tabpanel')).toHaveTextContent('Payouts waiting on you.'))
    await expect(canvas.getByRole('tab', { name: /Payment/ })).toHaveTextContent('4')
  },
}

/** `headerAction` is pinned to the right of the bar: here the eye that hides amounts, in its `onPrimary` look. */
export const WithHeaderAction: Story = {
  render: (args) => (
    <SensitiveProvider>
      <PageTabs
        {...args}
        headerAction={<SensitiveToggle variant="onPrimary" />}
        items={[
          {
            value: 'mine',
            label: 'My Reimbursements',
            icon: ReceiptText,
            content: <p className="text-sm">Total claimed: <SensitiveValue>₹18,450</SensitiveValue></p>,
          },
          ...items.slice(1),
        ]}
      />
    </SensitiveProvider>
  ),
  play: async ({ canvas }) => {
    const eye = canvas.getByRole('button', { name: 'Show amounts' })
    await expect(eye).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(eye)
    await waitFor(() => expect(canvas.getByText('₹18,450')).toBeVisible())
  },
}

/** Tabs the person has no access to are passed with `hidden` and skipped, so the others never shift. */
export const HiddenTabs: Story = {
  args: { items: items.map((item) => (item.value === 'payment' || item.value === 'configure' ? { ...item, hidden: true } : item)) },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('tab')).toHaveLength(3)
  },
}

function ControlledTabs(props: React.ComponentProps<typeof PageTabs>) {
  const [value, setValue] = React.useState('details')
  return <PageTabs {...props} value={value} onValueChange={setValue} />
}

/** Controlled by the page (the tab lives in the URL there). */
export const Controlled: Story = {
  render: (args) => <ControlledTabs {...args} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: /Reimbursement Details/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(canvas.getByRole('tab', { name: /Search Employee/ }))
    await expect(canvas.getByRole('tab', { name: /Search Employee/ })).toHaveAttribute('aria-selected', 'true')
  },
}

/** Sticks under a fixed app header: the host sets `--page-tabs-offset` on the bar. Scroll to see it hold. */
export const StickyUnderHeader: Story = {
  render: (args) => (
    <div className="h-[420px] overflow-y-auto">
      <PageTabs {...args} className="top-0" />
      <div className="h-[900px] px-5 py-4 text-sm text-muted-foreground">Scroll: the bar stays pinned.</div>
    </div>
  ),
}
