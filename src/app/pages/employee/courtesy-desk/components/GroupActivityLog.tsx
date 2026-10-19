import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { AppIcon } from "@app/modules/common/components/ui/AppIcon";
import { formatDateTime } from "@utils/dateFormats";
import { fetchDriveActivity, fetchGroupActivity } from "@services/gifts";
import type { GroupActivity } from "../types";

const PAGE_SIZE = 20;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function HistoryTimeline({ activity }: { activity: GroupActivity[] }) {
  if (!activity.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No activity yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={0}>
      {activity.map((entry, index) => {
        const who = entry.actorName?.trim() || "Someone";
        const isLast = index === activity.length - 1;
        return (
          <Stack
            key={entry.id}
            direction="row"
            spacing={1.25}
            sx={{ minHeight: 56 }}
          >
            <Stack alignItems="center" sx={{ width: 36, flexShrink: 0 }}>
              <Avatar
                src={entry.actorAvatar || undefined}
                alt={who}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: "primary.main",
                }}
              >
                {initials(who)}
              </Avatar>
              {!isLast && (
                <Box
                  sx={{
                    flex: 1,
                    width: 2,
                    bgcolor: "divider",
                    my: 0.35,
                    borderRadius: 1,
                  }}
                />
              )}
            </Stack>
            <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.5 }}>
              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: "text.primary",
                }}
              >
                {who}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "text.secondary",
                  wordBreak: "break-word",
                  mt: 0.15,
                }}
              >
                {entry.message}
              </Typography>
              <Typography
                sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.35 }}
              >
                {formatDateTime(entry.createdAt)}
              </Typography>
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

/** History opens on demand (drawer) — not always on the page. */
export default function GiftHistoryButton({
  kind,
  id,
  label = "History",
}: {
  kind: "group" | "drive";
  id: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<GroupActivity[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);
      try {
        const fetch =
          kind === "group" ? fetchGroupActivity : fetchDriveActivity;
        const res = await fetch(id, nextPage, PAGE_SIZE);
        setRows((prev) =>
          append ? [...prev, ...res.activity] : res.activity,
        );
        setPage(res.page);
        setTotal(res.total);
        setHasMore(res.hasMore);
      } catch {
        if (!append) {
          setRows([]);
          setTotal(0);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [id, kind],
  );

  useEffect(() => {
    if (!open) return;
    void loadPage(1, false);
  }, [open, loadPage]);

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<AppIcon name="bi-clock-history" />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 380 },
            p: 0,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
              History
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {total} {total === 1 ? "event" : "events"}
            </Typography>
          </Box>
          <IconButton
            aria-label="Close history"
            onClick={() => setOpen(false)}
            size="small"
          >
            <AppIcon name="bi-x-lg" />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
          {loading && !rows.length ? (
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          ) : (
            <HistoryTimeline activity={rows} />
          )}
        </Box>

        {hasMore ? (
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Button
              fullWidth
              variant="outlined"
              disabled={loading}
              onClick={() => void loadPage(page + 1, true)}
            >
              {loading ? "Loading…" : "Load older"}
            </Button>
          </Box>
        ) : null}
      </Drawer>
    </>
  );
}
