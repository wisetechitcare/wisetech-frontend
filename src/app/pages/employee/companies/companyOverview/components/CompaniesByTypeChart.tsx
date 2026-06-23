import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";

/**
 * CompaniesByTypeChart — custom (no ApexCharts) horizontal bar tree.
 *
 * Three drill levels:
 *   Type  ▸  Sub-type  ▸  Service
 *
 * - Type / Sub-type come from the existing company-type tree (parentTypeId).
 * - Service is OPTIONAL: attach `services` to any type/sub-type and that row
 *   becomes drillable to a 3rd level. When `services` is absent the component
 *   behaves exactly like the old 2-level chart, so the backend change can ship
 *   independently.
 *
 * Fully responsive: reflows to a stacked card layout below ~600px.
 */

// --- Types ---------------------------------------------------------------
export interface SubServiceCount {
  id: string;
  name: string;
  count: number;
  color?: string | null;
}

export interface ServiceCount {
  id: string;
  name: string;
  count: number;
  color?: string;
  /** Optional 4th level: this service's sub-services among the same company set. */
  subServices?: SubServiceCount[];
}

export interface DataItem {
  id: string;
  name: string;
  companyCount: number;
  color: string;
  parentTypeId?: string | null;
  /** Optional 3rd level: companies of THIS type broken down by service. */
  services?: ServiceCount[];
}

interface Props {
  data: DataItem[];
  /** Existing contract — fires when a type / sub-type / Others bar is clicked. */
  onBarClick: (typeId: string | null, isOthers?: boolean, top10Ids?: string[]) => void;
  /** Optional — fires when a Service bar is clicked (typeId = the parent type). */
  onServiceClick?: (serviceId: string, typeId: string | null) => void;
  /** Optional — fires when a Sub-service bar is clicked (typeId = the owning (sub-)type). */
  onSubServiceClick?: (subServiceId: string, typeId: string | null) => void;
  /** Collapse the tail into "Others" beyond this many top-level rows. Default 10. */
  topNLimit?: number;
  /** When set, the toolbar selections (sort, By Type/Service, type filter, Show All) are
   *  remembered in localStorage under this key — they persist until the user changes them. */
  persistKey?: string;
}

type SortKey = "countDesc" | "countAsc" | "nameAZ" | "nameZA";
type GroupKey = "type" | "service";

// Internal tree node
interface Node {
  id: string;
  name: string;
  count: number;
  color: string;
  kind: "type" | "subtype" | "service" | "subservice";
  children: Node[];
  parentId?: string | null;
  parentName?: string;
}

// Flattened, ready-to-render row
interface FlatRow {
  node: Node;
  level: number;
  expanded: boolean;
  hasChildren: boolean;
  isOthers?: boolean;
}

// --- Helpers -------------------------------------------------------------
const ACCENT = "#9c4646";
const MOBILE_BP = 600;

function lighten(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const m = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, "0");
  return "#" + m(r) + m(g) + m(b);
}

const TEXT_BY_LEVEL = ["#1f2733", "#5a6470", "#8893a0"];

