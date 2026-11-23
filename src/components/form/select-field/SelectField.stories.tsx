import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import SelectField, { type SelectFieldProps, type SelectOption } from "./SelectField";

const DEPARTMENTS: SelectOption[] = [
  { value: "engineering", label: "Engineering" },
  { value: "finance", label: "Finance" },
  { value: "hr", label: "Human Resources" },
  { value: "operations", label: "Operations" },
];

function ControlledSelect({
  initialValue = "",
  ...args
}: SelectFieldProps & { initialValue?: string }) {
  const [value, setValue] = useState<string>(initialValue);
  return (
    <SelectField
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        args.onValueChange?.(next);
      }}
    />
  );
}

const meta = {
  title: "Forms/Select/Select Field",
  component: SelectField,
  args: {
    label: "Department",
    options: DEPARTMENTS,
    placeholder: "Choose a department",
    required: true,
    searchable: false,
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ControlledSelect {...args} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.click(await canvas.findByRole("option", { name: /Finance/i }));
    await waitFor(() => expect(args.onValueChange).toHaveBeenCalledWith("finance"));
  },
};

export const Searchable: Story = {
  args: {
    searchable: true,
    placeholder: "Search departments",
  },
  render: (args) => <ControlledSelect {...args} initialValue="finance" />,
};

export const Invalid: Story = {
  args: {
    value: "",
    searchable: false,
    error: { type: "validate", message: "Choose a department." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Choose a department.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    value: "finance",
    searchable: false,
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
