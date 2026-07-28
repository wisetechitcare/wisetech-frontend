import { ReactNode, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, Divider, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DriveFileMoveOutlinedIcon from '@mui/icons-material/DriveFileMoveOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import Groups2OutlinedIcon from '@mui/icons-material/Groups2Outlined';
import AssignmentIndOutlinedIcon from '@mui/icons-material/AssignmentIndOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { StatusBadge } from './StatusBadge';
import { StatCard } from './StatCard';
import { UnitTypeIcon } from './UnitTypeIcon';
import { UnitDetailsSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { EmptyState } from './EmptyState';
import { useUnitDetails } from '../hooks/useOrganization';
import { formatDate, humanizeType } from '../utils/format';

export type UnitAction = 'addChild' | 'rename' | 'move' | 'archive' | 'restore';

interface UnitDetailsProps {
  unitId: string | null;
  onAction: (action: UnitAction, unitId: string) => void;
  onSelectUnit: (unitId: string) => void;
}

/** Real, built-out sections. */
const REAL_TABS = ['General', 'Hierarchy', 'Statistics', 'Child Units'] as const;
/**
 * Organization Settings foundation: these sections are the destinations for
 * later releases. Shown (disabled) so the roadmap is discoverable, but only
 * General + Hierarchy (+ Statistics/Children) are wired in this phase.
 */
const FUTURE_TABS = [
  'Employees', 'Assignments', 'Roles', 'Access', 'Policies',
  'Branding', 'Integrations', 'Security', 'Audit',
] as const;

const MetaRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 1 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' }} component="div">{value}</Typography>
  </Box>
);

const TabPanel = ({ children, value, index }: { children: ReactNode; value: number; index: number }) => (
  <Box role="tabpanel" hidden={value !== index} id={`unit-tabpanel-${index}`} aria-labelledby={`unit-tab-${index}`}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </Box>
);

const MetadataView = ({ metadata }: { metadata: Record<string, unknown> | null }) => {
  const entries = metadata ? Object.entries(metadata) : [];
  if (!entries.length) return <Typography variant="body2" color="text.secondary">No metadata set.</Typography>;
  return (
    <Box>
      {entries.map(([key, val]) => (
        <MetaRow
          key={key}
          label={key}
          value={typeof val === 'object' ? <code>{JSON.stringify(val)}</code> : String(val)}
        />
      ))}
    </Box>
  );
};

/** Right-hand details panel for the selected unit. */
export const UnitDetails = ({ unitId, onAction, onSelectUnit }: UnitDetailsProps) => {
  const [tab, setTab] = useState(0);
  const { data, isLoading, isError, isFetching, refetch } = useUnitDetails(unitId ?? undefined);

  if (!unitId) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <EmptyState
          variant="no-data"
          icon={<AccountTreeOutlinedIcon sx={{ fontSize: 32 }} />}
          title="Select a unit"
          description="Choose a unit from the structure on the left to see its details."
        />
      </Card>
    );
  }

  if (isLoading) {
    return <Card variant="outlined" sx={{ borderRadius: 3, p: 3 }}><UnitDetailsSkeleton /></Card>;
  }

  if (isError || !data) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
        <ErrorState
          title="We couldn't load this unit"
          description="The unit may have been removed, or the server is unreachable."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </Card>
    );
  }

  const { general, hierarchy, statistics, children } = data;
  const isArchived = general.status === 'archived';

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: '100%', overflow: 'auto' }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main', flexShrink: 0 }} aria-hidden="true">
            <UnitTypeIcon type={general.type} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>{general.name}</Typography>
              <StatusBadge status={general.status} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {humanizeType(general.type)}{general.code ? ` · ${general.code}` : ''}
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Add child unit">
              <IconButton size="small" aria-label="Add child unit" onClick={() => onAction('addChild', general.id)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={isArchived ? 'Rename (unarchive first)' : 'Rename'}>
              <span>
                <IconButton size="small" aria-label="Rename unit" disabled={isArchived} onClick={() => onAction('rename', general.id)}>
                  <DriveFileRenameOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isArchived ? 'Move (unarchive first)' : 'Move'}>
              <span>
                <IconButton size="small" aria-label="Move unit" disabled={isArchived} onClick={() => onAction('move', general.id)}>
                  <DriveFileMoveOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {isArchived ? (
              <Tooltip title="Restore">
                <IconButton size="small" color="success" aria-label="Restore unit" onClick={() => onAction('restore', general.id)}>
                  <UnarchiveOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Archive">
                <IconButton size="small" color="error" aria-label="Archive unit" onClick={() => onAction('archive', general.id)}>
                  <Inventory2OutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Unit sections"
          sx={{ borderBottom: 1, borderColor: 'divider', mt: 2 }}
        >
          {REAL_TABS.map((label, i) => (
            <Tab key={label} label={label} id={`unit-tab-${i}`} aria-controls={`unit-tabpanel-${i}`}
              sx={{ textTransform: 'none', fontWeight: 600 }} />
          ))}
          {FUTURE_TABS.map((label) => (
            <Tooltip key={label} title="Available in a later release">
              <span>
                <Tab label={label} disabled sx={{ textTransform: 'none' }} />
              </span>
            </Tooltip>
          ))}
        </Tabs>

        {/* General */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ maxWidth: 560 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Details</Typography>
            <Divider sx={{ mb: 1 }} />
            <MetaRow label="Name" value={general.name} />
            <MetaRow label="Code" value={general.code || '—'} />
            <MetaRow label="Type" value={humanizeType(general.type)} />
            <MetaRow label="Status" value={general.status === 'archived' ? 'Archived' : 'Active'} />
            <MetaRow label="Created" value={formatDate(general.createdAt)} />
            <MetaRow label="Last updated" value={formatDate(general.updatedAt)} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 0.5 }}>Metadata</Typography>
            <Divider sx={{ mb: 1 }} />
            <MetadataView metadata={general.metadata} />
          </Box>
        </TabPanel>

        {/* Hierarchy */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ maxWidth: 640 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Path</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5, mb: 3 }}>
              {hierarchy.breadcrumbs.length === 0 && (
                <Typography variant="body2" color="text.secondary">Top-level unit.</Typography>
              )}
              {hierarchy.breadcrumbs.map((crumb, i) => (
                <Box key={crumb.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {i > 0 && <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
                  <Chip
                    size="small"
                    icon={<UnitTypeIcon type={crumb.type} fontSize="small" />}
                    label={crumb.name}
                    onClick={crumb.id === general.id ? undefined : () => onSelectUnit(crumb.id)}
                    variant={crumb.id === general.id ? 'filled' : 'outlined'}
                    sx={{ borderRadius: 1.5, fontWeight: crumb.id === general.id ? 700 : 500 }}
                  />
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              <StatCard label="Depth" value={hierarchy.depth} hint="Levels below the root" icon={<LayersOutlinedIcon />} />
              <StatCard label="Ancestors" value={hierarchy.ancestors.length} hint="Units above this one" icon={<AccountTreeOutlinedIcon />} />
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Ancestors</Typography>
            <Divider sx={{ mb: 1 }} />
            {hierarchy.ancestors.length === 0 ? (
              <Typography variant="body2" color="text.secondary">None — this is a top-level unit.</Typography>
            ) : (
              <List dense disablePadding>
                {hierarchy.ancestors.map((a) => (
                  <ListItemButton key={a.id} onClick={() => onSelectUnit(a.id)} sx={{ borderRadius: 2 }}>
                    <ListItemIcon sx={{ minWidth: 34 }}><UnitTypeIcon type={a.type} fontSize="small" color="action" /></ListItemIcon>
                    <ListItemText primary={a.name} secondary={humanizeType(a.type)} />
                    <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </TabPanel>

        {/* Statistics */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
            <StatCard label="Direct children" value={statistics.directChildren} icon={<AccountTreeOutlinedIcon />} />
            <StatCard label="Total descendants" value={statistics.totalDescendants} icon={<LayersOutlinedIcon />} />
            <StatCard label="Active assignments" value={statistics.activeAssignments} icon={<AssignmentIndOutlinedIcon />} />
            <StatCard label="Employees" value={statistics.employees} icon={<Groups2OutlinedIcon />} />
          </Box>
        </TabPanel>

        {/* Child Units */}
        <TabPanel value={tab} index={3}>
          {children.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="No child units"
              description="This unit has no sub-units yet."
              actionLabel="Add child unit"
              onAction={() => onAction('addChild', general.id)}
            />
          ) : (
            <List dense disablePadding>
              {children.map((child) => (
                <ListItemButton key={child.id} onClick={() => onSelectUnit(child.id)} sx={{ borderRadius: 2, opacity: child.status === 'archived' ? 0.6 : 1 }}>
                  <ListItemIcon sx={{ minWidth: 34 }}><UnitTypeIcon type={child.type} fontSize="small" color="action" /></ListItemIcon>
                  <ListItemText primary={child.name} secondary={humanizeType(child.type)} />
                  {child.status === 'archived' && (
                    <Chip label="Archived" size="small" variant="outlined" sx={{ height: 20, mr: 1, fontSize: 11 }} />
                  )}
                  <ChevronRightIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                </ListItemButton>
              ))}
            </List>
          )}
          <Box sx={{ mt: 2 }}>
            <Button startIcon={<AddIcon />} size="small" onClick={() => onAction('addChild', general.id)} sx={{ textTransform: 'none' }}>
              Add child unit
            </Button>
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  );
};

export default UnitDetails;
