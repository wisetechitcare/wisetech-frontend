import { useEffect, useMemo, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import { Box, InputBase, Stack, Typography, alpha, keyframes } from '@mui/material';
import { safeHtml } from '@app/modules/common/components/ui/safeHtml';
import { IOrgNode, IOrgStats, IOrgBranchNode } from '@models/company';
import { fetchOrganizationTree, fetchOrganizationStats, deleteOrganizationById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import OrgTree, { ORG_TONES } from '@app/modules/common/components/OrgTree';
import { useCountUp } from '@app/hooks/useCountUp';
import OrganizationFormModal from './OrganizationFormModal';
import BranchEmployeesModal from '@app/modules/common/components/BranchEmployeesModal';
import { IconSearch, IconPlus, IconChevron, IconBuilding, IconHierarchy, IconBranch, IconUsers } from '@app/modules/common/components/icons/OrgIcons';
import { WtButton } from '@app/modules/common/components/ui';

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

const REDUCED = '@media (prefers-reduced-motion: reduce)';
const rise = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; }`;

/**
 * One headline number. Its colour is the same one that tags the matching tree column, so the
 * four tiles double as the tree's legend. The number counts up once on load.
 */
function StatTile({ label, value, tone, icon, index }: { label: string; value: number; tone: string; icon: React.ReactNode; index: number }) {
  const shown = useCountUp(value);
  return (
    <Stack
      direction="row"
      alignItems="center"
      gap={1.75}
      sx={{
        position: 'relative', overflow: 'hidden', p: { xs: 1.75, md: 2.25 }, borderRadius: '14px',
        bgcolor: 'background.paper', border: 1, borderColor: alpha(tone, 0.22),
        backgroundImage: `linear-gradient(135deg, ${alpha(tone, 0.09)} 0%, transparent 60%)`,
        animation: `${rise} 420ms cubic-bezier(.22,1,.36,1) both`, animationDelay: `${index * 70}ms`,
        transition: 'transform .2s ease, box-shadow .2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 10px 24px ${alpha(tone, 0.16)}` },
        '&::before': { content: '""', position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: tone },
        [REDUCED]: { animation: 'none', transition: 'none', '&:hover': { transform: 'none' } },
      }}
    >
      <Box sx={{ width: 46, height: 46, borderRadius: '12px', flexShrink: 0, display: 'grid', placeItems: 'center', color: tone, bgcolor: alpha(tone, 0.12) }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: 'Barlow', fontSize: { xs: 24, md: 28 }, fontWeight: 700, lineHeight: 1, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(shown)}
        </Typography>
        <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 600, color: tone, mt: 0.5 }}>{label}</Typography>
      </Box>
    </Stack>
  );
}

/**
 * Organizations — the hierarchy as one panel: a single toolbar (search, totals, expand,
 * create) over the tree-table. The totals used to be four separate cards, the create button
 * its own row and the search a third, which stacked three bands of mostly empty space above
 * the thing people came to see.
 */
