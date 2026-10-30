import type { ComponentType } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Label } from './label'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp'

/**
 * One box per digit for a one-time code or security PIN. Replaces the live kit's `PinInput`. It is not
 * a password field, so browsers never offer to save it; paste fills every box at once.
 *
 * Story args are a narrow subset: `input-otp`'s OTPInput props are a `render` vs `children`
 * discriminated union, and spreading Storybook's inferred args onto the component breaks that.
 * Meta is typed to our story args only — `component` is set for Storybook docs, not for arg types.
 */
type InputOTPStoryArgs = {
  maxLength: number
  id: string
  onComplete: ReturnType<typeof fn>
}

const meta = {
  title: 'Components/InputOTP',
  // Cast: Storybook would otherwise infer Meta from OTPInput's render|children union.
  component: InputOTP as unknown as ComponentType<InputOTPStoryArgs>,
  args: { maxLength: 6, onComplete: fn(), id: 'otp' } satisfies InputOTPStoryArgs,
  render: ({ maxLength, onComplete, id }: InputOTPStoryArgs) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>Code sent to +91 98••• ••210</Label>
      <InputOTP maxLength={maxLength} onComplete={onComplete} id={id}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  ),
} satisfies Meta<InputOTPStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

/** Typing six digits completes the code. */
export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.type(canvas.getByLabelText(/Code sent to/), '482913')
    await waitFor(() => expect(args.onComplete).toHaveBeenCalledWith('482913'))
  },
}

/** Four-digit security PIN. */
export const SecurityPin: Story = {
  args: { maxLength: 4, id: 'pin' },
  render: ({ maxLength, onComplete, id }: InputOTPStoryArgs) => (
    <div className="grid gap-2">
      <Label htmlFor={id}>Security PIN</Label>
      <InputOTP maxLength={maxLength} onComplete={onComplete} id={id}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  ),
}
