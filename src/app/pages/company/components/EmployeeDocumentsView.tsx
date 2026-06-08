import React from 'react';
import EmployeeDocumentTable from '@app/modules/accounts/components/documents/EmployeeDocumentTable';
import MediaBreadcrumb from './MediaBreadcrumb';

interface EmployeeDocumentsViewProps {
    adminId: string;
    adminName: string;
    employeeName: string;
}

const EmployeeDocumentsView: React.FC<EmployeeDocumentsViewProps> = ({ adminId, adminName, employeeName }) => {
    const breadcrumbItems = [
        { label: 'All Admins', path: '/company/media' },
        { label: adminName, path: `/company/media/${adminId}` },
        { label: employeeName, isActive: true }
    ];

    return (
        <div className="card card-body px-3 px-sm-4 px-lg-9 py-5 py-md-8 m-2 m-sm-3 m-md-5 m-lg-8 shadow-sm">
            {/* Breadcrumb */}
            <MediaBreadcrumb items={breadcrumbItems} />

            {/* Document Table */}
            <EmployeeDocumentTable
                message1="No Documents Found"
                message2={`Documents for ${employeeName}`}
            />
        </div>
    );
};

export default EmployeeDocumentsView;
