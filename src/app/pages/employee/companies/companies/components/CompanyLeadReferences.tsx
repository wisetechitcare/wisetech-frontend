import React from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  LeadStatusPill,
  leadRowSx,
  leadTableSx,
  UNASSIGNED_ORG_LABEL,
} from "@app/pages/employee/leads/lead/leadTableStyle";

type Person = { firstName?: string; lastName?: string } | null | undefined;

interface LeadReferral {
  id: string;
  lead?: {
    id: string;
    prefix?: string | null;
    title?: string | null;
    createdAt?: string;
    inquiryDate?: string | null;
    status?: { name: string; color?: string | null } | null;
    commercials?: Array<{ cost?: number | string | null }> | null;
    organization?: { name: string } | null;
    assignedTo?: { users?: Person } | null;
  } | null;
  referralType?: { id: string; name: string } | null;
  referredByContact?: { id: string; fullName: string } | null;
  referredByEmployee?: { id: string; users?: Person } | null;
}

const fullName = (u: Person) => [u?.firstName, u?.lastName].filter(Boolean).join(" ");

/**
 * The Lead Reference table, for both a Company and a Contact. Same look and the same
 * core columns as Leads Management, trimmed to what a referral needs — plus the two
 * columns only a referral has (Referral Type, and Referred By on the company side,
 * where several people may have referred on the company's behalf).
 */
const CompanyLeadReferences: React.FC<{
  referrals?: LeadReferral[];
  tableName: string;
  /** A contact IS the referrer, so its table leaves this column out. */
  showReferredBy?: boolean;
}> = ({ referrals = [], tableName, showReferredBy = false }) => {
  const navigate = useNavigate();

  const columns = [
    {
      // Inquiry date is the business date of the lead; createdAt is only a
      // fallback for old rows that never had an inquiry date entered.
      id: "inquiryDate",
      header: "Inquiry Date",
      size: 140,
      accessorFn: (r: LeadReferral) => r.lead?.inquiryDate || r.lead?.createdAt || "",
      Cell: ({ cell }: any) => (cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A"),
    },
    {
      accessorKey: "lead.prefix",
      header: "Inquiry Id",
      size: 180,
      Cell: ({ cell }: any) => <span style={{ fontWeight: 600, fontSize: "14.5px" }}>{cell.getValue() || "N/A"}</span>,
    },
    {
      accessorKey: "lead.title",
      header: "Project Name",
      size: 320,
      Cell: ({ cell }: any) => cell.getValue() || "Untitled lead",
    },
    {
      accessorKey: "referralType.name",
      header: "Referral Type",
      size: 140,
      Cell: ({ cell }: any) => cell.getValue() || "N/A",
    },
    ...(showReferredBy
      ? [
          {
            id: "referredBy",
            header: "Referred By",
            size: 170,
            accessorFn: (r: LeadReferral) =>
              r.referredByContact?.fullName || fullName(r.referredByEmployee?.users) || "N/A",
          },
        ]
      : []),
    {
      accessorKey: "lead.status.name",
      header: "Lead Status",
      size: 150,
      Cell: ({ row }: any) => <LeadStatusPill status={row.original.lead?.status} />,
    },
    {
      id: "totalCost",
      header: "Total Cost",
      size: 130,
      accessorFn: (r: LeadReferral) =>
        (r.lead?.commercials || []).reduce((sum, c) => sum + (Number(c?.cost) || 0), 0),
      Cell: ({ cell }: any) => `₹${Number(cell.getValue()).toLocaleString()}`,
    },
    {
      id: "organization",
      header: "Organization",
      size: 170,
      accessorFn: (r: LeadReferral) => r.lead?.organization?.name || UNASSIGNED_ORG_LABEL,
    },
    {
      id: "assignedTo",
      header: "Assigned To",
      size: 160,
      accessorFn: (r: LeadReferral) => fullName(r.lead?.assignedTo?.users) || "N/A",
    },
  ];

  return (
    <MaterialTable
      data={referrals}
      columns={columns}
      tableName={tableName}
      hidePagination={true}
      defaultSorting={[{ id: "inquiryDate", desc: true }]}
      layoutMode="semantic"
      muiTableContainerProps={{ sx: { overflowX: "auto" } }}
      muiTableProps={{
        sx: leadTableSx,
        muiTableBodyRowProps: ({ row }: any) => ({
          sx: leadRowSx(row.original?.lead?.status?.color),
          onClick: () => row.original?.lead?.id && navigate(`/leads/${row.original.lead.id}`),
        }),
      }}
    />
  );
};

export default CompanyLeadReferences;
