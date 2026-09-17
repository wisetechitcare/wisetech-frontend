import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { Box, Theme } from "@mui/material";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { dateSortingFn } from "@app/modules/common/components/table/dateSort";
import {
  getAllProjectCategories,
  getAllProjectServices,
  getAllProjectSubcategories,
} from "@services/projects";
import { getAllClientCompanies, getAllClientContacts } from "@services/companies";
import { currencyPrefix } from "@utils/currency";
import { AppDispatch, RootState } from "@redux/store";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import { getProjectPhase, isDelayedProject, projectNumberOf } from "../../entity/entityUtils";

/**
 * The Projects table — columns, status pill and row styling — shared by the Projects
 * page and the Company / Contact → Projects tabs so they render identically.
 * Rows must be in the Projects-page shape (projectStartDate, projectPrefix, …).
 */

type Named = { id: string; name: string };
export type ProjectColumnLookups = {
  categories: Named[];
  subcategories: Named[];
  services: Named[];
  pmNames: (row: any) => string;
};

export const buildProjectColumns = ({ categories, subcategories, services, pmNames }: ProjectColumnLookups): any[] => [
  {
    accessorKey: "projectStartDate",
    header: "Start Date",
    // Explicit defaultVisible:true — with the Inquiry Date column removed the
    // preference reconciliation re-applies meta rules, forcing this column on
    // even for users whose saved prefs still have it hidden.
    meta: { defaultVisible: true },
    size: 140,
    enableSorting: true,
    // "N/A" sorts as oldest so dated rows lead the default (desc) view, and
    // same-date rows break the tie on project number instead of arriving in
    // whatever order the DB returned. See dateSort.ts.
    sortingFn: dateSortingFn,
    Cell: ({ cell }: { cell: any }) => {
      const v = cell.getValue();
      if (!v || v === "N/A") return "N/A";
      const date = dayjs(v);
      return date.isValid() ? date.format("DD-MM-YYYY") : "N/A";
    },
  },
  {
    accessorKey: "projectPrefix",
    header: "Project Number",
    size: 220,
    Cell: ({ row }: { row: any }) => (
      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
        {row.original.projectPrefix || "N/A"}
      </span>
    ),
  },
  {
    accessorKey: "projectName",
    header: "Project Name",
    size: 360,
    minSize: 360,
    Cell: ({ cell }: { cell: any }) => {
      const v = cell.getValue();
      return (
        <span style={{ whiteSpace: "nowrap" }}>
          {typeof v === "object" ? JSON.stringify(v) : v || "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "client",
    header: "Client Company",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) => {
      const v = cell.getValue();
      return typeof v === "object" ? v.name || "N/A" : v || "N/A";
    },
  },
  {
    accessorKey: "contact",
    header: "Contact",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) => {
      const v = cell.getValue();
      return typeof v === "object" ? v?.name || v?.email || "N/A" : v || "N/A";
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) =>
      categories?.find((c) => c.id === cell.getValue())?.name || "N/A",
  },
  {
    accessorKey: "subCategory",
    header: "Subcategory",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) =>
      subcategories?.find((s) => s.id === cell.getValue())?.name || "N/A",
  },
  {
    accessorKey: "projectStatus",
    header: "Project Status",
    size: 150,
    Cell: ({ row }: any) => {
      const st = row?.original?.projectStatus;
      return st?.name ? (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          backgroundColor: st.color || '#64748B',
          borderRadius: '16px', padding: '4px 10px 4px 8px',
        }}>
          <Box sx={{ width: '8px', height: '8px', borderRadius: '50%', bgcolor: 'common.white' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{st.name}</span>
        </div>
      ) : (
        "N/A"
      );
    },
  },
  {
    accessorKey: "poStatus",
    header: "PO Status",
    meta: { defaultVisible: false },
    size: 130,
    Cell: ({ cell }: { cell: any }) => {
      const poStatus = cell.getValue();
      if (!poStatus) return "N/A";
      const received = poStatus === "Received";
      return (
        <span style={{
          display: "inline-block", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", fontWeight: 600,
          backgroundColor: received ? "#28A745" : "#FFC107", color: received ? "white" : "#333",
        }}>
          {poStatus}
        </span>
      );
    },
  },
  {
    accessorKey: "projectEndDate",
    header: "End Date",
    meta: { defaultVisible: false },
    size: 150,
    enableSorting: true,
    sortingFn: dateSortingFn,
    Cell: ({ row }: { row: any }) => {
      const v = row.original.projectEndDate;
      if (!v || v === "N/A") return "N/A";
      const date = dayjs(v);
      if (!date.isValid()) return "N/A";
      return (
        <span style={{ color: row.original.isDelayed ? "#D92D20" : undefined, fontWeight: row.original.isDelayed ? 600 : undefined }}>
          {date.format("DD-MM-YYYY")}
          {row.original.isDelayed ? " ⚠" : ""}
        </span>
      );
    },
  },
  {
    accessorKey: "duration",
    header: "Timeline",
    meta: { defaultVisible: false },
    size: 120,
    Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
  },
  {
    accessorKey: "projectCost",
    header: "Budget",
    meta: { defaultVisible: false },
    size: 130,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? `${currencyPrefix()}${Number(cell.getValue()).toLocaleString()}` : `${currencyPrefix()}0`,
  },
  {
    accessorKey: "totalCost",
    header: "Cost",
    meta: { defaultVisible: false },
    size: 130,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? `${currencyPrefix()}${Number(cell.getValue()).toLocaleString()}` : `${currencyPrefix()}0`,
  },
  {
    accessorKey: "projectArea",
    header: "Area",
    meta: { defaultVisible: false },
    size: 120,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? `${Number(cell.getValue()).toLocaleString()} SFT` : "N/A",
  },
  {
    accessorKey: "projectRate",
    header: "Rate",
    meta: { defaultVisible: false },
    size: 110,
    Cell: ({ cell }: { cell: any }) => {
      const v = Number(cell.getValue());
      return v ? `${currencyPrefix()}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
    },
  },
  {
    accessorKey: "projectManagerId",
    header: "Project Manager",
    meta: { defaultVisible: true },
    size: 160,
    accessorFn: (row: any) => pmNames(row) || "",
    Cell: ({ row }: { row: any }) => pmNames(row.original) || "N/A",
  },
  {
    accessorKey: "projectTeamName",
    header: "Team",
    meta: { defaultVisible: false },
    size: 140,
    Cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
  },
  {
    accessorKey: "service",
    header: "Service",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) =>
      services?.find((s) => s.id === cell.getValue())?.name || "N/A",
  },
  {
    accessorKey: "createdAt",
    header: "Created Date",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
  },
  {
    accessorKey: "updatedAt",
    header: "Updated Date",
    meta: { defaultVisible: false },
    size: 150,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
  },
  {
    accessorKey: "projectIsLive",
    header: "Live",
    meta: { defaultVisible: false },
    size: 80,
    Cell: ({ cell }: { cell: any }) =>
      cell.getValue() ? <span style={{ color: "#0A5C2A", fontWeight: 600 }}>Live</span> : <span style={{ color: "#64748B" }}>On Hold</span>,
  },
];

// `20` alpha keeps the tint light enough that the solid status pill never blends in.
const rowBackground = (row: any) => {
  const statusColor = row?.projectStatus?.color || row?.status?.color;
  return statusColor ? `${statusColor}20` : "#F1F5F9";
};

// Theme surface (near-white in light mode, dark surface in dark mode).
const hoverBg = (theme: Theme) => `${theme.palette.background.paper} !important`;

/** Layout + row styling props for <MaterialTable>, spread onto it. */
export const projectTableProps = (onRowClick: (row: any) => void) => ({
  enableColumnResizing: true,
  layoutMode: "semantic" as const,
  muiTableContainerProps: {
    sx: { maxHeight: "700px", overflowX: "auto" },
  },
  muiTableProps: {
    sx: {
      borderCollapse: "separate",
      borderSpacing: "0 4px !important",
      minWidth: "1600px",
    },
    muiTableBodyRowProps: ({ row }: any) => ({
      sx: {
        cursor: "pointer",
        backgroundColor: rowBackground(row.original),
        transition: "all 0.2s ease",
        "& .MuiTableCell-root": {
          fontSize: "15.5px",
          fontFamily: "Inter",
          fontWeight: "500",
          padding: "4px 8px !important",
          border: "none",
          color: "#333",
          whiteSpace: "nowrap",
        },
        "&:hover": {
          backgroundColor: hoverBg,
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          "& .MuiTableCell-root": {
            backgroundColor: hoverBg,
          },
        },
      },
      // The path carries the project context — see the /project/:id route.
      onClick: () => onRowClick(row.original),
    }),
  },
});

/** Manager names for a row, primary first, comma-separated. */
export const managerNames = (row: any, employees: any[] | undefined): string =>
  (row?.projectManagerIds?.length ? row.projectManagerIds : [row?.projectManagerId])
    .filter((id: any) => id && id !== "N/A")
    .map((id: string) => employees?.find((e: any) => e.employeeId === id)?.employeeName)
    .filter(Boolean)
    .join(", ");

/**
 * Company / Contact → Projects tab. Takes the rows of `getReceivedLeadsAsProjects`
 * (a lead with `status` already swapped for the project status) and reshapes them
 * into the Projects-page row so the shared columns and date sort work unchanged.
 */
export const ProjectListTable = ({ projects, tableName }: { projects: any[]; tableName: string }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const employeeId = useSelector((state: RootState) => state.auth?.currentUser?.id);
  const employees = useSelector((state: RootState) => state.allEmployees?.list);

  const [categories, setCategories] = useState<Named[]>([]);
  const [subcategories, setSubcategories] = useState<Named[]>([]);
  const [services, setServices] = useState<Named[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    dispatch(fetchAllEmployeesAsync());
    // All cached requests — cheap when AnalyticsTab re-renders this.
    Promise.all([
      getAllProjectCategories(),
      getAllProjectSubcategories(),
      getAllProjectServices(),
      getAllClientCompanies(),
      getAllClientContacts({}, true),
    ])
      .then(([cat, sub, svc, comp, cont]: any[]) => {
        setCategories(cat?.projectCategories || []);
        setSubcategories(sub?.projectSubCategories || []);
        setServices(svc?.services || []);
        setCompanies(comp?.data?.companies || []);
        setContacts(cont?.data?.contacts || []);
      })
      .catch((err) => console.error("Error fetching project lookups:", err));
  }, [dispatch]);

  const rows = useMemo(() => {
    const nameOf = (list: any[], id: string | null, key: string) =>
      id ? list.find((x: any) => x.id === id)?.[key] : null;
    return (projects || []).map((p: any) => {
      const start = p.startDate || p.receivedDate || null;
      const end = p.actualEndDate || p.endDate || null;
      const duration = start && end
        ? `${Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))} days`
        : "N/A";
      const mappings: any[] = p.projectCompanyMappings || [];
      const ad = p.additionalDetails || {};
      const phaseRow = { ...p, isProject: true };
      return {
        id: p.id,
        projectName: p.title || "N/A",
        projectPrefix: projectNumberOf(p) || "N/A",
        projectStartDate: start || "N/A",
        projectEndDate: end || "N/A",
        duration,
        client: mappings.map((m) => nameOf(companies, m.companyId, "companyName")).filter(Boolean).join(", ") || "N/A",
        contact: mappings.map((m) => nameOf(contacts, m.contactPersonId, "fullName")).filter(Boolean).join(", ") || "N/A",
        category: p.projectCategoryId || "N/A",
        subCategory: p.projectSubCategoryId || "N/A",
        service: p.projectServiceId || "N/A",
        projectStatus: p.status || null,
        poStatus: p.poStatus || null,
        projectCost: Number(p.cost) || p.projectValue || 0,
        totalCost: p.projectValue || 0,
        projectRate: Number(p.rate) || 0,
        projectArea: parseFloat(ad.projectArea) || parseFloat(ad.builtUpArea) || parseFloat(ad.plotArea) || 0,
        projectManagerIds: p.projectManagerIds || [],
        projectManagerId: p.execution?.projectManagerId || "N/A",
        projectTeamName: p.team?.name || "N/A",
        projectIsLive: p.isLive ?? false,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        entityPhase: getProjectPhase(phaseRow),
        isDelayed: isDelayedProject(phaseRow),
      };
    });
  }, [projects, companies, contacts]);

  const columns = useMemo(
    () => buildProjectColumns({ categories, subcategories, services, pmNames: (r) => managerNames(r, employees) }),
    [categories, subcategories, services, employees],
  );

  return (
    <MaterialTable
      data={rows}
      columns={columns}
      tableName={tableName}
      employeeId={employeeId}
      defaultSorting={[{ id: "projectStartDate", desc: true }]}
      {...projectTableProps((row) => navigate(`/project/${row.id}`))}
    />
  );
};
