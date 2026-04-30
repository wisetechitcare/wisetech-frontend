import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { MaterialReactTable } from "material-react-table";
import { Container, createTheme, Icon, ThemeProvider, useMediaQuery, useTheme } from '@mui/material';
import { useThemeMode } from "@metronic/partials";
import { Box } from '@mui/material';
import Papa from 'papaparse';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {KTIcon, PAGE_SIZE_OPTIONS, PageSizeOption} from "@metronic/helpers"
import SelectInput from "@app/modules/common/inputs/SelectInput"
import { hasPermission } from "@utils/authAbac";
import { permissionConstToUseWithHasPermission } from "@constants/statistics";
import useTablePreferences from "@hooks/useTablePreferences";

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
    muiTableBodyRowProps?: (row: any) => object;
  };
    enableBottomToolbar?:boolean;
    muiTableHeadCellStyle?:object;
    muiTablePaperStyle?:object;
    enableTableHead?:boolean;
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
layoutMode?: 'grid' | 'grid-no-grow' | 'semantic';
muiTableContainerProps?: any;
}

const defaultColumnSizes = {
    size: 100,
    minSize: 100,
    maxSize: 150,
};

function MaterialTable({
    data,
    columns,
    hideFilters,
    hideExportCenter,
    hidePagination,
    tableName,
    muiTableProps,
    enableBottomToolbar=true,
    muiTableHeadCellStyle={},
    muiTablePaperStyle={},
    enableTableHead=true,
    resource="",
    viewOwn=false,
    viewOthers=false,
    checkOwnWithOthers=false,
    employeeId ,
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
    enableColumnSpecificSearch = false,
    manualPagination = false,
    rowCount,
    onPaginationChange,
    paginationState,
    isLoading = false,
    layoutMode = 'semantic',
    muiTableContainerProps: customMuiTableContainerProps,
}: MaterialTableProps) {    
    // Apply default sizing if not set
    const finalColumns = useMemo(() => 
        columns.map((col: any) => ({
            ...defaultColumnSizes,
            ...col, // custom column values will override defaults
        }))
    , [columns, defaultColumnSizes]);
    
    const isMobile = useMediaQuery("(max-width:600px)");
    const globalTheme = useTheme();
    
    // Memoize finalData to prevent infinite re-renders
    const finalData = useMemo(() => {
        let processedData: any = [];
        let dataExtractedWithEmployeeId = data.filter((v: any) => v.employeeId != null);
        let dataExtractedWithoutEmployeeId = data.filter((v: any) => v.employeeId == null);
        
        if(resource){
            if(viewOthers){
                let newData = dataExtractedWithEmployeeId.filter((val: any) => {
                    return hasPermission(resource, permissionConstToUseWithHasPermission.readOthers, val)
                })
                processedData = [...processedData, ...newData];
            }
            else if(viewOwn){
                let newData = dataExtractedWithEmployeeId.filter((val: any) => {
                    return hasPermission(resource, permissionConstToUseWithHasPermission.readOwn, val)
                })
                processedData = [...processedData, ...newData];
            } 
            if(checkOwnWithOthers){
                let newData = dataExtractedWithEmployeeId.filter((val: any) => {
                    return hasPermission(resource, permissionConstToUseWithHasPermission.readOwn, val)
                })
                processedData = [...processedData, ...newData];
            }
            processedData = [...processedData, ...dataExtractedWithoutEmployeeId];
        }else{
            processedData = data;
        }
        
        return processedData;
    }, [data, resource, viewOthers, viewOwn, checkOwnWithOthers]);
    
    const mode = 'light'
    const tableContainerRef = useRef<HTMLDivElement>(null);
    
    // Auto-generate searchable columns from columns prop (only when search is enabled)
    const autoGeneratedSearchableColumns = useMemo(() => {
        if (!enableColumnSpecificSearch) {
            return []; // Return empty array when feature is disabled
        }
        
        const excludedColumns = ['avatar', 'actions']; // Columns to exclude from search
        
        return finalColumns
            .filter((col: any) => 
                col.accessorKey && 
                !excludedColumns.includes(col.accessorKey) &&
                col.header // Must have a header to display
            )
            .map((col: any) => ({
                value: col.accessorKey,
                label: col.header,
                accessorKey: col.accessorKey
            }));
    }, [finalColumns, enableColumnSpecificSearch]);
    
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
        resetPreferences
    } = useTablePreferences(tableName, finalColumns, employeeId);
    
    const [exportTypeSelected, setExportTypeSelected] = useState<string | null>(null);
    const [isExportInitialized, setIsExportInitialized] = useState(false);
    
    // Column-specific search state (only when enabled)
    const [selectedSearchColumn, setSelectedSearchColumn] = useState<string>(enableColumnSpecificSearch ? 'all' : '');
    const [globalFilterValue, setGlobalFilterValue] = useState<string>(enableColumnSpecificSearch ? '' : '');
    const [filteredData, setFilteredData] = useState<any[]>(enableColumnSpecificSearch ? [] : []);
    const [isMobileSearchVisible, setIsMobileSearchVisible] = useState<boolean>(false);
    
    // Mobile detection
    const theme = useTheme();
    
    // Initialize filteredData (only when search is enabled and finalData changes)
    useEffect(() => {
        if (enableColumnSpecificSearch) {
            setFilteredData(finalData);
        }
    }, [finalData, enableColumnSpecificSearch]);
    
    // Initialize selectedSearchColumn (separate effect)
    useEffect(() => {
        if (enableColumnSpecificSearch && effectiveSearchableColumns && effectiveSearchableColumns.length > 0) {
            // Set to 'all' if not already set
            if (!selectedSearchColumn || selectedSearchColumn === '') {
                setSelectedSearchColumn('all');
            }
        }
    }, [enableColumnSpecificSearch, effectiveSearchableColumns, selectedSearchColumn]);
    
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
    
    const handleExportChange = useCallback((value: string) => {
        setExportTypeSelected(value);
        updateExportType(value);
    }, [updateExportType]);

    // Apply column-specific filtering (defined first to avoid dependency issues)
    const applyColumnFilter = useCallback((searchValue: string, columnToSearch: string) => {
        if (!enableColumnSpecificSearch) {
            return;
        }
        
        if (!searchValue || searchValue.trim() === '') {
            setFilteredData(finalData);
            return;
        }

        const searchTerm = searchValue.toLowerCase().trim();
        
        const filtered = finalData.filter((row: any) => {
            if (columnToSearch === 'all') {
                // Search across all columns
                if (enableColumnSpecificSearch) {
                    console.log("Rows:: ", row);
                }
                
                return Object.values(row).some((value: any) => {
                    if (value == null) return false;
                    // improve this later to oly check for the values for the searchable columsn and not completely...
                    return String(value).toLowerCase().includes(searchTerm);
                });
            } else {
                // Search in specific column only
                const columnValue = row[columnToSearch];
                if (columnValue == null) return false;
                return String(columnValue).toLowerCase().includes(searchTerm);
            }
        });

        setFilteredData(filtered);
    }, [finalData, enableColumnSpecificSearch]);

    // Handle column selector change
    const handleSearchColumnChange = useCallback((value: string) => {
        
        if (!enableColumnSpecificSearch) {
            return;
        }
        setSelectedSearchColumn(value);
        // Re-apply filter with current search value
        applyColumnFilter(globalFilterValue, value);
    }, [globalFilterValue, applyColumnFilter, enableColumnSpecificSearch]);

    // Handle global filter change
    const handleGlobalFilterChange = useCallback((filterValue: string) => {
        if (!enableColumnSpecificSearch) {
            return;
        }
        setGlobalFilterValue(filterValue);
        applyColumnFilter(filterValue, selectedSearchColumn);
    }, [selectedSearchColumn, applyColumnFilter, enableColumnSpecificSearch]);

    // Mobile search toggle function
    const toggleMobileSearch = useCallback(() => {
        if (!enableColumnSpecificSearch) {
            return;
        }
        setIsMobileSearchVisible(prev => !prev);
    }, [enableColumnSpecificSearch]);

    // Memoize pagination change handler to prevent infinite loops
    const handlePaginationChange = useCallback((updaterOrValue: any) => {
        if (manualPagination && onPaginationChange) {
            // For manual pagination, call parent's handler
            onPaginationChange(updaterOrValue);
        }
        // For client-side pagination, DON'T save to preferences to avoid infinite loops
        // MaterialTable will manage pagination state internally via its own state
    }, [manualPagination, onPaginationChange]);
    
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
    
    const exportOptions = useMemo(() => [
        { label: "CSV", value: "csv" },
        { label: "Excel", value: "excel" },
    ], []);
    
    const tableTheme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode: globalTheme.palette.mode,
                    info: {
                        main: 'rgb(52, 52, 52)',
                    },
                    primary: {
                        main: 'rgb(170, 57, 61)',
                    },
                    background: {
                        default: mode === 'light' ? '#fff' : '#000',
                    },
                    text: {
                        primary: mode === 'light' ? '#000' : '#fff',
                        secondary: mode === 'light' ? '#000' : '#fff',
                    },
                },
                typography: {
                    fontFamily: "Inter",
                    button: {
                        textTransform: 'capitalize',
                        fontSize: '0.8rem',
                    },
                },
                components: {
                    MuiInput:{
                        styleOverrides:{
                            input: {
                                fontSize: 12
                            }
                        }
                    },
                    MuiFormLabel:{
                        styleOverrides:{
                            root: {
                                fontSize:12,
                                color: "#778699"
                            }
                        }
                    },
                    MuiPaper: {
                        styleOverrides:{
                            elevation2:{
                                boxShadow: "8px 8px 16px 0px rgba(0, 0, 0, 0.04)",
                                borderRadius:12
                            },
                            elevation8:{
                                boxShadow: "8px 8px 16px 0px rgba(0, 0, 0, 0.04);",
                                border: "1px #E4E9F0",
                                borderRadius:12
                            }
                         }
                    },
                    MuiSwitch: {
                        styleOverrides: {
                            switchBase: {
                                color: "#e2e2e2",
                                "&.Mui-checked": {
                                    color: "#AA393D"
                                }
                            },
                            track: {
                                backgroundColor: '#E1E8F0',
                                ".Mui-checked.Mui-checked + &": {
                                    backgroundColor: "#AA393D"
                                }
                            }
                        },
                    },
                },
            }),
        [mode, globalTheme.palette.mode],
    );
    
    const exportToCSV = useCallback(() => {
        const csv = Papa.unparse(finalData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${tableName}.csv`);
    }, [finalData, tableName]);
    
    const exportToExcel = useCallback(() => {
        const worksheet = XLSX.utils.json_to_sheet(finalData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
        saveAs(blob, `${tableName}.xlsx`);
    }, [finalData, tableName]);
    
    const exportTable = useCallback(() => {
        switch (exportTypeSelected) {
            case 'csv':
                exportToCSV()
                break;
            case 'excel':
                exportToExcel()
                break;
            default:
                alert('Please select a type');
                break;
        }
    }, [exportTypeSelected, exportToCSV, exportToExcel]);
    
    // Memoize the data to use for the table (prevents render-cycle logging)
    // MUST be before any early returns to comply with Rules of Hooks
    const tableData = useMemo(() => {
        const dataToUse = enableColumnSpecificSearch ? filteredData : finalData;
        return dataToUse;
    }, [enableColumnSpecificSearch, filteredData, finalData, selectedSearchColumn, globalFilterValue]);
    
    if (preferencesLoading) {
        return (
            <div className="my-4 w-100 px-0 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }
    
    if (!isInitialized) {
        return <div>Initializing table preferences...</div>;
    }
    
    return (
        <ThemeProvider theme={tableTheme}>
            <div className="pt-6 pb-3">
                {/* Mobile Search Section - Full Width */}
                {enableColumnSpecificSearch && isMobile && effectiveSearchableColumns && effectiveSearchableColumns.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        {/* Mobile Search Toggle Button */}
                        <div style={{ 
                            display: 'flex',
                            justifyContent: 'flex-start',
                            padding: '8px 16px',
                            borderBottom: '1px solid #E1E8F0'
                        }}>
                            <div
                                onClick={toggleMobileSearch}
                                style={{
                                    cursor: 'pointer',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: isMobileSearchVisible ? '#f0f0f0' : 'transparent',
                                    border: '1px solid #E1E8F0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <KTIcon iconName='magnifier' className='fs-4' />
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                                    {isMobileSearchVisible ? 'Hide Search' : 'Search Table'}
                                </span>
                            </div>
                        </div>
                        
                        {/* Collapsible Full-Width Search Interface */}
                        {isMobileSearchVisible && (
                            <div style={{
                                backgroundColor: '#f9f9f9',
                                borderRadius: '0 0 8px 8px',
                                padding: '20px',
                                borderLeft: '1px solid #E1E8F0',
                                borderRight: '1px solid #E1E8F0',
                                borderBottom: '1px solid #E1E8F0',
                                marginBottom: '8px'
                            }}>
                                {/* Column Selector */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#7A8597',
                                        marginBottom: '8px',
                                        display: 'block'
                                    }}>
                                        Search in Column:
                                    </label>
                                    <div style={{ position: 'relative', zIndex: 1001 }}>
                                        <SelectInput
                                            options={(() => {
                                                const columnSelectOptions = [
                                                    { label: 'All Columns', value: 'all' },
                                                    ...effectiveSearchableColumns.filter((col:any) => col.value !== 'all').map((col:any) => ({
                                                        label: col.label,
                                                        value: col.value
                                                    }))
                                                ];
                                                return columnSelectOptions;
                                            })()}
                                            placeholder="Search Column"
                                            value={(() => {
                                                const columnSelectOptions = [
                                                    { label: 'All Columns', value: 'all' },
                                                    ...effectiveSearchableColumns.filter((col:any) => col.value !== 'all').map((col:any) => ({
                                                        label: col.label,
                                                        value: col.value
                                                    }))
                                                ];
                                                return columnSelectOptions.find(opt => opt.value === selectedSearchColumn) || { label: 'All Columns', value: 'all' };
                                            })()}
                                            dropdown="search_column_select"
                                            passData={handleSearchColumnChange}
                                            
                                        />
                                    </div>
                                </div>
                                
                                {/* Search Input */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        color: '#7A8597',
                                        marginBottom: '8px',
                                        display: 'block'
                                    }}>
                                        Search Term:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={`Search in ${(() => {
                                            const columnSelectOptions = [
                                                { label: 'All Columns', value: 'all' },
                                                ...effectiveSearchableColumns.filter((col:any) => col.value !== 'all').map((col:any) => ({
                                                    label: col.label,
                                                    value: col.value
                                                }))
                                            ];
                                            return columnSelectOptions.find(opt => opt.value === selectedSearchColumn)?.label || 'All Columns';
                                        })()}...`}
                                        value={globalFilterValue}
                                        onChange={(e) => handleGlobalFilterChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            border: '1px solid #E1E8F0',
                                            borderRadius: '8px',
                                            outline: 'none',
                                            backgroundColor: 'white',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}
                                    />
                                </div>
                                
                                {/* Status indicator */}
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    fontSize: '13px',
                                    color: '#7A8597',
                                    padding: '12px 16px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #E1E8F0'
                                }}>
                                    {/* <div> */}
                                    <span>Searching in: </span>
                                    <strong style={{ color: '#333' }}>
                                        {(() => {
                                            const columnSelectOptions = [
                                                { label: 'All Columns', value: 'all' },
                                                ...effectiveSearchableColumns.filter((col:any) => col.value !== 'all').map((col:any) => ({
                                                    label: col.label,
                                                    value: col.value
                                                }))
                                            ];
                                            return columnSelectOptions.find(opt => opt.value === selectedSearchColumn)?.label || 'All Columns';
                                        })()}
                                    </strong>
                                    {/* </div> */}
                                    {globalFilterValue && (
                                        <div>
                                            <span> • Found: </span>
                                            <strong style={{ color: '#AA393D' }}>{filteredData.length} results</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                <MaterialReactTable
                    key={`${tableName}-${employeeId}-${isInitialized}-${selectedSearchColumn}`}
                    state={{
                        columnVisibility: preferences.columnVisibility,
                        columnOrder: preferences.columnOrder,
                        columnSizing: preferences.columnSizing,
                        columnPinning: preferences.columnPinning,
                        sorting: preferences.sorting,
                        pagination: paginationState || preferences.pagination,
                        density: preferences.density,
                        expanded: preferences.expanded,
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
                    enableRowVirtualization
                    enableStickyHeader
                    enableBottomToolbar={enableBottomToolbar ?? true}
                    enableTableHead={enableTableHead ?? true}
                    enableColumnFilters={enableFilters ?? true}
                    enableGlobalFilter={enableColumnSpecificSearch ? false : (enableFilters ?? true)}
                    enableColumnActions={enableColumnActions ?? true}
                    enableHiding={enableHiding ?? true}
                    enableFullScreenToggle={enableFullScreenToggle ?? true}
                    muiTableHeadCellProps={{
                        sx:{
                            fontWeight: 500,
                            color: '#7A8597',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: 'auto',
                            minWidth: 'fit-content',
                            maxWidth: '300px',
                            ...muiTableHeadCellStyle,
                        },
                    }}
                    muiTableContainerProps={{
                        ref: tableContainerRef,
                        ...customMuiTableContainerProps,
                        sx: {
                            overflowX: 'auto',
                            ...(customMuiTableContainerProps?.sx || {}),
                        }
                    }}
                    layoutMode={layoutMode}
                    {...muiTableProps}
                    muiTableBodyRowProps={muiTableProps?.muiTableBodyRowProps || {}}
                    enableDensityToggle={false}
                    initialState={{
                        density:"comfortable"
                    }}
                    data={tableData}
                    columns={finalColumns}
                    muiTableFooterProps={{
                        sx:{
                            display:'none',
                        }
                    }}
                    muiTopToolbarProps={{
                        sx: {
                            display: `${hideFilters ? 'none': ''}`,
                        },
                    }}
                    renderTopToolbarCustomActions={({ table }) => {
                        if (!enableColumnSpecificSearch || !effectiveSearchableColumns || effectiveSearchableColumns.length === 0) {
                            return null;
                        }

                        // Mobile view: Search interface is now handled outside, so return null
                        if (isMobile) {
                            return null;
                        }

                        // Desktop view: Show both dropdowns normally
                        const columnSelectOptions = [
                            { label: 'All Columns', value: 'all' },
                            ...effectiveSearchableColumns.filter((col:any) => col.value !== 'all').map((col:any) => ({
                                label: col.label,
                                value: col.value
                            }))
                        ];

                        const currentValue = columnSelectOptions.find(opt => opt.value === selectedSearchColumn);

                        return (
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 2,
                                padding: '8px 16px',
                                flexWrap: 'wrap',
                                position: 'relative',
                                zIndex: 1000
                            }}>
                                <Box sx={{ 
                                    minWidth: '150px',
                                    position: 'relative',
                                    zIndex: 1001
                                }}>
                                    <SelectInput
                                        options={columnSelectOptions}
                                        placeholder="Search Column"
                                        value={currentValue}
                                        dropdown="search_column_select"
                                        passData={handleSearchColumnChange}
                                    />
                                </Box>
                                <Box sx={{ minWidth: '200px' }}>
                                    <input
                                        type="text"
                                        placeholder={`Search in ${currentValue?.label || 'All Columns'}...`}
                                        value={globalFilterValue}
                                        onChange={(e) => handleGlobalFilterChange(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            border: '1px solid #E1E8F0',
                                            borderRadius: '6px',
                                            outline: 'none'
                                        }}
                                    />
                                </Box>
                                <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    fontSize: '14px',
                                    color: '#7A8597'
                                }}>
                                    <span>Searching in: </span>
                                    <strong>{currentValue?.label || 'All Columns'}</strong>
                                    {globalFilterValue && (
                                        <span> • {filteredData.length} results</span>
                                    )}
                                </Box>
                            </Box>
                        );
                    }}
                    muiTablePaperProps={{
                        sx: {
                            ...muiTablePaperStyle
                        },
                    }}
                    muiBottomToolbarProps={{
                        sx: {
                            '& .MuiTablePagination-root': {
                                display: 'none',
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
                        const totalRows = manualPagination ? (rowCount || 0) : finalData.length;

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
                                const rightSiblingIndex = Math.min(pageIndex + siblingCount, totalPages - 2);

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
                            <Box sx={{ width: '100%' }}>
                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: { xs: '8px', md: '16px' },
                                    padding: { xs: '12px', md: '16px' },
                                    flexWrap: 'wrap',
                                    position: 'relative'
                                }}>
                                    {/* Left Side: Export */}
                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: { xs: '6px', md: '12px' },
                                        flexWrap: { xs: 'nowrap', lg: 'wrap' },
                                        width: { xs: '100%', lg: 'auto' },
                                    }}>
                                        {!hideExportCenter && (
                                            <>
                                                <Box sx={{ minWidth: { xs: '100px', sm: 'auto' }, flex: { xs: '0 0 auto', sm: '0 1 auto' } }}>
                                                    <SelectInput
                                                        options={exportOptions}
                                                        placeholder="Select Export File"
                                                        value={
                                                            exportTypeSelected
                                                              ? exportOptions.find((opt) => opt.value === exportTypeSelected)
                                                              : null
                                                          }
                                                        dropdown="export_select"
                                                        passData={handleExportChange}
                                                    />
                                                </Box>
                                                <button
                                                    className="btn btn-sm btn-outline"
                                                    disabled={!exportTypeSelected}
                                                    onClick={exportTable}
                                                    style={{
                                                        whiteSpace: 'nowrap',
                                                        padding: isMobile ? '8px' : '8px',
                                                        fontSize: isMobile ? '12px' : '14px'
                                                    }}
                                                >
                                                    Export
                                                </button>
                                            </>
                                        )}

                                        {/* Rows per page */}
                                        <Box sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: { xs: '4px', md: '8px' },
                                            ml: { xs: 0, lg: 1 },
                                            flexShrink: 0
                                        }}>
                                            <span style={{
                                                fontSize: isMobile ? '11px' : '13px',
                                                fontWeight: 400,
                                                color: '#1a1a1a',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {isMobile ? 'Rows:' : 'Rows per page:'}
                                            </span>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => {
                                                    table.setPageSize(Number(e.target.value) as PageSizeOption)
                                                    table.setPageIndex(0)
                                                }}
                                                style={{
                                                    padding: isMobile ? '4px 8px' : '5px 10px',
                                                    fontSize: isMobile ? '11px' : '13px',
                                                    border: '1px solid #E1E8F0',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    backgroundColor: '#fff',
                                                }}
                                            >
                                                {PAGE_SIZE_OPTIONS.map((size) => (
                                                    <option key={size} value={size}>{size}</option>
                                                ))}
                                            </select>
                                            {!isMobile && totalRows > 0 && (
                                                <span style={{
                                                    fontSize: '13px',
                                                    color: '#7A8597',
                                                    whiteSpace: 'nowrap',
                                                    marginLeft: '8px',
                                                }}>
                                                    {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, totalRows)} of {totalRows}
                                                </span>
                                            )}
                                        </Box>
                                    </Box>

                                    {/* Center: Scroll arrows */}
                                    {!hideExportCenter && (
                                        <Box sx={{
                                            display: { xs: 'none', lg: 'flex' },
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            gap: '8px',
                                            position: 'absolute',
                                            left: '40%',
                                            transform: 'translateX(-50%)'
                                        }}>
                                            <div className="p-2 cursor-pointer hover-bg-light rounded" onClick={scrollLeft}>
                                                <KTIcon iconName="black-left" className='fs-1' />
                                            </div>
                                            <div className="p-2 cursor-pointer hover-bg-light rounded" onClick={scrollRight}>
                                                <KTIcon iconName="black-right" className='fs-1' />
                                            </div>
                                        </Box>
                                    )}

                                    {/* Right: Custom Pagination buttons */}
                                    {!hidePagination && (
                                    <Box sx={{
                                        display: 'flex',
                                        gap: { xs: '4px', md: '6px' },
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        justifyContent: { xs: 'center', lg: 'flex-end' },
                                        width: { xs: '100%', lg: 'auto' }
                                    }}>
                                        {/* Page indicator */}
                                        {!isMobile && (
                                            <span style={{
                                                fontSize: '13px',
                                                color: '#7A8597',
                                                marginRight: '8px',
                                                fontWeight: 500
                                            }}>
                                                Page {pageIndex + 1} of {totalPages}
                                            </span>
                                        )}

                                        <button
                                            onClick={() => table.setPageIndex(0)}
                                            disabled={pageIndex === 0}
                                            className="pagination-btn"
                                            style={{
                                                padding: isMobile ? '6px 10px' : '8px 16px',
                                                border: '1px solid #E1E8F0',
                                                borderRadius: '6px',
                                                backgroundColor: pageIndex === 0 ? '#f5f5f5' : '#fff',
                                                cursor: pageIndex === 0 ? 'not-allowed' : 'pointer',
                                                opacity: pageIndex === 0 ? 0.6 : 1,
                                                fontSize: isMobile ? '12px' : '14px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {isMobile ? '⏮' : '⏮'}
                                        </button>

                                        <button
                                            onClick={() => table.previousPage()}
                                            disabled={!table.getCanPreviousPage()}
                                            className="pagination-btn"
                                            style={{
                                                padding: isMobile ? '6px 10px' : '8px 16px',
                                                border: '1px solid #E1E8F0',
                                                borderRadius: '6px',
                                                backgroundColor: !table.getCanPreviousPage() ? '#f5f5f5' : '#fff',
                                                cursor: !table.getCanPreviousPage() ? 'not-allowed' : 'pointer',
                                                opacity: !table.getCanPreviousPage() ? 0.6 : 1,
                                                fontSize: isMobile ? '12px' : '14px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {isMobile ? '◀' : '◀'}
                                        </button>

                                        {getPageNumbers().map((page, idx) => {
                                            if (page < 0) {
                                                return <span key={`ellipsis-${idx}`} style={{
                                                    padding: '0 8px',
                                                    color: '#7A8597',
                                                    fontSize: isMobile ? '14px' : '16px',
                                                    fontWeight: 600
                                                }}>...</span>;
                                            }

                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => table.setPageIndex(page)}
                                                    className="pagination-btn"
                                                    style={{
                                                        padding: isMobile ? '6px 10px' : '8px 16px',
                                                        border: '1px solid #E1E8F0',
                                                        borderRadius: '6px',
                                                        backgroundColor: pageIndex === page ? '#AA393D' : '#fff',
                                                        color: pageIndex === page ? '#fff' : '#000',
                                                        cursor: 'pointer',
                                                        fontSize: isMobile ? '12px' : '14px',
                                                        fontWeight: pageIndex === page ? 600 : 500,
                                                        minWidth: isMobile ? '32px' : '40px',
                                                    }}
                                                >
                                                    {page + 1}
                                                </button>
                                            );
                                        })}

                                        <button
                                            onClick={() => table.nextPage()}
                                            disabled={!table.getCanNextPage()}
                                            className="pagination-btn"
                                            style={{
                                                padding: isMobile ? '6px 10px' : '8px 16px',
                                                border: '1px solid #E1E8F0',
                                                borderRadius: '6px',
                                                backgroundColor: !table.getCanNextPage() ? '#f5f5f5' : '#fff',
                                                cursor: !table.getCanNextPage() ? 'not-allowed' : 'pointer',
                                                opacity: !table.getCanNextPage() ? 0.6 : 1,
                                                fontSize: isMobile ? '12px' : '14px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {isMobile ? '▶' : '▶'}
                                        </button>

                                        <button
                                            onClick={() => table.setPageIndex(totalPages - 1)}
                                            disabled={pageIndex === totalPages - 1}
                                            className="pagination-btn"
                                            style={{
                                                padding: isMobile ? '6px 10px' : '8px 16px',
                                                border: '1px solid #E1E8F0',
                                                borderRadius: '6px',
                                                backgroundColor: pageIndex === totalPages - 1 ? '#f5f5f5' : '#fff',
                                                cursor: pageIndex === totalPages - 1 ? 'not-allowed' : 'pointer',
                                                opacity: pageIndex === totalPages - 1 ? 0.6 : 1,
                                                fontSize: isMobile ? '12px' : '14px',
                                                fontWeight: 500,
                                            }}
                                        >
                                            {isMobile ? '⏭' : '⏭'}
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
                        ArrowDownwardIcon: (props:any) => <KTIcon iconName={'arrow-down'} className='fs-1 text-danger' {...props}/>,
                        SortIcon: (props:any) => (<KTIcon iconName="arrow-up-down"  className='fs-1' {...props}/>),
                        FilterListIcon: (props:any) => (<KTIcon iconName="filter"  className='fs-2' {...props}/>),
                        FullscreenIcon: (props:any) => (<KTIcon iconName="arrow-two-diagonals"  className='fs-2' {...props}/>),
                        FullscreenExitIcon: (props:any) => (<KTIcon iconName="cross"  className='fs-2' {...props}/>),
                        SearchIcon: (props:any) => (<KTIcon iconName="magnifier"  className='fs-2' {...props}/>),
                        ViewColumnIcon: (props:any) => (<KTIcon iconName="eye"  className='fs-2' {...props}/>),
                        ChevronLeftIcon: (props:any) => (<KTIcon iconName="black-left"  className='fs-2' {...props}/>),
                        ChevronRightIcon: (props:any) => (<KTIcon iconName="black-right"  className='fs-2' {...props}/>),
                        VisibilityOffIcon: (props:any) => (<KTIcon iconName="eye-slash"  className='fs-2' {...props}/>),
                        DragHandleIcon: (props:any) => (<KTIcon iconName="sort"  className='fs-2' {...props}/>),
                    }}
                />
            </div>
        </ThemeProvider>
    );
}

export default MaterialTable;