import { describe, test, expect } from 'vitest';
import { filterPlansForLead } from './paymentPlanScope';

/**
 * This filter decides whether a user is offered their payment plan at all. Over-filter and a
 * lead cannot be billed; under-filter and a hospital job is offered a bungalow's fee split.
 * The widening cases matter most — they are what stops the existing configuration vanishing
 * from every lead the moment plans gained a project type.
 */

const untyped = { id: 'legacy', categoryId: null, subCategoryId: null };
const bungalowWide = { id: 'bungalow-all', categoryId: 'cat-bungalow', subCategoryId: null };
const bungalowSingle = { id: 'bungalow-single', categoryId: 'cat-bungalow', subCategoryId: 'sub-single' };
const bungalowMulti = { id: 'bungalow-multi', categoryId: 'cat-bungalow', subCategoryId: 'sub-multi' };
const hospital = { id: 'hospital', categoryId: 'cat-hospital', subCategoryId: null };

const ALL = [untyped, bungalowWide, bungalowSingle, bungalowMulti, hospital];
const ids = (plans: { id: string }[]) => plans.map((p) => p.id);

describe('filterPlansForLead', () => {
  test('a lead with no categories yet sees everything', () => {
    // An empty dropdown here reads as a broken screen; the truthful answer is "not yet".
    expect(ids(filterPlansForLead(ALL, [], []))).toEqual(ids(ALL));
  });

  test('un-typed plans stay on offer whatever the lead is', () => {
    // Plans written before they carried a type must not drop off every lead at once.
    expect(ids(filterPlansForLead(ALL, ['cat-hospital'], []))).toContain('legacy');
  });

  test('a category-wide plan applies, a different category’s does not', () => {
    expect(ids(filterPlansForLead(ALL, ['cat-bungalow'], []))).toEqual(['legacy', 'bungalow-all']);
  });

  test('a subcategory plan needs that subcategory selected', () => {
    expect(ids(filterPlansForLead(ALL, ['cat-bungalow'], ['sub-single'])))
      .toEqual(['legacy', 'bungalow-all', 'bungalow-single']);
  });

  test('a sibling subcategory’s plan never leaks across', () => {
    expect(ids(filterPlansForLead(ALL, ['cat-bungalow'], ['sub-single'])))
      .not.toContain('bungalow-multi');
  });

  test('the category is still required for a subcategory plan to show', () => {
    // Selecting only the subcategory does surface it — the join rows are independent, and a
    // lead that names the subcategory has named the type as clearly as it can.
    expect(ids(filterPlansForLead(ALL, [], ['sub-single'])))
      .toEqual(['legacy', 'bungalow-single']);
  });

  test('a lead spanning two categories sees both their plans', () => {
    expect(ids(filterPlansForLead(ALL, ['cat-bungalow', 'cat-hospital'], [])))
      .toEqual(['legacy', 'bungalow-all', 'hospital']);
  });
});
