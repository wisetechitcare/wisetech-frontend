import { useState, useMemo } from 'react';
import { IOrgNode, IOrgBranchNode } from '@models/company';
import { IconBuilding, IconHierarchy, IconBranch, IconUsers, IconEdit, IconTrash, IconChevron } from '@app/modules/common/components/icons/OrgIcons';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  brand: '#9D4141',
  brandSoft: '#FBEEEE',
  brandBorder: '#EBD2D2',
  ink: '#1F2430',
  inkSoft: '#5A6172',
  inkFaint: '#98A0B0',
  line: '#ECEEF3',
  surface: '#FFFFFF',
  branchBg: '#F8FAFC',
  branchAccent: '#3B6FB0',
  branchAccentSoft: '#EAF1FB',
};

export interface OrgTreeHandlers {
  onSelectOrg?: (org: IOrgNode) => void;
  onSelectBranch?: (branch: IOrgBranchNode, org: IOrgNode) => void;
  onAddSubOrg?: (parent: IOrgNode) => void;
  onAddBranch?: (org: IOrgNode) => void;
  onEditOrg?: (org: IOrgNode) => void;
  onDeleteOrg?: (org: IOrgNode) => void;
  /** View the employees that belong to a branch (clicking its employee count). */
  onViewBranchEmployees?: (branch: IOrgBranchNode) => void;
}

interface OrgTreeProps extends OrgTreeHandlers {
  organizations: IOrgNode[];
  /** Auto-expand nodes up to this depth (0 = roots collapsed, 1 = roots open). Default 1. */
  defaultExpandedDepth?: number;
  /** Force every node open regardless of its toggle state — used while a search is active
   *  so deeply-nested matches (sub-orgs / branches) are always revealed. */
  forceExpand?: boolean;
  emptyLabel?: string;
}

// ─── Small atoms ────────────────────────────────────────────────────────────────

function Badge({ icon, label, tone = 'neutral' }: { icon: React.ReactNode; label: string | number; tone?: 'brand' | 'branch' | 'neutral' }) {
  const palette =
    tone === 'brand' ? { bg: C.brandSoft, fg: C.brand, bd: C.brandBorder }
    : tone === 'branch' ? { bg: C.branchAccentSoft, fg: C.branchAccent, bd: '#D5E3F6' }
    : { bg: '#F1F3F7', fg: C.inkSoft, bd: '#E3E7EF' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: palette.fg, background: palette.bg, border: `1px solid ${palette.bd}`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'inline-flex' }}>{icon}</span>{label}
    </span>
  );
}

function ActionBtn({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="org-tree__action"
      style={{
        width: 28, height: 28, borderRadius: 7, display: 'inline-grid', placeItems: 'center',
        border: `1px solid ${danger ? '#F3CDCD' : C.line}`, background: danger ? '#FFF6F6' : C.surface,
        color: danger ? '#D14343' : C.inkSoft, cursor: 'pointer', fontSize: 13, transition: 'all .15s ease',
      }}
    >
      {children}
    </button>
  );
}

function Avatar({ logo, tone }: { logo?: string; tone: 'org' | 'branch' }) {
  const ring = tone === 'org' ? C.brandBorder : '#D5E3F6';
  const bg = tone === 'org' ? C.brandSoft : C.branchAccentSoft;
  const fg = tone === 'org' ? C.brand : C.branchAccent;
  return (
    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, overflow: 'hidden', border: `1px solid ${ring}`, background: bg, display: 'grid', placeItems: 'center', color: fg }}>
      {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : tone === 'org' ? <IconBuilding size={19} /> : <IconBranch size={18} />}
    </div>
  );
}

// ─── Branch leaf row ─────────────────────────────────────────────────────────────

