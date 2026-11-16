import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { CalendarDays, ChevronRight, Receipt } from 'lucide-react'
import { Avatar, AvatarFallback } from './avatar'
import { Button } from './button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from './item'

/**
 * A row in a short list — approvals, reminders, people, settings links. Media, text, actions. For
 * data with columns, sorting or paging use the table instead.
 */
const meta = {
  title: 'Components/Item',
  component: Item,
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
} satisfies Meta<typeof Item>

export default meta
type Story = StoryObj<typeof meta>

const approve = fn()

/** A decision row: who, what, and the two actions inline. */
export const ApprovalRow: Story = {
  render: () => (
    <ItemGroup>
      <Item role="listitem" variant="outline">
        <ItemMedia>
          <Avatar>
            <AvatarFallback>TM</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemTitle>Tara Menon · Annual leave</ItemTitle>
          <ItemDescription>3–5 November · 3 days · applied yesterday</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">Decline</Button>
          <Button size="sm" onClick={approve}>Approve</Button>
        </ItemActions>
      </Item>
    </ItemGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Approve' }))
    await expect(approve).toHaveBeenCalled()
  },
}

/** Icon rows — a "coming up" list. (ItemSeparator is for item stacks that are not lists.) */
export const IconList: Story = {
  render: () => (
    <ItemGroup>
      <Item role="listitem" size="sm">
        <ItemMedia variant="icon">
          <CalendarDays aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Diwali — office closed</ItemTitle>
        </ItemContent>
        <ItemActions className="text-xs text-muted-foreground">1 Nov</ItemActions>
      </Item>
      <Item role="listitem" size="sm">
        <ItemMedia variant="icon">
          <Receipt aria-hidden />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>October payroll run</ItemTitle>
        </ItemContent>
        <ItemActions className="text-xs text-muted-foreground">31 Oct</ItemActions>
      </Item>
    </ItemGroup>
  ),
}

/** A whole row as a link (settings navigation). */
export const LinkRow: Story = {
  render: () => (
    <Item variant="muted" render={<a href="#leave-policy" />}>
      <ItemContent>
        <ItemTitle>Leave policy</ItemTitle>
        <ItemDescription>Types, accrual, carry-forward and sandwich rules</ItemDescription>
      </ItemContent>
      <ItemActions>
        <ChevronRight className="size-4" aria-hidden />
      </ItemActions>
    </Item>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('link', { name: /Leave Policy/ })).toHaveAttribute('href', '#leave-policy')
  },
}
