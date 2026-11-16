import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { SmartAvatar, avatarInitials } from './smart-avatar'
import portrait from './__fixtures__/portrait.svg'
import logo from './__fixtures__/logo.svg'

/**
 * The ONE avatar for people, contacts, companies and projects (the Contacts look). Photo when there is one,
 * otherwise initials on a stable dark gradient. Replaces MUI `Avatar`, `EmployeeIdentityCell`'s tinted circle,
 * Metronic `symbol` tiles, gender cartoons and `ui-avatars.com` images.
 */
const meta = {
  title: 'Components/Smart Avatar',
  component: SmartAvatar,
  args: { name: 'Meera Joshi', seed: 'emp-104' },
} satisfies Meta<typeof SmartAvatar>

export default meta
type Story = StoryObj<typeof meta>

const loaded = (el: HTMLElement) => waitFor(() => expect(el).toHaveAttribute('data-image'))

/** A photo replaces the initials once it loads; the ring takes its colours from the photo. */
export const Photo: Story = {
  args: { src: portrait, size: 'lg' },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Meera Joshi' })
    await loaded(avatar)
    await expect(avatar.querySelector('img')).toHaveAttribute('src', portrait)
    await expect(canvas.queryByText('MJ')).not.toBeInTheDocument()
  },
}

/** No photo: initials (first + last name) on a gradient picked by the seed, so it never changes between visits. */
export const Initials: Story = {
  args: { size: 'lg' },
  render: (args) => (
    <div className="flex items-center gap-3">
      <SmartAvatar {...args} />
      <SmartAvatar {...args} name="Arjun Kumar Rao" seed="emp-7" />
      <SmartAvatar {...args} name="Wisetech" seed="org-1" />
      <SmartAvatar {...args} name="" seed="blank" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Meera Joshi' })).toHaveTextContent('MJ')
    await expect(canvas.getByRole('img', { name: 'Arjun Kumar Rao' })).toHaveTextContent('AR')
    await expect(canvas.getByRole('img', { name: 'Wisetech' })).toHaveTextContent('WI')
    await expect(canvas.getByRole('img', { name: 'Unknown' })).toHaveTextContent('?')
    await expect(avatarInitials('  (Ex) Rao ')).toBe('ER')
  },
}

/** A broken photo URL, or the string "null" some APIs send, keeps the initials: never an empty circle. */
export const BrokenPhotoKeepsInitials: Story = {
  args: { src: '/no-such-photo.jpg', size: 'lg' },
  render: (args) => (
    <div className="flex items-center gap-3">
      <SmartAvatar {...args} />
      <SmartAvatar {...args} name="Tara Menon" seed="emp-9" src="null" />
    </div>
  ),
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('img', { name: 'Meera Joshi' })).toHaveTextContent('MJ'))
    await expect(canvas.getByRole('img', { name: 'Meera Joshi' })).not.toHaveAttribute('data-image')
    await expect(canvas.getByRole('img', { name: 'Tara Menon' }).querySelector('img')).toBeNull()
  },
}

/** The size scale (24 / 32 / 40 / 56 / 84) and an exact pixel size for a one-off slot. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-3">
      {(['xs', 'sm', 'default', 'lg', 'xl'] as const).map((s) => (
        <SmartAvatar key={s} {...args} size={s} name={`Size ${s}`} />
      ))}
      <SmartAvatar {...args} size={48} name="Exact 48" src={portrait} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Size xs' }).getBoundingClientRect().width).toBe(24)
    await expect(canvas.getByRole('img', { name: 'Size xl' }).getBoundingClientRect().width).toBe(84)
    await expect(canvas.getByRole('img', { name: 'Exact 48' }).getBoundingClientRect().width).toBe(48)
  },
}

/** A status dot, with the status also in the accessible name — colour alone is not enough. */
export const Status: Story = {
  args: { size: 'lg' },
  render: (args) => (
    <div className="flex items-center gap-3">
      <SmartAvatar {...args} status="active" src={portrait} />
      <SmartAvatar {...args} name="Rohan Shah" seed="emp-3" status="inactive" />
      <SmartAvatar {...args} name="Kavya Iyer" seed="emp-5" status="verified" shape="rounded" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Meera Joshi, Active' })).toBeInTheDocument()
    await expect(canvas.getByRole('img', { name: 'Rohan Shah, Inactive' })).toBeInTheDocument()
    await expect(canvas.getByRole('img', { name: 'Kavya Iyer, Verified' })).toBeInTheDocument()
  },
}

/** A company logo: rounded tile, whole image inset (`contain`), never cropped. */
export const Logo: Story = {
  args: { name: 'Acme Interiors', seed: 'co-12', src: logo, shape: 'rounded', fit: 'contain', size: 'xl' },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole('img', { name: 'Acme Interiors' })
    await loaded(avatar)
    await expect(avatar.querySelector('img')).toHaveClass('object-contain')
  },
}

/** Beside a name in a list the avatar is decorative, so screen readers hear the name once. */
export const Decorative: Story = {
  args: { decorative: true, src: portrait },
  render: (args) => (
    <div className="flex items-center gap-2.5">
      <SmartAvatar {...args} />
      <span className="font-medium">Meera Joshi</span>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('img')).not.toBeInTheDocument()
    await expect(canvas.getByText('Meera Joshi')).toBeInTheDocument()
  },
}

/** `preview`: a loaded photo opens full size in a dialog; Escape closes it. */
export const PreviewOpens: Story = {
  args: { src: portrait, size: 'xl', shape: 'rounded', preview: true },
  play: async ({ canvas }) => {
    const trigger = await canvas.findByRole('button', { name: "View Meera Joshi's photo" })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Meera Joshi' })
    await expect(dialog.querySelector('img')).toHaveAttribute('src', portrait)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await animationsSettled()
  },
}
