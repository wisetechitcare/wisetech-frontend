import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { upsertUserTablePreferences, getUserTablePreferences } from "@services/users"
import { DEFAULT_PAGE_SIZE } from '@metronic/helpers'

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

// Reconcile saved preferences against the CURRENT code-defined column set.
// Returns null when the column set is unchanged, otherwise the next preferences:
//  - brand-new columns get their meta.defaultVisible default
//  - stale (removed-column) visibility keys are dropped
//  - meta.defaultVisible is re-applied to existing columns (new meta rules win)
//  - sorting entries on removed columns are dropped (fall back to defaultSorting)
// A column's identity for prefs: accessorKey, or `id` for id-only columns
// (e.g. a custom "employee" cell). Keying on accessorKey alone dropped id-only
// columns from columnOrder, so they rendered out of their defined position.
const colKey = (col: any): string | undefined => col.accessorKey ?? col.id;

function reconcilePrefsWithColumns(
    columns: any[],
    prevPrefs: TablePreferences,
    defaultSorting?: Array<{ id: string; desc: boolean }>,
): TablePreferences | null {
    const codeKeys: string[] = columns.map(colKey).filter(Boolean) as string[];
    const codeKeySet = new Set(codeKeys);
    const prevVis = prevPrefs.columnVisibility || {};
    const knownKeys = Object.keys(prevVis);

    const hasNewColumn = codeKeys.some(k => !(k in prevVis));
    const hasStaleColumn = knownKeys.some(k => !codeKeySet.has(k));

    // Same set of columns (only reordered / same identity) → keep the user's
    // persisted visibility, order, sizing, etc. untouched.
    if (!hasNewColumn && !hasStaleColumn) return null;

    const nextVisibility: Record<string, boolean> = {};
    columns.forEach((col: any) => {
        const k = colKey(col);
        if (!k) return;
        const hasMeta = col.meta?.defaultVisible !== undefined;
        const isNewColumn = !(k in prevVis);
        // If column has explicit meta.defaultVisible and is NOT brand-new,
        // apply the new meta rule (override any saved preference).
        if (hasMeta && !isNewColumn) {
            nextVisibility[k] = col.meta?.defaultVisible !== false;
        } else {
            nextVisibility[k] = k in prevVis
                ? prevVis[k]
                : col.meta?.defaultVisible !== false;
        }
    });

    // A saved sort on a removed column would silently no-op in the table;
    // drop stale entries and fall back to defaultSorting.
    const prevSorting = prevPrefs.sorting || [];
    const sanitizedSorting = prevSorting.filter(s => codeKeySet.has(s.id));
    const nextSorting = sanitizedSorting.length > 0
        ? sanitizedSorting
        : (defaultSorting ?? []);

    // Column set changed → adopt the code-defined order. This is exactly when a
    // saved order is stale (missing a newly-added column, or still holding a
    // since-removed one); preserving the old positions is what stranded id-only
    // columns (e.g. "employee") at the end. Pure reorders (same set) return early
    // above, so user drag-ordering is still preserved between schema changes.
    const nextOrder = codeKeys;

    return {
        ...prevPrefs,
        columnVisibility: nextVisibility,
        columnOrder: nextOrder,
        sorting: nextSorting,
    };
}

// `tableName` is the per-user preferences bucket key. Two tables sharing one
// name reconcile against each other's column set on every mount and overwrite
// each other's saved layout — LoanDetails shipped two such tables on the SAME
// page, so they wrote in a loop. Nothing made that visible, so it survived.
// Dev-only: count concurrently-mounted names and shout on the second one.
const mountedTableNames = new Map<string, number>();

/**
 * Warn (dev only) when two live tables share a preferences bucket. Returns the
 * cleanup that decrements the count on unmount.
 */
