import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";

import ComboboxField, {
  type ComboboxFieldProps,
  type ComboboxOption,
} from "./ComboboxField";

const BRANCHES: ComboboxOption[] = [
  { value: "andheri", label: "Mumbai — Andheri" },
  { value: "bkc", label: "Mumbai — BKC" },
  { value: "pune", label: "Pune" },
  { value: "bengaluru", label: "Bengaluru" },
];

function ControlledCombobox({
  initialValue = [],
  ...args
}: ComboboxFieldProps & { initialValue?: string[] }) {
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <ComboboxField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta = {
  title: "Forms/Select/Combobox Field",
  component: ComboboxField,
  args: {
    label: "Branches",
    options: BRANCHES,
    placeholder: "Select options",
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
} satisfies Meta<typeof ComboboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ControlledCombobox {...args} initialValue={["pune", "bengaluru"]} />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pune")).toBeInTheDocument();
    await expect(canvas.getByText("Bengaluru")).toBeInTheDocument();
  },
};

export const Invalid: Story = {
  args: {
    value: [],
    error: { type: "validate", message: "Choose at least one branch." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Choose at least one branch.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  render: (args) => (
    <ControlledCombobox {...args} initialValue={["pune", "bkc"]} disabled />
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
