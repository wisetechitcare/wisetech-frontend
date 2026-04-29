import React, { useEffect, useState } from "react";
import MaterialTable from "@app/modules/common/components/MaterialTable"; // this is really MRT
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { getLeadsByCompanyId } from "@services/lead";
import dayjs from "dayjs";
import Loader from "@app/modules/common/utils/Loader";
import { getAllClientContacts } from "@services/companies";

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
  const employeeId = useSelector(
    (s: RootState) => s.auth?.currentUser?.id
  );

  const allEmplooyees = useSelector((state:RootState)=>state.allEmployees?.list)
  
  useEffect(()=>{
    setLoading(true);
    getAllClientContacts()
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
    { accessorKey: "title", header: "Title" },
    { accessorKey: "description", header: "Description" },
    { accessorKey: "assignedToId", header: "Assigned To", Cell: ({ row }: any) => {
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
      Cell: ({ row }: { row: any }) => {
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
    {
      accessorKey: "budget",
      header: "Budget",
      Cell: ({ cell }: { cell: any }) => {
        const amt = parseFloat(cell.getValue() ?? "");
        return isNaN(amt)
          ? "—"
          : new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(amt);
      },
    },

    { accessorKey: "notes", header: "Notes" },

    // dates formatted
    {
      accessorKey: "inquiryDate",
      header: "Inquiry Date",
      Cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "—";
      },
    },
    {
      accessorKey: "closingDate",
      header: "Closing Date",
      Cell: ({ cell }: { cell: any }) => {
        const d = cell.getValue() as string | null;
        return d ? dayjs(d).format("DD-MM-YYYY") : "—";
      },
    },

    { accessorKey: "contactId", header: "Contact", Cell: ({ row }: any) => {
      const contact = contacts?.find((c: any) => c.id === row.original.contactId);
      return contact?.fullName || "-";
    } },
    // { accessorKey: "projectId", header: "Project" },
    { accessorKey: "createdById", header: "Created By", Cell: ({ row }: any) => {
      const employee = allEmplooyees?.find((e: any) => e.employeeId === row.original.createdById);
      return employee?.employeeName || "-";
    } },
    { accessorKey: "updatedById", header: "Updated By", Cell: ({ row }: any) => {
      const employee = allEmplooyees?.find((e: any) => e.employeeId === row.original.updatedById);
      return employee?.employeeName || "-";
    } },
  ];

  if (loading) return <Loader />;

  return (
    <MaterialTable
    data={leads}
    columns={columns}
    tableName="Company Leads"
    employeeId={employeeId}
    muiTableProps={{
      sx: {
        borderCollapse: "separate",
        borderSpacing: "0 20px !important", // 20px vertical spacing between rows
      },
      muiTableBodyRowProps: ({ row }: any) => {
        const status = row.original?.status;
        if (!status) return {};
  
        const hex = status.color?.startsWith("#")
          ? status.color
          : `#${status.color}`;
  
        return {
          sx: {
            cursor: "pointer",
            backgroundColor: `${hex}40`,
            color: "#333",
            padding: "10px !important",
  
            "& .MuiTableCell-root": {
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "14px",
              fontFamily: "Inter",
              fontWeight: "400",
              padding: "8px 16px !important",
              borderBottom: "2px solid white",
              borderTop: "2px solid white",
            },
  
            "& .MuiTableCell-root:first-of-type": {
              borderTopLeftRadius: "12px",
              borderBottomLeftRadius: "12px",
              borderLeft: "3px solid white",
            },
  
            "& .MuiTableCell-root:last-of-type": {
              borderTopRightRadius: "12px",
              borderBottomRightRadius: "12px",
              borderRight: "3px solid white",
            },
  
            "&:hover": {
              backgroundColor: `${hex}99`,
              "& td": {
                color: "black",
              },
            },
          },
        };
      },
    }}
  />
  
  );
};

export default CompaniesLeads;
