import React from "react";
import { useNavigate } from "react-router-dom";
import MaterialTable from "@app/modules/common/components/MaterialTable";

// A row = a company this company referred (this company is their referral company).
interface ReferredCompanyReference {
  id: string;
  referenceType: "INTERNAL" | "EXTERNAL";
  company?: {
    id: string;
    prefix?: string | null;
    companyName: string;
    phone?: string | null;
    email?: string | null;
    status?: string | null;
    companyType?: { id: string; name: string } | null;
  } | null;
}

const CompanyReferences: React.FC<{ referredCompanies?: ReferredCompanyReference[] }> = ({ referredCompanies = [] }) => {
  const navigate = useNavigate();

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
        const c = (row.original as ReferredCompanyReference).company;
        if (!c) return <span className="text-muted">—</span>;
        return (
          <button
            className="btn btn-link p-0 text-start text-decoration-none fw-semibold"
            style={{ color: "inherit", fontSize: "14px" }}
            onClick={() => navigate(`/companies/${c.id}`)}
          >
            {c.companyName}
          </button>
        );
      },
    },
    {
      accessorKey: "contactPhone",
      header: "Phone",
      Cell: ({ row }: any) => {
        const c = (row.original as ReferredCompanyReference).company;
        return c?.phone ? <span>{c.phone}</span> : <span className="text-muted">—</span>;
      },
    },
    {
      accessorKey: "contactEmail",
      header: "Email",
      Cell: ({ row }: any) => {
        const c = (row.original as ReferredCompanyReference).company;
        return c?.email ? <span>{c.email}</span> : <span className="text-muted">—</span>;
      },
    },
    {
      accessorKey: "companyType",
      header: "Company Type",
      Cell: ({ row }: any) => {
        const c = (row.original as ReferredCompanyReference).company;
        return <span>{c?.companyType?.name || <span className="text-muted">—</span>}</span>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      Cell: ({ row }: any) => {
        const status = (row.original as ReferredCompanyReference).company?.status;
        const active = status === "ACTIVE";
        return (
          <span className={`badge ${active ? "badge-light-success" : "badge-light-danger"}`}>
            {active ? "Active" : status === "CLOSED" ? "Inactive" : (status || "—")}
          </span>
        );
      },
    },
  ];

  return (
    <MaterialTable
      data={referredCompanies}
      columns={columns}
      tableName="company-references"
      hidePagination={true}
      muiTableProps={{ sx: { minWidth: 600 } }}
    />
  );
};

export default CompanyReferences;
