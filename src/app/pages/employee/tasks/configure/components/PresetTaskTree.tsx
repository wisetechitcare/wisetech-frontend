
import React, { useMemo, useState, useCallback } from "react";
import { Tooltip } from "@mui/material";

/**
 * PresetTaskTree
 * ------------------------------------------------------------------
 * The Company Type → Service explorer, applied to preset tasks:
 *   Preset Task → Sub-task   (2 levels)
 *
 * Under the hood both levels are the SAME table (`preset_tasks`), told apart by
 * `parentId`:
 *   - Preset Task  → a row with parentId = null   (a "main" task)
 *   - Sub-task     → a row with parentId set      [created via onAddSubTask]
 *
 * Robustness (never-vanish): nothing is ever filtered out.
 *  - A "grandchild" task, or one whose parent is missing/inactive, is PROMOTED to a
 *    top-level row rather than disappearing from the list.
 */

const ACCENT = "#1E3A8A";

// Row-action palette — each action a distinct hue.
const ACTION = {
  subTask: "#1f7a4d", // green — add Sub-task
  edit: "#2f6fb3",    // blue — edit
  remove: "#c0392b",  // red — delete
};

// Preset tasks carry no colour column, so each main task gets a stable hue derived
// from its id — the same task keeps the same dot across reloads.
const PALETTE = ["#1E3A8A", "#1f7a4d", "#b4771a", "#c13f6b", "#6b5ad1", "#2f7cc2", "#0f766e", "#9a3412"];
const colorForId = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export interface PresetTaskRow {
  id: string;
  name: string;
  color?: string | null;
  parentId?: string | null;
}

// Generic over the caller's own row type so the edit callback hands back the very
// object that was passed in (a ProjectItem here), not a narrowed copy.
interface Props<T extends PresetTaskRow> {
  presetTasks: T[];
  // "Add Sub-task" — creates a preset task row under the given main task.
  onAddSubTask: (parentId: string) => void;
  onEditTask: (task: T) => void;
  onDeleteTask: (id: string) => void;
}

type Kind = "task" | "subtask";
interface TNode<T extends PresetTaskRow> {
  key: string;
  kind: Kind;
  id: string;
  name: string;
  color?: string | null;
  entity: T;
  children: TNode<T>[];
  isMainTask?: boolean;
}

const byName = (a: { name?: string }, b: { name?: string }) =>
  (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });

