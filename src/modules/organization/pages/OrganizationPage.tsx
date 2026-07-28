import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Chip, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTenant, useUnitTree } from '../hooks/useOrganization';
import { Breadcrumbs, Crumb } from '../components/Breadcrumbs';
import { OrganizationTree } from '../components/OrganizationTree';
import { UnitDetails, UnitAction } from '../components/UnitDetails';
import { StatusBadge } from '../components/StatusBadge';
import { CreateUnitDialog, CreateUnitParent } from '../components/CreateUnitDialog';
import { RenameUnitDialog } from '../components/RenameUnitDialog';
import { MoveUnitDialog } from '../components/MoveUnitDialog';
import { ArchiveUnitDialog } from '../components/ArchiveUnitDialog';
import { RestoreUnitDialog } from '../components/RestoreUnitDialog';
import { ErrorState } from '../components/ErrorState';
import { findNode, pathToNode } from '../utils/tree';
import type { TreeNode } from '../types';
import type { TreeNodeActions } from '../components/treeTypes';

type DialogState =
  | { kind: 'createRoot' }
  | { kind: 'createChild'; node: TreeNode }
  | { kind: 'rename'; node: TreeNode }
  | { kind: 'move'; node: TreeNode }
  | { kind: 'archive'; node: TreeNode }
  | { kind: 'restore'; node: TreeNode }
  | null;

export const OrganizationPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  const { data: tenant, isError: tenantError, isFetching: tenantFetching, refetch: refetchTenant } = useTenant(tenantId);
  const { data: treeData, isLoading, isError, refetch } = useUnitTree(tenantId, { includeArchived });

  const tree = useMemo(() => treeData?.tree ?? [], [treeData]);

  // Auto-select the first root once the tree is available (and keep selection valid).
  useEffect(() => {
    if (!tree.length) { setSelectedId(null); return; }
    setSelectedId((prev) => (prev && findNode(tree, prev) ? prev : tree[0].id));
  }, [tree]);

  const selectUnit = useCallback((id: string) => setSelectedId(id), []);

  // Resolve a details-panel action (which only carries an id) against the tree.
  const runUnitAction = useCallback((action: UnitAction, unitId: string) => {
    const node = findNode(tree, unitId);
    if (!node) return;
    switch (action) {
      case 'addChild': setDialog({ kind: 'createChild', node }); break;
      case 'rename': setDialog({ kind: 'rename', node }); break;
      case 'move': setDialog({ kind: 'move', node }); break;
      case 'archive': setDialog({ kind: 'archive', node }); break;
      case 'restore': setDialog({ kind: 'restore', node }); break;
    }
  }, [tree]);

  const actions = useMemo<TreeNodeActions>(() => ({
    onSelect: (node) => setSelectedId(node.id),
    onViewDetails: (node) => setSelectedId(node.id),
    onAddChild: (node) => setDialog({ kind: 'createChild', node }),
    onRename: (node) => setDialog({ kind: 'rename', node }),
    onMove: (node) => setDialog({ kind: 'move', node }),
    onArchive: (node) => setDialog({ kind: 'archive', node }),
    onRestore: (node) => setDialog({ kind: 'restore', node }),
  }), []);

  // Page breadcrumb trail: tenant → …ancestors… → selected unit.
  const crumbs = useMemo<Crumb[]>(() => {
    const trail: Crumb[] = [
      { id: '__tenant__', label: tenant?.name ?? 'Organization', onClick: () => navigate('/organization') },
    ];
    if (selectedId) {
      pathToNode(tree, selectedId).forEach((node) => {
        trail.push({ id: node.id, label: node.name, onClick: () => setSelectedId(node.id) });
      });
    }
    return trail;
  }, [tenant, tree, selectedId, navigate]);

  const createParent: CreateUnitParent | null =
    dialog?.kind === 'createChild' ? { id: dialog.node.id, name: dialog.node.name, type: dialog.node.type } : null;

  if (tenantError) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <ErrorState
          title="We couldn't load this tenant"
          description="The tenant may have been removed, or the server is unreachable."
          onRetry={() => refetchTenant()}
          isRetrying={tenantFetching}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Breadcrumbs crumbs={crumbs} />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button
          onClick={() => navigate('/organization')}
          startIcon={<ArrowBackIcon />}
          size="small"
          sx={{ textTransform: 'none' }}
          aria-label="Back to tenants"
        >
          Back
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flexGrow: 1, minWidth: 200 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {tenant?.name ?? 'Organization'}
          </Typography>
          {tenant && <StatusBadge status={tenant.status} />}
          {tenant && <Chip size="small" label={`/${tenant.slug}`} sx={{ borderRadius: 1.5, bgcolor: 'action.hover' }} />}
        </Box>
      </Box>

      {/* Two-pane layout: structure tree (left) + unit details (right). */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: 'stretch',
          height: { md: 'calc(100vh - 230px)' },
          minHeight: { md: 480 },
        }}
      >
        <Box sx={{ width: { xs: '100%', md: 380 }, flexShrink: 0, height: { xs: 440, md: '100%' } }}>
          <OrganizationTree
            tree={tree}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            selectedId={selectedId}
            actions={actions}
            includeArchived={includeArchived}
            onToggleArchived={setIncludeArchived}
            onAddRoot={() => setDialog({ kind: 'createRoot' })}
          />
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0, height: { xs: 'auto', md: '100%' } }}>
          <UnitDetails unitId={selectedId} onAction={runUnitAction} onSelectUnit={selectUnit} />
        </Box>
      </Box>

      {/* Dialogs */}
      {tenantId && (
        <CreateUnitDialog
          open={dialog?.kind === 'createRoot' || dialog?.kind === 'createChild'}
          onClose={() => setDialog(null)}
          tenantId={tenantId}
          parent={createParent}
          onCreated={(id) => setSelectedId(id)}
        />
      )}
      <RenameUnitDialog
        open={dialog?.kind === 'rename'}
        onClose={() => setDialog(null)}
        unit={dialog?.kind === 'rename' ? { id: dialog.node.id, name: dialog.node.name, code: dialog.node.code } : null}
      />
      <MoveUnitDialog
        open={dialog?.kind === 'move'}
        onClose={() => setDialog(null)}
        unit={dialog?.kind === 'move' ? { id: dialog.node.id, name: dialog.node.name, parentId: dialog.node.parentId } : null}
        tree={tree}
      />
      <ArchiveUnitDialog
        open={dialog?.kind === 'archive'}
        onClose={() => setDialog(null)}
        unit={dialog?.kind === 'archive' ? { id: dialog.node.id, name: dialog.node.name, childCount: dialog.node.childCount } : null}
      />
      <RestoreUnitDialog
        open={dialog?.kind === 'restore'}
        onClose={() => setDialog(null)}
        unit={dialog?.kind === 'restore' ? { id: dialog.node.id, name: dialog.node.name, childCount: dialog.node.childCount } : null}
      />
    </Box>
  );
};

export default OrganizationPage;
