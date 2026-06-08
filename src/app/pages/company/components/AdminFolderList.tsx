import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminFolder } from '@models/media';
import Loader from '@app/modules/common/utils/Loader';

interface AdminFolderListProps {
  admins: AdminFolder[];
}

const AdminFolderList: React.FC<AdminFolderListProps> = ({ admins }) => {
  const navigate = useNavigate();

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

      {/* Responsive Table */}
      <div className="table-responsive">
        <table className="table align-middle table-row-dashed fs-6 gy-5 mb-0">
          <thead>
            <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
              <th className="min-w-200px min-w-sm-250px ps-2">Admin Name</th>
              <th className="min-w-125px min-w-sm-150px d-none d-md-table-cell">Employees Created/Updated</th>
              <th className="text-end min-w-100px min-w-sm-125px pe-2">Action</th>
            </tr>
          </thead>

          <tbody className="fw-semibold text-gray-600">
            {/* Empty State */}
            {admins?.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-10">
                  <Loader />
                  <div className="text-gray-500 mt-3 fs-6">
                    No Admin Folders Found
                  </div>
                </td>
              </tr>
            )}

            {/* Folder Rows */}
            {admins?.map((admin) => (
              <tr key={admin.id}>
                <td
                  className="cursor-pointer text-break ps-2"
                  onClick={() => navigate(`/company/media/${admin.id}`)}
                >
                  <div className="d-flex align-items-center">
                    <i className="ki-duotone ki-folder fs-2x fs-sm-2x text-primary me-2 me-sm-3">
                      <span className="path1" />
                      <span className="path2" />
                    </i>
                    <div className="fw-bold text-gray-800 text-hover-primary fs-7 fs-sm-6">
                      {admin.name}
                    </div>
                  </div>
                  {/* Mobile: Show employee count below name */}
                  <div className="d-md-none text-gray-500 fs-8 mt-1 ms-5 ps-2">
                    {admin.employeeCount} employees
                  </div>
                </td>

                <td className="text-nowrap d-none d-md-table-cell">
                  {admin.employeeCount} employees
                </td>

                <td className="text-end pe-2">
                  <button
                    className="btn btn-sm btn-light-primary fs-8 fs-sm-7 px-2 px-sm-3"
                    onClick={() => navigate(`/company/media/${admin.id}`)}
                  >
                    <span className="d-none d-sm-inline">Open Folder</span>
                    <span className="d-inline d-sm-none">Open</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminFolderList;
