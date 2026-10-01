import { useEffect, useState } from 'react';
import { Box, Stack, Typography, alpha, keyframes } from '@mui/material';
import { IOrgNode, IOrgBranchNode } from '@models/company';
import { IconBuilding, IconHierarchy, IconBranch, IconEdit, IconTrash, IconChevron } from '@app/modules/common/components/icons/OrgIcons';
import SmartAvatar from '@app/modules/common/components/SmartAvatar';
import { WtTooltip } from '@app/modules/common/components/ui';

/**
 * Organization hierarchy as a TREE-TABLE: one row per org / sub-org / branch, indented with
 * ├ └ guide lines, and the counts in fixed columns so they line up across every level
 * (badges floating at the row's end did not, and left the middle of each row empty).
 *
 * Parent rows show ROLLED-UP totals — the API's counts are direct, which made the group
 * itself read "0 branches, 0 employees" above children that had 37 between them.
 */

/** One colour per kind of thing, shared with the page's stat tiles so the tiles read as the legend. */
export const ORG_TONES = {
  org: '#1E3A8A',
  subOrgs: '#7C3AED',
  branches: '#0D9488',
  employees: '#D97706',
} as const;

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
}

export type OrgTotals = { subOrgs: number; branches: number; employees: number };

/** Direct counts plus every descendant's. */
export const orgTotals = (org: IOrgNode): OrgTotals =>
  org.children.reduce<OrgTotals>((t, c) => {
    const ct = orgTotals(c);
    return { subOrgs: t.subOrgs + 1 + ct.subOrgs, branches: t.branches + ct.branches, employees: t.employees + ct.employees };
  }, { subOrgs: 0, branches: org.branchCount, employees: org.employeeCount });

