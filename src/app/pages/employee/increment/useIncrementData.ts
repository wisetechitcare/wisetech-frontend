import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    incrementService,
    deriveYearlyAnalytics,
    deriveAllTimeAnalytics,
    filterFiscalYearRecords,
    IncrementRecord,
    YearlyAnalytics,
    AllTimeAnalytics,
} from '@services/incrementService';

export type IncrementMode = 'yearly' | 'alltime';

const EMPTY_HISTORY: IncrementRecord[] = [];

export interface UseIncrementDataResult {
    loading: boolean;
    error: boolean;
    /** Full history, newest first. */
    history: IncrementRecord[];
    /** Records within the selected fiscal year, newest first (table/timeline order). */
    yearRecords: IncrementRecord[];
    yearly: YearlyAnalytics | null;
    allTime: AllTimeAnalytics | null;
    /** Latest active monthly salary — seeds the Add dialog without an extra fetch. */
    currentSalary: number;
    refetch: () => void;
}

/**
 * Single data source for the increment feature: fetches the salary-revision
 * history once per employee and derives yearly/all-time analytics in memory,
 * so switching year or view mode never triggers a network request.
 */
export function useIncrementData(employeeId: string | undefined, year: string): UseIncrementDataResult {
    const queryClient = useQueryClient();

    const { data: history = EMPTY_HISTORY, isLoading, isError } = useQuery({
        queryKey: ['incrementHistory', employeeId],
        queryFn: () => incrementService.fetchIncrementHistory(employeeId as string),
        enabled: !!employeeId,
    });

    const yearly = useMemo(
        () => (history.length ? deriveYearlyAnalytics(history, year) : null),
        [history, year]
    );
    const allTime = useMemo(
        () => (history.length ? deriveAllTimeAnalytics(history) : null),
        [history]
    );
    const yearRecords = useMemo(
        () => filterFiscalYearRecords(history, year).reverse(),
        [history, year]
    );

    return {
        loading: !!employeeId && isLoading,
        error: isError,
        history,
        yearRecords,
        yearly,
        allTime,
        currentSalary: allTime?.currentSalary ?? 0,
        refetch: () => queryClient.invalidateQueries({ queryKey: ['incrementHistory', employeeId] }),
    };
}
