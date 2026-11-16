import React from "react";
import { Box, Tooltip } from "@mui/material";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import type { BillingTrackerRow } from "@services/billingTrackers";
import { BillingSolidChip } from "../components";

/**
 * The Billing Tracker's Bill Stage. Read-only: it follows the project's proformas and tax invoices
 * (`syncBillStageFromDocument` on the server). Wording and colour come from Billing → Configure.
 */
export const TrackerStatusCell: React.FC<{ row: BillingTrackerRow }> = ({ row }) => (
  <Tooltip title="Follows this project's latest proforma / tax invoice." placement="top">
    <Box sx={{ width: "fit-content", mx: "auto", lineHeight: 0 }}>
      {row.status ? <BillingSolidChip code={row.status} /> : <SolidChip label="Not billed" />}
    </Box>
  </Tooltip>
);
