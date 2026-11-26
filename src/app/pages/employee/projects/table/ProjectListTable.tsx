import { ProjectAvatar } from "@app/modules/project-gallery/ProjectAvatar";
import { initialsOf } from "@app/modules/project-gallery/media";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useOpenRecord } from "@hooks/useOpenRecord";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { DataTable, type ColumnDef } from "@/ds/patterns/data-table";
import { Badge } from "@/ds/ui/badge";
import { dateSortingFn } from "@app/modules/common/components/table/dateSort";
import {
  getAllProjectCategories,
  getAllProjectServices,
  getAllProjectSubcategories,
} from "@services/projects";
import { getAllClientCompanies, getAllClientContacts } from "@services/companies";
import { currencyPrefix } from "@utils/currency";
import { canViewCommercial } from "@utils/can";
import { AppDispatch, RootState } from "@redux/store";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import { getProjectPhase, isDelayedProject, projectNumberOf } from "../../entity/entityUtils";

/**
 * The Projects table — columns, status pill and row styling — shared by the Projects
 * page and the Company / Contact → Projects tabs so they render identically.
 * Rows must be in the Projects-page shape (projectStartDate, projectPrefix, …).
 */

type Named = { id: string; name: string };

/**
 * Every category id a lead carries (it can have several, one row each in lead_categories).
 * The legacy scalar projectCategoryId only stands in when there are no rows - the same rule the
 * Top Categories chart uses, so the table lists what the chart counts.
 */
export const categoryIdsOf = (lead: any): string[] => {
  const joined = (lead?.leadCategories ?? [])
    .map((r: any) => r?.category?.id ?? r?.categoryId)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (joined.length) return [...new Set<string>(joined)];
  const scalar = lead?.projectCategoryId;
  return scalar && scalar !== "N/A" ? [scalar] : [];
};

/** Same rule as categoryIdsOf — every service on the lead (join first, then scalar). */
export const serviceIdsOf = (lead: any): string[] => {
  const joined = (lead?.services ?? [])
    .map((r: any) => r?.serviceId ?? r?.service?.id)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (joined.length) return [...new Set<string>(joined)];
  const scalar = lead?.projectServiceId;
  return scalar && scalar !== "N/A" ? [scalar] : [];
};

/** Same rule as categoryIdsOf — every sub-category on the lead (join first, then scalar). */
export const subCategoryIdsOf = (lead: any): string[] => {
  const joined = (lead?.leadSubCategories ?? [])
    .map((r: any) => r?.subcategory?.id ?? r?.subcategoryId)
    .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
  if (joined.length) return [...new Set<string>(joined)];
  const scalar = lead?.projectSubCategoryId;
  return scalar && scalar !== "N/A" ? [scalar] : [];
};
export type ProjectColumnLookups = {
  categories: Named[];
  subcategories: Named[];
  services: Named[];
  pmNames: (row: any) => string;
};

/** Resolve id list → "Name1, Name2" for table search (DataTable searches accessor / exportValue text). */
const namesOf = (ids: string[] | undefined, list: Named[], fallbackId?: string): string => {
  const resolved =
    ids?.length ? ids : fallbackId && fallbackId !== "N/A" ? [fallbackId] : [];
  return resolved
    .map((id) => list.find((x) => x.id === id)?.name)
    .filter((n): n is string => Boolean(n))
    .join(", ");
};

