import { useEffect, useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Debounce so typing doesn't fire a request per keystroke. */
  delay?: number;
}

export const SearchBar = ({ value, onChange, placeholder = 'Search roles…', delay = 300 }: SearchBarProps) => {
  const [local, setLocal] = useState(value);

  // Keep in sync when the parent resets filters.
  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), delay);
    return () => clearTimeout(t);
  }, [local, value, delay, onChange]);

  return (
    <TextField
      size="small"
      fullWidth
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      placeholder={placeholder}
      inputProps={{ 'aria-label': 'Search roles' }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" aria-hidden="true" />
          </InputAdornment>
        ),
        endAdornment: local ? (
          <InputAdornment position="end">
            <IconButton size="small" aria-label="Clear search" onClick={() => { setLocal(''); onChange(''); }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{ maxWidth: { xs: '100%', sm: 360 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
    />
  );
};

export default SearchBar;
