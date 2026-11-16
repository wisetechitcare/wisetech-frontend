import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";
import { KTIcon } from "@metronic/helpers";
import { Button } from "@/ds/ui/button";
import { Tabs, TabsTrigger } from "@/ds/ui/tabs";
import { ToggleList, TOGGLE_TAB } from "@/ds/ui/tabs";
import { TRIO, isHexColor, type SemanticTone } from "@app/modules/common/components/ui";
import { tonePair } from "@app/theme/tokens";
import { formatCurrencyDecimal } from "@utils/currency";
import { formatDate } from "@utils/dateFormats";
import { usePoStatusOptions } from "@hooks/usePoStatusOptions";
import { BillingStatsCard } from "./BillingStates";
import { SolidChip } from "@app/modules/common/components/ui/SolidChip";

/**
 * The parts the Proforma Tracker and the Tax Invoice Tracker share: the process tiles, the Projects / documents
 * switch, the money and due-date cells, the PO chip and the URL state. Both screens are the same shape — the process
 * as tiles, every project, every document — so they are built from one set of parts and read the same way.
 */

export const DASH = "—";

export type Trio = (typeof TRIO)[keyof typeof TRIO];

export interface TrackerTile<K extends string> {
  key: K;
  label: string;
  icon: string;
  trio: Trio;
}

export interface TileFigure {
  count: number;
  amount: number;
  /** What the amount is: "outstanding", "billed", "to raise"… */
  hint: string;
}

export const sumOf = <T,>(rows: T[], pick: (row: T) => number | null | undefined) =>
  Math.round(rows.reduce((s, r) => s + (pick(r) ?? 0), 0) * 100) / 100;

export const Money: React.FC<{ value: number | null | undefined; bold?: boolean; tone?: string; muted?: boolean }> = ({
  value, bold, tone, muted,
}) => (
  <Typography
    component="span"
    sx={{ fontSize: "inherit", fontWeight: bold ? 700 : 500, color: muted ? "text.disabled" : tone ?? "inherit" }}
  >
    {value === null || value === undefined ? DASH : formatCurrencyDecimal(value)}
  </Typography>
);

export const TotalLabel: React.FC = () => (
  <Typography sx={{ fontSize: "inherit", fontWeight: 800, color: "#1E3A8A" }}>TOTAL</Typography>
);

export const DueCell: React.FC<{ date: string | null; overdueDays: number }> = ({ date, overdueDays }) => (
  <Box>
    <Typography sx={{ fontSize: "inherit" }}>{date ? formatDate(date) : DASH}</Typography>
    {overdueDays > 0 && (
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: "error.main" }}>
        {overdueDays} day{overdueDays === 1 ? "" : "s"} overdue
      </Typography>
    )}
  </Box>
);

/** A number and its date underneath — the "Latest proforma / invoice" cell. */
export const NumberDate: React.FC<{ number: string | null; date: string | null }> = ({ number, date }) => (
  <Box>
    <Typography sx={{ fontSize: "inherit", fontWeight: 600 }}>{number ?? DASH}</Typography>
    <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{date ? formatDate(date) : ""}</Typography>
  </Box>
);

/** A project's documents as small counts in the process colours: "2 Draft · 1 Awaiting". */
export const StateCounts = <K extends string>({
  counts, tiles,
}: {
  counts: Partial<Record<K, number>> & { total: number };
  tiles: TrackerTile<K>[];
}) => {
  if (!counts?.total) {
    return <Typography component="span" sx={{ fontSize: "inherit", color: "text.disabled" }}>None yet</Typography>;
  }
  return (
    <Stack direction="row" spacing={0.75} sx={{ flexWrap: "nowrap" }}>
      {tiles.filter((t) => (counts[t.key] ?? 0) > 0).map((t) => (
        <Box
          key={t.key}
          component="span"
          sx={{
            display: "inline-flex", alignItems: "center", px: 0.9, py: 0.15, borderRadius: "999px",
            fontSize: 11.5, fontWeight: 700, color: t.trio.c, bgcolor: t.trio.bg, border: `1px solid ${t.trio.bd}`,
            whiteSpace: "nowrap",
          }}
        >
          {counts[t.key]} {t.label.split(" ·")[0]}
        </Box>
      ))}
    </Stack>
  );
};

/** The process, left to right. Each tile is a filter on whichever view is open; the open one is outlined. */
export const TrackerTiles = <K extends string>({
  tiles, figures, focus, loading, onPick,
}: {
  tiles: TrackerTile<K>[];
  figures: Record<K, TileFigure>;
  focus: K;
  loading: boolean;
  onPick: (key: K) => void;
}) => (
  <Box
    sx={{
      display: "grid", gap: 1.25, mb: 2,
      gridTemplateColumns: {
        xs: "repeat(2, minmax(0, 1fr))",
        md: "repeat(4, minmax(0, 1fr))",
        xl: `repeat(${tiles.length}, minmax(0, 1fr))`,
      },
    }}
  >
    {tiles.map((tile) => {
      const figure = figures[tile.key];
      return (
        <BillingStatsCard
          key={tile.key}
          label={tile.label}
          icon={tile.icon}
          trio={tile.trio}
          loading={loading}
          value={figure?.count ?? 0}
          hint={figure ? `${formatCurrencyDecimal(figure.amount)} ${figure.hint}` : undefined}
          active={focus === tile.key}
          onClick={() => onPick(tile.key)}
        />
      );
    })}
  </Box>
);

