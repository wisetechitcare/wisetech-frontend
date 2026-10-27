import { getIn, useField, useFormikContext } from 'formik';
import { DIAL_CODE_TO_ISO } from '@utils/dialCodes';
import { WtPhoneField } from './WtPhoneField';
import { useUnsavedChangesRegistration } from './UnsavedChangesProvider';

export interface WtPhoneFieldFormikProps {
  name: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  extensionField?: string;
  defaultCountry?: string;
}

const digits = (value: string) => value.replace(/\D/g, '');

/** Formik binding for the kit phone control. Stored value stays national digits. */
export function WtPhoneFieldFormik({
  name,
  label,
  required,
  placeholder,
  disabled,
  extensionField,
  defaultCountry = '91',
}: WtPhoneFieldFormikProps) {
  const [field, meta, helpers] = useField<string>(name);
  const { values, touched, errors, dirty, setFieldValue } = useFormikContext<any>();
  useUnsavedChangesRegistration(dirty);
  const dialCode = String(extensionField ? getIn(values, extensionField) || defaultCountry : defaultCountry);
  const phone = field.value ? `+${dialCode}${digits(String(field.value))}` : '';
  const error = getIn(touched, name) ? getIn(errors, name) : meta.touched ? meta.error : undefined;

  return (
    <WtPhoneField
      name={name}
      label={label}
      value={phone}
      defaultCountry={DIAL_CODE_TO_ISO[dialCode] || 'in'}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      error={error ? String(error) : undefined}
      onChange={(next, country) => {
        const nextDialCode = String(country?.dialCode || dialCode);
        const nextDigits = digits(next);
        void helpers.setValue(nextDigits.startsWith(nextDialCode) ? nextDigits.slice(nextDialCode.length) : nextDigits);
        if (extensionField) void setFieldValue(extensionField, nextDialCode, false);
      }}
      onBlur={() => void helpers.setTouched(true, true)}
    />
  );
}

export default WtPhoneFieldFormik;
