import React, { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import TravelExploreOutlined from "@mui/icons-material/TravelExploreOutlined";
import EditOutlined from "@mui/icons-material/EditOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import RestartAltRounded from "@mui/icons-material/RestartAltRounded";
import { ACCESS_SIDEBAR_LAYOUT, AccessLayoutGroup, AccessLayoutNode, layoutLeaves } from "@utils/accessSidebarLayout";
import { SECTION_ICON } from "@hooks/useNavContainers";
import { sectionAccent } from "@components/navigation/NavContainers/navTheme";
import { navIcon } from "@components/navigation/NavContainers/navIcons";
import { AppIcon, T, WtTooltip } from "@app/modules/common/components/ui";

import type { AccessControlProps } from "./accessControlTypes";
import { AdvancedTabsButton, compositeLevel, setCompositeLevel } from "./AccessTabsDialog";
import type { EffLevel } from "./accessControlTypes";
import { SECTION_TABS } from "@utils/sectionTabs";

// Each permission has one icon and one colour — the kit's own (T.color): navy Read, indigo Read all,
// green Write, bronze Commercials. Icon-only squares in the app's tinted-button style (see
// ActionIconButton); the tooltip says what each one does.
const KINDS = {
  read: { name: "Read", Icon: VisibilityOutlined, tone: T.color.brand },
  readAll: { name: "Read all", Icon: TravelExploreOutlined, tone: T.color.indigo },
  write: { name: "Write", Icon: EditOutlined, tone: T.color.success },
  commercial: { name: "Commercials", Icon: PaymentsOutlined, tone: T.color.warning },
} as const;

const EASE = "cubic-bezier(.22,.61,.36,1)";
const OFF = "#64748B"; // slate: an off toggle, tinted like the kit's action buttons

const Toggle: React.FC<{ kind: keyof typeof KINDS; on: boolean; onClick: () => void; disabled?: boolean; tip: string }> = ({ kind, on, onClick, disabled, tip }) => {
  const { name, Icon, tone } = KINDS[kind];
  return (
    <WtTooltip title={<><b>{name}</b> · {on ? "on" : "off"}<br />{tip}</>}>
      <Box
        component="button"
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${name}: ${tip}`}
        disabled={disabled}
        onClick={onClick}
        sx={{
          position: "relative",
          overflow: "hidden",
          width: 32,
          height: 32,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          borderRadius: "9px",
          border: "1px solid",
          // Off reads as clearly as the app's other action buttons — the same tinted square, in slate.
          borderColor: on ? `${tone}5C` : `${OFF}3D`,
          bgcolor: `${OFF}12`,
          color: on ? tone : OFF,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.45 : 1,
          transition: `border-color .5s ${EASE}, color .5s ${EASE}`,
          // The tint spreads out from the centre until it fills the square — slowly, once.
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            bgcolor: `${tone}26`,
            transform: on ? "scale(1)" : "scale(0)",
            opacity: on ? 1 : 0,
            transition: `transform .5s ${EASE}, opacity .4s ${EASE}`,
          },
          "& > svg": { position: "relative" },
          "&:hover:not(:disabled)": { borderColor: `${tone}66`, color: tone },
          "&:focus-visible": { outline: `2px solid ${tone}66`, outlineOffset: 2 },
          "@media (prefers-reduced-motion: reduce)": { transition: "none", "&::before": { transition: "none" } },
        }}
      >
        <Icon sx={{ fontSize: 17 }} />
      </Box>
    </WtTooltip>
  );
};

interface Block {
  group: AccessLayoutGroup;
  open: boolean;
  nodes: Array<{ node: AccessLayoutNode; open: boolean; tabs: AccessLayoutNode[] }>;
}

/**
 * The access editor as cards, grouped like the sidebar: each department with its sidebar tile, each
 * page a card with its sidebar icon and name, and its permissions as toggles — Read, Read all,
 * Write, Commercials — grey while off, in their own gradient once on.
 */
const AccessControlCards: React.FC<AccessControlProps> = ({ levels, customModules, dirtyModules, onSetLevel, onResetToRole, variant = "employee", readOnly = false, recordCells, tabs }) => {
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    ACCESS_SIDEBAR_LAYOUT.forEach((g) => {
      keys.add(g.id);
      g.items.forEach((n) => { if (n.children?.length) keys.add(n.module); });
    });
    return keys;
  }, []);
  // Everything starts open, like the sidebar — cards are compact enough to scan whole.
  const [open, setOpen] = useState<Set<string>>(() => new Set(allKeys));
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const employee = variant === "employee";

  const nodeMatches = useCallback((n: AccessLayoutNode): boolean => n.label.toLowerCase().includes(q) || !!n.children?.some(nodeMatches), [q]);

  const blocks = useMemo(() => {
    const out: Block[] = [];
    for (const group of ACCESS_SIDEBAR_LAYOUT) {
      const groupHit = !!q && group.title.toLowerCase().includes(q);
      const items = q && !groupHit ? group.items.filter(nodeMatches) : group.items;
      if (!items.length) continue;
      out.push({
        group,
        open: q ? true : open.has(group.id),
        nodes: items.map((node) => {
          const showAll = !q || groupHit || node.label.toLowerCase().includes(q);
          return { node, open: q ? true : open.has(node.module), tabs: node.children ? (showAll ? node.children : node.children.filter(nodeMatches)) : [] };
        }),
      });
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

  const chevron = (isOpen: boolean) => (
    <span style={{ width: 16, textAlign: "center", flexShrink: 0, color: "#8893a0", transition: "transform .18s ease", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
      <AppIcon name="bi-chevron-right" className="fs-9" />
    </span>
  );

  const card = (group: AccessLayoutGroup, node: AccessLayoutNode, icon: string, tabOf?: string) => {
    const accent = sectionAccent(group.id);
    const Icon: SvgIconComponent = navIcon(icon);
    // Not a section: who has it is fixed (Roles & Permissions — Admin and above). Shown, never ticked.
    if (node.fixed) {
      return (
        <Box key={node.module} sx={{ display: "flex", flexDirection: "column", gap: 1.25, p: 1.25, borderRadius: "14px", border: "1px dashed", borderColor: "divider", bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.iconWrap}`}>
              <Icon sx={{ fontSize: 18 }} />
            </span>
            <Box sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</Box>
          </Box>
          <WtTooltip title="Set by role tier, not by checkboxes: every Admin and Super Admin has it, nobody else does.">
            <Box component="span" sx={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 0.5, height: 32, px: 1.25, borderRadius: "9px", fontSize: 12, fontWeight: 600, color: "text.secondary", bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
              <AppIcon name="bi-lock" className="fs-7" /> {node.fixed}
            </Box>
          </WtTooltip>
        </Box>
      );
    }
    // A composite card (KPI) stands for its tabs, each a section: its level comes from them, and
    // its Read / Write set them all.
    const kids = node.composite ? node.children ?? [] : null;
    const level = kids ? compositeLevel(kids, levels) : levels[node.module] || "none";
    const setLevel = (l: EffLevel) => (kids ? setCompositeLevel(kids, l, onSetLevel) : onSetLevel(node.module, l));
    const read = level === "view" || level === "edit";
    const write = level === "edit";
    const isCustom = !kids && employee && (customModules?.has(node.module) ?? false);
    const dirty = kids ? kids.some((c) => dirtyModules.has(c.module)) : dirtyModules.has(node.module);
    const rec = recordCells?.[node.module];
    const ring = "0 0 0 3px rgba(37,99,235,0.12)";
    return (
      <Box
        key={node.module}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          p: 1.25,
          borderRadius: "14px",
          border: "1px solid",
          borderColor: dirty ? "primary.main" : "divider",
          bgcolor: "background.paper",
          boxShadow: dirty ? ring : "0 1px 2px rgba(16,24,40,0.04)",
          transition: "border-color .15s ease, box-shadow .15s ease",
          "&:hover": { boxShadow: dirty ? ring : "0 8px 20px -10px rgba(16,24,40,0.25)" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
          <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent.iconWrap}`}>
            <Icon sx={{ fontSize: 18 }} />
          </span>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {tabOf && <Box sx={{ fontSize: 10.5, color: "text.secondary", fontWeight: 600, lineHeight: 1.2 }}>{tabOf}</Box>}
            <Box sx={{ fontSize: 13, fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.label}</Box>
            {isCustom && (
              <Box component="span" sx={{ display: "inline-block", mt: 0.25, fontSize: 9.5, fontWeight: 700, color: "primary.main", bgcolor: "action.selected", borderRadius: 999, px: 1, py: "1px", textTransform: "uppercase", letterSpacing: ".4px" }}>
                Custom
              </Box>
            )}
          </Box>
          {/* Card actions, top-right: reset to role, and the section's tabs (Advanced). */}
          <Box sx={{ display: "flex", gap: 0.5, alignSelf: "flex-start", flexShrink: 0 }}>
            {isCustom && !readOnly && (
              <WtTooltip title="Reset to role">
                <Box
                  component="button"
                  type="button"
                  aria-label={`Reset ${node.label} to role`}
                  onClick={() => onResetToRole?.(node.module)}
                  sx={{
                    width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "8px", cursor: "pointer",
                    border: `1px solid ${OFF}3D`, bgcolor: `${OFF}12`, color: OFF,
                    transition: "border-color .2s ease, color .2s ease",
                    "&:hover": { borderColor: `${T.color.brand}66`, color: T.color.brand },
                  }}
                >
                  <RestartAltRounded sx={{ fontSize: 16 }} />
                </Box>
              </WtTooltip>
            )}
            {((tabs && SECTION_TABS[node.module]) || kids) && (
              <AdvancedTabsButton
                compact section={node.module} label={node.label} icon={icon} level={level} readOnly={readOnly}
                tabs={tabs} composite={kids ? { children: kids, levels, onSetLevel } : undefined}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.625 }}>
          <Toggle kind="read" on={read} disabled={readOnly} tip={`Open ${node.label} and see what is in it`} onClick={() => setLevel(read ? "none" : "view")} />
          {employee && rec && <Toggle kind="readAll" on={rec.readAll.checked} disabled={readOnly || rec.readAll.disabled} tip={rec.readAll.title ?? "Read all"} onClick={rec.readAll.onChange} />}
          <Toggle kind="write" on={write} disabled={readOnly} tip={`Add, edit and delete in ${node.label} (turns Read on too)`} onClick={() => setLevel(write ? "view" : "edit")} />
          {employee && rec && <Toggle kind="commercial" on={rec.commercial.checked} disabled={readOnly || rec.commercial.disabled} tip={rec.commercial.title ?? "Commercials"} onClick={rec.commercial.onChange} />}
        </Box>
      </Box>
    );
  };

  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 1.25 } as const;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
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

      {blocks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 16px", color: "#aab2bd", fontSize: 13 }}>No sections match “{query}”.</div>
      ) : (
        blocks.map(({ group, open: groupOpen, nodes }) => {
          const accent = sectionAccent(group.id);
          const GroupIcon = navIcon(SECTION_ICON[group.id]);
          const leaves = group.items.flatMap(layoutLeaves);
          const openCount = leaves.filter(isOpenLevel).length;
          return (
            <Box key={group.id} sx={{ mt: 2 }}>
              {/* Department header — the sidebar's tile, and how much of it this person gets */}
              <Box
                onClick={() => { if (!q) toggle(group.id); }}
                sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.25, cursor: q ? "default" : "pointer", userSelect: "none" }}
              >
                {!q && chevron(groupOpen)}
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.iconWrap}`}>
                  <GroupIcon sx={{ fontSize: 18 }} />
                </span>
                <Box sx={{ fontWeight: 700, fontSize: 14.5, color: "text.primary" }}>{group.title}</Box>
                {leaves.length > 0 && (
                  <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: openCount ? "text.secondary" : "text.disabled", bgcolor: "action.hover", borderRadius: 999, px: 1, py: "2px" }}>
                    {openCount}/{leaves.length} open
                  </Box>
                )}
              </Box>

              {groupOpen && (
                <>
                  <Box sx={grid}>{nodes.filter((n) => !n.node.children?.length || n.node.composite).map((n) => card(group, n.node, n.node.icon))}</Box>
                  {/* Modules with tabs (Billing, Recruitment, KPI): their tabs as cards, like the sidebar's submenus */}
                  {nodes.filter((n) => n.node.children?.length && !n.node.composite).map(({ node, open: nodeOpen, tabs }) => {
                    const tabsOpen = node.children!.filter((c) => isOpenLevel(c.module)).length;
                    const NodeIcon = navIcon(node.icon);
                    return (
                      <Box key={node.module} sx={{ mt: 1.75, pl: 1 }}>
                        <Box
                          onClick={() => { if (!q) toggle(node.module); }}
                          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, cursor: q ? "default" : "pointer", userSelect: "none" }}
                        >
                          {!q && chevron(nodeOpen)}
                          <NodeIcon className={accent.icon} sx={{ fontSize: 17 }} />
                          <Box sx={{ fontWeight: 600, fontSize: 13, color: "text.primary" }}>{node.label}</Box>
                          <Box component="span" sx={{ fontSize: 11, color: "text.secondary" }}>{tabsOpen}/{node.children!.length}</Box>
                        </Box>
                        {nodeOpen && <Box sx={grid}>{tabs.map((t) => card(group, t, node.icon, node.label))}</Box>}
                      </Box>
                    );
                  })}
                </>
              )}
            </Box>
          );
        })
      )}
    </div>
  );
};

export default AccessControlCards;
