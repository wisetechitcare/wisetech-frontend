import { Building2, GitBranch, Network, Pencil, Trash2, Users } from 'lucide-react';
import type { HueTone } from '@/ds/lib/tone';
import { Badge } from '@/ds/ui/badge';
import { SmartAvatar } from '@/ds/ui/smart-avatar';
import { EmptyState } from '@/ds/patterns/empty-state';
import { IconBox } from '@/ds/patterns/icon-box';
import { RowAction } from '@/ds/patterns/row-action';
import { TreeTable, type TreeTableColumn, type TreeTableNode } from '@/ds/patterns/tree-table';
import { IOrgNode, IOrgBranchNode } from '@models/company';

/**
 * Organization hierarchy — the org/sub-org/branch data mapped onto the kit's Patterns/Tree Table.
 * This file owns only the org meaning (rolled-up totals, which actions a row offers); every pixel
 * comes from the kit.
 *
 * Parent rows show ROLLED-UP totals — the API's counts are direct, which made the group itself read
 * "0 branches, 0 employees" above children that had 37 between them.
 */

/** One hue per kind of thing, shared with the page's stat tiles so the tiles read as the legend. */
export const ORG_TONES = {
  org: 'blue',
  subOrgs: 'purple',
  branches: 'cyan',
  employees: 'amber',
} as const satisfies Record<string, HueTone>;

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
  /** Bump `n` to open (or close) every node at once — the page's Expand / Collapse all. */
  expandSignal?: { open: boolean; n: number };
  emptyLabel?: string;
  /** `no-match` while a search filtered everything out. */
  emptyVariant?: 'empty' | 'no-match';
}

export type OrgTotals = { subOrgs: number; branches: number; employees: number };

/** Direct counts plus every descendant's. */
export const orgTotals = (org: IOrgNode): OrgTotals =>
  org.children.reduce<OrgTotals>((t, c) => {
    const ct = orgTotals(c);
    return { subOrgs: t.subOrgs + 1 + ct.subOrgs, branches: t.branches + ct.branches, employees: t.employees + ct.employees };
  }, { subOrgs: 0, branches: org.branchCount, employees: org.employeeCount });

const COLUMNS: TreeTableColumn[] = [
  { id: 'subOrgs', header: 'Sub-orgs', tone: ORG_TONES.subOrgs, hideOnPhone: true },
  { id: 'branches', header: 'Branches', tone: ORG_TONES.branches },
  { id: 'employees', header: 'Employees', tone: ORG_TONES.employees, hideOnPhone: true },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** A meaningful subtitle — the API sends "0" for an unset business type. */
const subtitleOf = (org: IOrgNode) => {
  const own = [org.businessType, org.address].find((v) => v && String(v).trim() && String(v).trim() !== '0');
  if (own) return String(own);
  if (org.children.length || org.branches.length) {
    return `${plural(org.children.length, 'sub-org', 'sub-orgs')}, ${plural(org.branches.length, 'branch', 'branches')}`;
  }
  return 'No sub-organizations or branches yet';
};

function branchNode(branch: IOrgBranchNode, org: IOrgNode, h: OrgTreeHandlers): TreeTableNode {
  const view = h.onViewBranchEmployees;
  const open = h.onSelectBranch;
  return {
    id: `branch:${branch.id}`,
    title: branch.name,
    subtitle: branch.address || undefined,
    kind: { label: 'Branch', tone: ORG_TONES.branches },
    status: branch.isActive === false ? <Badge variant="neutral">Inactive</Badge> : undefined,
    tone: ORG_TONES.branches,
    media: <IconBox tone={ORG_TONES.branches} size="sm" icon={<GitBranch aria-hidden />} />,
    counts: {
      employees: view
        ? { value: branch.employeeCount, onClick: () => view(branch), label: `View employees in ${branch.name}` }
        : branch.employeeCount,
    },
    onOpen: open ? () => open(branch, org) : undefined,
    openLabel: `Open branch ${branch.name}`,
    actions: (view || open) && (
      <>
        {view && <RowAction label="View employees" onClick={() => view(branch)}><Users aria-hidden /></RowAction>}
        {open && <RowAction label="Open branch" onClick={() => open(branch, org)}><Pencil aria-hidden /></RowAction>}
      </>
    ),
  };
}

function orgNode(org: IOrgNode, depth: number, h: OrgTreeHandlers): TreeTableNode {
  const totals = orgTotals(org);
  const root = depth === 0;
  const tone = root ? ORG_TONES.org : ORG_TONES.subOrgs;
  const hasActions = h.onAddSubOrg || h.onAddBranch || h.onEditOrg || h.onDeleteOrg;
  return {
    id: org.id,
    title: org.name,
    subtitle: subtitleOf(org),
    kind: { label: root ? 'Group' : 'Sub-org', tone },
    tone,
    media: <SmartAvatar name={org.name} seed={org.id} src={org.logo} shape="rounded" fit="contain" size={root ? 'default' : 'sm'} decorative />,
    counts: { subOrgs: totals.subOrgs, branches: totals.branches, employees: totals.employees },
    onOpen: h.onSelectOrg ? () => h.onSelectOrg?.(org) : undefined,
    actions: hasActions && (
      <>
        {h.onAddSubOrg && <RowAction label="Add sub-organization" onClick={() => h.onAddSubOrg?.(org)}><Network aria-hidden /></RowAction>}
        {h.onAddBranch && <RowAction label="Add branch" onClick={() => h.onAddBranch?.(org)}><GitBranch aria-hidden /></RowAction>}
        {h.onEditOrg && <RowAction label="Edit organization" onClick={() => h.onEditOrg?.(org)}><Pencil aria-hidden /></RowAction>}
        {h.onDeleteOrg && <RowAction label="Delete organization" tint="danger" onClick={() => h.onDeleteOrg?.(org)}><Trash2 aria-hidden /></RowAction>}
      </>
    ),
    children: [
      ...org.children.map((child) => orgNode(child, depth + 1, h)),
      ...org.branches.map((branch) => branchNode(branch, org, h)),
    ],
  };
}

export default function OrgTree({
  organizations,
  defaultExpandedDepth = 1,
  forceExpand,
  expandSignal,
  emptyLabel = 'No organizations yet.',
  emptyVariant = 'empty',
  ...handlers
}: OrgTreeProps) {
  return (
    <TreeTable
      nameHeader="Organization"
      columns={COLUMNS}
      nodes={organizations.map((org) => orgNode(org, 0, handlers))}
      defaultExpandedDepth={defaultExpandedDepth}
      forceExpand={forceExpand}
      expandSignal={expandSignal}
      empty={
        <EmptyState
          variant={emptyVariant}
          icon={emptyVariant === 'empty' ? <Building2 aria-hidden /> : undefined}
          title={emptyLabel}
          description={
            emptyVariant === 'no-match'
              ? 'Try a different organization or branch name.'
              : 'Create an organization to start building the hierarchy.'
          }
        />
      }
    />
  );
}
