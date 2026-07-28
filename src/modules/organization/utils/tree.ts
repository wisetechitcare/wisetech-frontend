import type { TreeNode } from '../types';

/** Depth-first flatten with indentation depth preserved (for a tree-shaped <Select>). */
export interface FlatNode {
  node: TreeNode;
  depth: number;
}

export const flattenTree = (nodes: TreeNode[], depth = 0, acc: FlatNode[] = []): FlatNode[] => {
  for (const node of nodes) {
    acc.push({ node, depth });
    if (node.children?.length) flattenTree(node.children, depth + 1, acc);
  }
  return acc;
};

/** Collect the id of a node and every descendant — the subtree that can't be a move target. */
export const collectSubtreeIds = (nodes: TreeNode[], rootId: string): Set<string> => {
  const found = findNode(nodes, rootId);
  const ids = new Set<string>();
  if (!found) return ids;
  const walk = (n: TreeNode) => {
    ids.add(n.id);
    n.children?.forEach(walk);
  };
  walk(found);
  return ids;
};

/** The chain of nodes from a root down to (and including) the target — for breadcrumbs. */
export const pathToNode = (nodes: TreeNode[], id: string): TreeNode[] => {
  const walk = (list: TreeNode[], trail: TreeNode[]): TreeNode[] | null => {
    for (const node of list) {
      const nextTrail = [...trail, node];
      if (node.id === id) return nextTrail;
      if (node.children?.length) {
        const found = walk(node.children, nextTrail);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(nodes, []) ?? [];
};

export const findNode = (nodes: TreeNode[], id: string): TreeNode | undefined => {
  for (const node of nodes) {
    if (node.id === id) return node;
    const inChild = node.children?.length ? findNode(node.children, id) : undefined;
    if (inChild) return inChild;
  }
  return undefined;
};

/**
 * Case-insensitive name/code match. Returns the set of node ids that either
 * match themselves or have a matching descendant — used to keep ancestors of a
 * match expanded and visible during search.
 */
export const matchingNodeIds = (nodes: TreeNode[], query: string): Set<string> => {
  const q = query.trim().toLowerCase();
  const result = new Set<string>();
  if (!q) return result;
  const walk = (node: TreeNode): boolean => {
    const selfMatch =
      node.name.toLowerCase().includes(q) || (node.code ?? '').toLowerCase().includes(q);
    let childMatch = false;
    node.children?.forEach((c) => { if (walk(c)) childMatch = true; });
    if (selfMatch || childMatch) result.add(node.id);
    return selfMatch || childMatch;
  };
  nodes.forEach(walk);
  return result;
};
