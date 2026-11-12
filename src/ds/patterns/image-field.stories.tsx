import * as React from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { ImageField } from './image-field'

// A 1×1 PNG, so the preview renders without a network request.
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const upload = fn(async () => PIXEL)

function Harness({ initial = null, failing = false }: { initial?: string | null; failing?: boolean }) {
  const [url, setUrl] = React.useState<string | null>(initial)
  return (
    <ImageField
      id="logo"
      label="Company logo"
      value={url}
      onChange={setUrl}
      upload={failing ? () => Promise.reject(new Error('offline')) : upload}
    />
  )
}

/**
 * One image: drop or browse, uploads at once, previews. Replaces the live `WtImageField` (same
 * `upload(file) → url` contract). Type and size are checked first; failures say what went wrong.
 */
const meta = {
  title: 'Patterns/Image Field',
  component: ImageField,
  args: { id: 'logo', label: 'Company logo', onChange: fn(), upload },
  render: () => <Harness />,
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
  beforeEach: () => {
    upload.mockClear()
  },
} satisfies Meta<typeof ImageField>

export default meta
type Story = StoryObj<typeof meta>

/** Choosing a PNG uploads it and shows the preview with Replace / Remove. */
export const Upload: Story = {
  play: async ({ canvas }) => {
    const file = new File(['png'], 'logo.png', { type: 'image/png' })
    await userEvent.upload(canvas.getByLabelText('Company logo'), file)
    await waitFor(() => expect(upload).toHaveBeenCalledWith(file))
    await expect(await canvas.findByRole('img', { name: 'Company logo preview' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
  },
}

/** A wrong type is refused before uploading, with the reason. */
export const WrongType: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText('Company logo'), new File(['%PDF'], 'logo.pdf', { type: 'application/pdf' }), {
      applyAccept: false,
    })
    await expect(await canvas.findByRole('alert')).toHaveTextContent("That file type isn't allowed")
    await expect(upload).not.toHaveBeenCalled()
  },
}

/** A failed upload says so and keeps the field usable. */
export const UploadFails: Story = {
  render: () => <Harness failing />,
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText('Company logo'), new File(['png'], 'logo.png', { type: 'image/png' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Upload failed')
    await expect(canvas.getByRole('button', { name: 'Browse' })).toBeEnabled()
  },
}

/** A person's photo, round, already set. */
export const RoundWithImage: Story = {
  render: () => <ImageField id="photo" label="Profile photo" shape="round" value={PIXEL} onChange={() => undefined} upload={upload} />,
}
