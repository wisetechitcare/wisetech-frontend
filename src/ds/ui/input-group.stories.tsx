import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { AtSign, Search, X } from 'lucide-react'
import { Label } from './label'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from './input-group'

/**
 * An input with things inside its frame — a search icon, a unit, a domain, a clear button. Money
 * fields put the currency here (`InputGroupText`), never in the label.
 */
const meta = {
  title: 'Components/InputGroup',
  component: InputGroup,
  decorators: [(Story) => <div className="max-w-sm space-y-1.5"><Story /></div>],
} satisfies Meta<typeof InputGroup>

export default meta
type Story = StoryObj<typeof meta>

/** Search with a leading icon and a clear button. */
const onClearSearch = fn()
export const Search_: Story = {
  name: 'Search',
  render: () => (
    <InputGroup>
      <InputGroupAddon>
        <Search aria-hidden />
      </InputGroupAddon>
      <InputGroupInput aria-label="Search employees" placeholder="Search employees" defaultValue="Meera" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={onClearSearch}>
          <X aria-hidden />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }))
    await expect(onClearSearch).toHaveBeenCalled()
  },
}

/** Text before and after the value. */
export const PrefixAndSuffix: Story = {
  render: () => (
    <>
      <Label htmlFor="email-local">Work email</Label>
      <InputGroup>
        <InputGroupAddon>
          <AtSign aria-hidden />
        </InputGroupAddon>
        <InputGroupInput id="email-local" placeholder="meera.joshi" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>@wisetech.in</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </>
  ),
}

/** A unit after a number. */
export const Unit: Story = {
  render: () => (
    <>
      <Label htmlFor="radius">Check-in radius</Label>
      <InputGroup>
        <InputGroupInput id="radius" inputMode="numeric" defaultValue="150" />
        <InputGroupAddon align="inline-end">
          <InputGroupText>metres</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </>
  ),
}
