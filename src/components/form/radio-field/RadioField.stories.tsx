import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import RadioField from "./RadioField";

const SESSION_OPTIONS = [
  { value: "full", label: "Full day" },
  { value: "first", label: "First half" },
  { value: "second", label: "Second half" },
];

const meta = {
  title: "Forms/Choice/Radio Field",
  component: RadioField,
  args: {
    label: "Session",
    name: "session",
    options: SESSION_OPTIONS,
    defaultValue: "full",
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RadioField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: /Second Half/i }));
    await waitFor(() =>
      expect(canvas.getByRole("radio", { name: /Second Half/i })).toBeChecked()
    );
    await expect(args.onValueChange).toHaveBeenCalledWith("second");
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvas }) => {
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio).toBeDisabled();
    }
  },
};

export const WithDescriptions: Story = {
  args: {
    label: "How is this paid?",
    defaultValue: "salary",
    options: [
      {
        value: "salary",
        label: "With salary",
        description: "Added to the next payroll run.",
      },
      {
        value: "bank",
        label: "Bank transfer",
        description: "Paid within 3 working days of approval.",
      },
      {
        value: "cash",
        label: "Cash",
        description: "Collect from the accounts desk.",
        disabled: true,
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Added to the next payroll run/i)).toBeInTheDocument();
    await expect(canvas.getByRole("radio", { name: /Cash/i })).toBeDisabled();
  },
};
