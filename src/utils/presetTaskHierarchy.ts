/**
 * Preset (configuration) task hierarchy — client side.
 *
 * Preset tasks come back from the API as a FLAT list; `parentId` alone is what makes
 * them a tree. Every node is the same entity: a node with no parent is a root, any
 * other node is a child, and there is no depth limit. The helpers below turn that flat
 * list into a tree, a pre-ordered list for pickers, and the derived path used for
 * breadcrumbs.
 *
 * A task's NAME is always the node's own name. The path is derived for display and is
 * never stored — see the backend's `utils/presetTaskHierarchy` for the mirror of this.
 */

/**
 * Display separator for a derived hierarchy path.
 *
 * An arrow, deliberately: a hyphen would be unreadable because task names themselves
 * contain them (Drawing-DD, RT-VERIFY, BOQ-Fire F), and '›' is already the app's page
 * breadcrumb glyph — using it here too made a task's path look like site navigation.
 */
export const PATH_SEPARATOR = ' → ';

export interface PresetTaskLike {
    id: string;
    name: string;
    parentId?: string | null;
}

export interface PresetTreeNode<T extends PresetTaskLike> {
    id: string;
    name: string;
    parentId: string | null;
    /** Ancestor names + own name, root first. */
    path: string[];
    /** 0 for a root node. */
    depth: number;
    /** The original row, so callers get back the very object they passed in. */
    entity: T;
    children: PresetTreeNode<T>[];
}

/**
 * Stops corrupt data (a parent cycle the API would now reject) from hanging the UI.
 * Far above any hierarchy a human would configure.
 */
const MAX_HIERARCHY_DEPTH = 100;

const byName = (a: { name?: string }, b: { name?: string }) =>
    (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });

/**
 * Nests a flat list into a tree of unlimited depth.
 *
 * Never-vanish, in three parts:
 *  - a node whose parent is missing from the list (deleted or inactive) is PROMOTED to a
 *    root rather than filtered out;
 *  - a node trapped in a parent CYCLE has no root above it, so anything unreachable from
 *    a root is promoted too — otherwise a cyclic pair would disappear from the UI;
 *  - the recursion skips a child already among its own ancestors, so a cycle cannot nest
 *    forever.
 *
 * There is deliberately no depth cap on the descent — a legitimately deep branch must
 * render in full.
 */
export function buildPresetTree<T extends PresetTaskLike>(nodes: T[]): PresetTreeNode<T>[] {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const childrenByParent = new Map<string, T[]>();
    const roots: T[] = [];

    nodes.forEach((node) => {
        const parentId = node.parentId;
        if (!parentId || parentId === node.id || !byId.has(parentId)) {
            roots.push(node);
            return;
        }
        const siblings = childrenByParent.get(parentId) || [];
        siblings.push(node);
        childrenByParent.set(parentId, siblings);
    });

    // Promote whatever no root can reach — otherwise a cyclic pair disappears entirely.
    const reachable = new Set<string>();
    const mark = (id: string) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        (childrenByParent.get(id) || []).forEach((child) => mark(child.id));
    };
    roots.forEach((root) => mark(root.id));
    nodes.forEach((node) => {
        if (!reachable.has(node.id)) {
            roots.push(node);
            mark(node.id);
        }
    });

    const build = (node: T, parentPath: string[], depth: number, ancestors: Set<string>): PresetTreeNode<T> => {
        const path = [...parentPath, node.name];
        const nextAncestors = new Set(ancestors).add(node.id);
        return {
            id: node.id,
            name: node.name,
            parentId: node.parentId ?? null,
            path,
            depth,
            entity: node,
            children: (childrenByParent.get(node.id) || [])
                .filter((c) => !nextAncestors.has(c.id))
                .slice()
                .sort(byName)
                .map((c) => build(c, path, depth + 1, nextAncestors)),
        };
    };

    return roots.slice().sort(byName).map((root) => build(root, [], 0, new Set()));
}

/** Depth-first (pre-order) flattening — parents always precede their children. */
export function flattenPresetTree<T extends PresetTaskLike>(tree: PresetTreeNode<T>[]): PresetTreeNode<T>[] {
    return tree.flatMap((node) => [node, ...flattenPresetTree(node.children)]);
}

/** Convenience: flat list → pre-ordered nodes, each carrying its depth and path. */
export function flattenPresetTasks<T extends PresetTaskLike>(nodes: T[]): PresetTreeNode<T>[] {
    return flattenPresetTree(buildPresetTree(nodes));
}

/**
 * Ancestor names + the node's own name, root first.
 * A node with a missing ancestor yields a shorter path rather than nothing.
 */
export function getPresetPath<T extends PresetTaskLike>(nodes: T[], nodeId?: string | null): string[] {
    if (!nodeId) return [];
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const path: string[] = [];
    const seen = new Set<string>();
    let current = byId.get(nodeId);

    while (current && !seen.has(current.id) && path.length < MAX_HIERARCHY_DEPTH) {
        seen.add(current.id);
        path.unshift(current.name);
        current = current.parentId ? byId.get(current.parentId) : undefined;
    }

    return path;
}

/**
 * The node itself plus everything below it — the set a parent picker must exclude, so
 * a task can never be filed under its own descendant (the backend rejects it too).
 */
export function getPresetSubtreeIds<T extends PresetTaskLike>(nodes: T[], nodeId?: string | null): Set<string> {
    const ids = new Set<string>();
    if (!nodeId) return ids;

    const childrenByParent = new Map<string, T[]>();
    nodes.forEach((n) => {
        if (!n.parentId) return;
        const siblings = childrenByParent.get(n.parentId) || [];
        siblings.push(n);
        childrenByParent.set(n.parentId, siblings);
    });

    const queue = [nodeId];
    while (queue.length && ids.size < MAX_HIERARCHY_DEPTH * 100) {
        const id = queue.shift()!;
        if (ids.has(id)) continue;
        ids.add(id);
        (childrenByParent.get(id) || []).forEach((child) => queue.push(child.id));
    }

    return ids;
}

/** Direct children of a node — used to warn before a delete that will be refused. */
export function getPresetChildren<T extends PresetTaskLike>(nodes: T[], nodeId: string): T[] {
    return nodes.filter((n) => n.parentId === nodeId);
}
