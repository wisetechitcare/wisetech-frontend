import { useQuery } from '@tanstack/react-query';
import { getAllEmployeeLevels } from '@services/employee';

/**
 * The seniority ladder — one shared source for every screen that has to name a level.
 *
 * `employee_levels` is a single global master (no company column), already used by
 * `Employees.levelId` and `JobRequisition.employeeLevelId`, and now by `Applicant`. Reading
 * it here rather than per screen is what keeps a requisition's "Senior" and a candidate's
 * "Senior" the same row — a comparison between the two sides of a match is only meaningful
 * if both picked from the same list.
 *
 * The API paginates and defaults to FIVE rows, which is the trap this hook exists to close:
 * a picker built on the default would silently omit every level after the fifth, and the
 * omission looks like the ladder simply being short.
 */

/** Levels change about as often as an org chart, so this stays off the network. */
const LEVELS_STALE_TIME_MS = 10 * 60 * 1000;

/** High enough to be "all of them" for any real ladder, without fetching unbounded. */
const ALL_LEVELS_LIMIT = 200;

export const EMPLOYEE_LEVELS_QUERY_KEY = ['employee-levels'] as const;

export interface EmployeeLevelOption {
    id: string;
    name: string;
    /** Seniority order as configured; the API already sorts ascending on it. */
    order: number;
}

const toOptions = (payload: unknown): EmployeeLevelOption[] => {
    const rows = (payload as { data?: { employeeLevels?: unknown } })?.data?.employeeLevels;
    if (!Array.isArray(rows)) return [];
    return rows
        .filter((r: { id?: string; name?: string }) => r?.id && r?.name)
        .map((r: { id: string; name: string; order?: number }) => ({
            id: r.id,
            name: r.name,
            order: typeof r.order === 'number' ? r.order : 0,
        }));
};

export function useEmployeeLevels() {
    const query = useQuery({
        queryKey: EMPLOYEE_LEVELS_QUERY_KEY,
        queryFn: () => getAllEmployeeLevels(1, ALL_LEVELS_LIMIT),
        select: toOptions,
        staleTime: LEVELS_STALE_TIME_MS,
    });

    return {
        levels: query.data ?? [],
        isLoading: query.isLoading,
        /** Nothing to pick from — the caller should hide the control rather than show an empty one. */
        isEmpty: !query.isLoading && (query.data?.length ?? 0) === 0,
    };
}
