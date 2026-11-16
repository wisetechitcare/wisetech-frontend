import React from "react";
import { Box, ButtonBase, SwipeableDrawer, Typography, useMediaQuery, type SxProps, type Theme } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * ShadcnDrawer — the shadcn/ui Drawer layout, built on MUI so it needs no extra packages.
 *
 * Desktop: a floating panel inset from the right edge, fully rounded, over a blurred and
 * dimmed page. Phone: a bottom sheet with a drag handle, swiped down to close.
 * Anatomy: header (title + description) → scrolling body → footer (stacked pill buttons).
 *
 *   <ShadcnDrawer open onClose title="Pick a time" description="…"
 *     footer={<><ShadcnDrawerButton onClick={ok}>Confirm</ShadcnDrawerButton>
 *               <ShadcnDrawerButton variant="outline" onClick={close}>Cancel</ShadcnDrawerButton></>}>
 *     <ShadcnDrawerCard>…</ShadcnDrawerCard>
 *   </ShadcnDrawer>
 */
export interface ShadcnDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Pinned under the body — typically ShadcnDrawerButtons (primary first). */
  footer?: React.ReactNode;
  /** Desktop panel width in px. */
  width?: number;
  /** Stacking layer; raise it when the drawer opens from inside another modal. */
  zIndex?: number;
}

const RADIUS = 20;
const INSET = 12;

export function ShadcnDrawer({ open, onClose, title, description, children, footer, width = 440, zIndex }: ShadcnDrawerProps) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = React.useId();

  return (
    <SwipeableDrawer
      anchor={isPhone ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      onOpen={() => undefined}
      disableSwipeToOpen
      sx={zIndex === undefined ? undefined : { zIndex }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: alpha("#000", theme.palette.mode === "dark" ? 0.6 : 0.45),
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          },
        },
      }}
      PaperProps={{
        role: "dialog",
        "aria-labelledby": titleId,
        elevation: 0,
        sx: {
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.paper",
          backgroundImage: "none",
          border: 1,
          borderColor: "divider",
          boxShadow: `0 24px 64px ${alpha("#000", 0.35)}`,
          ...(isPhone
            ? { width: "100%", maxHeight: "88dvh", borderRadius: `${RADIUS}px ${RADIUS}px 0 0`, borderBottom: 0 }
            : {
                width: `min(${width}px, calc(100vw - ${INSET * 2}px))`,
                height: `calc(100% - ${INSET * 2}px)`,
                m: `${INSET}px`,
                borderRadius: `${RADIUS}px`,
              }),
        },
      }}
    >
      {isPhone && (
        <Box aria-hidden sx={{ display: "flex", justifyContent: "center", pt: 1.25 }}>
          <Box sx={{ width: 44, height: 5, borderRadius: 3, bgcolor: "divider" }} />
        </Box>
      )}
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Typography id={titleId} sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, color: "text.primary" }}>
          {title}
        </Typography>
        {description && (
          <Typography component="div" sx={{ mt: 0.5, fontSize: 13.5, lineHeight: 1.5, color: "text.secondary" }}>
            {description}
          </Typography>
        )}
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2.5, pb: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {children}
      </Box>
      {footer && (
        <Box sx={{ px: 2.5, pt: 1.5, pb: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
          {footer}
        </Box>
      )}
    </SwipeableDrawer>
  );
}

/** A rounded, bordered card for drawer content — the shadcn Field/option card. */
export function ShadcnDrawerCard({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box
      sx={[
        (theme) => ({
          p: 2,
          borderRadius: "14px",
          border: 1,
          borderColor: "divider",
          bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === "dark" ? 0.04 : 0.015),
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}

/** Full-width pill button: `primary` is solid (inverted text colour), `outline` is bordered. */
export function ShadcnDrawerButton({
  children, onClick, variant = "primary", disabled,
}: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "outline"; disabled?: boolean }) {
  return (
    <ButtonBase
      onClick={onClick}
      disabled={disabled}
      sx={(theme) => ({
        width: "100%",
        height: 40,
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "inherit",
        transition: "background-color .15s, border-color .15s, opacity .15s",
        "&.Mui-disabled": { opacity: 0.5 },
        "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
        ...(variant === "primary"
          ? {
              bgcolor: "text.primary",
              color: "background.paper",
              "&:hover": { bgcolor: alpha(theme.palette.text.primary, 0.85) },
            }
          : {
              border: 1,
              borderColor: "divider",
              color: "text.primary",
              bgcolor: "transparent",
              "&:hover": { bgcolor: "action.hover" },
            }),
      })}
    >
      {children}
    </ButtonBase>
  );
}

export default ShadcnDrawer;
