import React from "react";
import { Avatar, Box, Tooltip, Typography } from "@mui/material";

/**
 * Premium, reusable employee identity cell — an initials (or photo) avatar with
 * the employee's name and a subtle code chip. Deterministic avatar tint per
 * employee (stable across renders) gives the roster a scannable, professional
 * feel without a hardcoded color per row.
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

// Brand-adjacent, accessible tint palette (soft bg + readable fg). Chosen to sit
// calmly next to the app's #1E3A8A brand rather than compete with status colors.
const AVATAR_TINTS: Array<{ bg: string; fg: string }> = [
  { bg: "#E9EEF8", fg: "#1E3A8A" }, // brand blue
  { bg: "#EBF4EF", fg: "#2F7D5F" }, // green
  { bg: "#EDEEF6", fg: "#46499B" }, // indigo
  { bg: "#E9F2F4", fg: "#2C7385" }, // cyan
  { bg: "#FAF1E3", fg: "#A66A2A" }, // amber
  { bg: "#F6ECF4", fg: "#8A3D77" }, // plum
  { bg: "#EEF1F4", fg: "#5A6573" }, // neutral
];

/** Stable index from a string so the same employee always gets the same tint. */
function tintFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length];
}

/** "Aabid Patel" -> "AP". Exported so card/tile layouts render the same fallback
 *  avatar as the table cell instead of re-deriving it. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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
  const tint = tintFor(code || safeName);
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
      <Box sx={{ position: "relative", flexShrink: 0, display: "inline-flex" }}>
        <Avatar
          src={avatarUrl || undefined}
          alt={safeName}
          sx={{
            width: size,
            height: size,
            flexShrink: 0,
            bgcolor: tint.bg,
            color: tint.fg,
            fontSize: dense ? "0.72rem" : "0.8rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
            border: "1px solid rgba(16,24,40,0.06)",
          }}
        >
          {initialsOf(safeName)}
        </Avatar>
        {status && (
          <Box
            component="span"
            role="img"
            aria-label={status === "active" ? "Active" : "Inactive"}
            title={status === "active" ? "Active" : "Inactive"}
            sx={{
              position: "absolute",
              right: -1,
              bottom: -1,
              width: dense ? 8 : 10,
              height: dense ? 8 : 10,
              borderRadius: "50%",
              // Border is the paper colour so the dot reads as cut out of the
              // avatar in BOTH themes — a hardcoded #fff ring goes wrong in dark.
              border: 2,
              borderColor: "background.paper",
              bgcolor: status === "active" ? "success.main" : "text.disabled",
            }}
          />
        )}
      </Box>

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
