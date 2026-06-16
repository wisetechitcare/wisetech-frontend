import React, { useState, useContext } from 'react';
import { ErrorMessage, FormikContext, getIn } from 'formik';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import './PhoneNumberInput.css';

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

const getDigits = (value?: string) => (value || '').replace(/\D/g, '');
const normalizePath = (value?: string) => value?.replace(/\[(\d+)\]/g, '.$1');

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
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
  const [focused, setFocused] = useState(false);
  const formikContext = useContext(FormikContext) as any;
  const resolvedFormikProps = formikProps || formikContext;

  const fieldValue = formikField
    ? getIn(resolvedFormikProps?.values || {}, normalizePath(formikField) || formikField) || ''
    : value;
  const extensionValue = formikField && extensionField
    ? getIn(resolvedFormikProps?.values || {}, normalizePath(extensionField) || extensionField) || defaultCountry
    : defaultCountry;

  const normalizedFieldValue = getDigits(fieldValue);
  const combinedValue = extensionField
    ? `${extensionValue}${normalizedFieldValue}`
    : `${defaultCountry}${normalizedFieldValue}`;

  const resolvedError = error;
  const hasFormikError = formikField
    ? !!getIn(resolvedFormikProps?.errors || {}, normalizePath(formikField) || formikField)
    : false;
  const resolvedName = name || formikField || 'phone';

  return (
    <div className={`phone-number-input ${focused ? 'focused' : ''} ${resolvedError || hasFormikError ? 'error' : ''}`}>
      {label && (
        <label htmlFor={resolvedName} className="d-flex align-items-center fs-6 form-label mb-2">
          <span className={isRequired ? 'required' : ''}>{label}</span>
        </label>
      )}
      <PhoneInput
        country={country}
        value={combinedValue}
        onChange={(phoneValue: string, countryData: any) => {
          const dialCode = countryData?.dialCode || defaultCountry;
          const formattedValue = phoneValue.startsWith(dialCode) ? phoneValue.slice(dialCode.length) : phoneValue;
          const digits = getDigits(formattedValue);

          if (formikField && resolvedFormikProps?.setFieldValue) {
            if (extensionField) {
              resolvedFormikProps.setFieldValue(extensionField, dialCode);
            }
            resolvedFormikProps.setFieldValue(formikField, digits);
            return;
          }

          onChange?.(digits);
        }}
        onBlur={() => {
          setFocused(false);
          if (formikField && resolvedFormikProps?.setFieldTouched) {
            resolvedFormikProps.setFieldTouched(formikField, true);
          }
        }}
        onFocus={() => setFocused(true)}
        containerClass="phone-input-container"
        inputClass="phone-input-field"
        buttonClass="phone-input-button"
        specialLabel=""
        inputProps={{
          name: resolvedName,
          id: resolvedName,
          required: isRequired,
          autoFocus: false,
          disabled,
          placeholder,
        }}
      />
      {resolvedError && <div className="phone-number-error">{resolvedError}</div>}
      {formikField && (
        <ErrorMessage
          name={formikField}
          component="div"
          className="phone-number-error"
        />
      )}
    </div>
  );
};

export default PhoneNumberInput;