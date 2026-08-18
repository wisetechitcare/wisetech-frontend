import * as React from "react";
import { get } from "lodash";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, MobileDatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useMediaQuery } from "@mui/material";

// One source of truth for the date format so the input mask and the placeholder always match.
const DATE_FORMAT = "DD/MM/YYYY";

interface DateInputProps{
    isRequired: boolean;
    inputLabel: string;
    formikProps?: any;
    formikField: string;
    placeHolder?: string; // kept for API compat; the placeholder now always shows the date format
    maxDate?: Dayjs | boolean;
    minDateField?: string; // Field name to compare against for minimum date validation
    /** Earliest selectable date. Days before it are disabled and a typed value is rejected. */
    minDate?: Dayjs;
}

function DateInput({ formikProps, formikField, inputLabel, isRequired, maxDate, minDateField, minDate }: DateInputProps) {
  const { values, setFieldValue, setFieldTouched, setFieldError, errors, touched } = formikProps;
  const [validationError, setValidationError] = React.useState<string>('');

  // Checking if the screen is small (mobile)
  const isMobile = useMediaQuery("(max-width:600px)");

  // Convert stored value to dayjs object
  const getCurrentValue = (): Dayjs | null => {
    const storedValue = get(values, formikField);
    if (!storedValue) return null;
    
    // Handle both ISO format (YYYY-MM-DD) and your custom format
    const parsed = dayjs(storedValue);
    return parsed.isValid() ? parsed : null;
  };

  // Handle date change with proper formatting and validation
  const handleDateChange = (newValue: Dayjs | null) => {
    if (newValue && newValue.isValid()) {
      // Store in ISO format (YYYY-MM-DD) to avoid timezone issues
      const isoDate = newValue.format('YYYY-MM-DD');

      // The picker disables out-of-range days, but the field is still typeable.
      if (minDate && newValue.isBefore(minDate, 'day')) {
        setValidationError(`Date cannot be before ${minDate.format(DATE_FORMAT)}`);
        setFieldValue(formikField, isoDate, false);
        setFieldTouched(formikField, true, false);
        return;
      }

      // Validate against minimum date if specified
      if (minDateField && get(values, minDateField)) {
        const minDate = dayjs(get(values, minDateField));
        if (newValue.isBefore(minDate, 'day')) {
          // Set error for this field
          setValidationError('Date cannot be before start date');
          setFieldValue(formikField, isoDate, false);
          setFieldTouched(formikField, true, false);
          return;
        }
      }

      // Clear validation error if date is valid
      setValidationError('');

      setFieldValue(formikField, isoDate, true);
      // A valid date is now stored, so the "required" error can no longer apply. Clear it
      // SYNCHRONOUSLY — `setFieldValue`'s own validation is async, so without this there's a
      // window where the field still shows "required" even though it's filled. (This was the
      // "date is filled but still shows required" bug.) If the new date genuinely violates a
      // real rule, the async validation re-sets the correct error a tick later.
      setFieldError(formikField, undefined);
    } else {
      setFieldValue(formikField, '', true);
    }
    setFieldTouched(formikField, false);
  };


  const currentValue = getCurrentValue();

      const hasError = !!(get(touched, formikField) && get(errors, formikField)) || !!validationError;

      // DOM-safe id derived from the Formik path so the <label> links to the date input.
      const fieldId = `field-${formikField.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

      return (
    <>
      <label htmlFor={fieldId} className={`fs-6 form-label ${isRequired ? "required" : ""}`}>{inputLabel}</label>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {isMobile ? (
          <MobileDatePicker
            value={currentValue}
            onChange={handleDateChange}
            onOpen={() => {
              setFieldTouched(formikField, true);
            }}
            onError={(error) => {
              console.log('Date picker error:', error);
            }}
            reduceAnimations={true}
            format={DATE_FORMAT}
            maxDate={maxDate === true ? dayjs() : (maxDate instanceof dayjs ? maxDate : undefined)}
            minDate={minDate}
            // Which month an empty picker opens on. `defaultCalendarMonth` was the v5 name and was
            // removed in v6 — passing it here type-errored and did nothing, so the picker kept
            // opening on today rather than on the month being viewed.
            referenceDate={minDate || undefined}
            // Disable keyboard input parsing to prevent issues
            disableOpenPicker={false}
            slotProps={{
              textField: {
                id: fieldId,
                fullWidth: true,
                placeholder: DATE_FORMAT,
                error: hasError,
                onBlur: (event) => {
                  // Validate on blur
                  const inputValue = event.target.value;
                  if (inputValue && inputValue.length === 10) {
                    const parsed = dayjs(inputValue, 'DD/MM/YYYY', true);
                    if (parsed.isValid()) {
                      handleDateChange(parsed);
                    }
                  }
                  setFieldTouched(formikField, true);
                },
                sx: {
                  "& .MuiInputBase-input": { fontSize: "1.2rem" },
                  "& .MuiInputLabel-root": { fontSize: "1.5rem" },
                  "& .MuiOutlinedInput-root": { height: "44px" },
                }
              },
              mobilePaper:{
                sx:{
                   "& .MuiPickersCalendarHeader-label": { fontSize: "1.2rem" },
                  "& .MuiDayCalendar-weekDayLabel": { fontSize: "1rem" },
                  "& .MuiPickersDay-root": { fontSize: "1rem" },
                }
              }
            }}
          />
        ) : (
          <DatePicker
            value={currentValue}
            onChange={handleDateChange}
            onOpen={() => {
              setFieldTouched(formikField, true);
            }}
            onError={(error) => {
              console.log('Date picker error:', error);
            }}
            reduceAnimations={true}
            maxDate={maxDate === true ? dayjs() : (maxDate instanceof dayjs ? maxDate : undefined)}
            minDate={minDate}
            // See the mobile picker above: v5's `defaultCalendarMonth` is `referenceDate` in v7.
            referenceDate={minDate || undefined}
            format={DATE_FORMAT}
            slotProps={{
              textField: {
                id: fieldId,
                fullWidth: true,
                placeholder: DATE_FORMAT,
                error: hasError,
                onBlur: (event) => {
                  // Validate on blur instead of during typing
                  const inputValue = event.target.value;
                  if (inputValue && inputValue.length === 10) {
                    const parsed = dayjs(inputValue, 'DD/MM/YYYY', true);
                    if (parsed.isValid()) {
                      handleDateChange(parsed);
                    }
                  }
                  setFieldTouched(formikField, true);
                },
                sx: {
                  "& .MuiInputBase-input": { fontSize: "1.2rem" },
                  "& .MuiInputLabel-root": { fontSize: "1rem" },
                  "& .MuiOutlinedInput-root": { height: "44px" },
                }
              },
              desktopPaper: {
                sx: {
                  "& .MuiPickersCalendarHeader-label": { fontSize: "1.2rem" },
                  "& .MuiDayCalendar-weekDayLabel": { fontSize: "1rem" },
                  "& .MuiPickersDay-root": { fontSize: "1rem" },
                }
              }
            }}
          />
        )}
      </LocalizationProvider>
      <HighlightErrors isRequired={isRequired} formikField={formikField} />
      {validationError && (
        <div className='text-danger mt-2'>
          {validationError}
        </div>
      )}
    </>
  );
}

export default DateInput;