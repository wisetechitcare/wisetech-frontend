import { useCallback, useEffect, useMemo, useRef, useState, KeyboardEvent } from 'react';
import {
  Box, Button, Card, FormControlLabel, IconButton, Switch, Tooltip, Typography,
} from '@mui/material';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import AddIcon from '@mui/icons-material/Add';
import { SearchBar } from './SearchBar';
import { TreeNode } from './TreeNode';
import { UnitContextMenu, MenuAnchor } from './UnitContextMenu';
import { EmptyState } from './EmptyState';
import { TreeSkeleton } from './LoadingSkeleton';
import { ErrorState } from './ErrorState';
import { flattenTree, matchingNodeIds } from '../utils/tree';
import type { TreeNode as TreeNodeModel } from '../types';
import type { TreeNodeActions } from './treeTypes';

interface OrganizationTreeProps {
  tree: TreeNodeModel[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedId: string | null;
  actions: TreeNodeActions;
  includeArchived: boolean;
  onToggleArchived: (value: boolean) => void;
  /** Create a top-level unit (parent = tenant root). */
  onAddRoot: () => void;
}

/**
 * Professional expand/collapse organization tree. Built as a custom recursive
 * tree (no @mui/x-tree-view dependency — it is not installed). Features: search
 * with match highlighting + auto-expand, a "show archived" toggle, expand/
 * collapse-all, per-node context menu, and roving-tabindex keyboard navigation.
 */
export const OrganizationTree = ({
  tree, isLoading, isError, onRetry, selectedId, actions, includeArchived, onToggleArchived, onAddRoot,
}: OrganizationTreeProps) => {
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<MenuAnchor | null>(null);
  const containerRef = useRef<HTMLUListElement>(null);

  const allIds = useMemo(() => flattenTree(tree).map((f) => f.node.id), [tree]);
  const firstId = allIds[0] ?? null;

  // Auto-expand the top level once the tree arrives.
  useEffect(() => {
    if (tree.length) setExpandedIds((prev) => (prev.size ? prev : new Set(tree.map((n) => n.id))));
  }, [tree]);

  // Search: which nodes match (self or descendant). Ancestors auto-expand so the
  // matches stay visible; null when there's no active query.
  const matches = useMemo(() => (query.trim() ? matchingNodeIds(tree, query) : null), [tree, query]);
  const effectiveExpanded = useMemo(
    () => (matches ? new Set([...expandedIds, ...matches]) : expandedIds),
    [matches, expandedIds],
  );

  const onToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpandedIds(new Set(allIds)), [allIds]);
  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  const focusableId = selectedId && allIds.includes(selectedId) ? selectedId : firstId;

  // Container-level roving focus: Up/Down move between visible rows, Home/End jump.
  const onContainerKeyDown = useCallback((e: KeyboardEvent<HTMLUListElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const items = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-tree-item]') ?? []);
    if (!items.length) return;
    const activeEl = document.activeElement as HTMLElement | null;
    const currentIndex = items.findIndex((el) => el === activeEl);
    e.preventDefault();
    let nextIndex = currentIndex;
    if (e.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : Math.min(currentIndex + 1, items.length - 1);
    else if (e.key === 'ArrowUp') nextIndex = currentIndex < 0 ? 0 : Math.max(currentIndex - 1, 0);
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = items.length - 1;
    items[nextIndex]?.focus();
  }, []);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Structure</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddRoot} sx={{ textTransform: 'none' }}>
            Add unit
          </Button>
        </Box>

        <SearchBar
          value={query}
          onChange={setQuery}
          delay={0}
          placeholder="Search units…"
          ariaLabel="Search organization units"
          maxWidth="100%"
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <FormControlLabel
            control={<Switch size="small" checked={includeArchived} onChange={(e) => onToggleArchived(e.target.checked)} />}
            label={<Typography variant="caption">Show archived</Typography>}
          />
          <Box>
            <Tooltip title="Expand all">
              <IconButton size="small" onClick={expandAll} aria-label="Expand all units"><UnfoldMoreIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Collapse all">
              <IconButton size="small" onClick={collapseAll} aria-label="Collapse all units"><UnfoldLessIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1, minHeight: 0 }}>
        {isLoading ? (
          <TreeSkeleton />
        ) : isError ? (
          <ErrorState
            title="We couldn't load the structure"
            description="There was a problem reaching the server."
            onRetry={onRetry}
          />
        ) : tree.length === 0 ? (
          <EmptyState
            variant="no-data"
            title="No units yet"
            description="Start building this organization by adding a top-level unit."
            actionLabel="Add unit"
            onAction={onAddRoot}
          />
        ) : matches && matches.size === 0 ? (
          <EmptyState variant="no-results" title="No units match" description="Try a different search term." />
        ) : (
          <Box
            component="ul"
            ref={containerRef}
            role="tree"
            aria-label="Organization structure"
            onKeyDown={onContainerKeyDown}
            sx={{ m: 0, p: 0 }}
          >
            {tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                focusableId={focusableId}
                expandedIds={effectiveExpanded}
                onToggle={onToggle}
                actions={actions}
                onOpenMenu={setMenu}
                matches={matches}
                query={query}
              />
            ))}
          </Box>
        )}
      </Box>

      <UnitContextMenu anchor={menu} onClose={() => setMenu(null)} actions={actions} />
    </Card>
  );
};

export default OrganizationTree;
