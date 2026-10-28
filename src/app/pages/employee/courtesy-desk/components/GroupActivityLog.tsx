import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  AppIcon,
  TRIO,
  WtButton,
  WtEmptyState,
  WtSheet,
} from "@app/modules/common/components/ui";
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
  return (
    <Stack spacing={0} role="list">
      {activity.map((entry, index) => {
        const who = entry.actorName?.trim() || "Someone";
        const isLast = index === activity.length - 1;
        return (
          <Stack
            key={entry.id}
            direction="row"
            spacing={1.25}
            role="listitem"
            sx={{ minHeight: 64 }}
          >
            <Stack alignItems="center" sx={{ width: 36, flexShrink: 0 }}>
              <Avatar
                src={entry.actorAvatar || undefined}
                alt={who}
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: 12,
                  fontWeight: 700,
                  bgcolor: "primary.main",
                }}
              >
                {initials(who)}
              </Avatar>
              {!isLast ? (
                <Box
                  sx={{
                    flex: 1,
                    width: 2,
                    bgcolor: "divider",
                    my: 0.35,
                    borderRadius: 1,
                  }}
                />
              ) : null}
            </Stack>
            <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 1.75 }}>
              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 750,
                  lineHeight: 1.3,
                  color: "text.primary",
                }}
              >
                {who}
              </Typography>
              <Typography
                sx={{
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "text.secondary",
                  wordBreak: "break-word",
                  mt: 0.2,
                }}
              >
                {entry.message}
              </Typography>
              <Typography
                sx={{ fontSize: 11.5, color: "text.disabled", mt: 0.4 }}
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
  const [loadError, setLoadError] = useState(false);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true);
      setLoadError(false);
      try {
        const fetch = kind === "group" ? fetchGroupActivity : fetchDriveActivity;
        const res = await fetch(id, nextPage, PAGE_SIZE);
        setRows((previous) =>
          append ? [...previous, ...res.activity] : res.activity,
        );
        setPage(res.page);
        setTotal(res.total);
        setHasMore(res.hasMore);
      } catch {
        setLoadError(true);
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
    if (open) void loadPage(1, false);
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

      <WtSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Activity history"
        description={
          loading && !rows.length
            ? "Loading activity…"
            : `${total.toLocaleString()} ${total === 1 ? "event" : "events"}`
        }
        icon="time"
        tone={TRIO.blue}
        footer={
          hasMore ? (
            <WtButton
              ghost
              fullWidth
              disabled={loading}
              onClick={() => void loadPage(page + 1, true)}
            >
              {loading ? "Loading…" : "Load older activity"}
            </WtButton>
          ) : undefined
        }
      >
        {loading && !rows.length ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : loadError && !rows.length ? (
          <WtEmptyState
            dense
            variant="error"
            title="History could not be loaded"
            hint="Check your connection and try again."
            actionLabel="Try again"
            onAction={() => void loadPage(1, false)}
          />
        ) : rows.length ? (
          <HistoryTimeline activity={rows} />
        ) : (
          <WtEmptyState
            dense
            title="No activity yet"
            hint="Updates to this item will appear here."
            icon="time"
          />
        )}
      </WtSheet>
    </>
  );
}
