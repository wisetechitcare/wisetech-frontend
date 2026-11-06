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
