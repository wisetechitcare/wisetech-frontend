import { describe, test, expect } from 'vitest';
import {
    buildLinkIndex, isDepartmentConfigured, allowedDesignationIds, isPairAllowed, designationsForDepartment, onlyDepartmentOf, designationTreeForDepartment,
} from './departmentDesignations';

// The same cases as the backend twin's tests, plus the two picker helpers only the UI needs.

const index = buildLinkIndex([
    { departmentId: 'it', designationId: 'it-trainee' },
    { departmentId: 'it', designationId: 'it-specialist' },
    { departmentId: 'accounts', designationId: 'accountant' },
    { departmentId: 'admin', designationId: 'accountant' },
]);
const designations = [
    { id: 'it-trainee', role: 'IT Trainee' },
    { id: 'it-specialist', role: 'IT Specialist' },
    { id: 'accountant', role: 'Accountant' },
    { id: 'draftsman', role: 'Draftsman' },
];

describe('department → designation rules (twin of the backend)', () => {
    test('configured vs not configured', () => {
        expect(isDepartmentConfigured(index, 'it')).toBe(true);
        expect(isDepartmentConfigured(index, 'design')).toBe(false);
        expect(allowedDesignationIds(index, 'design')).toBeNull();
    });

    test('a designation may belong to several departments; a configured department refuses others', () => {
        expect(isPairAllowed(index, 'accounts', 'accountant')).toBe(true);
        expect(isPairAllowed(index, 'admin', 'accountant')).toBe(true);
        expect(isPairAllowed(index, 'it', 'accountant')).toBe(false);
        expect(isPairAllowed(index, 'design', 'accountant')).toBe(true);
        expect(isPairAllowed(index, 'it', null)).toBe(true);
    });
});

describe('picker helpers', () => {
    test('a configured department offers only its designations', () => {
        expect(designationsForDepartment(designations, index, 'it').map((d) => d.id)).toEqual(['it-trainee', 'it-specialist']);
    });

    test('no department, or an unconfigured one, offers every designation', () => {
        expect(designationsForDepartment(designations, index, null)).toHaveLength(4);
        expect(designationsForDepartment(designations, index, 'design')).toHaveLength(4);
    });

    test('the value a record already holds stays listed even when it is not linked', () => {
        expect(designationsForDepartment(designations, index, 'it', 'draftsman').map((d) => d.id)).toEqual(['it-trainee', 'it-specialist', 'draftsman']);
    });

    test('choosing a designation first fills its department only when there is exactly one', () => {
        expect(onlyDepartmentOf(index, 'it-trainee')).toBe('it');
        expect(onlyDepartmentOf(index, 'accountant')).toBeNull();
        expect(onlyDepartmentOf(index, 'draftsman')).toBeNull();
    });
});

describe('designation tree narrowed to a department', () => {
    const tree = [
        { id: 'associate', role: 'Associate', parentId: null },
        { id: 'assoc-d1', role: 'Associate (D) (L1)', parentId: 'associate' },
        { id: 'assoc-d1-x', role: 'Associate (D) (L1) Senior', parentId: 'assoc-d1' },
        { id: 'it-trainee', role: 'IT Trainee', parentId: null },
    ];
    const design = buildLinkIndex([
        { departmentId: 'design', designationId: 'associate' },
        { departmentId: 'design', designationId: 'assoc-d1-x' },
    ]);

    test('keeps only the department\'s nodes, re-attaching each to its nearest kept ancestor', () => {
        // assoc-d1 is not offered, so its child hangs directly under Associate instead of being orphaned.
        expect(designationTreeForDepartment(tree, design, 'design')).toEqual([
            { id: 'associate', role: 'Associate', parentId: null },
            { id: 'assoc-d1-x', role: 'Associate (D) (L1) Senior', parentId: 'associate' },
        ]);
    });

    test('a kept node with no kept ancestor becomes top-level', () => {
        const onlyChild = buildLinkIndex([{ departmentId: 'design', designationId: 'assoc-d1-x' }]);
        expect(designationTreeForDepartment(tree, onlyChild, 'design')).toEqual([
            { id: 'assoc-d1-x', role: 'Associate (D) (L1) Senior', parentId: null },
        ]);
    });

    test('an unconfigured department returns the whole tree unchanged', () => {
        expect(designationTreeForDepartment(tree, design, 'it')).toHaveLength(4);
    });
});
