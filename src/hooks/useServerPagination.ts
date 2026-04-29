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
}: UseServerPaginationProps<T>): UseServerPaginationReturn<T> {
    const [allData, setAllData] = useState<T[]>([]);
    const [filteredData, setFilteredData] = useState<T[]>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: initialPageSize,
    });
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
