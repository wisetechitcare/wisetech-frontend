import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, mocked, screen, userEvent, waitFor, within } from 'storybook/test';

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
 * The fiscal-year range on the shared range picker, with a one-click fiscal preset and Cancel / OK.
 * Value in and out is the stored string `"YYYY-MM-DD to YYYY-MM-DD"`.
 */
const meta = {
  title: 'Forms/Date & Time/Fiscal Year Range Field',
  component: FiscalYearRangeField,
  args: { value: '', clearable: true, onChange: fn() },
  render: (args) => <FiscalYearDemo {...args} />,
} satisfies Meta<typeof FiscalYearRangeField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty field: the fiscal preset fills a draft; OK writes it as the stored string. */
export const Empty: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /calendar/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apr–Mar' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }));
    await waitFor(() =>
      expect(mocked(args.onChange).mock.lastCall?.[0]).toMatch(/^\d{4}-04-01 to \d{4}-03-31$/),
    );
  },
};

/** `clearable` adds a clear button while the field holds a range; clearing writes `''`. */
export const Clearable: Story = {
  args: { value: '2026-04-01 to 2027-03-31', clearable: true },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }));
    await expect(args.onChange).toHaveBeenLastCalledWith('');
  },
};