export default function OrganizationsPage({ onOpenOrg }: Props) {
  const [tree, setTree] = useState<IOrgNode[]>([]);
  const [stats, setStats] = useState<IOrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandSignal, setExpandSignal] = useState({ open: false, n: 0 });
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
  // The next click's direction: after "Expand all" the button offers to collapse.
  const willOpen = !expandSignal.open;

  async function handleDelete(org: IOrgNode) {
    const blocked = org.childCount > 0 || org.branchCount > 0 || org.employeeCount > 0;
    const res = await Swal.fire({
      title: blocked ? 'Cannot delete yet' : 'Delete organization?',
      // safeHtml on BOTH arms: `org.name` is user-entered, and SweetAlert parses
      // `html` as markup. The counts are numbers, but escaping them costs nothing
      // and keeps the rule "every interpolation into html goes through safeHtml"
      // free of exceptions to argue about.
      html: blocked
        ? safeHtml`<b>${org.name}</b> still has ${org.childCount} sub-org(s), ${org.branchCount} branch(es) and ${org.employeeCount} employee(s).<br/>Reassign or remove them first.`
        : safeHtml`This will permanently delete <b>${org.name}</b>. This cannot be undone.`,
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

  const tiles = stats ? [
    { value: stats.rootOrgs, label: stats.rootOrgs === 1 ? 'Organization' : 'Organizations', tone: ORG_TONES.org, icon: <IconBuilding size={22} /> },
    { value: stats.subOrgs, label: stats.subOrgs === 1 ? 'Sub-organization' : 'Sub-organizations', tone: ORG_TONES.subOrgs, icon: <IconHierarchy size={22} /> },
    { value: stats.totalBranches, label: stats.totalBranches === 1 ? 'Branch' : 'Branches', tone: ORG_TONES.branches, icon: <IconBranch size={22} /> },
    { value: stats.totalEmployees, label: stats.totalEmployees === 1 ? 'Employee' : 'Employees', tone: ORG_TONES.employees, icon: <IconUsers size={22} /> },
  ] : [];

  return (
    <Stack gap={2}>
      {tiles.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' }, gap: { xs: 1.5, md: 2 } }}>
          {tiles.map((t, i) => <StatTile key={t.label} index={i} {...t} />)}
        </Box>
      )}

      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '14px', overflow: 'hidden' }}>
        {/* Toolbar */}
        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          gap={{ xs: 1.5, md: 2.5 }}
          sx={{ px: { xs: 1.5, md: 2.5 }, py: 1.75, borderBottom: 1, borderColor: 'divider' }}
        >
          <Stack
            direction="row"
            alignItems="center"
            gap={1}
            sx={{
              flex: { xs: '1 1 100%', sm: '0 1 300px' }, px: 1.25, height: 38, borderRadius: '10px', border: 1, borderColor: 'divider',
              color: 'text.secondary', transition: 'border-color .15s ease, box-shadow .15s ease',
              '&:focus-within': { borderColor: 'primary.main', boxShadow: (t) => `0 0 0 3px ${t.palette.primary.main}22` },
            }}
          >
            <IconSearch size={16} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations or branches"
              inputProps={{ 'aria-label': 'Search organizations or branches' }}
              sx={{ flex: 1, fontSize: 13.5 }}
            />
          </Stack>
  
          <Stack direction="row" gap={1} sx={{ ml: 'auto' }}>
            <WtButton
              inverted
              size="small"
              disabled={!tree.length || !!search.trim()}
              onClick={() => setExpandSignal((s) => ({ open: willOpen, n: s.n + 1 }))}
              startIcon={<Box component="span" sx={{ display: 'inline-flex', transform: willOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform .2s ease' }}><IconChevron size={13} /></Box>}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {willOpen ? 'Expand all' : 'Collapse all'}
            </WtButton>
            <WtButton size="small" onClick={() => setModal({ show: true, parent: null })} startIcon={<IconPlus size={15} />} sx={{ whiteSpace: 'nowrap' }}>
              New organization
            </WtButton>
          </Stack>
        </Stack>
  
        {/* Tree */}
        <Box sx={{ px: { xs: 1, md: 1.5 }, py: 1.5 }}>
          {loading ? (
            <Stack alignItems="center" gap={1.5} sx={{ py: 6, color: 'text.secondary' }}>
              <div className="spinner-border text-primary" role="status" />
              <Typography sx={{ fontSize: 13 }}>Loading organizations…</Typography>
            </Stack>
          ) : (
            <OrgTree
              organizations={visible}
              defaultExpandedDepth={1}
              forceExpand={!!search.trim()}
              expandSignal={expandSignal}
              emptyLabel={search ? 'No organizations match your search.' : 'No organizations yet.'}
              onSelectOrg={onOpenOrg}
              onEditOrg={onOpenOrg}
              onAddSubOrg={(parent) => setModal({ show: true, parent: { id: parent.id, name: parent.name } })}
              onDeleteOrg={handleDelete}
              onViewBranchEmployees={(branch) => setEmpModal({ show: true, branch })}
            />
          )}
        </Box>
  
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
      </Box>
    </Stack>
  );
}
