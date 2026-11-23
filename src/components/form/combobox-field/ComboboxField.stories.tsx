import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { Bike, Car, Hotel, Utensils } from "lucide-react";

import ComboboxField, { type ComboboxOption } from "./ComboboxField";

const BRANCHES: ComboboxOption[] = [
  { value: "andheri", label: "Mumbai — Andheri" },
  { value: "bkc", label: "Mumbai — BKC" },
  { value: "pune", label: "Pune" },
  { value: "bengaluru", label: "Bengaluru" },
];

const CATEGORIES: ComboboxOption[] = [
  { value: "bike", label: "Bike", icon: <Bike /> },
  { value: "cab", label: "Cab", icon: <Car /> },
  { value: "hotel", label: "Hotel", icon: <Hotel /> },
  { value: "meal", label: "Meal", icon: <Utensils /> },
];

const meta = {
  title: "Forms/Select/Combobox Field",
  component: ComboboxField,
  args: {
    label: "Branch",
    name: "branch",
    options: BRANCHES,
    placeholder: "Search branches",
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
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("combobox"));
    await userEvent.click(await canvas.findByRole("option", { name: /Pune/i }));
    await waitFor(() =>
      expect(args.onChange).toHaveBeenCalledWith(
        "pune",
        expect.objectContaining({ value: "pune", label: "Pune" })
      )
    );
  },
};

export const WithIcons: Story = {
  args: {
    label: "Category",
    options: CATEGORIES,
    value: "cab",
    placeholder: "Search categories",
  },
};

export const Invalid: Story = {
  args: {
    value: null,
    error: { type: "validate", message: "Choose a branch." },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Choose a branch.")).toBeInTheDocument();
  },
};

export const Disabled: Story = {
  args: {
    value: "pune",
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox")).toBeDisabled();
  },
};
