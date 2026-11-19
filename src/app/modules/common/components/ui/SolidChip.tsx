import React from "react";
import { Box, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";

/** Grey for a chip with no value ("Not billed"), so an empty cell still reads as a chip. */
const EMPTY_CHIP = "#94A3B8";

/**
 * Solid colour, white dot, white label, 6px corners — the workflow chip the trackers, the Leads / Projects tables
 * and the Courtesy Desk share, so every workflow column reads as one set.
 */
export const SolidChip: React.FC<{ label: string; color?: string | null; dropdown?: boolean }> = ({
  label, color, dropdown,
}) => (
  <Box sx={{
    display: "inline-flex", alignItems: "center", gap: "6px",
    backgroundColor: color || EMPTY_CHIP,
    borderRadius: "6px", padding: dropdown ? "4px 6px 4px 8px" : "4px 10px 4px 8px", whiteSpace: "nowrap",
  }}>
    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "common.white", flexShrink: 0 }} />
    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "common.white" }}>{label}</Typography>
    {dropdown && <KTIcon iconName="down" className="fs-8 text-white" />}
  </Box>
);
