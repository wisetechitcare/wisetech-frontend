import React from "react";
import { Close } from "@mui/icons-material";
import { WtButton } from "./buttons";

/**
 * The "Clear Filters" trigger every filter toolbar shows once something is narrowed.
 * One component so the text, icon and weight are identical wherever a list has filters.
 */
export const ClearFiltersButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <WtButton
    tone="primary"
    size="small"
    ghost
    onClick={onClick}
    disabled={disabled}
    startIcon={<Close sx={{ fontSize: 15 }} />}
    sx={{ minHeight: 30, px: 1, fontSize: 12.5, fontWeight: 600, borderRadius: "8px", whiteSpace: "nowrap" }}
  >
    Clear Filters
  </WtButton>
);
