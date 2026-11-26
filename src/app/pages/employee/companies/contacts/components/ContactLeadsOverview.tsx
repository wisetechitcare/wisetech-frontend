import React, { useEffect, useState } from "react";
import { DataTable } from '@/ds/patterns/data-table';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getAllLeadStatus } from "@services/lead";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import { getAllClientContacts } from "@services/companies";
import {
  ConfigSectionCard,
  C,
  SP,
} from '@app/modules/configuration';
import { formatCurrencyRounded } from '@utils/currency';

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
    { accessorKey: "description", header: "Description", cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    {
      accessorKey: "assignedToId",
      header: "Assigned To",
      cell: ({ row }: any) => {
        const employee = allEmplooyees?.find(
          (e: any) => e.employeeId === row.original.assignedToId
        );
        return employee?.employeeName || "-NA-";
      },
    },
  
    { accessorKey: "leadType", header: "Lead Type", cell: ({ cell }: any) => cell.getValue() || "-NA-" },
    { accessorKey: "leadSource", header: "Lead Source", cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // companyId → company object (not array)
    {
      accessorKey: "companyId",
      header: "Company",
      cell: () => companies?.companyName || "-NA-",
    },
  
    // statusId → lookup from statuses
    {
      accessorKey: "statusId",
      header: "Status",
      cell: ({ row }: any) => {
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
  
    { accessorKey: "priority", header: "Priority", cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // budget as INR
    {
      accessorKey: "budget",
      header: "Budget",
      cell: ({ cell }: { cell: any }) => {
        const amt = parseFloat(cell.getValue() ?? "");
        return isNaN(amt)
          ? "-NA-"
          : formatCurrencyRounded(amt);
      },
    },
  
    { accessorKey: "notes", header: "Notes", cell: ({ cell }: any) => cell.getValue() || "-NA-" },
  
    // Dates
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "-NA-";
      },
    },
  
    // contactId → lookup from contacts
    {
      accessorKey: "contactId",
      header: "Contact",
      cell: ({ row }: any) => {
        const contact = contacts?.find((c: any) => c.id === row.original.contactId);
        return contact?.fullName || "-NA-";
      },
    },
  
    // createdById → lookup from employees
    {
      accessorKey: "createdById",
      header: "Created By",
      cell: ({ row }: any) => {
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
      cell: ({ row }: any) => {
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
        badge={{ label: `${leadCount}` }}
      >
        <div style={{ marginTop: SP.md }}>
          <DataTable
            caption="Contact Leads"
            data={contact?.leads || []}
            columns={columns}
            getRowId={(r: any) => r.id}
            stateKey="crm.contactLeads"
            groupableColumns={false}
            rowTone={(r: any) => {
              const status = statuses?.find((s: any) => s.id === r.statusId);
              if (!status?.color) return undefined;
              return status.color.startsWith("#") ? status.color : `#${status.color}`;
            }}
            searchPlaceholder="Search leads…"
          />
        </div>
      </ConfigSectionCard>
    </div>
  );
};

export default ContactLeadsOverview;