export const buildProjectColumns = ({
  categories,
  subcategories,
  services,
  pmNames,
}: ProjectColumnLookups): ColumnDef<any, any>[] =>
  [
    {
      accessorKey: "projectStartDate",
      header: "Start Date",
      // Explicit defaultVisible:true — with the Inquiry Date column removed the
      // preference reconciliation re-applies meta rules, forcing this column on
      // even for users whose saved prefs still have it hidden.
      meta: { label: "Start Date", defaultVisible: true },
      size: 140,
      enableSorting: true,
      // "N/A" sorts as oldest so dated rows lead the default (desc) view, and
      // same-date rows break the tie on project number instead of arriving in
      // whatever order the DB returned. See dateSort.ts.
      sortFn: dateSortingFn,
      cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        if (!v || v === "N/A") return "N/A";
        const date = dayjs(v);
        return date.isValid() ? date.format("DD-MM-YYYY") : "N/A";
      },
    },
    {
      accessorKey: "projectPrefix",
      header: "Project Number",
      meta: { label: "Project Number" },
      size: 220,
      cell: ({ row }: { row: any }) => (
        <span className="font-semibold whitespace-nowrap">
          {row.original.projectPrefix || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "projectName",
      header: "Project Name",
      meta: { label: "Project Name" },
      size: 360,
      minSize: 360,
      cell: ({ cell, row }: { cell: any; row: any }) => {
        const v = cell.getValue();
        const name = typeof v === "object" ? JSON.stringify(v) : v || "N/A";
        return (
          <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
            <ProjectAvatar src={row.original.coverImageUrl} label={initialsOf(name)} className="size-8 text-xs" />
            {name}
          </span>
        );
      },
    },
    {
      accessorKey: "client",
      header: "Client Company",
      meta: { label: "Client Company", defaultVisible: false },
      size: 150,
      cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === "object" ? v.name || "N/A" : v || "N/A";
      },
    },
    {
      accessorKey: "contact",
      header: "Contact",
      meta: { label: "Contact", defaultVisible: false },
      size: 150,
      cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === "object" ? v?.name || v?.email || "N/A" : v || "N/A";
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      meta: { label: "Category", defaultVisible: false },
      size: 150,
      // Search must see "MOEF", not the category UUID stored on the row.
      accessorFn: (row: any) => namesOf(row.categoryIds, categories, row.category),
      cell: ({ row }: { row: any }) => namesOf(row.original?.categoryIds, categories, row.original?.category) || "N/A",
    },
    {
      accessorKey: "subCategory",
      header: "Subcategory",
      meta: { label: "Subcategory", defaultVisible: false },
      size: 150,
      accessorFn: (row: any) => namesOf(row.subCategoryIds, subcategories, row.subCategory),
      cell: ({ row }: { row: any }) =>
        namesOf(row.original?.subCategoryIds, subcategories, row.original?.subCategory) || "N/A",
    },
    {
      accessorKey: "projectStatus",
      header: "Project Status",
      meta: {
        label: "Project Status",
        exportValue: (row: any) => row?.projectStatus?.name || "",
      },
      size: 150,
      accessorFn: (row: any) => row?.projectStatus?.name || "",
      cell: ({ row }: any) => {
        const st = row?.original?.projectStatus;
        return st?.name ? (
          <Badge
            variant="custom"
            dot
            style={{ "--tone": st.color || "#64748B" } as CSSProperties}
          >
            {st.name}
          </Badge>
        ) : (
          "N/A"
        );
      },
    },
    {
      accessorKey: "poStatus",
      header: "PO Status",
      meta: { label: "PO Status", defaultVisible: false },
      size: 130,
      cell: ({ cell }: { cell: any }) => {
        const poStatus = cell.getValue();
        if (!poStatus) return "N/A";
        return (
          <Badge variant={poStatus === "Received" ? "success" : "warning"}>
            {poStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: "projectEndDate",
      header: "End Date",
      meta: { label: "End Date", defaultVisible: false },
      size: 150,
      enableSorting: true,
      sortFn: dateSortingFn,
      cell: ({ row }: { row: any }) => {
        const v = row.original.projectEndDate;
        if (!v || v === "N/A") return "N/A";
        const date = dayjs(v);
        if (!date.isValid()) return "N/A";
        return (
          <span className={row.original.isDelayed ? "font-semibold text-destructive" : undefined}>
            {date.format("DD-MM-YYYY")}
            {row.original.isDelayed ? " ⚠" : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Timeline",
      meta: { label: "Timeline", defaultVisible: false },
      size: 120,
      cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "projectCost",
      header: "Budget",
      meta: { label: "Budget", defaultVisible: false, exportType: "currency" as const, exportTotal: true },
      size: 130,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? `${currencyPrefix()}${Number(cell.getValue()).toLocaleString()}` : `${currencyPrefix()}0`,
    },
    {
      accessorKey: "totalCost",
      header: "Cost",
      meta: { label: "Cost", defaultVisible: false, exportType: "currency" as const, exportTotal: true },
      size: 130,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? `${currencyPrefix()}${Number(cell.getValue()).toLocaleString()}` : `${currencyPrefix()}0`,
    },
    {
      accessorKey: "projectArea",
      header: "Area",
      meta: { label: "Area (SFT)", defaultVisible: false, exportType: "number" as const, exportTotal: true },
      size: 120,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? `${Number(cell.getValue()).toLocaleString()} SFT` : "N/A",
    },
    {
      accessorKey: "projectRate",
      header: "Rate",
      meta: { label: "Rate", defaultVisible: false, exportType: "currency" as const },
      size: 110,
      cell: ({ cell }: { cell: any }) => {
        const v = Number(cell.getValue());
        return v ? `${currencyPrefix()}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "N/A";
      },
    },
    {
      accessorKey: "projectManagerId",
      header: "Project Manager",
      meta: {
        label: "Project Manager",
        defaultVisible: true,
        exportValue: (row: any) => pmNames(row) || "",
      },
      size: 160,
      accessorFn: (row: any) => pmNames(row) || "",
      cell: ({ row }: { row: any }) => pmNames(row.original) || "N/A",
    },
    {
      accessorKey: "projectTeamName",
      header: "Team",
      meta: { label: "Team", defaultVisible: false },
      size: 140,
      cell: ({ cell }: { cell: any }) => cell.getValue() || "N/A",
    },
    {
      accessorKey: "service",
      header: "Service",
      meta: { label: "Service", defaultVisible: false },
      size: 150,
      accessorFn: (row: any) => namesOf(row.serviceIds, services, row.service),
      cell: ({ row }: { row: any }) => namesOf(row.original?.serviceIds, services, row.original?.service) || "N/A",
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      meta: { label: "Created Date", defaultVisible: false },
      size: 150,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
    },
    {
      accessorKey: "updatedAt",
      header: "Updated Date",
      meta: { label: "Updated Date", defaultVisible: false },
      size: 150,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
    },
    {
      accessorKey: "projectIsLive",
      header: "Live",
      meta: {
        label: "Live",
        defaultVisible: false,
        exportValue: (row: any) => (row?.projectIsLive ? "Live" : "On Hold"),
      },
      size: 80,
      cell: ({ cell }: { cell: any }) =>
        cell.getValue() ? (
          <span className="font-semibold text-success-foreground">Live</span>
        ) : (
          <span className="text-muted-foreground">On Hold</span>
        ),
    },
  ].filter(
    (col) =>
      canViewCommercial("projects") ||
      !["projectCost", "totalCost", "projectRate"].includes(String(col.accessorKey)),
  );

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
  // Every project with this company / contact is listed; only this person's own open.
  const { canOpen, openRecord } = useOpenRecord();
  const dispatch = useDispatch<AppDispatch>();
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
      // Received Date is the day the lead became a project — that is its start.
      // startDate was imported equal to inquiryDate on old rows, so it only stands in.
      const start = p.receivedDate || p.startDate || null;
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
        coverImageUrl: p.coverImageUrl || null,
        projectPrefix: projectNumberOf(p) || "N/A",
        projectStartDate: start || "N/A",
        projectEndDate: end || "N/A",
        duration,
        client: mappings.map((m) => nameOf(companies, m.companyId, "companyName")).filter(Boolean).join(", ") || "N/A",
        contact: mappings.map((m) => nameOf(contacts, m.contactPersonId, "fullName")).filter(Boolean).join(", ") || "N/A",
        category: p.projectCategoryId || "N/A",
        categoryIds: categoryIdsOf(p),
        subCategory: p.projectSubCategoryId || "N/A",
        subCategoryIds: subCategoryIdsOf(p),
        service: p.projectServiceId || "N/A",
        serviceIds: serviceIdsOf(p),
        projectStatus: p.status || null,
        poStatus: p.poStatus || null,
        projectCost: Number(p.cost) || p.projectValue || 0,
        totalCost: p.projectValue || 0,
        projectRate: Number(p.rate) || 0,
        projectArea: (p.commercials || []).reduce((s: number, c: any) => s + (parseFloat(c.area) || 0), 0) || parseFloat(ad.builtUpArea) || parseFloat(ad.plotArea) || 0,
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
    <DataTable
      caption="Projects"
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      stateKey={tableName}
      initialSorting={[{ id: "projectStartDate", desc: true }]}
      onRowClick={(row) => {
        if (!canOpen(row.id, true)) return;
        openRecord(row.id, true, `/project/${row.id}`);
      }}
      rowLabel={(row) =>
        canOpen(row.id, true)
          ? row.projectName || "Open project"
          : "You're not authorized to open this project"
      }
      searchPlaceholder="Search projects…"
      groupableColumns={false}
    />
  );
};
