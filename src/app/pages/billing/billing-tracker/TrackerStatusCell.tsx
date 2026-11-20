import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ds/ui/tooltip";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";
import type { BillingTrackerRow } from "@services/billingTrackers";
import { BillingSolidChip } from "../components";

/**
 * The Billing Tracker's Bill Stage. Read-only: it follows the project's proformas and tax invoices
 * (`syncBillStageFromDocument` on the server). Wording and colour come from Billing → Configure.
 */
export const TrackerStatusCell: React.FC<{ row: BillingTrackerRow }> = ({ row }) => (
  <Tooltip>
    {/* `w-fit mx-auto` centres the chip in the cell and `leading-none` keeps the row's height to the
        chip itself — what the MUI Box did. The kit Tooltip is render-composed, so the span IS the
        trigger rather than a wrapper around one. `side="top"` is TooltipContent's default. */}
    <TooltipTrigger render={<span className="mx-auto block w-fit leading-none" />}>
      {row.status ? <BillingSolidChip code={row.status} /> : <SolidChip label="Not billed" />}
    </TooltipTrigger>
    <TooltipContent>Follows this project&apos;s latest proforma / tax invoice.</TooltipContent>
  </Tooltip>
);
