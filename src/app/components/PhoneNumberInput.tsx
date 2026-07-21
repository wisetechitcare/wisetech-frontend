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

  const currentDialCode = extensionField ? extensionValue : defaultCountry;

  // Blocks any edit that would touch the dial code BEFORE it reaches the DOM at all — the
  // onChange-level guard below only protects the *stored* value; by the time onChange fires,
  // react-phone-input-2 has already applied the edit to its own internal input display, and a
  // controlled `value` prop that happens to equal the previous one isn't guaranteed to force a
  // resync. So the dial code has to be made physically undeletable at the keystroke itself.
  const guardDialCodeEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    const { selectionStart, selectionEnd } = target;
    if (selectionStart === null || selectionEnd === null) return;
    // Displayed value starts with "+" then the dial code digits (e.g. "+91") before any
    // formatting separator — this is the exact boundary of the protected zone.
    const boundary = 1 + currentDialCode.length;

    if (e.key === 'Backspace') {
      const wouldDeleteFrom = selectionStart === selectionEnd ? selectionStart - 1 : selectionStart;
      if (wouldDeleteFrom < boundary) e.preventDefault();
      return;
    }
    if (e.key === 'Delete') {
      if (selectionStart < boundary) e.preventDefault();
      return;
    }
    // A single printable character (not a shortcut like Ctrl+A/Ctrl+V) landing inside the
    // protected zone would also corrupt it — e.g. typing a digit in the middle of "+91".
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && selectionStart < boundary) {
      e.preventDefault();
    }
  };

  const resolvedError = error;
  // Gate the red border on `touched` (mirroring TextInput's `meta.touched && meta.error`) so a
  // required-but-empty phone doesn't paint red on first load. The wizard runs validateForm() on
  // mount, so without this the error border shows before the user has touched anything. onBlur
  // (below) and the wizard's revealSectionErrors both set touched, so the border still appears at
  // the right moments — after blur or on a Continue attempt.
  const isTouched = formikField
    ? !!getIn(resolvedFormikProps?.touched || {}, normalizePath(formikField) || formikField)
    : false;
  const hasFormikError = formikField
    ? isTouched && !!getIn(resolvedFormikProps?.errors || {}, normalizePath(formikField) || formikField)
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

          // Backspacing on an empty number used to eat into the dial code itself (91 → 9),
          // corrupting the stored value with a stray leading digit. react-phone-input-2 always
          // keeps the dial code as a prefix of `phoneValue` on a valid edit — if it's gone
          // missing, the edit ate into it, so reject it outright. The controlled `value` prop
          // above then re-renders the field back to its last good state.
          if (!phoneValue.startsWith(dialCode)) return;

          const formattedValue = phoneValue.slice(dialCode.length);
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
          onKeyDown: guardDialCodeEdit,
          onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => {
            const target = e.currentTarget;
            const boundary = 1 + currentDialCode.length;
            if (target.selectionStart !== null && target.selectionStart < boundary) e.preventDefault();
          },
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
