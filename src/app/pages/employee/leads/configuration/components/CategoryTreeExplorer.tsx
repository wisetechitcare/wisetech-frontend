import React, { useMemo, useState, useCallback } from 'react';
import { ProjectItem } from '@models/clientProject';
import { C, FONT, SP, RADIUS } from '@app/modules/configuration';

/**
 * CategoryTreeExplorer
 * ------------------------------------------------------------------
 * Enterprise-grade hierarchy explorer for Project Categories &
 * Subcategories (VS Code / Notion / Jira style). Replaces the legacy
 * card-grid. Always-visible structured tree with:
 *   • Inline expand / collapse per category (+ Expand All / Collapse All)
 *   • Search across category AND subcategory names (auto-expand + highlight)
 *   • Deterministic sorting: sortOrder (future-ready) then name
 *   • Hover actions (category: add-sub / edit / delete · sub: edit / delete)
 *   • Color indicators, live counts, smooth animations
 *   • Keyboard navigation (↑ ↓ → ← Enter/Space) and responsive layout
 *
 * No schema dependency: works on the existing flat category/subcategory
 * lists. `sortOrder` is consumed if present so drag-&-drop persistence can
 * be layered on later without touching this component.
 */

// ─── Local styles (tree-specific animations + responsive) ───────────────────────

const TREE_CSS = `
  @keyframes treeRowIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }
  .cte-subwrap { animation: treeRowIn 0.18s ease; }
  .cte-row { outline: none; }
  .cte-row:focus-visible { box-shadow: inset 0 0 0 2px ${C.primary}55; }
  .cte-actions { opacity: 0; transition: opacity 0.15s ease; }
  .cte-row:hover .cte-actions,
  .cte-row:focus-within .cte-actions { opacity: 1; }
  @media (max-width: 575.98px) {
    .cte-toolbar { flex-wrap: wrap !important; }
    .cte-search  { width: 100% !important; min-width: 0 !important; }
    .cte-toolbtns { width: 100%; justify-content: flex-end; }
  }
`;

// ─── Sorting: sortOrder (if present) then natural name order ─────────────────────

const byOrderThenName = (a: ProjectItem, b: ProjectItem): number => {
  const ao = (a as any).sortOrder ?? Number.MAX_SAFE_INTEGER;
  const bo = (b as any).sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
};

// ─── Match highlighting ──────────────────────────────────────────────────────────

const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: '#fff1a8', color: 'inherit', padding: '0 1px', borderRadius: '3px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
};

// ─── Action icon button ────────────────────────────────────────────────────────

const IconBtn: React.FC<{
  icon: string; title: string; color: string; hoverBg: string; onClick: (e: React.MouseEvent) => void;
}> = ({ icon, title, color, hoverBg, onClick }) => {
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
        background: hov ? hoverBg : 'transparent',
        border: 'none', borderRadius: RADIUS.sm,
        padding: '3px 6px', cursor: 'pointer', color,
        display: 'flex', alignItems: 'center', transition: 'background 0.15s ease',
      }}
    >
      <i className={`bi ${icon}`} style={{ fontSize: '11px' }} />
    </button>
  );
};

// ─── Subcategory row ─────────────────────────────────────────────────────────────

const SubRow: React.FC<{
  sub: ProjectItem; query: string;
  onEdit: () => void; onDelete: () => void;
  readOnly?: boolean;
}> = ({ sub, query, onEdit, onDelete, readOnly = false }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="cte-row"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '8px', padding: '6px 10px 6px 14px', borderRadius: RADIUS.md,
        backgroundColor: hov ? '#f5f6f9' : 'transparent', transition: 'background 0.12s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        <i className="bi bi-arrow-return-right" style={{ fontSize: '10px', color: C.textMuted, opacity: 0.55, flexShrink: 0 }} />
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: sub.color || '#ccc', flexShrink: 0 }} />
        <span style={{
          fontFamily: FONT.body, fontWeight: 400, fontSize: '12.5px', color: C.textPrimary,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <Highlight text={sub.name} query={query} />
        </span>
      </div>
      <div className="cte-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
        {!readOnly && (
          <>
            <IconBtn icon="bi-pencil" title="Edit subcategory" color="#4f82c4" hoverBg="#eff6ff" onClick={onEdit} />
            <IconBtn icon="bi-trash" title="Delete subcategory" color={C.danger} hoverBg={C.dangerLight} onClick={onDelete} />
          </>
        )}
      </div>
    </div>
  );
};

