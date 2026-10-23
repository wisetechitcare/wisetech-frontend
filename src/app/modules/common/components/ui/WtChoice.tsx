import { useMemo, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { Box, Typography, type SxProps, type Theme } from '@mui/material';

export type ChoiceVariant = 'switch' | 'segmented' | 'cards';

export interface WtChoiceOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface WtChoiceProps<T extends string | boolean> {
  name?: string;
  label: string;
  variant: ChoiceVariant;
  value: T;
  options?: readonly WtChoiceOption<Extract<T, string>>[];
  onChange: (value: T) => void;
  helperText?: string;
  error?: string;
  required?: boolean;
  reveal?: ReactNode | ((value: T) => ReactNode);
  disabled?: boolean;
  showChangedMarker?: boolean;
  changed?: boolean;
  clearRevealOnDisable?: boolean;
  clearOnDisable?: readonly string[];
  orientation?: 'row' | 'column';
  onDisable?: () => void;
  sx?: SxProps<Theme>;
}

export const choiceIsOn = (value: unknown) => value === true || value === 'true' || value === '1';

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  p: 0,
  m: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function WtChoice<T extends string | boolean>({
  name,
  label,
  variant,
  value,
  options = [],
  onChange,
  helperText,
  error,
  required,
  reveal,
  disabled,
  showChangedMarker,
  changed,
  clearRevealOnDisable = false,
  clearOnDisable,
  orientation = 'row',
  onDisable,
  sx,
}: WtChoiceProps<T>) {
  const errorId = name ? `${name.replace(/[^a-zA-Z0-9_-]/g, '-')}-error` : undefined;
  const helperId = name ? `${name.replace(/[^a-zA-Z0-9_-]/g, '-')}-helper` : undefined;
  const describedBy = [helperText && helperId, error && errorId].filter(Boolean).join(' ') || undefined;
  const radioRefs = useRef<Array<HTMLInputElement | null>>([]);
  const selected = String(value ?? '');
  const enabledIndexes = useMemo(
    () => options.map((option, index) => (!option.disabled ? index : -1)).filter((index) => index >= 0),
    [options],
  );

  const moveRadio = (index: number, direction: 1 | -1) => {
    if (!enabledIndexes.length) return;
    const current = enabledIndexes.indexOf(index);
    const next = enabledIndexes[(current + direction + enabledIndexes.length) % enabledIndexes.length];
    const option = options[next];
    radioRefs.current[next]?.focus();
    if (option) onChange(option.value as T);
  };

  if (variant === 'switch') {
    const checked = choiceIsOn(value);
    const switchId = name ?? `wt-choice-${label.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
    return (
      <Box sx={[{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
        <Box
          component="label"
          htmlFor={switchId}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
            minHeight: 44, px: 1.25, py: 0.75, border: '1px solid', borderColor: error ? 'error.main' : 'divider',
            borderRadius: 1.5, bgcolor: 'background.paper', cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.55 : 1, '&:focus-within': { boxShadow: '0 0 0 3px', outline: 'none', color: 'primary.main' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography component="span" sx={{ display: 'block', fontWeight: 700, color: 'text.primary' }}>
              {label}{required && <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
              {showChangedMarker && changed && <Box component="span" aria-label="Changed" sx={{ display: 'inline-block', width: 6, height: 6, ml: 0.75, borderRadius: '50%', bgcolor: 'warning.main', verticalAlign: 'middle' }} />}
            </Typography>
            {helperText && <Typography component="span" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontSize: 12.5 }}>{helperText}</Typography>}
          </Box>
          <Box component="span" sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, width: 46, height: 26, borderRadius: 13, bgcolor: checked ? 'primary.main' : 'action.disabledBackground', transition: 'background-color 150ms ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>
            <Box component="span" aria-hidden sx={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 20, height: 20, borderRadius: '50%', bgcolor: 'common.white', boxShadow: 2, transition: 'left 150ms ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }} />
            <Box component="input" id={switchId} name={name} type="checkbox" checked={checked} disabled={disabled} onChange={() => { const next = !checked; if (!next && clearRevealOnDisable) onDisable?.(); onChange(next as T); }} role="switch" aria-checked={checked} aria-required={required || undefined} aria-invalid={Boolean(error)} aria-describedby={describedBy} sx={visuallyHidden} />
          </Box>
        </Box>
        {error && <Typography id={errorId} role="alert" color="error" variant="caption">{error}</Typography>}
        {reveal && checked && (typeof reveal === 'function' ? reveal(value) : reveal)}
      </Box>
    );
  }

  const groupId = name ?? `wt-choice-${label.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`;
  const plainRadioList = variant === 'segmented' && orientation === 'column';
  return (
    <Box component="fieldset" sx={[{ minWidth: 0, m: 0, p: 0, border: 0 }, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>}>
      <Box component="legend" sx={{ p: 0, mb: 0.5, color: 'text.primary', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
        {label}{required && <Box component="span" aria-hidden sx={{ color: 'error.main', ml: 0.25 }}>*</Box>}
        {showChangedMarker && changed && <Box component="span" aria-label="Changed" sx={{ display: 'inline-block', width: 6, height: 6, ml: 0.75, borderRadius: '50%', bgcolor: 'warning.main', verticalAlign: 'middle' }} />}
      </Box>
      {helperText && <Typography id={helperId} sx={{ mb: 0.75, color: 'text.secondary', fontSize: 12.5 }}>{helperText}</Typography>}
      <Box
        role="radiogroup"
        aria-label={label}
        aria-required={required || undefined}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        sx={plainRadioList
          ? { display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', columnGap: { xs: 1.5, sm: 3 }, rowGap: 0.25 }
          : { display: 'grid', gridTemplateColumns: variant === 'cards' ? { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } : 'repeat(auto-fit, minmax(0, 1fr))', gap: 1 }}
      >
        {options.map((option, index) => {
          const active = selected === option.value;
          const inputId = `${groupId}-${index}`;
          return (
            <Box component="label" key={option.value} htmlFor={inputId} title={option.disabled ? option.disabledReason : undefined} sx={plainRadioList ? { display: 'flex', alignItems: 'center', gap: 0.75, minHeight: 40, cursor: option.disabled || disabled ? 'not-allowed' : 'pointer', opacity: option.disabled || disabled ? 0.5 : 1, color: 'text.primary' } : { position: 'relative', display: 'flex', alignItems: 'center', minHeight: 44, px: 1.25, py: variant === 'cards' ? 1 : 0.75, border: '1px solid', borderColor: error ? 'error.main' : active ? 'primary.main' : 'divider', borderRadius: 1.5, bgcolor: active ? 'action.selected' : 'background.paper', cursor: option.disabled || disabled ? 'not-allowed' : 'pointer', opacity: option.disabled || disabled ? 0.5 : 1, transition: 'background-color 150ms ease, border-color 150ms ease', '&:focus-within': { boxShadow: '0 0 0 3px', color: 'primary.main' }, '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>
              <Box component="input" ref={(node: HTMLInputElement | null) => { radioRefs.current[index] = node; }} id={inputId} name={groupId} type="radio" value={option.value} checked={active} disabled={option.disabled || disabled} onChange={() => onChange(option.value as T)} onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); moveRadio(index, 1); } if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); moveRadio(index, -1); } if (event.key === 'Enter') { event.preventDefault(); onChange(option.value as T); } }} tabIndex={active || (!options.some((item) => item.value === selected) && index === enabledIndexes[0]) ? 0 : -1} aria-describedby={describedBy} sx={plainRadioList ? { width: 20, height: 20, m: 0, flexShrink: 0, accentColor: 'primary.main', cursor: 'inherit', '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 } } : visuallyHidden} />
              <Box sx={{ minWidth: 0 }}>
                <Typography component="span" sx={{ display: 'block', fontSize: plainRadioList ? 13.5 : undefined, fontWeight: plainRadioList ? (active ? 600 : 400) : (active ? 700 : 600), lineHeight: 1.35, color: 'inherit' }}>{option.label}{active && variant === 'cards' && <Box component="span" aria-hidden sx={{ ml: 0.75, color: 'success.main' }}>✓</Box>}</Typography>
                {variant === 'cards' && option.description && <Typography component="span" sx={{ display: 'block', mt: 0.25, color: 'text.secondary', fontSize: 12.5 }}>{option.description}</Typography>}
              </Box>
            </Box>
          );
        })}
      </Box>
      {error && <Typography id={errorId} role="alert" color="error" variant="caption" sx={{ display: 'block', mt: 0.5 }}>{error}</Typography>}
      {reveal && options.some((option) => option.value === value) && (typeof reveal === 'function' ? reveal(value) : reveal)}
    </Box>
  );
}

export default WtChoice;
