import { PATH_SEPARATOR, PresetTaskLike } from '@utils/presetTaskHierarchy';

/**
 * Project category → subcategory, expressed as the shape the hierarchical picker already reads.
 *
 * The picker (`HierarchicalTaskSelect` / `HierarchicalTaskPicker`) is a searchable drill-down
 * over `{ id, name, parentId }` nodes that can select a node at ANY level — which is exactly
 * what choosing "the whole Industrial category" or "Industrial → Factory" needs. So categories
 * map onto that shape rather than a second dropdown being written: a grouped `<select>` cannot
 * select its own group heading, which would have made the category-level choice unreachable.
 *
 * Lives in `utils/` rather than under one feature because two now scope records to a project
 * type — Tasks Configuration's stages and Lead Configuration's payment plans — and a third
 * (meeting-schedule types, still a free-text "Project Type / Name" box) is the same fix again.
 */

export interface CategoryLike {
  id: string;
  name: string;
}

export interface SubCategoryLike {
  id: string;
  name: string;
  categoryId: string;
}

/** What a stage is filed under. `subCategoryId` null = the whole category. */
export interface StageScope {
  categoryId: string;
  subCategoryId: string | null;
}

/** Categories as roots, their subcategories as children. */
export const buildCategoryNodes = (
  categories: CategoryLike[],
  subCategories: SubCategoryLike[],
): PresetTaskLike[] => [
  ...categories.map((c) => ({ id: c.id, name: c.name, parentId: null })),
  // A subcategory whose parent is missing (inactive, or not loaded yet) is kept as a ROOT rather
  // than dropped — the picker promotes orphans the same way the task tree does, so a category
  // that fails to load costs its own row, never its children.
  ...subCategories.map((s) => ({ id: s.id, name: s.name, parentId: s.categoryId })),
];

/**
 * The picker hands back one node id. Which of the two levels it is decides the scope: a
 * subcategory carries its parent along, a category stands alone.
 *
 * Resolved from the subcategory list rather than from the node's `parentId`, because the caller
 * has to store the CATEGORY id either way and the subcategory row is where that lives.
 */
export const scopeFromNodeId = (
  nodeId: string,
  subCategories: SubCategoryLike[],
): StageScope | null => {
  if (!nodeId) return null;

  const sub = subCategories.find((s) => s.id === nodeId);
  return sub
    ? { categoryId: sub.categoryId, subCategoryId: sub.id }
    : { categoryId: nodeId, subCategoryId: null };
};

/**
 * The node a scope points at — what the picker should show as selected.
 * The inverse of `scopeFromNodeId`, so a saved stage reopens on the node it was filed under.
 */
export const nodeIdFromScope = (
  scope?: { categoryId?: string | null; subCategoryId?: string | null } | null,
): string => scope?.subCategoryId || scope?.categoryId || '';

/** The scope-bearing half of a stage — all the grouping below needs to know about one. */
export interface ScopedStage {
  categoryId?: string | null;
  subCategoryId?: string | null;
  category?: { id: string; name: string } | null;
  subCategory?: { id: string; name: string } | null;
}

export interface StageGroup<T extends ScopedStage> {
  key: string;
  label: string;
  stages: T[];
}

const UNSCOPED = '__unscoped__';

/**
 * Stages grouped by the project type they belong to.
 *
 * The board shows EVERY type at once, so without headings a stage would give no clue which
 * project type it configures — and two types legitimately have a stage of the same name.
 * Grouping preserves insertion order, which is the server's (sortOrder, name) within each scope.
 *
 * Stages predating the category column land in their own trailing group rather than being
 * dropped: invisible rows are how a configuration screen starts lying about what exists.
 */
export const groupStagesByScope = <T extends ScopedStage>(stages: T[]): StageGroup<T>[] => {
  const groups = new Map<string, StageGroup<T>>();

  for (const stage of stages) {
    const categoryId = stage.category?.id ?? stage.categoryId ?? null;
    const subCategoryId = stage.subCategory?.id ?? stage.subCategoryId ?? null;
    const key = categoryId ? `${categoryId}|${subCategoryId ?? ''}` : UNSCOPED;

    if (!groups.has(key)) {
      const label = categoryId
        ? [stage.category?.name, stage.subCategory?.name].filter(Boolean).join(PATH_SEPARATOR)
          || 'Unknown category'
        : 'No project category';
      groups.set(key, { key, label, stages: [] });
    }
    groups.get(key)!.stages.push(stage);
  }

  // The legacy bucket sorts last — it is a leftover, not a project type.
  return [...groups.values()].sort((a, b) => Number(a.key === UNSCOPED) - Number(b.key === UNSCOPED));
};
