import React from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

interface LeadReferral {
  id: string;
  lead?: { id: string; title?: string; status?: { name: string; color?: string } | null; createdAt?: string } | null;
  referralType?: { id: string; name: string } | null;
}

const ContactLeadReferences: React.FC<{ referrals?: LeadReferral[] }> = ({ referrals = [] }) => {
  const navigate = useNavigate();

  const columns = [
    {
      accessorKey: "lead.title",
      header: "Lead",
      Cell: ({ row }: any) => {
        const ref: LeadReferral = row.original;
        if (!ref.lead) return <span className="text-muted">—</span>;
        return (
          <button
            className="btn btn-link p-0 text-start text-decoration-none fw-semibold"
            style={{ color: "inherit", fontSize: "14px" }}
            onClick={() => navigate(`/employee/lead/${ref.lead!.id}`)}
          >
            {ref.lead.title || ref.lead.id}
          </button>
        );
      },
    },
    {
      accessorKey: "referralType.name",
      header: "Referral Type",
      Cell: ({ row }: any) => {
        const ref: LeadReferral = row.original;
        return <span>{ref.referralType?.name || <span className="text-muted">—</span>}</span>;
      },
    },
    {
      accessorKey: "lead.status.name",
      header: "Lead Status",
      Cell: ({ row }: any) => {
        const status = row.original.lead?.status;
        return status?.name ? (
          <span
            className="badge"
            style={{ backgroundColor: status.color || "#6c757d", color: "#fff" }}
          >
            {status.name}
          </span>
        ) : (
          <span className="text-muted">—</span>
        );
      },
    },
    {
      accessorKey: "lead.createdAt",
      header: "Date",
      Cell: ({ row }: any) => {
        const date = row.original.lead?.createdAt;
        return <span>{date ? dayjs(date).format("DD MMM YYYY") : "—"}</span>;
      },
    },
  ];

  return (
    <MaterialTable
      data={referrals}
      columns={columns}
      tableName="contact-lead-references"
      hidePagination={true}
      muiTableProps={{ sx: { minWidth: 500 } }}
    />
  );
};

export default ContactLeadReferences;
