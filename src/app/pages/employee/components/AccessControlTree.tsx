import React, { useCallback, useMemo, useState } from "react";
import { ACCESS_AREAS, AccessArea } from "@utils/accessAreas";
import LiveCountdown from "./LiveCountdown";

const ACCENT = "#9D4141";

const hexToRgba = (hex: string, a: number): string => {
  const m = hex.replace("#", "");
  return `rgba(${parseInt(m.substring(0, 2), 16)}, ${parseInt(m.substring(2, 4), 16)}, ${parseInt(m.substring(4, 6), 16)}, ${a})`;
};

// A small accent pill used for the timer presets.
const Chip: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: "4px 14px",
        borderRadius: 999,
        cursor: "pointer",
        color: hov ? "#fff" : ACCENT,
        background: hov ? ACCENT : hexToRgba(ACCENT, 0.1),
        border: `1px solid ${hov ? ACCENT : hexToRgba(ACCENT, 0.28)}`,
        transition: "all .12s ease",
      }}
    >
      {label}
    </button>
  );
};

// Effective access shown by the checkboxes. "none" = no access (both unticked).
export type EffLevel = "view" | "edit" | "none";

interface Props {
  /** Desired effective level per leaf module (seeded from the employee's effective access). */
  levels: Record<string, EffLevel>;
  /** Modules whose staged state differs from the saved baseline (for highlight). */
  dirtyModules: Set<string>;
  onSetLevel: (module: string, level: EffLevel) => void;
  /**
   * "employee" (default): per-person override editor — supports timed expiry,
   * the CUSTOM/INHERITED badge, "Reset to role", and shows "Blocked" for none.
   * "role": role-level grant editor — Read/Write only; none = simply not granted.
   */
  variant?: "employee" | "role";
  /** Expiry (ISO) per leaf module, or null. Only used in "employee" variant. */
  expiries?: Record<string, string | null>;
  /** Modules with an explicit override (CUSTOM badge). Only "employee" variant. */
  customModules?: Set<string>;
  onSetExpiry?: (module: string, iso: string | null) => void;
  onResetToRole?: (module: string) => void;
}

interface TNode {
  key: string;
  module: string;
  label: string;
  children: TNode[];
}

const toNode = (a: AccessArea): TNode => ({
  key: a.module,
  module: a.module,
  label: a.label,
  children: (a.children || []).map(toNode),
});

const PRESETS: Array<{ label: string; ms: number }> = [
  { label: "1h", ms: 3600_000 },
  { label: "8h", ms: 8 * 3600_000 },
  { label: "1d", ms: 24 * 3600_000 },
  { label: "7d", ms: 7 * 24 * 3600_000 },
];

// Local-datetime string for <input type="datetime-local"> from an ISO/now+ms.
const toLocalInput = (ms: number): string => {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const Checkbox: React.FC<{ checked: boolean; label: string; onChange: () => void; disabled?: boolean }> = ({ checked, label, onChange, disabled }) => (
  <label className="d-flex align-items-center" style={{ gap: 6, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontWeight: 600, fontSize: 12.5, color: checked ? ACCENT : "#46505d", userSelect: "none" }}>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ width: 16, height: 16, accentColor: ACCENT, cursor: disabled ? "not-allowed" : "pointer" }} />
    {label}
  </label>
);

