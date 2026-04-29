import * as React from "react";
import { get } from "lodash";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker, MobileDatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";
import { useMediaQuery } from "@mui/material";

interface DateInputProps{
    isRequired: boolean;
    inputLabel: string;
    formikProps?: any;
    formikField: string;
    placeHolder: string;
    maxDate?: boolean;
    minDateField?: string; // Field name to compare against for minimum date validation
}

function DateInput({ formikProps, formikField, inputLabel, isRequired, placeHolder, maxDate, minDateField }: DateInputProps) {
  const { values, setFieldValue, setFieldTouched, errors, touched } = formikProps;
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
    } else {
      setFieldValue(formikField, '', true);
    }
    setFieldTouched(formikField, false);
  };


  const currentValue = getCurrentValue();

  return (
    <>
      <label className={`fs-6 form-label ${isRequired ? "required" : ""}`}>{inputLabel}</label>
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
            format="DD/MM/YYYY"
            maxDate={maxDate ? dayjs() : undefined}
            // Disable keyboard input parsing to prevent issues
            disableOpenPicker={false}
            slotProps={{
              textField: {
                fullWidth: true,
                placeholder: placeHolder,
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
            maxDate={maxDate ? dayjs() : undefined}
            format="DD/MM/YYYY"
            slotProps={{
              textField: {
                fullWidth: true,
                placeholder: placeHolder,
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