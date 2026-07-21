import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export interface AnalyticsTab {
  id: string;
  label: string;
  /** Bootstrap-icon class, e.g. "bi-speedometer2". */
  icon?: string;
  /** Accent colour for the active pill + underline. */
  accent?: string;
  /** Rendered only when the tab is active. */
  content: React.ReactNode;
}

interface Props {
  tabs: AnalyticsTab[];
  /** Persist the active tab across remounts (per period view). */
  storageKey?: string;
  /** DOM id to portal the tab bar into (e.g. the period-filter row). Falls back
   *  to rendering the bar inline if the element isn't found. */
  portalTargetId?: string;
}

/**
 * Polished segmented tab shell for the Lead Overview. Groups the many analytics
 * sections into a handful of focused tabs so only one group renders at a time —
 * far less scroll, same charts. Sticky bar keeps the tabs reachable while the
 * active panel scrolls.
 */
const AnalyticsTabs: React.FC<Props> = ({
  tabs,
  storageKey,
  portalTargetId = "leadOverviewTabSlot",
}) => {
  const visibleTabs = useMemo(() => tabs.filter((t) => !!t.content), [tabs]);

  const initial = (() => {
    if (storageKey) {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (saved && visibleTabs.some((t) => t.id === saved)) return saved;
    }
    return visibleTabs[0]?.id;
  })();

  const [activeId, setActiveId] = useState<string | undefined>(initial);

  // Resolve the portal slot in the period-filter row (falls back to inline).
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlotEl(document.getElementById(portalTargetId));
  }, [portalTargetId]);

  // Guard: if the active tab vanished (settings toggled it off), fall back.
  const active = visibleTabs.find((t) => t.id === activeId) || visibleTabs[0];

  if (visibleTabs.length === 0) return null;

  const select = (id: string) => {
    setActiveId(id);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, id);
      } catch {
        /* ignore quota / privacy-mode errors */
      }
    }
  };

  const tabBar = (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: 4,
        overflowX: "auto",
        padding: 4,
        background: "#EEF2F7",
        borderRadius: 12,
        maxWidth: "100%",
      }}
    >
      {visibleTabs.map((t) => {
        const isActive = t.id === active?.id;
        const accent = t.accent || "#1E3A8A";
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              padding: "7px 14px",
              borderRadius: 9,
              fontFamily: "Inter, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              color: isActive ? accent : "#64748B",
              background: isActive ? "#FFFFFF" : "transparent",
              boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.10)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            {t.icon && (
              <i
                className={`bi ${t.icon}`}
                style={{ fontSize: 14, color: isActive ? accent : "#94A3B8" }}
              />
            )}
            {t.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      {/* Tab bar lives in the period-filter row (portal); inline fallback otherwise. */}
      {slotEl ? createPortal(tabBar, slotEl) : <div style={{ marginBottom: 20 }}>{tabBar}</div>}

      {/* ── Active panel ───────────────────────────────────────────────── */}
      <div role="tabpanel" style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {active?.content}
      </div>
    </div>
  );
};

export default AnalyticsTabs;
