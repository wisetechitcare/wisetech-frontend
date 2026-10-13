import React, { useMemo } from 'react';
import { WtField } from '@app/modules/common/components/ui';

/**
 * Chart filter — kit WtField (Sandwich look), not a hand-rolled MUI FormControl+Select.
 */
export const FilterDropdown: React.FC<{
  filterKey: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ filterKey, options, value, onChange, placeholder = 'All' }) => {
  const fieldOptions = useMemo(
    () => [
      { value: 'all', label: placeholder },
      ...options.map((option) => ({ value: option, label: option })),
    ],
    [options, placeholder],
  );

  return (
    <WtField
      ariaLabel={filterKey}
      size="sm"
      minWidth={100}
      value={value || 'all'}
      onChange={onChange}
      options={fieldOptions}
      sx={{
        minWidth: 100,
        '& .MuiOutlinedInput-root': { height: 31 },
      }}
    />
  );
};