function trackTableNameCollision(tableName: string): () => void {
    if (!import.meta.env.DEV) return () => {};
    const next = (mountedTableNames.get(tableName) ?? 0) + 1;
    mountedTableNames.set(tableName, next);
    if (next > 1) {
        console.error(
            `[useTablePreferences] tableName "${tableName}" is mounted ${next} times at once. ` +
            `These tables share one preferences bucket and will overwrite each other's ` +
            `column layout and sorting. Give each table a unique tableName.`,
        );
    }
    return () => {
        const remaining = (mountedTableNames.get(tableName) ?? 1) - 1;
        if (remaining > 0) mountedTableNames.set(tableName, remaining);
        else mountedTableNames.delete(tableName);
    };
}

// Session cache of resolved preference buckets, keyed by employee+table.
//
// WHY: `loadedForRef` is reset on unmount, so EVERY mount re-fetches from the DB and
// the table sits behind its skeleton until that round trip lands. Pages that swap the
// table for a loader and remount — the exact pattern the reconcile comments below
// describe — paid that cost repeatedly, re-showing the skeleton each time.
//
// Deliberately NOT a fix for the first paint: the `isInitialized` gate stays. Rendering
// the table before preferences resolve would emit onVisibleColumnsChange twice (defaults,
// then saved) and re-open the refetch loop that gate exists to prevent, plus flash the
// wrong columns at anyone who has hidden some.
//
// ponytail: session-scoped Map, never evicted. Buckets are a few KB and bounded by the
// tables one user visits; swap for an LRU only if that stops being true. A second tab
// editing the same bucket will not invalidate this one — acceptable for per-user layout.
const prefsCache = new Map<string, TablePreferences>();
const prefsCacheKey = (employeeId: string, tableName: string) => `${employeeId}::${tableName}`;

// A browser refresh / tab close does not run React's unmount cleanup, so a change made inside
// the 500ms save debounce was lost: sort a column, hit refresh, and the sort was gone.
// Every scheduled save is therefore mirrored SYNCHRONOUSLY into localStorage and removed only
// once the server confirms the write. The next mount restores (and re-sends) anything still
// pending, so the last thing the user did always wins.
const pendingPrefsKey = (employeeId: string, tableName: string) => `wt:table-prefs-pending:${employeeId}:${tableName}`;
const writePendingPrefs = (employeeId: string, tableName: string, prefs: TablePreferences) => {
    try { localStorage.setItem(pendingPrefsKey(employeeId, tableName), JSON.stringify(prefs)); } catch { /* storage full / blocked: the server write still happens */ }
};
const clearPendingPrefs = (employeeId: string, tableName: string, prefs: TablePreferences) => {
    try {
        const key = pendingPrefsKey(employeeId, tableName);
        // Only clear if nothing newer was written while this request was in flight.
        if (localStorage.getItem(key) === JSON.stringify(prefs)) localStorage.removeItem(key);
    } catch { /* ignore */ }
};
const readPendingPrefs = (employeeId: string, tableName: string): TablePreferences | null => {
    try {
        const raw = localStorage.getItem(pendingPrefsKey(employeeId, tableName));
        return raw ? (JSON.parse(raw) as TablePreferences) : null;
    } catch { return null; }
};

// The signed-in session marker (same key the auth layer and the roles thunk read). While it is
// present but the employee record has not loaded yet, preferences must WAIT for the employee id
// rather than initialise from defaults.
const hasSession = () => {
    try { return !!localStorage.getItem('wise_tech_login'); } catch { return false; }
};

// A saved EMPTY sort means "no sort chosen" — a table with a defaultSorting shows that default
// (e.g. Leads: newest inquiry first), never an arbitrary server order.
const withDefaultSorting = (prefs: TablePreferences, defaultSorting?: Array<{ id: string; desc: boolean }>): TablePreferences =>
    (!prefs.sorting || prefs.sorting.length === 0) && defaultSorting?.length
        ? { ...prefs, sorting: defaultSorting }
        : prefs;

