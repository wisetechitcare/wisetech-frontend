import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Label } from './label'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from './input-otp'

/**
 * One box per digit for a one-time code or security PIN. Replaces the live kit's `PinInput`. It is not
 * a password field, so browsers never offer to save it; paste fills every box at once.
 */
const meta = {
  title: 'Components/InputOTP',
  component: InputOTP,
  args: { maxLength: 6, onComplete: fn(), id: 'otp' },
  render: (args) => (
    <div className="grid gap-2">
      <Label htmlFor="otp">Code sent to +91 98••• ••210</Label>
      <InputOTP {...args}>
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
} satisfies Meta<typeof InputOTP>

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
  render: (args) => (
    <div className="grid gap-2">
      <Label htmlFor="pin">Security PIN</Label>
      <InputOTP {...args}>
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
