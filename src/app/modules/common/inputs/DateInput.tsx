import * as React from "react";
import { get } from "lodash";
import dayjs, { Dayjs } from "dayjs";
import { CalendarDate } from "@internationalized/date";
import { useUnsavedChangesRegistration } from "../components/ui/UnsavedChangesProvider";
import { KitProvider } from "@/ds/provider";
import { DatePicker } from "@/ds/ui/date-picker";

const DATE_FORMAT = "DD/MM/YYYY";

interface DateInputProps {
    isRequired: boolean;
    inputLabel: string;
    formikProps?: any;
    formikField: string;
    placeHolder?: string; // kept for API compat; the field always shows the date segments
    maxDate?: Dayjs | boolean;
    minDateField?: string; // Field name to compare against for minimum date validation
    /** Earliest selectable date. Days before it are disabled and a typed value is flagged. */
    minDate?: Dayjs;
}

const toCalendar = (d: Dayjs | null | undefined): CalendarDate | null =>
    d && d.isValid() ? new CalendarDate(d.year(), d.month() + 1, d.date()) : null;

/**
 * Formik date field on the kit DatePicker (React Aria). The form stores 'YYYY-MM-DD'; a stored
 * full timestamp keeps its time when the same day is re-confirmed (receivedDate is auto-filled with
 * the real instant so same-day records can be ordered).
 */
function DateInput({ formikProps, formikField, inputLabel, isRequired, maxDate, minDateField, minDate }: DateInputProps) {
    const { values, setFieldValue, setFieldTouched, setFieldError, errors, touched } = formikProps;
    useUnsavedChangesRegistration(Boolean(formikProps?.dirty));

    const stored = get(values, formikField);
    const storedDay = stored ? dayjs(stored) : null;
    // `undefined` = follow Formik. A year typed digit by digit passes through 0002, 0020, 0202 on its
    // way to 2025; holding those here keeps them out of the form (and out of its validation).
    const [pending, setPending] = React.useState<CalendarDate | null | undefined>(undefined);
    const value = pending !== undefined ? pending : toCalendar(storedDay);

    const floor = minDate ?? (minDateField && get(values, minDateField) ? dayjs(get(values, minDateField)) : undefined);
    const minValue = toCalendar(floor);
    const maxValue = maxDate === true ? toCalendar(dayjs()) : maxDate ? toCalendar(maxDate as Dayjs) : null;

    const commit = (next: CalendarDate | null) => {
        setPending(undefined);
        if (!next) {
            setFieldValue(formikField, "", true);
            return;
        }
        const picked = dayjs(next.toString());
        const iso = storedDay?.isValid() && storedDay.isSame(picked, "day") ? storedDay.toISOString() : next.toString();
        setFieldValue(formikField, iso, true);
        // The value is now stored, so a stale "required" error no longer applies; async validation
        // re-sets a real one a tick later.
        setFieldError(formikField, undefined);
    };

    const rangeError =
        value && minValue && value.compare(minValue) < 0
            ? minDateField && !minDate
                ? "Date cannot be before start date"
                : `Date cannot be before ${floor!.format(DATE_FORMAT)}`
            : value && maxValue && value.compare(maxValue) > 0
                ? `Date cannot be after ${dayjs(maxValue.toString()).format(DATE_FORMAT)}`
                : undefined;
    const formError = get(touched, formikField) && get(errors, formikField) ? String(get(errors, formikField)) : undefined;
    const message = rangeError ?? formError;

    return (
        <KitProvider>
            <DatePicker
                label={
                    <>
                        {inputLabel}
                        {isRequired && <span aria-hidden className="text-destructive">*</span>}
                    </>
                }
                value={value}
                // The calendar greys out days outside the range; a typed one is flagged below, not blocked.
                minValue={minValue ?? undefined}
                maxValue={maxValue ?? undefined}
                onChange={(next: CalendarDate | null) => {
                    if (next && next.year < 1000) setPending(next);
                    else commit(next);
                }}
                onBlur={() => {
                    setFieldTouched(formikField, true, false);
                    if (pending !== undefined) setPending(undefined);
                }}
                isRequired={isRequired}
                isInvalid={!!message}
                errorMessage={message}
                validationBehavior="aria"
            />
        </KitProvider>
    );
}

export default DateInput;
