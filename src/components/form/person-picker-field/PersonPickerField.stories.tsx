import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import PersonPickerField, { type PersonOption, type PersonPickerFieldProps } from "./PersonPickerField";

const PEOPLE: PersonOption[] = [
  { id: "42", name: "Meera Joshi", code: "WT-0042", subtitle: "Senior MEP Engineer" },
  { id: "17", name: "Arjun Rao", code: "WT-0017", subtitle: "Engineering Manager" },
  { id: "88", name: "Tara Menon", code: "WT-0088", subtitle: "HR Executive" },
  { id: "91", name: "Tara Menon", code: "WT-0091", subtitle: "Site Supervisor" },
  { id: "23", name: "Ishaan Verma", code: "WT-0023", subtitle: "Draughtsman" },
];

function ControlledPersonPicker({
  initialIds = [],
  ...args
}: PersonPickerFieldProps & { initialIds?: string[] }) {
  const [ids, setIds] = useState<string[]>(initialIds);
  return (
    <PersonPickerField
      {...args}
      value={ids}
      onChange={(next) => {
        setIds(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta = {
  title: "Forms/Select/Person Picker",
  component: PersonPickerField,
  args: {
    label: "Reporting manager",
    name: "manager",
    people: PEOPLE,
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
} satisfies Meta<typeof PersonPickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ControlledPersonPicker {...args} />,
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.click(await canvas.findByText("Meera Joshi"));
    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(["42"]));
  },
};

export const Multiple: Story = {
  args: {
    label: "Interview panel",
    multiple: true,
  },
  render: (args) => <ControlledPersonPicker {...args} initialIds={["42"]} />,
};

export const Invalid: Story = {
  args: {
    value: [],
    error: { type: "validate", message: "Pick a reporting manager." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Pick a reporting manager.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    value: ["17"],
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
