import React, { useState } from "react";
import AnalyticsCard from "./AnalyticsCard";
import RankedBarChart from "./RankedBarChart";
import { ChartDatum } from "./leadAnalyticsUtils";

export interface BreakdownTab {
  id: string;
  /** Short label shown on the tab pill. */
  label: string;
  /** Card title while this tab is active. */
  cardTitle: string;
  /** Card subtitle while this tab is active. */
  cardSubtitle: string;
  data: ChartDatum[];
  onSelect?: (label: string) => void;
  emptyHint: string;
}

const isEmpty = (d?: ChartDatum[]) =>
  !d || d.length === 0 || d.every((x) => !x.value || x.value <= 0);

/**
 * Service / Category / Sub-Category as ONE ranked-bar card with a tab switcher.
 * Replaces the old Service-Mix donut + the separate Top Categories / Top Sub
 * Categories cards: a single place, one chart type (bar), flip the breakdown
 * with the pills. Each tab keeps its own drill-down (onSelect) and empty state.
 */
const ServiceCategoryTabs: React.FC<{ tabs: BreakdownTab[] }> = ({ tabs }) => {
  const [activeId, setActiveId] = useState<string | undefined>(tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];
  if (!active) return null;

  const tabBar = (
    <div
      role="tablist"
      aria-label="Breakdown"
      style={{
        display: "flex",
        background: "#F1F5F9",
        borderRadius: 10,
        padding: 3,
        gap: 2,
        // Scroll the pills horizontally on narrow cards instead of overflowing.
        overflowX: "auto",
        maxWidth: "100%",
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((t) => {
        const selected = t.id === active.id;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => setActiveId(t.id)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              padding: "6px 14px",
              fontFamily: "Inter, sans-serif",
              fontSize: 12.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              color: selected ? "#0F172A" : "#64748B",
              background: selected ? "#fff" : "transparent",
              boxShadow: selected ? "0 1px 3px rgba(15,23,42,0.12)" : "none",
              transition: "all 150ms ease",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <AnalyticsCard
      title={active.cardTitle}
      subtitle={active.cardSubtitle}
      index={0}
      headerRight={tabBar}
      isEmpty={isEmpty(active.data)}
      emptyHint={active.emptyHint}
    >
      {/* key forces a fresh mount per tab so the bar animation replays on switch */}
      <RankedBarChart
        key={active.id}
        data={active.data}
        onSelect={active.onSelect}
        showRevenue
        valueLabel
        title={active.cardTitle}
      />
    </AnalyticsCard>
  );
};

export default ServiceCategoryTabs;
