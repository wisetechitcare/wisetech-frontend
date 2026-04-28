import { useState, useCallback } from 'react';

export const usePagination = (initialPageSize: number = 10) => {
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: initialPageSize,
    });

    const resetPagination = useCallback(() => {
        setPagination({
            pageIndex: 0,
            pageSize: initialPageSize,
        });
    }, [initialPageSize]);

    return {
        pagination,
        setPagination,
        resetPagination,
    };
};
