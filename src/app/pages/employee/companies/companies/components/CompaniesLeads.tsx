import React, { useEffect, useState } from "react";
import { DataTable } from '@/ds/patterns/data-table';
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getLeadsByCompanyId } from "@services/lead";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import { getAllClientContacts } from "@services/companies";
import { useOpenRecord } from "@hooks/useOpenRecord";
import { Button } from "@/ds/ui/button";
import { formatCurrencyRounded } from '@utils/currency';
import { canViewCommercial } from '@utils/can';

type Lead = {
  budget: string;
  inquiryDate: string | null;
  closingDate: string | null;
  company: { companyName: string };
  status: { name: string; color: string };
};

const CompaniesLeads: React.FC<{ companyId: string }> = ({ companyId }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { canOpen, openRecord } = useOpenRecord();
  const allEmplooyees = useSelector((state:RootState)=>state.allEmployees?.list)
  
  useEffect(()=>{
    setLoading(true);
    getAllClientContacts({}, true)
      .then((res) => setContacts(res.data.contacts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);
  

  useEffect(() => {
    setLoading(true);
    getLeadsByCompanyId(companyId)
      .then((res) => setLeads(res.data.leads || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId]);

  const columns = [
    {
  accessorKey: "title",
  header: "Title",
  cell: ({ row }: any) => (
    <Button
      variant="link"
      className="h-auto p-0 whitespace-normal text-start"
      title={canOpen(row.original.id, row.original.status?.isProjectTrigger) ? undefined : "You're not authorized to open this lead"}
      onClick={() => openRecord(row.original.id, !!row.original.status?.isProjectTrigger, `/leads/${row.original.id}`)}
    >
      {row.original.title}
    </Button>
  ),
},
    { accessorKey: "description", header: "Description" },
    { accessorKey: "assignedToId", header: "Assigned To", cell: ({ row }: any) => {
      const employee = allEmplooyees?.find((e: any) => e.employeeId === row.original.assignedToId);
      return employee?.employeeName || "-";
    }},
    { accessorKey: "leadType", header: "Lead Type" },
    { accessorKey: "sourceId", header: "Source" },

    // company.companyName is nested; MRT supports that out of the box
    { accessorKey: "company.companyName", header: "Company" },

    // status.name is nested; we override Cell to render a badge
    {
      accessorKey: "status.name",
      header: "Status",
      cell: ({ row }: { row: any }) => {
        const status = row.original.status;
        if (!status) return "—";
        const hex = status.color.startsWith("#")
          ? status.color
          : `#${status.color}`;
        return (
          <span
            className="px-2 py-1 rounded border-2 inline-block min-w-[80px] text-center"
            style={{
              borderColor: hex,
              // color: hex,
              backgroundColor: `${hex}80`,
            }}
          >
            {status.name}
          </span>
        );
      },
    },

    { accessorKey: "priority", header: "Priority" },

    // budget as INR
    ...(canViewCommercial('crm.leads') ? [{
      accessorKey: "budget",
      header: "Budget",
      cell: ({ cell }: { cell: any }) => {
        const amt = parseFloat(cell.getValue() ?? "");
        return isNaN(amt)
          ? "—"
          : formatCurrencyRounded(amt);
      },
    }] : []),

    { accessorKey: "notes", header: "Notes" },

    // dates formatted
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "—";
      },
    },
    {
      accessorKey: "closingDate",
      header: "Closing Date",
      cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "—";
      },
    },

    { accessorKey: "contactId", header: "Contact", cell: ({ row }: any) => {
      const contact = contacts?.find((c: any) => c.id === row.original.contactId);
      return contact?.fullName || "-";
    } },
    // { accessorKey: "projectId", header: "Project" },
    { accessorKey: "createdById", header: "Created By", cell: ({ row }: any) => {
      const employee = allEmplooyees?.find((e: any) => e.employeeId === row.original.createdById);
      return employee?.employeeName || "-";
    } },
    { accessorKey: "updatedById", header: "Updated By", cell: ({ row }: any) => {
      const employee = allEmplooyees?.find((e: any) => e.employeeId === row.original.updatedById);
      return employee?.employeeName || "-";
    } },
  ];

  if (loading) return <Loader />;

  return (
    <DataTable
      caption="Company Leads"
      data={leads}
      columns={columns}
      getRowId={(r: any) => r.id}
      initialSorting={[{ id: "title", desc: false }]}
      stateKey="crm.companyLeads"
      groupableColumns={false}
      rowTone={(r: any) => r?.status?.color || undefined}
      searchPlaceholder="Search leads…"
    />
  );
};

export default CompaniesLeads;
