import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { Clipboard, CreditCard, ReceiptText, Search, Settings } from 'lucide-react'
import { PageTabs, type PageTabItem } from './page-tabs'
import { SensitiveProvider, SensitiveToggle, SensitiveValue } from './sensitive'

const items: PageTabItem[] = [
  { value: 'mine', label: 'My Reimbursements', shortLabel: 'Mine', icon: ReceiptText, content: <p className="text-sm">Your claims this month.</p> },
  { value: 'details', label: 'Reimbursement Details', shortLabel: 'Details', icon: Clipboard, content: <p className="text-sm">Every employee, by period.</p> },
  { value: 'search', label: 'Search Employee', shortLabel: 'Search', icon: Search, content: <p className="text-sm">Find the claims of one person.</p> },
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
    // The pointer is still over the eye, so its tooltip is open. Leave and wait for the tooltip to unmount,
    // or the a11y check would measure it mid-way through its closing fade.
    await userEvent.unhover(eye)
    await waitFor(() => expect(document.querySelector('[data-slot="tooltip-content"]')).toBeNull())
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

/** Phone, one tab: it names itself (row mode) rather than showing a lone unexplained glyph. */
export const PhoneOneTab: Story = {
  args: { items: items.slice(0, 1) },
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('tab', { name: /My Reimbursements/ })).toBeVisible()
    await expect(document.querySelector('[data-slot="page-tabs-bar"]')).toHaveAttribute('data-phone-mode', 'row')
  },
}

const barMode = () => document.querySelector('[data-slot="page-tabs-bar"]')?.getAttribute('data-phone-mode')

/** Phone (375px), five tabs: room for every tab at 64px, so each shows its icon over a short name (nav). */
export const PhoneFiveTabs: Story = {
  globals: { viewport: { value: 'mobile2' } },
  play: async ({ canvas }) => {
    await expect(barMode()).toBe('nav')
    await expect(canvas.getByText('Mine')).toBeVisible()
  },
}

/** Phone (320px), five tabs: not enough for names, so icons, with the SELECTED tab named. */
export const PhoneIconsMode: Story = {
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(barMode()).toBe('icons')
    await expect(canvas.getByText('My Reimbursements')).toBeVisible()
    await userEvent.click(canvas.getByRole('tab', { name: /Payment/ }))
    await waitFor(() => expect(canvas.getByText('Payment')).toBeVisible())
  },
}

/** Phone (320px), five tabs and the eye: the eye rail takes ~57px, so icons only (bare). Names stay as titles. */
export const PhoneFiveTabsWithEye: Story = {
  render: (args) => (
    <SensitiveProvider>
      <PageTabs {...args} headerAction={<SensitiveToggle variant="onPrimary" />} />
    </SensitiveProvider>
  ),
  globals: { viewport: { value: 'mobile1' } },
  play: async ({ canvas }) => {
    await expect(barMode()).toBe('bare')
    await expect(canvas.getByRole('tab', { name: /My Reimbursements/ })).toHaveAttribute('title', 'My Reimbursements')
    await expect(canvas.getByRole('button', { name: 'Show amounts' })).toBeVisible()
  },
}

/** Phone, seven tabs: icons only, the selected tab marked by its fill (bare). */
export const PhoneManyTabs: Story = {
  args: { items: [...items, { value: 'x', label: 'Reports', icon: Clipboard }, { value: 'y', label: 'Audit', icon: Search }] },
  globals: { viewport: { value: 'mobile1' } },
}
