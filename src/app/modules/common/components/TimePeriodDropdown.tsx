import React from "react";
import { Select, MenuItem, SelectProps } from "@mui/material";

export type TimePeriodMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

interface TimePeriodDropdownProps extends Omit<SelectProps, "value" | "onChange"> {
  value: TimePeriodMode | string;
  onChange: (event: any) => void;
  showCustom?: boolean;
  modes?: TimePeriodMode[];
}

const TimePeriodDropdown: React.FC<TimePeriodDropdownProps> = ({
  value,
  onChange,
  showCustom = true,
  modes = ["daily", "weekly", "monthly", "yearly", "allyear"],
  ...props
}) => {
  const defaultModes: TimePeriodMode[] = showCustom ? [...modes, "custom"] : modes;

  const labels: Record<TimePeriodMode, string> = {
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
