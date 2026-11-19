import React from "react";
import { Box, CircularProgress, Skeleton, Stack, Typography } from "@mui/material";
import { GlassCard, IconBox, TRIO, type Trio } from "@app/modules/common/components/ui";

export interface BillingStatsCardProps {
  label: string;
  value: React.ReactNode;
  /** A keenicon name, or a node — pass `<CurrencySymbol />` for a money tile. */
  icon: React.ReactNode;
  trio?: Trio;
  /** Small muted line under the value — a period, a comparison, a hint. */
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
  /** The tile is the filter currently applied: outlined in its own colour. */
  active?: boolean;
}

export const BillingStatsCard: React.FC<BillingStatsCardProps> = ({
  label, value, icon, trio = TRIO.blue, hint, loading, onClick, active,
}) => (
  <GlassCard
    preset="section"
    onClick={onClick}
    sx={{
      p: { xs: 1.5, sm: 1.75 },
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .15s, transform .15s, box-shadow .15s",
      ...(active ? { borderColor: trio.c, boxShadow: `0 0 0 1.5px ${trio.c}` } : {}),
      ...(onClick ? { "&:hover": { transform: "translateY(-2px)" } } : {}),
    }}
  >
    <Stack direction="row" alignItems="flex-start" spacing={1.25}>
      <IconBox icon={icon} trio={trio} size={38} fs="fs-3" />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={90} height={30} />
        ) : (
          <Typography sx={{ fontSize: { xs: 19, sm: 21 }, fontWeight: 700, lineHeight: 1.2, mt: 0.25, wordBreak: "break-word" }}>
            {value}
          </Typography>
        )}
        {hint && (
          <Typography sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.25 }}>{hint}</Typography>
        )}
      </Box>
    </Stack>
  </GlassCard>
);

/** Row skeletons keep the page's shape while loading, so content does not jump when it arrives. */
export const BillingLoadingState: React.FC<{ rows?: number; variant?: "spinner" | "rows" }> = ({
  rows = 4, variant = "rows",
}) => {
  if (variant === "spinner") {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>;
  }
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={62} sx={{ borderRadius: "12px" }} />
      ))}
    </Stack>
  );
};
