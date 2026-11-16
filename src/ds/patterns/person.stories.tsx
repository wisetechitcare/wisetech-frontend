import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Mail, Pencil, Phone } from 'lucide-react'
import { Badge } from '@/ds/ui/badge'
import { Button } from '@/ds/ui/button'
import portrait from '@/ds/ui/__fixtures__/portrait.svg'
import { PersonCell, PersonHeader } from './person'

/**
 * A person, two ways: `PersonCell` in tables and lists (live `EmployeeIdentityCell`), and `PersonHeader` at
 * the top of a record page (live `EntityIdentityHeader`).
 */
const meta = {
  title: 'Patterns/Person',
  component: PersonCell,
  args: { name: 'Meera Joshi', code: 'WT-0042', subtitle: 'Senior MEP Engineer' },
} satisfies Meta<typeof PersonCell>

export default meta
type Story = StoryObj<typeof meta>

/** Avatar initials, name, code and role. */
export const Cell: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('MJ')).toBeInTheDocument()
    await expect(canvas.getByText('WT-0042 · Senior MEP Engineer')).toBeInTheDocument()
  },
}

/** Inactive is said in text, not only by fading. */
export const InactiveCell: Story = {
  args: { name: 'Rohan Kapoor', code: 'WT-0007', subtitle: 'Left 2026.08.31', inactive: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Inactive')).toBeInTheDocument()
  },
}

/** Compact, name only (dense tables). */
export const SmallCell: Story = { args: { size: 'sm' } }

/** With the employee's photo: the photo replaces the initials once it loads (Smart Avatar). */
export const PhotoCell: Story = {
  args: { avatarUrl: portrait },
  play: async ({ canvasElement }) => {
    const avatar = canvasElement.querySelector('[data-slot="smart-avatar"]')!
    await waitFor(() => expect(avatar).toHaveAttribute('data-image'))
    await expect(avatar.querySelector('img')).toHaveAttribute('src', portrait)
  },
}

/** `showAvatar={false}`: text only, for money and payment tables where a face adds width, not information. */
export const TextOnlyCell: Story = {
  args: { showAvatar: false, avatarUrl: portrait },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvasElement.querySelector('[data-slot="smart-avatar"]')).toBeNull()
    await expect(canvas.getByText('Meera Joshi')).toBeInTheDocument()
  },
}

const onBack = fn()

/** Record page header: name is the page's h1; contact links are real links. */
export const Header: Story = {
  render: () => (
    <PersonHeader
      name="Meera Joshi"
      meta={['Senior MEP Engineer', 'Engineering', 'Mumbai — Andheri', 'WT-0042']}
      badges={<Badge variant="success" dot>Active</Badge>}
      links={[
        { href: 'mailto:meera@wisetech.in', label: 'meera@wisetech.in', icon: <Mail aria-hidden /> },
        { href: 'tel:+919800000210', label: '+91 98000 00210', icon: <Phone aria-hidden /> },
      ]}
      actions={
        <Button variant="outline">
          <Pencil data-icon="inline-start" aria-hidden /> Edit profile
        </Button>
      }
      onBack={onBack}
    />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Meera Joshi' })).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: /meera@wisetech.in/ })).toHaveAttribute('href', 'mailto:meera@wisetech.in')
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(onBack).toHaveBeenCalled()
  },
}
