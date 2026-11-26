import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import TextArea from "./TextArea";

const meta = {
  title: "Forms/Input/Text Area",
  component: TextArea,
  args: {
    label: "Remarks",
    name: "remarks",
    placeholder: "Enter your message",
    rows: 3,
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const box = canvas.getByPlaceholderText("Enter your message");
    await userEvent.type(box, "Travelling to site on Monday.");
    await expect(box).toHaveValue("Travelling to site on Monday.");
  },
};

export const Invalid: Story = {
  args: {
    defaultValue: "x",
    error: { type: "validate", message: "Please enter a longer remark." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Please enter a longer remark.")).toBeInTheDocument();
    await expect(canvas.getByDisplayValue("x")).toHaveAttribute("aria-invalid", "true");
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "Locked after approval.",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue("Locked after approval.")).toBeDisabled();
  },
};
