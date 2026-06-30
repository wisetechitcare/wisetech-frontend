import React, { useMemo, useState, useCallback } from "react";

/**
 * CompanyTypeServiceTree
 * ------------------------------------------------------------------
 * One unified explorer for the Company classification:
 *   Company Type → Service → Sub-service   (3 levels)
 *
 * Under the hood these map to existing tables (unchanged):
 *   - Company Type  → a top-level CompanyType (parentTypeId = null)
 *   - Service       → a CompanyType sub-type (parentTypeId set)        [created via onAddService]
 *   - Sub-service   → a Service row (companyTypeId = the sub-type)     [created via onAddSubService]
 *
 * Robustness (never-vanish): nothing is ever filtered out.
 *  - A "grandchild" type or a type whose parent is missing is PROMOTED to a top-level row.
 *  - Sub-services (Service rows) with no/invalid parent live under an "Unassigned" group.
 */

const ACCENT = "#9D4141";

// Row-action palette — harmonized with the maroon theme, each action a distinct hue.
const ACTION = {
  service: "#9D4141",  // theme maroon — add Service (a sub-type under a company type)
  subService: "#1f7a4d", // green — add Sub-service (a service under a sub-type)
  edit: "#2f6fb3",     // blue — edit
  remove: "#c0392b",   // red — delete
};

interface CompanyTypeRow { id: string; name: string; color?: string | null; parentTypeId?: string | null; }
interface ServiceRow { id: string; name: string; companyTypeId?: string | null; }

interface Props {
  companyTypes: CompanyTypeRow[];
  services: ServiceRow[];
  // "Add Service" — creates a CompanyType sub-type under the given top-level type.
  onAddService: (parentTypeId: string) => void;
  onEditType: (type: CompanyTypeRow) => void;
  onDeleteType: (id: string) => void;
  // "Add Sub-service" — creates a Service row under the given sub-type (companyTypeId).
  onAddSubService: (companyTypeId: string | null) => void;
  onEditSubService: (service: ServiceRow) => void;
  onDeleteSubService: (id: string) => void;
}

type Kind = "type" | "service" | "subservice" | "group";
interface TNode {
  key: string;
  kind: Kind;
  id: string;
  name: string;
  color?: string | null;
  entity?: any;
  children: TNode[];
  isTopType?: boolean;
}

const byName = (a: { name?: string }, b: { name?: string }) =>
  (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });

// hex (#rrggbb) → rgba string, so we can derive soft tints from a single accent color.
const hexToRgba = (hex: string, a: number): string => {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const IconBtn: React.FC<{ icon: string; title: string; color: string; onClick: (e: React.MouseEvent) => void }> = ({ icon, title, color, onClick }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      title={title}
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
  );
};

