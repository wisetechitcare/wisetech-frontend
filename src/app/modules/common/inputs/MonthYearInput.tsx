import * as React from "react";
import { get } from "lodash";
import HighlightErrors from "../../errors/components/HighlightErrors";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

interface MonthYearInputProps {
    isRequired: boolean;
    inputLabel: string;
    formikProps?: any;
    formikField: string;
    placeHolder: string;
    minDateField?: string; // Field name to compare against for minimum month validation
}

/**
 * Month + year picker (no day selection). Stores the FIRST day of the picked
 * month as 'YYYY-MM-01' so downstream ISO-date logic keeps working unchanged.
 */
function MonthYearInput({ formikProps, formikField, inputLabel, isRequired, placeHolder, minDateField }: MonthYearInputProps) {
    const { values, setFieldValue, setFieldTouched, errors, touched } = formikProps;
    const [validationError, setValidationError] = React.useState<string>('');

    const stored = get(values, formikField);
    const parsed = stored ? dayjs(stored) : null;
    const currentValue: Dayjs | null = parsed && parsed.isValid() ? parsed : null;

    const handleChange = (newValue: Dayjs | null) => {
        if (newValue && newValue.isValid()) {
            const monthStart = newValue.startOf('month');
            const iso = monthStart.format('YYYY-MM-DD');

            if (minDateField && get(values, minDateField)) {
                const min = dayjs(get(values, minDateField)).startOf('month');
                if (monthStart.isBefore(min)) {
                    setValidationError('Month cannot be before the start month');
                    setFieldValue(formikField, iso, false);
                    setFieldTouched(formikField, true, false);
                    return;
                }
            }

            setValidationError('');
            setFieldValue(formikField, iso, true);
        } else {
            setFieldValue(formikField, '', true);
        }
        setFieldTouched(formikField, false);
    };

    const hasError = !!(get(touched, formikField) && get(errors, formikField)) || !!validationError;

    return (
        <>
            <label className={`fs-6 form-label ${isRequired ? "required" : ""}`}>{inputLabel}</label>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                    value={currentValue}
                    onChange={handleChange}
                    onOpen={() => setFieldTouched(formikField, true)}
                    views={['year', 'month']}
                    openTo="month"
                    format="MM/YYYY"
                    reduceAnimations
                    slotProps={{
                        textField: {
                            fullWidth: true,
                            placeholder: placeHolder,
                            error: hasError,
                            sx: {
                                "& .MuiInputBase-input": { fontSize: "1.2rem" },
                                "& .MuiInputLabel-root": { fontSize: "1rem" },
                                "& .MuiOutlinedInput-root": { height: "44px" },
                            },
                        },
                        desktopPaper: {
                            sx: {
                                "& .MuiPickersCalendarHeader-label": { fontSize: "1.2rem" },
                                "& .MuiPickersMonth-monthButton": { fontSize: "1rem" },
                                "& .MuiPickersYear-yearButton": { fontSize: "1rem" },
                            },
                        },
                    }}
                />
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

export default MonthYearInput;
