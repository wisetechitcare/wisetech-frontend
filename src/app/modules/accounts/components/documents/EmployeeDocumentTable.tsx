import MaterialTable from '@app/modules/common/components/MaterialTable'
import { IconButton } from '@mui/material';
import PdfLoader from '@pages/employee/PdfLoader'
import React, { useEffect, useState } from 'react'
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { Table, Pagination } from "react-bootstrap";
import { fetchCurrentEmployeeByEmpId, fetchDocumentsField, fetchEmployeeDocuments, fetchEmployeeMediaByUserId } from '@services/employee';
import dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';

function EmployeeDocumentTable({message1='No Documents Uploaded By User', message2='Documents Uploaded By User'}:{message1?: string, message2?: string}) {
    const { employeeId } = useParams();
    const currentEmployeeId = employeeId || useSelector((state: RootState) => state.employee.currentEmployee?.id);
    const [userId, setUserId] = useState();
    const digitalSignature = useSelector((state: RootState) => state.employee.currentEmployee?.digitalSignaturePath);
    const status = useSelector((state: RootState) => state.employee.currentEmployee?.dateOfExit) ? 'Terminated' : 'Active';
    const [documents, setDocuments] = useState<Array<{
        fileName: string,
        size: string,
        created: string,
        status: string,
        fileUrl: string,
        category: string
    }>>([]);
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    const [file, setFile] = useState("");
    const [fileName, setFileName] = useState("");
    const handleViewDocument = (documentPath: string, documentName: string) => {
        setFile(documentPath);
        setFileName(documentName);
    };

    const handleCloseDialog = () => {
        setFile("");
    };

    const columns = [
        { accessorKey: 'fileName', header: 'File Name' },
        { accessorKey: 'created', header: 'Created' },
        {
            accessorKey: 'status',
            header: 'Status',
            Cell: ({ cell }: any) => {
                const status = cell.getValue();
                const backgroundColor = status === "Active" ? 'lightgreen' : 'lightcoral';
                return (
                    <span style={{
                        color: status === "Active" ? 'black' : 'red',
                        backgroundColor,
                        padding: '2px 5px',
                        borderRadius: '4px'
                    }}>
                        {status}
                    </span>
                );
            },
        },
        {
            accessorKey: 'actions',
            header: 'Actions',
            Cell: ({ row }: any) => (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton onClick={() => handleViewDocument(row.original.fileUrl, row.original.fileName)}>
                        <VisibilityIcon />
                    </IconButton>
                </div>
            ),
        }
    ];

    useEffect(() => {
        const fetchData = async () => {
            if (currentEmployeeId) {
                try {
                    const response = await fetchCurrentEmployeeByEmpId(currentEmployeeId);
                    if(response?.hasError) return;
                    setUserId(response?.data?.employee?.userId);
                } catch (error) {
                    console.error("Failed to fetch documents", error);
                }
            }
        };

        fetchData();
    }, [currentEmployeeId]);

    useEffect(() => {
        const fetchData = async () => {
            if (userId) {
                try {
                    const response = await fetchEmployeeMediaByUserId(userId);
                    if (response?.hasError) return;

                    const { media = [] } = response?.data || {};

                    const formattedDocuments = media.map(({ fileName, createdAt, path, id, size }: any) => {
                        // Detect category from file path
                        let category = 'Other Files';
                        if (path?.includes('/onboarding-docs/')) {
                            category = 'Onboarding Documents';
                        } else if (path?.includes('/reimbursement-docs/')) {
                            category = 'Reimbursement Documents';
                        } else if (path?.includes('/profile/')) {
                            category = 'Profile';
                        } else if (path?.includes('/bank-docs/')) {
                            category = 'Bank Documents';
                        } else if (path?.includes('/education-docs/')) {
                            category = 'Education Documents';
                        } else if (path?.includes('/salary-docs/')) {
                            category = 'Salary Documents';
                        }

                        return {
                            id,
                            fileName,
                            status,
                            size,
                            fileUrl: path,
                            created: dayjs(createdAt).format('YYYY-MM-DD'),
                            category,
                        };
                    });

                    setDocuments(formattedDocuments);
                } catch (error) {
                    console.error("Failed to fetch documents", error);
                }
            }
        };

        fetchData();
    }, [userId]);

    // Group documents by folder
    const folders = [
        {
            name: 'profile',
            label: 'Profile',
            icon: 'ki-user',
            count: documents.filter(d => d.category === 'Profile').length,
            documents: documents.filter(d => d.category === 'Profile')
        },
        {
            name: 'onboarding-docs',
            label: 'Onboarding Documents',
            icon: 'ki-document',
            count: documents.filter(d => d.category === 'Onboarding Documents').length,
            documents: documents.filter(d => d.category === 'Onboarding Documents')
        },
        {
            name: 'bank-docs',
            label: 'Bank Documents',
            icon: 'ki-bank',
            count: documents.filter(d => d.category === 'Bank Documents').length,
            documents: documents.filter(d => d.category === 'Bank Documents')
        },
        {
            name: 'education-docs',
            label: 'Education Documents',
            icon: 'ki-education',
            count: documents.filter(d => d.category === 'Education Documents').length,
            documents: documents.filter(d => d.category === 'Education Documents')
        },
        {
            name: 'salary-docs',
            label: 'Salary Documents',
            icon: 'ki-bill',
            count: documents.filter(d => d.category === 'Salary Documents').length,
            documents: documents.filter(d => d.category === 'Salary Documents')
        },
        {
            name: 'reimbursement-docs',
            label: 'Reimbursement Documents',
            icon: 'ki-wallet',
            count: documents.filter(d => d.category === 'Reimbursement Documents').length,
            documents: documents.filter(d => d.category === 'Reimbursement Documents')
        },
        {
            name: 'other-files',
            label: 'Other Files',
            icon: 'ki-folder',
            count: documents.filter(d => d.category === 'Other Files').length,
            documents: documents.filter(d => d.category === 'Other Files')
        }
    ].filter(folder => folder.count > 0);

    // Get current view items (folders or files)
    const currentFolderData = currentFolder
        ? folders.find(f => f.name === currentFolder)
        : null;

    const displayItems = currentFolder ? currentFolderData?.documents || [] : [];

    return (
        <>
            <div className="card card-body">
                {/* Breadcrumb Navigation */}
                <div className="d-flex align-items-center gap-2 mb-5">
                    <button
                        className="btn btn-sm btn-light"
                        onClick={() => setCurrentFolder(null)}
                        disabled={!currentFolder}
                    >
                        <i className="ki-duotone ki-home fs-3"></i>
                    </button>
                    <span className="text-gray-600">/</span>
                    <span className="fw-bold fs-6">
                        {currentFolder ? currentFolderData?.label : 'All Folders'}
                    </span>
                </div>

                <div className="d-flex flex-stack my-2">
                    <div className="badge badge-lg badge-light-primary">
                        <div className="d-flex align-items-center flex-wrap p-1">
                            <div>{currentFolder ? currentFolderData?.label : message2}</div>
                        </div>
                    </div>
                    <div className="badge badge-lg badge-primary">
                        <span id="kt_file_manager_items_counter">
                            {currentFolder ? displayItems.length : folders.length} {currentFolder ? 'files' : 'folders'}
                        </span>
                    </div>
                </div>
                <div
                    id="kt_file_manager_list_wrapper"
                    className="dt-container dt-bootstrap5 dt-empty-footer"
                >
                    <div id="" className="table-responsive">
                        <div className="dt-scroll">

                            <div
                                className="dt-scroll-body"
                                style={{ position: "relative", overflow: "auto", maxHeight: 700 }}
                            >
                                <table
                                    id="kt_file_manager_list"
                                    data-kt-filemanager-table="folders"
                                    className="table align-middle table-row-dashed fs-6 gy-5 dataTable"
                                    style={{ width: "100%" }}
                                >
                                    <colgroup style={{ width: "100%" }}>
                                        {/* <col data-dt-column={0} style={{ width: "1.3906px" }} /> */}
                                        <col data-dt-column={0} style={{ width: "40%" }} />
                                        <col data-dt-column={1} style={{ width: "30%" }} />
                                        <col data-dt-column={2} style={{ width: "20%" }} />
                                        <col data-dt-column={3} style={{ width: "10%" }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                            {/* <th
                                                className="w-10px pe-2 dt-orderable-none"
                                                data-dt-column={0}
                                                rowSpan={1}
                                                colSpan={1}
                                            >
                                                <div className="dt-scroll-sizing">
                                                    <span className="dt-column-title">
                                                        <div className="form-check form-check-sm form-check-custom form-check-solid me-3">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                data-kt-check="true"
                                                                data-kt-check-target="#kt_file_manager_list .form-check-input"
                                                                defaultValue={1}
                                                            />
                                                        </div>
                                                    </span>
                                                    <span className="dt-column-order" />
                                                </div>
                                            </th> */}
                                            <th
                                                className="min-w-250px dt-orderable-none"
                                                data-dt-column={1}
                                                rowSpan={1}
                                                colSpan={1}
                                            >
                                                <div className="dt-scroll-sizing">
                                                    <span className="dt-column-title">Name</span>
                                                    <span className="dt-column-order" />
                                                </div>
                                            </th>
                                            <th
                                                className="min-w-10px dt-orderable-none"
                                                data-dt-column={2}
                                                rowSpan={1}
                                                colSpan={1}
                                            >
                                                <div className="dt-scroll-sizing">
                                                    <span className="dt-column-title">Size</span>
                                                    <span className="dt-column-order" />
                                                </div>
                                            </th>
                                            <th
                                                className="min-w-125px dt-orderable-none"
                                                data-dt-column={3}
                                                rowSpan={1}
                                                colSpan={1}
                                            >
                                                <div className="dt-scroll-sizing">
                                                    <span className="dt-column-title">Uploaded On</span>
                                                    <span className="dt-column-order" />
                                                </div>
                                            </th>
                                            <th
                                                className="w-125px dt-orderable-none"
                                                data-dt-column={4}
                                                rowSpan={1}
                                                colSpan={1}
                                            >
                                                <div className="dt-scroll-sizing">
                                                    <span className="dt-column-title" />
                                                    Actions
                                                    <span className="dt-column-order" />
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {/* Show folders when at root level */}
                                        {!currentFolder && folders.length === 0 && (
                                            <tr>
                                                <td colSpan={4}>
                                                    <div className="text-center py-5">
                                                        <i className="ki-duotone ki-folder fs-3x text-muted mb-3">
                                                            <span className="path1"></span>
                                                            <span className="path2"></span>
                                                        </i>
                                                        <div>{message1}</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {!currentFolder && folders.map((folder, index) => (
                                            <tr
                                                key={index}
                                                onClick={() => setCurrentFolder(folder.name)}
                                                style={{ cursor: 'pointer' }}
                                                className="hover-bg-light"
                                            >
                                                <td data-order="folder">
                                                    <div className="d-flex align-items-center">
                                                        <span className="icon-wrapper">
                                                            <i className="ki-duotone ki-folder fs-2x text-primary me-4">
                                                                <span className="path1"></span>
                                                                <span className="path2"></span>
                                                            </i>
                                                        </span>
                                                        <span className="fw-bold">{folder.label}</span>
                                                    </div>
                                                </td>
                                                <td>{folder.count} files</td>
                                                <td>-</td>
                                                <td className="text-end">
                                                    <i className="ki-duotone ki-right fs-3 text-gray-500"></i>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Show files when inside a folder */}
                                        {currentFolder && displayItems.length === 0 && (
                                            <tr>
                                                <td colSpan={4}>
                                                    <div className="text-center py-5">
                                                        <i className="ki-duotone ki-file fs-3x text-muted mb-3"></i>
                                                        <div>No files in this folder</div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {currentFolder && displayItems.map((document, index) => (
                                            <tr key={index}>
                                                <td data-order="index.html">
                                                    <div className="d-flex align-items-center">
                                                        <span className="icon-wrapper">
                                                            <i className="ki-duotone ki-file fs-2x text-primary me-4">
                                                                <span className="path1"></span>
                                                                <span className="path2"></span>
                                                            </i>
                                                        </span>
                                                        {document?.fileName || '-'}
                                                    </div>
                                                </td>
                                                <td>{document?.size || '-'}</td>
                                                <td data-order="2025-05-05T06:43:00+05:30">
                                                    {dayjs(document?.created).format('D MMM, YYYY') || document?.created || '-'}
                                                </td>
                                                <td
                                                    className="text-end"
                                                    data-kt-filemanager-table="action_dropdown"
                                                >
                                                    <div className='d-flex justify-content-center'>
                                                        <a href={`${document?.fileUrl}`} target='_blank'>
                                                        <IconButton >
                                                            <VisibilityIcon />
                                                        </IconButton>
                                                        </a>
                                                    </div>

                                                    {/* <div className="d-flex justify-content-end">
                                                        <div className="ms-2" data-kt-filemanger-table="copy_link">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-icon btn-light btn-active-light-primary"
                                                                data-kt-menu-trigger="click"
                                                                data-kt-menu-placement="bottom-end"
                                                            >
                                                                <i className="ki-duotone ki-fasten fs-5 m-0">
                                                                    <span className="path1" />
                                                                    <span className="path2" />
                                                                </i>{" "}
                                                            </button>
                                                            <div
                                                                className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-300px"
                                                                data-kt-menu="true"
                                                            >
                                                                <div className="card card-flush">
                                                                    <div className="card-body p-5">
                                                                        <div
                                                                            className="d-flex"
                                                                            data-kt-filemanger-table="copy_link_generator"
                                                                        >
                                                                            <div className="me-5" data-kt-indicator="on">
                                                                                <span className="indicator-progress">
                                                                                    <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                                                                </span>
                                                                            </div>
                                                                            
                                                                            <div className="fs-6 text-gray-900">
                                                                                Generating Share Link...
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div
                                                                            className="d-flex flex-column text-start d-none"
                                                                            data-kt-filemanger-table="copy_link_result"
                                                                        >
                                                                            <div className="d-flex mb-3">
                                                                                <i className="ki-duotone ki-check fs-2 text-success me-3" />{" "}
                                                                                <div className="fs-6 text-gray-900">
                                                                                    Share Link Generated
                                                                                </div>
                                                                            </div>
                                                                            <input
                                                                                type="text"
                                                                                className="form-control form-control-sm"
                                                                                defaultValue="https://path/to/file/or/folder/"
                                                                            />
                                                                            <div className="text-muted fw-normal mt-2 fs-8 px-3">
                                                                                Read only.{" "}
                                                                                <a
                                                                                    href="/metronic8/demo8/apps/file-manager/settings/.html"
                                                                                    className="ms-2"
                                                                                >
                                                                                    Change permissions
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="ms-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-icon btn-light btn-active-light-primary me-2"
                                                                data-kt-menu-trigger="click"
                                                                data-kt-menu-placement="bottom-end"
                                                            >
                                                                <i className="ki-duotone ki-dots-square fs-5 m-0">
                                                                    <span className="path1" />
                                                                    <span className="path2" />
                                                                    <span className="path3" />
                                                                    <span className="path4" />
                                                                </i>{" "}
                                                            </button>
                                                            <div
                                                                className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-150px py-4"
                                                                data-kt-menu="true"
                                                            >
                                                                <div className="menu-item px-3">
                                                                    <a
                                                                        href={document?.fileUrl}
                                                                        className="menu-link px-3"
                                                                    >
                                                                        View
                                                                    </a>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    </div> */}

                                                </td>
                                            </tr>
                                        ))}

                                        {/* Below tr is marked as comment. Because in future we might have to implement delete functionality for the same so please don't remove it */}
                                        {/* <tr>
                                            <td>
                                                <div className="form-check form-check-sm form-check-custom form-check-solid">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        defaultValue={1}
                                                    />
                                                </div>
                                            </td>
                                            <td data-order="landing.html">
                                                <div className="d-flex align-items-center">
                                                    <span className="icon-wrapper">
                                                        <i className="ki-duotone ki-files fs-2x text-primary me-4" />
                                                    </span>
                                                    <a
                                                        href="/metronic8/demo8/apps/file-manager/files/.html"
                                                        className="text-gray-800 text-hover-primary"
                                                    >
                                                        landing.html
                                                    </a>
                                                </div>
                                            </td>
                                            <td>87 KB</td>
                                            <td data-order="2025-07-25T17:30:00+05:30">
                                                25 Jul 2025, 5:30 pm
                                            </td>
                                            <td
                                                className="text-end"
                                                data-kt-filemanager-table="action_dropdown"
                                            >
                                                <div className="d-flex justify-content-end">
                                                    <div className="ms-2" data-kt-filemanger-table="copy_link">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-icon btn-light btn-active-light-primary"
                                                            data-kt-menu-trigger="click"
                                                            data-kt-menu-placement="bottom-end"
                                                        >
                                                            <i className="ki-duotone ki-fasten fs-5 m-0">
                                                                <span className="path1" />
                                                                <span className="path2" />
                                                            </i>{" "}
                                                        </button>
                                                        <div
                                                            className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-300px"
                                                            data-kt-menu="true"
                                                        >
                                                            <div className="card card-flush">
                                                                <div className="card-body p-5">
                                                                    <div
                                                                        className="d-flex"
                                                                        data-kt-filemanger-table="copy_link_generator"
                                                                    >
                                                                        <div className="me-5" data-kt-indicator="on">
                                                                            <span className="indicator-progress">
                                                                                <span className="spinner-border spinner-border-sm align-middle ms-2" />
                                                                            </span>
                                                                        </div>
                                                                        <div className="fs-6 text-gray-900">
                                                                            Generating Share Link...
                                                                        </div>
                                                                    </div>
                                                                    <div
                                                                        className="d-flex flex-column text-start d-none"
                                                                        data-kt-filemanger-table="copy_link_result"
                                                                    >
                                                                        <div className="d-flex mb-3">
                                                                            <i className="ki-duotone ki-check fs-2 text-success me-3" />{" "}
                                                                            <div className="fs-6 text-gray-900">
                                                                                Share Link Generated
                                                                            </div>
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            defaultValue="https://path/to/file/or/folder/"
                                                                        />
                                                                        <div className="text-muted fw-normal mt-2 fs-8 px-3">
                                                                            Read only.{" "}
                                                                            <a
                                                                                href="/metronic8/demo8/apps/file-manager/settings/.html"
                                                                                className="ms-2"
                                                                            >
                                                                                Change permissions
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="ms-2">
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-icon btn-light btn-active-light-primary me-2"
                                                            data-kt-menu-trigger="click"
                                                            data-kt-menu-placement="bottom-end"
                                                        >
                                                            <i className="ki-duotone ki-dots-square fs-5 m-0">
                                                                <span className="path1" />
                                                                <span className="path2" />
                                                                <span className="path3" />
                                                                <span className="path4" />
                                                            </i>{" "}
                                                        </button>
                                                        <div
                                                            className="menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg-light-primary fw-semibold fs-7 w-150px py-4"
                                                            data-kt-menu="true"
                                                        >
                                                            <div className="menu-item px-3">
                                                                <a
                                                                    href="/metronic8/demo8/apps/file-manager/files.html"
                                                                    className="menu-link px-3"
                                                                >
                                                                    View
                                                                </a>
                                                            </div>
                                                           
                                                            <div className="menu-item px-3">
                                                                <a
                                                                    href="#"
                                                                    className="menu-link px-3"
                                                                    data-kt-filemanager-table="rename"
                                                                >
                                                                    Rename
                                                                </a>
                                                            </div>
                                                            
                                                            <div className="menu-item px-3">
                                                                <a href="#" className="menu-link px-3">
                                                                    Download Folder
                                                                </a>
                                                            </div>
                                                            
                                                            <div className="menu-item px-3">
                                                                <a
                                                                    href="#"
                                                                    className="menu-link px-3"
                                                                    data-kt-filemanager-table-filter="move_row"
                                                                    data-bs-toggle="modal"
                                                                    data-bs-target="#kt_modal_move_to_folder"
                                                                >
                                                                    Move to folder
                                                                </a>
                                                            </div>
                                                            
                                                            <div className="menu-item px-3">
                                                                <a
                                                                    href="#"
                                                                    className="menu-link text-danger px-3"
                                                                    data-kt-filemanager-table-filter="delete_row"
                                                                >
                                                                    Delete
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr> */}

                                    </tbody>
                                </table>
                            </div>
                            <div
                                className="dt-scroll-foot"
                                style={{ overflow: "hidden", border: 0, width: "100%" }}
                            >
                                <div className="dt-scroll-footInner">
                                    <table
                                        data-kt-filemanager-table="folders"
                                        className="table align-middle table-row-dashed fs-6 gy-5 dataTable"
                                        style={{ marginLeft: 0 }}
                                    >
                                        <tfoot />
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="" className="row">
                        <div
                            id=""
                            className="col-sm-12 col-md-5 d-flex align-items-center justify-content-center justify-content-md-start dt-toolbar"
                        />
                        <div
                            id=""
                            className="col-sm-12 col-md-7 d-flex align-items-center justify-content-center justify-content-md-end"
                        />
                    </div>
                </div>
                {/*end::Table*/}
            </div>

        </>
    )
}

export default EmployeeDocumentTable