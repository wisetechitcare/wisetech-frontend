import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminFolder } from '@models/media';
import Loader from '@app/modules/common/utils/Loader';
import { Folder } from 'lucide-react';
import { Badge } from '@/ds/ui/badge';
import { Button } from '@/ds/ui/button';
import { DataTable, SortableHeader, type ColumnDef } from '@/ds/patterns/data-table';
import { DataTableExport } from '@/ds/patterns/data-table-export';

interface AdminFolderListProps {
  admins: AdminFolder[];
}

const AdminFolderList: React.FC<AdminFolderListProps> = ({ admins }) => {
  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<AdminFolder>[]>(() => [
    {
      accessorKey: 'name',
      meta: { label: 'Admin Name' },
      header: ({ column }) => <SortableHeader column={column} title="Admin Name" />,
      cell: ({ row }) => (
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 text-left font-medium text-foreground hover:underline"
          onClick={() => navigate(`/company/media/${row.original.id}`)}
        >
          <Folder className="size-5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">{row.original.name}</span>
        </button>
      ),
    },
    {
      accessorKey: 'employeeCount',
      meta: { label: 'Employees Created/Updated', exportType: 'number', wrap: false },
      header: ({ column }) => <SortableHeader column={column} title="Employees Created/Updated" />,
      cell: ({ getValue }) => `${String(getValue() ?? 0)} employees`,
    },
    {
      id: 'actions',
      meta: { label: 'Action', export: false, pin: 'end', wrap: false },
      enableSorting: false,
      enableHiding: false,
      header: 'Action',
      cell: ({ row }) => (
        <Button
          type="button"
          variant="tinted"
          size="sm"
          onClick={() => navigate(`/company/media/${row.original.id}`)}
        >
          Open Folder
        </Button>
      ),
    },
  ], [navigate]);

  if (!admins) return <Loader />;

  return (
    <div className="m-2 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:m-3 sm:p-6 md:m-5 lg:m-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-semibold text-foreground">Admin Folders</h4>
        <Badge variant="brand">Total: {admins.length}</Badge>
      </div>

      {admins.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No Admin Folders Found
        </div>
      ) : (
        <DataTable
          caption="Admin Folders"
          columns={columns}
          data={admins}
          getRowId={(r) => r.id}
          stateKey="company.adminFolders"
          initialPageSize={25}
          toolbar={(ctx) => (
            <DataTableExport columns={columns} ctx={ctx} filename="Admin Folders" />
          )}
        />
      )}
    </div>
  );
};

export default AdminFolderList;
