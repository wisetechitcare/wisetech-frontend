import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { GlassCard, ToneChip, type Trio } from "@app/modules/common/components/ui";
import BillingPageHeader from "./BillingPageHeader";
import { BillingStatusBadge } from "./BillingPrimitives";

/**
 * A financial-document module that is scaffolded but not yet implemented.
 *
 * Shows the REAL shape the page will take — its columns and its status lifecycle — over
 * an explicit "not implemented" state, rather than a table of invented rows. Fake data on
 * a finance screen is worse than no data: it gets screenshotted, quoted and believed.
 *
 * When the module lands, replace the page's body with a `<BillingTable>` using these same
 * columns; nothing else about the route, tab or layout changes.
 */
const BillingDocumentPlaceholder: React.FC<{
  title: string;
  description: string;
  icon: string;
  trio?: Trio;
  columns: string[];
  statuses: string[];
  /** What has to exist before this module can do its job. */
  dependsOn?: string;
}> = ({ title, description, icon, trio, columns, statuses, dependsOn }) => (
  <Box sx={{ maxWidth: 1600, mx: "auto", pb: 4 }}>
    <BillingPageHeader title={title} description={description} icon={icon} trio={trio} />

    <GlassCard preset="section" sx={{ p: 0, overflow: "hidden", mb: 1.25 }}>
      {/* The column header the finished table will have, rendered live so the layout is
          reviewable now. */}
      <Box sx={{ overflowX: "auto" }}>
        <Stack
          direction="row"
          sx={{
            minWidth: 700, px: 1.5, py: 1,
            borderBottom: "1px solid", borderColor: "divider", bgcolor: "action.hover",
            fontSize: 11, fontWeight: 700, color: "text.secondary",
            textTransform: "uppercase", letterSpacing: 0.4,
          }}
        >
          {columns.map((c) => (
            <Box key={c} sx={{ flex: 1, minWidth: 110, pr: 1 }}>{c}</Box>
          ))}
        </Stack>
      </Box>

      <Stack alignItems="center" spacing={1} sx={{ py: { xs: 4, sm: 6 }, px: 2, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Not implemented yet</Typography>
        <Typography sx={{ fontSize: 13, color: "text.secondary", maxWidth: 520 }}>
          {dependsOn ?? "This module is scaffolded — routing, layout and navigation are in place."}
        </Typography>
      </Stack>
    </GlassCard>

    <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: "text.secondary", mb: 1 }}>
        Status lifecycle
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
        {statuses.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <Typography sx={{ color: "text.disabled", fontSize: 12 }}>→</Typography>}
            {/* Unknown statuses fall back to a neutral chip rather than throwing. */}
            <BillingStatusBadge status={s} />
          </React.Fragment>
        ))}
      </Stack>
      <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 1 }}>
        These map to <ToneChip tone="neutral" label="BILLING_STATUS_TONES" dense /> so a status
        keeps the same colour on every Billing screen.
      </Typography>
    </GlassCard>
  </Box>
);

export default BillingDocumentPlaceholder;
