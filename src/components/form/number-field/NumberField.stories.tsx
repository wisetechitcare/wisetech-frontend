import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import NumberField from "./NumberField";

const meta = {
  title: "Forms/Input/Number Field",
  component: NumberField,
  args: {
    label: "Notice period (days)",
    placeholder: "0",
    min: 0,
    step: 1,
    showSteppers: true,
  },
} satisfies Meta<typeof NumberField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByPlaceholderText("0");
    await userEvent.clear(input);
    await userEvent.type(input, "30");
    await expect(input).toHaveValue(30);
    await userEvent.click(canvas.getByRole("button", { name: "Increase value" }));
    await expect(input).toHaveValue(31);
  },
};

export const Invalid: Story = {
  args: {
    defaultValue: -1,
    error: { type: "validate", message: "Notice period cannot be negative." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Notice period cannot be negative.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: 30,
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByDisplayValue("30")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Increase value" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Decrease value" })).toBeDisabled();
  },
};
