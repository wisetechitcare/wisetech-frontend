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

/** Site View: daily media grouped by date (newest first), with site, zone and service filters. */
export const SiteView: Story = {
  args: { initialView: 'site' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 3, name: /Yesterday · Wed, 28 Oct 2026/ })).toBeInTheDocument()
    await expect(canvas.getByRole('combobox', { name: 'Service' })).toBeInTheDocument()
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

/** Upload opens inline (no modal): drop files, watch each one upload as a thumbnail, then it appears in the gallery. */
export const UploadMedia: Story = {
  // The shared FileUpload's hidden file input has no label yet (see its stories); everything else here is checked.
  parameters: { a11y: { test: 'todo' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Upload Media' }))
    const section = await canvas.findByRole('region', { name: 'Upload media' })
    const panel = within(section)
    await expect(panel.queryByRole('combobox', { name: 'Service (optional)' })).not.toBeInTheDocument()
    await userEvent.click(panel.getByRole('tab', { name: 'Site View' }))
    await expect(await panel.findByRole('combobox', { name: 'Service (optional)' })).toBeInTheDocument()
    // An oversized photo is flagged up front and skipped.
    const big = new File(['x'], 'panel_fullres.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 12 * 1048576 })
    const input = section.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [new File(['x'], 'l4_ducting.jpg', { type: 'image/jpeg' }), big])
    await expect(await panel.findByText(/over the 10 MB photo limit/)).toBeInTheDocument()
    await userEvent.click(panel.getByRole('button', { name: 'Upload 1 file' }))
    await userEvent.click(await panel.findByRole('button', { name: /Done · 1 added/ }, { timeout: 5000 }))
    await expect(await canvas.findByRole('button', { name: 'Preview l4_ducting.jpg' })).toBeInTheDocument()
  },
}

/** Editing happens in the preview's side panel, not a separate modal. */
export const EditInPreview: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Actions for Night view render' }))
    await userEvent.click(await screen.findByRole('menuitem', { name: /Edit caption/ }))
    const dialog = within(await screen.findByRole('dialog', { name: 'Night view render' }))
    const caption = dialog.getByLabelText('Caption')
    await userEvent.clear(caption)
    await userEvent.type(caption, 'Night view, final')
    await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
    await expect(await dialog.findByText('Night view, final', { selector: 'dd' })).toBeInTheDocument()
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
