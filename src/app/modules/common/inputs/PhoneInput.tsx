import { useState, type FC } from 'react';
import { useFormikContext } from 'formik';
import { WtPhoneField } from '../components/ui';
import { useUnsavedChangesRegistration } from '../components/ui/UnsavedChangesProvider';
import { DIAL_CODE_TO_ISO } from '@utils/dialCodes';

interface Props {
  label: string;
  formikField: string;
  isRequired?: boolean;
  extensionField?: string;
  defaultCountry?: string;
}

const PhoneInputField: FC<Props> = ({ label, formikField, isRequired, extensionField, defaultCountry = '91' }) => {
  const { setFieldValue, values, errors, touched, setFieldTouched, dirty } = useFormikContext<Record<string, any>>();
  const [dialCode, setDialCode] = useState(extensionField ? String(values[extensionField] || defaultCountry) : defaultCountry);
  useUnsavedChangesRegistration(dirty);
  const value = String(values[formikField] || '');
  const fullValue = value ? `+${dialCode}${value.replace(/\D/g, '')}` : '';
  const error = touched[formikField] && errors[formikField] ? String(errors[formikField]) : undefined;

  return (
    <WtPhoneField
      label={label}
      name={formikField}
      value={fullValue}
      defaultCountry={DIAL_CODE_TO_ISO[dialCode] || 'in'}
      required={isRequired}
      error={error}
      onChange={(phone, country) => {
        const nextDialCode = country?.dialCode || defaultCountry;
        setDialCode(nextDialCode);
        const digits = phone.replace(/\D/g, '');
        const national = digits.startsWith(nextDialCode) ? digits.slice(nextDialCode.length) : digits;
        if (extensionField) void setFieldValue(extensionField, nextDialCode);
        void setFieldValue(formikField, national);
      }}
      onBlur={() => void setFieldTouched(formikField, true)}
    />
  );
};

export default PhoneInputField;
