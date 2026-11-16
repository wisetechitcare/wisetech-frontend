import type { ReactNode } from "react";
import { Avatar, Box, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { TRIO } from "@app/modules/common/components/ui/patterns";
import { WtIconButton } from '@app/modules/common/components/ui/buttons';

export default function PeopleGroupHeader({
  title,
  memberLabel,
  mixedHint,
  previewNames,
  onBack,
  mobileTrailing,
  desktopActions,
}: {
  title: string;
  memberLabel: string;
  mixedHint?: string;
  previewNames?: string;
  onBack: () => void;
  /** Icon-only actions for phone / small tablet (WhatsApp-style). */
  mobileTrailing?: ReactNode;
  /** Full labeled buttons for md+. */
  desktopActions?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 0.75, sm: 1.5, md: 2.5 },
        py: { xs: 1, md: 1.75 },
        mb: { xs: 1.75, md: 2.5 },
        borderRadius: { xs: 0, sm: 2 },
        mx: { xs: -1.5, sm: 0 },
        borderLeft: { xs: "none", sm: undefined },
        borderRight: { xs: "none", sm: undefined },
        borderTop: { xs: "none", sm: undefined },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, md: 1.5 }}
        sx={{ width: "100%", minWidth: 0 }}
      >
        {/* WhatsApp-style back — icon only on small screens */}
        <WtIconButton
          onClick={onBack}
          aria-label="Back"
          size="small"
          sx={{
            display: { xs: "inline-flex", md: "none" },
            flexShrink: 0,
            color: "text.primary",
          }}
        >
          <AppIcon name="bi-chevron-left" className="fs-2" />
        </WtIconButton>

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 1.1, md: 1.5 }}
          sx={{ minWidth: 0, flex: 1 }}
        >
          <Avatar
            sx={{
              width: { xs: 40, md: 52 },
              height: { xs: 40, md: 52 },
              bgcolor: alpha(
                TRIO.blue.c,
                theme.palette.mode === "dark" ? 0.28 : 0.14,
              ),
              color: TRIO.blue.c,
              flexShrink: 0,
            }}
          >
            <AppIcon name="bi-people" className="fs-2" />
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                fontSize: { xs: "1.05rem", sm: "1.25rem", md: "1.5rem" },
                lineHeight: 1.25,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </Typography>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ mt: 0.15, color: "text.secondary", minWidth: 0 }}
            >
              <Box sx={{ display: { xs: "none", sm: "inline-flex" } }}>
                <AppIcon name="bi-people" className="fs-7" />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: { xs: 12.5, md: 14 },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {memberLabel}
                {mixedHint ? ` · ${mixedHint}` : ""}
              </Typography>
            </Stack>
            {previewNames ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  mt: 0.15,
                  display: { xs: "none", sm: "block" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {previewNames}
              </Typography>
            ) : null}
          </Box>
        </Stack>

        {/* Mobile / tablet icon actions */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.25}
          sx={{ display: { xs: "flex", md: "none" }, flexShrink: 0 }}
        >
          {mobileTrailing}
        </Stack>

        {/* Desktop labeled actions */}
        <Box
          sx={{
            display: { xs: "none", md: "flex" },
            flexShrink: 0,
          }}
        >
          {desktopActions}
        </Box>
      </Stack>
    </Paper>
  );
}