const INDENT = 26;
/** name | sub-orgs | branches | employees | actions */
const COLUMNS = {
  xs: 'minmax(0,1fr) auto',
  md: 'minmax(0,1fr) 96px 96px 104px 116px',
};
const REDUCED = '@media (prefers-reduced-motion: reduce)';
const rise = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; }`;

/** A meaningful subtitle — the API sends "0" for an unset business type. */
const subtitleOf = (org: IOrgNode) =>
  [org.businessType, org.address].find((v) => v && String(v).trim() && String(v).trim() !== '0') || '';

/** ├ └ │ guides for one row: a vertical through-line per ancestor that has more siblings below, then this row's elbow. */
function Guides({ guides, last, tone }: { guides: boolean[]; last: boolean; tone: string }) {
  const line = alpha(tone, 0.3);
  return (
    <>
      {guides.map((through, i) => through && (
        <Box key={i} aria-hidden sx={{ position: 'absolute', left: i * INDENT + 11, top: 0, bottom: 0, width: '1.5px', bgcolor: 'divider' }} />
      ))}
      <Box aria-hidden sx={{ position: 'absolute', left: guides.length * INDENT + 11, top: 0, height: last ? '50%' : '100%', width: '1.5px', bgcolor: line }} />
      <Box aria-hidden sx={{ position: 'absolute', left: guides.length * INDENT + 11, top: '50%', width: 13, height: '1.5px', bgcolor: line }} />
      <Box aria-hidden sx={{ position: 'absolute', left: guides.length * INDENT + 22, top: 'calc(50% - 2.5px)', width: 5, height: 5, borderRadius: '50%', bgcolor: tone }} />
    </>
  );
}

/** A count in its type's colour — a soft pill when there is something, a quiet zero when not. */
function Count({ value, tone, onClick, title, sx }: { value: number; tone: string; onClick?: () => void; title?: string; sx?: object }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', ...sx }}>
      <Box
        component={onClick ? 'button' : 'span'}
        type={onClick ? 'button' : undefined}
        title={title}
        onClick={onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick(); } : undefined}
        sx={{
          minWidth: 38, px: 1, py: 0.25, borderRadius: 99, border: 1, font: 'inherit', textAlign: 'center',
          fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          ...(value
            ? { color: tone, bgcolor: alpha(tone, 0.1), borderColor: alpha(tone, 0.22) }
            : { color: 'text.disabled', bgcolor: 'transparent', borderColor: 'transparent' }),
          cursor: onClick ? 'pointer' : 'default',
          transition: 'background-color .15s ease, box-shadow .15s ease',
          ...(onClick && { '&:hover': { bgcolor: alpha(tone, 0.18), boxShadow: `0 2px 8px ${alpha(tone, 0.25)}` } }),
          '&:focus-visible': { outline: 2, outlineColor: tone, outlineOffset: 1 },
        }}
      >
        {value}
      </Box>
    </Box>
  );
}

function ActionBtn({ title, onClick, children, danger }: { title: string; onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <WtTooltip title={title}>
      <Box
        component="button"
        type="button"
        aria-label={title}
        onClick={(e: React.MouseEvent) => { e.stopPropagation(); onClick(); }}
        sx={{
          width: 28, height: 28, borderRadius: '8px', display: 'inline-grid', placeItems: 'center', border: 1,
          borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary', cursor: 'pointer',
          transition: 'all .15s ease',
          '&:hover': danger
            ? { color: 'error.main', borderColor: 'error.light', bgcolor: (t) => alpha(t.palette.error.main, 0.08) }
            : { color: 'primary.main', borderColor: 'primary.light', bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
          '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: 1 },
        }}
      >
        {children}
      </Box>
    </WtTooltip>
  );
}

const rowSx = (order: number) => ({
  position: 'relative' as const,
  display: 'grid',
  gridTemplateColumns: COLUMNS,
  alignItems: 'center',
  columnGap: 2,
  minHeight: 56,
  px: { xs: 1, md: 1.5 },
  borderRadius: '10px',
  transition: 'background-color .15s ease',
  animation: `${rise} 360ms cubic-bezier(.22,1,.36,1) both`,
  animationDelay: `${Math.min(order, 12) * 35}ms`,
  [REDUCED]: { animation: 'none' },
  '&:hover': { bgcolor: 'action.hover' },
  '&:hover .org-actions, &:focus-within .org-actions': { opacity: 1, transform: 'none' },
});

/** The name cell's left inset: room for every guide column plus this row's elbow. */
const nameInset = (depth: number) => (depth === 0 ? 0 : depth * INDENT + 10);

function BranchRow({ branch, org, depth, guides, last, order, onSelect, onViewEmployees }: {
  branch: IOrgBranchNode; org: IOrgNode; depth: number; guides: boolean[]; last: boolean; order: number;
  onSelect?: (b: IOrgBranchNode, o: IOrgNode) => void; onViewEmployees?: (b: IOrgBranchNode) => void;
}) {
  return (
    <Box onClick={() => onSelect?.(branch, org)} sx={{ ...rowSx(order), minHeight: 48, cursor: onSelect ? 'pointer' : 'default' }}>
      <Guides guides={guides} last={last} tone={ORG_TONES.branches} />
      <Stack direction="row" alignItems="center" gap={1.25} sx={{ pl: `${nameInset(depth)}px`, minWidth: 0 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '8px', flexShrink: 0, display: 'grid', placeItems: 'center', color: ORG_TONES.branches, bgcolor: alpha(ORG_TONES.branches, 0.1) }}>
          <IconBranch size={15} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Typography noWrap sx={{ fontSize: 13.5, fontWeight: 600 }}>{branch.name}</Typography>
            {branch.isActive === false && (
              <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', border: 1, borderColor: 'divider', borderRadius: 99, px: 0.75 }}>Inactive</Typography>
            )}
          </Stack>
          {branch.address && <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>{branch.address}</Typography>}
        </Box>
      </Stack>
      <Box sx={{ display: { xs: 'none', md: 'block' } }} />
      <Box sx={{ display: { xs: 'none', md: 'block' } }} />
      <Count
        value={branch.employeeCount}
        tone={ORG_TONES.employees}
        onClick={onViewEmployees ? () => onViewEmployees(branch) : undefined}
        title={onViewEmployees ? 'View employees in this branch' : undefined}
      />
      <Box sx={{ display: { xs: 'none', md: 'block' } }} />
    </Box>
  );
}

function OrgNodeRow({ org, depth, guides, last, order, handlers, defaultExpandedDepth, forceExpand, expandSignal }: {
  org: IOrgNode; depth: number; guides: boolean[]; last: boolean; order: number; handlers: OrgTreeHandlers;
  defaultExpandedDepth: number; forceExpand?: boolean; expandSignal?: { open: boolean; n: number };
}) {
  const [open, setOpen] = useState(depth < defaultExpandedDepth);
  useEffect(() => {
    if (expandSignal?.n) setOpen(expandSignal.open);
  }, [expandSignal]);
  const hasChildren = org.children.length > 0 || org.branches.length > 0;
  const isOpen = forceExpand || open;
  const totals = orgTotals(org);
  const subtitle = subtitleOf(org);
  // Children draw a through-line at this level only if this row has siblings below it.
  const childGuides = depth === 0 ? [] : [...guides, !last];
  const kids = org.children.length + org.branches.length;
  const tone = depth === 0 ? ORG_TONES.org : ORG_TONES.subOrgs;

  return (
    <Box>
      <Box
        onClick={() => handlers.onSelectOrg?.(org)}
        sx={{
          ...rowSx(order),
          cursor: handlers.onSelectOrg ? 'pointer' : 'default',
          ...(depth === 0 && {
            bgcolor: alpha(ORG_TONES.org, 0.05), boxShadow: `inset 3px 0 0 ${ORG_TONES.org}`, borderRadius: '0 10px 10px 0', mb: 0.5,
            '&:hover': { bgcolor: alpha(ORG_TONES.org, 0.09) },
          }),
        }}
      >
        {depth > 0 && <Guides guides={guides} last={last} tone={ORG_TONES.subOrgs} />}
        <Stack direction="row" alignItems="center" gap={1.25} sx={{ pl: `${nameInset(depth)}px`, minWidth: 0 }}>
          <Box
            component="button"
            type="button"
            aria-label={isOpen ? `Collapse ${org.name}` : `Expand ${org.name}`}
            aria-expanded={hasChildren ? isOpen : undefined}
            disabled={!hasChildren}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen((o) => !o); }}
            sx={{
              width: 22, height: 22, flexShrink: 0, borderRadius: '6px', border: 0, display: 'grid', placeItems: 'center',
              bgcolor: hasChildren ? alpha(tone, 0.1) : 'transparent', color: tone, cursor: hasChildren ? 'pointer' : 'default',
              transition: 'background-color .15s ease',
              '&:hover:not(:disabled)': { bgcolor: alpha(tone, 0.2) },
            }}
          >
            {hasChildren && (
              <Box component="span" sx={{ display: 'inline-flex', transition: 'transform .25s cubic-bezier(.4,0,.2,1)', transform: isOpen ? 'rotate(90deg)' : 'none' }}>
                <IconChevron size={13} />
              </Box>
            )}
          </Box>
          <SmartAvatar name={org.name} id={org.id} imageUrl={org.logo} size={depth === 0 ? 40 : 34} shape="rounded" imageFit="contain" />
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.75}>
              <Typography noWrap sx={{ fontSize: depth === 0 ? 15 : 14, fontWeight: 700 }}>{org.name}</Typography>
              <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 700, color: tone, bgcolor: alpha(tone, 0.1), borderRadius: 99, px: 0.9, py: 0.1, flexShrink: 0 }}>
                {depth === 0 ? 'Group' : 'Sub-org'}
              </Typography>
            </Stack>
            <Typography noWrap sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              {subtitle || (kids ? `${org.children.length} sub-org${org.children.length === 1 ? '' : 's'}, ${org.branches.length} branch${org.branches.length === 1 ? '' : 'es'}` : 'No sub-organizations or branches yet')}
            </Typography>
          </Box>
        </Stack>
        <Count value={totals.subOrgs} tone={ORG_TONES.subOrgs} sx={{ display: { xs: 'none', md: 'flex' } }} />
        <Count value={totals.branches} tone={ORG_TONES.branches} />
        <Count value={totals.employees} tone={ORG_TONES.employees} sx={{ display: { xs: 'none', md: 'flex' } }} />
        <Stack
          direction="row"
          gap={0.75}
          justifyContent="flex-end"
          className="org-actions"
          sx={{
            gridColumn: { xs: 'span 2', md: 'auto' }, pb: { xs: 1, md: 0 },
            opacity: { xs: 1, md: 0 }, transform: { md: 'translateX(4px)' }, transition: 'opacity .18s ease, transform .18s ease',
            [REDUCED]: { transition: 'none' },
          }}
        >
          {handlers.onAddSubOrg && <ActionBtn title="Add sub-organization" onClick={() => handlers.onAddSubOrg!(org)}><IconHierarchy size={14} /></ActionBtn>}
          {handlers.onAddBranch && <ActionBtn title="Add branch" onClick={() => handlers.onAddBranch!(org)}><IconBranch size={14} /></ActionBtn>}
          {handlers.onEditOrg && <ActionBtn title="Edit organization" onClick={() => handlers.onEditOrg!(org)}><IconEdit size={14} /></ActionBtn>}
          {handlers.onDeleteOrg && <ActionBtn title="Delete organization" danger onClick={() => handlers.onDeleteOrg!(org)}><IconTrash size={14} /></ActionBtn>}
        </Stack>
      </Box>

      {/* Collapsible body — grid-rows 0fr→1fr, so the height animates without measuring. */}
      {hasChildren && (
        <Box sx={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr', transition: 'grid-template-rows .3s cubic-bezier(.4,0,.2,1)', [REDUCED]: { transition: 'none' } }}>
          <Box sx={{ overflow: 'hidden', opacity: isOpen ? 1 : 0, transition: 'opacity .22s ease', [REDUCED]: { transition: 'none' } }}>
            {org.children.map((child, i) => (
              <OrgNodeRow
                key={child.id}
                org={child}
                depth={depth + 1}
                guides={childGuides}
                last={i === kids - 1}
                order={order + 1 + i}
                handlers={handlers}
                defaultExpandedDepth={defaultExpandedDepth}
                forceExpand={forceExpand}
                expandSignal={expandSignal}
              />
            ))}
            {org.branches.map((branch, i) => (
              <BranchRow
                key={branch.id}
                branch={branch}
                org={org}
                depth={depth + 1}
                guides={childGuides}
                last={org.children.length + i === kids - 1}
                order={order + 1 + org.children.length + i}
                onSelect={handlers.onSelectBranch}
                onViewEmployees={handlers.onViewBranchEmployees}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

const HEAD = { fontSize: 11, fontWeight: 700, color: 'text.secondary', letterSpacing: '0.02em' };

/** Column heading with its type's colour dot — the same colour as its stat tile and its pills. */
const ColHead = ({ label, tone, sx }: { label: string; tone: string; sx?: object }) => (
  <Typography component="div" sx={{ ...HEAD, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.75, ...sx }}>
    <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tone }} />
    {label}
  </Typography>
);

export default function OrgTree({ organizations, defaultExpandedDepth = 1, forceExpand, expandSignal, emptyLabel = 'No organizations yet.', ...handlers }: OrgTreeProps) {
  if (!organizations.length) {
    return (
      <Stack alignItems="center" gap={1} sx={{ py: 7, px: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Box sx={{ color: 'text.disabled' }}><IconBuilding size={36} /></Box>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'text.primary' }}>{emptyLabel}</Typography>
        <Typography sx={{ fontSize: 13 }}>Create an organization to start building the hierarchy.</Typography>
      </Stack>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: COLUMNS, columnGap: 2, px: { xs: 1, md: 1.5 }, pb: 1, mb: 0.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography sx={HEAD}>Organization</Typography>
        <ColHead label="Sub-orgs" tone={ORG_TONES.subOrgs} sx={{ display: { xs: 'none', md: 'flex' } }} />
        <ColHead label="Branches" tone={ORG_TONES.branches} />
        <ColHead label="Employees" tone={ORG_TONES.employees} sx={{ display: { xs: 'none', md: 'flex' } }} />
        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
      </Box>
      {organizations.map((org, i) => (
        <OrgNodeRow
          key={org.id}
          org={org}
          depth={0}
          guides={[]}
          last={i === organizations.length - 1}
          order={i}
          handlers={handlers}
          defaultExpandedDepth={defaultExpandedDepth}
          forceExpand={forceExpand}
          expandSignal={expandSignal}
        />
      ))}
    </Box>
  );
}
