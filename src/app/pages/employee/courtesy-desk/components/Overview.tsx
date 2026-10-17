import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  LinearProgress,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import {
  GlassSurface,
  StatTile,
  TRIO,
} from "@app/modules/common/components/ui";
import PremiumButton from "@app/modules/common/components/PremiumButton";
import PeriodNavigator from "@app/modules/common/components/PeriodNavigator";
import { SolidChip } from "@app/pages/billing/operations/TrackerCells";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { formatFiscalYearLabel } from "@utils/fiscalYearHelper";
import { formatCurrencyCompact } from "@utils/currency";
import { useSensitiveData } from "@app/modules/common/components/SensitiveData";
import { GIFT_MANAGEMENT_BASE } from "../giftPaths";
import {
  getOverviewStats,
  getOverviewStatsFromApi,
  listGroups,
} from "../store/courtesyDeskStore";
import type { GiftsOverview } from "@services/gifts";
import { useCourtesyDesk } from "../hooks/useCourtesyDesk";
import {
  GIFT_RUN_LABEL,
  GIFT_RUN_LABEL_PLURAL,
  deliveryStatusColor,
  giftRunStatusColor,
  giftRunStatusLabel,
  occasionColor,
  occasionLabel,
} from "../types";

type Segment = { id: string; label: string; value: number; color: string };

