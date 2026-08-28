import { describe, test, expect } from 'vitest';
import { buildCategoryNodes, scopeFromNodeId, nodeIdFromScope, groupStagesByScope } from './categoryScope';

/**
 * The picker returns ONE id and the API needs a (categoryId, subCategoryId) pair, so everything
 * rests on telling the two levels apart. Get it wrong and a subcategory is stored as a category
 * — the stage then sits under a scope nothing lists, and the server's mismatch check never fires
 * because the pair is internally consistent, just wrong.
 */

const CATEGORIES = [
  { id: 'cat-industrial', name: 'Industrial' },
  { id: 'cat-hospital', name: 'Hospital' },
];

const SUBCATEGORIES = [
  { id: 'sub-factory', name: 'Factory', categoryId: 'cat-industrial' },
  { id: 'sub-warehouse', name: 'Warehouse', categoryId: 'cat-industrial' },
];

describe('scopeFromNodeId', () => {
  test('a subcategory carries its parent category along', () => {
    expect(scopeFromNodeId('sub-factory', SUBCATEGORIES)).toEqual({
      categoryId: 'cat-industrial',
      subCategoryId: 'sub-factory',
    });
  });

  test('a category stands alone — the whole category, not one of its children', () => {
    expect(scopeFromNodeId('cat-hospital', SUBCATEGORIES)).toEqual({
      categoryId: 'cat-hospital',
      subCategoryId: null,
    });
  });

  test('no selection is no scope', () => {
    expect(scopeFromNodeId('', SUBCATEGORIES)).toBeNull();
  });
});

describe('nodeIdFromScope', () => {
  test('round-trips both levels, so a saved stage reopens on the node it was filed under', () => {
    for (const nodeId of ['sub-warehouse', 'cat-industrial']) {
      expect(nodeIdFromScope(scopeFromNodeId(nodeId, SUBCATEGORIES))).toBe(nodeId);
    }
  });

  test('an unscoped stage selects nothing', () => {
    expect(nodeIdFromScope(null)).toBe('');
    expect(nodeIdFromScope({ categoryId: undefined, subCategoryId: null })).toBe('');
  });
});

describe('buildCategoryNodes', () => {
  test('categories are roots, subcategories hang off their category', () => {
    const nodes = buildCategoryNodes(CATEGORIES, SUBCATEGORIES);

    expect(nodes.filter((n) => n.parentId === null).map((n) => n.id))
      .toEqual(['cat-industrial', 'cat-hospital']);
    expect(nodes.find((n) => n.id === 'sub-factory')?.parentId).toBe('cat-industrial');
  });

  test('a subcategory whose category is missing still appears', () => {
    // The picker promotes orphans to roots; losing one category must not hide its children.
    const nodes = buildCategoryNodes([], SUBCATEGORIES);
    expect(nodes.map((n) => n.id)).toEqual(['sub-factory', 'sub-warehouse']);
  });
});

describe('groupStagesByScope', () => {
  const industrial = { id: 'cat-industrial', name: 'Industrial' };
  const factory = { id: 'sub-factory', name: 'Factory' };

  test('the category and one of its subcategories are DIFFERENT groups', () => {
    // A stage filed under the whole category is not a Factory stage. Collapsing the two would
    // make it impossible to see which of them a stage was actually filed under.
    const groups = groupStagesByScope([
      { category: industrial, subCategory: null },
      { category: industrial, subCategory: factory },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.label)).toEqual(['Industrial', 'Industrial → Factory']);
  });

  test('stages of one scope stay together, in the order given', () => {
    const groups = groupStagesByScope([
      { name: 'a', category: industrial, subCategory: null },
      { name: 'b', category: { id: 'cat-hospital', name: 'Hospital' }, subCategory: null },
      { name: 'c', category: industrial, subCategory: null },
    ] as any);

    expect(groups.map((g) => g.stages.map((s: any) => s.name))).toEqual([['a', 'c'], ['b']]);
  });

  test('stages with no category are kept, in a trailing group', () => {
    // Predate the category column. Hiding them would be the screen lying about what exists.
    const groups = groupStagesByScope([
      { categoryId: null },
      { category: industrial, subCategory: null },
    ]);

    expect(groups.map((g) => g.label)).toEqual(['Industrial', 'No project category']);
  });

  test('falls back to the raw ids when the category relation was not loaded', () => {
    const groups = groupStagesByScope([{ categoryId: 'cat-industrial', subCategoryId: 'sub-factory' }]);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Unknown category');
  });
});
