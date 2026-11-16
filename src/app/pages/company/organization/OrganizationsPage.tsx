import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Building2, ChevronsDownUp, ChevronsUpDown, GitBranch, Network, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/ds/ui/button';
import { Card, CardContent } from '@/ds/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/ds/ui/input-group';
import { Separator } from '@/ds/ui/separator';
import { Spinner } from '@/ds/ui/spinner';
import { CountUp } from '@/ds/effects/count-up';
import { FilterToolbar } from '@/ds/patterns/filter-toolbar';
import { StatCard } from '@/ds/patterns/stat-card';
import { safeHtml } from '@app/modules/common/components/ui/safeHtml';
import { alertDialog, confirmDialog } from '@app/modules/common/components/ui';
import { IOrgNode, IOrgStats, IOrgBranchNode } from '@models/company';
import { fetchOrganizationTree, fetchOrganizationStats, deleteOrganizationById } from '@services/company';
import { errorConfirmation, successConfirmation } from '@utils/modal';
import { canDelete } from '@utils/can';
import OrgTree, { ORG_TONES } from '@app/modules/common/components/OrgTree';
import OrganizationFormModal from './OrganizationFormModal';
import BranchEmployeesModal from '@app/modules/common/components/BranchEmployeesModal';
import type { RootState } from '@redux/store';

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

/**
 * Organizations — four headline figures (Stat Card, `sm`), then one panel: the toolbar (search,
 * Expand / Collapse all, New organization) over the hierarchy (Tree Table). The figures share their hue
 * with the matching tree column, so they double as the tree's legend.
 */
export default function OrganizationsPage({ onOpenOrg }: Props) {
  const navigate = useNavigate();
  const tier = useSelector((state: RootState) => state.authz.tier);
  const canProvisionOrganizations = tier === 'SUPER_ADMIN';
  const [tree, setTree] = useState<IOrgNode[]>([]);
  const [stats, setStats] = useState<IOrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandSignal, setExpandSignal] = useState({ open: false, n: 0 });
  const [modal, setModal] = useState<{ show: boolean; parent: { id: string; name: string } | null }>({ show: false, parent: null });
  const [empModal, setEmpModal] = useState<{ show: boolean; branch: IOrgBranchNode | null }>({ show: false, branch: null });

  /** Branch row → parent org profile with Branches open and that branch ready to edit. */
  const openBranch = useCallback((branch: IOrgBranchNode, org: IOrgNode) => {
    const params = new URLSearchParams({ openBranches: '1', branchId: branch.id });
    navigate(`/company/organization-profile/${org.id}?${params.toString()}`);
  }, [navigate]);

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

  const searching = search.trim().length > 0;
  const visible = useMemo(() => filterTree(tree, search), [tree, search]);
  // The next click's direction: after "Expand all" the button offers to collapse.
  const willOpen = !expandSignal.open;

  async function handleDelete(org: IOrgNode) {
    const blocked = org.childCount > 0 || org.branchCount > 0 || org.employeeCount > 0;
    // safeHtml on BOTH arms: `org.name` is user-entered, and `html` renders as markup.
    // The counts are numbers, but escaping them costs nothing and keeps the rule
    // "every interpolation into html goes through safeHtml" free of exceptions to argue
    // about. (The dialog also DOMPurifies it.)
    if (blocked) {
      // Acknowledge-only: a blocked delete offers nothing to confirm.
      await alertDialog({
        icon: 'warning',
        title: 'Cannot delete yet',
        html: safeHtml`<b>${org.name}</b> still has ${org.childCount} sub-org(s), ${org.branchCount} branch(es) and ${org.employeeCount} employee(s).<br/>Reassign or remove them first.`,
        confirmText: 'OK',
      });
      return;
    }
    const confirmed = await confirmDialog({
      icon: 'warning',
      title: 'Delete organization?',
      html: safeHtml`This will permanently delete <b>${org.name}</b>. This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const r = await deleteOrganizationById(org.id);
      if (r && !r.hasError) { successConfirmation('Organization deleted'); load(); }
      else throw new Error();
    } catch { errorConfirmation('Failed to delete organization'); }
  }

  const tiles = stats ? [
    { value: stats.rootOrgs, label: stats.rootOrgs === 1 ? 'Organization' : 'Organizations', tone: ORG_TONES.org, icon: <Building2 aria-hidden /> },
    { value: stats.subOrgs, label: stats.subOrgs === 1 ? 'Sub-organization' : 'Sub-organizations', tone: ORG_TONES.subOrgs, icon: <Network aria-hidden /> },
    { value: stats.totalBranches, label: stats.totalBranches === 1 ? 'Branch' : 'Branches', tone: ORG_TONES.branches, icon: <GitBranch aria-hidden /> },
    { value: stats.totalEmployees, label: stats.totalEmployees === 1 ? 'Employee' : 'Employees', tone: ORG_TONES.employees, icon: <Users aria-hidden /> },
  ] : [];

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4">
      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <StatCard key={t.label} size="sm" label={t.label} value={<CountUp value={t.value} />} tone={t.tone} icon={t.icon} />
          ))}
        </div>
      )}

      <Card variant="panel" size="sm">
        <CardContent>
          <FilterToolbar
            activeCount={searching ? 1 : 0}
            onClear={() => setSearch('')}
            actions={
              <>
                <Button
                  variant="inverted"
                  size="sm"
                  disabled={!tree.length || searching}
                  onClick={() => setExpandSignal((s) => ({ open: willOpen, n: s.n + 1 }))}
                >
                  {willOpen ? <ChevronsUpDown data-icon="inline-start" aria-hidden /> : <ChevronsDownUp data-icon="inline-start" aria-hidden />}
                  {willOpen ? 'Expand all' : 'Collapse all'}
                </Button>
                {canProvisionOrganizations && (
                  <Button size="sm" onClick={() => setModal({ show: true, parent: null })}>
                    <Plus data-icon="inline-start" aria-hidden />
                    New organization
                  </Button>
                )}
              </>
            }
          >
            <InputGroup className="w-full sm:w-72">
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
              <InputGroupInput
                aria-label="Search organizations or branches"
                placeholder="Search organizations or branches"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </FilterToolbar>
        </CardContent>

        <Separator />

        <CardContent>
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Spinner className="size-5" aria-label="Loading organizations" /> Loading organizations…
            </p>
          ) : (
            <OrgTree
              organizations={visible}
              defaultExpandedDepth={1}
              forceExpand={searching}
              expandSignal={expandSignal}
              emptyLabel={searching ? 'No organizations match your search' : 'No organizations yet'}
              emptyVariant={searching ? 'no-match' : 'empty'}
              onSelectOrg={onOpenOrg}
              onEditOrg={onOpenOrg}
              onSelectBranch={openBranch}
              onAddSubOrg={
                canProvisionOrganizations
                  ? (parent) => setModal({ show: true, parent: { id: parent.id, name: parent.name } })
                  : undefined
              }
              onDeleteOrg={canDelete('settings.profile') ? handleDelete : undefined}
              onViewBranchEmployees={(branch) => setEmpModal({ show: true, branch })}
            />
          )}
        </CardContent>
      </Card>

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
