import { describe, test, expect } from 'vitest';
import { buildEmployeeListParams, employeeFilterKey, EmployeeListFilters } from './employeeListParams';

const facets = {
    branches: [{ id: 'br-1', name: 'Jogeshwari' }, { id: 'br-2', name: 'Andheri' }],
    subOrganizations: [{ id: 'org-1', name: 'MEP' }],
};

const base: EmployeeListFilters = {
    status: 'active',
    branchName: 'All',
    subOrgName: 'All',
    payType: 'All',
    search: '',
    sorting: [],
    facets,
};

describe('status → isActive', () => {
    test('active / inactive map to the boolean', () => {
        expect(buildEmployeeListParams({ ...base, status: 'active' }).isActive).toBe(true);
        expect(buildEmployeeListParams({ ...base, status: 'inactive' }).isActive).toBe(false);
    });

    test('"all" sends NO constraint — not isActive:false', () => {
        // false would show only ex-employees, the opposite of what the All tab means.
        expect('isActive' in buildEmployeeListParams({ ...base, status: 'all' })).toBe(false);
    });
});

describe('name → id resolution (the silent-failure case)', () => {
    test('resolves a branch name to its id', () => {
        expect(buildEmployeeListParams({ ...base, branchName: 'Andheri' }).branchId).toBe('br-2');
    });

    test('resolves a sub-org name to companyId', () => {
        expect(buildEmployeeListParams({ ...base, subOrgName: 'MEP' }).companyId).toBe('org-1');
    });

    test('sends NOTHING when the name has no matching facet', () => {
        // Stale facets (renamed/filtered-out branch). An unmatched id would return an
        // empty table with no error — better to drop the filter than to lie.
        const p = buildEmployeeListParams({ ...base, branchName: 'Ghost Branch' });
        expect('branchId' in p).toBe(false);
    });

    test('does not send the display name as the id', () => {
        const p = buildEmployeeListParams({ ...base, branchName: 'Jogeshwari' });
        expect(p.branchId).toBe('br-1');
        expect(p.branchId).not.toBe('Jogeshwari');
    });
});

describe('"All" is the absence of a filter', () => {
    test('no filter keys when everything is All', () => {
        const p = buildEmployeeListParams({ ...base, status: 'all' });
        expect(p).toEqual({});
    });

    test('payType passes through only when set', () => {
        expect(buildEmployeeListParams({ ...base, payType: 'All' }).payType).toBeUndefined();
        expect(buildEmployeeListParams({ ...base, payType: 'Contract Based' }).payType).toBe('Contract Based');
    });
});

describe('search', () => {
    test('trims, and omits when blank', () => {
        expect(buildEmployeeListParams({ ...base, search: '  ali  ' }).search).toBe('ali');
        expect('search' in buildEmployeeListParams({ ...base, search: '   ' })).toBe(false);
        expect('search' in buildEmployeeListParams({ ...base, search: '' })).toBe(false);
    });
});

describe('sort', () => {
    test('takes the first column only — the API accepts one pair', () => {
        const p = buildEmployeeListParams({
            ...base,
            sorting: [{ id: 'users', desc: true }, { id: 'employeeCode', desc: false }],
        });
        expect(p.sort).toEqual({ id: 'users', desc: true });
    });

    test('omitted when nothing is sorted', () => {
        expect('sort' in buildEmployeeListParams(base)).toBe(false);
    });
});

describe('employeeFilterKey', () => {
    test('changes when any server-side filter changes', () => {
        const k = employeeFilterKey(base);
        expect(employeeFilterKey({ ...base, status: 'all' })).not.toBe(k);
        expect(employeeFilterKey({ ...base, branchName: 'Andheri' })).not.toBe(k);
        expect(employeeFilterKey({ ...base, search: 'x' })).not.toBe(k);
    });

    test('is stable for equal filters, so pagination is not reset spuriously', () => {
        expect(employeeFilterKey({ ...base })).toBe(employeeFilterKey({ ...base }));
    });

    test('ignores sort — handled separately by the caller', () => {
        expect(employeeFilterKey({ ...base, sorting: [{ id: 'users', desc: true }] })).toBe(
            employeeFilterKey(base),
        );
    });
});
