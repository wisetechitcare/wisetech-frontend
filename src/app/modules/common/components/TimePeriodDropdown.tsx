import React from "react";
import { Select, MenuItem, SelectProps } from "@mui/material";

import { PeriodMode } from "@/constants/common";

interface TimePeriodDropdownProps extends Omit<
  SelectProps,
  "value" | "onChange"
> {
  value: PeriodMode | string;
  onChange: (event: any) => void;
  showCustom?: boolean;
  modes?: PeriodMode[];
}

const TimePeriodDropdown: React.FC<TimePeriodDropdownProps> = ({
  value,
  onChange,
  showCustom = true,
  modes = [
    PeriodMode.DAILY,
    PeriodMode.WEEKLY,
    PeriodMode.MONTHLY,
    PeriodMode.YEARLY,
    PeriodMode.ALL_YEAR,
  ],
  ...props
}) => {
  const defaultModes: PeriodMode[] = showCustom
    ? [...modes, PeriodMode.CUSTOM]
    : modes;

  const labels: Record<PeriodMode, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    allyear: "All Time",
    custom: "Custom",
  };

  return (
    <Select
      value={value}
      onChange={onChange}
      displayEmpty
      variant="outlined"
      size="small"
      sx={{
        borderRadius: "20px",
        "& .MuiOutlinedInput-root": {
          borderRadius: "20px",
        },
        "& .MuiOutlinedInput-notchedOutline": {
          borderRadius: "20px",
          borderColor: "#D2B48C",
          borderWidth: "3px",
        },
        "& .Mui-selected": {
          borderColor: "#1E3A8A !important",
          color: "#1E3A8A !important",
        },
        "& .MuiToggleButton-root:hover": {
          borderColor: "#1E3A8A !important",
          color: "#1E3A8A !important",
        },
        ...props.sx,
      }}
      {...props}
    >
      {defaultModes.map((mode) => (
        <MenuItem key={mode} value={mode}>
          {labels[mode]}
        </MenuItem>
      ))}
    </Select>
  );
};

export default TimePeriodDropdown;
