import { useState, useEffect, useCallback, useRef } from 'react';

export const pageSize = 10;

interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

interface UseServerPaginationProps<T> {
    fetchFunction: (page: number, limit: number) => Promise<{
        data: T[];
        totalRecords: number;
    }>;
    initialPageSize?: number;
    transformData?: (data: any[]) => T[];
    filterData?: (data: T[]) => T[];
    /**
     * Identity of the current server-side filters (e.g. `periodKey(range)`). When it
     * changes, pagination snaps back to the first page.
     *
     * Without this, narrowing a filter while on page 5 asks the server for page 5 of a
     * result set that now has one page, and the table renders empty — the classic
     * "my filter broke the table" bug. Pass a STRING, not the filter object: an object
     * rebuilt each render would reset pagination on every render.
     */
    resetKey?: string | number;
}

interface UseServerPaginationReturn<T> {
    data: T[];
    allData: T[];
    pagination: PaginationState;
    totalRecords: number;
    isLoading: boolean;
    isInitialLoading: boolean;
    setPagination: (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => void;
    refetch: () => void;
}

export function useServerPagination<T = any>({
    fetchFunction,
    initialPageSize = pageSize,
    transformData,
    filterData,
    resetKey,
}: UseServerPaginationProps<T>): UseServerPaginationReturn<T> {
    const [allData, setAllData] = useState<T[]>([]);
    const [filteredData, setFilteredData] = useState<T[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    });

    // Adjust-state-during-render rather than an effect. An effect would run AFTER the
    // fetch effect below, so a filter change would fire one wasted request for the stale
    // page and only then reset — two round trips and a visible flash of an empty table.
    // React re-runs this component immediately, before children render or effects fire.
    const [appliedResetKey, setAppliedResetKey] = useState(resetKey);
    if (resetKey !== appliedResetKey) {
        setAppliedResetKey(resetKey);
        if (pagination.pageIndex !== 0) setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
    const [totalRecords, setTotalRecords] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    // Use refs to avoid re-creating fetchData when transform/filter functions change
    const transformDataRef = useRef(transformData);
    const filterDataRef = useRef(filterData);

    useEffect(() => {
        transformDataRef.current = transformData;
        filterDataRef.current = filterData;
    }, [transformData, filterData]);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);

            // Call the fetch function with page and limit
            const result = await fetchFunction(
                pagination.pageIndex + 1,
                pagination.pageSize
            );

            // Transform data if transformer is provided
            const transformedData = transformDataRef.current
                ? transformDataRef.current(result.data)
                : result.data;

            setAllData(transformedData);
            setTotalRecords(result.totalRecords);

            // Apply filter if provided
            if (filterDataRef.current) {
                const filtered = filterDataRef.current(transformedData);
                setFilteredData(filtered);
            } else {
                setFilteredData(transformedData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setAllData([]);
            setFilteredData([]);
            setTotalRecords(0);
        } finally {
            setIsLoading(false);
            setIsInitialLoading(false);
        }
    }, [fetchFunction, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refetch = useCallback(() => {
        fetchData();
    }, [fetchData]);

    return {
        data: filteredData,
        allData,
        pagination,
        totalRecords,
        isLoading,
        isInitialLoading,
        setPagination,
        refetch,
    };
}
