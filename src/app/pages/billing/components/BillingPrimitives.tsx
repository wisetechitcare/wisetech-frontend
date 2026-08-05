import React from "react";
import { Box, CircularProgress, Skeleton, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import {
  GlassCard, IconBox, ToneChip, WtButton, TRIO, type Trio, type SemanticTone,
} from "@app/modules/common/components/ui";

/**
 * Billing module primitives.
 *
 * Thin compositions of the shared UI kit — they exist to keep every Billing screen
 * identical, NOT to introduce a second visual language. If a Billing screen needs
 * something that isn't here, add it here rather than styling it in the page.
 */

// ─── BillingStatsCard ────────────────────────────────────────────────────────

export interface BillingStatsCardProps {
  label: string;
  value: React.ReactNode;
  icon: string;
  trio?: Trio;
  /** Small muted line under the value — a period, a comparison, a hint. */
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
}

export const BillingStatsCard: React.FC<BillingStatsCardProps> = ({
  label, value, icon, trio = TRIO.blue, hint, loading, onClick,
}) => (
  <GlassCard
    preset="section"
    onClick={onClick}
    sx={{
      p: { xs: 1.5, sm: 1.75 },
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "border-color .15s, transform .15s",
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

// ─── BillingStatusBadge ──────────────────────────────────────────────────────

/** Every Billing status across every document type maps to a tone here, so a status
 *  never means one colour on one screen and another elsewhere. */
export const BILLING_STATUS_TONES: Record<string, SemanticTone> = {
  // Billing request
  DRAFT: "neutral",
  SUBMITTED: "indigo",
  PENDING_APPROVAL: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  READY_FOR_PROFORMA: "cyan",
  // Deprecated alias for READY_FOR_PROFORMA — same tone so old rows read identically.
  SENT_TO_ACCOUNTS: "cyan",
  PROFORMA_GENERATED: "success",
  // Proforma
  GENERATED: "indigo",
  SENT: "cyan",
  VIEWED: "cyan",
  PAYMENT_PENDING: "warning",
  PAID: "success",
  CONVERTED: "success",
  // Invoice / payment
  ARCHIVED: "neutral",
  FAILED: "danger",
  PENDING: "warning",
};

const humanise = (status: string) =>
  status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export const BillingStatusBadge: React.FC<{ status?: string | null; dense?: boolean }> = ({
  status, dense = true,
}) => {
  if (!status) return null;
  const tone = BILLING_STATUS_TONES[status] ?? "neutral";
  return <ToneChip tone={tone} label={humanise(status)} dense={dense} />;
};

// ─── BillingEmptyState ───────────────────────────────────────────────────────

export const BillingEmptyState: React.FC<{
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, icon = "information-5", actionLabel, onAction }) => (
  <GlassCard preset="section" sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
    <Stack alignItems="center" spacing={1}>
      <IconBox icon={icon} trio={TRIO.blue} size={48} fs="fs-2x" />
      <Typography sx={{ fontWeight: 700, fontSize: 15.5, mt: 0.5 }}>{title}</Typography>
      {description && (
        <Typography sx={{ fontSize: 13, color: "text.secondary", maxWidth: 460 }}>{description}</Typography>
      )}
      {actionLabel && onAction && (
        <WtButton
          tone="primary"
          size="small"
          onClick={onAction}
          startIcon={<KTIcon iconName="plus" className="fs-6" />}
          sx={{ mt: 1, minHeight: 36, borderRadius: "10px", fontSize: 13 }}
        >
          {actionLabel}
        </WtButton>
      )}
    </Stack>
  </GlassCard>
);

// ─── BillingLoadingState ─────────────────────────────────────────────────────

export const BillingLoadingState: React.FC<{ rows?: number; variant?: "spinner" | "rows" }> = ({
  rows = 4, variant = "rows",
}) => {
  if (variant === "spinner") {
    return <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress size={28} /></Stack>;
  }
  // Row skeletons rather than a spinner: the page keeps its shape while loading, so
  // content does not jump when it arrives.
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={62} sx={{ borderRadius: "12px" }} />
      ))}
    </Stack>
  );
};

// ─── BillingSummaryCard ──────────────────────────────────────────────────────

export interface BillingSummaryRow {
  label: string;
  value: React.ReactNode;
}

/** A titled card of label/value rows — the read-only shape Projects use to *consume*
 *  Billing data without owning any of it. */
export const BillingSummaryCard: React.FC<{
  title: string;
  icon?: string;
  trio?: Trio;
  rows: BillingSummaryRow[];
  action?: React.ReactNode;
}> = ({ title, icon = "dollar", trio = TRIO.green, rows, action }) => (
  <GlassCard preset="section" sx={{ p: { xs: 1.5, sm: 2 } }}>
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
      <IconBox icon={icon} trio={trio} size={34} fs="fs-4" />
      <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14.5 }}>{title}</Typography>
      {action}
    </Stack>
    <Stack spacing={0.75}>
      {rows.map((row) => (
        <Stack key={row.label} direction="row" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>{row.label}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, textAlign: "right", minWidth: 0, wordBreak: "break-word" }}>
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  </GlassCard>
);