// hex (#rrggbb) → rgba string, so we can derive soft tints from a single accent color.
const hexToRgba = (hex: string, a: number): string => {
  try {
    const m = hex.replace("#", "");
    if (m.length === 3) {
      const r = parseInt(m.charAt(0) + m.charAt(0), 16);
      const g = parseInt(m.charAt(1) + m.charAt(1), 16);
      const b = parseInt(m.charAt(2) + m.charAt(2), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    const r = parseInt(m.substring(0, 2), 16) || 0;
    const g = parseInt(m.substring(2, 4), 16) || 0;
    const b = parseInt(m.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch (e) {
    return `rgba(154, 160, 173, ${a})`;
  }
};

const IconBtn: React.FC<{ icon: string; title: string; color: string; onClick: (e: React.MouseEvent) => void }> = ({ icon, title, color, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    // Tooltip rather than a raw `title`: the native one is browser chrome, so it ignores the
    // app's styling and its own delay. aria-label stays — Tooltip is not an accessible name.
    <Tooltip title={title} arrow placement="top">
    <button
      type="button"
      aria-label={title}
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: hov ? hexToRgba(color, 0.24) : hexToRgba(color, 0.12),
        border: `1px solid ${hov ? color : hexToRgba(color, 0.32)}`,
        borderRadius: 8,
        cursor: "pointer",
        color,
        boxShadow: hov ? `0 3px 8px ${hexToRgba(color, 0.3)}` : "none",
        transform: hov ? "translateY(-1px)" : "none",
        transition: "all .15s ease",
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 13, lineHeight: 1 }} />
    </button>
    </Tooltip>
  );
};

function PresetTaskTree<T extends PresetTaskRow>({ presetTasks, onAddSubTask, onEditTask, onDeleteTask }: Props<T>) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // ── Build the tree (with orphan promotion) ────────────────────────────────
  const tree = useMemo<TNode<T>[]>(() => {
    const taskById = new Map(presetTasks.map((t) => [t.id, t]));

    // A genuine sub-task: its parent exists and is itself a main task. Anything else
    // (no parent, missing parent, or a grandchild) is promoted to a top-level row.
    const isSubTask = (t: T) => {
      if (!t.parentId) return false;
      const p = taskById.get(t.parentId);
      return !!p && !p.parentId;
    };

    const subTasksByParent = new Map<string, T[]>();
    presetTasks.forEach((t) => {
      if (isSubTask(t)) {
        const arr = subTasksByParent.get(t.parentId!) || [];
        arr.push(t);
        subTasksByParent.set(t.parentId!, arr);
      }
    });

    const mainTasks = presetTasks.filter((t) => !isSubTask(t)).slice().sort(byName);

    const node = (t: T, main: boolean): TNode<T> => ({
      key: `pt-${t.id}`,
      kind: main ? "task" : "subtask",
      id: t.id,
      name: t.name,
      color: t.color || colorForId(t.id),
      entity: t,
      isMainTask: main,
      children: main
        ? (subTasksByParent.get(t.id) || []).slice().sort(byName).map((c) => node(c, false))
        : [],
    });

    return mainTasks.map((t) => node(t, true));
  }, [presetTasks]);

  const matches = useCallback((n: TNode<T>): boolean => n.name.toLowerCase().includes(q) || n.children.some(matches), [q]);

  const expandableKeys = useMemo(() => {
    const keys = new Set<string>();
    const w = (ns: TNode<T>[]) => ns.forEach((n) => { if (n.children.length) { keys.add(n.key); w(n.children); } });
    w(tree);
    return keys;
  }, [tree]);

  const flat = useMemo(() => {
    const rows: { node: TNode<T>; depth: number; open: boolean; hasChildren: boolean }[] = [];
    const walk = (nodes: TNode<T>[], depth: number) => {
      nodes.forEach((n) => {
        if (q && !matches(n)) return;
        const hasChildren = n.children.length > 0;
        const open = q ? true : expanded.has(n.key);
        rows.push({ node: n, depth, open, hasChildren });
        if (hasChildren && open) walk(n.children, depth + 1);
      });
    };
    walk(tree, 0);
    return rows;
  }, [tree, expanded, q, matches]);

  const toggle = (key: string) => setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const expandAll = () => setExpanded(new Set(expandableKeys));
  const collapseAll = () => setExpanded(new Set());
  const allExpanded = expandableKeys.size > 0 && Array.from(expandableKeys).every((k) => expanded.has(k));
  const allCollapsed = expanded.size === 0;

  // Labels: top row = "task", child row = "sub-task".
  const kindLabel = (n: TNode<T>) => (n.isMainTask ? "task" : "sub-task");

  const toolBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8,
    border: `1px solid ${active ? ACCENT : "#dde2e8"}`, background: active ? "#f3f5fb" : "#fff",
    color: active ? ACCENT : "#46505d", fontWeight: 500, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <i className="bi bi-search" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#aab2bd" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks & sub-tasks…"
            style={{ width: "100%", height: 36, border: "1px solid #dde2e8", borderRadius: 8, padding: "0 30px 0 32px", fontSize: 13, outline: "none", color: "#1f2733", boxSizing: "border-box" }}
          />
          {query && (
            <Tooltip title="Clear" arrow placement="top">
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab2bd" }}>
                <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
              </button>
            </Tooltip>
          )}
        </div>
        <button type="button" onClick={expandAll} disabled={allExpanded || !!q} style={{ ...toolBtn(false), opacity: allExpanded || !!q ? 0.55 : 1, cursor: allExpanded || !!q ? "not-allowed" : "pointer" }}>
          <i className="bi bi-arrows-expand" /> Expand all
        </button>
        <button type="button" onClick={collapseAll} disabled={allCollapsed || !!q} style={{ ...toolBtn(false), opacity: allCollapsed || !!q ? 0.55 : 1, cursor: allCollapsed || !!q ? "not-allowed" : "pointer" }}>
          <i className="bi bi-arrows-collapse" /> Collapse all
        </button>
      </div>

      {/* Tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {flat.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 16px", color: "#aab2bd", fontSize: 13 }}>
            {query
              ? `No tasks or sub-tasks match “${query}”.`
              : "No preset tasks configured yet."}
          </div>
        ) : (
          flat.map(({ node, depth, open, hasChildren }) => {
            const color = node.color || "#9aa0ad";
            const isTop = depth === 0;
            const isHovered = hovered === node.key;

            // Soft backgrounds and borders based on the row colour, for brand harmony.
            const tintBg = hexToRgba(color, isTop ? 0.035 : 0.02);
            const tintHoverBg = hexToRgba(color, isTop ? 0.07 : 0.05);
            const tintBorder = hexToRgba(color, isTop ? 0.12 : 0.08);

            return (
              <div
                key={node.key}
                onMouseEnter={() => setHovered(node.key)}
                onMouseLeave={() => setHovered((h) => (h === node.key ? null : h))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: isTop ? "10px 14px" : "8px 12px",
                  marginLeft: depth * 24,
                  borderRadius: isTop ? 8 : 6,
                  transition: "all 0.15s ease",
                  marginBottom: isTop ? 6 : 4,
                  cursor: "default",
                  background: isHovered ? tintHoverBg : tintBg,
                  border: `1px solid ${tintBorder}`,
                  borderLeft: `${isTop ? "4px" : "3px"} solid ${color}`,
                  boxShadow: isHovered ? "0 2px 5px rgba(0, 0, 0, 0.04)" : "0 1px 2px rgba(0, 0, 0, 0.015)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <span
                    onClick={() => hasChildren && toggle(node.key)}
                    style={{ width: 16, textAlign: "center", flexShrink: 0, color: "#8893a0", cursor: hasChildren ? "pointer" : "default", transition: "transform .18s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)", visibility: hasChildren ? "visible" : "hidden" }}
                  >
                    <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
                  </span>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: isTop ? `0 0 0 2px ${color}28` : "none" }} />
                  <span style={{ fontWeight: isTop ? 600 : 400, fontSize: isTop ? 13.5 : 12.5, color: "#1f2733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {node.name}
                  </span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: node.isMainTask ? ACCENT : "#656f7d",
                    background: node.isMainTask ? hexToRgba(ACCENT, 0.08) : "#f1f3f5",
                    padding: "2px 6px",
                    borderRadius: 4,
                    textTransform: "uppercase",
                    letterSpacing: ".5px",
                    flexShrink: 0
                  }}>{kindLabel(node)}</span>
                  {hasChildren && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: hexToRgba(color, 0.08),
                      color: color,
                      borderRadius: 999,
                      padding: "1px 6px",
                      minWidth: 18,
                      height: 18,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>{node.children.length}</span>
                  )}
                </div>

                {/* Row actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {/* Main task → add a Sub-task under it. */}
                  {node.isMainTask && (
                    <IconBtn icon="bi-diagram-3" title="Add sub-task" color={ACTION.subTask} onClick={() => onAddSubTask(node.id)} />
                  )}
                  <IconBtn icon="bi-pencil" title={node.isMainTask ? "Edit task" : "Edit sub-task"} color={ACTION.edit} onClick={() => onEditTask(node.entity)} />
                  <IconBtn icon="bi-trash" title={node.isMainTask ? "Delete task" : "Delete sub-task"} color={ACTION.remove} onClick={() => onDeleteTask(node.id)} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PresetTaskTree;
