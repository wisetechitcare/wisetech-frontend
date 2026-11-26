import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Employee, AdminFolder } from '@models/media';
import { formatJoiningDate } from '@utils/media.utils';
import MediaBreadcrumb from './MediaBreadcrumb';
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { pressableProps } from '@app/modules/common/components/ui/a11y';
import { Folder } from 'lucide-react';

interface EmployeeListProps {
    adminId: string;
    adminName: string;
    adminEmployees: Employee[];
    admins: AdminFolder[];
}

const EmployeeList: React.FC<EmployeeListProps> = ({ adminId, adminName, adminEmployees, admins }) => {
    const navigate = useNavigate();

    const breadcrumbItems = [
        { label: 'Back to All Admins', path: '/company/media' },
        { label: adminName, isActive: true }
    ];

    // Flattened so the table sorts/searches on real values (name string, code,
    // raw joining date) rather than on the rendered JSX.
    const rows = useMemo(
        () => (adminEmployees || []).map((employee) => ({
            ...employee,
            employeeName: `${employee.users?.firstName || ''} ${employee.users?.lastName || ''}`.trim(),
        })),
        [adminEmployees],
    );

    const columns = useMemo<ColumnDef<(typeof rows)[number]>[]>(() => [
        {
            accessorKey: 'employeeName',
            header: 'Employee Name',
            cell: ({ row }) => (
                <>
                    <div data-wt-control="row" {...pressableProps(() => navigate(`/company/media/${adminId}/${row.original.id}`))}
                        className="d-flex align-items-center cursor-pointer"
                        onClick={() => navigate(`/company/media/${adminId}/${row.original.id}`)}
                    >
                        <span className="icon-wrapper me-2 me-sm-3 me-md-4 text-primary">
                            <Folder className="size-6" aria-hidden />
                        </span>
                        <div className="text-gray-800 text-hover-primary fs-7 fs-sm-6 text-break">
                            {row.original.employeeName}
                        </div>
                    </div>
                    {/* Mobile: Show additional info below name */}
                    <div className="d-md-none text-gray-500 fs-8 mt-1 ms-5 ps-2">
                        <span className="d-inline-block me-3">Code: {row.original.employeeCode || '-'}</span>
                        <span className="d-lg-none d-inline-block">Joined: {formatJoiningDate(row.original.dateOfJoining)}</span>
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'employeeCode',
            header: 'Employee Code',
            cell: ({ getValue }) => <span className="fs-7">{(getValue() as string) || '-'}</span>,
        },
        {
            accessorKey: 'dateOfJoining',
            header: 'Joined On',
            cell: ({ getValue }) => <span className="fs-7">{formatJoiningDate(getValue() as string)}</span>,
        },
        {
            id: 'actions',
            header: 'Action',
            enableSorting: false,
            cell: ({ row }) => (
                <Button variant="tinted" size="sm"
                    onClick={() => navigate(`/company/media/${adminId}/${row.original.id}`)}
                >
                    <span className="d-none d-sm-inline">View Documents</span>
                    <span className="d-inline d-sm-none">View</span>
                </Button>
            ),
        },
    ], [adminId, navigate]);

    return (
        <div className="card card-body px-3 px-sm-4 px-lg-9 py-5 py-md-8 m-2 m-sm-3 m-md-5 m-lg-8 shadow-sm">
            {/* Breadcrumb */}
            <MediaBreadcrumb items={breadcrumbItems} showBackButton />

            {/* Table header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 my-2 mb-4">
                <Badge variant="brand" className="h-auto max-w-full whitespace-normal py-1 text-left">
                    Employees Created/Updated by {admins.find((a) => a.id === adminId)?.name || 'Admin'}
                </Badge>
                <Badge id="kt_file_manager_items_counter" variant="brand">
                    {adminEmployees?.length} employees
                </Badge>
            </div>

            {/* Table */}
            {rows.length === 0 ? (
                <div className="text-center py-10">
                    <div className="fs-6">No Employees Found</div>
                </div>
            ) : (
                <DataTable
                    caption="Media Admin Employees"
                    stateKey="MediaAdminEmployees"
                    data={rows}
                    columns={columns}
                    getRowId={(r) => String(r.id)}
                    groupableColumns={false}
                    toolbar={(ctx) => (
                        <DataTableExport columns={columns} ctx={ctx} filename="Media Admin Employees" />
                    )}
                />
            )}
        </div>
    );
};

export default EmployeeList;
