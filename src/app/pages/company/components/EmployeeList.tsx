import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { Employee, AdminFolder } from '@models/media';
import { formatJoiningDate } from '@utils/media.utils';
import MediaBreadcrumb from './MediaBreadcrumb';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import MaterialTable from '@app/modules/common/components/MaterialTable';

interface EmployeeListProps {
    adminId: string;
    adminName: string;
    adminEmployees: Employee[];
    admins: AdminFolder[];
}

const EmployeeList: React.FC<EmployeeListProps> = ({ adminId, adminName, adminEmployees, admins }) => {
    const navigate = useNavigate();
    const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);

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

    const columns = useMemo(() => [
        {
            accessorKey: 'employeeName',
            header: 'Employee Name',
            Cell: ({ row }: any) => (
                <>
                    <div
                        className="d-flex align-items-center cursor-pointer"
                        onClick={() => navigate(`/company/media/${adminId}/${row.original.id}`)}
                    >
                        <span className="icon-wrapper">
                            <AppIcon name="folder" className="fs-2x text-primary me-2 me-sm-3 me-md-4" />
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
            Cell: ({ cell }: any) => <span className="fs-7">{cell.getValue() || '-'}</span>,
        },
        {
            accessorKey: 'dateOfJoining',
            header: 'Joined On',
            Cell: ({ cell }: any) => <span className="fs-7">{formatJoiningDate(cell.getValue())}</span>,
        },
        {
            accessorKey: 'actions',
            header: 'Action',
            Cell: ({ row }: any) => (
                <button
                    className="btn btn-sm btn-light-primary fs-8 fs-sm-7 px-2 px-sm-3"
                    onClick={() => navigate(`/company/media/${adminId}/${row.original.id}`)}
                >
                    <span className="d-none d-sm-inline">View Documents</span>
                    <span className="d-inline d-sm-none">View</span>
                </button>
            ),
        },
    ], [adminId, navigate]);

    return (
        <div className="card card-body px-3 px-sm-4 px-lg-9 py-5 py-md-8 m-2 m-sm-3 m-md-5 m-lg-8 shadow-sm">
            {/* Breadcrumb */}
            <MediaBreadcrumb items={breadcrumbItems} showBackButton />

            {/* Table header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 my-2 mb-4">
                <div className="badge badge-lg badge-light-primary fs-8 fs-sm-7">
                    <div className="d-flex align-items-center flex-wrap p-1 px-2">
                        <div className="text-break">Employees Created/Updated by {admins.find((a) => a.id === adminId)?.name || 'Admin'}</div>
                    </div>
                </div>
                <div className="badge badge-lg badge-primary fs-8 fs-sm-7">
                    <span id="kt_file_manager_items_counter" className="px-2">{adminEmployees?.length} employees</span>
                </div>
            </div>

            {/* Table */}
            {rows.length === 0 ? (
                <div className="text-center py-10">
                    <div className="fs-6">No Employees Found</div>
                </div>
            ) : (
                <MaterialTable
                    tableName="MediaAdminEmployees"
                    employeeId={currentUserId}
                    data={rows}
                    columns={columns}
                />
            )}
        </div>
    );
};

export default EmployeeList;
