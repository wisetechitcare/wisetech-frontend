import React from "react";
import { Box, Tooltip, Typography } from "@mui/material";
import { SmartAvatar, avatarInitials } from "@/ds/ui/smart-avatar";

/**
 * Premium, reusable employee identity cell — the kit SmartAvatar (photo, else
 * initials on a stable gradient) with the employee's name and a subtle code chip.
 *
 * Drop-in for any table/list that shows an employee: attendance, leave, salary,
 * approvals. Presentational only — no data fetching.
 */
export interface EmployeeIdentityCellProps {
  name: string;
  /**
   * Employee code, e.g. "WT-104". Rendered as a subtle chip — on its own line
   * under the name, or INLINE beside the name when `subtitle` is also given.
   */
  code?: string | null;
  /** Optional avatar image URL; falls back to initials when absent/broken. */
  avatarUrl?: string | null;
  /** Optional secondary line (role/designation). Combines with `code`. */
  subtitle?: string | null;
  /** Compact mode: smaller avatar + tighter spacing (dense tables). */
  dense?: boolean;
  /**
   * Employment status, shown as a dot on the avatar. Carries a title +
   * aria-label because colour alone fails WCAG 1.4.1 — a red/green dot is
   * invisible to the ~8% of men with red-green colour blindness.
   */
  status?: "active" | "inactive" | null;
  /**
   * Let the text block use all available width instead of the fixed px caps
   * that keep table cells from stretching. Set this in card/grid layouts, where
   * the container already bounds the width and capping just truncates early.
   */
  fluid?: boolean;
}

/** "Aabid Patel" -> "AP". The kit's one initials rule, re-exported for existing importers. */
export const initialsOf = avatarInitials;

const EmployeeIdentityCell: React.FC<EmployeeIdentityCellProps> = ({
  name,
  code,
  avatarUrl,
  subtitle,
  dense = false,
  fluid = false,
  status = null,
}) => {
  const safeName = (name || "").trim() || "Unknown";
  const size = dense ? 30 : 36;
  // Fixed caps stop a table cell stretching; in a card the container already
  // bounds the width, so capping there truncates names that would have fit.
  const textMaxWidth = fluid ? "100%" : { xs: 120, sm: 160, md: 200 };
  // Code sits inline with the name only when a subtitle takes the second line.
  const codeChip = code ? (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        flexShrink: 0,
        px: 0.75,
        py: 0.1,
        fontSize: "0.66rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        // Theme tokens, not fixed greys — a hardcoded #F2F4F7 chip stays light-on-light in dark mode.
        color: "text.secondary",
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
        borderRadius: "6px",
        lineHeight: 1.5,
      }}
    >
      {code}
    </Box>
  ) : null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: dense ? 1 : 1.25,
        minWidth: 0,
        ...(fluid && { width: "100%" }),
      }}
    >
      {/* The name is written beside it, so the avatar is decorative unless it carries a status to announce. */}
      <SmartAvatar
        name={safeName}
        seed={code || safeName}
        src={avatarUrl}
        size={size}
        status={status}
        decorative={!status}
      />

      <Box sx={{ minWidth: 0, lineHeight: 1.3, ...(fluid && { flex: 1 }) }}>
        {/* Name row — the code rides alongside it when a subtitle owns line 2,
            so the identity stays two tight lines instead of three loose ones. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}>
          <Tooltip title={safeName} enterDelay={600} placement="top-start">
            <Typography
              component="div"
              sx={{
                fontWeight: 650,
                fontSize: dense ? "0.82rem" : "0.875rem",
                color: "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: textMaxWidth,
                ...(fluid && { minWidth: 0 }),
              }}
            >
              {safeName}
            </Typography>
          </Tooltip>
          {subtitle && codeChip}
        </Box>

        {subtitle ? (
          <Typography
            component="div"
            sx={{
              fontSize: "0.72rem",
              color: "text.secondary",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: textMaxWidth,
              mt: 0.15,
            }}
          >
            {subtitle}
          </Typography>
        ) : codeChip ? (
          <Box sx={{ mt: 0.35 }}>{codeChip}</Box>
        ) : null}
      </Box>
    </Box>
  );
};

export default React.memo(EmployeeIdentityCell);
