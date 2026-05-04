/**
 * DataTable — Standardized table component with consistent styling across HRMS.
 * 
 * Features:
 * - Consistent column alignment (text-left for labels, text-center for status)
 * - Fixed padding (px-4 py-2) for all cells
 * - Status-based row background colors
 * - Hover effects for better UX
 * - Proper border and spacing
 * 
 * Design System Compliance:
 * - Follows ERPNext / Keka / Spine HRMS standards
 * - 8px grid spacing system
 * - Consistent visual hierarchy
 * 
 * Usage:
 *   <DataTable
 *     columns={columns}
 *     data={data}
 *     statusColorMap={statusColorMap}
 *   />
 */

import { MRT_ColumnDef, MaterialReactTable, useMaterialReactTable } from 'material-react-table';
import { useMemo } from 'react';

interface DataTableProps<TData extends Record<string, any>> {
    columns: MRT_ColumnDef<TData>[];
    data: TData[];
    tableName?: string;
    /** Map of status values to colors for row background */
    statusColorMap?: Record<string, string>;
    /** Enable alternating row colors */
    alternatingRows?: boolean;
    /** Enable row hover effect */
    enableHover?: boolean;
    /** Custom row height */
    rowHeight?: string;
}

const DataTable = <TData extends Record<string, any>>({
    columns,
    data,
    tableName = 'Table',
    statusColorMap = {},
    alternatingRows = false,
    enableHover = true,
    rowHeight = 'auto',
}: DataTableProps<TData>) => {
    const tableColumns = useMemo<MRT_ColumnDef<TData>[]>(() => columns, [columns]);

    const table = useMaterialReactTable({
        columns: tableColumns,
        data,
        enableColumnOrdering: true,
        enableSorting: true,
        enablePagination: true,
        enableDensityToggle: false,
        enableColumnResizing: true,
        columnResizeMode: 'onChange',
        muiTableBodyRowProps: ({ row }) => {
            // Determine row background color based on status
            const status = row.original?.status as string | undefined;
            const backgroundColor = status && statusColorMap[status] 
                ? `${statusColorMap[status]}15` // 15 = ~8% opacity for subtle background
                : alternatingRows && row.index % 2 === 0 
                    ? '#f9fafb' 
                    : '#ffffff';

            return {
                sx: {
                    backgroundColor,
                    '&:hover': enableHover ? { backgroundColor: `${backgroundColor}dd` } : {},
                    minHeight: rowHeight,
                    transition: 'background-color 0.15s ease-in-out',
                },
            };
        },
        muiTableHeadCellProps: {
            sx: {
                backgroundColor: '#f8fafc',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                borderRight: '1px solid #e2e8f0',
                '&:last-child': {
                    borderRight: 'none',
                },
            },
        },
        muiTableBodyCellProps: {
            sx: {
                padding: '12px 16px', // Consistent px-4 py-2 equivalent
                fontSize: '13px',
                color: '#334155',
                borderRight: '1px solid #f1f5f9',
                '&:last-child': {
                    borderRight: 'none',
                },
                verticalAlign: 'middle',
            },
        },
        muiTableContainerProps: {
            sx: {
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
            },
        },
        muiTableProps: {
            sx: {
                '& .MuiTable-root': {
                    borderCollapse: 'separate',
                    borderSpacing: '0',
                },
            },
        },
    });

    return <MaterialReactTable table={table} />;
};

export default DataTable;
