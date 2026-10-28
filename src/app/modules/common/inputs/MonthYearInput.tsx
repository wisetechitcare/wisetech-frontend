import dayjs from "dayjs";
import { getIn, useField, useFormikContext, type FormikValues } from "formik";
import { useState } from "react";
import { WtDateField } from "../components/ui";
import { useUnsavedChangesRegistration } from "../components/ui/UnsavedChangesProvider";

interface MonthYearInputProps {
  isRequired: boolean;
  inputLabel: string;
  formikProps?: unknown;
  formikField: string;
  placeHolder: string;
  minDateField?: string;
}

/** Month + year picker. Stores the first day of the selected month as YYYY-MM-DD. */
function MonthYearInput({ inputLabel, isRequired, placeHolder, formikField, minDateField }: MonthYearInputProps) {
  const { dirty, values } = useFormikContext<FormikValues>();
  const [field, meta, helpers] = useField(formikField);
  const [validationError, setValidationError] = useState<string>();
  useUnsavedChangesRegistration(dirty);

  const handleChange = (value: string) => {
    if (!value) {
      setValidationError(undefined);
      void helpers.setValue("");
      void helpers.setTouched(false, false);
      return;
    }

    const monthStart = dayjs(value).startOf("month");
    if (!monthStart.isValid()) return;
    const iso = monthStart.format("YYYY-MM-DD");
    const minimum = minDateField ? getIn(values, minDateField) : undefined;
    if (minimum && monthStart.isBefore(dayjs(minimum).startOf("month"))) {
      setValidationError("Month cannot be before the start month");
      void helpers.setValue(iso, false);
      void helpers.setTouched(true, false);
      return;
    }

    setValidationError(undefined);
    void helpers.setValue(iso, true);
    void helpers.setTouched(false, false);
  };

  const hasError = Boolean((meta.touched && meta.error) || validationError);
  return (
    <WtDateField
      label={inputLabel}
      value={field.value || ""}
      onChange={handleChange}
      onOpen={() => void helpers.setTouched(true, false)}
      required={isRequired}
      error={hasError}
      helperText={validationError || (meta.touched && meta.error ? String(meta.error) : undefined)}
      views={["year", "month"]}
      openTo="month"
      format="MM/YYYY"
      fullWidth
      sx={{ width: "100%" }}
      placeholder={placeHolder}
    />
  );
}

export default MonthYearInput;
