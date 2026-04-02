import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Employee, AdminFolder } from '@models/media';
import { formatJoiningDate } from '@utils/media.utils';
import MediaBreadcrumb from './MediaBreadcrumb';

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
            <div className="dt-container dt-bootstrap5 dt-empty-footer">
                <div className="table-responsive">
                    <div className="dt-scroll">
                        <div className="dt-scroll-body" style={{ position: "relative", overflow: "auto", maxHeight: "700px" }}>
                            <table className="table align-middle table-row-dashed fs-6 gy-5 dataTable" style={{ width: "100%" }}>
                                <thead>
                                    <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                        <th className="min-w-200px min-w-sm-250px ps-2">Employee Name</th>
                                        <th className="min-w-100px d-none d-md-table-cell">Employee Code</th>
                                        <th className="min-w-100px min-w-sm-125px d-none d-lg-table-cell">Joined On</th>
                                        <th className="min-w-100px min-w-sm-125px text-end pe-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-600">
                                    {adminEmployees?.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-10">
                                                <div className="fs-6">No Employees Found</div>
                                            </td>
                                        </tr>
                                    )}
                                    {adminEmployees?.map((employee) => (
                                        <tr key={employee.id}>
                                            <td className="ps-2">
                                                <div
                                                    className="d-flex align-items-center cursor-pointer"
                                                    onClick={() => navigate(`/company/media/${adminId}/${employee.id}`)}
                                                >
                                                    <span className="icon-wrapper">
                                                        <i className="ki-duotone ki-folder fs-2x text-primary me-2 me-sm-3 me-md-4">
                                                            <span className="path1" />
                                                            <span className="path2" />
                                                        </i>
                                                    </span>
                                                    <div className="text-gray-800 text-hover-primary fs-7 fs-sm-6 text-break">
                                                        {employee.users?.firstName && `${employee.users.firstName}`} {employee.users?.lastName && `${employee.users.lastName}`}
                                                    </div>
                                                </div>
                                                {/* Mobile: Show additional info below name */}
                                                <div className="d-md-none text-gray-500 fs-8 mt-1 ms-5 ps-2">
                                                    <span className="d-inline-block me-3">Code: {employee.employeeCode || '-'}</span>
                                                    <span className="d-lg-none d-inline-block">Joined: {formatJoiningDate(employee.dateOfJoining)}</span>
                                                </div>
                                            </td>
                                            <td className="d-none d-md-table-cell fs-7">{employee.employeeCode || '-'}</td>
                                            <td className="d-none d-lg-table-cell fs-7">{formatJoiningDate(employee.dateOfJoining)}</td>
                                            <td className="text-end pe-2">
                                                <button
                                                    className="btn btn-sm btn-light-primary fs-8 fs-sm-7 px-2 px-sm-3"
                                                    onClick={() => navigate(`/company/media/${adminId}/${employee.id}`)}
                                                >
                                                    <span className="d-none d-sm-inline">View Documents</span>
                                                    <span className="d-inline d-sm-none">View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeList;