const CompanyTypeServiceTree: React.FC<Props> = ({
  companyTypes, services,
  onAddService, onEditType, onDeleteType,
  onAddSubService, onEditSubService, onDeleteSubService,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // ── Build the tree (with orphan promotion + fallback bucket) ───────────────
  const tree = useMemo<TNode[]>(() => {
    const typeById = new Map(companyTypes.map((t) => [t.id, t]));
    const validTypeIds = new Set(companyTypes.map((t) => t.id));

    const isParentTopLevel = (pid?: string | null): boolean => {
      if (!pid) return false;
      const p = typeById.get(pid);
      if (!p) return false;
      return !p.parentTypeId || !typeById.has(p.parentTypeId);
    };
    // A genuine sub-type (shown as "Service"): has a parent that is itself a top-level type.
    // Anything else (no parent, missing parent, or a grandchild) is promoted to a top-level row.
    const isSubType = (t: CompanyTypeRow) => !!(t.parentTypeId && typeById.has(t.parentTypeId) && isParentTopLevel(t.parentTypeId));

    const subTypesByParent = new Map<string, CompanyTypeRow[]>();
    companyTypes.forEach((t) => {
      if (isSubType(t)) {
        const arr = subTypesByParent.get(t.parentTypeId!) || [];
        arr.push(t);
        subTypesByParent.set(t.parentTypeId!, arr);
      }
    });
    const topTypes = companyTypes.filter((t) => !isSubType(t)).slice().sort(byName);

    // Services (shown as "Sub-services") attach to a type/sub-type via companyTypeId.
    const servicesByType = new Map<string, ServiceRow[]>();
    const unassignedServices: ServiceRow[] = [];
    services.forEach((s) => {
      if (s.companyTypeId && validTypeIds.has(s.companyTypeId)) {
        const arr = servicesByType.get(s.companyTypeId) || [];
        arr.push(s);
        servicesByType.set(s.companyTypeId, arr);
      } else {
        unassignedServices.push(s);
      }
    });

    // A Service row is a leaf "Sub-service".
    const subServiceNode = (s: ServiceRow): TNode => ({
      key: `svc-${s.id}`, kind: "subservice", id: s.id, name: s.name, entity: s, children: [],
    });
    const typeNode = (t: CompanyTypeRow): TNode => {
      const isTop = !isSubType(t);
      return {
        key: `type-${t.id}`, kind: "type", id: t.id, name: t.name, color: t.color, entity: t, isTopType: isTop,
        children: [
          ...(subTypesByParent.get(t.id) || []).slice().sort(byName).map(typeNode),
          ...(servicesByType.get(t.id) || []).slice().sort(byName).map(subServiceNode),
        ],
      };
    };

    const roots: TNode[] = topTypes.map(typeNode);
    // Always present so admins can see/keep type-less services (orphan sub-services).
    roots.push({ key: "grp-unassigned", kind: "group", id: "__unassigned__", name: "Unassigned (no service)", children: unassignedServices.slice().sort(byName).map(subServiceNode) });
    return roots;
  }, [companyTypes, services]);

  const matches = useCallback((n: TNode): boolean => n.name.toLowerCase().includes(q) || n.children.some(matches), [q]);

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

  const dotColor = (n: TNode) =>
    n.kind === "type" ? (n.color || "#9aa0ad")
    : n.kind === "subservice" ? "#b8736f"
    : "#aab2bd";

  // Labels: top type = "company type", sub-type = "service", service row = "sub-service".
  const kindLabel = (n: TNode) =>
    n.kind === "type" ? (n.isTopType ? "company type" : "service")
    : n.kind === "subservice" ? "sub-service"
    : "";

  const toolBtn = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8,
    border: `1px solid ${active ? ACCENT : "#dde2e8"}`, background: active ? "#fbf3f3" : "#fff",
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
            placeholder="Search types, services & sub-services…"
            style={{ width: "100%", height: 36, border: "1px solid #dde2e8", borderRadius: 8, padding: "0 30px 0 32px", fontSize: 13, outline: "none", color: "#1f2733", boxSizing: "border-box" }}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} title="Clear" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aab2bd" }}>
              <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
            </button>
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
            No types, services or sub-services match “{query}”.
          </div>
        ) : (
          flat.map(({ node, depth, open, hasChildren }) => (
            <div
              key={node.key}
              className="ctst-row"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", paddingLeft: 10 + depth * 22, borderRadius: 8, transition: "background .12s ease" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#f5f6f9")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span
                  onClick={() => hasChildren && toggle(node.key)}
                  style={{ width: 16, textAlign: "center", flexShrink: 0, color: "#8893a0", cursor: hasChildren ? "pointer" : "default", transition: "transform .18s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)", visibility: hasChildren ? "visible" : "hidden" }}
                >
                  <i className="bi bi-chevron-right" style={{ fontSize: 10 }} />
                </span>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: dotColor(node), flexShrink: 0, boxShadow: node.kind === "type" ? `0 0 0 2px ${dotColor(node)}28` : "none" }} />
                <span style={{ fontWeight: node.kind === "type" ? 600 : node.kind === "group" ? 600 : 400, fontSize: node.kind === "type" ? 13.5 : 12.5, color: node.kind === "group" ? "#8893a0" : "#1f2733", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {node.name}
                </span>
                {kindLabel(node) && (
                  <span style={{ fontSize: 10, color: "#aeb6c1", textTransform: "uppercase", letterSpacing: ".4px", flexShrink: 0 }}>{kindLabel(node)}</span>
                )}
                {hasChildren && (
                  <span style={{ fontSize: 10, fontWeight: 600, background: "#f0f2f5", color: "#8893a0", borderRadius: 999, padding: "1px 7px", flexShrink: 0 }}>{node.children.length}</span>
                )}
              </div>

              {/* Hover actions */}
              <div className="ctst-actions" style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                {/* Top-level Company Type → add a Service (a sub-type). */}
                {node.kind === "type" && node.isTopType && (
                  <IconBtn icon="bi-diagram-3" title="Add service" color={ACTION.service} onClick={() => onAddService(node.id)} />
                )}
                {/* Service (sub-type) → add a Sub-service (a service row). */}
                {node.kind === "type" && !node.isTopType && (
                  <IconBtn icon="bi-plus-lg" title="Add sub-service" color={ACTION.subService} onClick={() => onAddSubService(node.id)} />
                )}
                {node.kind === "type" && (
                  <>
                    <IconBtn icon="bi-pencil" title="Edit" color={ACTION.edit} onClick={() => onEditType(node.entity)} />
                    <IconBtn icon="bi-trash" title="Delete" color={ACTION.remove} onClick={() => onDeleteType(node.id)} />
                  </>
                )}
                {node.kind === "subservice" && (
                  <>
                    <IconBtn icon="bi-pencil" title="Edit sub-service" color={ACTION.edit} onClick={() => onEditSubService(node.entity)} />
                    <IconBtn icon="bi-trash" title="Delete sub-service" color={ACTION.remove} onClick={() => onDeleteSubService(node.id)} />
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`.ctst-actions{opacity:.65;transition:opacity .15s ease}.ctst-row:hover .ctst-actions{opacity:1}`}</style>
    </div>
  );
};

export default CompanyTypeServiceTree;
