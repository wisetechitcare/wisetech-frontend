import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import Input from "./Input";

const meta = {
  title: "Forms/Input/Input Field",
  component: Input,
  args: {
    label: "Full name",
    placeholder: "Enter your name",
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText("Enter your name");
    await userEvent.type(input, "Aarav Sharma");
    await expect(input).toHaveValue("Aarav Sharma");
  },
};

export const Invalid: Story = {
  args: {
    type: "email",
    label: "Email",
    placeholder: "name@example.com",
    defaultValue: "aarav@",
    error: { type: "validate", message: "Enter a complete email address." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Enter a complete email address.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    label: "Employee ID",
    defaultValue: "E-1042",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue("E-1042")).toBeDisabled();
  },
};
