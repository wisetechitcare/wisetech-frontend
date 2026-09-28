import React, { useCallback, useMemo, useState } from "react";
import { ACCESS_SIDEBAR_LAYOUT, AccessLayoutGroup, AccessLayoutNode, layoutLeaves } from "@utils/accessSidebarLayout";
import { SECTION_ICON } from "@hooks/useNavContainers";
import { sectionAccent } from "@components/navigation/NavContainers/navTheme";
import { navIcon } from "@components/navigation/NavContainers/navIcons";
import { AppIcon, WtTooltip } from "@app/modules/common/components/ui";
import type { AccessControlProps } from "./accessControlTypes";
import { AdvancedTabsButton, compositeLevel, setCompositeLevel } from "./AccessTabsDialog";
import type { EffLevel } from "./accessControlTypes";
import { SECTION_TABS } from "@utils/sectionTabs";

const ACCENT = "#1E3A8A";

// Every checkbox sits in a fixed-width cell under its column heading, so the columns line up.
const CELL = 84;
const ACTION = 28;

/** A bare checkbox — its column heading names it. */
const Checkbox: React.FC<{ checked: boolean; onChange: () => void; disabled?: boolean; title?: string }> = ({ checked, onChange, disabled, title }) => (
  <WtTooltip title={title}>
    <label style={{ display: "inline-flex", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, margin: 0 }}>
      <input
        type="checkbox"
        aria-label={title}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ width: 17, height: 17, accentColor: ACCENT, cursor: "inherit", margin: 0 }}
      />
    </label>
  </WtTooltip>
);

