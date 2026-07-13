import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers";
import dayjs, { Dayjs } from "dayjs";

interface PlainDatePickerProps {
  /** ISO yyyy-mm-dd, or any parseable date string/Date. */
  value?: string | null;
  /** Receives an ISO yyyy-mm-dd string, or '' when cleared. */
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** dayjs display format. Defaults to "9 Jul 2026" style. */
  format?: string;
}

/**
 * Non-Formik counterpart to DateInput.tsx — same MUI X calendar UI (month/year
 * header, circular selected day, Clear/Today footer) for plain value/onChange
 * contexts like inline-editable detail cards or standalone dialogs.
 */
const PlainDatePicker: React.FC<PlainDatePickerProps> = ({
  value, onChange, placeholder = "Select date", disabled, format = "D MMM YYYY",
}) => {
  const parsed = value ? dayjs(value) : null;
  const current: Dayjs | null = parsed && parsed.isValid() ? parsed : null;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        value={current}
        onChange={(newValue: Dayjs | null) => {
          onChange(newValue && newValue.isValid() ? newValue.format("YYYY-MM-DD") : "");
        }}
        format={format}
        disabled={disabled}
        reduceAnimations
        slotProps={{
          textField: {
            fullWidth: true,
            placeholder,
            size: "small",
            sx: {
              "& .MuiOutlinedInput-root": { height: 38, borderRadius: "8px" },
              "& .MuiInputBase-input": { padding: "8px 10px", fontSize: 13 },
            },
          },
        }}
      />
    </LocalizationProvider>
  );
};

export default PlainDatePicker;
