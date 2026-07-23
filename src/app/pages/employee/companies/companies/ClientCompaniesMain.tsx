import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
// import { Button } from "react-bootstrap";
import { Button } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";
import {
  getAllClientCompanies,
  getAllCompanyTypes,
  deleteClientCompany,
} from "@services/companies";
import NewCompanyForm from "./components/NewCompanyForm";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { MRT_ColumnDef } from "material-react-table";
import { KTIcon } from "@metronic/helpers";
import eventBus from "@utils/EventBus";
import { deleteConfirmation } from "@utils/modal";
import { Company } from "@models/companies";
import dayjs, { Dayjs } from "dayjs";
import SmartAvatar from "@app/modules/common/components/SmartAvatar";

// All selectable company-table column keys (must match the `accessorKey`s below).
const COMPANY_COLUMN_KEYS = [
  "companyName", "companyTypeId", "industry", "location", "createdAt", "updatedAt",
  "budget", "projectCount", "referenceType", "internalReference", "externalReference",
];

const computeCompanyFields = (
  visibility?: Record<string, boolean>,
): string[] | undefined => {
  if (!visibility) return undefined;
  const visible = COMPANY_COLUMN_KEYS.filter((k) => visibility[k] !== false);
  return visible.length >= COMPANY_COLUMN_KEYS.length ? undefined : visible;
};

const visibilityFromKeys = (keys: string[]): Record<string, boolean> =>
  Object.fromEntries(COMPANY_COLUMN_KEYS.map((k) => [k, keys.includes(k)]));

const getFieldsKey = (fields: string[] | undefined): string =>
  fields ? [...fields].sort().join(",") : "ALL";

interface ProcessedCompany extends Company {
  companyTypeName: string;
  referenceType?: string;
  internalReferenceEmployeeId?: string;
  externalReferenceContactId?: string;
  totalBudget?: number;
  projectCount?: number;
}

interface Props {
  statusId?: string;
  companyTypeId?: string;
  serviceId?: string;
  subServiceId?: string;
  locationId?: string;
  startDate?: Dayjs;
  endDate?: Dayjs;
  isOthersView?: boolean;
  top10Ids?: string[];
}

