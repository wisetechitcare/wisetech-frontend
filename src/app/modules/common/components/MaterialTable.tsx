import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import ExportButton from "@app/modules/common/components/ExportButton";
import { MaterialReactTable } from "material-react-table";
import {
  Container,
  createTheme,
  Icon,
  ThemeProvider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useThemeMode } from "@metronic/partials";
import { Box } from "@mui/material";
import Papa from "papaparse";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { KTIcon, PAGE_SIZE_OPTIONS, PageSizeOption } from "@metronic/helpers";
import SelectInput from "@app/modules/common/inputs/SelectInput";
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission, Status } from "@constants/statistics";
import useTablePreferences from "@hooks/useTablePreferences";
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

interface MaterialTableProps {
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
}

const defaultColumnSizes = {
  size: 150,
  minSize: 80,
  maxSize: 1000,
};

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
}: MaterialTableProps) {
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
      columns.map((col: any) => ({
        ...defaultColumnSizes,
        ...col, // custom column values will override defaults
        Cell: (cellProps: any) => {
          const content = col.Cell
            ? col.Cell(cellProps)
            : cellProps.cell.getValue();

          const highlight = (text: any) => {
            if (typeof text === "string" && globalFilterValue) {
              return <HighlightMatch text={text} query={globalFilterValue} />;
            }
            return text;
          };

          if (typeof content === "string") return highlight(content);

          // If it's a simple React element with a string child, try to highlight it
          if (
            React.isValidElement(content) &&
            content.props &&
            typeof (content.props as any).children === "string"
          ) {
            return React.cloneElement(
              content as React.ReactElement,
              {
                children: highlight((content.props as any).children),
              } as any,
            );
          }

          return content;
        },
      })),
    [columns, defaultColumnSizes, globalFilterValue],
  );

  const isMobile = useMediaQuery("(max-width:600px)");
  const globalTheme = useTheme();

  // Memoize finalData to prevent infinite re-renders
  const finalData = useMemo(() => {
    let processedData: any = [];
    let dataExtractedWithEmployeeId = data.filter(
      (v: any) => v.employeeId != null,
    );
    let dataExtractedWithoutEmployeeId = data.filter(
      (v: any) => v.employeeId == null,
    );

    if (resource) {
      if (viewOthers) {
        let newData = dataExtractedWithEmployeeId.filter((val: any) => {
          return hasPermission(
            resource,
            permissionConstToUseWithHasPermission.readOthers,
            val,
          );
        });
        processedData = [...processedData, ...newData];
      } else if (viewOwn) {
        let newData = dataExtractedWithEmployeeId.filter((val: any) => {
          return hasPermission(
            resource,
            permissionConstToUseWithHasPermission.readOwn,
            val,
          );
        });
        processedData = [...processedData, ...newData];
      }
      if (checkOwnWithOthers) {
        let newData = dataExtractedWithEmployeeId.filter((val: any) => {
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

  // Auto-generate searchable columns from columns prop (only when search is enabled)
  const autoGeneratedSearchableColumns = useMemo(() => {
    if (!enableColumnSpecificSearch) {
      return []; // Return empty array when feature is disabled
    }

    const excludedColumns = ["avatar", "actions"]; // Columns to exclude from search

    return columns
      .filter(
        (col: any) =>
          col.accessorKey &&
          !excludedColumns.includes(col.accessorKey) &&
          col.header, // Must have a header to display
      )
      .map((col: any) => ({
        value: col.accessorKey,
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
    updateExportType,
    resetPreferences,
  } = useTablePreferences(tableName, finalColumns, employeeId, defaultSorting);

  const [exportTypeSelected, setExportTypeSelected] = useState<string | null>(
    null,
  );
  const [isExportInitialized, setIsExportInitialized] = useState(false);

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

  useEffect(() => {
    if (isInitialized && !isExportInitialized) {
      setExportTypeSelected(preferences.exportType || null);
      setIsExportInitialized(true);
    }
  }, [isInitialized, preferences.exportType, isExportInitialized]);

  const handleExportChange = useCallback(
    (value: string) => {
      setExportTypeSelected(value);
      updateExportType(value);
    },
    [updateExportType],
  );

  // Apply column-specific filtering and ranking
  const applyColumnFilter = useCallback(
    (searchValue: string, columnToSearch: string) => {
      if (!searchValue || searchValue.trim() === "") {
        setFilteredData(finalData);
        return;
      }

      const queryInfo = processSearchQuery(searchValue);
      const searchTerm = queryInfo.normalized;
      const keywords = queryInfo.tokens;

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

          if (columnToSearch === "all") {
            // Calculate individual field scores
            rowSearchableValues.forEach((val) => {
              if (typeof val === "string" || typeof val === "number") {
                score += calculateMatchScore(String(val), queryInfo);
              }
            });

            // Require either a decent score (>0) OR all keywords matching row-wide for it to be a match
            // This prevents single characters like 'a' from returning 6000 results if score threshold is adjusted.
            // Also, AND logic across the row is preferred.
            if (keywords.every((k) => allRowText.includes(k))) {
              score += 50; // High bonus for row-wide AND match
              isMatch = true;
            } else if (score >= 10) { 
               // Require at least 10 score to be considered a match to filter out noise
               isMatch = true;
            }
          } else {
            const colDef = effectiveSearchableColumns.find((c: any) => c.accessorKey === columnToSearch);
            const columnValue = colDef ? (colDef.accessorFn ? colDef.accessorFn(row) : row[colDef.accessorKey]) : row[columnToSearch];
            
            if (columnValue != null) {
              const valStr = String(columnValue);
              score = calculateMatchScore(valStr, queryInfo);
              isMatch =
                score >= 10 ||
                keywords.every((k) => valStr.toLowerCase().includes(k));
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
    [finalData, effectiveSearchableColumns],
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
    if (enableColumnSpecificSearch) {
      applyColumnFilter(debouncedFilterValue, selectedSearchColumn);
    }
  }, [
    debouncedFilterValue,
    selectedSearchColumn,
    applyColumnFilter,
    enableColumnSpecificSearch,
  ]);

  // Mobile search toggle function
  const toggleMobileSearch = useCallback(() => {
    if (!enableColumnSpecificSearch) {
      return;
    }
    setIsMobileSearchVisible((prev) => !prev);
  }, [enableColumnSpecificSearch]);

  // Memoize pagination change handler to prevent infinite loops
  const handlePaginationChange = useCallback(
    (updaterOrValue: any) => {
      if (manualPagination && onPaginationChange) {
        // For manual pagination, call parent's handler
        onPaginationChange(updaterOrValue);
      }
      // For client-side pagination, DON'T save to preferences to avoid infinite loops
      // MaterialTable will manage pagination state internally via its own state
    },
    [manualPagination, onPaginationChange],
  );

  const scrollLeft = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft -= 1200;
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft += 1200;
    }
  }, []);

  const exportOptions = useMemo(
    () => [
      { label: "CSV", value: "csv" },
      { label: "Excel", value: "excel" },
    ],
    [],
  );

  // Auto-build ExportButton columns from the table's column definitions
  const autoExportCols = useMemo(() =>
    columns
      .filter((col: any) => col.accessorKey && col.accessorKey !== 'actions')
      .map((col: any) => ({
        key: col.accessorKey as string,
        header: col.header as string,
        type: 'text' as const,
      })),
    [columns],
  );

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
            main: "rgb(170, 57, 61)",
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
                  color: "#AA393D",
                },
              },
              track: {
                backgroundColor: "#E1E8F0",
                ".Mui-checked.Mui-checked + &": {
                  backgroundColor: "#AA393D",
                },
              },
            },
          },
        },
      }),
    [mode, globalTheme.palette.mode],
  );

  const exportToCSV = useCallback(() => {
    const csv = Papa.unparse(finalData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `${tableName}.csv`);
  }, [finalData, tableName]);

  const exportToExcel = useCallback(() => {
    const worksheet = XLSX.utils.json_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(blob, `${tableName}.xlsx`);
  }, [finalData, tableName]);

  const exportTable = useCallback(() => {
    switch (exportTypeSelected) {
      case "csv":
        exportToCSV();
        break;
      case "excel":
        exportToExcel();
        break;
      default:
        alert("Please select a type");
        break;
    }
  }, [exportTypeSelected, exportToCSV, exportToExcel]);

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

  if (preferencesLoading || !isInitialized) {
    return (
      <div
        style={{
          padding: "0",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #EAECF0",
          backgroundColor: "#fff",
        }}
      >
        {/* Skeleton header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0",
            height: "48px",
            backgroundColor: "#FAFBFC",
            borderBottom: "2px solid #EAECF0",
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
                  width: `${60 + Math.random() * 30}%`,
                  borderRadius: "4px",
                  backgroundColor: "#E5E7EB",
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
              borderBottom: "1px solid #F3F4F6",
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
                    backgroundColor: "#F3F4F6",
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
            borderTop: "1px solid #F3F4F6",
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
                  backgroundColor: "#F3F4F6",
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
                  backgroundColor: "#F3F4F6",
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
                    color: isMobileSearchVisible ? "#AA393D" : "#6B7280",
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
                      <strong style={{ color: "#AA393D", fontSize: "14px" }}>
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

        <MaterialReactTable
          key={`${tableName}-${employeeId}-${isInitialized}-${selectedSearchColumn}`}
          getRowId={(row: any, index: number) => row.id ? String(row.id) : String(index)}
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
          }}
          onColumnVisibilityChange={updateColumnVisibility}
          onColumnOrderChange={updateColumnOrder}
          onColumnSizingChange={updateColumnSizing}
          onColumnPinningChange={updateColumnPinning}
          onSortingChange={updateSorting}
          onPaginationChange={onPaginationChange || updatePagination}
          onDensityChange={updateDensity}
          onExpandedChange={updateExpanded}
          manualPagination={manualPagination}
          rowCount={manualPagination ? rowCount : undefined}
          enableColumnDragging={enableColumnDragging ?? true}
          enableColumnResizing={enableColumnResizing ?? false}
          enableColumnPinning={isMobile ? false : (enableColumnPinning ?? true)}
          enableGrouping={enableGrouping ?? true}
          enableSorting={enableSorting ?? true}
          enableExpandAll={enableExpandAll ?? true}
          enableRowVirtualization={enableRowVirtualization}
          enableStickyHeader
          enableBottomToolbar={enableBottomToolbar ?? true}
          enableTableHead={enableTableHead ?? true}
          enableColumnFilters={enableFilters ?? true}
          enableGlobalFilter={!enableColumnSpecificSearch}
          onGlobalFilterChange={handleGlobalFilterChange}
          globalFilterFn={intelligentSearchFilterFn as any}
          enableColumnActions={enableColumnActions ?? true}
          enableHiding={enableHiding ?? true}
          enableFullScreenToggle={enableFullScreenToggle ?? true}
          muiTableHeadCellProps={{
            sx: {
              backgroundColor: "#FAFBFC",
              color: "#667085",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.03em",
              textTransform: "uppercase",

              padding: "0 16px",
              height: "48px",

              borderBottom: "2px solid #EAECF0",
              borderRight: "1px solid #F2F4F7",

              whiteSpace: "nowrap",
              verticalAlign: "middle",
              boxSizing: "border-box",
              userSelect: "none",

              "& .Mui-TableHeadCell-Content": {
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                height: "100%",
              },

              "& .Mui-TableHeadCell-Content-Labels": {
                display: "flex",
                alignItems: "center",
                gap: "4px",
                overflow: "hidden",
              },

              "& .Mui-TableHeadCell-Content-Wrapper": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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

              "& .Mui-TableHeadCell-Content-Actions": {
                opacity: 0,
                transition: "opacity 0.15s ease",
              },

              "&:hover .Mui-TableHeadCell-Content-Actions": {
                opacity: 1,
              },

              ...muiTableHeadCellStyle,
            },
          }}
          muiTableBodyCellProps={{
            sx: {
              padding: "0 16px",
              height: "52px",
              fontSize: "13px",
              color: "#374151",
              borderBottom: "1px solid #F3F4F6",
              borderRight: "1px solid #F9FAFB",
              verticalAlign: "middle",
              boxSizing: "border-box",
              transition: "background-color 0.15s ease",
              "&:last-child": {
                borderRight: "none",
              },
            },
          }}
          muiTableContainerProps={{
            ref: tableContainerRef,
            ...customMuiTableContainerProps,
            sx: {
              overflowX: "auto",
              ...(customMuiTableContainerProps?.sx || {}),
            },
          }}
          layoutMode={layoutMode}
          {...muiTableProps}
          muiTableBodyRowProps={
            muiTableProps?.muiTableBodyRowProps
              ? muiTableProps.muiTableBodyRowProps
              : ({ row }: any) => {
                  // Status-based row color coding
                  let rowStatus: 'approved' | 'rejected' | 'pending' | null = null;
                  if (enableStatusColorCoding) {
                    const sn = row.original?.statusNumber;
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
                    pending:  { bg: 'rgba(245, 158, 11, 0.04)', border: '#f59e0b', hover: 'rgba(245, 158, 11, 0.08)' },
                  };
                  const c = rowStatus ? colorMap[rowStatus] : null;

                  return {
                    sx: {
                      backgroundColor: c ? c.bg : undefined,
                      '& td:first-of-type': c ? { borderLeft: `4px solid ${c.border} !important` } : {},
                      transition: 'background-color 0.12s ease',
                      '&:hover td': {
                        backgroundColor: c ? `${c.hover} !important` : '#F8FAFC',
                      },
                    },
                  };
                }
          }
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
          columns={finalColumns}
          muiTableFooterProps={{
            sx: showColumnFooter
              ? {
                  "& .MuiTableCell-footer": {
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                    fontWeight: 700,
                    borderTop: "2px solid #e2e8f0",
                    fontSize: "0.8rem",
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
                        color: "#AA393D",
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
                    {renderExportActions ? (
                      renderExportActions()
                    ) : !hideExportCenter ? (
                      <ExportButton
                        data={tableData}
                        columns={autoExportCols}
                        filename={tableName}
                        title={autoExportTitle}
                        sheetName={tableName.slice(0, 31)}
                        disabled={tableData.length === 0}
                      />
                    ) : null}

                    {/* Rows per page */}
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
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          table.setPageSize(
                            Number(e.target.value) as PageSizeOption,
                          );
                          table.setPageIndex(0);
                        }}
                        style={{
                          padding: isMobile ? "4px 8px" : "5px 10px",
                          fontSize: "13px",
                          border: "1px solid #E5E7EB",
                          borderRadius: "8px",
                          cursor: "pointer",
                          backgroundColor: "#fff",
                          color: "#374151",
                          fontWeight: 500,
                          appearance: "auto",
                          outline: "none",
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
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
                  </Box>

                  {/* Center: Scroll arrows */}
                  {!hideExportCenter && (
                    <Box
                      sx={{
                        display: { xs: "none", lg: "flex" },
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        position: "absolute",
                        left: "40%",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <div
                        className="p-2 cursor-pointer hover-bg-light rounded"
                        onClick={scrollLeft}
                      >
                        <KTIcon iconName="black-left" className="fs-1" />
                      </div>
                      <div
                        className="p-2 cursor-pointer hover-bg-light rounded"
                        onClick={scrollRight}
                      >
                        <KTIcon iconName="black-right" className="fs-1" />
                      </div>
                    </Box>
                  )}

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
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: isMobile ? "30px" : "34px",
                              height: isMobile ? "30px" : "34px",
                              border: isActive ? "1.5px solid #AA393D" : "1px solid #E5E7EB",
                              borderRadius: "8px",
                              backgroundColor: isActive ? "#AA393D" : "#fff",
                              color: isActive ? "#fff" : "#374151",
                              cursor: "pointer",
                              fontSize: isMobile ? "12px" : "13px",
                              fontWeight: isActive ? 700 : 500,
                              transition: "all 0.15s ease",
                              padding: 0,
                              flexShrink: 0,
                              boxShadow: isActive ? "0 2px 6px rgba(170,57,61,0.30)" : "none",
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
    </ThemeProvider>
  );
}

export default MaterialTable;
