import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'

import { VideoField } from './video-field'

const upload = fn(async (_file: File, onProgress: (pct: number) => void) => {
  onProgress(100)
  return 'https://example.com/splash.mp4'
})

function Harness({ initial = null, disabledReason }: { initial?: string | null; disabledReason?: string }) {
  const [url, setUrl] = React.useState<string | null>(initial)
  return (
    <VideoField id="splash" label="Splash video" value={url} onChange={setUrl} upload={upload} disabledReason={disabledReason} />
  )
}

/**
 * One video, such as an organization's splash screen: drop or browse, uploads with progress, plays back as a muted
 * preview. The video twin of Image Field. Type and size are checked first; failures say what went wrong.
 */
const meta = {
  title: 'Forms/Upload/Video Field',
  component: VideoField,
  args: { id: 'splash', label: 'Splash video', onChange: fn(), upload },
  render: () => <Harness />,
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
  beforeEach: () => {
    upload.mockClear()
  },
} satisfies Meta<typeof VideoField>

export default meta
type Story = StoryObj<typeof meta>

/** Choosing an MP4 uploads it and offers Replace / Remove. */
export const Upload: Story = {
  play: async ({ canvas }) => {
    const file = new File(['mp4'], 'splash.mp4', { type: 'video/mp4' })
    await userEvent.upload(canvas.getByLabelText('Splash video'), file)
    await waitFor(() => expect(upload).toHaveBeenCalled())
    await expect(await canvas.findByRole('button', { name: 'Replace' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  },
}

/** A wrong type is refused before uploading, with the reason. */
export const WrongType: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText('Splash video'), new File(['x'], 'clip.mov', { type: 'video/quicktime' }), {
      applyAccept: false,
    })
    await expect(await canvas.findByRole('alert')).toHaveTextContent("That file type isn't allowed")
    await expect(upload).not.toHaveBeenCalled()
  },
}

/** Off with a reason, e.g. before the record exists to upload against. */
export const Disabled: Story = {
  render: () => <Harness disabledReason="Save the profile first, then add a video." />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Save the profile first, then add a video.')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Browse' })).toBeDisabled()
  },
}
