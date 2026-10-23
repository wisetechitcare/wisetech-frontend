import { getIn, useField, useFormikContext, type FormikValues } from 'formik';
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';
import { choiceIsOn, WtChoice, type ChoiceVariant, type WtChoiceOption } from './WtChoice';
import { useUnsavedChangesRegistration } from './UnsavedChangesProvider';

export interface WtChoiceFieldProps<T extends string | boolean> {
  name: string;
  label: string;
  variant: ChoiceVariant;
  options?: readonly WtChoiceOption<Extract<T, string>>[];
  helperText?: string;
  required?: boolean;
  reveal?: ReactNode | ((value: T) => ReactNode);
  disabled?: boolean;
  showChangedMarker?: boolean;
  clearRevealOnDisable?: boolean;
  clearOnDisable?: readonly string[];
  orientation?: 'row' | 'column';
  sx?: SxProps<Theme>;
  onValueChange?: (value: T) => void;
}

export function WtChoiceField<T extends string | boolean>({
  name,
  variant,
  options,
  onValueChange,
  clearOnDisable,
  orientation,
  showChangedMarker = true,
  ...rest
}: WtChoiceFieldProps<T>) {
  const [field, meta, helpers] = useField<T>(name);
  const { dirty, initialValues, setFieldTouched, setFieldValue } = useFormikContext<FormikValues>();
  useUnsavedChangesRegistration(dirty);

  const value = field.value ?? (variant === 'switch' ? false : '') as T;
  const changed = dirty && JSON.stringify(value) !== JSON.stringify(getIn(initialValues, name));
  const error = meta.touched && meta.error ? String(meta.error) : undefined;

  const handleChange = (next: T) => {
    const wasEnabled = choiceIsOn(value);
    const isEnabled = choiceIsOn(next);
    if (variant === 'switch' && wasEnabled && !isEnabled && clearOnDisable?.length) {
      clearOnDisable.forEach((path) => {
        void setFieldValue(path, '', false);
        void setFieldTouched(path, false, false);
      });
    }
    const storedValue = variant === 'switch' && typeof value === 'string'
      ? ((String(value) === '1' || String(value) === '0') ? (isEnabled ? '1' : '0') : (isEnabled ? 'true' : 'false')) as T
      : next;
    void helpers.setValue(storedValue);
    void helpers.setTouched(true, false);
    onValueChange?.(storedValue);
  };

  return <WtChoice {...rest} name={name} variant={variant} options={options} value={value} error={error} changed={changed} showChangedMarker={showChangedMarker} orientation={orientation} onChange={handleChange} />;
}

export type { ChoiceVariant, WtChoiceOption } from './WtChoice';
export default WtChoiceField;
