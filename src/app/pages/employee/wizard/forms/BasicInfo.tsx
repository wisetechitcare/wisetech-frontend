import { useEffect } from 'react';
import { useFormikContext } from 'formik';
import dayjs from 'dayjs';
import { HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { WtDateField, WtFieldFormik } from '@app/modules/common/components/ui';

interface TooltipProps { text: string }
function Tooltip({ text }: TooltipProps) {
  return (
    <span className="ob-tooltip-anchor" aria-label={text}>
      <HelpCircle size={13} />
      <span className="ob-tooltip-bubble">{text}</span>
    </span>
  );
}

interface TogglePillGroupProps {
  field: string;
  options: { value: string; label: string; icon?: React.ReactNode }[];
  label: string;
  required?: boolean;
  tooltip?: string;
}
function TogglePillGroup({ field, options, label, required, tooltip }: TogglePillGroupProps) {
  const { values, setFieldValue, touched, errors } = useFormikContext<any>();
  const value = values[field];
  const hasError = !!(touched[field] && errors[field]);
  const isValid  = !!(touched[field] && !errors[field] && value !== '');

  return (
    <div style={{ marginBottom: 0 }}>
      <label className="ob-label">
        {required && <span className="ob-label-required">*&thinsp;</span>}
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <div className="ob-pill-group" role="group" aria-label={label}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`ob-pill${value === opt.value ? ' selected' : ''}`}
            onClick={() => setFieldValue(field, opt.value)}
            aria-pressed={value === opt.value}
          >
            {opt.icon && <span style={{ display: 'flex', alignItems: 'center' }}>{opt.icon}</span>}
            {opt.label}
          </button>
        ))}
        {isValid && <CheckCircle size={16} style={{ color: 'var(--ob-success)', marginLeft: 4 }} />}
      </div>
      {/* Single error indicator — the message line below (with its own icon). The standalone
          red "!" next to the pills was a second, duplicate alert for the same error. */}
      {hasError && (
        <p className="ob-field-error-text">
          <AlertCircle size={11} />
          {String(errors[field])}
        </p>
      )}
    </div>
  );
}

/* Gender options with SVG icons */
const GENDER_OPTIONS = [
  {
    value: '0', label: 'Male',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="14" r="5"/><line x1="21" y1="3" x2="15" y2="9"/><line x1="15" y1="3" x2="21" y2="9"/>
      </svg>
    ),
  },
  {
    value: '1', label: 'Female',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="5"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
      </svg>
    ),
  },
  {
    value: '2', label: 'Others',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
];

const MARITAL_OPTIONS = [
  { value: '1', label: 'Unmarried' },
  { value: '0', label: 'Married' },
];

/* ── Main component ── */
function BasicInfo({
  formikProps,
  softRequired = false,
}: {
  formikProps: any;
  /** Candidate / pre-hire — only First Name is hard-required. */
  softRequired?: boolean;
}) {
  const { values, setFieldValue } = formikProps;
  const isMarried = String(values?.maritalStatus) === '0';
  // Employee onboarding keeps last name / DOB / gender required; candidate does not.
  const hard = !softRequired;

  useEffect(() => {
    if (!isMarried && values?.anniversary) {
      setFieldValue('anniversary', '', false);
    }
  }, [isMarried]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1 – First Name / Last Name / DOB */}
      <div className="row g-3">
        <div className="col-lg-4 col-md-6 col-sm-12">
          <WtFieldFormik name="firstName" label="First Name" required fullWidth />
        </div>
        <div className="col-lg-4 col-md-6 col-sm-12">
          <WtFieldFormik name="lastName" label="Last Name" required={hard} fullWidth />
        </div>
        <div className="col-lg-4 col-md-6 col-sm-12">
          <WtDateField
            label="Date of Birth"
            required={hard}
            value={values?.dateOfBirth || null}
            onChange={(v) => setFieldValue('dateOfBirth', v)}
            maxDate={dayjs().format('YYYY-MM-DD')}
          />
        </div>
      </div>

      {/* Row 2 – Gender / Marital Status / Anniversary.
          Anniversary is a SIBLING column, not nested inside Marital Status. Nesting
          halved the marital column on "Married", squeezing its two pills onto two
          lines and pushing the row out of alignment.

          The three columns are a FIXED third each, never resized by whether Anniversary
          is showing. Widening them to halves when it's hidden would re-centre the row,
          so Marital Status slid sideways every time the user toggled Married/Unmarried.
          Held at a third, Gender stays under First Name and Marital Status under Last
          Name in both states, and Anniversary simply fills or vacates the third slot
          beneath Date of Birth — matching Row 1's columns exactly. */}
      <div className="row g-3">
        <div className="col-lg-4 col-md-6 col-sm-12">
          <TogglePillGroup
            field="gender"
            label="Gender"
            required={hard}
            options={GENDER_OPTIONS}
          />
        </div>
        <div className="col-lg-4 col-md-6 col-sm-12">
          <TogglePillGroup
            field="maritalStatus"
            label="Marital Status"
            options={MARITAL_OPTIONS}
            tooltip="Used for HR records and leave policy calculations."
          />
        </div>
        {isMarried && (
          <div className="col-lg-4 col-md-6 col-sm-12">
            <WtDateField
              label="Anniversary Date"
              value={values?.anniversary || null}
              onChange={(v) => setFieldValue('anniversary', v)}
            />
          </div>
        )}
      </div>

    </div>
  );
}

export default BasicInfo;
