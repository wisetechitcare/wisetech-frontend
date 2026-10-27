import { useContext, useState, type FC } from 'react';
import { FormikContext, getIn } from 'formik';
import { DIAL_CODE_TO_ISO } from '@utils/dialCodes';
import { WtPhoneField } from '@app/modules/common/components/ui';

type PhoneNumberInputProps = {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  isRequired?: boolean;
  formikField?: string;
  formikProps?: any;
  extensionField?: string;
  country?: string;
  defaultCountry?: string;
};

const digits = (value?: string) => (value || '').replace(/\D/g, '');
const normalizePath = (value?: string) => value?.replace(/\[(\d+)\]/g, '.$1');

/** Compatibility adapter over the ESM-safe kit phone field. */
const PhoneNumberInput: FC<PhoneNumberInputProps> = ({
  value = '',
  onChange,
  name,
  label,
  placeholder = 'Enter phone number',
  error,
  disabled = false,
  isRequired = false,
  formikField,
  formikProps,
  extensionField,
  country = 'in',
  defaultCountry = '91',
}) => {
  const context = useContext(FormikContext) as any;
  const formik = formikProps || context;
  const fieldPath = normalizePath(formikField) || formikField || '';
  const fieldValue = formikField ? getIn(formik?.values || {}, fieldPath) || '' : value;
  const extensionValue = formikField && extensionField
    ? getIn(formik?.values || {}, normalizePath(extensionField) || extensionField || '') || defaultCountry
    : defaultCountry;
  const [dialCode, setDialCode] = useState(String(extensionValue));
  const isoCountry = DIAL_CODE_TO_ISO[dialCode] || country;
  const fullValue = fieldValue ? `+${dialCode}${digits(fieldValue)}` : '';
  const touchedError = formikField && getIn(formik?.touched || {}, fieldPath)
    ? getIn(formik?.errors || {}, fieldPath)
    : undefined;
  const resolvedName = name || formikField || 'phone';

  return (
    <WtPhoneField
      label={label}
      name={resolvedName}
      value={fullValue}
      defaultCountry={isoCountry}
      placeholder={placeholder}
      required={isRequired}
      disabled={disabled}
      error={error || (touchedError ? String(touchedError) : undefined)}
      onChange={(phone, countryData) => {
        const nextDialCode = countryData?.dialCode || defaultCountry;
        setDialCode(nextDialCode);
        const fullDigits = digits(phone);
        const nextValue = fullDigits.startsWith(nextDialCode)
          ? fullDigits.slice(nextDialCode.length)
          : fullDigits;
        if (formikField && formik?.setFieldValue) {
          if (extensionField) void formik.setFieldValue(extensionField, nextDialCode);
          void formik.setFieldValue(formikField, nextValue);
        } else {
          onChange?.(nextValue);
        }
      }}
      onBlur={() => {
        if (formikField && formik?.setFieldTouched) void formik.setFieldTouched(formikField, true);
      }}
    />
  );
};

export default PhoneNumberInput;
