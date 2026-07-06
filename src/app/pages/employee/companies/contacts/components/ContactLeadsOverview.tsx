import React, { useEffect, useState } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAllLeadStatus } from "@services/lead";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import { getAllClientContacts } from "@services/companies";
import {
  ConfigSectionCard,
  C,
  FONT,
  SP,
  RADIUS,
} from '@app/modules/configuration';

type Lead = {
  budget: string;
  inquiryDate: string | null;
  closingDate: string | null;
  company: { companyName: string };
  status: { name: string; color: string };
};

const ContactLeadsOverview: React.FC<{ contact: any }> = ({ contact }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const employeeId = useSelector(
    (s: RootState) => s.auth?.currentUser?.id
  );
  const companies = contact?.company;


  const allEmplooyees = useSelector((state:RootState)=>state.allEmployees?.list)

  useEffect(()=>{
    setLoading(true);
    getAllClientContacts({}, true)
      .then((res) => setContacts(res.data.contacts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(()=>{
    setLoading(true);
    getAllLeadStatus()
      .then((res) => setStatuses(res?.leadStatuses || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  

  const columns = [
    { accessorKey: "title", header: "Title" },
    { accessorKey: "description", header: "Description", Cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    {
      accessorKey: "assignedToId",
      header: "Assigned To",
      Cell: ({ row }: any) => {
        const employee = allEmplooyees?.find(
          (e: any) => e.employeeId === row.original.assignedToId
        );
        return employee?.employeeName || "-NA-";
      },
    },
  
    { accessorKey: "leadType", header: "Lead Type", Cell: ({ cell }: any) => cell.getValue() || "-NA-" },
    { accessorKey: "leadSource", header: "Lead Source", Cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // companyId → company object (not array)
    {
      accessorKey: "companyId",
      header: "Company",
      Cell: () => companies?.companyName || "-NA-",
    },
  
    // statusId → lookup from statuses
    {
      accessorKey: "statusId",
      header: "Status",
      Cell: ({ row }: any) => {
        const status = statuses?.find((s: any) => s.id === row.original.statusId);
        if (!status) return "-NA-";
        const hex = status.color?.startsWith("#") ? status.color : `#${status.color}`;
        return (
          <span
            className="px-2 py-1 rounded border-2 inline-block min-w-[80px] text-center"
            style={{
              borderColor: hex,
              backgroundColor: `${hex}50`,
            }}
          >
            {status.name}
          </span>
        );
      },
    },
  
    { accessorKey: "priority", header: "Priority", Cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // budget as INR
    {
      accessorKey: "budget",
      header: "Budget",
      Cell: ({ cell }: { cell: any }) => {
        const amt = parseFloat(cell.getValue() ?? "");
        return isNaN(amt)
          ? "-NA-"
          : new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(amt);
      },
    },
  
    { accessorKey: "notes", header: "Notes", Cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // Dates
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      Cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      Cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      Cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
  
    // contactId → lookup from contacts
    {
      accessorKey: "contactId",
      header: "Contact",
      Cell: ({ row }: any) => {
        const contact = contacts?.find((c: any) => c.id === row.original.contactId);
        return contact?.fullName || "-NA-";
      },
    },
  
    // createdById → lookup from employees
    {
      accessorKey: "createdById",
      header: "Created By",
      Cell: ({ row }: any) => {
        const employee = allEmplooyees?.find(
          (e: any) => e.employeeId === row.original.createdById
        );

        return employee?.employeeName || "-NA-";
      },
    },
  
    // updatedById → lookup from employees
    {
      accessorKey: "updatedById",
      header: "Updated By",
      Cell: ({ row }: any) => {
        const employee = allEmplooyees?.find(
          (e: any) => e.employeeId === row.original.updatedById
        );
        return employee?.employeeName || "-NA-";
      },
    },
  ];
  
  

  const leadCount = contact?.leads?.length || 0;

  if (loading) return <Loader />;

  return (
    <div style={{ backgroundColor: C.bgPage, minHeight: 'auto', padding: `${SP.lg} 0` }}>
      <ConfigSectionCard
        title="Lead Opportunities"
        description={`${leadCount} lead${leadCount !== 1 ? 's' : ''} associated with this contact`}
        icon="bi-graph-up"
        iconColor="primary"
        badge={{ label: `${leadCount}`, bg: C.primaryLight, color: C.primary }}
        variant="default"
        compact={false}
      >
        <div style={{ marginTop: SP.md }}>
          <MaterialTable
            data={contact?.leads || []}
            columns={columns}
            tableName="Contact Leads"
            employeeId={employeeId}
            muiTableProps={{
              sx: {
                borderCollapse: "separate",
                borderSpacing: "0 8px !important",
                '& .MuiTableHead-root': {
                  '& .MuiTableCell-root': {
                    backgroundColor: C.bgSection,
                    borderRadius: `${RADIUS.sm} ${RADIUS.sm} 0 0`,
                    fontWeight: 600,
                    fontSize: '13px',
                    color: C.textPrimary,
                    fontFamily: FONT.body,
                    borderBottom: `1px solid ${C.border}`,
                    padding: '12px 16px !important',
                  },
                },
              },
              muiTableBodyRowProps: ({ row }: any) => {
                const status = statuses?.find((s: any) => s.id === row.original.statusId);
                if (!status) return {};

                const hex = status.color?.startsWith("#")
                  ? status.color
                  : `#${status.color}`;

                return {
                  sx: {
                    cursor: "pointer",
                    backgroundColor: `${hex}25`,
                    color: C.textPrimary,
                    padding: "8px !important",
                    borderRadius: RADIUS.lg,
                    border: `1px solid ${hex}40`,
                    transition: 'all 0.2s ease',

                    "& .MuiTableCell-root": {
                      fontSize: "13px",
                      fontFamily: FONT.body,
                      fontWeight: "400",
                      padding: "10px 14px !important",
                      border: 'none',
                      color: C.textPrimary,
                    },

                    "&:hover": {
                      backgroundColor: `${hex}40`,
                      boxShadow: `0 4px 12px ${hex}30`,
                      border: `1px solid ${hex}60`,
                      transform: 'translateY(-1px)',
                      "& td": {
                        color: C.textPrimary,
                        fontWeight: 500,
                      },
                    },
                  },
                };
              },
            }}
          />
        </div>
      </ConfigSectionCard>
    </div>
  );
};

export default ContactLeadsOverview;
