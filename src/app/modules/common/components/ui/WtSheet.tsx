import { useId, type ReactNode } from "react";
import { Box, Drawer, Stack, Typography } from "@mui/material";
import ActionIconButton from "./ActionIconButton";
import { AppIcon } from "./AppIcon";
import { IconBox, TRIO, type Trio } from "./patterns";

export interface WtSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  icon?: string;
  tone?: Trio;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

/** Responsive right-side workspace for filters, history, and other supporting tasks. */
export function WtSheet({
  open,
  onClose,
  title,
  description,
  icon,
  tone = TRIO.blue,
  children,
  footer,
  width = 420,
}: WtSheetProps) {
  const titleId = useId();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        role: "dialog",
        "aria-modal": true,
        "aria-labelledby": titleId,
        sx: {
          width: { xs: "100%", sm: `min(92vw, ${width}px)` },
          bgcolor: "background.default",
          backgroundImage: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        {icon ? <IconBox icon={icon} trio={tone} size={42} fs="fs-2" /> : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} sx={{ fontSize: 17, fontWeight: 800 }}>
            {title}
          </Typography>
          {description ? (
            <Typography
              component="div"
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.2 }}
            >
              {description}
            </Typography>
          ) : null}
        </Box>
        <ActionIconButton
          icon={<AppIcon name="bi-x-lg" />}
          title={`Close ${title.toLowerCase()}`}
          size="sm"
          onClick={onClose}
        />
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          px: { xs: 1.5, sm: 2.5 },
          py: 2,
        }}
      >
        {children}
      </Box>

      {footer ? (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          {footer}
        </Box>
      ) : null}
    </Drawer>
  );
}

export default WtSheet;
