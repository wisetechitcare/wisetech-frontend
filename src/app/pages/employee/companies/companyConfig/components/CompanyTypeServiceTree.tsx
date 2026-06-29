import React, { useMemo, useState, useCallback } from "react";

/**
 * CompanyTypeServiceTree
 * ------------------------------------------------------------------
 * One unified explorer for the whole Company hierarchy:
 *   Company Type → Company Sub-type → Company Service → Company Sub-service
 *
 * Replaces the three separate Configure sections (Types tree + Services list +
 * Sub-services list). Each node gets its own add/edit/delete actions that call
 * back to the right CRUD.
 *
 * Robustness (never-vanish): nothing is ever filtered out.
 *  - A "grandchild" type (its parent is itself a child) or a type whose parent is
 *    missing is PROMOTED to a top-level row instead of disappearing.
 *  - Services with no type (or a missing type) live under an "Unassigned" group.
 *  - Sub-services whose parent service is missing live under their own group.
 */

const ACCENT = "#9D4141";

interface CompanyTypeRow { id: string; name: string; color?: string | null; parentTypeId?: string | null; }
interface ServiceRow { id: string; name: string; companyTypeId?: string | null; }
interface SubServiceRow { id: string; name: string; color?: string | null; parentServiceId?: string | null; parentService?: { id: string; name: string } | null; }

interface Props {
  companyTypes: CompanyTypeRow[];
  services: ServiceRow[];
  subServices: SubServiceRow[];
  onAddSubType: (parentTypeId: string) => void;
  onEditType: (type: CompanyTypeRow) => void;
  onDeleteType: (id: string) => void;
  onAddService: (companyTypeId: string | null) => void;
  onEditService: (service: ServiceRow) => void;
  onDeleteService: (id: string) => void;
  onAddSubService: (parentServiceId: string) => void;
  onEditSubService: (subService: SubServiceRow) => void;
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
  canAddType?: boolean;
  canAddService?: boolean;
  canAddSubService?: boolean;
}

const byName = (a: { name?: string }, b: { name?: string }) =>
  (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" });

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
      style={{ background: hov ? "#f0f2f5" : "transparent", border: "none", borderRadius: 5, padding: "3px 6px", cursor: "pointer", color, display: "flex", alignItems: "center" }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: 12 }} />
    </button>
  );
};

const CompanyTypeServiceTree: React.FC<Props> = ({
  companyTypes, services, subServices,
  onAddSubType, onEditType, onDeleteType,
  onAddService, onEditService, onDeleteService,
  onAddSubService, onEditSubService, onDeleteSubService,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // ── Build the tree (with orphan promotion + fallback buckets) ──────────────
  const tree = useMemo<TNode[]>(() => {
    const typeById = new Map(companyTypes.map((t) => [t.id, t]));
    const validTypeIds = new Set(companyTypes.map((t) => t.id));
    const serviceIds = new Set(services.map((s) => s.id));

    const isParentTopLevel = (pid?: string | null): boolean => {
      if (!pid) return false;
      const p = typeById.get(pid);
      if (!p) return false;
      return !p.parentTypeId || !typeById.has(p.parentTypeId);
    };
    // A genuine sub-type: has a parent that is itself a top-level type. Anything else
    // (no parent, missing parent, or a grandchild) is promoted to a top-level row.
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

    const subByService = new Map<string, SubServiceRow[]>();
    const orphanSubs: SubServiceRow[] = [];
    subServices.forEach((ss) => {
      if (ss.parentServiceId && serviceIds.has(ss.parentServiceId)) {
        const arr = subByService.get(ss.parentServiceId) || [];
        arr.push(ss);
        subByService.set(ss.parentServiceId, arr);
      } else {
        orphanSubs.push(ss);
      }
    });

    const subNode = (ss: SubServiceRow): TNode => ({ key: `sub-${ss.id}`, kind: "subservice", id: ss.id, name: ss.name, color: ss.color, entity: ss, children: [] });
    const serviceNode = (s: ServiceRow): TNode => ({
      key: `svc-${s.id}`, kind: "service", id: s.id, name: s.name, entity: s, canAddSubService: true,
      children: (subByService.get(s.id) || []).slice().sort(byName).map(subNode),
    });
    const typeNode = (t: CompanyTypeRow): TNode => ({
      key: `type-${t.id}`, kind: "type", id: t.id, name: t.name, color: t.color, entity: t,
      canAddType: !t.parentTypeId, canAddService: true,
      children: [
        ...(subTypesByParent.get(t.id) || []).slice().sort(byName).map(typeNode),
        ...(servicesByType.get(t.id) || []).slice().sort(byName).map(serviceNode),
      ],
    });

    const roots: TNode[] = topTypes.map(typeNode);
    // Always present so admins can add a type-less service even when none exist yet.
    roots.push({ key: "grp-unassigned", kind: "group", id: "__unassigned__", name: "Unassigned (no type)", canAddService: true, children: unassignedServices.slice().sort(byName).map(serviceNode) });
    if (orphanSubs.length) {
      roots.push({ key: "grp-orphan-sub", kind: "group", id: "__orphansub__", name: "Sub-services without a service", children: orphanSubs.slice().sort(byName).map(subNode) });
    }
    return roots;
  }, [companyTypes, services, subServices]);

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
    : n.kind === "service" ? "#b8736f"
    : n.kind === "subservice" ? (n.color || "#cbb0ae")
    : "#aab2bd";

  const kindLabel = (n: TNode) =>
    n.kind === "type" ? (n.entity?.parentTypeId ? "sub-type" : "type")
    : n.kind === "service" ? "service"
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
              <div className="ctst-actions" style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                {node.kind === "type" && node.canAddType && (
                  <IconBtn icon="bi-diagram-3" title="Add sub-type" color="#16a34a" onClick={() => onAddSubType(node.id)} />
                )}
                {(node.kind === "type" || (node.kind === "group" && node.canAddService)) && (
                  <IconBtn icon="bi-plus-lg" title="Add service" color="#16a34a" onClick={() => onAddService(node.kind === "group" ? null : node.id)} />
                )}
                {node.kind === "service" && (
                  <IconBtn icon="bi-plus-lg" title="Add sub-service" color="#16a34a" onClick={() => onAddSubService(node.id)} />
                )}
                {node.kind === "type" && (
                  <>
                    <IconBtn icon="bi-pencil" title="Edit type" color="#4f82c4" onClick={() => onEditType(node.entity)} />
                    <IconBtn icon="bi-trash" title="Delete type" color="#dc3545" onClick={() => onDeleteType(node.id)} />
                  </>
                )}
                {node.kind === "service" && (
                  <>
                    <IconBtn icon="bi-pencil" title="Edit service" color="#4f82c4" onClick={() => onEditService(node.entity)} />
                    <IconBtn icon="bi-trash" title="Delete service" color="#dc3545" onClick={() => onDeleteService(node.id)} />
                  </>
                )}
                {node.kind === "subservice" && (
                  <>
                    <IconBtn icon="bi-pencil" title="Edit sub-service" color="#4f82c4" onClick={() => onEditSubService(node.entity)} />
                    <IconBtn icon="bi-trash" title="Delete sub-service" color="#dc3545" onClick={() => onDeleteSubService(node.id)} />
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`.ctst-actions{opacity:0;transition:opacity .15s ease}.ctst-row:hover .ctst-actions{opacity:1}`}</style>
    </div>
  );
};

export default CompanyTypeServiceTree;
