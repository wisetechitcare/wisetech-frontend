import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import PhoneField from "./PhoneField";

const meta = {
  title: "Forms/Input/Phone Field",
  component: PhoneField,
  args: {
    label: "Mobile number",
    name: "mobile",
    defaultCountry: "in",
    required: true,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PhoneField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole("combobox", { name: /\+91 India/i })).toBeInTheDocument();
    const input = canvas.getByRole("textbox");
    await userEvent.type(input, "9800000210");
    await waitFor(() =>
      expect(args.onChange).toHaveBeenLastCalledWith(
        "+919800000210",
        expect.objectContaining({ iso2: "in", dialCode: "91" })
      )
    );
  },
};

export const Invalid: Story = {
  args: {
    value: "+91123",
    error: { type: "validate", message: "Enter a valid 10-digit mobile number." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    await expect(canvas.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = {
  args: {
    value: "+919800000210",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox")).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: /\+91 India/i })).toBeDisabled();
  },
};
