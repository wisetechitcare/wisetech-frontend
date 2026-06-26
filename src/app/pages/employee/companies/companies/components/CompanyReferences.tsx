import React from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";

interface CompanyReference {
  id: string;
  referenceType: "INTERNAL" | "EXTERNAL";
  internalReferenceEmployee?: {
    id: string;
    nickName?: string;
    users?: { firstName: string; lastName: string };
  } | null;
  externalReferenceContact?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  } | null;
  externalReferenceCompanyType?: { id: string; name: string } | null;
  isActive: boolean;
}

const CompanyReferences: React.FC<{ references?: CompanyReference[] }> = ({ references = [] }) => {
  const columns = [
    {
      accessorKey: "referenceType",
      header: "Type",
      Cell: ({ row }: any) => (
        <span
          className={`badge ${row.original.referenceType === "INTERNAL" ? "badge-light-primary" : "badge-light-success"}`}
        >
          {row.original.referenceType === "INTERNAL" ? "Internal" : "External"}
        </span>
      ),
    },
    {
      accessorKey: "refName",
      header: "Reference Name",
      Cell: ({ row }: any) => {
        const ref: CompanyReference = row.original;
        if (ref.referenceType === "INTERNAL" && ref.internalReferenceEmployee) {
          const emp = ref.internalReferenceEmployee;
          const name = emp.users
            ? `${emp.users.firstName} ${emp.users.lastName}`
            : emp.nickName || "—";
          return <span>{name}</span>;
        }
        if (ref.referenceType === "EXTERNAL" && ref.externalReferenceContact) {
          return <span>{ref.externalReferenceContact.fullName}</span>;
        }
        return <span className="text-muted">—</span>;
      },
    },
    {
      accessorKey: "contactPhone",
      header: "Phone",
      Cell: ({ row }: any) => {
        const ref: CompanyReference = row.original;
        if (ref.referenceType === "EXTERNAL" && ref.externalReferenceContact?.phone) {
          return <span>{ref.externalReferenceContact.phone}</span>;
        }
        return <span className="text-muted">—</span>;
      },
    },
    {
      accessorKey: "contactEmail",
      header: "Email",
      Cell: ({ row }: any) => {
        const ref: CompanyReference = row.original;
        if (ref.referenceType === "EXTERNAL" && ref.externalReferenceContact?.email) {
          return <span>{ref.externalReferenceContact.email}</span>;
        }
        return <span className="text-muted">—</span>;
      },
    },
    {
      accessorKey: "externalReferenceCompanyType",
      header: "Company Type",
      Cell: ({ row }: any) => {
        const ref: CompanyReference = row.original;
        return (
          <span>{ref.externalReferenceCompanyType?.name || <span className="text-muted">—</span>}</span>
        );
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      Cell: ({ row }: any) => (
        <span className={`badge ${row.original.isActive ? "badge-light-success" : "badge-light-danger"}`}>
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <MaterialTable
      data={references}
      columns={columns}
      tableName="company-references"
      hidePagination={true}
      muiTableProps={{ sx: { minWidth: 600 } }}
    />
  );
};

export default CompanyReferences;
