import React from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';

// Filter dropdown component
export const FilterDropdown: React.FC<{
  filterKey: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ filterKey, options, value, onChange, placeholder = "All" }) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  return (
    <FormControl sx={{ minWidth: 100 }} size="small">
      <Select
        value={value || 'all'}
        onChange={handleChange}
        displayEmpty
        sx={{
          height: '31px', // Exact button height: 9px top + 1px lineHeight + 9px bottom + 2px border = 31px
          '& .MuiSelect-select': {
            padding: '9px 12px', // Match button padding exactly
            display: 'flex',
            alignItems: 'center',
            lineHeight: '1',
            height: '31px',
            boxSizing: 'border-box',
          },
          color: '#9D4141',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9D4141',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9D4141',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#9D4141',
          },
          '& .MuiSelect-icon': {
            color: '#9D4141',
          },
        }}
      >
        <MenuItem value="all">{placeholder}</MenuItem>
        {options.map(option => (
          <MenuItem key={option} value={option} title={option}>
            {option.length > 20 ? option.slice(0, 18) + "..." : option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};