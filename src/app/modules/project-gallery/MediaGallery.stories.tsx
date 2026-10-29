import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { animationsSettled } from '@/ds/lib/motion'
import { MediaGalleryPrototype } from './MediaGalleryPrototype'

/**
 * Media Gallery prototype for the project workspace (demo data, local state only — not wired to the app).
 * Project View holds renders and approved photos; Site View holds daily site media grouped by date.
 * Any photo from either view can be the one Project Cover, which drives the project avatar everywhere.
 */
const meta = {
  title: 'Screens/Media Gallery',
  component: MediaGalleryPrototype,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof MediaGalleryPrototype>

export default meta
type Story = StoryObj<typeof meta>

/** Project View: renders, building and handover photos in a grid. The current cover is marked PROJECT COVER. */
export const ProjectView: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Media Gallery' })).toBeInTheDocument()
    await expect(canvas.getByTestId('cover-title')).toHaveTextContent('Front elevation render')
    await expect(canvas.getAllByText('PROJECT COVER').length).toBeGreaterThan(0)
  },
}

/** Site View: daily media grouped by date (newest first), with site, zone and discipline filters. */
export const SiteView: Story = {
  args: { initialView: 'site' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: /Yesterday · Wed, 28 Oct 2026/ })).toBeInTheDocument()
    await expect(canvas.getByRole('combobox', { name: 'Discipline' })).toBeInTheDocument()
  },
}

/** List layout: the same media as a table with caption, type, album, uploader and time. */
export const ListView: Story = {
  args: { initialLayout: 'list' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('columnheader', { name: 'Uploaded by' })).toBeInTheDocument()
  },
}

/** Switching views changes the content and the filters, not just the toggle. */
export const SwitchViews: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('combobox', { name: 'Zone' })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole('tab', { name: /Site View/ }))
    await expect(await canvas.findByRole('combobox', { name: 'Zone' })).toBeInTheDocument()
    await expect(canvas.getByText('Chiller placement on terrace')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('tab', { name: 'Videos' }))
    await expect(canvas.queryByText('Chiller placement on terrace')).not.toBeInTheDocument()
    await expect(canvas.getByText('Crane lift of chiller 2')).toBeInTheDocument()
  },
}

/** Picking a Site View photo as cover moves the PROJECT COVER badge and updates the avatar and cover card. */
export const ReplaceProjectCover: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: /Site View/ }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for Chiller placement on terrace' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Set as Project Cover' }))
    await waitFor(() => expect(canvas.getByTestId('cover-title')).toHaveTextContent('Chiller placement on terrace'))
    // Back in Project View the old cover no longer carries the badge: one cover per project.
    await userEvent.click(canvas.getByRole('tab', { name: /Project View/ }))
    await expect(canvas.queryAllByText('PROJECT COVER')).toHaveLength(0)
    await animationsSettled()
  },
}

/** Clicking a photo opens the large viewer, which can also set the cover. */
export const PreviewAndSetCover: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Preview Night view render' }))
    const dialog = await screen.findByRole('dialog', { name: 'Night view render' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Set as Project Cover' }))
    await expect(await within(dialog).findByText('This is the project cover')).toBeInTheDocument()
    await expect(within(dialog).getByRole('button', { name: 'Zoom in' })).toBeEnabled()
  },
}

/** Upload dialog: switching the destination to Site View adds the optional site, zone and discipline fields. */
export const UploadMedia: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Upload Media' }))
    const dialog = await screen.findByRole('dialog', { name: 'Upload media' })
    await expect(within(dialog).queryByRole('combobox', { name: 'Discipline (optional)' })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('radio', { name: /Site View/ }))
    await expect(await within(dialog).findByRole('combobox', { name: 'Discipline (optional)' })).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'No files handy? Add sample files' }))
    await expect(within(dialog).getByText(/over the 10 MB limit/)).toBeInTheDocument()
    await expect(within(dialog).getByText(/Unsupported file type/)).toBeInTheDocument()
    await animationsSettled()
  },
}

/** Ticking items swaps the toolbar for bulk actions; Delete asks for confirmation. */
export const BulkSelection: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select Night view render' }))
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Select Lobby reception render' }))
    await expect(canvas.getByText('2 selected')).toBeInTheDocument()
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }))
    await expect(await screen.findByRole('dialog', { name: 'Delete 2 items?' })).toBeInTheDocument()
    await animationsSettled()
  },
}

/** No cover chosen: the project avatar falls back to initials. */
export const NoCover: Story = {
  args: { initialCoverId: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('cover-title')).toHaveTextContent('Initials are shown across WISETECH')
    await expect(canvas.getByRole('button', { name: /Choose Cover/ })).toBeInTheDocument()
  },
}

/** A project with no media yet. */
export const EmptyGallery: Story = {
  args: { empty: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('No project media yet')).toBeInTheDocument()
  },
}