function useTablePreferences(tableName: string, columns: any[], employeeId?: string, defaultSorting?: Array<{ id: string; desc: boolean }>, persist: boolean = true) {
    // Use refs to prevent recreating functions and causing loops
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Holds the not-yet-written save so unmount can flush it. Without this, a
    // change made within the 500ms debounce window was silently lost: the
    // cleanup below cleared the timer, so sorting a column and immediately
    // navigating away never persisted the sort.
    const pendingSaveRef = useRef<(() => Promise<void>) | null>(null);
    const isMountedRef = useRef(true);
    // The employee id the current preferences were loaded FOR ('' = loaded without one,
    // null = nothing loaded yet). A boolean guard here meant that a table which mounted
    // before the employee record arrived (every hard refresh) loaded DEFAULTS and could never
    // load the saved bucket afterwards — the saved sort/columns were silently ignored.
    const loadedForRef = useRef<string | null>(null);
    
    // Memoize default preferences to prevent recreation on every render
    const defaultPreferences = useMemo((): TablePreferences => {
        const columnVisibility = columns.reduce((acc: any, col: any) => {
            const k = colKey(col);
            if (k) {
                // Honour meta.defaultVisible === false to hide columns by default
                acc[k] = col.meta?.defaultVisible !== false;
            }
            return acc;
        }, {});

        return {
            columnVisibility,
            columnOrder: columns.map(colKey).filter(Boolean) as string[],
            columnSizing: {},
            columnPinning: {},
            sorting: defaultSorting ?? [],
            // columnFilters: [],
            // globalFilter: '',
            pagination: {
                pageIndex: 0,
                pageSize: DEFAULT_PAGE_SIZE
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
        // persist === false → ephemeral table (e.g. chart drill-down): never write the DB.
        if (!persist || !employeeId || !isMountedRef.current || !isInitialized) {
            return;
        }

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // The write itself, captured so unmount can run it immediately instead
        // of dropping it. Reassigned on every schedule, so it always closes over
        // the newest preferences and never a stale employeeId/tableName.
        // Cache immediately, not after the write resolves: local state is already the
        // source of truth for this bucket, and a remount during the 500ms debounce must
        // not read a value older than what the user just did.
        prefsCache.set(prefsCacheKey(employeeId, tableName), newPreferences);
        // Survives a refresh inside the debounce window (see writePendingPrefs).
        writePendingPrefs(employeeId, tableName, newPreferences);

        pendingSaveRef.current = async () => {
            pendingSaveRef.current = null;
            try {
                await upsertUserTablePreferences(employeeId, tableName, newPreferences);
                clearPendingPrefs(employeeId, tableName, newPreferences);
            } catch (error) {
                console.error('Error saving table preferences:', error);
            }
        };

        // Set new timeout for debounced save
        saveTimeoutRef.current = setTimeout(() => {
            void pendingSaveRef.current?.();
        }, 500);
    }, [persist, employeeId, tableName, isInitialized]); // Stable dependencies only

    // Load preferences on mount - COMPLETELY ISOLATED
    useEffect(() => {
        if (!tableName || columns.length === 0) {
            return;
        }

        // Signed in, but the employee record is still being fetched (every hard refresh):
        // WAIT. Initialising now would load DEFAULTS (default sort, default columns) and the
        // user's saved sort would never be applied. This effect re-runs the moment the id
        // arrives, because `employeeId` is a dependency.
        if (persist && !employeeId && hasSession()) {
            return;
        }

        // Prevent multiple loads FOR THE SAME employee — but a different employee id (it
        // arriving after an id-less load, or an account switch) must load its own bucket.
        const loadKey = employeeId || '';
        if (loadedForRef.current === loadKey) {
            return;
        }

        loadedForRef.current = loadKey;
        let isCancelled = false;
        
        const loadPreferences = async () => {
            if (isCancelled || !isMountedRef.current) return;

            setIsLoading(true);

            // Ephemeral tables (persist === false — e.g. chart drill-down modals) never
            // touch the DB: they always render the code-derived meta.defaultVisible column
            // set, so a previously-saved (stale) per-drill bucket can no longer override the
            // curated defaults. In-session show/hide toggles still work; they just aren't
            // persisted. This also neutralises any already-polluted buckets already in the DB.
            if (!persist) {
                setPreferences(defaultPreferences);
                setIsLoading(false);
                setIsInitialized(true);
                return;
            }

            // A change that never reached the server (refresh / tab close inside the save
            // debounce, or a failed request). It is the user's most recent action, so it beats
            // both the cache and the DB; re-send it and let the normal flow take over.
            if (employeeId) {
                const pending = readPendingPrefs(employeeId, tableName);
                if (pending) {
                    const resolved = withDefaultSorting(
                        { ...defaultPreferences, ...pending, columnVisibility: { ...defaultPreferences.columnVisibility, ...(pending.columnVisibility ?? {}) } },
                        defaultSorting,
                    );
                    const next = reconcilePrefsWithColumns(columns, resolved, defaultSorting) ?? resolved;
                    prefsCache.set(prefsCacheKey(employeeId, tableName), next);
                    upsertUserTablePreferences(employeeId, tableName, next)
                        .then(() => clearPendingPrefs(employeeId, tableName, pending))
                        .catch((error) => console.error('Error re-sending pending table preferences:', error));
                    if (!isCancelled && isMountedRef.current) {
                        setPreferences(next);
                        setIsLoading(false);
                        setIsInitialized(true);
                    }
                    return;
                }
            }

            // Served from the session cache — no round trip, no second skeleton. The
            // reconcile below still runs, so a column set that changed since the bucket
            // was cached is still corrected before isInitialized flips.
            if (employeeId) {
                const cachedRaw = prefsCache.get(prefsCacheKey(employeeId, tableName));
                // Same rule as the DB path below: an empty saved sort means "the default".
                const cached = cachedRaw ? withDefaultSorting(cachedRaw, defaultSorting) : cachedRaw;
                if (cached) {
                    const reconciled = reconcilePrefsWithColumns(columns, cached, defaultSorting);
                    const next = reconciled ?? cached;
                    if (reconciled) {
                        prefsCache.set(prefsCacheKey(employeeId, tableName), next);
                        upsertUserTablePreferences(employeeId, tableName, next)
                            .catch((error) => console.error('Error persisting reconciled table preferences:', error));
                    }
                    if (!isCancelled && isMountedRef.current) {
                        setPreferences(next);
                        setIsLoading(false);
                        setIsInitialized(true);
                    }
                    return;
                }
            }

            try {
                let loadedPreferences: TablePreferences | null = null;

                if (employeeId) {
                    const dbPreferences = await getUserTablePreferences(employeeId, tableName);
                    
                    if (!isCancelled && dbPreferences?.data?.preferences) {
                        const dbColVis: Record<string, boolean> = dbPreferences.data.preferences.columnVisibility ?? {};

                        // Property-level merge for columnVisibility.
                        // The user's saved choice is the source of truth and must persist across
                        // reloads / re-logins. Start from code defaults so that brand-new columns
                        // (not yet present in the DB) get their default visibility, then let every
                        // saved DB value win — including an explicit 'false' for a column the user
                        // hid. (Columns removed from code but still in the DB are harmless; the
                        // table simply ignores unknown keys.)
                        const mergedColumnVisibility: Record<string, boolean> = {
                            ...defaultPreferences.columnVisibility,   // defaults fill in any new columns
                            ...dbColVis,                              // user's persisted choices win
                        };

                        // A saved (possibly empty) sorting in the DB would otherwise clobber the
                        // caller's defaultSorting. Only let the DB value win when the user actually
                        // has an active sort; when it's empty/absent, fall back to defaultSorting so
                        // tables like Contacts/Companies keep their A-Z default. Tables that pass no
                        // defaultSorting are unaffected (both branches are []).
                        const dbSorting = dbPreferences.data.preferences.sorting;
                        const mergedSorting = (Array.isArray(dbSorting) && dbSorting.length > 0)
                            ? dbSorting
                            : defaultPreferences.sorting;

                        // Merge with defaults to ensure all properties exist; use deep-merged visibility
                        loadedPreferences = {
                            ...defaultPreferences,
                            ...dbPreferences.data.preferences,
                            columnVisibility: mergedColumnVisibility,
                            sorting: mergedSorting
                        };
                    }
                }
                
                if (!isCancelled && isMountedRef.current) {
                    let finalPreferences = loadedPreferences || defaultPreferences;

                    // Reconcile against the CURRENT column set BEFORE flipping
                    // isInitialized, and persist the result. Saved prefs can hold
                    // stale keys from since-removed columns; if we only reconciled
                    // in the post-init effect (and never saved), every mount would
                    // emit two different visible-column sets (pre/post reconcile).
                    // Pages that refetch on onVisibleColumnsChange and swap the
                    // table for a loader then remount → reload stale prefs → emit
                    // again — an endless ~1s refresh loop.
                    const reconciled = reconcilePrefsWithColumns(columns, finalPreferences, defaultSorting);
                    if (reconciled) {
                        finalPreferences = reconciled;
                        if (employeeId && loadedPreferences) {
                            // Immediate, not debounced — a debounced save is
                            // cleared on unmount, leaving the DB stale forever.
                            upsertUserTablePreferences(employeeId, tableName, reconciled)
                                .catch((error) => console.error('Error persisting reconciled table preferences:', error));
                        }
                    }

                    // Seed the session cache with the fully-resolved bucket so a remount
                    // skips the round trip entirely.
                    if (employeeId) {
                        prefsCache.set(prefsCacheKey(employeeId, tableName), finalPreferences);
                    }

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
    }, [tableName, employeeId, persist]); // DO NOT include defaultPreferences here to prevent loops

    // Reconcile preferences when the SET of columns changes - SEPARATE EFFECT.
    //
    // IMPORTANT: reconcile on the *set* of accessorKeys (added / removed columns),
    // NOT on their order. The previous version compared the ordered `columnOrder`
    // arrays, but MRT persists its own column order (internal column ids + any user
    // drag-reorder), so the saved order never equals the raw code order. That made
    // this effect fire on *every* column-identity change (e.g. whenever a page's
    // `columns` memo recomputes after a data fetch), wiping columnVisibility back to
    // defaults. Combined with a page that refetches when visible columns change
    // (onVisibleColumnsChange), that closed an infinite fetch⇄reset loop and also
    // silently discarded the user's hidden-column choices.
    useEffect(() => {
        if (isInitialized && columns.length > 0) {
            setPreferences(prevPrefs => {
                const next = reconcilePrefsWithColumns(columns, prevPrefs, defaultSorting);
                if (!next) return prevPrefs;
                // Persist the reconciled prefs — otherwise the stale keys stay in
                // the DB and the reconcile (plus its visible-column re-emission)
                // repeats on every mount.
                debouncedSave(next);
                return next;
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

        if (persist && employeeId) {
            // Reset the cache too — otherwise a remount immediately restores the layout
            // the user just asked to discard.
            prefsCache.set(prefsCacheKey(employeeId, tableName), defaultPreferences);
            try {
                await upsertUserTablePreferences(employeeId, tableName, defaultPreferences);
                console.log("Preferences reset successfully for", tableName);
            } catch (error) {
                console.error('Error resetting table preferences:', error);
            }
        }
    }, [tableName, employeeId, defaultPreferences, isInitialized, persist]);

    // Dev-only bucket-collision warning. Its own effect, keyed on tableName —
    // the cleanup effect below deliberately runs once ([] deps), so folding this
    // into it would either capture a stale name or clear a pending save on every
    // tableName change (drill-down tables swap theirs).
    useEffect(() => trackTableNameCollision(tableName), [tableName]);

    // Cleanup effect - SEPARATE from other effects
    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            loadedForRef.current = null; // Reset for potential remounts
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            // Flush rather than drop. The request outlives this component, so a
            // sort applied just before navigating away still reaches the server.
            void pendingSaveRef.current?.();
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