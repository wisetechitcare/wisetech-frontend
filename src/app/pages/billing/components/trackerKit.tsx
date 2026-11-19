import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/ds/lib/utils";
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
  // `tone` is a runtime colour string from the caller, so it rides a CSS variable; without one the
  // text keeps the cell's own colour.
  <span
    className={cn("text-[length:inherit]", bold ? "font-bold" : "font-medium", muted ? "text-muted-foreground" : tone && "text-(--money-tone)")}
    style={tone && !muted ? ({ "--money-tone": tone } as React.CSSProperties) : undefined}
  >
    {value === null || value === undefined ? DASH : formatCurrencyDecimal(value)}
  </span>
);

// `text-primary` rather than the navy hex this used to carry: the brand colour is a token, and a
// hardcoded #1E3A8A is exactly what breaks dark mode and per-tenant brand.
export const TotalLabel: React.FC = () => (
  <p className="text-[length:inherit] font-extrabold text-primary">TOTAL</p>
);

export const DueCell: React.FC<{ date: string | null; overdueDays: number }> = ({ date, overdueDays }) => (
  <div>
    <p className="text-[length:inherit]">{date ? formatDate(date) : DASH}</p>
    {overdueDays > 0 && (
      <p className="text-[11px] font-bold text-destructive">
        {overdueDays} day{overdueDays === 1 ? "" : "s"} overdue
      </p>
    )}
  </div>
);

/** A number and its date underneath — the "Latest proforma / invoice" cell. */
export const NumberDate: React.FC<{ number: string | null; date: string | null }> = ({ number, date }) => (
  <div>
    <p className="text-[length:inherit] font-semibold">{number ?? DASH}</p>
    <p className="text-[11px] text-muted-foreground">{date ? formatDate(date) : ""}</p>
  </div>
);

/** A project's documents as small counts in the process colours: "2 Draft · 1 Awaiting". */
export const StateCounts = <K extends string>({
  counts, tiles,
}: {
  counts: Partial<Record<K, number>> & { total: number };
  tiles: TrackerTile<K>[];
}) => {
  if (!counts?.total) {
    return <span className="text-[length:inherit] text-muted-foreground">None yet</span>;
  }
  return (
    <div className="flex flex-row flex-nowrap gap-1.5">
      {tiles.filter((t) => (counts[t.key] ?? 0) > 0).map((t) => (
        // The three trio colours are runtime values, so they travel as CSS variables.
        <span
          key={t.key}
          className="inline-flex items-center rounded-full border border-(--chip-bd) bg-(--chip-bg) px-[7px] py-px text-[11.5px] font-bold whitespace-nowrap text-(--chip-fg)"
          style={{ "--chip-fg": t.trio.c, "--chip-bg": t.trio.bg, "--chip-bd": t.trio.bd } as React.CSSProperties}
        >
          {counts[t.key]} {t.label.split(" ·")[0]}
        </span>
      ))}
    </div>
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
  // The xl track count is the number of tiles, known only at render, so it rides a CSS variable.
  <div
    className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-[repeat(var(--tile-count),minmax(0,1fr))]"
    style={{ "--tile-count": tiles.length } as React.CSSProperties}
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
  </div>
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
  <div role="radiogroup" aria-label="Filter by status" className="flex flex-row flex-wrap gap-1.5">
    {options.map((o) => {
      const on = o.key === value;
      const colour = o.trio?.c ?? TRIO.blue.c;
      return (
        // The pill's colour is the option's runtime trio colour, so it rides --pill and every state
        // (border, fill, hover, focus ring) reads from that one variable.
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={on}
          onClick={() => onChange(o.key)}
          style={{ "--pill": colour } as React.CSSProperties}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 font-[inherit] text-[12.5px] font-semibold whitespace-nowrap transition-[background-color,border-color] duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--pill)",
            on
              ? "border-(--pill) bg-(--pill) text-white"
              : cn("border-border bg-card hover:border-(--pill)", o.count ? "text-foreground" : "text-muted-foreground"),
          )}
        >
          {o.trio && (
            <span className={cn("size-2 rounded-full", on ? "bg-white" : "bg-(--pill)", o.count || on ? "opacity-100" : "opacity-40")} />
          )}
          {o.label}
          <span
            className={cn(
              "min-w-5 rounded-full px-[5px] text-center text-[11.5px] font-extrabold",
              on ? "bg-white/22" : "bg-accent",
            )}
          >
            {o.count}
          </span>
        </button>
      );
    })}
  </div>
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
  <div className="mb-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
    <Tabs value={view} onValueChange={(next) => onView(String(next))}>
      <ToggleList aria-label="Tracker view">
        {views.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className={TOGGLE_TAB}>{v.label}</TabsTrigger>
        ))}
      </ToggleList>
    </Tabs>
    {children}
    {focusTile && (
      <div className="flex flex-row items-center gap-1.5">
        <p className="text-[12.5px] text-muted-foreground">
          Showing{" "}
          <b className="text-(--focus-tone)" style={{ "--focus-tone": focusTile.trio.c } as React.CSSProperties}>
            {focusTile.label}
          </b>{" "}
          · {shown} {shownNoun}
        </p>
        <Button variant="ghost" size="sm" onClick={onClear}>
          <X data-icon="inline-start" aria-hidden /> Clear
        </Button>
      </div>
    )}
  </div>
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