// ─── Category node ───────────────────────────────────────────────────────────────

interface CategoryNodeProps {
  category: ProjectItem;
  subs: ProjectItem[];
  expanded: boolean;
  query: string;
  totalSubCount: number;            // unfiltered count, for the badge
  onToggle: () => void;
  onCategoryEdit: () => void;
  onCategoryDelete: () => void;
  onAddSubcategory: (categoryId?: string) => void;
  onSubcategoryEdit: (sub: ProjectItem) => void;
  onSubcategoryDelete: (id: string) => void;
  onKeyNav: (e: React.KeyboardEvent) => void;
  readOnly?: boolean;
}

const CategoryNode: React.FC<CategoryNodeProps> = ({
  category, subs, expanded, query, totalSubCount,
  onToggle, onCategoryEdit, onCategoryDelete, onAddSubcategory,
  onSubcategoryEdit, onSubcategoryDelete, onKeyNav, readOnly = false,
}) => {
  const [hov, setHov] = useState(false);
  const color = category.color || '#9aa0ad';

  return (
    <div style={{ borderRadius: RADIUS.md, overflow: 'hidden' }}>
      {/* Category header row */}
      <div
        className="cte-row"
        role="treeitem"
        aria-expanded={expanded}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={onKeyNav}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
          backgroundColor: hov ? '#f1f3f8' : (expanded ? '#f7f8fb' : 'transparent'),
          transition: 'background 0.12s ease',
        }}
      >
        <i
          className="bi bi-chevron-right"
          style={{
            fontSize: '10px', color: C.textMuted, flexShrink: 0, width: '12px', textAlign: 'center',
            transition: 'transform 0.18s ease', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, flexShrink: 0,
          boxShadow: `0 0 0 2px ${color}28`,
        }} />
        <span style={{
          fontFamily: FONT.body, fontWeight: 600, fontSize: '13px', color: C.textPrimary,
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <Highlight text={category.name} query={query} />
        </span>

        <span style={{
          fontFamily: FONT.body, fontWeight: 600, fontSize: '10px',
          backgroundColor: totalSubCount > 0 ? `${color}18` : '#f0f2f5',
          color: totalSubCount > 0 ? color : C.textMuted,
          borderRadius: RADIUS.full, padding: '1px 8px', minWidth: '20px', textAlign: 'center',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {totalSubCount}
        </span>

        <div className="cte-actions" style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          {!readOnly && (
            <>
              <IconBtn icon="bi-plus-lg" title="Add subcategory" color="#16a34a" hoverBg="#f0fdf4" onClick={() => onAddSubcategory(category.id)} />
              <IconBtn icon="bi-pencil" title="Edit category" color="#4f82c4" hoverBg="#eff6ff" onClick={onCategoryEdit} />
              <IconBtn icon="bi-trash" title="Delete category" color={C.danger} hoverBg={C.dangerLight} onClick={onCategoryDelete} />
            </>
          )}
        </div>
      </div>

      {/* Subcategory panel */}
      {expanded && (
        <div
          className="cte-subwrap"
          style={{
            margin: '2px 0 4px 19px',
            paddingLeft: '10px',
            borderLeft: `1.5px solid ${color}33`,
          }}
        >
          {subs.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px', color: C.textMuted, fontFamily: FONT.body, fontSize: '12px',
            }}>
              <i className="bi bi-dash" style={{ opacity: 0.4 }} />
              No subcategories
              {!readOnly && (
                <>
                  {' — '}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onAddSubcategory(category.id); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontFamily: FONT.body, fontSize: '12px', fontWeight: 600, padding: 0 }}
                  >
                    Add one
                  </button>
                </>
              )}
            </div>
          ) : (
            subs.map(sub => (
              <SubRow
                key={sub.id} sub={sub} query={query}
                readOnly={readOnly}
                onEdit={() => onSubcategoryEdit(sub)}
                onDelete={() => onSubcategoryDelete(sub.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main explorer ───────────────────────────────────────────────────────────────

export interface CategoryTreeExplorerProps {
  categories: ProjectItem[];
  subcategories: ProjectItem[];
  onCategoryEdit: (cat: ProjectItem) => void;
  onCategoryDelete: (id: string) => void;
  onSubcategoryEdit: (sub: ProjectItem) => void;
  onSubcategoryDelete: (id: string) => void;
  onAddSubcategory: () => void;
  readOnly?: boolean;
}

const CategoryTreeExplorer: React.FC<CategoryTreeExplorerProps> = ({
  categories, subcategories,
  onCategoryEdit, onCategoryDelete,
  onSubcategoryEdit, onSubcategoryDelete, onAddSubcategory,
  readOnly = false,
}) => {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const hasSubs = new Set(subcategories.map(s => s.categoryId));
    return new Set(categories.filter(c => hasSubs.has(c.id)).map(c => c.id!));
  });

  const q = query.trim().toLowerCase();

  // Build sorted tree: category -> sorted subs (unfiltered).
  const tree = useMemo(() => {
    const subsByCat = new Map<string, ProjectItem[]>();
    for (const s of subcategories) {
      if (!s.categoryId) continue;
      const arr = subsByCat.get(s.categoryId) ?? [];
      arr.push(s);
      subsByCat.set(s.categoryId, arr);
    }
    return [...categories].sort(byOrderThenName).map(cat => ({
      cat,
      subs: (subsByCat.get(cat.id) ?? []).slice().sort(byOrderThenName),
    }));
  }, [categories, subcategories]);

  // Apply search: keep categories that match (show all their subs) or that
  // have matching subs (show only the matching subs).
  const filtered = useMemo(() => {
    if (!q) return tree.map(n => ({ ...n, visibleSubs: n.subs }));
    const out: { cat: ProjectItem; subs: ProjectItem[]; visibleSubs: ProjectItem[] }[] = [];
    for (const node of tree) {
      const catMatch = node.cat.name.toLowerCase().includes(q);
      if (catMatch) {
        out.push({ ...node, visibleSubs: node.subs });
        continue;
      }
      const subMatches = node.subs.filter(s => s.name.toLowerCase().includes(q));
      if (subMatches.length) out.push({ ...node, visibleSubs: subMatches });
    }
    return out;
  }, [tree, q]);

  const totalSubs = subcategories.length;
  const resultCatCount = filtered.length;
  const resultSubCount = useMemo(
    () => filtered.reduce((sum, n) => sum + (q ? n.visibleSubs.length : n.subs.length), 0),
    [filtered, q],
  );

  // When searching, every matching category is auto-expanded.
  const isExpanded = useCallback(
    (id: string) => (q ? true : expanded.has(id)),
    [q, expanded],
  );

  const toggle = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => setExpanded(new Set(categories.map(c => c.id)));
  const collapseAll = () => setExpanded(new Set());

  // Keyboard navigation across category rows.
  const handleKeyNav = (e: React.KeyboardEvent, id: string, index: number) => {
    const rows = Array.from(
      (e.currentTarget.closest('[data-cte-tree]') as HTMLElement | null)
        ?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [],
    );
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault(); toggle(id); break;
      case 'ArrowRight':
        e.preventDefault(); if (!q && !expanded.has(id)) toggle(id); break;
      case 'ArrowLeft':
        e.preventDefault(); if (!q && expanded.has(id)) toggle(id); break;
      case 'ArrowDown':
        e.preventDefault(); rows[index + 1]?.focus(); break;
      case 'ArrowUp':
        e.preventDefault(); rows[index - 1]?.focus(); break;
      case 'Home':
        e.preventDefault(); rows[0]?.focus(); break;
      case 'End':
        e.preventDefault(); rows[rows.length - 1]?.focus(); break;
    }
  };

  const allCollapsed = expanded.size === 0;
  const allExpanded = expanded.size >= categories.length && categories.length > 0;

  return (
    <div>
      <style>{TREE_CSS}</style>

      {/* Toolbar */}
      <div
        className="cte-toolbar"
        style={{ display: 'flex', alignItems: 'center', gap: SP.sm, marginBottom: SP.sm }}
      >
        {/* Search */}
        <div className="cte-search" style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <i
            className="bi bi-search"
            style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.textMuted }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories & subcategories…"
            style={{
              width: '100%', padding: '8px 30px 8px 32px', borderRadius: RADIUS.md,
              border: `1px solid ${C.border}`, fontFamily: FONT.body, fontSize: '13px',
              color: C.textPrimary, outline: 'none', backgroundColor: '#fff',
              transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.primaryShadow}`; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear"
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted, padding: '2px', display: 'flex' }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: '11px' }} />
            </button>
          )}
        </div>

        {/* Expand / Collapse all */}
        <div className="cte-toolbtns" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={expandAll}
            disabled={allExpanded || !!q}
            title="Expand all"
            style={toolBtnStyle(allExpanded || !!q)}
          >
            <i className="bi bi-arrows-expand" style={{ fontSize: '12px' }} /> Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            disabled={allCollapsed || !!q}
            title="Collapse all"
            style={toolBtnStyle(allCollapsed || !!q)}
          >
            <i className="bi bi-arrows-collapse" style={{ fontSize: '12px' }} /> Collapse all
          </button>
        </div>
      </div>

      {/* Count summary */}
      <div style={{ fontFamily: FONT.body, fontSize: '11.5px', color: C.textMuted, marginBottom: '6px', paddingLeft: '2px' }}>
        {q
          ? <><strong style={{ color: C.textSecondary }}>{resultCatCount}</strong> categor{resultCatCount === 1 ? 'y' : 'ies'} · <strong style={{ color: C.textSecondary }}>{resultSubCount}</strong> subcategor{resultSubCount === 1 ? 'y' : 'ies'} matching “{query}”</>
          : <><strong style={{ color: C.textSecondary }}>{categories.length}</strong> categor{categories.length === 1 ? 'y' : 'ies'} · <strong style={{ color: C.textSecondary }}>{totalSubs}</strong> subcategor{totalSubs === 1 ? 'y' : 'ies'}</>
        }
      </div>

      {/* Tree */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 16px', color: C.textMuted, fontFamily: FONT.body, fontSize: '13px' }}>
          <i className="bi bi-search" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', opacity: 0.4 }} />
          No categories or subcategories match “{query}”.
        </div>
      ) : (
        <div
          data-cte-tree
          role="tree"
          aria-label="Project categories"
          style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}
        >
          {filtered.map((node, i) => (
            <CategoryNode
              key={node.cat.id}
              category={node.cat}
              subs={node.visibleSubs}
              totalSubCount={node.subs.length}
              expanded={isExpanded(node.cat.id)}
              query={query}
              onToggle={() => toggle(node.cat.id)}
              onCategoryEdit={() => onCategoryEdit(node.cat)}
              onCategoryDelete={() => onCategoryDelete(node.cat.id)}
              onAddSubcategory={onAddSubcategory}
              onSubcategoryEdit={onSubcategoryEdit}
              onSubcategoryDelete={onSubcategoryDelete}
              onKeyNav={(e) => handleKeyNav(e, node.cat.id, i)}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── helpers ───────────────────────────────────────────────────────────────────

const toolBtnStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: '5px',
  padding: '7px 12px', borderRadius: RADIUS.md,
  border: `1px solid ${C.border}`, backgroundColor: '#fff',
  color: disabled ? C.textMuted : C.textSecondary,
  fontFamily: FONT.body, fontWeight: 500, fontSize: '12px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  whiteSpace: 'nowrap', transition: 'all 0.15s ease',
});

export default CategoryTreeExplorer;
