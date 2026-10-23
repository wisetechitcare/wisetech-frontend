import { Box, Typography, useTheme } from '@mui/material';
import type { CSSProperties } from 'react';
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
  const theme = useTheme();
  const borderColor = error ? theme.palette.error.main : theme.palette.divider;
  const errorId = name ? `${name}-error` : undefined;
  return (
    <Box sx={{ minWidth: 0, width: '100%' }}>
      {label && (
        <Typography component="label" htmlFor={name} sx={{ display: 'block', mb: 0.5, fontSize: 12, fontWeight: 600, lineHeight: 1.3, color: error ? 'error.main' : 'text.secondary' }}>
          {label}{required && <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        </Typography>
      )}
      <Box
        sx={{
          width: '100%',
          height: 40,
          position: 'relative',
          overflow: 'visible',
          border: '1px solid',
          borderColor,
          borderRadius: '10px',
          bgcolor: 'background.paper',
          '&:focus-within': {
            borderColor: error ? 'error.main' : 'primary.main',
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}33`,
          },
          '& .react-international-phone-input-container': { width: '100%', height: '100%', alignItems: 'stretch' },
          '& .react-international-phone-input-container .react-international-phone-country-selector-button': {
            border: '0 !important',
            borderRight: `1px solid ${borderColor} !important`,
            borderRadius: '0 !important',
            boxShadow: 'none !important',
            outline: 'none',
            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
          },
          '& .react-international-phone-input-container .react-international-phone-dial-code-preview': {
            border: '0 !important',
            borderRight: `1px solid ${borderColor} !important`,
            marginRight: '0 !important',
            boxShadow: 'none !important',
          },
          '& .react-international-phone-input-container .react-international-phone-input, & .react-international-phone-input-container .react-international-phone-input:hover, & .react-international-phone-input-container .react-international-phone-input:focus': {
            height: '40px !important',
            boxSizing: 'border-box',
            padding: '0 12px !important',
            border: '0 !important',
            borderRadius: '0 !important',
            background: 'transparent !important',
            boxShadow: 'none !important',
            outline: 'none !important',
            fontFamily: 'inherit !important',
          },
          '& .react-international-phone-country-selector-dropdown': {
            zIndex: 30,
            top: '44px !important',
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            boxShadow: 4,
          },
        }}
      >
        <PhoneInput
          defaultCountry={defaultCountry as CountryIso2}
          value={value}
          onChange={(phone, meta) => onChange(phone, meta.country)}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          name={name}
          required={required}
          disableDialCodeAndPrefix
          showDisabledDialCodeAndPrefix
          inputProps={{ id: name, 'aria-invalid': error ? true : undefined, 'aria-describedby': errorId }}
          inputStyle={{ flex: '1 1 auto', minWidth: 0, width: '100%', height: 40, boxSizing: 'border-box', padding: '0 12px', margin: 0, border: 0, background: 'transparent', color: theme.palette.text.primary, fontFamily: 'inherit', fontSize: 13, lineHeight: '40px', textAlign: 'left', verticalAlign: 'middle', outline: 'none' }}
          countrySelectorStyleProps={{
            buttonStyle: { width: 48, height: 40, boxSizing: 'border-box', border: 0, borderRight: `1px solid ${borderColor}`, borderRadius: 0, backgroundColor: 'transparent', color: theme.palette.text.primary, lineHeight: '40px' },
            buttonContentWrapperStyle: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
            flagStyle: { width: 22, height: 22 },
            dropdownArrowStyle: { marginRight: 6 },
          }}
          dialCodePreviewStyleProps={{ style: { height: 40, boxSizing: 'border-box', padding: '0 8px', border: 0, margin: 0, background: 'transparent', color: theme.palette.text.secondary, fontFamily: 'inherit', fontSize: 13, lineHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
          style={{ width: '100%', height: 40, '--react-international-phone-height': '40px', '--react-international-phone-border-color': borderColor, '--react-international-phone-font-size': '13px', '--react-international-phone-text-color': theme.palette.text.primary, '--react-international-phone-background-color': 'transparent' } as CSSProperties}
        />
      </Box>
      {error && <Typography id={errorId} role="alert" sx={{ mt: 0.5, fontSize: 12, color: 'error.main' }}>{error}</Typography>}
    </Box>
  );
}

export default WtPhoneField;
