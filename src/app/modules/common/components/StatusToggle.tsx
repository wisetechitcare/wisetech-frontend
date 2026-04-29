import { FC } from "react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

type StatusType = "all" | "active" | "inactive";

interface StatusCounts {
  all: number;
  active: number;
  inactive: number;
}

interface StatusToggleProps {
  selectedStatus: StatusType;
  onStatusChange: (status: StatusType) => void;
  counts?: StatusCounts;
}

const StatusToggle: FC<StatusToggleProps> = ({ selectedStatus, onStatusChange, counts }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleChange = (
    event: React.MouseEvent<HTMLElement> | any,
    newStatus: string
  ) => {
    if (!newStatus) return;
    onStatusChange(newStatus as StatusType);
  };

  return (
    <>
      {isMobile ? (
        <Select
          value={selectedStatus}
          onChange={(e) => handleChange(e as any, e.target.value)}
          fullWidth
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
              borderColor: "#9D4141 !important",
              color: "#9D4141 !important",
            },
            "& .MuiToggleButton-root:hover": {
              borderColor: "#9D4141 !important",
              color: "#9D4141 !important",
            },
          }}
        >
          <MenuItem value="all">All {counts ? `(${counts.all})` : ""}</MenuItem>
          <MenuItem value="active">Active {counts ? `(${counts.active})` : ""}</MenuItem>
          <MenuItem value="inactive">Inactive {counts ? `(${counts.inactive})` : ""}</MenuItem>
        </Select>
      ) : (
        <ToggleButtonGroup
          value={selectedStatus}
          exclusive
          onChange={handleChange}
          aria-label="employee status filter"
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "start",
            width: "100%",
            "& .MuiToggleButton-root": {
              borderRadius: "20px",
              borderColor: "#A0B4D2 !important",
              color: "#000000 !important",
              paddingX: {
                xs: "16px",
                md: "24px",
              },
              borderWidth: "2px",
              fontWeight: "600",
              whiteSpace: "nowrap",
              fontSize: {
                xs: "10px",
                sm: "12px",
              },
              height: { xs: "30px", sm: "36px" },
              fontFamily: "Inter",
            },
            "& .Mui-selected": {
              borderColor: "#9D4141 !important",
              color: "#9D4141 !important",
            },
            "& .MuiToggleButton-root:hover": {
              borderColor: "#9D4141 !important",
              color: "#9D4141 !important",
            },
          }}
        >
          <ToggleButton value="all">All {counts ? `(${counts.all})` : ""}</ToggleButton>
          <ToggleButton value="active">Active {counts ? `(${counts.active})` : ""}</ToggleButton>
          <ToggleButton value="inactive">Inactive {counts ? `(${counts.inactive})` : ""}</ToggleButton>
        </ToggleButtonGroup>
      )}
    </>
  );
};

export default StatusToggle;