function SegmentBar({
  segments,
  height = 14,
}: {
  segments: Segment[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) {
    return (
      <Typography variant="body2" color="text.secondary">
        No recipient data in this period.
      </Typography>
    );
  }
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          height,
          borderRadius: 999,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <Box
              key={s.id}
              title={`${s.label}: ${s.value}`}
              sx={{
                width: `${(s.value / total) * 100}%`,
                bgcolor: s.color,
                minWidth: s.value ? 4 : 0,
              }}
            />
          ))}
      </Box>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1.5}
        sx={{ mt: 1.25 }}
      >
        {segments.map((s) => (
          <Stack key={s.id} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                bgcolor: s.color,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {s.label}{" "}
              <Typography
                component="span"
                variant="caption"
                fontWeight={700}
                color="text.primary"
              >
                {s.value}
              </Typography>
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function Overview() {
  const theme = useTheme();
  const desk = useCourtesyDesk();
  const navigate = useNavigate();
  const sensitive = useSensitiveData();
  const [fyDate, setFyDate] = useState<Dayjs>(dayjs());
  const [fiscalYear, setFiscalYear] = useState("");

  useEffect(() => {
    generateFiscalYearFromGivenYear(fyDate).then(({ startDate, endDate }) =>
      setFiscalYear(`${startDate} to ${endDate}`),
    );
  }, [fyDate]);

  const [fyStart, fyEnd] = useMemo(() => {
    const [s, e] = fiscalYear.split(" to ");
    return [s || undefined, e || undefined];
  }, [fiscalYear]);

  const [stats, setStats] = useState<GiftsOverview>(() =>
    getOverviewStats(fyStart, fyEnd),
  );

  useEffect(() => {
    void getOverviewStatsFromApi(fyStart, fyEnd).then(setStats);
  }, [desk, fyStart, fyEnd]);

  const groups = listGroups();
  const fyLabel = fiscalYear ? `FY ${formatFiscalYearLabel(fiscalYear)}` : "…";

  const handoverSegments = useMemo<Segment[]>(() => {
    const counts: Record<string, number> = {
      PENDING: stats.pending,
      DELIVERED: stats.delivered,
      SKIPPED: stats.skipped,
    };
    return desk.config.deliveryStatuses
      .filter((s) => s.id !== "OUT")
      .map((s) => ({
        id: s.id,
        label: s.name,
        value: counts[s.id] ?? 0,
        color: deliveryStatusColor(desk.config, s.id),
      }));
  }, [desk.config, stats]);

  const giftRunStatusSegments = useMemo<Segment[]>(() => {
    const counts = new Map<string, number>();
    desk.config.giftRunStatuses.forEach((s) => counts.set(s.id, 0));
    stats.drives.forEach((d) => {
      counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
    });
    return desk.config.giftRunStatuses.map((s) => ({
      id: s.id,
      label: s.name,
      value: counts.get(s.id) ?? 0,
      color: giftRunStatusColor(desk.config, s.id),
    }));
  }, [desk.config, stats.drives]);

  const completionPct = useMemo(() => {
    const total = stats.pending + stats.delivered + stats.skipped;
    return total ? Math.round((stats.delivered / total) * 100) : 0;
  }, [stats]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Gift Managements
          </Typography>
          <Typography color="text.secondary">
            {fyLabel} overview — groups, runs, and handover health
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
        >
          <PeriodNavigator
            label={fyLabel}
            onPrevious={() => setFyDate((d) => d.subtract(1, "year"))}
            onNext={() => setFyDate((d) => d.add(1, "year"))}
          />
          <PremiumButton
            icon="bi-people"
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/groups/new`)}
          >
            New People Group
          </PremiumButton>
          <PremiumButton
            icon="bi-plus-lg"
            onClick={() => navigate(`${GIFT_MANAGEMENT_BASE}/drives?new=1`)}
          >
            New {GIFT_RUN_LABEL}
          </PremiumButton>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "1fr 1fr",
            lg: "repeat(3, 1fr)",
            xl: "repeat(6, 1fr)",
          },
          mb: 3,
        }}
      >
        <StatTile
          label={`Active ${GIFT_RUN_LABEL_PLURAL.toLowerCase()}`}
          value={String(stats.activeDriveCount)}
          trio={TRIO.green}
          icon="gift"
        />
        <StatTile
          label="People groups"
          value={String(groups.length)}
          trio={TRIO.purple}
          icon="people"
        />
        <StatTile
          label="Pending handovers"
          value={String(stats.pending)}
          trio={TRIO.amber}
          icon="time"
        />
        <StatTile
          label="Delivered"
          value={String(stats.delivered)}
          trio={TRIO.blue}
          icon="check-circle"
        />
        <StatTile
          label="Skipped"
          value={String(stats.skipped)}
          trio={TRIO.slate}
          icon="cross-circle"
        />
        <StatTile
          label="Total amount"
          value={formatCurrencyCompact(stats.totalAmount ?? 0)}
          valueClassName={sensitive.cls}
          trio={TRIO.cyan}
          icon="bill"
        />
      </Box>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          mb: 3,
        }}
      >
        <GlassSurface variant="thin" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>
            Handover breakdown
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {completionPct}% of recipients delivered in {fyLabel}
          </Typography>
          <SegmentBar segments={handoverSegments} />
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 0.5 }}
            >
              Overall completion
            </Typography>
            <LinearProgress
              variant="determinate"
              value={completionPct}
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: alpha(
                  TRIO.blue.c,
                  theme.palette.mode === "dark" ? 0.2 : 0.12,
                ),
                "& .MuiLinearProgress-bar": {
                  borderRadius: 999,
                  bgcolor: TRIO.blue.c,
                },
              }}
            />
          </Box>
        </GlassSurface>

        <GlassSurface variant="thin" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.25 }}>
            {GIFT_RUN_LABEL} status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stats.drives.length} run{stats.drives.length === 1 ? "" : "s"} in
            period
          </Typography>
          <SegmentBar segments={giftRunStatusSegments} />
        </GlassSurface>
      </Box>

      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
        {GIFT_RUN_LABEL} progress
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Tap a row to open the run
      </Typography>

      {stats.drives.length === 0 ? (
        <GlassSurface variant="thin" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography color="text.secondary">
            No {GIFT_RUN_LABEL_PLURAL.toLowerCase()} in {fyLabel}. Start one
            from the button above.
          </Typography>
        </GlassSurface>
      ) : (
        <Stack spacing={1.5}>
          {stats.drives.map((d) => {
            const pct = d.total ? Math.round((d.delivered / d.total) * 100) : 0;
            const statusColor = giftRunStatusColor(desk.config, d.status);
            const occ = occasionLabel(desk.config, d.occasionType);
            const occCol = occasionColor(desk.config, d.occasionType);
            return (
              <GlassSurface
                key={d.id}
                variant="thin"
                onClick={() =>
                  navigate(`${GIFT_MANAGEMENT_BASE}/drives/${d.id}`)
                }
                sx={{
                  p: 2,
                  borderRadius: 2,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: `${alpha(statusColor, theme.palette.mode === "dark" ? 0.12 : 0.06)} !important`,
                  "&:hover": {
                    borderColor: statusColor,
                    boxShadow: 1,
                  },
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  spacing={1}
                  sx={{ mb: 1 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>
                      {d.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {d.giftItem}
                    </Typography>
                  </Box>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <SolidChip label={occ} color={occCol} />
                    <SolidChip
                      label={giftRunStatusLabel(desk.config, d.status)}
                      color={statusColor}
                    />
                  </Stack>
                </Stack>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mb: 0.75 }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {d.delivered}/{d.total} delivered
                    {d.pending ? ` · ${d.pending} pending` : ""}
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {pct}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(statusColor, 0.15),
                    "& .MuiLinearProgress-bar": {
                      borderRadius: 999,
                      bgcolor: statusColor,
                    },
                  }}
                />
              </GlassSurface>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
