import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@redux/store';
import { AdminFolder } from '@models/media';
import Loader from '@app/modules/common/utils/Loader';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import MaterialTable from '@app/modules/common/components/MaterialTable';

interface AdminFolderListProps {
  admins: AdminFolder[];
}

const AdminFolderList: React.FC<AdminFolderListProps> = ({ admins }) => {
  const navigate = useNavigate();
  const currentUserId = useSelector((s: RootState) => s.auth?.currentUser?.id);

  // `employeeCount` stays a number on the row so the column sorts numerically;
  // the cells below render exactly what the hand-written <table> rendered.
  const columns = useMemo(() => [
    {
      accessorKey: 'name',
      header: 'Admin Name',
      Cell: ({ row }: any) => (
        <div className="cursor-pointer text-break" onClick={() => navigate(`/company/media/${row.original.id}`)}>
          <div className="d-flex align-items-center">
            <AppIcon name="folder" className="fs-2x fs-sm-2x text-primary me-2 me-sm-3" />
            <div className="fw-bold text-gray-800 text-hover-primary fs-7 fs-sm-6">
              {row.original.name}
            </div>
          </div>
          {/* Mobile: Show employee count below name */}
          <div className="d-md-none text-gray-500 fs-8 mt-1 ms-5 ps-2">
            {row.original.employeeCount} employees
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'employeeCount',
      header: 'Employees Created/Updated',
      Cell: ({ cell }: any) => <span className="text-nowrap">{cell.getValue()} employees</span>,
    },
    {
      accessorKey: 'actions',
      header: 'Action',
      Cell: ({ row }: any) => (
        <button
          className="btn btn-sm btn-light-primary fs-8 fs-sm-7 px-2 px-sm-3"
          onClick={() => navigate(`/company/media/${row.original.id}`)}
        >
          <span className="d-none d-sm-inline">Open Folder</span>
          <span className="d-inline d-sm-none">Open</span>
        </button>
      ),
    },
  ], [navigate]);

  if (!admins) return <Loader />;

  return (
    <div className="card card-body px-3 px-sm-4 px-lg-9 py-5 py-md-8 m-2 m-sm-3 m-md-5 m-lg-8 shadow-sm">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-4 gap-3">
        <h4 className="fw-bold text-gray-800 mb-0 fs-5 fs-md-4">Admin Folders</h4>
        <span className="badge bg-light-primary fs-7 fs-sm-6 px-3 py-2">
          Total: {admins?.length || 0}
        </span>
      </div>

      {/* Empty State */}
      {admins?.length === 0 ? (
        <div className="text-center py-10">
          <Loader />
          <div className="text-gray-500 mt-3 fs-6">
            No Admin Folders Found
          </div>
        </div>
      ) : (
        <MaterialTable
          tableName="AdminFolders"
          employeeId={currentUserId}
          data={admins}
          columns={columns}
          hidePagination
          hideExportCenter
          enableColumnActions={false}
        />
      )}
    </div>
  );
};

export default AdminFolderList;
