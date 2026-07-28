import type { TreeNode } from '../types';

/** Per-node actions wired by the page and threaded down through the tree. */
export interface TreeNodeActions {
  onSelect: (node: TreeNode) => void;
  onViewDetails: (node: TreeNode) => void;
  onAddChild: (node: TreeNode) => void;
  onRename: (node: TreeNode) => void;
  onMove: (node: TreeNode) => void;
  onArchive: (node: TreeNode) => void;
  onRestore: (node: TreeNode) => void;
}

/**
 * Optional drag handlers a node can accept. Drag-and-drop reordering is NOT
 * wired yet (a later release), but TreeNode already accepts these props so the
 * feature can be turned on without touching the node component's shape.
 */
export interface TreeDragHandlers {
  draggable?: boolean;
  onDragStart?: (node: TreeNode, e: React.DragEvent) => void;
  onDragOver?: (node: TreeNode, e: React.DragEvent) => void;
  onDrop?: (node: TreeNode, e: React.DragEvent) => void;
}
