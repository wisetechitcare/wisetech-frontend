import React from "react";
import { useNavigate } from "react-router-dom";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import AnalyticsTab from "@app/modules/common/components/AnalyticsTab";
import { ToneChip } from "@app/modules/common/components/ui";

// A row = a company this company referred (this company is their referral company).
interface ReferredCompanyReference {
  id: string;
  referenceType: "INTERNAL" | "EXTERNAL";
  /** When the referral was recorded — the only date a reference row carries. */
  createdAt?: string | null;
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

/**
 * A referral is charted on the date it was recorded — a reference row carries no
 * business date of its own. Bars split by the referred company's TYPE, because
 * "he sends us Builders" is the useful half of "he sent us eleven companies";
 * splitting by reference type would be a single colour here, since every row on
 * this tab is by definition an external referral.
 */
const referenceRow = (r: ReferredCompanyReference) => ({
  date: r.createdAt,
  series: r.company?.companyType?.name || "Unspecified type",
  label: r.company?.companyName,
  href: r.company?.id ? `/companies/${r.company.id}` : undefined,
});

const CompanyReferences: React.FC<{ referredCompanies?: ReferredCompanyReference[] }> = ({ referredCompanies = [] }) => {
  const navigate = useNavigate();

  const columns = [
    {
      accessorKey: "referenceType",
      header: "Type",
      Cell: ({ row }: any) => (
        <ToneChip
          dense
          tone={row.original.referenceType === "INTERNAL" ? "brand" : "success"}
          label={row.original.referenceType === "INTERNAL" ? "Internal" : "External"}
        />
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
          <ToneChip
            dense
            tone={active ? "success" : "danger"}
            label={active ? "Active" : status === "CLOSED" ? "Inactive" : (status || "—")}
          />
        );
      },
    },
  ];

  return (
    <AnalyticsTab
      items={referredCompanies}
      toRow={referenceRow}
      title="Referred Companies"
      icon="bi-building"
      noun="company"
      storageKey="companyReferencesPeriodMode"
    >
      {(filtered) => (
        <MaterialTable
          data={filtered}
          columns={columns}
          tableName="company-references"
          hidePagination={true}
          muiTableProps={{ sx: { minWidth: 600 } }}
        />
      )}
    </AnalyticsTab>
  );
};

export default CompanyReferences;
