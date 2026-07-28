import { memo, MouseEvent, KeyboardEvent, useCallback } from 'react';
import { Box, Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { UnitTypeIcon } from './UnitTypeIcon';
import { humanizeType } from '../utils/format';
import type { TreeNode as TreeNodeModel } from '../types';
import type { TreeDragHandlers, TreeNodeActions } from './treeTypes';
import type { MenuAnchor } from './UnitContextMenu';

interface TreeNodeProps {
  node: TreeNodeModel;
  depth: number;
  selectedId: string | null;
  /** The single node that owns the tree's tab stop (roving tabindex). */
  focusableId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  actions: TreeNodeActions;
  onOpenMenu: (anchor: MenuAnchor) => void;
  /** Ids that match the active search (self or descendant) — controls visibility + highlight. */
  matches: Set<string> | null;
  query: string;
  drag?: TreeDragHandlers;
}

/** Split a label around the first case-insensitive match so it can be highlighted. */
const Highlight = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box component="mark" sx={{ bgcolor: 'warning.light', color: 'inherit', borderRadius: 0.5, px: 0.25 }}>
        {text.slice(idx, idx + q.length)}
      </Box>
      {text.slice(idx + q.length)}
    </>
  );
};

/**
 * Recursive organization tree node. Memoized — the tree can be large and only
 * the branches that actually change should re-render.
 *
 * Drag-and-drop is NOT wired yet, but the node accepts optional `drag` handlers
 * (draggable + onDragStart/onDragOver/onDrop) so the feature can be enabled in a
 * later release without changing this component's shape.
 */
export const TreeNode = memo((props: TreeNodeProps) => {
  const { node, depth, selectedId, focusableId, expandedIds, onToggle, actions, onOpenMenu, matches, query, drag } = props;

  const hasChildren = node.childCount > 0 || node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = node.id === selectedId;
  const isArchived = node.status === 'archived';

  const toggle = useCallback((e: MouseEvent) => { e.stopPropagation(); onToggle(node.id); }, [onToggle, node.id]);

  const openMenu = useCallback((e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    onOpenMenu({ node, anchorEl: e.currentTarget });
  }, [node, onOpenMenu]);

  const onContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenMenu({ node, position: { top: e.clientY, left: e.clientX } });
  }, [node, onOpenMenu]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        actions.onSelect(node);
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded) { e.preventDefault(); onToggle(node.id); }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded) { e.preventDefault(); onToggle(node.id); }
        break;
      default:
        break;
    }
  }, [actions, node, hasChildren, isExpanded, onToggle]);

  // While searching, hide branches with no match anywhere inside them.
  // (Placed after all hooks so hook order stays stable — rules-of-hooks.)
  if (matches && !matches.has(node.id)) return null;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isExpanded : undefined} aria-selected={isSelected} style={{ listStyle: 'none' }}>
      <Box
        data-tree-item={node.id}
        tabIndex={node.id === focusableId ? 0 : -1}
        onClick={() => actions.onSelect(node)}
        onKeyDown={onKeyDown}
        onContextMenu={onContextMenu}
        draggable={drag?.draggable}
        onDragStart={drag?.onDragStart ? (e) => drag.onDragStart!(node, e) : undefined}
        onDragOver={drag?.onDragOver ? (e) => drag.onDragOver!(node, e) : undefined}
        onDrop={drag?.onDrop ? (e) => drag.onDrop!(node, e) : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          pr: 0.5,
          pl: depth * 2,
          py: 0.5,
          borderRadius: 2,
          cursor: 'pointer',
          userSelect: 'none',
          opacity: isArchived ? 0.6 : 1,
          bgcolor: isSelected ? 'action.selected' : 'transparent',
          '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
        }}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={toggle}
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            aria-expanded={isExpanded}
            sx={{ p: 0.25 }}
          >
            {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 28, flexShrink: 0 }} aria-hidden="true" />
        )}

        <UnitTypeIcon
          type={node.type}
          fontSize="small"
          aria-hidden="true"
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        />

        <Tooltip title={humanizeType(node.type)} placement="top" disableInteractive>
          <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500, minWidth: 0, flexGrow: 1 }} noWrap>
            <Highlight text={node.name} query={query} />
          </Typography>
        </Tooltip>

        {node.childCount > 0 && (
          <Chip
            label={node.childCount}
            size="small"
            aria-label={`${node.childCount} child units`}
            sx={{ height: 18, minWidth: 22, fontSize: 11, borderRadius: 1, bgcolor: 'action.hover', '& .MuiChip-label': { px: 0.75 } }}
          />
        )}
        {isArchived && (
          <Chip label="Archived" size="small" variant="outlined"
            sx={{ height: 18, fontSize: 10, borderRadius: 1 }} />
        )}

        <IconButton
          size="small"
          aria-label={`Actions for ${node.name}`}
          aria-haspopup="menu"
          onClick={openMenu}
          sx={{ p: 0.25, flexShrink: 0 }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      {hasChildren && isExpanded && node.children.length > 0 && (
        <ul role="group" style={{ margin: 0, padding: 0 }}>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              focusableId={focusableId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              actions={actions}
              onOpenMenu={onOpenMenu}
              matches={matches}
              query={query}
              drag={drag}
            />
          ))}
        </ul>
      )}
    </li>
  );
});
TreeNode.displayName = 'TreeNode';

export default TreeNode;
