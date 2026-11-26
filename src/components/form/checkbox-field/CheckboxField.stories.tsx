import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";

import CheckboxField, { type CheckboxFieldProps } from "./CheckboxField";

function ControlledCheckbox({
  initialChecked = false,
  ...args
}: CheckboxFieldProps & { initialChecked?: boolean }) {
  const [checked, setChecked] = useState<boolean>(initialChecked);
  return (
    <CheckboxField
      {...args}
      checked={checked}
      onCheckedChange={(next) => {
        setChecked(next);
        args.onCheckedChange?.(next);
      }}
    />
  );
}

const meta = {
  title: "Forms/Choice/Checkbox Field",
  component: CheckboxField,
  args: {
    label: "Send welcome email",
    name: "welcomeEmail",
    required: true,
    onCheckedChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckboxField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <ControlledCheckbox {...args} />,
  play: async ({ args, canvas }) => {
    const box = canvas.getByRole("checkbox", { name: /Send Welcome Email/i });
    await expect(box).not.toBeChecked();
    await userEvent.click(canvas.getByText(/Send Welcome Email/i));
    await waitFor(() => expect(args.onCheckedChange).toHaveBeenCalledWith(true));
    await expect(box).toBeChecked();
  },
};

export const Invalid: Story = {
  args: {
    checked: false,
    error: { type: "validate", message: "You must accept the terms." },
    label: "I agree to the terms",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("You must accept the terms.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    checked: true,
    disabled: true,
    label: "Include in payroll",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox")).toHaveAttribute("aria-disabled", "true");
  },
};
