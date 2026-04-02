import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { upsertUserTablePreferences, getUserTablePreferences } from "@services/users"

interface TablePreferences {
    columnVisibility: Record<string, boolean>;
    columnOrder: string[];
    columnSizing: Record<string, number>;
    columnPinning: {
        left?: string[];
        right?: string[];
    };
    sorting: Array<{
        id: string;
        desc: boolean;
    }>; 
    // columnFilters: Array<{
    //     id: string;
    //     value: any;
    // }>;
    // globalFilter: string;
    pagination: {
        pageIndex: number;
        pageSize: number;
    };
    density: 'compact' | 'comfortable' | 'spacious';
    grouping: string[];
    expanded: Record<string, boolean>;
    exportType: string | null;
}

function useTablePreferences(tableName: string, columns: any[], employeeId?: string) {
    // Use refs to prevent recreating functions and causing loops
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const initialLoadRef = useRef(false);
    
    // Memoize default preferences to prevent recreation on every render
    const defaultPreferences = useMemo((): TablePreferences => {
        const columnVisibility = columns.reduce((acc: any, col: any) => {
            if (col.accessorKey) {
                acc[col.accessorKey] = true;
            }
            return acc;
        }, {});

        return {
            columnVisibility,
            columnOrder: columns.map(col => col.accessorKey).filter(Boolean),
            columnSizing: {},
            columnPinning: {},
            sorting: [],
            // columnFilters: [],
            // globalFilter: '',
            pagination: {
                pageIndex: 0,
                pageSize: 10
            },
            density: 'comfortable',
            grouping: [],
            expanded: {},
            exportType: null
        };
    }, [columns]); // Only depend on columns

    const [preferences, setPreferences] = useState<TablePreferences>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);

    // Debounced save function - moved outside of other effects
    const debouncedSave = useCallback((newPreferences: TablePreferences) => {
        if (!employeeId || !isMountedRef.current || !isInitialized) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await upsertUserTablePreferences(employeeId, tableName, newPreferences);
                console.log("Preferences saved successfully for", tableName);
            } catch (error) {
                console.error('Error saving table preferences:', error);
            }
        }, 500);
    }, [employeeId, tableName, isInitialized]); // Stable dependencies only

    // Load preferences on mount - COMPLETELY ISOLATED
    useEffect(() => {
        // Prevent multiple loads
        if (initialLoadRef.current || !tableName || columns.length === 0) {
            return;
        }

        initialLoadRef.current = true;
        let isCancelled = false;
        
        const loadPreferences = async () => {
            if (isCancelled || !isMountedRef.current) return;
            
            setIsLoading(true);
            
            try {
                let loadedPreferences: TablePreferences | null = null;
                
                if (employeeId) {
                    const dbPreferences = await getUserTablePreferences(employeeId, tableName);
                    
                    if (!isCancelled && dbPreferences?.data?.preferences) {
                        // Merge with defaults to ensure all properties exist
                        loadedPreferences = {
                            ...defaultPreferences,
                            ...dbPreferences.data.preferences
                        };
                    }
                }
                
                if (!isCancelled && isMountedRef.current) {
                    const finalPreferences = loadedPreferences || defaultPreferences;
                    
                    // Set all state in one batch to prevent multiple renders
                    setPreferences(finalPreferences);
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            } catch (error) {
                console.error('Error loading table preferences:', error);
                if (!isCancelled && isMountedRef.current) {
                    setPreferences(defaultPreferences);
                    setIsLoading(false);
                    setIsInitialized(true);
                }
            }
        };

        loadPreferences();

        return () => {
            isCancelled = true;
        };
    }, [tableName, employeeId]); // DO NOT include defaultPreferences here to prevent loops

    // Reset default preferences when columns change - SEPARATE EFFECT
    useEffect(() => {
        if (isInitialized && columns.length > 0) {
            setPreferences(prevPrefs => {
                // Only update if columns actually changed
                const newColumnOrder = columns.map(col => col.accessorKey).filter(Boolean);
                const prevColumnOrder = prevPrefs.columnOrder;
                
                // Check if columns actually changed
                if (JSON.stringify(newColumnOrder) !== JSON.stringify(prevColumnOrder)) {
                    return {
                        ...prevPrefs,
                        ...defaultPreferences // Use new defaults when columns change
                    };
                }
                
                return prevPrefs; // No change needed
            });
        }
    }, [columns, isInitialized]); // Don't include defaultPreferences

    // Generic update function to prevent code duplication
    const updatePreference = useCallback(<K extends keyof TablePreferences>(
        key: K,
        updaterOrValue: TablePreferences[K] | ((prev: TablePreferences[K]) => TablePreferences[K])
    ) => {
        if (!isInitialized) return;
        
        setPreferences(currentPrefs => {
            const newValue = typeof updaterOrValue === 'function' 
                ? (updaterOrValue as (prev: TablePreferences[K]) => TablePreferences[K])(currentPrefs[key])
                : updaterOrValue;
            
            // Only update if value actually changed
            if (JSON.stringify(currentPrefs[key]) === JSON.stringify(newValue)) {
                return currentPrefs; // No change
            }
            
            const updatedPrefs = { ...currentPrefs, [key]: newValue };
            debouncedSave(updatedPrefs);
            return updatedPrefs;
        });
    }, [isInitialized, debouncedSave]);

    // Individual preference updaters using the generic function
    const updateColumnVisibility = useCallback((updaterOrValue: any) => {
        updatePreference('columnVisibility', updaterOrValue);
    }, [updatePreference]);

    const updateColumnOrder = useCallback((updaterOrValue: any) => {
        updatePreference('columnOrder', updaterOrValue);
    }, [updatePreference]);

    const updateColumnSizing = useCallback((updaterOrValue: any) => {
        updatePreference('columnSizing', updaterOrValue);
    }, [updatePreference]);

    const updateColumnPinning = useCallback((updaterOrValue: any) => {
        updatePreference('columnPinning', updaterOrValue);
    }, [updatePreference]);

    const updateSorting = useCallback((updaterOrValue: any) => {
        updatePreference('sorting', updaterOrValue);
    }, [updatePreference]);

    // const updateColumnFilters = useCallback((updaterOrValue: any) => {
    //     updatePreference('columnFilters', updaterOrValue);
    // }, [updatePreference]);

    // const updateGlobalFilter = useCallback((updaterOrValue: any) => {
    //     updatePreference('globalFilter', updaterOrValue);
    // }, [updatePreference]);

    const updatePagination = useCallback((updaterOrValue: any) => {
        updatePreference('pagination', updaterOrValue);
    }, [updatePreference]);

    const updateDensity = useCallback((updaterOrValue: any) => {
        updatePreference('density', updaterOrValue);
    }, [updatePreference]);

    const updateGrouping = useCallback((updaterOrValue: any) => {
        updatePreference('grouping', updaterOrValue);
    }, [updatePreference]);

    const updateExpanded = useCallback((updaterOrValue: any) => {
        updatePreference('expanded', updaterOrValue);
    }, [updatePreference]);

    const updateExportType = useCallback((exportType: string | null) => {
        updatePreference('exportType', exportType);
    }, [updatePreference]);

    // Save preferences function - for manual saves
    const savePreferences = useCallback(async (newPreferences: Partial<TablePreferences>) => {
        if (!isInitialized) return;

        setPreferences(currentPreferences => {
            const updatedPreferences = { ...currentPreferences, ...newPreferences };
            debouncedSave(updatedPreferences);
            return updatedPreferences;
        });
    }, [isInitialized, debouncedSave]);

    // Reset preferences to default
    const resetPreferences = useCallback(async () => {
        if (!isInitialized) return;
        
        setPreferences(defaultPreferences);
        
        if (employeeId) {
            try {
                await upsertUserTablePreferences(employeeId, tableName, defaultPreferences);
                console.log("Preferences reset successfully for", tableName);
            } catch (error) {
                console.error('Error resetting table preferences:', error);
            }
        }
    }, [tableName, employeeId, defaultPreferences, isInitialized]);

    // Cleanup effect - SEPARATE from other effects
    useEffect(() => {
        isMountedRef.current = true;
        
        return () => {
            isMountedRef.current = false;
            initialLoadRef.current = false; // Reset for potential remounts
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []); // Empty dependency array - runs once

    return {
        // State
        preferences,
        isLoading,
        isInitialized,
        
        // Individual preference updaters
        updateColumnVisibility,
        updateColumnOrder,
        updateColumnSizing,
        updateColumnPinning,
        updateSorting,
        // updateColumnFilters,
        // updateGlobalFilter,
        updatePagination,
        updateDensity,
        updateGrouping,
        updateExpanded,
        updateExportType,
        
        // Utility functions
        resetPreferences,
        savePreferences
    };
}

export default useTablePreferences;