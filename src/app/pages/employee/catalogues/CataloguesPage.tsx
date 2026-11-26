import { BookOpenText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DataTable, SortableHeader, type ColumnDef } from "@/ds/patterns/data-table";
import MaterialHeaderTab from "@app/modules/common/components/MaterialHeaderTab";
import { PageTitle } from "@metronic/layout/core";
import { Badge } from "@/ds/ui/badge";
import { SmartAvatar } from "@/ds/ui/smart-avatar";
import { toast } from "@app/modules/common/components/ui/feedback";
import { apiErrorMessage } from "@utils/apiError";
import { canSection } from "@utils/can";
import { CatalogueActionsMenu, CatalogueViewer, DeleteDialog, RenameDialog, type CatalogueActions } from "@pages/employee/companies/companies/components/CompanyCatalogue";
import { deleteCompanyCatalogue, getAllCatalogues, renameCompanyCatalogue, type CatalogueRow } from "@services/companyCatalogues";

const SHOWN = 2;

/** First few as badges, the rest behind "+n" (full list in the tooltip). */
function Tags({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1" title={items.join(", ")}>
      {items.slice(0, SHOWN).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
      {items.length > SHOWN && <Badge variant="secondary">+{items.length - SHOWN}</Badge>}
    </div>
  );
}

const tagColumn = (key: "companyTypes" | "services" | "subServices", label: string): ColumnDef<CatalogueRow, any> => ({
  accessorKey: key,
  meta: { label, exportValue: (r: CatalogueRow) => r[key].join(", ") },
  header: label,
  filterFn: (row, _id, v: string) => row.original[key].join(" ").toLowerCase().includes(String(v).toLowerCase()),
  cell: ({ row }) => <Tags items={row.original[key]} />,
});

function CataloguesTable() {
  const canWrite = canSection("crm.companies", "write");
  // Opens in place; the company page is still one click away via the Company column.
  const [viewingId, setViewingId] = useState<string | null>(null);
  const openCatalogue = (c: CatalogueRow) => setViewingId(c.id);
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renaming, setRenaming] = useState<CatalogueRow | null>(null);
  const [deleting, setDeleting] = useState<CatalogueRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await getAllCatalogues());
    } catch (err) {
      setError(apiErrorMessage(err, "Please try again."));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const actions: CatalogueActions = {
    preview: (c) => openCatalogue(c as CatalogueRow),
    ...(canWrite ? { rename: (c) => setRenaming(c as CatalogueRow), remove: (c) => setDeleting(c as CatalogueRow) } : {}),
  };

  const columns: ColumnDef<CatalogueRow, any>[] = [
    {
      accessorKey: "name",
      meta: { label: "Catalogue" },
      enableHiding: false,
      header: ({ column }) => <SortableHeader column={column} title="Catalogue" />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "companyName",
      meta: { label: "Company" },
      header: ({ column }) => <SortableHeader column={column} title="Company" />,
      cell: ({ row }) => (
        <Link className="flex min-w-0 items-center gap-2.5 hover:underline" to={`/companies/${row.original.companyId}`}>
          <SmartAvatar name={row.original.companyName} seed={row.original.companyId} src={row.original.companyLogo} decorative />
          <span className="truncate">{row.original.companyName}</span>
        </Link>
      ),
    },
    tagColumn("companyTypes", "Company type"),
    tagColumn("services", "Services"),
    tagColumn("subServices", "Sub-services"),
    {
      id: "actions",
      enableHiding: false,
      header: "Actions",
      cell: ({ row }) => <CatalogueActionsMenu catalogue={row.original} actions={actions} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DataTable
        caption="Catalogues"
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        onRowClick={openCatalogue}
        rowLabel={(r) => `Open ${r.name}`}
        searchPlaceholder="Search catalogues or companies"
        loading={loading}
        error={error || undefined}
        onRetry={() => void load()}
        stateKey="crm-catalogues"
      />
      <CatalogueViewer items={rows} viewingId={viewingId} onViewingChange={setViewingId} actions={actions} />
      <RenameDialog
        catalogue={renaming}
        onClose={() => setRenaming(null)}
        onSave={async (name) => {
          if (!renaming) return;
          try {
            const updated = await renameCompanyCatalogue(renaming.companyId, renaming.id, name);
            setRows((rs) => rs.map((r) => (r.id === updated.id ? { ...r, name: updated.name } : r)));
            setRenaming(null);
            toast({ icon: "success", title: "Catalogue renamed" });
          } catch (err) {
            toast({ icon: "error", title: "Couldn't rename the catalogue", text: apiErrorMessage(err, "Please try again.") });
          }
        }}
      />
      <DeleteDialog
        catalogue={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCompanyCatalogue(deleting.companyId, deleting.id);
            setRows((rs) => rs.filter((r) => r.id !== deleting.id));
            setDeleting(null);
            toast({ icon: "success", title: "Catalogue deleted" });
          } catch (err) {
            toast({ icon: "error", title: "Couldn't delete the catalogue", text: apiErrorMessage(err, "Please try again.") });
          }
        }}
      />
    </div>
  );
}

/** Same shell as the other CRM sections (Companies, Contacts): breadcrumb title + the header tab bar. */
const CataloguesPage = () => (
  <div>
    <PageTitle breadcrumbs={[{ title: "Catalogue", path: "/catalogues", isSeparator: false, isActive: false }, { title: "", path: "", isSeparator: true, isActive: false }]}>
      Catalogue
    </PageTitle>
    <MaterialHeaderTab tabItems={[{ title: "Catalogue", component: <CataloguesTable />, icon: BookOpenText }]} activeTab={0} onTabChange={() => undefined} />
  </div>
);

export default CataloguesPage;
