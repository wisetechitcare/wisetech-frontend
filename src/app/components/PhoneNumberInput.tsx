import React, { useState, useContext, useEffect } from 'react';
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

/**
 * The dial code now lives in the flag button, so the flag and the code sit side by side
 * and MUST always agree — an Indian flag reading "+1" is worse than no code at all.
 *
 * On a fresh mount the library can no longer infer the country from the value (there's
 * no `+91` in it any more), so a stored dial code is mapped back to its flag here.
 * Consistency is guaranteed by making the resolved country the single source of BOTH:
 * the flag comes from this map, and the code printed beside it is that country's dial
 * code (via the inverse map) — never the raw stored value. A code outside the map
 * therefore opens on the default flag AND shows the default code rather than pairing
 * a wrong flag with a right number. After mount the library owns the selection, and
 * onChange re-syncs the printed code from the country it reports, so any country the
 * user picks stays matched whether it is in this map or not.
 */
const DIAL_CODE_TO_ISO: Record<string, string> = {
  '91': 'in', '1': 'us', '44': 'gb', '971': 'ae', '966': 'sa', '974': 'qa',
  '968': 'om', '965': 'kw', '973': 'bh', '65': 'sg', '60': 'my', '61': 'au',
  '64': 'nz', '49': 'de', '33': 'fr', '39': 'it', '34': 'es', '31': 'nl',
  '41': 'ch', '46': 'se', '47': 'no', '45': 'dk', '353': 'ie', '351': 'pt',
  '27': 'za', '234': 'ng', '254': 'ke', '20': 'eg', '81': 'jp', '82': 'kr',
  '86': 'cn', '852': 'hk', '66': 'th', '84': 'vn', '62': 'id', '63': 'ph',
  '880': 'bd', '94': 'lk', '977': 'np', '92': 'pk', '7': 'ru', '90': 'tr',
  '55': 'br', '52': 'mx', '54': 'ar', '56': 'cl',
};

/** Inverse of the above. Safe to derive: every entry above is a 1:1 dial↔iso pair. */
const ISO_TO_DIAL_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(DIAL_CODE_TO_ISO).map(([dial, iso]) => [iso, dial])
);

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

  const storedDialCode = extensionField ? extensionValue : defaultCountry;

  const [resolvedCountry] = useState(() => DIAL_CODE_TO_ISO[storedDialCode] || country);

  /**
   * The country is handed over one render LATE, and that timing is the whole trick.
   *
   * On first render react-phone-input-2 picks its country by guessing from the value's
   * leading digits. With `disableCountryCode` that value is a bare national number, so
   * 9594107173 guessed Myanmar (+95) and 1546547841 guessed US (+1) — a foreign flag
   * beside "+91". Its `disableInitialCountryGuess` prop does NOT mean "use my country
   * prop": it hard-sets selectedCountry to 0, leaving the sprite class as "flag " with
   * no country, which is why the flag vanished entirely.
   *
   * componentDidUpdate takes a different path — a CHANGED country prop calls
   * updateCountry(), which resolves from the ISO code and never looks at the digits. So
   * mount with "" (nothing to guess, nothing rendered wrong) and set the real country
   * immediately after. Combined with `disableCountryGuess`, which stops it re-guessing
   * while typing, the number can never influence the flag again.
   *
   * It stays fixed from then on: re-feeding it every render would snap the flag back and
   * undo a country the user picked from the dropdown.
   */
  const [countryProp, setCountryProp] = useState('');
  useEffect(() => {
    setCountryProp(resolvedCountry);
  }, [resolvedCountry]);

  // The code printed in the button, seeded from the SAME country the flag opens on so
  // the two can't contradict each other, then re-synced from whatever country the
  // library reports on change — which is authoritative once the user has interacted.
  const [currentDialCode, setCurrentDialCode] = useState(
    () => ISO_TO_DIAL_CODE[resolvedCountry] || defaultCountry
  );

  // NOTE: the dial code is no longer part of the input's text — `disableCountryCode`
  // keeps the field to the national number and the code is rendered in the flag button
  // instead. That deletes an entire class of bug this component used to carry: the
  // keydown/paste guards that made "+91" physically undeletable, and the onChange check
  // that rejected any edit which had eaten into it. None of it is reachable now, because
  // there is nothing in the input to protect.

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
    <div
      className={`phone-number-input ${focused ? 'focused' : ''} ${resolvedError || hasFormikError ? 'error' : ''}`}
      // The button renders the code from `content: var(--phone-dial-code)` and both the
      // button width and the input's left padding key off --phone-dial-w, so a longer
      // code (+971) widens the button and pushes the number across with it instead of
      // overlapping it. Measured in ch so it tracks the font rather than a magic number.
      style={
        {
          '--phone-dial-code': `'+${currentDialCode}'`,
          '--phone-dial-w': `${currentDialCode.length + 1}ch`,
        } as React.CSSProperties
      }
    >
      {label && (
        <label htmlFor={resolvedName} className="d-flex align-items-center fs-6 form-label mb-2">
          <span className={isRequired ? 'required' : ''}>{label}</span>
        </label>
      )}
      <PhoneInput
        country={countryProp}
        value={normalizedFieldValue}
        disableCountryCode
        // Stops the country being re-guessed from the digits as the user types. The
        // INITIAL guess is dodged by the deferred `countryProp` above — not by
        // `disableInitialCountryGuess`, which blanks the country and loses the flag.
        disableCountryGuess
        onChange={(phoneValue: string, countryData: any) => {
          const dialCode = countryData?.dialCode || defaultCountry;

          // Keep the printed code tied to the flag the library is actually showing.
          setCurrentDialCode(dialCode);

          // `phoneValue` is the national number only — the dial code never enters the
          // input, so there is no prefix to strip and nothing to validate it against.
          const digits = getDigits(phoneValue);

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