// --- Component -----------------------------------------------------------
const CompaniesByTypeChart: React.FC<Props> = ({
  data,
  onBarClick,
  onServiceClick,
  onSubServiceClick,
  topNLimit = 10,
  persistKey,
}) => {
  // Persisted toolbar prefs (only when persistKey is provided). Survive refresh/logout/navigation.
  const store = persistKey ? `companiesByTypeChart:${persistKey}` : null;
  const lsRead = <T,>(k: string, fb: T): T => {
    if (!store || typeof window === "undefined") return fb;
    try { const v = window.localStorage.getItem(`${store}:${k}`); return v == null ? fb : (JSON.parse(v) as T); } catch { return fb; }
  };

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>(() => lsRead<SortKey>("sortBy", "countDesc"));
  const [group, setGroup] = useState<GroupKey>(() => lsRead<GroupKey>("group", "type"));
  // Inclusion filter: empty = show ALL types; non-empty = show ONLY the selected types.
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => new Set(lsRead<string[]>("selectedTypes", [])));
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(() => lsRead<boolean>("showAll", false));

  // Write each pref back whenever it changes.
  useEffect(() => { if (store) try { window.localStorage.setItem(`${store}:sortBy`, JSON.stringify(sortBy)); } catch { /* ignore */ } }, [sortBy, store]);
  useEffect(() => { if (store) try { window.localStorage.setItem(`${store}:group`, JSON.stringify(group)); } catch { /* ignore */ } }, [group, store]);
  useEffect(() => { if (store) try { window.localStorage.setItem(`${store}:showAll`, JSON.stringify(showAll)); } catch { /* ignore */ } }, [showAll, store]);
  useEffect(() => { if (store) try { window.localStorage.setItem(`${store}:selectedTypes`, JSON.stringify(Array.from(selectedTypes))); } catch { /* ignore */ } }, [selectedTypes, store]);

  // Responsive width tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setWidth((prev) => (Math.abs(w - prev) > 3 ? w : prev));
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  const isMobile = width > 0 && width < MOBILE_BP;

  // Close the filter popover on outside click
  const filterWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!filterOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as any)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [filterOpen]);

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const collapseBranch = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.forEach((k) => {
        if (k === id || k.startsWith(id + "/")) next.delete(k);
      });
      next.delete(id);
      return next;
    });
  }, []);

  // --- Build the tree from the flat data ---------------------------------
  const tree = useMemo<Node[]>(() => {
    const byId = new Map(data.map((d) => [d.id, d]));
    // R1 — never-vanish: a child only nests under its parent when that parent is itself a genuine
    // TOP-LEVEL type (no parent of its own). A "grandchild" (parent is itself a child) or a child
    // whose parent is missing is PROMOTED to a top-level row instead of being silently dropped.
    const isParentTopLevel = (parentId: string | null | undefined): boolean => {
      if (!parentId) return false;
      const p = byId.get(parentId);
      if (!p) return false;
      return !p.parentTypeId || !byId.has(p.parentTypeId);
    };
    const attachable = (d: DataItem): boolean =>
      !!(d.parentTypeId && byId.has(d.parentTypeId) && isParentTopLevel(d.parentTypeId));

    const childrenByParent = new Map<string, DataItem[]>();
    data.forEach((d) => {
      if (attachable(d)) {
        const arr = childrenByParent.get(d.parentTypeId!) || [];
        arr.push(d);
        childrenByParent.set(d.parentTypeId!, arr);
      }
    });

    const serviceNodes = (item: DataItem, baseColor: string): Node[] =>
      (item.services || []).map((s) => ({
        id: `${item.id}/svc/${s.id}`,
        name: s.name,
        count: s.count,
        color: s.color || lighten(baseColor, 0.46),
        kind: "service" as const,
        // 4th level: sub-services under this service (id encodes the owning type for the modal filter).
        children: (s.subServices || []).map((ss) => ({
          id: `${item.id}/svc/${s.id}/sub/${ss.id}`,
          name: ss.name,
          count: ss.count,
          color: ss.color || lighten(baseColor, 0.62),
          kind: "subservice" as const,
          children: [],
          parentId: item.id,
          parentName: s.name,
        })),
        parentId: item.id,
        parentName: item.name,
      }));

    const topLevel = data.filter((d) => !attachable(d));

    return topLevel.map((d) => {
      const subs = childrenByParent.get(d.id) || [];
      const subNodes: Node[] = subs.map((c) => ({
        id: c.id,
        name: c.name,
        count: c.companyCount,
        color: lighten(d.color, 0.22),
        kind: "subtype",
        parentId: d.id,
        parentName: d.name,
        children: serviceNodes(c, d.color),
      }));
      // A type either has sub-types, or (if none) hangs its own services directly.
      const children = subNodes.length > 0 ? subNodes : serviceNodes(d, d.color);
      const total = d.companyCount + subNodes.reduce((s, n) => s + n.count, 0);
      return {
        id: d.id,
        name: d.name,
        count: subNodes.length > 0 ? total : d.companyCount,
        color: d.color,
        kind: "type" as const,
        children,
      };
    });
  }, [data]);

  const hasGroups = useMemo(() => tree.some((t) => t.children.some((c) => c.kind === "subtype")), [tree]);

  const sortNodes = useCallback(
    (nodes: Node[]): Node[] => {
      const arr = [...nodes];
      switch (sortBy) {
        case "nameAZ": arr.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "nameZA": arr.sort((a, b) => b.name.localeCompare(a.name)); break;
        case "countAsc": arr.sort((a, b) => a.count - b.count); break;
        default: arr.sort((a, b) => b.count - a.count);
      }
      return arr;
    },
    [sortBy]
  );

  const matches = useCallback((n: Node, q: string): boolean =>
    n.name.toLowerCase().includes(q) || n.children.some((c) => matches(c, q)), []);

  // --- Flatten to visible rows -------------------------------------------
  const { rows, scaleMax, top10Ids } = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (group === "service") {
      // Aggregate by the real Service id (extracted from the tree node id) so clicking an
      // aggregated row can still open the companies modal for that service.
      const agg = new Map<string, { id: string; name: string; count: number; color: string }>();
      const walk = (nodes: Node[]) =>
        nodes.forEach((n) => {
          if (n.kind === "service") {
            const sid = n.id.split("/svc/")[1] || n.id;
            const cur = agg.get(sid) || { id: sid, name: n.name, count: 0, color: n.color };
            cur.count += n.count;
            agg.set(sid, cur);
          } else walk(n.children);
        });
      tree.filter((t) => selectedTypes.size === 0 || selectedTypes.has(t.id)).forEach((t) => walk(t.children));
      let svc = Array.from(agg.values());
      if (q) svc = svc.filter((s) => s.name.toLowerCase().includes(q));
      if (sortBy === "nameAZ") svc.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === "nameZA") svc.sort((a, b) => b.name.localeCompare(a.name));
      else if (sortBy === "countAsc") svc.sort((a, b) => a.count - b.count);
      else svc.sort((a, b) => b.count - a.count);
      const max = Math.max(1, ...svc.map((s) => s.count));
      const r: FlatRow[] = svc.map((s) => ({
        node: { id: `agg/svc/${s.id}`, name: s.name, count: s.count, color: ACCENT, kind: "service", children: [] },
        level: 0, expanded: false, hasChildren: false,
      }));
      return { rows: r, scaleMax: max, top10Ids: [] as string[] };
    }

    // Type mode
    let top = sortNodes(tree.filter((t) => selectedTypes.size === 0 || selectedTypes.has(t.id)));
    let othersSum = 0;
    let othersIds: string[] = [];
    if (!showAll && top.length > topNLimit && !q) {
      othersSum = top.slice(topNLimit).reduce((s, g) => s + g.count, 0);
      othersIds = top.slice(0, topNLimit).flatMap((g) => [g.id, ...g.children.map((c) => c.id)]);
      top = top.slice(0, topNLimit);
    } else {
      othersIds = top.flatMap((g) => [g.id, ...g.children.map((c) => c.id)]);
    }

    const out: FlatRow[] = [];
    const push = (nodes: Node[], level: number) => {
      for (const n of sortNodes(nodes)) {
        if (q && !matches(n, q)) continue;
        const hasChildren = n.children.length > 0;
        const isOpen = q ? hasChildren && n.children.some((c) => matches(c, q)) : expanded.has(n.id);
        out.push({ node: n, level, expanded: isOpen, hasChildren });
        if (hasChildren && isOpen) push(n.children, level + 1);
      }
    };
    push(top, 0);

    if (othersSum > 0) {
      out.push({
        node: { id: "others", name: "Others", count: othersSum, color: "#94a0ad", kind: "type", children: [] },
        level: 0, expanded: false, hasChildren: false, isOthers: true,
      });
    }
    const max = Math.max(1, ...tree.map((t) => t.count));
    return { rows: out, scaleMax: max, top10Ids: othersIds };
  }, [tree, selectedTypes, group, search, sortBy, expanded, showAll, topNLimit, sortNodes, matches]);

  // axis ticks
  const niceMax = Math.max(20, Math.ceil(scaleMax / 20) * 20);
  const step = Math.max(20, Math.round(niceMax / 10 / 20) * 20) || 20;
  const ticks: number[] = [];
  for (let v = 0; v <= niceMax; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== niceMax) ticks.push(niceMax);
  const ticksM = [0, Math.round(niceMax / 2), niceMax];

  // expanded chips
  const findNode = useCallback((id: string): Node | null => {
    let res: Node | null = null;
    const w = (ns: Node[]) => ns.forEach((n) => { if (n.id === id) res = n; else w(n.children); });
    w(tree);
    return res;
  }, [tree]);
  const chips = group === "service" ? [] : Array.from(expanded).map((id) => findNode(id)).filter(Boolean) as Node[];

  const totalCompanies = useMemo(() => tree.reduce((a, t) => a + t.count, 0), [tree]);
  const selectedCount = selectedTypes.size;

  // All node ids that CAN be expanded (have children) — drives the Expand/Collapse active state.
  const expandableIds = useMemo(() => {
    const ids = new Set<string>();
    const w = (ns: Node[]) => ns.forEach((n) => { if (n.children.length) { ids.add(n.id); w(n.children); } });
    w(tree);
    return ids;
  }, [tree]);
  const allCollapsed = expanded.size === 0;
  const allExpanded = expandableIds.size > 0 && Array.from(expandableIds).every((id) => expanded.has(id));

  const expandAll = () => setExpanded(new Set(expandableIds));
  const collapseAll = () => setExpanded(new Set());

  // Clicking the row opens the companies/service modal (even for a parent category).
  // Expanding/collapsing is done via the caret control (which stops propagation).
  const onRowClick = (r: FlatRow) => {
    if (r.isOthers) { onBarClick(null, true, top10Ids); return; }
    if (r.node.kind === "subservice") {
      // id = {ownerTypeId}/svc/{serviceId}/sub/{subServiceId}
      const subId = r.node.id.split("/sub/")[1] || r.node.id;
      const ownerTypeId = r.node.id.split("/svc/")[0] || null;
      onSubServiceClick?.(subId, ownerTypeId);
      return;
    }
    if (r.node.kind === "service") {
      // Service nodes pass their owning (sub-)type so the modal can show type ∩ service.
      onServiceClick?.(r.node.id.split("/svc/")[1].split("/sub/")[0] || r.node.id, r.node.parentId ?? null);
      return;
    }
    onBarClick(r.node.id);
  };

  // --- styles ------------------------------------------------------------
  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e2e6ec", borderRadius: isMobile ? 14 : 10,
    boxShadow: "0 1px 3px rgba(16,24,40,.05)", overflow: "hidden", fontFamily: "'Inter',system-ui,sans-serif",
    color: "#1f2733", width: "100%",
  };
  const segBtn = (on: boolean): React.CSSProperties => ({
    height: 28, padding: "0 16px", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flex: isMobile ? 1 : "none",
    // Selected segment: solid brand fill + white text so it's unmistakably active.
    background: on ? ACCENT : "transparent", color: on ? "#fff" : "#8893a0",
    boxShadow: on ? "0 1px 3px rgba(156,70,70,.35)" : "none",
    transition: "background .15s ease, color .15s ease",
  });
  const ctrlBtn: React.CSSProperties = {
    height: 34, padding: "0 13px", border: "1px solid #dde2e8", background: "#fff", borderRadius: 8,
    fontSize: 12.5, fontWeight: 500, color: "#46505d", cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div ref={containerRef} style={card}>
      {/* Header */}
      <div style={{ padding: isMobile ? "16px 16px 12px" : "20px 24px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: isMobile ? 16 : 17, fontWeight: 700, letterSpacing: "-.2px" }}>Companies by Type</div>
          {hasGroups && (
            <div style={{ fontSize: 12, color: "#8a93a0", marginTop: 3, lineHeight: 1.45 }}>
              <b style={{ color: ACCENT, fontWeight: 600 }}>Type</b> → <b style={{ color: "#b8736f", fontWeight: 600 }}>Sub-type</b> → <b style={{ color: "#c79b98", fontWeight: 600 }}>Service</b> → <b style={{ color: "#d4b3b0", fontWeight: 600 }}>Sub-service</b> · click the <b style={{ color: ACCENT }}>▸</b> to expand · click a row to view its companies.
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flex: "none" }}>
          <Stat value={totalCompanies} label="Companies" />
          {!isMobile && <Stat value={rows.length} label="Rows" />}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: isMobile ? "0 16px 12px" : "0 24px 14px", display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", background: "#f1f3f6", border: "1px solid #e6e9ee", borderRadius: 8, padding: 3, width: isMobile ? "100%" : undefined }}>
          <button style={segBtn(group === "type")} onClick={() => setGroup("type")}>By Type</button>
          <button style={segBtn(group === "service")} onClick={() => { setGroup("service"); setFilterOpen(false); }}>By Service</button>
        </div>

        <div style={{ position: "relative", width: isMobile ? "100%" : undefined, flex: isMobile ? undefined : "1", minWidth: isMobile ? undefined : 200, maxWidth: isMobile ? undefined : 300 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#aab2bd", fontSize: 13 }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search type, sub-type or service…"
            style={{ width: "100%", height: 34, border: "1px solid #dde2e8", borderRadius: 8, padding: "0 12px 0 30px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "#1f2733", boxSizing: "border-box" }} />
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        <div style={{ display: "flex", gap: isMobile ? 8 : 10, alignItems: "center", flexWrap: "wrap", width: isMobile ? "100%" : undefined }}>
          {group === "type" && (
            <div style={{ position: "relative" }} ref={filterWrapRef}>
              <button onClick={() => setFilterOpen((v) => !v)}
                style={{ ...ctrlBtn, display: "flex", alignItems: "center", gap: 6, border: `1px solid ${selectedCount > 0 ? ACCENT : "#dde2e8"}`, background: selectedCount > 0 ? "#fbf3f3" : "#fff", color: selectedCount > 0 ? ACCENT : "#46505d", whiteSpace: "nowrap" }}>
                <i className="bi bi-funnel" style={{ fontSize: 13 }} /> Filter{selectedCount > 0 ? ` (${selectedCount}/${tree.length})` : ""}
              </button>
              {filterOpen && (
                <div style={{ position: "absolute", [isMobile ? "left" : "right"]: 0, top: 40, zIndex: 20, background: "#fff", border: "1px solid #e2e6ec", borderRadius: 10, boxShadow: "0 8px 28px rgba(16,24,40,.16)", padding: 8, width: 248, maxHeight: 300, overflow: "auto" } as React.CSSProperties}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px 8px" }}>
                    <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "#9aa3b0", fontWeight: 600 }}>{selectedCount > 0 ? `Showing ${selectedCount} selected` : "Select types to show"}</span>
                    {selectedCount > 0 && (
                      <button onClick={() => setSelectedTypes(new Set())} style={{ border: "none", background: "none", color: ACCENT, fontSize: 11, fontWeight: 600, cursor: "pointer", padding: 0 }}>Clear (show all)</button>
                    )}
                  </div>
                  {tree.map((t) => {
                    const on = selectedTypes.has(t.id);
                    return (
                      <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: 6, cursor: "pointer", fontSize: 13, background: on ? "#fbf3f3" : "transparent" }}>
                        <input type="checkbox" checked={on} onChange={() => setSelectedTypes((prev) => { const n = new Set(prev); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })} style={{ accentColor: ACCENT, width: 15, height: 15 }} />
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: t.color, flex: "none" }} />
                        <span style={{ flex: 1, fontWeight: on ? 600 : 400, color: on ? ACCENT : "#1f2733" }}>{t.name}</span>
                        <span style={{ color: "#aab2bd", fontSize: 12 }}>{t.count}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <button
            style={{ ...ctrlBtn, ...(allExpanded ? { background: "#fbf3f3", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 700 } : {}) }}
            onClick={expandAll}
          >Expand</button>
          <button
            style={{ ...ctrlBtn, ...(allCollapsed ? { background: "#fbf3f3", border: `1px solid ${ACCENT}`, color: ACCENT, fontWeight: 700 } : {}) }}
            onClick={collapseAll}
          >Collapse</button>
          {tree.length > topNLimit && group === "type" && (
            <button style={{ ...ctrlBtn, color: ACCENT, fontWeight: 600 }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? `Show Top ${topNLimit}` : `Show All (${tree.length})`}
            </button>
          )}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
            style={{
              height: 34, border: "1px solid #dde2e8", borderRadius: 8, padding: "0 34px 0 10px",
              fontSize: 12.5, fontFamily: "inherit", color: "#46505d", cursor: "pointer",
              // Hide the faint native arrow and draw a clear, larger chevron so it's obvious
              // this is a dropdown.
              appearance: "none", WebkitAppearance: "none", MozAppearance: "none",
              backgroundColor: "#fff",
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%239c4646' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              backgroundSize: "18px",
            }}>
            <option value="countDesc">Most companies</option>
            <option value="countAsc">Fewest companies</option>
            <option value="nameAZ">Name (A–Z)</option>
            <option value="nameZA">Name (Z–A)</option>
          </select>
        </div>
      </div>

      {/* Expanded chips */}
      {chips.length > 0 && (
        <div style={{ padding: isMobile ? "0 16px 12px" : "0 24px 14px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #f0f2f5", marginBottom: 4, paddingBottom: 13 }}>
          <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", color: "#9aa3b0", fontWeight: 600 }}>Expanded</span>
          {chips.map((n) => (
            <span key={n.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 6px 4px 10px", borderRadius: 16, fontSize: 12, fontWeight: 500, background: lighten(n.color, n.kind === "type" ? 0.82 : 0.88), color: "#3a4350", border: `1px solid ${lighten(n.color, 0.6)}` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: n.color }} />
              {n.name}
              <button onClick={() => collapseBranch(n.id)} style={{ border: "none", background: "rgba(0,0,0,.06)", color: "inherit", width: 17, height: 17, borderRadius: "50%", cursor: "pointer", fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </span>
          ))}
          <button onClick={collapseAll} style={{ border: "none", background: "none", color: ACCENT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 2 }}>Clear</button>
        </div>
      )}

      {/* Chart body */}
      <div style={{ padding: isMobile ? "4px 16px 6px" : "8px 24px 4px" }}>
        {rows.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "#aab2bd", fontSize: 13 }}>No rows match your search or filter.</div>
        )}

        {rows.map((r, i) => {
          const pct = Math.max(r.node.count > 0 ? 1.5 : 0, (r.node.count / niceMax) * 100) + "%";
          const textColor = TEXT_BY_LEVEL[Math.min(r.level, 2)];
          // Every row is actionable: a row opens the modal; the caret expands a group.
          const clickable = true;
          const childKindLabel = r.hasChildren
            ? (r.node.children[0].kind === "service"
                ? "services"
                : r.node.children[0].kind === "subservice"
                  ? "sub-services"
                  : "sub-types")
            : "";
          const hint = r.hasChildren ? `· ${r.node.children.length} ${childKindLabel}` : "";

          if (isMobile) {
            return (
              <div key={r.node.id + i} onClick={() => onRowClick(r)} style={{ display: "flex", flexDirection: "column", gap: 7, padding: "11px 0", borderBottom: "1px solid #f3f5f7", cursor: clickable ? "pointer" : "default" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: r.level * 16 }}>
                  <span
                    onClick={(e) => { if (r.hasChildren) { e.stopPropagation(); toggle(r.node.id); } }}
                    style={{ width: 24, height: 24, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: r.hasChildren ? lighten(r.node.color, 0.82) : "transparent", color: r.hasChildren ? r.node.color : "transparent", fontSize: 15, fontWeight: 800, cursor: r.hasChildren ? "pointer" : "default", transition: "transform .15s", transform: r.expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    {r.hasChildren ? "▸" : ""}
                  </span>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: r.node.color }} />
                  <span style={{ fontSize: 13.5, fontWeight: r.level === 0 ? 600 : 500, color: textColor, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.node.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: textColor, flex: "none" }}>{r.node.count}</span>
                </div>
                <div style={{ paddingLeft: r.level * 16 }}>
                  {hint && <span style={{ display: "block", fontSize: 10.5, color: "#aeb6c1", fontWeight: 500, marginBottom: 5 }}>{hint}</span>}
                  <div style={{ position: "relative", height: 14, background: "#f4f6f8", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct, background: r.node.color, borderRadius: 4, transition: "width .25s ease" }} />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={r.node.id + i} onClick={() => onRowClick(r)} onMouseEnter={(e) => { if (clickable) (e.currentTarget as HTMLElement).style.background = "#f7f8fa"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              style={{ display: "grid", gridTemplateColumns: "300px 1fr 50px", alignItems: "center", gap: 10, height: 38, cursor: clickable ? "pointer" : "default", borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: r.level * 22, minWidth: 0 }}>
                <span
                  title={r.hasChildren ? (r.expanded ? "Collapse" : "Expand") : undefined}
                  onClick={(e) => { if (r.hasChildren) { e.stopPropagation(); toggle(r.node.id); } }}
                  style={{ width: 24, height: 24, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: r.hasChildren ? lighten(r.node.color, 0.82) : "transparent", color: r.hasChildren ? r.node.color : "transparent", fontSize: 15, fontWeight: 800, cursor: r.hasChildren ? "pointer" : "default", transition: "transform .15s", transform: r.expanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                  {r.hasChildren ? "▸" : ""}
                </span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: r.node.color }} />
                <span style={{ fontSize: 13, fontWeight: r.level === 0 ? 600 : 500, color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.node.name}</span>
                {hint && <span style={{ fontSize: 11, color: "#aeb6c1", fontWeight: 500, whiteSpace: "nowrap", flex: "none" }}>{hint}</span>}
              </div>
              <div style={{ position: "relative", height: 20, background: "#f4f6f8", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pct, background: r.node.color, borderRadius: 4, transition: "width .25s ease" }} />
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: textColor, textAlign: "right" }}>{r.node.count}</div>
            </div>
          );
        })}

        {/* Axis */}
        {!isMobile ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 50px", gap: 10, marginTop: 6, paddingTop: 8, borderTop: "1px solid #f0f2f5" }}>
              <div />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {ticks.map((t) => <span key={t} style={{ fontSize: 10, color: "#aeb6c1" }}>{t}</span>)}
              </div>
              <div />
            </div>
            <div style={{ textAlign: "center", fontSize: 11, color: "#9aa3b0", fontWeight: 600, letterSpacing: ".3px", padding: "8px 0 14px" }}>NUMBER OF COMPANIES</div>
          </>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid #f0f2f5" }}>
            {ticksM.map((t) => <span key={t} style={{ fontSize: 10, color: "#aeb6c1" }}>{t}</span>)}
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div style={{ textAlign: "right", padding: "6px 14px", border: "1px solid #eceef2", borderRadius: 8, background: "#fafbfc" }}>
    <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".5px", color: "#9aa3b0", marginTop: 2 }}>{label}</div>
  </div>
);

export { CompaniesByTypeChart };
export default CompaniesByTypeChart;
