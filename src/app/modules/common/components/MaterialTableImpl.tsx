import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import ExportButton from "@app/modules/common/components/ExportButton";
import {
  MaterialReactTable,
  MRT_ShowHideColumnsButton,
  MRT_ToggleFiltersButton,
  MRT_ToggleFullScreenButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import {
  Button,
  ButtonGroup,
  Container,
  createTheme,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  ThemeProvider,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { useThemeMode } from "@metronic/partials";
import { Box } from "@mui/material";
import { KTIcon, PAGE_SIZE_OPTIONS, PageSizeOption } from "@metronic/helpers";
import SelectInput from "@app/modules/common/inputs/SelectInput";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, Status } from "@constants/statistics";
import useTablePreferences from "@hooks/useTablePreferences";
import { fitColumnWidth } from "./fitColumnWidth";
import { rowId, resolveSelectedRows, selectionSignature } from "./table/rowSelection";
import { useGridNavigation } from "./table/useGridNavigation";
import {
  HighlightMatch,
  intelligentSearchFilterFn,
  processSearchQuery,
  calculateMatchScore,
} from "@app/utils/search";
import React from "react";

interface SearchableColumn {
  value: string;
  label: string;
  accessorKey: string;
}

export interface MaterialTableProps {
  data: any;
  columns: any;
  hideFilters?: boolean;
  hideExportCenter?: boolean;
  hidePagination?: boolean;
  tableName: string;
  employeeId?: string;
  muiTableProps?: {
    sx?: object;
    tableLayout?: "auto";
    muiTableBodyRowProps?: (row: any) => object;
  };
  enableBottomToolbar?: boolean;
  muiTableHeadCellStyle?: object;
  muiTablePaperStyle?: object;
  enableTableHead?: boolean;
  resource?: string;
  viewOwn?: boolean;
  viewOthers?: boolean;
  checkOwnWithOthers?: boolean;

  enableFilters?: boolean;
  enableSorting?: boolean;
  enableGrouping?: boolean;
  enableColumnDragging?: boolean;
  enableColumnResizing?: boolean;
  enableColumnPinning?: boolean;
  enableExpandAll?: boolean;
  enableColumnActions?: boolean;
  enableHiding?: boolean;
  enableFullScreenToggle?: boolean;

  // Column-specific search props
  enableColumnSpecificSearch?: boolean;

  // Server-side pagination props (optional)
  manualPagination?: boolean;
  rowCount?: number;
  onPaginationChange?: (pagination: any) => void;
  /**
   * Sort on the server instead of in the browser.
   *
   * REQUIRED whenever `manualPagination` is on and you want sorting to mean
   * anything. With manual pagination the `data` prop holds only the current
   * page, but MRT still sorts client-side by default — so clicking a header
   * reorders just the visible rows while the UI implies the whole dataset was
   * sorted. Setting this stops the local sort; pair it with `onSortingChange`
   * and refetch with the new order.
   *
   * Defaults to false, so existing tables are unaffected until they opt in.
   */
  manualSorting?: boolean;
  /** Fires with the resolved sorting state so the page can refetch. Preferences
   *  are still persisted either way. */
  onSortingChange?: (sorting: Array<{ id: string; desc: boolean }>) => void;
  paginationState?: { pageIndex: number; pageSize: number };
  isLoading?: boolean;
  layoutMode?: "grid" | "grid-no-grow" | "semantic";
  enableRowVirtualization?: boolean;
  muiTableContainerProps?: any;
  renderDetailPanel?: (props: { row: any; table: any }) => React.ReactNode;
  enableStatusColorCoding?: boolean;
  renderTopToolbarRightActions?: () => React.ReactNode;
  /** Replaces the bottom-left "Select Export File + Export" UI with custom content */
  renderExportActions?: () => React.ReactNode;
  /** Opt-in: render the column footer row (e.g. totals). Off by default to preserve existing tables. */
  showColumnFooter?: boolean;
  defaultSorting?: Array<{ id: string; desc: boolean }>;
  /** Notifies the parent of the currently-visible column keys (after preferences load
   *  and on every show/hide toggle). Lets a page fetch only the data those columns need. */
  onVisibleColumnsChange?: (visibleKeys: string[]) => void;
  /**
   * Row multi-select. Off by default, so all 87 existing tables are untouched.
   *
   * The engine (material-react-table) has always supported this — it was simply never
   * switched on anywhere, which is why the app has no bulk actions. Turning it on per
   * table is the cheapest route to them.
   */
  enableRowSelection?: boolean;
  /** Fires with the selected rows (row.original), so a page can act on them. */
  onSelectedRowsChange?: (rows: any[]) => void;
  /** Rendered in the toolbar while rows are selected — put bulk actions here. */
  renderSelectionActions?: (selected: any[]) => React.ReactNode;
  /**
   * The SERVER applies search/filtering, so the engine must not re-filter `data` locally.
   * Required whenever manualPagination is on and search is expected to mean anything:
   * `data` holds one page, so a local pass searches only that page.
   */
  manualFiltering?: boolean;
  /** Fires with the DEBOUNCED search query so the page can refetch. */
  onSearchChange?: (query: string) => void;
  /** When false, column/sort/etc. preferences are neither loaded from nor saved to the DB —
   *  the table always renders the code-defined defaults (meta.defaultVisible). Use for
   *  ephemeral tables such as chart drill-down modals, where a persisted per-instance bucket
   *  would otherwise stick and override the curated default column set. Defaults to true. */
  persistPreferences?: boolean;
}

const defaultColumnSizes = {
  minSize: 80,
  maxSize: 1000,
};

// A column's identity: accessorKey, or `id` for id-only columns (a custom cell
// backed by accessorFn — e.g. the "employee" column on the attendance boards, or
// "route" on reimbursements). Keying on accessorKey alone dropped those columns
// out of the search dropdown, out of the "All Columns" row text (so searching an
// employee name on Daily Attendance matched nothing) and out of CSV/Excel export.
// Mirrors the same helper in useTablePreferences.
const colKey = (col: any): string | undefined => col.accessorKey ?? col.id;

/**
 * A pinned column floats above the ones scrolling beneath it, but MRT sets `opacity: 0.97`
 * on the pinned cell AND paints its only backdrop (a `::before`) at 97% too — so the columns
 * sliding underneath ghost straight through, and a pinned header reads as two labels stacked
 * on each other. Make both solid, and keep MRT's inset edge shadow, which is the thing that
 * actually signals "this column is pinned".
 */
/**
 * The active (debounced) search query, published to cells.
 *
 * WHY CONTEXT: the highlight wrapper needs the query, but reading it from the closure of
 * the `finalColumns` memo forced that memo to depend on the query — so every keystroke
 * rebuilt all column definitions and invalidated MRT's whole column model. Subscribing
 * here instead means a keystroke re-renders only the cells.
 */
const SearchQueryContext = React.createContext<string>("");

/**
 * Wraps a rendered cell value and highlights matches against the active query.
 *
 * A real component, not a helper called during render, so `useContext` is legal: MRT
 * invokes `Cell` as a render function, and hooks inside one are not guaranteed to be
 * stable across MRT's internal re-renders.
 */
const HighlightedCell = ({ content }: { content: any }) => {
  const query = React.useContext(SearchQueryContext);

  const highlight = (text: any) =>
    typeof text === "string" && query ? <HighlightMatch text={text} query={query} /> : text;

  if (typeof content === "string") return <>{highlight(content)}</>;

  // A simple element with a single string child — highlight through it.
  if (
    React.isValidElement(content) &&
    content.props &&
    typeof (content.props as any).children === "string"
  ) {
    return React.cloneElement(
      content as React.ReactElement,
      { children: highlight((content.props as any).children) } as any,
    );
  }

  return <>{content}</>;
};

const pinnedCellSx = (mode: "light" | "dark") => ({
  '&[data-pinned="true"]': {
    // The cell stays background-less so row hover and status tinting still show; the
    // `::before` (zIndex -1) is the backdrop underneath them.
    opacity: 1,
    "&:before": {
      // Must follow the theme. Hardcoded "#fff" painted a WHITE slab behind pinned
      // columns in dark mode — the one place the backdrop is opaque by design, so it
      // could not be missed. Matches the engine's own background.default convention.
      backgroundColor: mode === "light" ? "#fff" : "#000",
      opacity: 1,
    },
  },
});

/**
 * Skeleton palette. Values are lifted verbatim from the lazy wrapper's skeleton in
 * MaterialTable.tsx (GitHub-dark: #0d1117 / #161b22 / #21262d / #30363d) so the two
 * agree. They previously did not: the wrapper's skeleton was dark-aware and this one was
 * hardcoded light, so a dark-mode user watched a correct dark skeleton flip to a white
 * box before the table painted.
 */
const skeletonPalette = (mode: "light" | "dark") =>
  mode === "light"
    ? { surface: "#fff", header: "#FAFBFC", border: "#EAECF0", rowBorder: "#F3F4F6", bar: "#E5E7EB", barSoft: "#F3F4F6" }
    : { surface: "#0d1117", header: "#161b22", border: "#30363d", rowBorder: "#21262d", bar: "#30363d", barSoft: "#21262d" };


function MaterialTable({
  data,
  columns,
  hideFilters,
  hideExportCenter,
  hidePagination,
  tableName,
  muiTableProps,
  enableBottomToolbar = true,
  muiTableHeadCellStyle = {},
  muiTablePaperStyle = {},
  enableTableHead = true,
  resource = "",
  viewOwn = false,
  viewOthers = false,
  checkOwnWithOthers = false,
  employeeId,
  enableFilters = true,
  enableSorting = true,
  enableGrouping = true,
  enableColumnDragging = true,
  enableColumnResizing = false,
  enableColumnPinning = true,
  enableExpandAll = true,
  enableColumnActions = true,
  enableHiding = true,
  enableFullScreenToggle = true,
  enableColumnSpecificSearch = true,
  manualPagination = false,
  rowCount,
  onPaginationChange,
  manualSorting = false,
  onSortingChange: onSortingChangeProp,
  paginationState,
  isLoading = false,
  layoutMode = "semantic",
  enableRowVirtualization = false,
  muiTableContainerProps: customMuiTableContainerProps,
  renderDetailPanel,
  enableStatusColorCoding = true,
  renderTopToolbarRightActions,
  renderExportActions,
  showColumnFooter = false,
  defaultSorting,
  onVisibleColumnsChange,
  manualFiltering = false,
  onSearchChange,
  enableRowSelection = false,
  onSelectedRowsChange,
  renderSelectionActions,
  persistPreferences = true,
}: MaterialTableProps) {
  // Selection is NOT persisted to preferences: it is transient intent ("act on these
  // now"), not layout. Restoring a stale selection after a reload and then firing a bulk
  // action against it is exactly the kind of surprise that destroys data.
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // When the pager is hidden on a client-side table, we render ALL rows (no paging)
  // and also drop the rows-per-page selector + range count, which would otherwise
  // be misleading (e.g. "Rows per page: 10 · 1–10 of 19" while all 19 rows show).
  const paginationDisabled = !!hidePagination && !manualPagination;

  // Column-specific search state
  const [selectedSearchColumn, setSelectedSearchColumn] =
    useState<string>("all");
  const [globalFilterValue, setGlobalFilterValue] = useState<string>("");
  const [debouncedFilterValue, setDebouncedFilterValue] = useState<string>("");
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [isMobileSearchVisible, setIsMobileSearchVisible] =
    useState<boolean>(false);

  // Debounce effect for search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilterValue(globalFilterValue);
    }, 300);
    return () => clearTimeout(handler);
  }, [globalFilterValue]);

  // Apply default sizing if not set
  const finalColumns = useMemo(
    () =>
      columns.map((col: any) => {
        // "actions" / "avatar" have no backing row field, so MRT's sort, group
        // and filter controls all operated on undefined — 42 of 68 such columns
        // app-wide rendered a ⇅ affordance that did nothing. Defaults only:
        // `...col` is spread afterwards, so a column can still opt back in.
        const key = col.accessorKey ?? col.id;
        const isNonDataColumn = key === "actions" || key === "avatar";

        return {
        ...defaultColumnSizes,
        ...(isNonDataColumn
          ? { enableSorting: false, enableColumnActions: false, enableHiding: false }
          : {}),
        ...col, // custom column values will override defaults
        // The search query is read from context INSIDE HighlightedCell, not closed over
        // here — see SearchQueryContext. That is what keeps this memo independent of the
        // query and off the per-keystroke path.
        Cell: (cellProps: any) => (
          <HighlightedCell content={col.Cell ? col.Cell(cellProps) : cellProps.cell.getValue()} />
        ),
        };
      }),
    // Deliberately NOT depending on the search query. This memo rebuilds every column
    // definition, which invalidates MRT's entire column model; doing that on each
    // keystroke was the single most expensive thing typing in the search box did.
    // Highlighting still updates on every keystroke because HighlightedCell subscribes
    // to the query via context, so only the cells re-render, not the column model.
    [columns],
  );

  /**
   * Who owns the saved layout.
   *
   * `employeeId` is the preferences bucket key, and it was a required-in-practice
   * prop that 23 of the 88 tables simply never passed — so those tables silently
   * persisted nothing: sort a column, reload, gone. Every caller that does pass
   * it passes the current user's own id, so resolve it here instead of asking 23
   * more call sites to remember. The prop still wins when supplied.
   */
  const currentEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);
  const prefsEmployeeId = employeeId ?? currentEmployeeId;

  /**
   * Server-paginated but client-sorted is a silent correctness bug: `data` holds
   * only the current page, so a header click reorders the visible rows while the
   * sort indicator implies the whole dataset. Same for the search box. Warn in
   * dev rather than change behaviour, so existing tables keep working until each
   * one is migrated to server-side sort.
   */
  useEffect(() => {
    if (!import.meta.env.DEV || !manualPagination) return;
    if (!manualSorting) {
      console.warn(
        `[MaterialTable] "${tableName}" paginates on the server but sorts in the browser, ` +
        `so sorting only affects the current page. Pass manualSorting + ` +
        `onSortingChange and refetch with the new order.`,
      );
    }
    if (!manualFiltering) {
      console.warn(
        `[MaterialTable] "${tableName}" paginates on the server but searches in the browser, ` +
        `so search only matches the page currently loaded — rows on other pages are ` +
        `invisible to it. Pass manualFiltering + onSearchChange and refetch with the query.`,
      );
    }
  }, [manualPagination, manualSorting, manualFiltering, tableName]);

  const isMobile = useMediaQuery("(max-width:600px)");

  const globalTheme = useTheme();

  // Memoize finalData to prevent infinite re-renders
  const finalData = useMemo(() => {
    let processedData: any = [];
    const dataExtractedWithEmployeeId = data.filter(
      (v: any) => v.employeeId != null,
    );
    const dataExtractedWithoutEmployeeId = data.filter(
      (v: any) => v.employeeId == null,
    );

    if (resource) {
      if (viewOthers) {
        const newData = dataExtractedWithEmployeeId.filter((val: any) => {
          return hasPermission(
            resource,
            permissionConstToUseWithHasPermission.readOthers,
            val,
          );
        });
        processedData = [...processedData, ...newData];
      } else if (viewOwn) {
        const newData = dataExtractedWithEmployeeId.filter((val: any) => {
          return hasPermission(
            resource,
            permissionConstToUseWithHasPermission.readOwn,
            val,
          );
        });
        processedData = [...processedData, ...newData];
      }
      if (checkOwnWithOthers) {
        const newData = dataExtractedWithEmployeeId.filter((val: any) => {
          return hasPermission(
            resource,
            permissionConstToUseWithHasPermission.readOwn,
            val,
          );
        });
        processedData = [...processedData, ...newData];
      }
      processedData = [...processedData, ...dataExtractedWithoutEmployeeId];
    } else {
      processedData = data;
    }

    // Both viewOthers and checkOwnWithOthers filter from the same source array,
    // so a row that passes both permission checks gets appended twice. Deduplicate
    // by object reference before returning.
    return Array.from(new Set(processedData));
  }, [data, resource, viewOthers, viewOwn, checkOwnWithOthers]);

  const { mode: metronicMode } = useThemeMode();
  const mode = metronicMode === "system" ? "light" : metronicMode;
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Arrow-key movement over the body. MRT ships no keyboard support at all (2.13.3),
  // so without this a keyboard user tabs through every interactive element in the grid
  // in DOM order — hundreds of stops on a wide table. Movement logic is unit tested in
  // ./table/gridNavigation.
  useGridNavigation(tableContainerRef, true);
  const scrollTrackRef = useRef<HTMLDivElement>(null);
  const scrollThumbRef = useRef<HTMLDivElement>(null);
  const scrollBarWrapRef = useRef<HTMLDivElement>(null);
  const isDraggingHScroll = useRef(false);
  const dragOriginX = useRef(0);
  const dragOriginScrollLeft = useRef(0);

  // 100% DOM-driven — no React state, no re-renders, no flicker
  const syncThumb = useCallback(() => {
    const el = tableContainerRef.current;
    const thumb = scrollThumbRef.current;
    const wrap = scrollBarWrapRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflows = scrollWidth > clientWidth + 2;
    if (wrap) {
      // Own-row scrollbar: collapse it entirely when the table doesn't overflow so it
      // never takes space / overlaps the pagination footer.
      wrap.style.display = overflows ? 'flex' : 'none';
    }
    if (!thumb || !overflows) return;
    const widthPct = (clientWidth / scrollWidth) * 100;
    const leftPct = (scrollLeft / (scrollWidth - clientWidth)) * (100 - widthPct);
    // Own left+width directly — React never sets these so they won't be reset
    thumb.style.width = `${widthPct}%`;
    thumb.style.left = `${leftPct}%`;
  }, []);

  useEffect(() => {
    // MRT mounts its container asynchronously — retry until ref is populated
    let cleanupFn: (() => void) | undefined;
    let attempts = 0;
    const trySetup = () => {
      const el = tableContainerRef.current;
      if (!el) {
        if (attempts++ < 30) { setTimeout(trySetup, 100); }
        return;
      }
      el.addEventListener('scroll', syncThumb, { passive: true });
      // Shift+wheel is native browser behaviour — a custom handler here only got in its
      // way (it moved deltaY * 0.1, i.e. ~10px, which scroll-snap immediately undid).
      const ro = new ResizeObserver(syncThumb);
      ro.observe(el);
      syncThumb();
      cleanupFn = () => {
        el.removeEventListener('scroll', syncThumb);
        ro.disconnect();
      };
    };
    trySetup();
    return () => { cleanupFn?.(); };
  }, [syncThumb]);

  // Pointer-capture drag — no window listeners needed, works on touch too
  const onThumbPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    isDraggingHScroll.current = true;
    dragOriginX.current = e.clientX;
    dragOriginScrollLeft.current = tableContainerRef.current?.scrollLeft ?? 0;
    const t = scrollThumbRef.current;
    if (t) { t.style.backgroundColor = '#1E3A8A'; t.style.boxShadow = '0 0 0 4px rgba(30, 58, 138,0.25)'; t.style.cursor = 'grabbing'; }
  }, []);

  const onThumbPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHScroll.current) return;
    const el = tableContainerRef.current;
    const track = scrollTrackRef.current;
    if (!el || !track) return;
    const { scrollWidth, clientWidth } = el;
    const trackW = track.clientWidth;
    const thumbW = (clientWidth / scrollWidth) * trackW;
    const delta = e.clientX - dragOriginX.current;
    el.scrollLeft = dragOriginScrollLeft.current + (delta / (trackW - thumbW)) * (scrollWidth - clientWidth);
  }, []);

  const onThumbPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingHScroll.current) return;
    isDraggingHScroll.current = false;
    (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    const t = scrollThumbRef.current;
    if (t) { t.style.backgroundColor = ''; t.style.boxShadow = ''; t.style.cursor = 'grab'; }
  }, []);

  // Auto-generate searchable columns from columns prop (only when search is enabled)
  const autoGeneratedSearchableColumns = useMemo(() => {
    if (!enableColumnSpecificSearch) {
      return []; // Return empty array when feature is disabled
    }

    const excludedColumns = ["avatar", "actions"]; // Columns to exclude from search

    return columns
      .filter((col: any) => {
        const k = colKey(col);
        return k && !excludedColumns.includes(k) && col.header; // Must have a header to display
      })
      .map((col: any) => ({
        value: colKey(col),
        label: col.header,
        accessorKey: col.accessorKey,
        accessorFn: col.accessorFn,
      }));
  }, [columns, enableColumnSpecificSearch]);

  // Use auto-generated searchable columns
  const effectiveSearchableColumns = useMemo(() => {
    return autoGeneratedSearchableColumns;
  }, [autoGeneratedSearchableColumns]);

  const {
    preferences,
    isLoading: preferencesLoading,
    isInitialized,
    updateColumnVisibility,
    updateColumnOrder,
    updateColumnSizing,
    updateColumnPinning,
    updateSorting,
    updatePagination,
    updateDensity,
    updateGrouping,
    updateExpanded,
    resetPreferences,
  } = useTablePreferences(tableName, finalColumns, prefsEmployeeId, defaultSorting, persistPreferences);

  // Surface the visible column keys to the parent once preferences resolve and on every
  // toggle. A column is visible unless its visibility flag is explicitly false.
  //
  // Gate on the *content* of the visible-key set, not on object identity. finalColumns
  // gets a fresh identity whenever a page's `columns` memo recomputes (e.g. after a data
  // fetch that repopulates lookup lists), which would otherwise re-emit an identical set
  // on every fetch and, for pages that refetch on this callback, spin a feedback loop.
  const lastVisibleKeysSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isInitialized || !onVisibleColumnsChange) return;
    const vis = preferences.columnVisibility || {};
    const visibleKeys = finalColumns
      .map((c: any) => c.accessorKey)
      .filter((k: any) => k && vis[k] !== false);
    const sig = [...visibleKeys].sort().join(",");
    if (sig === lastVisibleKeysSigRef.current) return;
    lastVisibleKeysSigRef.current = sig;
    onVisibleColumnsChange(visibleKeys);
  }, [isInitialized, preferences.columnVisibility, finalColumns, onVisibleColumnsChange]);

  const [rowsAnchorEl, setRowsAnchorEl] = useState<null | HTMLElement>(null);

  // Mobile detection
  const theme = useTheme();

  // Initialize filteredData
  useEffect(() => {
    setFilteredData(finalData);
  }, [finalData]);

  // Initialize selectedSearchColumn (separate effect)
  useEffect(() => {
    if (
      enableColumnSpecificSearch &&
      effectiveSearchableColumns &&
      effectiveSearchableColumns.length > 0
    ) {
      // Set to 'all' if not already set
      if (!selectedSearchColumn || selectedSearchColumn === "") {
        setSelectedSearchColumn("all");
      }
    }
  }, [
    enableColumnSpecificSearch,
    effectiveSearchableColumns,
    selectedSearchColumn,
  ]);

  // Debug effect to track filteredData changes (only when search is enabled)
  // useEffect(() => {
  //     if (enableColumnSpecificSearch) {
  //         console.log("🔄 filteredData changed:", {
  //             length: filteredData.length,
  //             enableColumnSpecificSearch,
  //             selectedSearchColumn,
  //             globalFilterValue
  //         });
  //     }
  // }, [enableColumnSpecificSearch && filteredData.length, selectedSearchColumn, globalFilterValue]); // Only trigger on actual changes

  // Memoized column lookup map for O(1) access (instead of O(n) .find() per row)
  const columnDefMap = useMemo(() => {
    const map = new Map<string, any>();
    effectiveSearchableColumns.forEach((col: any) => {
      // `value` is already the resolved identity (accessorKey ?? id).
      if (col.value) {
        map.set(col.value, col);
      }
    });
    return map;
  }, [effectiveSearchableColumns]);

  // Apply column-specific filtering and ranking
  const applyColumnFilter = useCallback(
    (searchValue: string, columnToSearch: string) => {
      if (!searchValue || searchValue.trim() === "") {
        setFilteredData(finalData);
        return;
      }

      const queryInfo = processSearchQuery(searchValue);
      const keywords = queryInfo.tokens;
      // Compact (alphanumeric-only) keyword forms so a spaced/punctuated value
      // still matches: "dmart" ↔ "D Mart", "d-mart" ↔ "d mart", "d_mart" ↔ "d mart".
      const compactKeywords = keywords.map((k: string) => k.replace(/[^a-z0-9]/g, ""));
      // A text matches only when EVERY keyword is found (AND logic) — either as a
      // plain substring, or (space/punctuation-insensitively) in its compacted form.
      const matchesEveryKeyword = (text: string): boolean => {
        const textCompact = text.replace(/[^a-z0-9]/g, "");
        return keywords.every(
          (k: string, i: number) =>
            text.includes(k) ||
            (compactKeywords[i].length > 0 && textCompact.includes(compactKeywords[i])),
        );
      };

      const resultsWithScores = finalData
        .map((row: any) => {
          let score = 0;
          let isMatch = false;

          // Collect all string values for this row to check cross-column matches based on columns
          const rowSearchableValues: any[] = [];
          effectiveSearchableColumns.forEach((col: any) => {
            const val = col.accessorFn ? col.accessorFn(row) : row[col.accessorKey];
            if (val != null) {
              rowSearchableValues.push(val);
            }
          });

          const allRowText = rowSearchableValues
            .filter((v) => typeof v === "string" || typeof v === "number")
            .join(" ")
            .toLowerCase();

          if (columnToSearch === "all" || columnToSearch === "") {
            // Calculate individual field scores (used only for ranking the matches).
            rowSearchableValues.forEach((val) => {
              if (typeof val === "string" || typeof val === "number") {
                score += calculateMatchScore(String(val), queryInfo);
              }
            });

            // A row matches only when EVERY keyword appears somewhere in the row (AND logic).
            // A multi-word query like "d mart" must narrow results, not widen them.
            if (matchesEveryKeyword(allRowText)) {
              score += 50; // High bonus for row-wide AND match
              isMatch = true;
            }
          } else {
            // Use memoized column map for O(1) lookup instead of O(n) .find()
            const colDef = columnDefMap.get(columnToSearch);
            const columnValue = colDef ? (colDef.accessorFn ? colDef.accessorFn(row) : row[colDef.accessorKey]) : row[columnToSearch];

            if (columnValue != null) {
              const valStr = String(columnValue);
              score = calculateMatchScore(valStr, queryInfo);
              // Same AND rule for a single column: every keyword must be present in it.
              isMatch = matchesEveryKeyword(valStr.toLowerCase());
            }
          }

          return { row, score, isMatch };
        })
        .filter((item: any) => item.isMatch);

      // Sort by score descending
      const sortedResults = resultsWithScores
        .sort((a: any, b: any) => b.score - a.score)
        .map((item: any) => item.row);

      setFilteredData(sortedResults);
    },
    [finalData, effectiveSearchableColumns, columnDefMap],
  );

  // Handle column selector change
  const handleSearchColumnChange = useCallback(
    (value: string) => {
      if (!enableColumnSpecificSearch) {
        return;
      }
      setSelectedSearchColumn(value);
      // Re-apply filter with current search value
      applyColumnFilter(globalFilterValue, value);
    },
    [globalFilterValue, applyColumnFilter, enableColumnSpecificSearch],
  );

  // Handle global filter change
  const handleGlobalFilterChange = useCallback((filterValue: string) => {
    setGlobalFilterValue(filterValue);
  }, []);

  // Effect to apply filtering when debounced value or column changes
  useEffect(() => {
    // manualFiltering: the SERVER has already applied this query, so `data` is the
    // result set — filtering it again in the browser can only remove rows the server
    // deliberately matched (it searches fields the table does not render, e.g. email),
    // which looks to the user like search losing results.
    if (enableColumnSpecificSearch && !manualFiltering) {
      applyColumnFilter(debouncedFilterValue, selectedSearchColumn);
    }
  }, [
    debouncedFilterValue,
    selectedSearchColumn,
    applyColumnFilter,
    enableColumnSpecificSearch,
    manualFiltering,
  ]);

  // Hand the debounced query to the page so it can refetch. Debounced, not raw — this
  // fires a network request. Paired with manualFiltering, which stops the local pass.
  useEffect(() => {
    if (!onSearchChange) return;
    onSearchChange(debouncedFilterValue);
  }, [debouncedFilterValue, onSearchChange]);

  // Mobile search toggle function
  const toggleMobileSearch = useCallback(() => {
    if (!enableColumnSpecificSearch) {
      return;
    }
    setIsMobileSearchVisible((prev) => !prev);
  }, [enableColumnSpecificSearch]);


  // Auto-build ExportButton columns from the table's column definitions.
  // Only columns currently visible in the table are exported — a column the
  // user has toggled off (visibility flag explicitly false, same rule as the
  // visible-keys effect above) is excluded, so the file matches the screen.
  const autoExportCols = useMemo(() => {
    const vis = preferences.columnVisibility || {};
    return columns
      .filter((col: any) => {
        const k = colKey(col);
        return k && k !== 'actions' && vis[k] !== false;
      })
      .map((col: any) => ({
        key: colKey(col) as string,
        header: col.header as string,
        type: 'text' as const,
        // accessorFn columns have no raw row[key] to read (id-only ones) or hold a
        // raw id the cell never shows (e.g. projectManagerId → manager names), so
        // export through the same accessor the table renders from.
        ...(col.accessorFn
          ? { format: (_v: any, row: any) => String(col.accessorFn(row) ?? '') }
          : {}),
      }));
  }, [columns, preferences.columnVisibility]);

  // Human-readable title from tableName (e.g. "MonthlySalary" → "Monthly Salary")
  const autoExportTitle = useMemo(
    () => tableName.replace(/([A-Z])/g, ' $1').trim(),
    [tableName],
  );

  const tableTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: globalTheme.palette.mode,
          info: {
            main: "rgb(52, 52, 52)",
          },
          primary: {
            main: "rgb(30, 58, 138)",
          },
          background: {
            default: mode === "light" ? "#fff" : "#000",
          },
          text: {
            primary: mode === "light" ? "#000" : "#fff",
            secondary: mode === "light" ? "#000" : "#fff",
          },
        },
        typography: {
          fontFamily: "Inter",
          button: {
            textTransform: "capitalize",
            fontSize: "0.8rem",
          },
        },
        components: {
          MuiInput: {
            styleOverrides: {
              input: {
                fontSize: 12,
              },
            },
          },
          MuiFormLabel: {
            styleOverrides: {
              root: {
                fontSize: 12,
                color: "#778699",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              elevation2: {
                boxShadow: "8px 8px 16px 0px rgba(0, 0, 0, 0.04)",
                borderRadius: 12,
              },
              elevation8: {
                boxShadow: "8px 8px 16px 0px rgba(0, 0, 0, 0.04);",
                border: "1px #E4E9F0",
                borderRadius: 12,
              },
            },
          },
          MuiSwitch: {
            styleOverrides: {
              switchBase: {
                color: "#e2e2e2",
                "&.Mui-checked": {
                  color: "#1E3A8A",
                },
              },
              track: {
                backgroundColor: "#E1E8F0",
                ".Mui-checked.Mui-checked + &": {
                  backgroundColor: "#1E3A8A",
                },
              },
            },
          },
        },
      }),
    [mode, globalTheme.palette.mode],
  );

  // Memoize the data to use for the table (prevents render-cycle logging)
  // MUST be before any early returns to comply with Rules of Hooks
  const tableData = useMemo(() => {
    const dataToUse = enableColumnSpecificSearch ? filteredData : finalData;
    return dataToUse;
  }, [
    enableColumnSpecificSearch,
    filteredData,
    finalData,
  ]);

  // Identity and resolution live in ./table/rowSelection and are unit-tested there. They
  // are imported rather than inlined so the test covers THIS path: if row identity ever
  // diverged from the getRowId handed to MRT below, the selection would resolve to an
  // empty array and every bulk action would silently no-op.
  const selectedRows = useMemo(
    () => (enableRowSelection ? resolveSelectedRows(tableData, rowSelection) : []),
    [enableRowSelection, rowSelection, tableData],
  );

  // Surface the selection to the page. Gated on the resolved ids, not object identity —
  // tableData gets a fresh reference on every filter/sort pass, which would otherwise
  // re-notify the parent (and re-run its effects) on every keystroke.
  const lastSelectionSigRef = useRef<string>("");
  useEffect(() => {
    if (!onSelectedRowsChange) return;
    const sig = selectionSignature(selectedRows);
    if (sig === lastSelectionSigRef.current) return;
    lastSelectionSigRef.current = sig;
    onSelectedRowsChange(selectedRows);
  }, [selectedRows, onSelectedRowsChange]);

  const activePagination = paginationState || preferences.pagination;
  const pageIndex = activePagination?.pageIndex ?? 0;
  const pageSize = activePagination?.pageSize ?? 50;

  // Column widths fit the rows currently ON SCREEN. Sizing off the whole set would let a
  // long value on page 40 widen a column you're reading on page 1. Server-paginated and
  // unpaginated tables already hold exactly what's rendered.
  const sizedColumns = useMemo(() => {
    const visibleRows =
      manualPagination || paginationDisabled
        ? tableData
        : tableData.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
    return finalColumns.map((col: any) => ({
      ...col,
      size: col.size ?? fitColumnWidth(col, visibleRows),
    }));
  }, [finalColumns, tableData, pageIndex, pageSize, manualPagination, paginationDisabled]);

  const leftPinnedWidth = useMemo(() => {
    if (!enableColumnPinning || isMobile) return 0;
    const leftPinnedKeys = preferences.columnPinning?.left || [];
    return sizedColumns
      .filter((col: any) => leftPinnedKeys.includes(col.accessorKey || col.id || ""))
      .reduce((sum: number, col: any) => sum + (col.size || 150), 0);
  }, [preferences.columnPinning, sizedColumns, enableColumnPinning, isMobile]);

  if (preferencesLoading || !isInitialized) {
    const skel = skeletonPalette(mode);
    return (
      <div
        style={{
          padding: "0",
          borderRadius: "12px",
          overflow: "hidden",
          border: `1px solid ${skel.border}`,
          backgroundColor: skel.surface,
        }}
      >
        {/* Skeleton header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            height: "48px",
            backgroundColor: skel.header,
            borderBottom: `2px solid ${skel.border}`,
            padding: "0 16px",
          }}
        >
          {[22, 16, 18, 14, 20, 12].map((w, i) => (
            <div
              key={i}
              style={{
                flex: `0 0 ${w}%`,
                padding: "0 16px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                className="et-skeleton-pulse"
                style={{
                  height: "12px",
                  width: `${60 + ((i * 13) % 30)}%`,
                  borderRadius: "4px",
                  backgroundColor: skel.bar,
                }}
              />
            </div>
          ))}
        </div>
        {/* Skeleton body rows */}
        {[1, 0.85, 0.7, 0.6, 0.5].map((opacity, rowIdx) => (
          <div
            key={rowIdx}
            style={{
              display: "flex",
              alignItems: "center",
              height: "52px",
              borderBottom: `1px solid ${skel.rowBorder}`,
              opacity,
            }}
          >
            {[22, 16, 18, 14, 20, 12].map((w, colIdx) => (
              <div
                key={colIdx}
                style={{
                  flex: `0 0 ${w}%`,
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <div
                  className="et-skeleton-pulse"
                  style={{
                    height: colIdx === 4 ? "22px" : "13px",
                    width: colIdx === 4 ? "64px" : `${50 + (colIdx * 7) % 40}%`,
                    borderRadius: colIdx === 4 ? "20px" : "4px",
                    backgroundColor: skel.barSoft,
                  }}
                />
              </div>
            ))}
          </div>
        ))}
        {/* Skeleton toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `1px solid ${skel.rowBorder}`,
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            {[80, 52, 70].map((w, i) => (
              <div
                key={i}
                className="et-skeleton-pulse"
                style={{
                  height: "34px",
                  width: `${w}px`,
                  borderRadius: "8px",
                  backgroundColor: skel.barSoft,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {[34, 34, 34, 34, 34, 34, 34].map((_, i) => (
              <div
                key={i}
                className="et-skeleton-pulse"
                style={{
                  height: "34px",
                  width: "34px",
                  borderRadius: "8px",
                  backgroundColor: skel.barSoft,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={tableTheme}>
     <SearchQueryContext.Provider value={debouncedFilterValue}>
      <div className="pt-6 pb-3">
        {/* Mobile Search Section - Full Width */}
        {enableColumnSpecificSearch &&
          isMobile &&
          effectiveSearchableColumns &&
          effectiveSearchableColumns.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              {/* Mobile Search Toggle Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  padding: "8px 16px",
                  borderBottom: "1px solid #F3F4F6",
                }}
              >
                <div
                  onClick={toggleMobileSearch}
                  style={{
                    cursor: "pointer",
                    padding: "10px 16px",
                    borderRadius: "10px",
                    backgroundColor: isMobileSearchVisible ? "#FEF2F2" : "#FAFAFA",
                    border: `1px solid ${isMobileSearchVisible ? "#FECACA" : "#E5E7EB"}`,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    color: isMobileSearchVisible ? "#1E3A8A" : "#6B7280",
                  }}
                >
                  <KTIcon iconName="magnifier" className="fs-5" />
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>
                    {isMobileSearchVisible ? "Hide Search" : "Search Table"}
                  </span>
                  <KTIcon iconName={isMobileSearchVisible ? "up" : "down"} className="fs-6" />
                </div>
              </div>

              {/* Collapsible Full-Width Search Interface */}
              {isMobileSearchVisible && (
                <div
                  style={{
                    backgroundColor: "#FAFAFA",
                    borderRadius: "0 0 12px 12px",
                    padding: "20px",
                    borderLeft: "1px solid #E5E7EB",
                    borderRight: "1px solid #E5E7EB",
                    borderBottom: "1px solid #E5E7EB",
                    marginBottom: "8px",
                  }}
                >
                  {/* Column Selector */}
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6B7280",
                        marginBottom: "8px",
                        display: "block",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Search in Column
                    </label>
                    <div style={{ position: "relative", zIndex: 1001 }}>
                      <SelectInput
                        options={(() => {
                          const columnSelectOptions = [
                            { label: "All Columns", value: "all" },
                            ...effectiveSearchableColumns
                              .filter((col: any) => col.value !== "all")
                              .map((col: any) => ({
                                label: col.label,
                                value: col.value,
                              })),
                          ];
                          return columnSelectOptions;
                        })()}
                        placeholder="Search Column"
                        value={(() => {
                          const columnSelectOptions = [
                            { label: "All Columns", value: "all" },
                            ...effectiveSearchableColumns
                              .filter((col: any) => col.value !== "all")
                              .map((col: any) => ({
                                label: col.label,
                                value: col.value,
                              })),
                          ];
                          return (
                            columnSelectOptions.find(
                              (opt) => opt.value === selectedSearchColumn,
                            ) || { label: "All Columns", value: "all" }
                          );
                        })()}
                        dropdown="search_column_select"
                        passData={handleSearchColumnChange}
                      />
                    </div>
                  </div>

                  {/* Search Input */}
                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#6B7280",
                        marginBottom: "8px",
                        display: "block",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Search Term
                    </label>
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: "11px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "flex",
                          alignItems: "center",
                          pointerEvents: "none",
                          color: "#9CA3AF",
                        }}
                      >
                        <KTIcon iconName="magnifier" className="fs-5" />
                      </span>
                      <input
                        type="text"
                        placeholder={`Search in ${(() => {
                          const columnSelectOptions = [
                            { label: "All Columns", value: "all" },
                            ...effectiveSearchableColumns
                              .filter((col: any) => col.value !== "all")
                              .map((col: any) => ({
                                label: col.label,
                                value: col.value,
                              })),
                          ];
                          return (
                            columnSelectOptions.find(
                              (opt) => opt.value === selectedSearchColumn,
                            )?.label || "All Columns"
                          );
                        })()}…`}
                        value={globalFilterValue}
                        onChange={(e) => handleGlobalFilterChange(e.target.value)}
                        className="et-search-input"
                        style={{
                          width: "100%",
                          paddingLeft: "36px",
                          paddingRight: globalFilterValue ? "36px" : "14px",
                          paddingTop: "11px",
                          paddingBottom: "11px",
                          fontSize: "14px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "10px",
                          outline: "none",
                          backgroundColor: "white",
                          color: "#374151",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                        }}
                      />
                      {globalFilterValue && (
                        <button
                          onClick={() => handleGlobalFilterChange("")}
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: "#D1D5DB",
                            cursor: "pointer",
                            padding: 0,
                            color: "#6B7280",
                            fontSize: "10px",
                            lineHeight: 1,
                          }}
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {globalFilterValue && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "6px",
                        fontSize: "13px",
                        color: "#6B7280",
                        padding: "10px 14px",
                        backgroundColor: "#FEF2F2",
                        borderRadius: "8px",
                        border: "1px solid #FECACA",
                      }}
                    >
                      <span>Found</span>
                      <strong style={{ color: "#1E3A8A", fontSize: "14px" }}>
                        {filteredData.length}
                      </strong>
                      <span>result{filteredData.length !== 1 ? "s" : ""} in</span>
                      <strong style={{ color: "#374151" }}>
                        {(() => {
                          const columnSelectOptions = [
                            { label: "All Columns", value: "all" },
                            ...effectiveSearchableColumns
                              .filter((col: any) => col.value !== "all")
                              .map((col: any) => ({
                                label: col.label,
                                value: col.value,
                              })),
                          ];
                          return (
                            columnSelectOptions.find(
                              (opt) => opt.value === selectedSearchColumn,
                            )?.label || "All Columns"
                          );
                        })()}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* Result count for assistive tech. Filtering and searching change the row set
            with no announcement otherwise — a sighted user sees the table shrink, a
            screen-reader user gets nothing at all. `polite` so it waits for a pause
            rather than interrupting, and it is visually hidden because sighted users
            already have the count in the pagination bar. */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          {isLoading
            ? "Loading results"
            : `${manualPagination ? (rowCount ?? tableData.length) : tableData.length} result${
                (manualPagination ? (rowCount ?? tableData.length) : tableData.length) === 1 ? "" : "s"
              }`}
        </div>

        <MaterialReactTable
          key={`${tableName}-${prefsEmployeeId}-${isInitialized}-${selectedSearchColumn}`}
          getRowId={rowId}
          enableRowSelection={enableRowSelection}
          onRowSelectionChange={setRowSelection}
          renderDetailPanel={renderDetailPanel}
          state={{
            columnVisibility: preferences.columnVisibility,
            columnOrder: preferences.columnOrder,
            columnSizing: preferences.columnSizing,
            columnPinning: preferences.columnPinning,
            sorting: preferences.sorting,
            pagination: paginationState || preferences.pagination,
            density: preferences.density,
            expanded: preferences.expanded,
            globalFilter: enableColumnSpecificSearch ? undefined : debouncedFilterValue,
            isLoading: isLoading,
            showProgressBars: isLoading,
            rowSelection,
          }}
          onColumnVisibilityChange={updateColumnVisibility}
          onColumnOrderChange={updateColumnOrder}
          onColumnSizingChange={updateColumnSizing}
          onColumnPinningChange={updateColumnPinning}
          manualSorting={manualSorting}
          onSortingChange={(updater: any) => {
            // Persist first (unchanged behaviour), then hand the page the
            // resolved value. MRT passes either a value or an updater fn.
            updateSorting(updater);
            if (onSortingChangeProp) {
              const next = typeof updater === "function" ? updater(preferences.sorting) : updater;
              onSortingChangeProp(next ?? []);
            }
          }}
          onPaginationChange={onPaginationChange || updatePagination}
          onDensityChange={updateDensity}
          onExpandedChange={updateExpanded}
          manualPagination={manualPagination}
          rowCount={manualPagination ? rowCount : undefined}
          enablePagination={paginationDisabled ? false : undefined}
          enableColumnDragging={enableColumnDragging ?? true}
          enableColumnResizing={enableColumnResizing ?? false}
          enableColumnPinning={isMobile ? false : (enableColumnPinning ?? true)}
          enableGrouping={enableGrouping ?? true}
          enableSorting={enableSorting ?? true}
          enableExpandAll={enableExpandAll ?? true}
          enableRowVirtualization={enableRowVirtualization}
          enableStickyHeader
          enableStickyFooter={showColumnFooter}
          enableBottomToolbar={enableBottomToolbar ?? true}
          enableTableHead={enableTableHead ?? true}
          enableColumnFilters={enableFilters ?? true}
          enableGlobalFilter={!enableColumnSpecificSearch}
          onGlobalFilterChange={handleGlobalFilterChange}
          globalFilterFn={intelligentSearchFilterFn as any}
          enableColumnActions={enableColumnActions ?? true}
          enableHiding={enableHiding ?? true}
          enableFullScreenToggle={enableFullScreenToggle ?? true}
          // Rebuild the built-in icon strip so a "Reset layout" button can sit
          // beside the column show/hide toggle. Mirrors the default buttons and
          // their enable-flags (density toggle is globally off for this table).
          renderToolbarInternalActions={({ table }) => (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {!enableColumnSpecificSearch && <MRT_ToggleGlobalFilterButton table={table} />}
              {(enableFilters ?? true) && <MRT_ToggleFiltersButton table={table} />}
              {(enableHiding ?? true) && <MRT_ShowHideColumnsButton table={table} />}
              <Tooltip title="Reset columns to default layout">
                <IconButton
                  aria-label="Reset columns to default layout"
                  onClick={() => resetPreferences()}
                >
                  <KTIcon iconName="arrows-circle" className="fs-2" />
                </IconButton>
              </Tooltip>
              {(enableFullScreenToggle ?? true) && <MRT_ToggleFullScreenButton table={table} />}
            </Box>
          )}
          muiTableHeadCellProps={{
            sx: {
              backgroundColor: "#FAFBFC",
              color: "#667085",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.03em",
              textTransform: "uppercase",

              // Padding, not a fixed height: a fixed height clips wrapped headers in grid
              // layout mode, and min-height is ignored on <th> in table layout mode.
              padding: "16px",
              minHeight: "48px",

              borderBottom: "2px solid #EAECF0",
              borderRight: "1px solid #F2F4F7",

              // Header labels wrap onto a second line instead of truncating to "SUB …".
              whiteSpace: "normal",
              verticalAlign: "middle",
              boxSizing: "border-box",
              userSelect: "none",

              "& .Mui-TableHeadCell-Content": {
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                height: "100%",
                minWidth: 0,
                // Containing block for the actions button. Deliberately on this inner
                // div and NOT on the <th> — MRT gives pinned header cells
                // `position: sticky`, and overriding that would unpin them.
                position: "relative",
              },

              "& .Mui-TableHeadCell-Content-Labels": {
                display: "flex",
                alignItems: "center",
                gap: "4px",
                overflow: "visible",
              },

              // MRT floors the label wrapper at `min-width: 4ch` and lets flex shrink it there,
              // which chops "SUB ORGANIZATION" into "SUB / ORGA / NIZATI / ON". Raising the floor
              // to min-content means it wraps on word boundaries and never mid-word.
              "& .Mui-TableHeadCell-Content-Wrapper": {
                minWidth: "min-content",
                overflow: "visible",
                textOverflow: "clip",
                whiteSpace: "normal",
                lineHeight: 1.3,
              },

              "& .MuiTableSortLabel-root": {
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              },

              "&:last-child": {
                borderRight: "none",
              },

              "&:hover": {
                backgroundColor: "#F3F4F6",
                color: "#4B5563",
              },

              // `opacity: 0` hides the column-actions button but it still occupies its
              // full width in EVERY header, permanently narrowing the label. Taking it
              // out of flow means the label gets the whole cell; on hover it fades in
              // over the label's tail rather than shoving the text sideways.
              "& .Mui-TableHeadCell-Content-Actions": {
                position: "absolute",
                right: "4px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0,
                pointerEvents: "none",
                transition: "opacity 0.15s ease",
              },

              "&:hover .Mui-TableHeadCell-Content-Actions": {
                opacity: 1,
                pointerEvents: "auto",
              },

              ...pinnedCellSx(mode),
              "&[data-pinned='true']": {
                zIndex: 3,
              },
              "&:not([data-pinned='true'])": {
                scrollSnapAlign: "start",
              },


              ...muiTableHeadCellStyle,
            },
          }}
          muiTableHeadProps={{
            // MRT hardcodes opacity 0.97 on <thead>; body rows ghost through the sticky header.
            sx: { opacity: 1 },
          }}
          muiTableBodyCellProps={{
            sx: {
              padding: "16px",
              minHeight: "52px",
              fontSize: "13px",
              color: "#374151",
              borderBottom: "1px solid #F3F4F6",
              borderRight: "1px solid #F9FAFB",
              verticalAlign: "middle",
              boxSizing: "border-box",
              // Grid layout mode (column pinning) clips body cells to one nowrap line, which
              // chopped "Shashi Prabhu and Associates" mid-word. Wrap instead of truncating.
              whiteSpace: "normal",
              overflow: "visible",
              textOverflow: "clip",
              overflowWrap: "anywhere",
              transition: "background-color 0.15s ease",
              "&:last-child": {
                borderRight: "none",
              },
              ...pinnedCellSx(mode),
              "&[data-pinned='true']": {
                zIndex: 1,
              },
            },
          }}
          muiTableContainerProps={{
            ref: tableContainerRef,
            ...customMuiTableContainerProps,
            sx: {
              overflowX: "auto",
              // Sticky footer/header only bite inside a height-bounded scroller.
              ...(showColumnFooter ? { maxHeight: "70vh" } : {}),
              scrollSnapType: "x proximity",
              scrollPaddingLeft: `${leftPinnedWidth}px`,

              ...(customMuiTableContainerProps?.sx || {}),
            },
          }}
          layoutMode={layoutMode}
          {...muiTableProps}
          muiTableBodyRowProps={(rowArgs: any) => {
            const { row } = rowArgs;
            // Status-based row color coding — computed here so it ALWAYS applies, even when the
            // caller supplies custom row props (e.g. an onClick). The two are merged below.
            let rowStatus: 'approved' | 'rejected' | 'pending' | null = null;
            if (enableStatusColorCoding) {
              // Accept a numeric `status` (e.g. grouped leave rows use status: 0|1|2) as the status
              // number too — otherwise it stringifies to "1" and never matches the labels below.
              const sn = row.original?.statusNumber ?? (typeof row.original?.status === 'number' ? row.original.status : undefined);
              const statusStr = String(row.original?.status || '').toLowerCase();
              if (sn !== undefined && sn !== null) {
                if (sn === Status.Approved) rowStatus = 'approved';
                else if (sn === Status.Rejected) rowStatus = 'rejected';
                else if (sn === Status.ApprovalNeeded) rowStatus = 'pending';
              } else if (statusStr) {
                if (statusStr === 'approved' || statusStr === 'active') rowStatus = 'approved';
                else if (statusStr === 'rejected' || statusStr === 'declined' || statusStr === 'inactive') rowStatus = 'rejected';
                else if (statusStr === 'pending' || statusStr === 'waiting' || statusStr === 'under review') rowStatus = 'pending';
              }
            }

            const colorMap = {
              approved: { bg: 'rgba(16, 185, 129, 0.04)', border: '#10b981', hover: 'rgba(16, 185, 129, 0.08)' },
              rejected: { bg: 'rgba(239, 68, 68, 0.04)', border: '#ef4444', hover: 'rgba(239, 68, 68, 0.08)' },
              pending: { bg: 'rgba(245, 158, 11, 0.04)', border: '#f59e0b', hover: 'rgba(245, 158, 11, 0.08)' },
            };
            const c = rowStatus ? colorMap[rowStatus] : null;
            const statusSx = {
              backgroundColor: c ? c.bg : undefined,
              '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
              transition: 'background-color 0.12s ease',
              '&:hover td': {
                backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
              },
            };

            // Merge caller-supplied row props (onClick, cursor, etc.) ON TOP of the status styling.
            const custom = muiTableProps?.muiTableBodyRowProps ? (muiTableProps.muiTableBodyRowProps(rowArgs) as any) : {};
            const { sx: customSx, ...customRest } = custom || {};
            // 14 legacy pages force `nowrap + overflow:hidden + ellipsis` on every cell
            // through this same selector, which outranks muiTableBodyCellProps and clipped
            // values like "abdul.tawwab@mcdonaldsindia.com". Re-assert wrapping last while
            // keeping the rest of their cell styling (font, borders, radius).
            const customCellSx = (customSx as any)?.["& .MuiTableCell-root"] || {};
            return {
              ...customRest,
              sx: {
                ...statusSx,
                ...(customSx || {}),
                "& .MuiTableCell-root": {
                  ...customCellSx,
                  whiteSpace: "normal",
                  overflow: "visible",
                  textOverflow: "clip",
                  overflowWrap: "anywhere",
                },
              },
            };
          }}
          renderEmptyRowsFallback={() => (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "56px 24px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "16px",
                  backgroundColor: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <KTIcon iconName="search-list" className="fs-1 text-gray-400" />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
                  No records found
                </p>
                <p style={{ fontSize: "13px", color: "#9CA3AF", margin: 0 }}>
                  Try adjusting your search or filters
                </p>
              </div>
            </div>
          )}
          enableDensityToggle={false}
          initialState={{
            density: "comfortable",
          }}
          data={tableData}
          columns={sizedColumns}
          muiTableFooterProps={{
            sx: showColumnFooter
              ? {
                opacity: 1, // MRT dims sticky footers to 0.97; rows must not bleed through
                "& .MuiTableCell-footer": {
                  ...pinnedCellSx(mode),
                  backgroundColor: "#f8f9fa",
                  color: "#0f172a",
                  fontWeight: 800,
                  borderTop: "2.5px solid #1E3A8A",
                  fontSize: "1rem",
                  letterSpacing: "0.01em",
                  paddingTop: "14px",
                  paddingBottom: "14px",
                },
                "& .MuiTableCell-footer:first-of-type": {
                  borderBottomLeftRadius: "8px",
                },
                "& .MuiTableCell-footer:last-of-type": {
                  borderBottomRightRadius: "8px",
                },
              }
              : {
                display: "none",
              },
          }}
          muiTopToolbarProps={{
            sx: {
              display: `${hideFilters ? "none" : ""}`,
            },
          }}
          renderTopToolbarCustomActions={({ table }) => {
            if (
              !enableColumnSpecificSearch ||
              !effectiveSearchableColumns ||
              effectiveSearchableColumns.length === 0
            ) {
              return null;
            }

            // Mobile view: Search interface is now handled outside, so return null
            if (isMobile) {
              return null;
            }

            // Desktop view: Show both dropdowns normally
            const columnSelectOptions = [
              { label: "All Columns", value: "all" },
              ...effectiveSearchableColumns
                .filter((col: any) => col.value !== "all")
                .map((col: any) => ({
                  label: col.label,
                  value: col.value,
                })),
            ];

            const currentValue = columnSelectOptions.find(
              (opt) => opt.value === selectedSearchColumn,
            );

            return (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  flexWrap: "wrap",
                  position: "relative",
                  zIndex: 1000,
                }}
              >
                {/* Column selector */}
                <Box
                  sx={{
                    minWidth: "150px",
                    maxWidth: "200px",
                    position: "relative",
                    zIndex: 1001,
                  }}
                >
                  <SelectInput
                    options={columnSelectOptions}
                    placeholder="Search Column"
                    value={currentValue}
                    dropdown="search_column_select"
                    passData={handleSearchColumnChange}
                  />
                </Box>

                {/* Search input with icon */}
                <Box sx={{ position: "relative", minWidth: "220px", maxWidth: "320px" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                      color: "#9CA3AF",
                    }}
                  >
                    <KTIcon iconName="magnifier" className="fs-5" />
                  </span>
                  <input
                    type="text"
                    placeholder={`Search in ${currentValue?.label || "All Columns"}…`}
                    value={globalFilterValue}
                    onChange={(e) => handleGlobalFilterChange(e.target.value)}
                    className="et-search-input"
                    style={{
                      width: "100%",
                      paddingLeft: "34px",
                      paddingRight: globalFilterValue ? "32px" : "12px",
                      paddingTop: "8px",
                      paddingBottom: "8px",
                      fontSize: "13px",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      outline: "none",
                      backgroundColor: "#FAFAFA",
                      color: "#374151",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  />
                  {globalFilterValue && (
                    <button
                      onClick={() => handleGlobalFilterChange("")}
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "none",
                        backgroundColor: "#D1D5DB",
                        cursor: "pointer",
                        padding: 0,
                        color: "#6B7280",
                        fontSize: "10px",
                        lineHeight: 1,
                        transition: "background-color 0.15s ease",
                      }}
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </Box>

                {renderTopToolbarRightActions?.()}

                {/* Result count pill */}
                {globalFilterValue && (
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      backgroundColor: "#FEF2F2",
                      border: "1px solid #FECACA",
                    }}
                  >
                    <span style={{ fontSize: "12px", color: "#6B7280" }}>
                      in <strong style={{ color: "#374151" }}>{currentValue?.label || "All Columns"}</strong>
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#1E3A8A",
                      }}
                    >
                      {filteredData.length} result{filteredData.length !== 1 ? "s" : ""}
                    </span>
                  </Box>
                )}
              </Box>
            );
          }}
          muiTablePaperProps={{
            sx: {
              ...muiTablePaperStyle,
            },
          }}
          muiBottomToolbarProps={{
            sx: {
              "& .MuiTablePagination-root": {
                display: "none",
              },
            },
          }}
          renderBottomToolbarCustomActions={({ table }) => {
            // Hide pagination when disabled or when there is no data
            if (!finalData || finalData.length === 0) {
              return null;
            }

            const pageIndex = table.getState().pagination.pageIndex;
            const pageSize = table.getState().pagination.pageSize;
            const totalPages = table.getPageCount();
            const totalRows = manualPagination
              ? rowCount || 0
              : finalData.length;

            const getPageNumbers = () => {
              const pages: number[] = [];
              const maxVisible = isMobile ? 5 : 7; // Show 7 on desktop, 5 on mobile
              const siblingCount = isMobile ? 1 : 2; // Pages on each side of current

              if (totalPages <= maxVisible) {
                // Show all pages if total is small
                for (let i = 0; i < totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(0);

                // Calculate range around current page
                const leftSiblingIndex = Math.max(pageIndex - siblingCount, 1);
                const rightSiblingIndex = Math.min(
                  pageIndex + siblingCount,
                  totalPages - 2,
                );

                const showLeftEllipsis = leftSiblingIndex > 1;
                const showRightEllipsis = rightSiblingIndex < totalPages - 2;

                // Add left ellipsis
                if (showLeftEllipsis) {
                  pages.push(-1);
                }

                // Add pages around current page
                for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
                  pages.push(i);
                }

                // Add right ellipsis
                if (showRightEllipsis) {
                  pages.push(-2);
                }

                // Always show last page
                pages.push(totalPages - 1);
              }

              return pages;
            };

            return (
              <Box sx={{ width: "100%" }}>
                {/* Custom horizontal scrollbar — its own row above the pagination so it
                    never overlaps the footer text (esp. inside narrow modals). Collapsed
                    to display:none by syncThumb when the table doesn't overflow. */}
                {!hideExportCenter && (
                  <div
                    ref={scrollBarWrapRef}
                    style={{
                      display: "none",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      maxWidth: "560px",
                      margin: "8px auto 0",
                      padding: "0 16px",
                      boxSizing: "border-box",
                    }}
                  >
                    {/* Track */}
                    <div
                      ref={scrollTrackRef}
                      onClick={(e) => {
                        const track = scrollTrackRef.current;
                        const el = tableContainerRef.current;
                        if (!track || !el || isDraggingHScroll.current) return;
                        const rect = track.getBoundingClientRect();
                        const ratio = (e.clientX - rect.left) / rect.width;
                        el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
                      }}
                      style={{
                        flex: 1,
                        height: '6px',
                        borderRadius: '99px',
                        backgroundColor: '#d1d5db',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'height 0.18s ease',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.height = '8px'; }}
                      onMouseLeave={e => { if (!isDraggingHScroll.current) (e.currentTarget as HTMLDivElement).style.height = '6px'; }}
                    >
                      {/* Thumb */}
                      <div
                        ref={scrollThumbRef}
                        onPointerDown={onThumbPointerDown}
                        onPointerMove={onThumbPointerMove}
                        onPointerUp={onThumbPointerUp}
                        onPointerCancel={onThumbPointerUp}
                        onMouseEnter={e => {
                          if (!isDraggingHScroll.current) {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#6b7280';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(107,114,128,0.2)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isDraggingHScroll.current) {
                            (e.currentTarget as HTMLDivElement).style.backgroundColor = '#9ca3af';
                            (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          /* left + width intentionally omitted — owned by syncThumb via direct DOM */
                          height: '140%',
                          minWidth: '24px',
                          borderRadius: '99px',
                          backgroundColor: '#9ca3af',
                          cursor: 'grab',
                          transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                          userSelect: 'none',
                          touchAction: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: { xs: "8px", md: "16px" },
                    padding: { xs: "12px", md: "16px" },
                    flexWrap: "wrap",
                    position: "relative",
                  }}
                >
                  {/* Left Side: Export */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: "6px", md: "12px" },
                      flexWrap: { xs: "nowrap", lg: "wrap" },
                      width: { xs: "100%", lg: "auto" },
                    }}
                  >
                    {/* Bulk actions for the current selection. Rendered only while rows are
                        selected, so the toolbar is unchanged for every table that has not
                        opted into selection. */}
                    {enableRowSelection && selectedRows.length > 0 && renderSelectionActions
                      ? renderSelectionActions(selectedRows)
                      : null}

                    {renderExportActions ? (
                      renderExportActions()
                    ) : !hideExportCenter ? (
                      <ExportButton
                        // Export the SELECTION when there is one — "export" after ticking
                        // rows means those rows, not the whole table. Falls back to
                        // everything when nothing is selected, which is the old behaviour.
                        data={selectedRows.length > 0 ? selectedRows : tableData}
                        columns={autoExportCols}
                        filename={tableName}
                        title={autoExportTitle}
                        sheetName={tableName.slice(0, 31)}
                        disabled={tableData.length === 0}
                      />
                    ) : null}

                    {/* Rows per page — hidden when pagination is disabled (all rows shown) */}
                    {!paginationDisabled && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: { xs: "6px", md: "8px" },
                          ml: { xs: 0, lg: 1 },
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#6B7280",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isMobile ? "Rows:" : "Rows per page:"}
                        </span>
                        <ButtonGroup
                          variant="outlined"
                          size="small"
                          sx={{
                            borderRadius: '10px',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          <Button
                            onClick={(e) => setRowsAnchorEl(e.currentTarget)}
                            sx={{
                              textTransform: 'none',
                              fontWeight: 700,
                              fontSize: isMobile ? 12 : 13,
                              borderColor: '#e5e7eb',
                              color: '#374151',
                              borderRadius: '10px 0 0 10px',
                              px: isMobile ? 1 : 1.5,
                              py: 0.6,
                              minWidth: 'unset',
                              '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                            }}
                          >
                            {pageSize}
                          </Button>
                          <Button
                            onClick={(e) => setRowsAnchorEl(e.currentTarget)}
                            sx={{
                              borderColor: '#e5e7eb',
                              color: '#9ca3af',
                              borderRadius: '0 10px 10px 0',
                              px: 0.4,
                              minWidth: 'unset',
                              '&:hover': { borderColor: '#d1d5db', bgcolor: '#f9fafb' },
                            }}
                          >
                            <KTIcon iconName="down" className="fs-6" />
                          </Button>
                        </ButtonGroup>
                        <Menu
                          anchorEl={rowsAnchorEl}
                          open={Boolean(rowsAnchorEl)}
                          onClose={() => setRowsAnchorEl(null)}
                          slotProps={{
                            paper: {
                              elevation: 3,
                              sx: {
                                mt: 0.5,
                                minWidth: 100,
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                overflow: 'hidden',
                                '& .MuiMenuItem-root': {
                                  px: 2,
                                  py: 0.9,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: '#1e293b',
                                  '&:hover': { bgcolor: '#f8fafc' },
                                  '&.Mui-selected': { bgcolor: '#fef2f2', color: '#1E3A8A', '&:hover': { bgcolor: '#fee2e2' } },
                                },
                              },
                            },
                          }}
                          transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                          anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                        >
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <MenuItem
                              key={size}
                              selected={size === pageSize}
                              onClick={() => {
                                table.setPageSize(Number(size) as PageSizeOption);
                                table.setPageIndex(0);
                                setRowsAnchorEl(null);
                              }}
                            >
                              {size}
                            </MenuItem>
                          ))}
                        </Menu>
                        {!isMobile && totalRows > 0 && (
                          <span
                            style={{
                              fontSize: "13px",
                              color: "#9CA3AF",
                              whiteSpace: "nowrap",
                              marginLeft: "4px",
                            }}
                          >
                            {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)}
                            {" "}of{" "}
                            <strong style={{ color: "#374151" }}>{totalRows}</strong>
                          </span>
                        )}
                      </Box>
                    )}
                  </Box>

                  {/* Right: Custom Pagination buttons */}
                  {!hidePagination && (
                    <Box
                      sx={{
                        display: "flex",
                        gap: { xs: "4px", md: "6px" },
                        alignItems: "center",
                        flexWrap: "wrap",
                        justifyContent: { xs: "center", lg: "flex-end" },
                        width: { xs: "100%", lg: "auto" },
                      }}
                    >
                      {/* Page indicator */}
                      {!isMobile && (
                        <span
                          style={{
                            fontSize: "13px",
                            color: "#9CA3AF",
                            marginRight: "4px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Page <strong style={{ color: "#374151" }}>{pageIndex + 1}</strong> of <strong style={{ color: "#374151" }}>{totalPages}</strong>
                        </span>
                      )}

                      {/* First page */}
                      <button
                        onClick={() => table.setPageIndex(0)}
                        disabled={pageIndex === 0}
                        className="et-page-nav-btn"
                        title="First page"
                        aria-label="First page"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: isMobile ? "30px" : "34px",
                          height: isMobile ? "30px" : "34px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          backgroundColor: pageIndex === 0 ? "#F9FAFB" : "#fff",
                          cursor: pageIndex === 0 ? "not-allowed" : "pointer",
                          opacity: pageIndex === 0 ? 0.45 : 1,
                          transition: "all 0.15s ease",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <KTIcon iconName="double-left" className="fs-4 text-gray-600" />
                      </button>

                      {/* Previous page */}
                      <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="et-page-nav-btn"
                        title="Previous page"
                        aria-label="Previous page"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: isMobile ? "30px" : "34px",
                          height: isMobile ? "30px" : "34px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          backgroundColor: !table.getCanPreviousPage() ? "#F9FAFB" : "#fff",
                          cursor: !table.getCanPreviousPage() ? "not-allowed" : "pointer",
                          opacity: !table.getCanPreviousPage() ? 0.45 : 1,
                          transition: "all 0.15s ease",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <KTIcon iconName="black-left" className="fs-4 text-gray-600" />
                      </button>

                      {/* Page number buttons */}
                      {getPageNumbers().map((page, idx) => {
                        if (page < 0) {
                          return (
                            <span
                              key={`ellipsis-${idx}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: isMobile ? "30px" : "34px",
                                height: isMobile ? "30px" : "34px",
                                color: "#9CA3AF",
                                fontSize: "13px",
                                fontWeight: 600,
                                letterSpacing: "0.05em",
                              }}
                            >
                              ···
                            </span>
                          );
                        }

                        const isActive = pageIndex === page;
                        return (
                          <button
                            key={page}
                            onClick={() => table.setPageIndex(page)}
                            className="et-page-num-btn"
                            // The active page is signalled only by colour otherwise —
                            // invisible to a screen reader, and to anyone who cannot
                            // distinguish the navy fill.
                            aria-label={`Page ${page + 1}`}
                            aria-current={isActive ? "page" : undefined}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: isMobile ? "30px" : "34px",
                              height: isMobile ? "30px" : "34px",
                              border: isActive ? "1.5px solid #1E3A8A" : "1px solid #E5E7EB",
                              borderRadius: "8px",
                              backgroundColor: isActive ? "#1E3A8A" : "#fff",
                              color: isActive ? "#fff" : "#374151",
                              cursor: "pointer",
                              fontSize: isMobile ? "12px" : "13px",
                              fontWeight: isActive ? 700 : 500,
                              transition: "all 0.15s ease",
                              padding: 0,
                              flexShrink: 0,
                              boxShadow: isActive ? "0 2px 6px rgba(30, 58, 138,0.30)" : "none",
                            }}
                          >
                            {page + 1}
                          </button>
                        );
                      })}

                      {/* Next page */}
                      <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="et-page-nav-btn"
                        title="Next page"
                        aria-label="Next page"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: isMobile ? "30px" : "34px",
                          height: isMobile ? "30px" : "34px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          backgroundColor: !table.getCanNextPage() ? "#F9FAFB" : "#fff",
                          cursor: !table.getCanNextPage() ? "not-allowed" : "pointer",
                          opacity: !table.getCanNextPage() ? 0.45 : 1,
                          transition: "all 0.15s ease",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <KTIcon iconName="black-right" className="fs-4 text-gray-600" />
                      </button>

                      {/* Last page */}
                      <button
                        onClick={() => table.setPageIndex(totalPages - 1)}
                        disabled={pageIndex === totalPages - 1}
                        className="et-page-nav-btn"
                        title="Last page"
                        aria-label="Last page"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: isMobile ? "30px" : "34px",
                          height: isMobile ? "30px" : "34px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          backgroundColor: pageIndex === totalPages - 1 ? "#F9FAFB" : "#fff",
                          cursor: pageIndex === totalPages - 1 ? "not-allowed" : "pointer",
                          opacity: pageIndex === totalPages - 1 ? 0.45 : 1,
                          transition: "all 0.15s ease",
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <KTIcon iconName="double-right" className="fs-4 text-gray-600" />
                      </button>

                      {/* Page jump input - only on desktop when many pages */}
                      {/* {!isMobile && totalPages > 7 && (
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', ml: 1 }}>
                                                <span style={{ fontSize: '13px', color: '#7A8597' }}>Go to:</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={totalPages}
                                                    defaultValue={pageIndex + 1}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            const page = Number(e.currentTarget.value);
                                                            if (page >= 1 && page <= totalPages) {
                                                                table.setPageIndex(page - 1);
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        width: '50px',
                                                        padding: '6px 8px',
                                                        fontSize: '13px',
                                                        border: '1px solid #E1E8F0',
                                                        borderRadius: '6px',
                                                        textAlign: 'center',
                                                    }}
                                                />
                                            </Box>
                                        )} */}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          }}
          icons={{
            ArrowDownwardIcon: (props: any) => (
              <KTIcon
                iconName={"arrow-down"}
                className="fs-1 text-danger"
                {...props}
              />
            ),
            SortIcon: (props: any) => (
              <KTIcon iconName="arrow-up-down" className="fs-1" {...props} />
            ),
            FilterListIcon: (props: any) => (
              <KTIcon iconName="filter" className="fs-2" {...props} />
            ),
            FullscreenIcon: (props: any) => (
              <KTIcon
                iconName="arrow-two-diagonals"
                className="fs-2"
                {...props}
              />
            ),
            FullscreenExitIcon: (props: any) => (
              <KTIcon iconName="cross" className="fs-2" {...props} />
            ),
            SearchIcon: (props: any) => (
              <KTIcon iconName="magnifier" className="fs-2" {...props} />
            ),
            ViewColumnIcon: (props: any) => (
              <KTIcon iconName="eye" className="fs-2" {...props} />
            ),
            ChevronLeftIcon: (props: any) => (
              <KTIcon iconName="black-left" className="fs-2" {...props} />
            ),
            ChevronRightIcon: (props: any) => (
              <KTIcon iconName="black-right" className="fs-2" {...props} />
            ),
            VisibilityOffIcon: (props: any) => (
              <KTIcon iconName="eye-slash" className="fs-2" {...props} />
            ),
            DragHandleIcon: (props: any) => (
              <KTIcon iconName="sort" className="fs-2" {...props} />
            ),
          }}
        />
      </div>
     </SearchQueryContext.Provider>
    </ThemeProvider>
  );
}

export default MaterialTable;
