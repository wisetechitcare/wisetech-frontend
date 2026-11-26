import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '@redux/store';
import { fetchCurrentEmployeeByEmpId, fetchEmployeeMediaByUserId } from '@services/employee';
import dayjs from 'dayjs';
import { useParams } from 'react-router-dom';
import { AppIcon } from '@app/modules/common/components/ui/AppIcon';
import { Button } from '@/ds/ui/button';
import { Badge } from '@/ds/ui/badge';
import { DataTable, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';
import { RowAction } from '@/ds/patterns/row-action';
import { Eye, Folder, File } from 'lucide-react';

type DocRow = {
    isFolder: boolean;
    name: string;
    size: string;
    uploaded: string;
    fileUrl?: string;
    folderName?: string;
    id?: string;
};

function EmployeeDocumentTable({message1='No Documents Uploaded By User', message2='Documents Uploaded By User'}:{message1?: string, message2?: string}) {
    const { employeeId } = useParams();
    const reduxEmployeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);
    const currentEmployeeId = employeeId || reduxEmployeeId;
    const [userId, setUserId] = useState();
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

    // The employee's canonical avatar / signature URLs, used to name stored files by
    // what they are rather than by the name they were uploaded under.
    const [knownAssetPaths, setKnownAssetPaths] = useState<{ avatar: string; signature: string }>({
        avatar: "",
        signature: "",
    });
    useEffect(() => {
        const fetchData = async () => {
            if (currentEmployeeId) {
                try {
                    const response = await fetchCurrentEmployeeByEmpId(currentEmployeeId);
                    if(response?.hasError) return;
                    const employee = response?.data?.employee;
                    setUserId(employee?.userId);
                    // Kept so a stored file can be identified by WHAT IT IS rather than
                    // by the name it happens to carry — see `resolveDisplayName`.
                    setKnownAssetPaths({
                        avatar: employee?.avatar || "",
                        signature: employee?.digitalSignaturePath || "",
                    });
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

                    /**
                     * What this file should be CALLED.
                     *
                     * Both profile uploads used to be stored under the name "avatar",
                     * so a signature was listed as a second profile picture. New
                     * uploads carry the right name, but every file already on S3 is
                     * still called "avatar" — and the two are indistinguishable by name.
                     * They are not indistinguishable by PATH, though: the employee
                     * record points at exactly which URL is the avatar and which is the
                     * signature, so matching on that names old rows correctly too.
                     */
                    const resolveDisplayName = (fileName: string, path: string) => {
                        if (path && path === knownAssetPaths.signature) return "Signature";
                        if (path && path === knownAssetPaths.avatar) return "Profile Photo";
                        return fileName;
                    };

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
                            fileName: resolveDisplayName(fileName, path),
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
        // Re-runs when the known paths land: they arrive from a separate fetch, and
        // without them every row would fall back to its raw stored name.
    }, [userId, knownAssetPaths]);

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

    // ── One shared table for both levels of the browser: folders at the root, files
    //    inside a folder. Rows carry real values (a raw ISO date, a numeric file count)
    //    so sorting and per-column search work on those, not on the rendered cells.
    const rows = useMemo<DocRow[]>(
        () => (currentFolder
            ? displayItems.map((document) => ({
                isFolder: false,
                name: document?.fileName || '-',
                size: document?.size || '-',
                uploaded: document?.created || '',
                fileUrl: document?.fileUrl,
                id: (document as any)?.id,
            }))
            : folders.map((folder) => ({
                isFolder: true,
                name: folder.label,
                size: `${folder.count} files`,
                uploaded: '',
                folderName: folder.name,
                id: folder.name,
            }))),
        [currentFolder, displayItems, folders],
    );

    const columns = useMemo<ColumnDef<DocRow>[]>(() => [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => (
                <div className="d-flex align-items-center gap-3">
                    {row.original.isFolder
                        ? <Folder className="size-6 text-primary shrink-0" aria-hidden />
                        : <File className="size-6 text-primary shrink-0" aria-hidden />}
                    <span className={row.original.isFolder ? 'fw-bold' : undefined}>{row.original.name}</span>
                </div>
            ),
        },
        { accessorKey: 'size', header: 'Size' },
        {
            accessorKey: 'uploaded',
            header: 'Uploaded On',
            cell: ({ getValue }) => {
                const value = getValue() as string;
                return value ? dayjs(value).format('D MMM, YYYY') : '-';
            },
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: ({ row }) => (row.original.isFolder ? (
                <AppIcon name="right" className="fs-3 text-gray-500" />
            ) : (
                <RowAction
                    label="View document"
                    size="icon-sm"
                    onClick={() => {
                        if (row.original.fileUrl) {
                            window.open(row.original.fileUrl, '_blank', 'noopener,noreferrer');
                        }
                    }}
                >
                    <Eye className="size-4" aria-hidden />
                </RowAction>
            )),
        },
    ], []);

    return (
        <>
            <div className="card card-body">
                {/* Breadcrumb Navigation */}
                <div className="d-flex align-items-center gap-2 mb-5">
                    <Button variant="outline" size="sm"
                        onClick={() => setCurrentFolder(null)}
                        disabled={!currentFolder}
                    >
                        <AppIcon name="home" className="fs-3" />
                    </Button>
                    <span className="text-gray-600">/</span>
                    <span className="fw-bold fs-6">
                        {currentFolder ? currentFolderData?.label : 'All Folders'}
                    </span>
                </div>

                <div className="d-flex flex-stack my-2">
                    <Badge variant="brand">
                        {currentFolder ? currentFolderData?.label : message2}
                    </Badge>
                    <Badge id="kt_file_manager_items_counter" variant="brand">
                        {currentFolder ? displayItems.length : folders.length} {currentFolder ? 'files' : 'folders'}
                    </Badge>
                </div>
                {rows.length === 0 ? (
                    <div className="text-center py-5">
                        <AppIcon name={currentFolder ? 'file' : 'folder'} className="fs-3x text-muted mb-3" />
                        <div>{currentFolder ? 'No files in this folder' : message1}</div>
                    </div>
                ) : (
                    <DataTable
                        caption="Employee Documents"
                        stateKey="EmployeeDocuments"
                        data={rows}
                        columns={columns}
                        getRowId={(r, i) => String(r.id ?? `${r.name}-${i}`)}
                        groupableColumns={false}
                        onRowClick={(row) => {
                            if (row.isFolder && row.folderName) setCurrentFolder(row.folderName);
                        }}
                        rowLabel={(row) => row.name}
                        toolbar={(ctx) => (
                            <DataTableExport columns={columns} ctx={ctx} filename="Employee Documents" />
                        )}
                    />
                )}
            </div>

        </>
    )
}

export default EmployeeDocumentTable
