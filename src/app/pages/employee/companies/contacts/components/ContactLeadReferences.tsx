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
      muiTableProps={{
        sx: { minWidth: 500 },
        muiTableBodyRowProps: ({ row }: any) => {
          const color = row.original?.lead?.status?.color || "#AA393D";
          return {
            sx: {
              cursor: "pointer",
              backgroundColor: `${color}20`,
              transition: "all 0.2s ease",
              "& .MuiTableCell-root": {
                fontSize: "14.5px",
                fontFamily: "Inter",
                fontWeight: 500,
                padding: "6px 8px !important",
                border: "none",
                color: "#333",
                whiteSpace: "nowrap",
              },
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                borderLeft: "3px solid transparent !important",
                transition: "border-color 0.2s ease-in-out !important",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
              },
              "&:hover": {
                backgroundColor: "#F8FAFC !important",
                transform: "translateY(-2px)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                "& .MuiTableCell-root": { backgroundColor: "#F8FAFC !important" },
                "& .MuiTableCell-root:first-of-type": { borderLeftColor: `${color} !important` },
              },
            },
            onClick: () => row.original?.lead?.id && navigate(`/employee/lead/${row.original.lead.id}`),
          };
        },
      }}
    />
  );
};

export default ContactLeadReferences;