const Cell: React.FC<{ children?: React.ReactNode; width?: number }> = ({ children, width = CELL }) => (
  <div style={{ width, flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>{children}</div>
);

type Row =
  | { kind: "group"; key: string; group: AccessLayoutGroup; open: boolean }
  | { kind: "node"; key: string; group: AccessLayoutGroup; node: AccessLayoutNode; depth: number; open: boolean };

/**
 * The access editor as a table, shaped like the sidebar: each department with its icon and colour,
 * its pages under it with their sidebar icons and names, modules with tabs (Billing, Recruitment,
 * KPI) opening like their sidebar menus. Read / Read all / Write / Commercials line up in columns.
 */
const AccessControlTable: React.FC<AccessControlProps> = ({ levels, customModules, dirtyModules, onSetLevel, onResetToRole, variant = "employee", readOnly = false, recordCells, tabs }) => {
  // Departments start open, like the sidebar; modules with tabs start closed.
  const [open, setOpen] = useState<Set<string>>(() => new Set(ACCESS_SIDEBAR_LAYOUT.map((g) => g.id)));
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const employee = variant === "employee";

  const nodeMatches = useCallback((n: AccessLayoutNode): boolean => n.label.toLowerCase().includes(q) || !!n.children?.some(nodeMatches), [q]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    ACCESS_SIDEBAR_LAYOUT.forEach((g) => {
      keys.add(g.id);
      g.items.forEach((n) => { if (n.children?.length) keys.add(n.module); });
    });
    return keys;
  }, []);

  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const group of ACCESS_SIDEBAR_LAYOUT) {
      const groupHit = !!q && group.title.toLowerCase().includes(q);
      const items = q && !groupHit ? group.items.filter(nodeMatches) : group.items;
      if (!items.length) continue;
      const groupOpen = q ? true : open.has(group.id);
      out.push({ kind: "group", key: group.id, group, open: groupOpen });
      if (!groupOpen) continue;
      for (const node of items) {
        const nodeOpen = q ? true : open.has(node.module);
        out.push({ kind: "node", key: node.module, group, node, depth: 1, open: nodeOpen });
        if (node.children?.length && !node.composite && nodeOpen) {
          const showAll = !q || groupHit || node.label.toLowerCase().includes(q);
          const tabs = showAll ? node.children : node.children.filter(nodeMatches);
          tabs.forEach((c) => out.push({ kind: "node", key: c.module, group, node: c, depth: 2, open: false }));
        }
      }
    }
    return out;
  }, [open, q, nodeMatches]);

  const toggle = (key: string) => setOpen((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const allExpanded = Array.from(allKeys).every((k) => open.has(k));
  const allCollapsed = open.size === 0;
  const isOpenLevel = (m: string) => (levels[m] || "none") !== "none";

  const toolBtn = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8,
    border: "1px solid rgba(100,116,139,0.28)", background: "transparent", color: "inherit", fontWeight: 500, fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
  });

  const columns = employee ? ["Read", "Read all", "Write", "Commercials"] : ["Read", "Write"];
  const rowPad = (depth: number): React.CSSProperties => ({ padding: "7px 10px", paddingLeft: 10 + depth * 22 });
  const chevron = (isOpen: boolean, visible = true) => (
    <span style={{ width: 16, textAlign: "center", flexShrink: 0, color: "#8893a0", transition: "transform .18s ease", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)", visibility: visible ? "visible" : "hidden" }}>
      <AppIcon name="bi-chevron-right" className="fs-9" />
    </span>
  );

  const leafControls = (module: string, label: string, kids?: AccessLayoutNode[]) => {
    // A composite row (KPI) stands for its tabs, each a section: its level comes from them, and its
    // Read / Write set them all.
    const level = kids ? compositeLevel(kids, levels) : levels[module] || "none";
    const setLevel = (l: EffLevel) => (kids ? setCompositeLevel(kids, l, onSetLevel) : onSetLevel(module, l));
    const read = level === "view" || level === "edit";
    const write = level === "edit";
    const isCustom = !kids && (customModules?.has(module) ?? false);
    const rec = recordCells?.[module];
    return (
      <div style={{ display: "flex", alignItems: "center" }}>
        <Cell><Checkbox title={`Read ${label}`} checked={read} disabled={readOnly} onChange={() => setLevel(read ? "none" : "view")} /></Cell>
        {employee && <Cell>{rec && <Checkbox {...rec.readAll} disabled={readOnly || rec.readAll.disabled} />}</Cell>}
        <Cell><Checkbox title={`Write ${label}`} checked={write} disabled={readOnly} onChange={() => setLevel(write ? "view" : "edit")} /></Cell>
        {employee && <Cell>{rec && <Checkbox {...rec.commercial} disabled={readOnly || rec.commercial.disabled} />}</Cell>}
        {employee && (
          <Cell width={ACTION}>
            {isCustom && !readOnly && (
              <WtTooltip title="Reset to role">
                <button
                  type="button"
                  aria-label={`Reset ${label} to role`}
                  onClick={() => onResetToRole?.(module)}
                  style={{ border: "none", background: "transparent", color: "#8893a0", cursor: "pointer", padding: 4, borderRadius: 6, display: "inline-flex" }}
                >
                  <AppIcon name="bi-arrow-counterclockwise" className="fs-7" />
                </button>
              </WtTooltip>
            )}
          </Cell>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <AppIcon name="bi-search" className="fs-7" color="#aab2bd" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections…"
            style={{ width: "100%", height: 36, border: "1px solid rgba(100,116,139,0.28)", borderRadius: 8, padding: "0 30px 0 32px", fontSize: 13, outline: "none", color: "inherit", background: "transparent", boxSizing: "border-box" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab2bd" }}>
              <AppIcon name="bi-x-lg" className="fs-8" />
            </button>
          )}
        </div>
        <button type="button" onClick={() => setOpen(new Set(allKeys))} disabled={allExpanded || !!q} style={toolBtn(allExpanded || !!q)}>
          <AppIcon name="bi-arrows-expand" /> Expand all
        </button>
        <button type="button" onClick={() => setOpen(new Set())} disabled={allCollapsed || !!q} style={toolBtn(allCollapsed || !!q)}>
          <AppIcon name="bi-arrows-collapse" /> Collapse all
        </button>
      </div>

      {/* Column headings — the checkboxes below carry no labels of their own. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, ...rowPad(0), borderBottom: "1px solid rgba(100,116,139,0.18)" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: "#8893a0" }}>Section</span>
        <div style={{ display: "flex", alignItems: "center" }}>
          {columns.map((c) => (
            <Cell key={c}><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#8893a0", whiteSpace: "nowrap" }}>{c}</span></Cell>
          ))}
          {employee && <Cell width={ACTION} />}
        </div>
      </div>

      {/* Departments and their pages, as on the sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 4 }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 16px", color: "#aab2bd", fontSize: 13 }}>No sections match “{query}”.</div>
        ) : (
          rows.map((row) => {
            const accent = sectionAccent(row.group.id);
            if (row.kind === "group") {
              const leaves = row.group.items.flatMap(layoutLeaves);
              const openCount = leaves.filter(isOpenLevel).length;
              const GroupIcon = navIcon(SECTION_ICON[row.group.id]);
              return (
                <div
                  key={row.key}
                  onClick={() => { if (!q) toggle(row.key); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px 6px", marginTop: 6, cursor: q ? "default" : "pointer", userSelect: "none" }}
                >
                  {chevron(row.open, !q)}
                  {/* Same glyph and tile as the sidebar's application rail (AppTile). */}
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.iconWrap}`}>
                    <GroupIcon sx={{ fontSize: 18 }} />
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{row.group.title}</span>
                  {leaves.length > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: openCount ? "#46505d" : "#aab2bd", background: "rgba(100,116,139,0.1)", borderRadius: 999, padding: "2px 8px" }}>
                      {openCount}/{leaves.length} open
                    </span>
                  )}
                </div>
              );
            }
            const { node, depth } = row;
            const kids = node.composite ? node.children ?? [] : undefined;
            const hasTabs = !!node.children?.length && !kids; // a composite row is set, not expanded
            const dirty = kids ? kids.some((c) => dirtyModules.has(c.module)) : !hasTabs && dirtyModules.has(node.module);
            const isCustom = !hasTabs && !kids && employee && (customModules?.has(node.module) ?? false);
            const tabsOpen = hasTabs ? node.children!.filter((c) => isOpenLevel(c.module)).length : 0;
            const Icon = navIcon(node.icon === "bi-dot" ? undefined : node.icon);
            return (
              <div
                key={row.key}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, ...rowPad(depth), borderRadius: 8, background: dirty ? "rgba(37,99,235,0.07)" : "transparent", transition: "background .12s ease" }}
                onMouseEnter={(e) => { if (!dirty) (e.currentTarget as HTMLElement).style.background = "rgba(100,116,139,0.08)"; }}
                onMouseLeave={(e) => { if (!dirty) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, cursor: hasTabs ? "pointer" : "default" }}
                  onClick={() => { if (hasTabs && !q) toggle(node.module); }}
                >
                  {chevron(row.open, hasTabs)}
                  {node.icon === "bi-dot"
                    // A module's tab: a bullet in the department's colour, as in a sidebar menu.
                    ? <span className={accent.icon} style={{ width: 17, display: "inline-flex", justifyContent: "center", flexShrink: 0 }}><span style={{ width: 5, height: 5, borderRadius: 999, background: "currentColor" }} /></span>
                    : <Icon className={`shrink-0 ${accent.icon}`} sx={{ fontSize: 17 }} />}
                  <span style={{ fontWeight: hasTabs ? 600 : 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {node.label}
                  </span>
                  {hasTabs && <span style={{ fontSize: 11, color: "#8893a0" }}>{tabsOpen}/{node.children!.length}</span>}
                  {((tabs && SECTION_TABS[node.module]) || kids) && (
                    <span onClick={(e) => e.stopPropagation()}>
                      <AdvancedTabsButton
                        section={node.module} label={node.label} icon={node.icon} readOnly={readOnly}
                        level={kids ? compositeLevel(kids, levels) : levels[node.module] || "none"}
                        tabs={tabs} composite={kids ? { children: kids, levels, onSetLevel } : undefined}
                      />
                    </span>
                  )}
                  {isCustom && (
                    <span style={{ fontSize: 9.5, fontWeight: 600, color: ACCENT, background: "rgba(37,99,235,0.1)", borderRadius: 999, padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".4px", flexShrink: 0 }}>Custom</span>
                  )}
                </div>
                {node.fixed ? (
                  // Not a section: who has it is fixed (Roles & Permissions — Admin and above).
                  <WtTooltip title="Set by role tier, not by checkboxes: every Admin and Super Admin has it, nobody else does.">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#64748B", background: "rgba(100,116,139,0.1)", border: "1px solid rgba(100,116,139,0.22)", borderRadius: 8, padding: "3px 10px", marginRight: 8 }}>
                      <AppIcon name="bi-lock" className="fs-8" /> {node.fixed}
                    </span>
                  </WtTooltip>
                ) : !hasTabs && leafControls(node.module, node.label, kids)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AccessControlTable;
