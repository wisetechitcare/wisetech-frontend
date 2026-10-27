import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

/** Switch between related views of the same record. */
const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  args: { defaultValue: 'overview' },
  render: (args) => (
    <Tabs {...args} className="w-[28rem]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="leave">Leave</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="pt-3 text-body">Employment, organisation and compensation.</TabsContent>
      <TabsContent value="leave" className="pt-3 text-body">Balances and requests.</TabsContent>
      <TabsContent value="documents" className="pt-3 text-body">Offer letter, ID proofs, policies.</TabsContent>
    </Tabs>
  ),
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

/** Selecting a tab shows its panel. */
export const SwitchTab: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Leave' }))
    await expect(canvas.getByRole('tab', { name: 'Leave' })).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Balances and requests.')
  },
}

/** Arrow keys move between tabs. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    canvas.getByRole('tab', { name: 'Overview' }).focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('tab', { name: 'Leave' })).toHaveFocus()
  },
}