/** One status option: what it is, its colour, and how many rows of the open view it leaves. */
export interface StatusOption<K extends string> {
  key: K;
  label: string;
  count: number;
  trio?: Trio;
}

/**
 * The table's status filter: one pill per status. Each count is exactly the rows that pill shows on the open
 * view, so the number and the table always agree. One is always selected; "All" clears.
 */
export const StatusChips = <K extends string>({
  options, value, onChange,
}: {
  options: StatusOption<K>[];
  value: K;
  onChange: (key: K) => void;
}) => (
  <Stack direction="row" role="radiogroup" aria-label="Filter by status" sx={{ flexWrap: "wrap", gap: 0.75 }}>
    {options.map((o) => {
      const on = o.key === value;
      const colour = o.trio?.c ?? TRIO.blue.c;
      return (
        <Box
          key={o.key}
          component="button"
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.key)}
          sx={{
            display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.55, borderRadius: "999px",
            font: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            border: "1px solid", borderColor: on ? colour : "divider",
            bgcolor: on ? colour : "background.paper",
            color: on ? "#fff" : o.count ? "text.primary" : "text.disabled",
            transition: "background-color .15s, border-color .15s",
            "&:hover": on ? {} : { borderColor: colour },
            "&:focus-visible": { outline: `2px solid ${colour}`, outlineOffset: 2 },
          }}
        >
          {o.trio && (
            <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: on ? "#fff" : colour, opacity: o.count || on ? 1 : 0.4 }} />
          )}
          {o.label}
          <Box
            component="span"
            sx={{
              minWidth: 20, px: 0.6, borderRadius: "999px", fontSize: 11.5, fontWeight: 800, textAlign: "center",
              bgcolor: on ? "rgba(255,255,255,.22)" : "action.hover",
            }}
          >
            {o.count}
          </Box>
        </Box>
      );
    })}
  </Stack>
);

/** Projects / documents switch, plus the filter that is applied and a way out of it. */
export const TrackerToolbar: React.FC<{
  view: string;
  views: Array<{ value: string; label: string }>;
  onView: (value: string) => void;
  focusTile?: TrackerTile<string>;
  shown: number;
  shownNoun: string;
  onClear: () => void;
  /** Sits beside the switch — e.g. the StatusChips filter. */
  children?: React.ReactNode;
}> = ({ view, views, onView, focusTile, shown, shownNoun, onClear, children }) => (
  <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.25} sx={{ mb: 1.25 }}>
    <Tabs value={view} onValueChange={(next) => onView(String(next))}>
      <ToggleList aria-label="Tracker view">
        {views.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className={TOGGLE_TAB}>{v.label}</TabsTrigger>
        ))}
      </ToggleList>
    </Tabs>
    {children}
    {focusTile && (
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          Showing <b style={{ color: focusTile.trio.c }}>{focusTile.label}</b> · {shown} {shownNoun}
        </Typography>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <KTIcon iconName="cross" className="fs-6" /> Clear
        </Button>
      </Stack>
    )}
  </Stack>
);

/** The PO status chip, in the colour configured for it in Leads → Configure (as on the Billing Tracker). */
export const usePoChip = () => {
  const poOptions = usePoStatusOptions();
  const colorByName = useMemo(() => new Map(poOptions.map((o) => [o.value, o.color])), [poOptions]);
  return useCallback((poStatus: string | null | undefined) => {
    if (!poStatus) return DASH;
    const configured = colorByName.get(poStatus);
    const color = configured ? (isHexColor(configured) ? configured : tonePair(configured as SemanticTone).fg) : null;
    return <SolidChip label={`PO ${poStatus}`} color={color} />;
  }, [colorByName]);
};

/** A clickable tracker row with a left accent in the colour of where it stands. */
export const trackerRowSx = (accent: string | null) => ({
  cursor: "pointer",
  "& .MuiTableCell-root": { fontSize: "13px", padding: "8px 10px !important", whiteSpace: "nowrap" },
  // A positioned cell, so `BillingStatusTint` can fill it. Pinned cells are already `sticky`, which also positions them.
  "& .MuiTableCell-root:not([data-pinned='true'])": { position: "relative" },
  "& .MuiTableCell-root:first-of-type": { borderLeft: "3px solid", borderLeftColor: accent ?? "transparent" },
});

/**
 * View, tile and project drill-down, kept in the URL so a filtered tracker is a link someone can be sent.
 * `docViews` are the screen's other views ("proformas", or "invoices" and "queue"); the projects view is the default.
 */
export const useTrackerParams = <K extends string>(docViews: readonly string[], focusKeys: readonly K[], fallback: K) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("view") ?? "";
  const view = docViews.includes(requested) ? requested : "projects";
  const raw = searchParams.get("focus") as K | null;
  const focus: K = raw && focusKeys.includes(raw) ? raw : fallback;
  const projectId = searchParams.get("projectId") || undefined;
  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next, { replace: true });
  };
  return { view, focus, projectId, setParam };
};

/** Shared MaterialTable settings for both grains of both trackers. */
export const TRACKER_TABLE = {
  showColumnFooter: true,
  enableColumnSpecificSearch: true,
  enableColumnResizing: true,
  layoutMode: "semantic" as const,
  muiTableContainerProps: { sx: { maxHeight: "680px", overflowX: "auto" } },
  muiTablePaperStyle: { boxShadow: "none", marginTop: 0 },
};
