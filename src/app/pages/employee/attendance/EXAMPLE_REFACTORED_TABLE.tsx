/**
 * REFACTORING EXAMPLE: Attendance Table with New Design System
 * 
 * This file demonstrates how to refactor existing attendance tables
 * to use the new standardized design system.
 * 
 * BEFORE: ❌
 * - White table rows
 * - Inconsistent badge styles (outline)
 * - Inline styles
 * - Misaligned columns
 * 
 * AFTER: ✅
 * - Status-based row backgrounds
 * - Unified filled badge style
 * - Design tokens
 * - Perfect alignment
 */

import MaterialTable from "@app/modules/common/components/MaterialTable";
import AttendanceStatusBadge from "@app/modules/common/components/AttendanceStatusBadge";
import { getStatusColor, getStatusBackground } from "@app/utils/status-colors";
import { MRT_ColumnDef } from "material-react-table";
import { useMemo } from "react";

// Sample data type
interface AttendanceRecord {
    id: string;
    employeeCode: string;
    employeeName: string;
    status: string;
    checkIn: string;
    checkOut: string;
    duration: string;
    workingMethod: string;
}

interface AttendanceTableProps {
    data: AttendanceRecord[];
}

/**
 * Refactored Attendance Table Component
 * 
 * Key improvements:
 * 1. Status-based row backgrounds (15% opacity)
 * 2. Unified badge component with filled style
 * 3. Consistent column alignment
 * 4. Proper cell padding (12px 16px)
 * 5. Hover effects
 * 6. Design tokens for colors
 */
export const AttendanceTable: React.FC<AttendanceTableProps> = ({ data }) => {
    // Define columns with proper alignment
    const columns = useMemo<MRT_ColumnDef<AttendanceRecord>[]>(() => [
        {
            accessorKey: "employeeCode",
            header: "ID",
            size: 120,
            // Left aligned by default
        },
        {
            accessorKey: "employeeName",
            header: "Name",
            size: 200,
            // Left aligned by default
        },
        {
            accessorKey: "status",
            header: "Status",
            size: 150,
            // Center aligned for badges
            Cell: ({ row }) => {
                const status = row.original.status;
                const color = getStatusColor(status);
                return (
                    <AttendanceStatusBadge 
                        status={status} 
                        color={color} 
                    />
                );
            },
        },
        {
            accessorKey: "checkIn",
            header: "Check-In",
            size: 130,
            // Left aligned for times
        },
        {
            accessorKey: "checkOut",
            header: "Check-Out",
            size: 130,
        },
        {
            accessorKey: "duration",
            header: "Duration",
            size: 100,
        },
        {
            accessorKey: "workingMethod",
            header: "Work Type",
            size: 120,
            Cell: ({ row }) => {
                const workType = row.original.workingMethod;
                const color = getStatusColor(workType);
                return (
                    <AttendanceStatusBadge 
                        status={workType} 
                        color={color} 
                    />
                );
            },
        },
    ], []);

    return (
        <MaterialTable
            columns={columns}
            data={data}
            tableName="Daily Attendance"
            muiTableProps={{
                // ROW STYLING - Status-based backgrounds
                muiTableBodyRowProps: ({ row }) => {
                    const status = row.original.status;
                    const bgColor = getStatusColor(status);
                    const backgroundColor = getStatusBackground(status);
                    
                    return {
                        sx: {
                            // Status-based background (15% opacity)
                            backgroundColor,
                            
                            // Left border accent (4px solid color)
                            borderLeft: `4px solid ${bgColor}`,
                            
                            // Hover effect (25% opacity)
                            '&:hover': { 
                                backgroundColor: getStatusBackground(status, 0.25),
                                transition: 'background-color 0.15s ease-in-out',
                            },
                            
                            // Consistent cell padding and alignment
                            '& .MuiTableCell-root': {
                                padding: '12px 16px',
                                verticalAlign: 'middle',
                                textAlign: 'left',
                                fontSize: '13px',
                                color: '#334155',
                                borderRight: '1px solid #f1f5f9',
                                '&:last-child': {
                                    borderRight: 'none',
                                },
                            },
                            
                            // Center align status column (3rd column)
                            '& .MuiTableCell-root:nth-child(3)': {
                                textAlign: 'center',
                            },
                        },
                    };
                },
            }}
            muiTableHeadCellStyle={{
                backgroundColor: '#f8fafc',
                fontWeight: 700,
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                padding: '12px 16px',
                borderRight: '1px solid #e2e8f0',
                '&:last-child': {
                    borderRight: 'none',
                },
            }}
            muiTableContainerProps={{
                sx: {
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                },
            }}
        />
    );
};

export default AttendanceTable;

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * How to use in your page component:
 * 
 * import AttendanceTable from './AttendanceTable';
 * 
 * const MyAttendancePage = () => {
 *     const [attendanceData, setAttendanceData] = useState([]);
 *     
 *     // Fetch data...
 *     
 *     return (
 *         <div>
 *             <h1>Daily Attendance Report</h1>
 *             <AttendanceTable data={attendanceData} />
 *         </div>
 *     );
 * };
 */

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

/**
 * When migrating existing tables, ensure:
 * 
 * [x] 1. Replace inline badge styles with AttendanceStatusBadge
 * [x] 2. Add status-based row backgrounds
 * [x] 3. Set consistent cell padding (12px 16px)
 * [x] 4. Center align status columns
 * [x] 5. Add hover effects
 * [x] 6. Use getStatusColor() for color consistency
 * [x] 7. Remove hardcoded colors
 * [x] 8. Add left border accent (4px)
 * [x] 9. Ensure proper contrast
 * [x] 10. Test on mobile/tablet
 */

// ============================================================================
// COLOR REFERENCE
// ============================================================================

/**
 * Standardized status colors:
 * 
 * Present:          #28a745 (Green)
 * Absent:           #dc3545 (Red)
 * Weekend:          #6c757d (Gray)
 * Working Weekend:  #6610f2 (Purple)
 * Annual Leaves:    #2ECC71 (Green)
 * Sick Leaves:      #E74C3C (Red)
 * Casual Leaves:    #3498DB (Blue)
 * Maternal Leaves:  #9B59B6 (Purple)
 * Floater Leaves:   #F39C12 (Orange)
 * Unpaid Leaves:    #95A5A6 (Gray)
 * 
 * Row backgrounds use 15% opacity of these colors.
 */
