import React from "react";
import { Box, type Theme } from "@mui/material";

/**
 * How a lead looks in a table. Shared by Leads Management and the Lead Reference tab
 * (Company and Contact), so a lead reads the same wherever it is listed — the two had
 * drifted into different pills, row heights and date formats.
 */

type Status = { name?: string; color?: string | null } | null | undefined;

export const LeadStatusPill: React.FC<{ status: Status }> = ({ status }) =>
  status?.name ? (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        bgcolor: status.color || "grey.600",
        borderRadius: "16px",
        padding: "4px 10px 4px 8px",
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "common.white" }} />
      <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: "common.white" }}>
        {status.name}
      </Box>
    </Box>
  ) : (
    <>N/A</>
  );

/** Table-level sx: exact column `size`s, 4px gaps between the rounded rows. */
export const leadTableSx = {
  borderCollapse: "separate",
  borderSpacing: "0 4px !important",
  tableLayout: "fixed",
  width: "max-content",
};

/** Row sx: tinted by status, lifts on hover with a status-coloured left edge. */
export const leadRowSx = (color?: string | null) => {
  const hover = (t: Theme) => `${t.palette.background.default} !important`;
  return {
    cursor: "pointer",
    backgroundColor: color ? `${color}20` : undefined,
    transition: "all 0.2s ease",
    "& .MuiTableCell-root": {
      fontSize: "15.5px",
      fontFamily: "Inter",
      fontWeight: "500",
      padding: "4px 8px !important",
      border: "none",
      color: "#333",
      whiteSpace: "nowrap",
    },
    "& .MuiTableCell-root:first-of-type": {
      borderTopLeftRadius: "12px",
      borderBottomLeftRadius: "12px",
      borderLeft: "3px solid transparent !important",
      transition: "border-color 0.2s ease-in-out !important",
    },
    "& .MuiTableCell-root:last-of-type": {
      borderTopRightRadius: "12px",
      borderBottomRightRadius: "12px",
    },
    "&:hover": {
      backgroundColor: hover,
      transform: "translateY(-2px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      "& .MuiTableCell-root": { backgroundColor: hover },
      "& .MuiTableCell-root:first-of-type": {
        borderLeftColor: `${color || "#1E3A8A"} !important`,
      },
    },
  };
};

/** Leads created before organizations existed have none. */
export const UNASSIGNED_ORG_LABEL = "Unassigned";
