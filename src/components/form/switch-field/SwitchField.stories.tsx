import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";

import SwitchField from "./SwitchField";

const meta = {
  title: "Forms/Choice/Switch Field",
  component: SwitchField,
  args: {
    label: "Notify reporting manager",
    name: "notify",
    onCheckedChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ args, canvas }) => {
    const sw = canvas.getByRole("switch", { name: /Notify Reporting Manager/i });
    await userEvent.click(sw);
    await expect(sw).toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(true);

    sw.focus();
    await userEvent.keyboard(" ");
    await expect(sw).not.toBeChecked();
    await expect(args.onCheckedChange).toHaveBeenCalledWith(false);
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch")).toBeDisabled();
  },
};
