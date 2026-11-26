import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';

import { FiscalYearRangeField, type FiscalYearRangeFieldProps } from './FiscalYearRangeField';

import type { FiscalYearRangeValue } from '@utils/fiscalYearRange';

function FiscalYearDemo({ value, onChange, ...props }: FiscalYearRangeFieldProps) {
  const [fiscalYear, setFiscalYear] = useState<FiscalYearRangeValue>(value);
  return (
    <div className="w-96">
      <FiscalYearRangeField
        {...props}
        value={fiscalYear}
        onChange={(next) => {
          setFiscalYear(next);
          onChange(next);
        }}
      />
    </div>
  );
}

/**
 * The fiscal-year range on the shared kit range picker: start/end bounds, a one-click fiscal preset, keyboard
 * entry, and Cancel / OK. Value in and out is the stored string `"YYYY-MM-DD to YYYY-MM-DD"`.
 */
const meta = {
  title: 'Forms/Date & Time/Fiscal Year Range Field',
  component: FiscalYearRangeField,
  args: { value: '2026-04-01 to 2027-03-31', onChange: fn() },
  render: (args) => <FiscalYearDemo {...args} />,
} satisfies Meta<typeof FiscalYearRangeField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two day picks make a draft; OK writes it as the stored string. */
export const PickAndConfirm: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /, 1 April 2026/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: /30 April 2026/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() => expect(args.onChange).toHaveBeenLastCalledWith('2026-04-01 to 2026-04-30'));
  },
};

/** Cancel discards the draft: nothing is written. */
export const CancelDiscards: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /15 April 2026/ }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** Same week and grid defaults as every kit picker: Monday-first, outside-month days hidden. */
export const SharedCalendarDefaults: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }));
    const dialog = await screen.findByRole('dialog');
    await expect(dialog.querySelector('[aria-label*="Monday, 30 March 2026"]')).toHaveClass('invisible');
  },
};

/** `readOnly` shows the range but the calendar cannot open. */
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /calendar/i })).toBeDisabled();
  },
};

/** `clearable` adds a clear button; clearing writes `''`. */
export const Clearable: Story = {
  args: { clearable: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(args.onChange).toHaveBeenLastCalledWith('');
  },
};