function BranchRow({ branch, org, depth, onSelect, onViewEmployees }: { branch: IOrgBranchNode; org: IOrgNode; depth: number; onSelect?: (b: IOrgBranchNode, o: IOrgNode) => void; onViewEmployees?: (b: IOrgBranchNode) => void }) {
  return (
    <div
      className="org-tree__row org-tree__row--branch"
      onClick={() => onSelect?.(branch, org)}
      style={{ marginLeft: depth * 26, ['--row-pad' as any]: '8px 12px' }}
    >
      <div className="org-tree__connector" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: C.branchBg, border: `1px solid ${C.line}`, flex: 1, cursor: onSelect ? 'pointer' : 'default', transition: 'all .15s ease' }}>
        <Avatar tone="branch" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch.name}</div>
          {branch.address && <div style={{ fontSize: 11.5, color: C.inkFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{branch.address}</div>}
        </div>
        {onViewEmployees ? (
          <button
            type="button"
            title="View employees in this branch"
            onClick={e => { e.stopPropagation(); onViewEmployees(branch); }}
            className="org-tree__emp-badge"
            style={{ border: '1px solid #D5E3F6', background: C.branchAccentSoft, color: C.branchAccent, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'all .12s ease' }}
          >
            <IconUsers size={13} />{branch.employeeCount}
          </button>
        ) : (
          <Badge icon={<IconUsers size={13} />} label={branch.employeeCount} tone="branch" />
        )}
        {branch.isActive === false && <Badge icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />} label="Inactive" />}
      </div>
    </div>
  );
}

// ─── Org node (recursive) ────────────────────────────────────────────────────────

