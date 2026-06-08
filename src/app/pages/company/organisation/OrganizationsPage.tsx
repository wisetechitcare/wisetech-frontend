import { useEffect, useMemo, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { IOrgNode, IOrgStats, IOrgBranchNode } from '@models/company';
import { fetchOrganizationTree, fetchOrganizationStats, deleteOrganizationById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import OrgTree from '@app/modules/common/components/OrgTree';
import OrganizationFormModal from './OrganizationFormModal';
import BranchEmployeesModal from '@app/modules/common/components/BranchEmployeesModal';
import { IconBuilding, IconHierarchy, IconBranch, IconUsers, IconSearch, IconPlus } from '@app/modules/common/components/icons/OrgIcons';

const C = { brand: '#9D4141', brandSoft: '#FBEEEE', brandBorder: '#EBD2D2', ink: '#1F2430', inkSoft: '#5A6172', inkFaint: '#98A0B0', line: '#ECEEF3', panel: '#F7F8FA', surface: '#FFFFFF' };

interface Props {
  /** Called when an organization is opened — the shell switches to its profile. */
  onOpenOrg?: (org: IOrgNode) => void;
}

// Recursively filter the tree to nodes whose name matches, keeping ancestors of matches.
function filterTree(nodes: IOrgNode[], q: string): IOrgNode[] {
  if (!q.trim()) return nodes;
  const lower = q.toLowerCase();
  const walk = (node: IOrgNode): IOrgNode | null => {
    const children = node.children.map(walk).filter(Boolean) as IOrgNode[];
    const branchHit = node.branches.some(b => b.name.toLowerCase().includes(lower));
    const selfHit = node.name.toLowerCase().includes(lower);
    if (selfHit || branchHit || children.length) return { ...node, children };
    return null;
  };
  return nodes.map(walk).filter(Boolean) as IOrgNode[];
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'brand' | 'branch' | 'neutral' }) {
  const fg = tone === 'brand' ? C.brand : tone === 'branch' ? '#3B6FB0' : C.inkSoft;
  const bg = tone === 'brand' ? C.brandSoft : tone === 'branch' ? '#EAF1FB' : '#F1F3F7';
  const bd = tone === 'brand' ? C.brandBorder : tone === 'branch' ? '#D5E3F6' : '#E3E7EF';
  return (
    <div style={{ flex: 1, minWidth: 150, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, border: `1px solid ${bd}`, display: 'grid', placeItems: 'center', color: fg }}>{icon}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.inkFaint, marginTop: 3, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

export default function OrganizationsPage({ onOpenOrg }: Props) {
  const [tree, setTree] = useState<IOrgNode[]>([]);
  const [stats, setStats] = useState<IOrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ show: boolean; parent: { id: string; name: string } | null }>({ show: false, parent: null });
  const [empModal, setEmpModal] = useState<{ show: boolean; branch: IOrgBranchNode | null }>({ show: false, branch: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, statsRes] = await Promise.all([fetchOrganizationTree(), fetchOrganizationStats()]);
      if (!treeRes.hasError) setTree(treeRes.data.organizations ?? []);
      if (!statsRes.hasError) setStats(statsRes.data.stats ?? null);
    } catch { errorConfirmation('Failed to load organizations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filterTree(tree, search), [tree, search]);

  async function handleDelete(org: IOrgNode) {
    const blocked = org.childCount > 0 || org.branchCount > 0 || org.employeeCount > 0;
    const res = await Swal.fire({
      title: blocked ? 'Cannot delete yet' : 'Delete organization?',
      html: blocked
        ? `<b>${org.name}</b> still has ${org.childCount} sub-org(s), ${org.branchCount} branch(es) and ${org.employeeCount} employee(s).<br/>Reassign or remove them first.`
        : `This will permanently delete <b>${org.name}</b>. This cannot be undone.`,
      icon: 'warning',
      showCancelButton: !blocked,
      confirmButtonText: blocked ? 'OK' : 'Delete',
      cancelButtonText: 'Cancel',
      customClass: { confirmButton: `btn ${blocked ? 'btn-light' : 'btn-danger'} fw-bold px-6`, cancelButton: 'btn btn-light fw-bold px-6 ms-3' },
      buttonsStyling: false,
    });
    if (blocked || !res.isConfirmed) return;
    try {
      const r = await deleteOrganizationById(org.id);
      if (r && !r.hasError) { successConfirmation('Organization deleted'); load(); }
      else throw new Error();
    } catch { errorConfirmation('Failed to delete organization'); }
  }

  return (
    <div style={{ background: C.panel, borderRadius: 14, padding: 'clamp(16px, 3vw, 26px)' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: 0 }}>Organizations</h2>
          <div style={{ fontSize: 13, color: C.inkFaint, marginTop: 2 }}>Manage your organizations, sub-organizations and branches.</div>
        </div>
        <button type="button" onClick={() => setModal({ show: true, parent: null })}
          style={{ background: C.brand, border: 'none', borderRadius: 10, padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(157,65,65,.25)' }}>
          <IconPlus size={17} /> New Organization
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
          <StatCard icon={<IconBuilding size={20} />} label="Organizations" value={stats.rootOrgs} tone="brand" />
          <StatCard icon={<IconHierarchy size={20} />} label="Sub-Organizations" value={stats.subOrgs} tone="neutral" />
          <StatCard icon={<IconBranch size={20} />} label="Branches" value={stats.totalBranches} tone="branch" />
          <StatCard icon={<IconUsers size={20} />} label="Employees" value={stats.totalEmployees} tone="brand" />
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 360 }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.inkFaint, display: 'inline-flex' }}><IconSearch size={16} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search organizations or branches…"
          style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13.5, background: '#fff', outline: 'none' }} />
      </div>

      {/* Tree */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: 'clamp(12px, 2vw, 20px)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: C.inkFaint }}>
            <div className="spinner-border" style={{ color: C.brand, width: 28, height: 28 }} />
            <div style={{ marginTop: 12, fontSize: 13 }}>Loading organizations…</div>
          </div>
        ) : (
          <OrgTree
            organizations={visible}
            defaultExpandedDepth={1}
            emptyLabel={search ? 'No organizations match your search.' : 'No organizations yet.'}
            onSelectOrg={onOpenOrg}
            onEditOrg={onOpenOrg}
            onAddSubOrg={(parent) => setModal({ show: true, parent: { id: parent.id, name: parent.name } })}
            onDeleteOrg={handleDelete}
            onViewBranchEmployees={(branch) => setEmpModal({ show: true, branch })}
          />
        )}
      </div>

      <OrganizationFormModal
        show={modal.show}
        parentOrg={modal.parent}
        onCreated={load}
        onClose={() => setModal({ show: false, parent: null })}
      />

      <BranchEmployeesModal
        show={empModal.show}
        branchId={empModal.branch?.id}
        branchName={empModal.branch?.name}
        onClose={() => setEmpModal({ show: false, branch: null })}
      />
    </div>
  );
}