const ClientCompaniesMain = ({
  statusId,
  companyTypeId,
  serviceId,
  subServiceId,
  locationId,
  startDate,
  endDate,
  isOthersView,
  top10Ids,
}: Props) => {
  const navigate = useNavigate();
  const employeeIdCurrent = useSelector(
    (state: RootState) => state.employee.currentEmployee.id,
  );
  const allEmployees = useSelector(
    (state: RootState) => state.allEmployees?.list,
  );

  const [showNewCompanyForm, setShowNewCompanyForm] = useState(false);
  const [companies, setCompanies] = useState<ProcessedCompany[]>([]);
  const [companyTypesMap, setCompanyTypesMap] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // Column visibility & selective fetching
  const visibleColumnsRef = useRef<string[] | null>(null);
  const lastFieldsKeyRef = useRef<string | null>(null);
  const firstVisibilityEmissionRef = useRef(true);
  const columnsRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (fields?: string[]) => {
    setIsLoading(true);
    try {
      // First fetch company types
      const typesResponse = await getAllCompanyTypes();
      const typesMap: Record<string, string> = {};
      typesResponse?.companyTypes?.forEach((type: any) => {
        typesMap[type.id] = type.name;
      });
      setCompanyTypesMap(typesMap);

      // Then fetch companies and map the types
      const companiesResponse = await getAllClientCompanies(false, fields);
      const companiesData = companiesResponse?.data?.companies || [];
      const processedCompanies = companiesData.map((company: Company) => {
        // Process references to handle multiple entries
        const referenceTypes =
          company.references?.map((ref) => ref.referenceType).join(", ") ||
          "N/A";
        const internalRefs =
          company.references
            ?.filter((ref) => ref.internalReferenceEmployeeId)
            .map((ref) => {
              const emp = ref.internalReferenceEmployee;
              if (!emp) return ref.internalReferenceEmployeeId;
              if (emp.users) return `${emp.users.firstName} ${emp.users.lastName}`;
              return emp.nickName || ref.internalReferenceEmployeeId;
            })
            .join(", ") || "N/A";
        const externalRefs =
          company.references
            ?.filter((ref) => ref.externalReferenceContactId)
            .map(
              (ref) =>
                ref.externalReferenceContact?.fullName ||
                ref.externalReferenceContactId,
            )
            .join(", ") || "N/A";

        const totalBudget =
          company.projectCompanyMappings?.reduce((acc, mapping) => {
            return acc + Number(mapping.project?.cost || 0);
          }, 0) || 0;

        // Show ALL of the company's types (a company can have many). Fall back to the legacy
        // single primary type, then to "N/A".
        const allTypeNames = (() => {
          const mappings = (company as any).companyTypeMappings;
          if (Array.isArray(mappings) && mappings.length > 0) {
            const names = mappings
              .map((m: any) => m.companyType?.name || (m.companyTypeId && typesMap[m.companyTypeId]) || m.companyTypeId)
              .filter(Boolean);
            if (names.length > 0) return names.join(", ");
          }
          return company.companyTypeId && typesMap[company.companyTypeId]
            ? typesMap[company.companyTypeId]
            : company.companyTypeId || "N/A";
        })();

        return {
          ...company,
          companyTypeName: allTypeNames,
          referenceType: referenceTypes,
          internalReferenceEmployeeId: internalRefs,
          externalReferenceContactId: externalRefs,
          totalBudget: totalBudget,
          projectCount: (company as any)._count?.leads ?? 0,
        };
      });

      setCompanies(processedCompanies);
    } catch (error) {
      console.error("Failed to fetch data", error);
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean up refetch timer on unmount
  useEffect(() => {
    return () => {
      if (columnsRefetchTimerRef.current) clearTimeout(columnsRefetchTimerRef.current);
    };
  }, []);

  // Handle column visibility changes and trigger selective refetch
  const handleVisibleColumnsChange = useCallback(
    (keys: string[]) => {
      visibleColumnsRef.current = keys;
      // Pass the raw visible column accessorKeys; the backend gates the heavy
      // `references` relation on these.
      const key = [...keys].sort().join(",");

      // First emission: record baseline, don't refetch
      if (firstVisibilityEmissionRef.current) {
        firstVisibilityEmissionRef.current = false;
        lastFieldsKeyRef.current = key;
        return;
      }

      // No change detected
      if (key === lastFieldsKeyRef.current) return;
      lastFieldsKeyRef.current = key;

      // Debounce refetch
      if (columnsRefetchTimerRef.current) clearTimeout(columnsRefetchTimerRef.current);
      columnsRefetchTimerRef.current = setTimeout(() => {
        fetchData(keys);
      }, 500);
    },
    [fetchData],
  );

  // Add event listener for data refresh
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    eventBus.on("companyCreated", handleRefresh);
    return () => {
      eventBus.off("companyCreated", handleRefresh);
    };
  }, []);

  const isDrillDown = !!(statusId || companyTypeId || serviceId || subServiceId || locationId);
  const hideNewCompanyButton = isDrillDown;

  // ── Drill-down curated columns ────────────────────────────────────────────────
  // When drilled (statusId, companyTypeId, serviceId, subServiceId, locationId set),
  // show a lean set of columns instead of the full table. The drilled dimension gets
  // a context column to ensure it's always visible.
  const drillContextKey: string | null = (() => {
    if (companyTypeId) return "companyTypeName";
    if (statusId) return "status";
    if (serviceId) return "services";
    if (subServiceId) return "subServices";
    if (locationId) return "location";
    return null;
  })();

  const drillVisibleKeys = useMemo(
    () =>
      new Set<string>([
        // Lean base: company id, name, type, budget, project count
        "prefix",
        "companyName",
        "companyTypeName",
        "totalBudget",
        "projectCount",
        ...(drillContextKey ? [drillContextKey] : []),
      ]),
    [drillContextKey],
  );

  // Separate pref bucket per drilled dimension so each drill keeps its own
  // lean defaults without colliding with the full-page `Client-Companies` prefs.
  const drillTableName = `CompanyDrill_${drillContextKey ?? "base"}`;

  const columns = useMemo<MRT_ColumnDef<ProcessedCompany, any>[]>(
    () => {
      const base: MRT_ColumnDef<ProcessedCompany, any>[] = [
      {
        accessorKey: "prefix",
        header: "Company Id",
        size: 80,
        enableEditing: false,
        Cell: ({ row }: { row: any }) => {
          return (
            <span
              className="cursor-pointer "
              style={{
                color: "inherit",
                fontWeight: "600",
                fontSize: "14px",
              }}
              onClick={() => {
                navigate(`/companies/${row.original.id}`);
              }}
            >
              {row?.original?.prefix || "N/A"}
            </span>
          );
        },
      },
      {
        accessorKey: "logo",
        header: "Logo",
        Cell: ({ row }) => (
          <SmartAvatar
            name={row.original.companyName}
            id={row.original.id}
            imageUrl={row.original.logo}
            size={42}
            imageFit="cover"
            status={row.original.status === "ACTIVE" ? "active" : "inactive"}
          />
        ),
      },
      {
        accessorKey: "companyName",
        header: "Company Name",
        Cell: ({ row }) => (
          <button
            className="btn btn-link p-0 text-start text-decoration-none"
            style={{
              color: "inherit",
              fontWeight: "600",
              fontSize: "14px",
            }}
            onClick={() => {
              navigate(`/companies/${row.original.id}`);
            }}
          >
            {row.original.companyName || "N/A"}
          </button>
        ),
      },
      {
        accessorKey: "companyTypeName",
        header: "Company Type",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "referenceType",
        header: "Reference Type",
        Cell: ({ cell }: { cell: any }) => {
          const reference = cell.getValue();

          //  const referenceType = cell.getValue();
          return reference || "N/A";
        },
      },
      {
        accessorKey: "internalReferenceEmployeeId",
        header: "Internal Referred By",
        Cell: ({ cell }) => {
          return (
            allEmployees?.find((emp) => emp.employeeId === cell.getValue())
              ?.employeeName ||
            cell.getValue() ||
            "N/A"
          );
        },
      },
      {
        accessorKey: "externalReferenceContactId",
        header: "External Referred By",
        Cell: ({ cell }) => {
          return cell.getValue() || "N/A";
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        // CLOSED is shown as "Inactive" to match the Active/Inactive wording used in the form.
        Cell: ({ cell }) => {
          const v = cell.getValue();
          if (v === "ACTIVE") return "Active";
          if (v === "CLOSED") return "Inactive";
          return v || "N/A";
        },
      },
      {
        accessorKey: "projectCount",
        header: "No. of Projects",
        size: 110,
        Cell: ({ cell }) => cell.getValue() ?? 0,
      },
      {
        accessorKey: "overallRating",
        header: "Rating ⭐",
        Cell: ({ cell }) => {
          const rating = cell.getValue();
          return rating ? (
            <span className="text-warning">⭐ {rating}</span>
          ) : (
            "N/A"
          );
        },
      },
      {
        accessorKey: "totalBudget",
        header: "Budget",
        Cell: ({ cell }) => {
          const budget = cell.getValue() as number;
          return `₹${budget.toLocaleString("en-IN")}`;
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "phone2",
        header: "Phone 2",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "fax",
        header: "Fax",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "email",
        header: "Email",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "website",
        header: "Website",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "address",
        header: "Address",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "area",
        header: "Area",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "city",
        header: "City",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "state",
        header: "State",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "country",
        header: "Country",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "zipCode",
        header: "ZIP Code",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "blacklisted",
        header: "Blacklisted",
        Cell: ({ cell }) => (cell.getValue() ? "Yes" : "No"),
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "note",
        header: "Note",
        Cell: ({ cell }) => cell.getValue() || "N/A",
      },
      {
        accessorKey: "isActive",
        header: "Active",
        Cell: ({ cell }) => (cell.getValue() ? "Yes" : "No"),
      },
      {
        accessorKey: "createdAt",
        header: "Created Date",
        meta: { defaultVisible: false },
        Cell: ({ cell }: any) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "createdById",
        header: "Created By",
        meta: { defaultVisible: false },
        Cell: ({ row }: any) => {
          const emp = allEmployees?.find(
            (e: any) => e.employeeId === row.original.createdById
          );
          return emp?.employeeName || "N/A";
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Last Edited Date",
        meta: { defaultVisible: false },
        Cell: ({ cell }: any) =>
          cell.getValue() ? dayjs(cell.getValue()).format("DD-MM-YYYY") : "N/A",
      },
      {
        accessorKey: "updatedById",
        header: "Last Edited By",
        meta: { defaultVisible: false },
        Cell: ({ row }: any) => {
          const emp = allEmployees?.find(
            (e: any) => e.employeeId === row.original.updatedById
          );
          return emp?.employeeName || "N/A";
        },
      },
      ...(!hideNewCompanyButton
        ? [
            {
              accessorKey: "actions",
              header: "Actions",
              Cell: ({ row }: any) => (
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() => handleEditClick(row.original.id)}
                  >
                    <KTIcon iconName="pencil" className="fs-3" />
                  </button>
                  <button
                    className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
                    onClick={() => handleDelete(row.original)}
                  >
                    <KTIcon iconName="trash" className="fs-3" />
                  </button>
                </div>
              ),
            },
          ]
        : []),
      ];

      // Full-page table: every column visible by default. Drill-down: only the
      // curated base + the drilled dimension's context column are visible by default.
      if (!isDrillDown) return base;
      return base.map((col: any) => ({
        ...col,
        meta: { ...(col.meta || {}), defaultVisible: drillVisibleKeys.has(col.accessorKey) },
      }));
    },
    [navigate, isDrillDown, drillVisibleKeys],
  );

  const handleEditClick = (companyId: string) => {
    setEditingCompanyId(companyId);
    setShowNewCompanyForm(true);
  };

  const handleDelete = (company: Company) => {
    const deleteCompany = async () => {
      try {
        const sure = await deleteConfirmation("Company deleted successfully");
        if (!sure) return;
        console.warn("companyId", company.id);

        await deleteClientCompany(company.id);
        eventBus.emit("companyCreated");
      } catch (error) {
        console.error("Failed to delete company", error);
      }
    };
    deleteCompany();
  };

  const handleCloseForm = () => {
    setShowNewCompanyForm(false);
    setEditingCompanyId(null);
  };

  const startDates = startDate ? dayjs(startDate).startOf("day") : null;
  const endDates = endDate ? dayjs(endDate).endOf("day") : null;

  const dateFilteredData = companies?.filter((item: any) => {
    const createdAt = dayjs(item.createdAt);

    if (startDates && createdAt.isBefore(dayjs(startDates).startOf("day")))
      return false;
    if (endDates && createdAt.isAfter(dayjs(endDates).endOf("day")))
      return false;

    return true;
  });

  // All type ids a company belongs to (multi-type aware). Falls back to the legacy single type.
  const getCompanyTypeIds = (item: any): string[] => {
    const mappings = item.companyTypeMappings;
    if (Array.isArray(mappings) && mappings.length > 0) {
      const ids = mappings.map((m: any) => m.companyTypeId || m.companyType?.id).filter(Boolean);
      if (ids.length > 0) return ids;
    }
    return item.companyTypeId ? [item.companyTypeId] : [];
  };

  // All service ids a company is tagged with (via the company↔service join).
  const getCompanyServiceIds = (item: any): string[] => {
    const mappings = item.companyServicesMapping;
    if (Array.isArray(mappings)) {
      return mappings.map((m: any) => m.serviceId || m.service?.id).filter(Boolean);
    }
    return [];
  };

  // All sub-service ids a company is tagged with (via the company↔sub-service join).
  const getCompanySubServiceIds = (item: any): string[] => {
    const mappings = item.subServiceMappings || item.companySubServicesMapping;
    if (Array.isArray(mappings)) {
      return mappings.map((m: any) => m.subServiceId || m.subService?.id).filter(Boolean);
    }
    return [];
  };

  const filteredData = dateFilteredData?.filter((item: any) => {
    const typeIds = getCompanyTypeIds(item);
    if (isOthersView && top10Ids) {
      // "Others" = companies that have at least one type outside the top 10.
      if (!typeIds.some((id) => !top10Ids.includes(id))) return false;
    } else {
      // Match if ANY of the company's types is the selected type.
      if (companyTypeId && !typeIds.includes(companyTypeId)) return false;
    }

    // Match if the company is tagged with the selected service.
    if (serviceId && !getCompanyServiceIds(item).includes(serviceId)) return false;

    // Match if the company is tagged with the selected sub-service.
    if (subServiceId && !getCompanySubServiceIds(item).includes(subServiceId)) return false;

    if (statusId && item.status !== statusId) return false;

    if (locationId) {
      if (locationId.toLowerCase() !== "unknown") {
        if (
          item.countryId?.toString() !== locationId &&
          item.stateId?.toString() !== locationId &&
          item.cityId?.toString() !== locationId &&
          item.country?.toLowerCase() !== locationId.toLowerCase() &&
          item.state?.toLowerCase() !== locationId.toLowerCase() &&
          item.city?.toLowerCase() !== locationId.toLowerCase()
        ) {
          return false;
        }
      } else {
        if (
          item.countryId ||
          item.stateId ||
          item.cityId ||
          item.country ||
          item.state ||
          item.city
        ) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <div className="row ">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div
          // className="mb-4"
          style={{
            fontFamily: "Barlow",
            fontSize: "24px",
            fontWeight: "600",
          }}
        >
          Companies
        </div>
        {!hideNewCompanyButton && (
          <div className="d-flex align-items-center gap-3">
            {/* <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M10.5 6H20.25M10.5 6C10.5 6.39782 10.342 6.77936 10.0607 7.06066C9.77936 7.34196 9.39782 7.5 9 7.5C8.60218 7.5 8.22064 7.34196 7.93934 7.06066C7.65804 6.77936 7.5 6.39782 7.5 6M10.5 6C10.5 5.60218 10.342 5.22064 10.0607 4.93934C9.77936 4.65804 9.39782 4.5 9 4.5C8.60218 4.5 8.22064 4.65804 7.93934 4.93934C7.65804 5.22064 7.5 5.60218 7.5 6M7.5 6H3.75M10.5 18H20.25M10.5 18C10.5 18.3978 10.342 18.7794 10.0607 19.0607C9.77936 19.342 9.39782 19.5 9 19.5C8.60218 19.5 8.22064 19.342 7.93934 19.0607C7.65804 18.7794 7.5 18.3978 7.5 18M10.5 18C10.5 17.6022 10.342 17.2206 10.0607 16.9393C9.77936 16.658 9.39782 16.5 9 16.5C8.60218 16.5 8.22064 16.658 7.93934 16.9393C7.65804 17.2206 7.5 17.6022 7.5 18M7.5 18H3.75M16.5 12H20.25M16.5 12C16.5 12.3978 16.342 12.7794 16.0607 13.0607C15.7794 13.342 15.3978 13.5 15 13.5C14.6022 13.5 14.2206 13.342 13.9393 13.0607C13.658 12.7794 13.5 12.3978 13.5 12M16.5 12C16.5 11.6022 16.342 11.2206 16.0607 10.9393C15.7794 10.658 15.3978 10.5 15 10.5C14.6022 10.5 14.2206 10.658 13.9393 10.9393C13.658 11.2206 13.5 11.6022 13.5 12M13.5 12H3.75" stroke="#172554" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg> */}
            <Button
              variant="contained"
              onClick={() => setShowNewCompanyForm(true)}
              sx={{
                backgroundColor: "#1E3A8A",
                "&:hover": {
                  backgroundColor: "#7e3434",
                },
                textTransform: "none",
                px: 3,
                py: 1,
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              New Company
            </Button>
          </div>
        )}
      </div>
      <MaterialTable
        columns={columns}
        data={filteredData}
        tableName={isDrillDown ? drillTableName : "Client-Companies"}
        employeeId={employeeIdCurrent}
        resource="COMPANIES"
        viewOwn={true}
        viewOthers={true}
        checkOwnWithOthers={true}
        defaultSorting={[{ id: "companyName", desc: false }]}
        onVisibleColumnsChange={handleVisibleColumnsChange}
        muiTableProps={{
          sx: {
            borderCollapse: "separate",
            borderSpacing: "0 20px !important", // 20px vertical spacing between rows
          },

          muiTableBodyRowProps: ({ row }) => ({
            // sx: {
            //     cursor: 'pointer',
            //     backgroundColor: `${row.original?.status?.color}`,
            //     // borderRadius: '8px',
            //     // margin:"20px !important"
            // },
            sx: {
              cursor: "pointer",
              // Blacklisted companies are shown as a solid black row (text turns white below
              // so it stays readable against the black background).
              backgroundColor: row.original?.blacklisted
                ? "#1a1a1a"
                : `${row.original?.companyTypeName?.color}30`,
              // borderBottom:"5px solid red !important",
              padding: "10px !important",

              "& .MuiTableCell-root": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "14px",
                fontFamily: "Inter",
                fontWeight: "400",
                // Solid black on the CELLS (not just the row) with readable white text, so the
                // table's default hover highlight can't wash the blacklisted row out.
                color: row.original?.blacklisted ? "#ffffff !important" : undefined,
                backgroundColor: row.original?.blacklisted ? "#1a1a1a !important" : undefined,
                padding: "8px 16px !important",
                borderBottom: "2px solid white",
                borderTop: "2px solid white",
                // borderLeft:"5px solid white"
                // margin:"20px !important"
              },
              "& .MuiTableCell-root:first-of-type": {
                borderTopLeftRadius: "12px",
                borderBottomLeftRadius: "12px",
                // marginTop:"40px !important"
                borderLeft: "3px solid white",
              },
              "& .MuiTableCell-root:last-of-type": {
                borderTopRightRadius: "12px",
                borderBottomRightRadius: "12px",
                borderRight: "3px solid white",
              },
              "&:hover": {
                // Blacklisted rows shift to a slightly lighter charcoal on hover (a subtle,
                // visible change) while keeping WHITE text so the content stays fully readable.
                backgroundColor: row.original?.blacklisted
                  ? "#3a3a3a"
                  : `${row.original?.status?.color}99`,
                "& td": {
                  color: row.original?.blacklisted ? "#ffffff !important" : "black",
                },
              },
              // A global rule (`.MuiTableBody-root tr.MuiTableRow-root:hover td`) forces a light
              // hover background with !important; this higher-specificity selector overrides it so
              // the blacklisted row keeps its dark background + white text on hover.
              "&.MuiTableRow-root:hover .MuiTableCell-root": row.original?.blacklisted
                ? { backgroundColor: "#3a3a3a !important", color: "#ffffff !important" }
                : {},
            },

            // onClick: () => {
            //     navigate(`/employee/lead/${row.original.id}`, {
            //         state: { leadData: row.original.id },
            //     });
            // },
          }),
        }}
      />
      <NewCompanyForm
        show={showNewCompanyForm}
        onClose={handleCloseForm}
        editingCompanyId={editingCompanyId}
      />
    </div>
  );
};

export default ClientCompaniesMain;
