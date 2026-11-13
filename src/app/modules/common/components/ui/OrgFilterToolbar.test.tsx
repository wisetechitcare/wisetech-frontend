// @vitest-environment jsdom
import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEffect, useMemo, useState } from 'react';

const ROOT_NAMES = new Set<string>();
vi.mock('@hooks/useRootOrgNames', () => ({ useRootOrgNames: () => ROOT_NAMES }));

import { useOrgFilters } from './OrgFilterToolbar';

const ROWS = [
    { id: 'a', subOrganization: 'North', branch: 'Pune', team: 'Ops', isActive: true },
    { id: 'b', subOrganization: 'South', branch: 'Goa', team: 'Ops', isActive: false },
];

describe('useOrgFilters', () => {
    test('keeps its identity across renders when nothing changed', () => {
        const { result, rerender } = renderHook(({ rows }) => useOrgFilters(rows), { initialProps: { rows: ROWS } });
        const first = result.current;
        rerender({ rows: ROWS });
        expect(result.current).toBe(first);
        expect(result.current.matches).toBe(first.matches);
    });

    test('changes identity, and the predicate, when a filter changes', () => {
        const { result } = renderHook(() => useOrgFilters(ROWS));
        const first = result.current;
        act(() => result.current.setBranch('Goa'));
        expect(result.current).not.toBe(first);
        expect(ROWS.filter(result.current.matches).map((r) => r.id)).toEqual(['b']);
    });

    // The payment desk shape: rows derived from `filters`, ids derived from rows, and an effect
    // that prunes a selection by those ids. With an unstable `filters` this never settled.
    test('a list derived from it settles instead of re-rendering forever', () => {
        let renders = 0;
        renderHook(() => {
            renders += 1;
            const filters = useOrgFilters(ROWS);
            const ids = useMemo(() => ROWS.filter(filters.matches).map((r) => r.id), [filters]);
            const [selected, setSelected] = useState<string[]>([]);
            useEffect(() => {
                setSelected((s) => s.filter((id) => ids.includes(id)));
            }, [ids]);
            return selected;
        });
        expect(renders).toBeLessThan(5);
    });
});

import { cascadeOrgOptions, reconcileOrgSelection } from './OrgFilterToolbar';

const ORG_ROWS = [
    { id: '1', subOrganization: 'ASSOCIATES', branch: 'ASS Vashi', team: 'Design' },
    { id: '2', subOrganization: 'ASSOCIATES', branch: 'ASS Jogeshwari', team: 'Site' },
    { id: '3', subOrganization: 'MEP', branch: 'MEP Vashi', team: 'Design' },
    { id: '4', subOrganization: 'MEP', branch: 'MEP Jogeshwari', team: 'Accounts' },
];

describe('the org cascade (sub-org → branch → team)', () => {
    test('a sub-org offers only its own branches; a branch only its own teams', () => {
        expect(cascadeOrgOptions(ORG_ROWS, { subOrg: 'ASSOCIATES', branch: 'All' }).branchOptions)
            .toEqual(['ASS Jogeshwari', 'ASS Vashi']);
        expect(cascadeOrgOptions(ORG_ROWS, { subOrg: 'MEP', branch: 'MEP Jogeshwari' }).teamOptions).toEqual(['Accounts']);
        expect(cascadeOrgOptions(ORG_ROWS, { subOrg: 'All', branch: 'All' }).branchOptions).toHaveLength(4);
    });

    test('changing the sub-org clears a branch and team it does not contain', () => {
        expect(reconcileOrgSelection(ORG_ROWS, { subOrg: 'ASSOCIATES', branch: 'MEP Vashi', team: 'Design' }))
            .toEqual({ subOrg: 'ASSOCIATES', branch: 'All', team: 'Design' });
        expect(reconcileOrgSelection(ORG_ROWS, { subOrg: 'MEP', branch: 'MEP Jogeshwari', team: 'Design' }))
            .toEqual({ subOrg: 'MEP', branch: 'MEP Jogeshwari', team: 'All' });
    });

    test('a valid selection is left exactly as it is', () => {
        const sel = { subOrg: 'MEP', branch: 'MEP Vashi', team: 'Design' };
        expect(reconcileOrgSelection(ORG_ROWS, sel)).toEqual(sel);
    });

    test('the hook clears a stranded branch when its sub-org changes', () => {
        const { result } = renderHook(() => useOrgFilters(ORG_ROWS));
        act(() => result.current.setBranch('MEP Vashi'));
        act(() => result.current.setSubOrg('ASSOCIATES'));
        expect(result.current.branch).toBe('All');
        expect(result.current.branchOptions).toEqual(['ASS Jogeshwari', 'ASS Vashi']);
    });
});
