import { useEffect, useState } from 'react';
import { useField, useFormikContext } from 'formik';
import { HelpCircle, CheckCircle, AlertCircle } from 'lucide-react';
import DropDownInput from '@app/modules/common/inputs/DropdownInput';
import DateInput from '@app/modules/common/inputs/DateInput';
import TextInput from '@app/modules/common/inputs/TextInput';

/* ── helpers ── */
const bloodGroupOptions = [
  { value: 'A_POS', label: 'A+' }, { value: 'A_NEG', label: 'A-' },
  { value: 'B_POS', label: 'B+' }, { value: 'B_NEG', label: 'B-' },
  { value: 'AB_POS', label: 'AB+' }, { value: 'AB_NEG', label: 'AB-' },
  { value: 'O_POS', label: 'O+' }, { value: 'O_NEG', label: 'O-' },
];

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
        {isValid  && <CheckCircle size={16} style={{ color: 'var(--ob-success)', marginLeft: 4 }} />}
        {hasError && <AlertCircle size={16} style={{ color: 'var(--ob-danger)', marginLeft: 4 }} />}
      </div>
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
];

const MARITAL_OPTIONS = [
  { value: '1', label: 'Unmarried' },
  { value: '0', label: 'Married' },
];

/* ── Main component ── */
function BasicInfo({ formikProps }: { formikProps: any }) {
  const { values, touched, errors, setFieldValue } = formikProps;
  const isMarried = String(values?.maritalStatus) === '0';

  useEffect(() => {
    if (!isMarried && values?.anniversary) {
      setFieldValue('anniversary', '', false);
    }
  }, [isMarried]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Row 1 – First Name / Last Name */}
      <div className="row g-3">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TextInput isRequired label="First Name" formikField="firstName" margin="mb-0" />
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TextInput isRequired label="Last Name" formikField="lastName" margin="mb-0" />
        </div>
      </div>

      {/* Row 2 – Nickname / DOB */}
      <div className="row g-3">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <div>
            <label className="ob-label">
              Nickname
              <Tooltip text="This is what colleagues will call you on a daily basis." />
            </label>
            <TextInput isRequired={false} formikField="nickName" margin="mb-0" />
            <p className="ob-field-helper">This is what colleagues will call you.</p>
          </div>
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <DateInput
            formikField="dateOfBirth"
            isRequired
            formikProps={formikProps}
            inputLabel="Date of Birth"
            placeHolder="DD / MM / YYYY"
            maxDate
          />
        </div>
      </div>

      {/* Row 3 – Gender & Marital Status */}
      <div className="row g-3">
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TogglePillGroup
            field="gender"
            label="Gender"
            required
            options={GENDER_OPTIONS}
          />
        </div>
        <div className="col-lg-6 col-md-6 col-sm-12">
          <TogglePillGroup
            field="maritalStatus"
            label="Marital Status"
            options={MARITAL_OPTIONS}
            tooltip="Used for HR records and leave policy calculations."
          />
        </div>
      </div>

      {/* Row 4 – Anniversary & Blood Group */}
      <div className="row g-3">
        {isMarried ? (
          <>
            <div className="col-lg-6 col-md-6 col-sm-12">
              <DateInput
                formikField="anniversary"
                isRequired={false}
                formikProps={formikProps}
                inputLabel="Anniversary Date"
                placeHolder="DD / MM / YYYY"
              />
            </div>
            <div className="col-lg-6 col-md-6 col-sm-12">
              <DropDownInput
                isRequired={false}
                formikField="emergencyDetails.bloodGroup"
                inputLabel="Blood Group"
                options={bloodGroupOptions}
              />
            </div>
          </>
        ) : (
          <div className="col-lg-6 col-md-6 col-sm-12">
            <DropDownInput
              isRequired={false}
              formikField="emergencyDetails.bloodGroup"
              inputLabel="Blood Group"
              options={bloodGroupOptions}
            />
          </div>
        )}
      </div>

    </div>
  );
}

export default BasicInfo;
