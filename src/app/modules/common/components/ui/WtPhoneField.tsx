import { Box, Typography } from '@mui/material';
import { PhoneInput, type CountryIso2, type ParsedCountry } from 'react-international-phone';
import 'react-international-phone/style.css';

export interface WtPhoneFieldProps {
  label?: string;
  value?: string;
  defaultCountry?: string;
  onChange: (value: string, country: ParsedCountry) => void;
  onBlur?: () => void;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

/** Theme-safe ESM phone control. The value is E.164; callers own any payload splitting. */
export function WtPhoneField({
  label,
  value = '',
  defaultCountry = 'us',
  onChange,
  onBlur,
  placeholder,
  name,
  required,
  disabled,
  error,
}: WtPhoneFieldProps) {
  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      {label && (
        <Typography component="label" htmlFor={name} sx={{ display: 'block', mb: 0.5, fontSize: 13, color: error ? 'error.main' : 'text.secondary' }}>
          {label}{required && <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        </Typography>
      )}
      <PhoneInput
        defaultCountry={defaultCountry as CountryIso2}
        value={value}
        onChange={(phone, meta) => onChange(phone, meta.country)}
        onBlur={onBlur}
        disabled={disabled}
        placeholder={placeholder}
        name={name}
        required={required}
        inputProps={{ id: name, 'aria-invalid': error ? true : undefined }}
        inputStyle={{ width: '100%', height: 40, background: 'transparent', color: 'inherit' }}
        style={{ width: '100%' }}
      />
      {error && <Typography role="alert" sx={{ mt: 0.5, fontSize: 12, color: 'error.main' }}>{error}</Typography>}
    </Box>
  );
}

export default WtPhoneField;
