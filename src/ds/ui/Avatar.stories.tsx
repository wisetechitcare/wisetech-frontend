import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'

import { Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage, AvatarSize } from './avatar'

import portrait from '@/storybook/support/assets/portrait.svg'

const TEAM = ['Diya Nair', 'Arjun Rao', 'Kavya Iyer']

/**
 * The one avatar: the user's uploaded photo when there is one, otherwise their name's initials. Put
 * `<AvatarImage src={photo} />` and `<AvatarFallback name="…" />` inside `<Avatar>`: the initials show while the
 * photo loads, and stay when there is no photo or it fails to load. Three sizes, a status badge and a group.
 */
const meta = {
  title: 'Components/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

/** Uploaded photo when provided; otherwise, or when the photo URL is broken, the name's initials. */
export const PhotoOrInitials: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar size={AvatarSize.LG}>
        <AvatarImage src={portrait} alt="Meera Joshi" />
        <AvatarFallback name="Meera Joshi" />
      </Avatar>
      <Avatar size={AvatarSize.LG}>
        <AvatarFallback name="Arjun Rao" />
      </Avatar>
      <Avatar size={AvatarSize.LG}>
        <AvatarImage src="/no-such-photo.jpg" alt="Kavya Iyer" />
        <AvatarFallback name="Kavya Iyer" />
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('img', { name: 'Meera Joshi' })).toBeInTheDocument())
    await expect(canvas.queryByText('MJ')).not.toBeInTheDocument()
    await expect(canvas.getByText('AR')).toBeInTheDocument()
    await waitFor(() => expect(canvas.getByText('KI')).toBeInTheDocument())
  },
}

/** Initials from the full name: first + last word, punctuation skipped, "N/A" when there is no name. */
export const Initials: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      {['Meera Joshi', 'Arjun Kumar Rao', 'Wisetech', ''].map((name) => (
        <Avatar key={name} size={AvatarSize.LG}>
          <AvatarFallback name={name} />
        </Avatar>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('MJ')).toBeInTheDocument()
    await expect(canvas.getByText('AR')).toBeInTheDocument()
    await expect(canvas.getByText('WI')).toBeInTheDocument()
    await expect(canvas.getByText('N/A')).toBeInTheDocument()
  },
}

/** `sm` (24px), `default` (32px) and `lg` (40px); the initials scale with the avatar. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      {Object.values(AvatarSize).map((size) => (
        <Avatar key={size} size={size} data-testid={`avatar-${size}`}>
          <AvatarFallback name="Diya Nair" />
        </Avatar>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('avatar-sm').getBoundingClientRect().width).toBe(24)
    await expect(canvas.getByTestId('avatar-default').getBoundingClientRect().width).toBe(32)
    await expect(canvas.getByTestId('avatar-lg').getBoundingClientRect().width).toBe(40)
  },
}

/** `AvatarBadge` as a status dot, coloured with a status token; the status is also given as text. */
export const Status: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size={AvatarSize.LG}>
        <AvatarFallback name="Meera Joshi" />
        <AvatarBadge className="bg-success">
          <span className="sr-only">Online</span>
        </AvatarBadge>
      </Avatar>
      <Avatar size={AvatarSize.LG}>
        <AvatarFallback name="Arjun Rao" />
        <AvatarBadge className="bg-warning">
          <span className="sr-only">On leave</span>
        </AvatarBadge>
      </Avatar>
      <Avatar size={AvatarSize.LG}>
        <AvatarFallback name="Kavya Iyer" />
        <AvatarBadge className="bg-muted-foreground">
          <span className="sr-only">Offline</span>
        </AvatarBadge>
      </Avatar>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Online')).toBeInTheDocument()
    await expect(canvas.getByText('On leave')).toBeInTheDocument()
    await expect(canvas.getByText('Offline')).toBeInTheDocument()
  },
}

/** A stacked team with a "+N" count for the rest; the group size follows its avatars. */
export const Group: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {[AvatarSize.SM, AvatarSize.LG].map((size) => (
        <AvatarGroup key={size}>
          {TEAM.map((name) => (
            <Avatar key={name} size={size}>
              <AvatarFallback name={name} />
            </Avatar>
          ))}
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText('DN')).toHaveLength(2)
    await expect(canvas.getAllByText('+5')).toHaveLength(2)
  },
}
