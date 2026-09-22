import { useField } from 'formik';
import HighlightErrors from '@app/modules/errors/components/HighlightErrors';
import { TimePickerField } from '@app/modules/common/components/TimePickerField';

/**
 * TimePickerInput — the Formik binding for `TimePickerField`.
 *
 * Nothing but a label, the picker and the error line. It used to be two pickers behind a
 * user-agent sniff (MUI's `MobileTimePicker` everywhere, a native `<input type="time">` on
 * iPhones) with ~80 lines of theme overrides apiece, which meant the same field looked like
 * three different controls depending on who opened it. `TimePickerField` renders the same
 * Material-3 dialog on every device, so the branch — and the sniff — are gone.
 *
 * Wire format is unchanged: a 24h "HH:mm" string in the Formik value.
 */
interface TimePickerInputProps {
  formikField: string;
  label: string;
  isRequired?: boolean;
  margin?: string;
  placeholder?: string;
}

const TimePickerInput: React.FC<TimePickerInputProps> = ({
  formikField,
  label,
  isRequired = false,
  margin,
  placeholder,
}) => {
  const [field, meta, helpers] = useField<string>(formikField);

  return (
    <div className={`d-flex flex-column fv-row ${margin ?? ''}`}>
      {label && (
        <label className='d-flex align-items-center fs-6 form-label mb-2' style={{ fontWeight: '500' }}>
          <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
        </label>
      )}
      <TimePickerField
        value={field.value || ''}
        onChange={(v) => helpers.setValue(v)}
        placeholder={placeholder}
        invalid={Boolean(meta.touched && meta.error)}
      />
      <HighlightErrors isRequired={isRequired} formikField={formikField} />
    </div>
  );
};

export default TimePickerInput;