function OrgNodeRow({ org, depth, handlers, defaultExpandedDepth, forceExpand }: { org: IOrgNode; depth: number; handlers: OrgTreeHandlers; defaultExpandedDepth: number; forceExpand?: boolean }) {
  const [open, setOpen] = useState(depth < defaultExpandedDepth);
  const hasChildren = org.children.length > 0 || org.branches.length > 0;
  // While a search is active every node is forced open so nested matches show.
  const isOpen = forceExpand || open;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 26 }}>
      <div className="org-tree__row" style={{ position: 'relative' }}>
        {depth > 0 && <div className="org-tree__connector" />}
        <div
          className="org-tree__card"
          onClick={() => handlers.onSelectOrg?.(org)}
          style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 14px', borderRadius: 12, background: C.surface, border: `1px solid ${C.line}`, flex: 1, cursor: 'pointer', transition: 'all .18s ease' }}
        >
          {/* expand toggle */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); if (hasChildren) setOpen(o => !o); }}
            style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, border: 'none', background: hasChildren ? C.brandSoft : 'transparent', color: C.brand, cursor: hasChildren ? 'pointer' : 'default', display: 'grid', placeItems: 'center' }}
          >
            {hasChildren && (
              <span style={{ display: 'inline-flex', transition: 'transform .25s cubic-bezier(.4,0,.2,1)', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}><IconChevron size={14} /></span>
            )}
          </button>

          <Avatar logo={org.logo} tone="org" />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</span>
              {depth === 0
                ? <span style={{ fontSize: 10, fontWeight: 700, color: C.brand, background: C.brandSoft, border: `1px solid ${C.brandBorder}`, borderRadius: 999, padding: '1px 7px' }}>ORG</span>
                : <span style={{ fontSize: 10, fontWeight: 700, color: C.inkSoft, background: '#F1F3F7', border: `1px solid #E3E7EF`, borderRadius: 999, padding: '1px 7px' }}>SUB-ORG</span>}
            </div>
            <div style={{ fontSize: 11.5, color: C.inkFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org.businessType || org.address || '—'}
            </div>
          </div>

          {/* counts */}
          <div style={{ display: 'flex', gap: 6 }} className="org-tree__badges">
            {org.childCount > 0 && <Badge icon={<IconHierarchy size={13} />} label={org.childCount} />}
            <Badge icon={<IconBranch size={13} />} label={org.branchCount} tone="branch" />
            <Badge icon={<IconUsers size={13} />} label={org.employeeCount} tone="brand" />
          </div>

          {/* hover actions */}
          <div className="org-tree__actions" style={{ display: 'flex', gap: 6 }}>
            {handlers.onAddSubOrg && <ActionBtn title="Add sub-organization" onClick={() => handlers.onAddSubOrg!(org)}><IconHierarchy size={15} /></ActionBtn>}
            {handlers.onAddBranch && <ActionBtn title="Add branch" onClick={() => handlers.onAddBranch!(org)}><IconBranch size={15} /></ActionBtn>}
            {handlers.onEditOrg && <ActionBtn title="Edit organization" onClick={() => handlers.onEditOrg!(org)}><IconEdit size={15} /></ActionBtn>}
            {handlers.onDeleteOrg && <ActionBtn title="Delete organization" danger onClick={() => handlers.onDeleteOrg!(org)}><IconTrash size={15} /></ActionBtn>}
          </div>
        </div>
      </div>

      {/* collapsible body — smooth grid-rows 0fr→1fr animation (no JS height measuring) */}
      {hasChildren && (
        <div className="org-tree__collapsible" style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows .3s cubic-bezier(.4,0,.2,1)' }}>
          <div style={{ overflow: 'hidden' }}>
            <div className="org-tree__branch-strip" style={{ paddingTop: 8, opacity: isOpen ? 1 : 0, transition: 'opacity .25s ease .05s' }}>
              {org.children.map(child => (
                <OrgNodeRow key={child.id} org={child} depth={depth + 1} handlers={handlers} defaultExpandedDepth={defaultExpandedDepth} forceExpand={forceExpand} />
              ))}
              {org.branches.map(branch => (
                <BranchRow key={branch.id} branch={branch} org={org} depth={depth + 1} onSelect={handlers.onSelectBranch} onViewEmployees={handlers.onViewBranchEmployees} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public component ────────────────────────────────────────────────────────────

export default function OrgTree({ organizations, defaultExpandedDepth = 1, forceExpand, emptyLabel = 'No organizations yet.', ...handlers }: OrgTreeProps) {
  const styleTag = useMemo(() => (
    `
    .org-tree__row { position: relative; display: flex; align-items: center; margin-bottom: 8px; }
    .org-tree__card:hover { border-color: ${C.brandBorder} !important; box-shadow: 0 6px 18px rgba(157,65,65,.10); transform: translateY(-1px); }
    .org-tree__row--branch > div:hover { border-color: #C9DBF1 !important; box-shadow: 0 4px 12px rgba(59,111,176,.10); }
    .org-tree__actions { opacity: 0; transform: translateX(4px); transition: opacity .18s ease, transform .18s ease; }
    .org-tree__card:hover .org-tree__actions { opacity: 1; transform: translateX(0); }
    .org-tree__action:hover { border-color: ${C.brand} !important; color: ${C.brand} !important; background: ${C.brandSoft} !important; }
    .org-tree__action:hover[title^="Delete"] { border-color: #E78A8A !important; color: #D14343 !important; background: #FFF1F1 !important; }
    .org-tree__emp-badge:hover { background: #DCE9FA !important; border-color: #B9D2F0 !important; box-shadow: 0 2px 6px rgba(59,111,176,.18); }
    .org-tree__connector { position: absolute; left: -14px; top: 50%; width: 14px; height: 2px; background: ${C.line}; }
    .org-tree__branch-strip { position: relative; }
    .org-tree__branch-strip::before { content: ''; position: absolute; left: 11px; top: 0; bottom: 16px; width: 2px; background: ${C.line}; }
    @media (max-width: 640px) { .org-tree__badges { display: none !important; } .org-tree__actions { opacity: 1 !important; transform: none !important; } }
    `
  ), []);

  if (!organizations.length) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 20px', border: `2px dashed ${C.line}`, borderRadius: 14, color: C.inkFaint, background: C.surface }}>
        <div style={{ display: 'inline-flex', marginBottom: 10, color: C.brandBorder }}><IconBuilding size={38} /></div>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.inkSoft, marginBottom: 4 }}>{emptyLabel}</div>
        <div style={{ fontSize: 13 }}>Create your first organization to get started.</div>
      </div>
    );
  }

  return (
    <div>
      <style>{styleTag}</style>
      {organizations.map(org => (
        <OrgNodeRow key={org.id} org={org} depth={0} handlers={handlers} defaultExpandedDepth={defaultExpandedDepth} forceExpand={forceExpand} />
      ))}
    </div>
  );
}
