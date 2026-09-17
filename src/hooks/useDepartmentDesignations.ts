import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { fetchDepartments, fetchDesignations } from '@services/options';
import { getDepartmentDesignations, type SuggestedDepartmentDesignation } from '@services/company';
import {
    buildLinkIndex, designationsForDepartment, designationTreeForDepartment, isDepartmentConfigured, isPairAllowed, onlyDepartmentOf,
} from '@utils/departmentDesignations';

export interface DepartmentOption { id: string; name: string; companyId?: string; code?: string | null }
export interface DesignationOption { id: string; role: string; parentId: string | null; companyId?: string }

/** Masters change when someone edits them in Configure, which invalidates these keys. */
const STALE_MS = 5 * 60_000;

/**
 * Departments, designations, and which designations each department offers — ONE source for every
 * form that picks both, so the employee form, a requisition and an offer can never disagree about
 * what "IT's designations" are.
 *
 * The rules are `utils/departmentDesignations` (the twin of the server's check). This hook only
 * loads the three lists once, shares them through React Query, and exposes the questions a form
 * asks. Invalidate `queryKeys.masters.*` after changing any of them.
 */
export function useDepartmentDesignations() {
    const departmentsQuery = useQuery({
        queryKey: queryKeys.masters.departments(),
        queryFn: async (): Promise<DepartmentOption[]> => (await fetchDepartments())?.data?.departments ?? [],
        staleTime: STALE_MS,
    });
    const designationsQuery = useQuery({
        queryKey: queryKeys.masters.designations(),
        queryFn: async (): Promise<DesignationOption[]> =>
            ((await fetchDesignations())?.data?.designations ?? []).map((d: DesignationOption) => ({ ...d, parentId: d.parentId ?? null })),
        staleTime: STALE_MS,
    });
    const linksQuery = useQuery({
        queryKey: queryKeys.masters.departmentDesignations(),
        queryFn: getDepartmentDesignations,
        staleTime: STALE_MS,
    });

    const departments = departmentsQuery.data ?? [];
    const designations = designationsQuery.data ?? [];
    const links = linksQuery.data?.links;
    const index = useMemo(() => buildLinkIndex(links ?? []), [links]);
    const suggestions: SuggestedDepartmentDesignation[] = linksQuery.data?.suggestions ?? [];

    const departmentName = useCallback((id?: string | null) => departments.find((d) => d.id === id)?.name, [departments]);

    return {
        departments,
        designations,
        suggestions,
        index,
        isLoading: departmentsQuery.isLoading || designationsQuery.isLoading || linksQuery.isLoading,
        isError: departmentsQuery.isError || designationsQuery.isError || linksQuery.isError,
        departmentName,
        /** The designations to offer for a department (flat). `keepId` keeps a record's current value listed. */
        designationsFor: useCallback(
            (departmentId?: string | null, keepId?: string | null) => designationsForDepartment(designations, index, departmentId, keepId),
            [designations, index],
        ),
        /** The same, as a tree for the drill-down Job Profile picker. */
        designationTreeFor: useCallback(
            (departmentId?: string | null, keepId?: string | null) => designationTreeForDepartment(designations, index, departmentId, keepId),
            [designations, index],
        ),
        isConfigured: useCallback((departmentId?: string | null) => isDepartmentConfigured(index, departmentId), [index]),
        isPairAllowed: useCallback(
            (departmentId?: string | null, designationId?: string | null) => isPairAllowed(index, departmentId, designationId),
            [index],
        ),
        /** The department to fill in when a designation is chosen first — only when it belongs to exactly one. */
        onlyDepartmentOf: useCallback((designationId?: string | null) => onlyDepartmentOf(index, designationId), [index]),
        /**
         * The line to show under a designation field: what the list is narrowed to, or why it is not,
         * or — for an older record — that the saved pairing no longer fits. `noun` is what the screen
         * calls a designation (the employee form says "job profile").
         */
        designationHint: useCallback(
            (
                departmentId?: string | null, designationId?: string | null,
                noun: { one: string; many: string } = { one: 'designation', many: 'designations' },
            ): { hint?: string; error?: string } => {
                const name = departmentName(departmentId);
                if (!departmentId || !name) return { hint: `Choose a department to see its ${noun.many}` };
                if (designationId && !isPairAllowed(index, departmentId, designationId)) {
                    return { error: `Not a ${noun.one} of ${name}. Choose one of ${name}'s ${noun.many}.` };
                }
                return isDepartmentConfigured(index, departmentId)
                    ? { hint: `Showing ${name}'s ${noun.many}` }
                    : { hint: `${name} has no ${noun.many} linked yet, so all are shown. Link them in Employees › Configure.` };
            },
            [departmentName, index],
        ),
    };
}
