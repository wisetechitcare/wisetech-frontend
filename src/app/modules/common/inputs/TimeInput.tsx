import { MobileTimePicker } from '@mui/x-date-pickers/MobileTimePicker';
import { useFormikContext } from 'formik';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useTheme } from '@mui/material/styles';
import HighlightErrors from "../../errors/components/HighlightErrors";
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';

// Time restriction like user can select time till current not future time
interface TimePickerInputProps {
  formikField: string;
  label: string;
  isRequired?: boolean;
  margin?: string;
  placeholder?: string;
  timeRestriction?: boolean;
}

const TimePickerInput: React.FC<TimePickerInputProps> = ({ 
  formikField, 
  label, 
  isRequired = false, 
  margin, 
  placeholder, 
  timeRestriction 
}) => {
  const userAgent = useSelector((state: RootState) => state?.userAgent?.userAgent);
  const { setFieldValue, values, errors, touched } = useFormikContext<Record<string, any>>();
  const error = errors[formikField];
  const isTouched = touched[formikField];

  // Theme-driven colors so the field (and its value) stay legible in both light and dark mode.
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const fieldBg = theme.palette.background.paper;
  const fieldText = theme.palette.text.primary;
  const fieldBorder = theme.palette.divider;
  const brand = theme.palette.primary.main;
  
  const isIosDevice = userAgent?.os?.name === 'iOS' && userAgent?.device?.model === 'iPhone' && userAgent?.device?.vendor === 'Apple';

  const handleTimeChange = (newValue: dayjs.Dayjs | null) => {
    if (!newValue) {
      setFieldValue(formikField, '');
      return;
    }

    // If time restriction is enabled, validate the selected time
    if (timeRestriction) {
      const now = dayjs();
      const selectedTime = newValue;

      // If selected time is in the future, don't update the formik value
      if (selectedTime.isAfter(now)) {
        // Clear the field value to prevent future time submission
        setFieldValue(formikField, '');
        return;
      }
    }

    // Only set valid times
    setFieldValue(formikField, newValue.format('HH:mm'));
  };

  const handleHtmlTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = event.target.value; // Format: "HH:mm"
    
    if (!timeValue) {
      setFieldValue(formikField, '');
      return;
    }

    // If time restriction is enabled, validate the selected time
    if (timeRestriction) {
      const now = dayjs();
      const selectedTime = dayjs(timeValue, 'HH:mm');
      
      // Compare only time, not date
      const nowTime = now.format('HH:mm');
      
      // If selected time is in the future, don't update the formik value
      if (timeValue > nowTime) {
        // Reset the input to empty or previous valid value
        event.target.value = values[formikField] || '';
        return;
      }
    }

    setFieldValue(formikField, timeValue);
  };

  // Get current time in HH:mm format for max attribute
  const getCurrentTime = () => {
    return dayjs().format('HH:mm');
  };

  // Render iOS-specific simple time picker
  const renderIosTimePicker = () => (
    <div className={`d-flex flex-column fv-row ${margin}`}>
      {label && (
        <label className='d-flex align-items-center fs-6 form-label mb-2' style={{ fontWeight: '500' }}>
          <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
        </label>
      )}
      <input
        type="time"
        className="form-control form-control-lg form-control-solid"
        value={values[formikField] || ''}
        onChange={handleHtmlTimeChange}
        placeholder={placeholder}
        max={timeRestriction ? getCurrentTime() : undefined}
        style={{
          height: '44px',
          backgroundColor: fieldBg,
          color: fieldText,
          colorScheme: isDark ? 'dark' : 'light',
          borderRadius: '6px',
          borderColor: error && isTouched ? '#f1416c' : fieldBorder,
          fontSize: '1.2rem',
          transition: 'border-color 0.3s ease-in-out'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = brand;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error && isTouched ? '#f1416c' : fieldBorder;
        }}
      />
      <HighlightErrors isRequired={isRequired} formikField={formikField} />
    </div>
  );

  // Render Material-UI time picker for non-iOS devices
  const renderMuiTimePicker = () => (
    <div className={`d-flex flex-column fv-row ${margin}`}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {label && (
          <label className='d-flex align-items-center fs-6 form-label mb-2' style={{ fontWeight: '500' }}>
            <span className={`${isRequired ? 'required' : ''}`}>{label}</span>
          </label>
        )}
        <MobileTimePicker
          value={values[formikField] ? dayjs(values[formikField], 'HH:mm') : null}
          onChange={handleTimeChange}
          reduceAnimations={true}
          ampm={true}
          format="HH:mm"
          slotProps={{
            textField: {
              fullWidth: true,
              placeholder: placeholder,
              className: 'form-control form-control-lg form-control-solid',
              sx: {
                // Value text follows the theme so it never renders white-on-white in dark mode.
                "& .MuiInputBase-input": { fontSize: "1.2rem", color: fieldText, WebkitTextFillColor: fieldText },
                "& .MuiInputLabel-root": { fontSize: "1.5rem" },
                "& .MuiOutlinedInput-root": {
                  height: "44px",
                  backgroundColor: fieldBg,
                  borderRadius: "6px",
                  transition: "border-color 0.3s ease-in-out"
                },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: fieldBorder },
                "& .MuiInputBase-input::placeholder": {
                  opacity: 1,
                  color: theme.palette.text.secondary,
                },
                "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: `${brand} !important`,
                },
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: `${brand} !important`,
                  borderWidth: "1px",
                },
              },
            },
            toolbar: {
              sx: {
                // big hour/min display
                '& .MuiTimePickerToolbar-hourMinuteLabel, & .MuiTimePickerToolbar-separator': {
                  fontSize: '2rem',
                  fontWeight: 700,
                  lineHeight: 1,
                },
                // AM/PM container buttons
                '& .MuiTimePickerToolbar-ampmSelection .MuiButtonBase-root': {
                  borderRadius: 8,
                  minWidth: '48px',
                  border: '1px solid transparent',
                },
                // AM/PM text itself
                '& .MuiTimePickerToolbar-ampmSelection .MuiButtonBase-root span': {
                  fontSize: '1rem',
                  fontWeight: 200,
                },
                // style only the selected AM/PM item — solid brand pill reads on light and dark
                '& .MuiTimePickerToolbar-ampmSelection .Mui-selected': {
                  padding: '13px',
                  backgroundColor: brand,
                  color: theme.palette.primary.contrastText,
                  borderColor: brand,
                  fontWeight: 900,
                  borderRadius: '30px',
                },
              },
            },
          }}
        />
      </LocalizationProvider>
      <HighlightErrors isRequired={isRequired} formikField={formikField} />
    </div>
  );

  // Return appropriate picker based on device
  return isIosDevice ? renderIosTimePicker() : renderMuiTimePicker();
};

export default TimePickerInput;