// One controllable leaf row: Read/Write checkboxes + optional expiry/timer.
const LeafControls: React.FC<{
  module: string;
  level: EffLevel;
  expiry: string | null;
  isCustom: boolean;
  variant: "employee" | "role";
  onSetLevel: Props["onSetLevel"];
  onSetExpiry?: Props["onSetExpiry"];
  onResetToRole?: Props["onResetToRole"];
}> = ({ module, level, expiry, isCustom, variant, onSetLevel, onSetExpiry, onResetToRole }) => {
  const [timerOpen, setTimerOpen] = useState(false);
  const read = level === "view" || level === "edit";
  const write = level === "edit";

  const toggleRead = () => onSetLevel(module, read ? "none" : "view");
  const toggleWrite = () => onSetLevel(module, write ? "view" : "edit");

  const applyPreset = (ms: number) => { onSetExpiry?.(module, new Date(Date.now() + ms).toISOString()); setTimerOpen(false); };
  const applyCustom = (val: string) => {
    if (!val) return;
    const t = new Date(val).getTime();
    if (Number.isNaN(t) || t <= Date.now()) return; // must be in the future
    onSetExpiry?.(module, new Date(t).toISOString());
    setTimerOpen(false);
  };

  return (
    <div className="d-flex align-items-center flex-wrap" style={{ gap: 14 }}>
      <Checkbox checked={read} label="Read" onChange={toggleRead} />
      <Checkbox checked={write} label="Write" onChange={toggleWrite} />

      {variant === "role" ? (
        level === "none" ? (
          <span className="text-muted fs-9"><i className="bi bi-dash-circle me-1" />Not granted</span>
        ) : null
      ) : level === "none" ? (
        <span className="badge badge-light-danger fs-9"><i className="bi bi-eye-slash me-1" />Blocked</span>
      ) : (
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          {expiry ? (
            <>
              <LiveCountdown expiresAt={expiry} />
              <button
                type="button"
                title="Change timer"
                onClick={() => setTimerOpen((o) => !o)}
                style={{ border: "none", background: "transparent", color: ACCENT, cursor: "pointer", padding: 2, display: "inline-flex" }}
              >
                <i className="bi bi-pencil-square" style={{ fontSize: 13 }} />
              </button>
              <button
                type="button"
                title="Remove timer"
                onClick={() => onSetExpiry?.(module, null)}
                style={{ border: "none", background: "transparent", color: "#aab2bd", cursor: "pointer", padding: 2, display: "inline-flex" }}
              >
                <i className="bi bi-x-circle" style={{ fontSize: 13 }} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setTimerOpen((o) => !o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
                padding: "4px 12px", borderRadius: 999, cursor: "pointer", color: ACCENT,
                background: timerOpen ? hexToRgba(ACCENT, 0.12) : "transparent",
                border: `1px dashed ${hexToRgba(ACCENT, 0.45)}`,
              }}
            >
              <i className="bi bi-hourglass-split" style={{ fontSize: 12 }} />
              Set timer
            </button>
          )}
        </div>
      )}

      {variant === "employee" && isCustom && (
        <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none text-muted" style={{ fontSize: 12 }} onClick={() => onResetToRole?.(module)}>
          <i className="bi bi-arrow-counterclockwise me-1" />Reset to role
        </button>
      )}

      {variant === "employee" && timerOpen && level !== "none" && (
        <div
          className="w-100 mt-2"
          style={{ background: "#fbf7f7", border: `1px solid ${hexToRgba(ACCENT, 0.2)}`, borderRadius: 10, padding: "12px 14px" }}
        >
          <div className="d-flex align-items-center justify-content-between mb-2">
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: ACCENT }}>
              <i className="bi bi-hourglass-split me-1" />Grant access for
            </span>
            <button
              type="button"
              onClick={() => { onSetExpiry?.(module, null); setTimerOpen(false); }}
              style={{ border: "none", background: "transparent", color: "#8893a0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              No expiry
            </button>
          </div>
          <div className="d-flex align-items-center flex-wrap" style={{ gap: 7 }}>
            {PRESETS.map((p) => (
              <Chip key={p.label} label={p.label} onClick={() => applyPreset(p.ms)} />
            ))}
            <span style={{ fontSize: 12, color: "#aab2bd", margin: "0 2px" }}>or</span>
            <input
              type="datetime-local"
              className="form-control form-control-sm"
              style={{ width: 210, fontSize: 12, borderColor: hexToRgba(ACCENT, 0.3), borderRadius: 8 }}
              min={toLocalInput(Date.now() + 60_000)}
              defaultValue={expiry ? toLocalInput(new Date(expiry).getTime()) : ""}
              onChange={(e) => applyCustom(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AccessControlTree: React.FC<Props> = ({ levels, expiries, customModules, dirtyModules, onSetLevel, onSetExpiry, onResetToRole, variant = "employee" }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const tree = useMemo(() => ACCESS_AREAS.map(toNode), []);

  const matches = useCallback((n: TNode): boolean => n.label.toLowerCase().includes(q) || n.children.some(matches), [q]);

  const expandableKeys = useMemo(() => {
    const keys = new Set<string>();
    const w = (ns: TNode[]) => ns.forEach((n) => { if (n.children.length) { keys.add(n.key); w(n.children); } });
    w(tree);
    return keys;
  }, [tree]);

  const flat = useMemo(() => {
    const rows: { node: TNode; depth: number; open: boolean; hasChildren: boolean }[] = [];
    const walk = (nodes: TNode[], depth: number) => {
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

  const toolBtn = (disabled: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8,
    border: "1px solid #dde2e8", background: "#fff", color: "#46505d", fontWeight: 500, fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, whiteSpace: "nowrap",
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
            placeholder="Search sections…"
            style={{ width: "100%", height: 36, border: "1px solid #dde2e8", borderRadius: 8, padding: "0 30px 0 32px", fontSize: 13, outline: "none", color: "#1f2733", boxSizing: "border-box" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} title="Clear" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab2bd" }}>
              <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
        <button type="button" onClick={expandAll} disabled={allExpanded || !!q} style={toolBtn(allExpanded || !!q)}>
          <i className="bi bi-arrows-expand" /> Expand all
        </button>
        <button type="button" onClick={collapseAll} disabled={allCollapsed || !!q} style={toolBtn(allCollapsed || !!q)}>
          <i className="bi bi-arrows-collapse" /> Collapse all
        </button>
      </div>

      {/* Tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {flat.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 16px", color: "#aab2bd", fontSize: 13 }}>No sections match “{query}”.</div>
        ) : (
          flat.map(({ node, depth, open, hasChildren }) => {
            const isLeaf = !hasChildren;
            const dirty = isLeaf && dirtyModules.has(node.module);
            return (
              <div
                key={node.key}
                className="ctst-row"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 10px", paddingLeft: 10 + depth * 22, borderRadius: 8, background: dirty ? "#fbf3f3" : "transparent", transition: "background .12s ease" }}
                onMouseEnter={(e) => { if (!dirty) (e.currentTarget as HTMLElement).style.background = "#f5f6f9"; }}
                onMouseLeave={(e) => { if (!dirty) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <span
                    onClick={() => hasChildren && toggle(node.key)}
                    style={{ width: 16, textAlign: "center", flexShrink: 0, color: "#8893a0", cursor: hasChildren ? "pointer" : "default", transition: "transform .18s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)", visibility: hasChildren ? "visible" : "hidden" }}
                  >
                    <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
                  </span>
                  <span style={{ fontWeight: hasChildren ? 600 : 500, fontSize: hasChildren ? 13.5 : 12.5, color: "#1f2733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {node.label}
                  </span>
                  {isLeaf && variant === "employee" && (
                    customModules?.has(node.module)
                      ? <span style={{ fontSize: 9.5, color: ACCENT, background: "#fbf3f3", border: `1px solid ${ACCENT}40`, borderRadius: 999, padding: "1px 7px", textTransform: "uppercase", letterSpacing: ".4px", flexShrink: 0 }}>Custom</span>
                      : <span style={{ fontSize: 9.5, color: "#aeb6c1", textTransform: "uppercase", letterSpacing: ".4px", flexShrink: 0 }}>Inherited</span>
                  )}
                </div>

                {isLeaf && (
                  <LeafControls
                    module={node.module}
                    level={levels[node.module] || "none"}
                    expiry={expiries?.[node.module] ?? null}
                    isCustom={customModules?.has(node.module) ?? false}
                    variant={variant}
                    onSetLevel={onSetLevel}
                    onSetExpiry={onSetExpiry}
                    onResetToRole={onResetToRole}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <style>{`.ctst-row .form-control{height:auto}`}</style>
    </div>
  );
};

export default AccessControlTree;
