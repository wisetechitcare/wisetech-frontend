import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { IconBox, TRIO, type Trio } from "@app/modules/common/components/ui";

/**
 * The title block every Billing page opens with — icon, title, one-line description and
 * an optional action on the right. One component so the pages can't drift apart on
 * spacing and type scale.
 */
const BillingPageHeader: React.FC<{
  title: string;
  description?: string;
  icon: string;
  trio?: Trio;
  action?: React.ReactNode;
}> = ({ title, description, icon, trio = TRIO.blue, action }) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    alignItems={{ xs: "flex-start", sm: "center" }}
    spacing={1.25}
    sx={{ mb: 2 }}
  >
    <IconBox icon={icon} trio={trio} size={40} fs="fs-3" />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, sm: 17.5 }, lineHeight: 1.3 }}>
        {title}
      </Typography>
      {description && (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mt: 0.25 }}>{description}</Typography>
      )}
    </Box>
    {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
  </Stack>
);

export default BillingPageHeader;
