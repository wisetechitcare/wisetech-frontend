import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import OtpField, { OtpLength } from "./OtpField";

const meta = {
  title: "Forms/Input/OTP Field",
  component: OtpField,
  args: {
    label: "Verification code",
    name: "otp",
    length: OtpLength.SIX,
    required: true,
    hint: "Enter the 6-digit code sent to your phone.",
    onChange: fn(),
    onComplete: fn(),
  },
  argTypes: {
    length: {
      control: "radio",
      options: [OtpLength.THREE, OtpLength.SIX],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OtpField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "482913");
    await waitFor(() => expect(args.onComplete).toHaveBeenCalledWith("482913"));
  },
};

export const ThreeDigits: Story = {
  args: {
    label: "OTP",
    length: OtpLength.THREE,
    hint: "Enter the 3-digit code.",
  },
  play: async ({ args, canvas }) => {
    const input = canvas.getByRole("textbox");
    await userEvent.click(input);
    await userEvent.type(input, "482");
    await waitFor(() => expect(args.onComplete).toHaveBeenCalledWith("482"));
  },
};

export const Invalid: Story = {
  args: {
    value: "123",
    error: { type: "validate", message: "Enter the complete code." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Enter the complete code.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    value: "482913",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toBeDisabled();
  },
};
