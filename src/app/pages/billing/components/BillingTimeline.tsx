import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { formatDateTime } from "@utils/dateFormats";

/**
 * The financial life of one thing — request raised → approved → proforma → payment →
 * invoice — as a vertical timeline.
 *
 * Purely presentational and document-agnostic: the caller supplies the steps. That is
 * what lets Projects render a billing timeline by READING Billing data, without owning
 * or duplicating any of it.
 */

export type BillingTimelineState = "done" | "current" | "upcoming" | "failed";

export interface BillingTimelineStep {
  key: string;
  label: string;
  state: BillingTimelineState;
  /** ISO timestamp; rendered in the company date format when present. */
  at?: string | null;
  detail?: string | null;
}

const STATE_STYLE: Record<BillingTimelineState, { color: string; icon: string }> = {
  done: { color: "#12805C", icon: "check" },
  current: { color: "#1E3A8A", icon: "time" },
  upcoming: { color: "#9AA4B2", icon: "abstract-8" },
  failed: { color: "#C0392B", icon: "cross" },
};

const BillingTimeline: React.FC<{ steps: BillingTimelineStep[]; dense?: boolean }> = ({
  steps, dense = false,
}) => (
  <Stack spacing={0}>
    {steps.map((step, index) => {
      const style = STATE_STYLE[step.state];
      const isLast = index === steps.length - 1;
      return (
        <Stack key={step.key} direction="row" spacing={1.25} sx={{ minHeight: dense ? 46 : 56 }}>
          {/* Rail: marker + connector. The connector is skipped on the last step so the
              line ends at the final marker rather than trailing into nothing. */}
          <Stack alignItems="center" sx={{ width: 26, flexShrink: 0 }}>
            <Box
              sx={{
                width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center",
                bgcolor: step.state === "upcoming" ? "action.selected" : style.color,
                color: step.state === "upcoming" ? "text.disabled" : "#fff",
                flexShrink: 0,
              }}
            >
              <KTIcon iconName={style.icon} className="fs-8" />
            </Box>
            {!isLast && (
              <Box sx={{ flex: 1, width: 2, bgcolor: "divider", my: 0.25, borderRadius: 1 }} />
            )}
          </Stack>

          <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.25 }}>
            <Typography
              sx={{
                fontSize: 13, lineHeight: 1.35, wordBreak: "break-word",
                fontWeight: step.state === "current" ? 700 : 600,
                color: step.state === "upcoming" ? "text.disabled" : "text.primary",
              }}
            >
              {step.label}
            </Typography>
            {(step.at || step.detail) && (
              <Typography sx={{ fontSize: 11.5, color: "text.secondary", mt: 0.15 }}>
                {step.at ? formatDateTime(step.at) : ""}
                {step.at && step.detail ? " · " : ""}
                {step.detail ?? ""}
              </Typography>
            )}
          </Box>
        </Stack>
      );
    })}
  </Stack>
);

export default BillingTimeline;
