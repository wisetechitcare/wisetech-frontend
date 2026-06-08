import MaterialTable from "@app/modules/common/components/MaterialTable";
import {
  Box, Button, MenuItem, Select, FormControl,
  ToggleButton, ToggleButtonGroup,
  useTheme, useMediaQuery,
  Autocomplete, TextField, InputAdornment,
} from "@mui/material";
import { deleteLead, getAllLeads } from "@services/leads";
import { useCallback, useEffect, useMemo, useState } from "react";
import DetailsModal from './DetailsModal';
import { useNavigate } from 'react-router-dom';
import { getAllLeadStatus } from "@services/lead";
import Loader from "@app/modules/common/utils/Loader";
import { leadAndProjectTemplateTypeId } from "@constants/statistics";
import { deleteConfirmation, errorConfirmation, rejectConfirmation, successConfirmation } from "@utils/modal";
import LeadFormModal from "./LeadFormModal";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import { getAllProjectServices, getAllProjectSubcategories, getAllProjectCategories } from "@services/projects";
import { fetchAllCountries, fetchAllStates, fetchAllCities } from "@services/options";
import { AppDispatch, RootState } from "@redux/store";
import { useDispatch, useSelector } from "react-redux";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { mapLeadToFormInitialValues } from "./utils";
import { fetchAllEmployeesAsync } from "@redux/slices/allEmployees";
import LeadsProjectCompanyChartSettings from "@pages/company/settings/LeadsProjectCompanyChartSettings";
import { PROJECT_CHART_SETTINGS_MODAL_TYPE } from "@constants/configurations-key";
import { Modal } from "react-bootstrap";
import { KTIcon, toAbsoluteUrl } from "@metronic/helpers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import LeadBulkImport from "./LeadBulkImport";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// ─── Types ─────────────────────────────────────────────────────────────────────

type DateMode = "daily" | "weekly" | "monthly" | "yearly" | "allyear" | "custom";

type LeadNewLeadProps = {
  statusId?: any;
  serviceId?: any;
  categoryId?: any;
  referralId?: any;
  sourceId?: any;
  subCategoryId?: any;
  companyTypeId?: any;
  topLeadsId?: any;
  locationId?: any;
  monthlyStatusName?: any;
  monthlyStatusId?: any;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
};

// ─── Navigation Buttons ────────────────────────────────────────────────────────

const NavigationButtons: React.FC<{
  onPrev: () => void;
  onNext: () => void;
  displayText: string;
}> = ({ onPrev, onNext, displayText }) => (
  <div style={{ display: "flex", alignItems: "center" }}>
    <button className="btn btn-sm p-0" onClick={onPrev}>
      <img src={toAbsoluteUrl("media/svg/misc/back.svg")} alt="Previous" />
    </button>
    <span
      className="mx-2"
      style={{ fontSize: "13px", fontFamily: "Inter, sans-serif", fontWeight: 500, color: "#444", whiteSpace: "nowrap" }}
    >
      {displayText}
    </span>
    <button className="btn btn-sm p-0" onClick={onNext}>
      <img src={toAbsoluteUrl("media/svg/misc/next.svg")} alt="Next" />
    </button>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const LeadNewLead: React.FC<LeadNewLeadProps> = ({
  statusId, serviceId, categoryId, referralId, sourceId, subCategoryId,
  companyTypeId, topLeadsId, locationId, monthlyStatusName, monthlyStatusId,
  startDate, endDate,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const today = dayjs();

  // ── Responsive ──────────────────────────────────────────────────────────────
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ── Data state ──────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [tableData, setTableData] = useState<any[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [leadStatuses, setLeadStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState<any>(null);
  const [projectServices, setProjectServices] = useState<any[]>([]);
  const [projectSubcategories, setProjectSubcategories] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<any[]>([]);
  const [rawLeadsDatas, setRawLeadsDatas] = useState<any[]>([]);
  const [showChartSettingsModal, setShowChartSettingsModal] = useState(false);
  // ── Bulk import state (from file 2) ─────────────────────────────────────────
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [pagination] = useState({ pageIndex: 0, pageSize: 10 });

  // ── Date mode ────────────────────────────────────────────────────────────────
  const [alignment, setAlignment] = useState<DateMode>("monthly");

  // Daily
  const [day, setDay] = useState<Dayjs>(today);

  // Weekly
  const [weekStart, setWeekStart] = useState<Dayjs>(() => {
    const dow = today.day();
    return dow === 0 ? today.subtract(6, "day") : today.subtract(dow - 1, "day");
  });
  const [weekEnd, setWeekEnd] = useState<Dayjs>(() => {
    const dow = today.day();
    const ws = dow === 0 ? today.subtract(6, "day") : today.subtract(dow - 1, "day");
    return ws.add(6, "day");
  });

  // Monthly
  const [monthStart, setMonthStart] = useState<Dayjs>(today.startOf("month"));
  const [monthEnd, setMonthEnd] = useState<Dayjs>(today.endOf("month"));

  // Yearly (fiscal)
  const [yearStart, setYearStart] = useState<Dayjs | null>(null);
  const [yearEnd, setYearEnd] = useState<Dayjs | null>(null);
  const [fiscalYearDisplay, setFiscalYearDisplay] = useState("");

  // Custom
  const [customStartDate, setCustomStartDate] = useState<Dayjs | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Dayjs | undefined>(undefined);

  // ── Status & assigned filters ────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("");

  // ── Redux ────────────────────────────────────────────────────────────────────
  const allemployees = useSelector((state: RootState) => state.allEmployees?.list);
  const currentEmployeeId = useSelector((state: RootState) => state.employee?.currentEmployee?.id);
  let rawLeadsData = rawLeadsDatas;

  // Derive assigned-to employees directly from lead data so new assignees appear automatically.
  const NA_OPTION = { employeeId: "__NA__", employeeName: "N/A", avatar: "" };

  const assignedEmployeesFromLeads = useMemo(() => {
    const assignedIds = new Set(tableData.map((l: any) => l.assignedTo).filter(Boolean));
    const matched = (allemployees || []).filter((e: any) => assignedIds.has(e.employeeId));
    return [...matched]
      .sort((a: any, b: any) => a.employeeName.localeCompare(b.employeeName))
      .map((e: any) => ({
        ...e,
        displayName: e.isActive === false ? `${e.employeeName} (Inactive)` : e.employeeName,
        isInactive: e.isActive === false,
      }));
  }, [tableData, allemployees]);

  const hasUnassignedLeads = useMemo(
    () => tableData.some((l: any) => !l.assignedTo),
    [tableData]
  );

  const assignedToOptions = useMemo(
    () => hasUnassignedLeads ? [NA_OPTION, ...assignedEmployeesFromLeads] : assignedEmployeesFromLeads,
    [hasUnassignedLeads, assignedEmployeesFromLeads]
  );

  // ── Fiscal year init ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function initFiscalYear() {
      try {
        const { startDate: sd, endDate: ed } = await generateFiscalYearFromGivenYear(today);
        const fs = dayjs(sd);
        const fe = dayjs(ed);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("DD MMM, YYYY")} - ${fe.format("DD MMM, YYYY")}`);
      } catch {
        const year = today.month() >= 3 ? today.year() : today.year() - 1;
        const fs = dayjs(`${year}-04-01`);
        const fe = dayjs(`${year + 1}-03-31`);
        setYearStart(fs);
        setYearEnd(fe);
        setFiscalYearDisplay(`${fs.format("DD MMM, YYYY")} - ${fe.format("DD MMM, YYYY")}`);
      }
    }
    initFiscalYear();
  }, []);

  // ── Navigation handlers ──────────────────────────────────────────────────────
  const navigateDay = useCallback((dir: "prev" | "next") => {
    setDay(prev => dir === "prev" ? prev.subtract(1, "day") : prev.add(1, "day"));
  }, []);

  const navigateWeek = useCallback((dir: "prev" | "next") => {
    const offset = dir === "prev" ? -1 : 1;
    setWeekStart(prev => {
      const ns = prev.add(offset, "week");
      setWeekEnd(ns.add(6, "day"));
      return ns;
    });
  }, []);

  const navigateMonth = useCallback((dir: "prev" | "next") => {
    const offset = dir === "prev" ? -1 : 1;
    setMonthStart(prev => {
      const ns = prev.add(offset, "month");
      setMonthEnd(ns.endOf("month"));
      return ns;
    });
  }, []);

  const navigateYear = useCallback(async (dir: "prev" | "next") => {
    const base = (yearStart ?? today).add(dir === "prev" ? -1 : 1, "year");
    try {
      const { startDate: sd, endDate: ed } = await generateFiscalYearFromGivenYear(base);
      const fs = dayjs(sd);
      const fe = dayjs(ed);
      setYearStart(fs);
      setYearEnd(fe);
      setFiscalYearDisplay(`${fs.format("DD MMM, YYYY")} - ${fe.format("DD MMM, YYYY")}`);
    } catch {
      const year = base.month() >= 3 ? base.year() : base.year() - 1;
      const fs = dayjs(`${year}-04-01`);
      const fe = dayjs(`${year + 1}-03-31`);
      setYearStart(fs);
      setYearEnd(fe);
      setFiscalYearDisplay(`${fs.format("DD MMM, YYYY")} - ${fe.format("DD MMM, YYYY")}`);
    }
  }, [yearStart, today]);

  const handleAlignmentChange = (_: React.MouseEvent<HTMLElement> | React.ChangeEvent<{}>, newVal: string) => {
    if (!newVal) return;
    setAlignment(newVal as DateMode);
  };

  // ── Data fetch ───────────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const leadsResponse = await getAllLeads();
      const leadsData = leadsResponse?.data?.data?.leads || [];
      setRawLeadsDatas(leadsData);

      const [servicesRes, subcatRes, catRes, statusRes, countriesData] = await Promise.all([
        getAllProjectServices(),
        getAllProjectSubcategories(),
        getAllProjectCategories(),
        getAllLeadStatus(),
        fetchAllCountries(),
      ]);
      setProjectServices(servicesRes?.services || []);
      setProjectSubcategories(subcatRes?.projectSubCategories || []);
      setProjectCategories(catRes?.projectCategories || []);
      setLeadStatuses(statusRes?.leadStatuses || []);

      if (leadsData.length > 0) {
        const uniqueCountryIds = new Set<any>();
        const uniqueStateIds = new Map<any, Set<any>>();
        const uniqueCityIds = new Map<any, Set<any>>();

        leadsData.forEach((lead: any) => {
          if (lead?.additionalDetails?.country) {
            uniqueCountryIds.add(lead.additionalDetails.country);
            if (lead?.additionalDetails?.state) {
              if (!uniqueStateIds.has(lead.additionalDetails.country))
                uniqueStateIds.set(lead.additionalDetails.country, new Set());
              uniqueStateIds.get(lead.additionalDetails.country)!.add(lead.additionalDetails.state);
              if (lead?.additionalDetails?.city) {
                if (!uniqueCityIds.has(lead.additionalDetails.state))
                  uniqueCityIds.set(lead.additionalDetails.state, new Set());
                uniqueCityIds.get(lead.additionalDetails.state)!.add(lead.additionalDetails.city);
              }
            }
          }
        });

        const countriesMap = new Map<string, any>();
        const statesMap = new Map<string, any>();
        const citiesMap = new Map<string, any>();
        (countriesData || []).forEach((c: any) => countriesMap.set(c.id.toString(), c));

        const statesResults = await Promise.all(
          [...uniqueCountryIds].map((cid) => {
            const c = countriesMap.get(String(cid));
            return c?.iso2 ? fetchAllStates(c.iso2) : Promise.resolve([]);
          })
        );
        let allStates: any[] = [];
        statesResults.forEach((r) => { if (Array.isArray(r)) allStates = [...allStates, ...r]; });
        allStates.forEach((s) => statesMap.set(s.id.toString(), s));

        const stateToCountry = new Map<string, string>();
        for (const [cid, sids] of uniqueStateIds.entries())
          for (const sid of sids) stateToCountry.set(String(sid), String(cid));

        const citiesResults = await Promise.all(
          [...uniqueCityIds.keys()].map((sid) => {
            const s = statesMap.get(String(sid));
            const cid = stateToCountry.get(String(sid));
            const c = cid ? countriesMap.get(cid) : null;
            return s?.iso2 && c?.iso2 ? fetchAllCities(c.iso2, s.iso2) : Promise.resolve([]);
          })
        );
        let allCities: any[] = [];
        citiesResults.forEach((r) => { if (Array.isArray(r)) allCities = [...allCities, ...r]; });
        allCities.forEach((c) => citiesMap.set(c.id.toString(), c));

        const transformedLeads = leadsData.map((lead: any) => {
          const s = lead?.project?.startDate ? new Date(lead.project.startDate) : null;
          const e = lead?.project?.endDate ? new Date(lead.project.endDate) : null;
          const duration = s && e ? `${Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))} days` : "N/A";
          const countryId = lead?.additionalDetails?.country || "";
          const stateId = lead?.additionalDetails?.state || "";
          const cityId = lead?.additionalDetails?.city || "";

          return {
            id: lead.id,
            prefix: lead?.prefix || "",
            projectName: lead.title || "",
            totalCost: Array.isArray(lead.commercials) && lead.commercials.length > 0
              ? lead.commercials.reduce((acc: number, c: any) => acc + (parseFloat(c.cost) || 0), 0)
              : (lead.budget || 0),
            client: lead?.company?.companyName || lead?.leadTeams?.[0]?.company?.companyName || "",
            service: lead?.projectServiceId || lead?.services?.[0]?.serviceId || "",
            category: lead?.projectCategoryId || lead?.leadCategories?.[0]?.category?.id || "",
            subCategory: lead?.projectSubCategoryId || lead?.leadSubCategories?.[0]?.subcategory?.id || "",
            status: lead?.status || null,
            poStatus: lead?.poStatus || null,
            assignedTo: lead?.assignedToId || "",
            inquiryDate: lead.inquiryDate || "",
            startDate: lead?.startDate || lead?.project?.startDate || "",
            endDate: lead?.endDate || "",
            duration,
            contact: lead?.contact?.fullName || lead?.leadTeams?.[0]?.contact?.fullName || "",
            createdAt: lead?.createdAt || "",
            createdBy: lead?.createdById || "",
            updatedBy: lead?.updatedById || "",
            country: countriesMap.get(String(countryId))?.name || String(countryId),
            countryId,
            city: citiesMap.get(String(cityId))?.name || String(cityId),
            cityId,
            state: statesMap.get(String(stateId))?.name || String(stateId),
            stateId,
            area: (Array.isArray(lead.commercials) && lead.commercials.length > 0 ? lead.commercials[0]?.area : null) ||
              lead?.additionalDetails?.projectArea || lead?.addresses?.[0]?.projectArea || "",
            cost: Array.isArray(lead.commercials) && lead.commercials.length > 0
              ? lead.commercials.reduce((acc: number, c: any) => acc + (parseFloat(c.cost) || 0), 0) : 0,
            companyId: lead.companyId || "",
            branchId: lead.branchId || "",
            description: lead.description || "",
            priority: lead.priority || "",
            estimatedHours: lead.estimatedHours || "",
            budget: Array.isArray(lead.commercials) && lead.commercials.length > 0
              ? lead.commercials.reduce((acc: number, c: any) => acc + (parseFloat(c.cost) || 0), 0)
              : (lead.budget || ""),
            rate: lead.rate || "",
            leadSource: lead.source?.name || lead.sourceId || lead?.leadSource || "",
            referrals: lead.referrals || [],
            companyType: lead.company?.companyTypeId || "",
            receivedDate: lead?.receivedDate || "",
          };
        });

        setTableData(transformedLeads);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData, pagination]);
  useEffect(() => { dispatch(fetchAllEmployeesAsync()); }, []);

  // ── Event bus subscriptions (merged — file 2 adds leadDeleted) ───────────────
  useEventBus(EVENT_KEYS.leadCreated, fetchAllData);
  useEventBus(EVENT_KEYS.leadUpdated, fetchAllData);
  useEventBus(EVENT_KEYS.leadDeleted, fetchAllData);
  useEventBus(EVENT_KEYS.chartSettingsUpdated, fetchAllData);
  useEventBus(EVENT_KEYS.closeChartDialogModal, handleCloseChartSettingsModal);

  const hideNewLeadButton = statusId || serviceId || categoryId || referralId || sourceId ||
    subCategoryId || companyTypeId || topLeadsId || locationId || monthlyStatusId;

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = [
    {
      accessorKey: 'id', header: 'ID', size: 80, enableEditing: false,
      Cell: ({ row }: { row: any }) => row.index + 1,
    },
    {
      accessorKey: 'prefix', header: 'Inquiry Id', size: 250, minSize: 250, enableEditing: false,
      Cell: ({ row }: { row: any }) => (
        <span className="cursor-pointer" style={{ fontWeight: "600", fontSize: "14.5px", whiteSpace: "nowrap" }}>
          {row?.original?.prefix || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: 'projectName', header: 'Project Name', size: 400, minSize: 400,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return <span style={{ whiteSpace: "nowrap" }}>{typeof v === 'object' ? JSON.stringify(v) : v || 'N/A'}</span>;
      },
    },
    {
      accessorKey: 'totalCost', header: 'Total Cost', size: 120,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v !== undefined ? `₹${Number(v).toLocaleString()}` : '₹0';
      },
    },
    {
      accessorKey: 'client', header: 'Client', size: 150,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === 'object' ? v.name || 'N/A' : v || 'N/A';
      },
    },
    {
      accessorKey: 'service', header: 'Service', size: 150,
      Cell: ({ cell }: { cell: any }) => projectServices?.find((s: any) => s.id === cell.getValue())?.name || 'N/A',
    },
    {
      accessorKey: 'category', header: 'Category', size: 150,
      Cell: ({ cell }: { cell: any }) => projectCategories?.find((c: any) => c.id === cell.getValue())?.name || 'N/A',
    },
    {
      accessorKey: 'subCategory', header: 'Sub Category', size: 150,
      Cell: ({ cell }: { cell: any }) => projectSubcategories?.find((s: any) => s.id === cell.getValue())?.name || 'N/A',
    },
    {
      accessorKey: 'status', header: 'Lead Status', size: 130,
      Cell: ({ row }: any) => {
        const st = row?.original?.status;
        return st?.name
          ? <div className="badge badge-light" style={{ backgroundColor: st.color, color: "white" }}>{st.name}</div>
          : "N/A";
      },
    },
    {
      accessorKey: 'receivedDate', header: 'Received Date', size: 150,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format('DD-MM-YYYY') : 'N/A';
      },
    },
    {
      accessorKey: 'poStatus', header: 'PO Status', size: 130,
      Cell: ({ row }: any) => {
        const poStatus = row?.original?.poStatus;
        if (row?.original?.status?.name !== 'Received' || !poStatus) return <span>N/A</span>;
        const color = poStatus === 'Received' ? '#28A745' : '#FFC107';
        return <div className="badge badge-light" style={{ backgroundColor: color, color: poStatus === 'Received' ? 'white' : '#333' }}>{poStatus}</div>;
      },
    },
    {
      accessorKey: 'assignedTo', header: 'Assigned To', size: 150,
      Cell: ({ cell }: { cell: any }) => allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || 'N/A',
    },
    {
      accessorKey: 'inquiryDate', header: 'Inquiry Date', size: 150,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format('DD-MM-YYYY') : 'N/A';
      },
    },
    {
      accessorKey: 'startDate', header: 'Date', size: 150,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return v ? dayjs(v).format('DD-MM-YYYY') : 'N/A';
      },
    },
    {
      accessorKey: 'duration', header: 'Duration', size: 120,
      Cell: ({ cell }: { cell: any }) => cell.getValue() || 'N/A',
    },
    {
      accessorKey: 'contact', header: 'Contact', size: 150,
      Cell: ({ cell }: { cell: any }) => {
        const v = cell.getValue();
        return typeof v === 'object' ? v.name || v.email || 'N/A' : v || 'N/A';
      },
    },
    {
      accessorKey: 'createdAt', header: 'Created Date', size: 150,
      Cell: ({ cell }: { cell: any }) => cell.getValue() ? dayjs(cell.getValue()).format('DD-MM-YYYY') : 'N/A',
    },
    {
      accessorKey: 'createdBy', header: 'Created By', size: 150,
      Cell: ({ cell }: { cell: any }) => allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || 'N/A',
    },
    {
      accessorKey: 'updatedBy', header: 'Edited By', size: 150,
      Cell: ({ cell }: { cell: any }) => allemployees?.find((e: any) => e.employeeId === cell.getValue())?.employeeName || 'N/A',
    },
    { accessorKey: 'country', header: 'Country', size: 120, Cell: ({ cell }: { cell: any }) => cell.getValue() || 'N/A' },
    { accessorKey: 'city', header: 'City', size: 120, Cell: ({ row }: { row: any }) => row.original.city || 'N/A' },
    { accessorKey: 'state', header: 'State', size: 120, Cell: ({ row }: { row: any }) => row.original.state || 'N/A' },
    { accessorKey: 'area', header: 'Area', size: 120, Cell: ({ cell }: { cell: any }) => cell.getValue() || 'N/A' },
    {
      accessorKey: 'cost', header: 'Cost', size: 120,
      Cell: ({ cell }: { cell: any }) => cell.getValue() ? `₹${Number(cell.getValue()).toLocaleString()}` : '₹0',
    },
    ...(hideNewLeadButton ? [] : [
      {
        accessorKey: "actions", header: "Actions", size: 120, enableEditing: false,
        Cell: ({ row }: { row: any }) => (
          <Box sx={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                const currLead = rawLeadsData.find((l: any) => l.id === row.original.id);
                setFormValues(mapLeadToFormInitialValues(currLead));
                setSelectedLead(row.original);
              }}
            >
              <KTIcon iconName="pencil" className="fs-2" />
            </button>
            <button
              className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm"
              onClick={(e) => { e.stopPropagation(); handleDeleteLead(row.original.id); }}
            >
              <KTIcon iconName="trash" className="fs-2" />
            </button>
          </Box>
        ),
      },
    ]),
  ];

  // ── Handlers ──────────────────────────────────────────────────────────────────

  // Improved delete from file 2: optimistic update + success confirmation + eventBus emit
  const handleDeleteLead = async (id: string) => {
    try {
      const confirmed = await rejectConfirmation('Yes, delete it!');
      if (confirmed) {
        setDeletingId(id);

        // Optimistic UI update
        setTableData(prev => prev.filter((l: any) => l.id !== id));
        setRawLeadsDatas(prev => prev.filter((l: any) => l.id !== id));

        await deleteLead(id);

        successConfirmation('Lead deleted successfully!');
        eventBus.emit(EVENT_KEYS.leadDeleted, { id });
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      errorConfirmation('Failed to delete lead. Please try again.');
      // Revert optimistic update
      fetchAllData();
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);
  function handleCloseChartSettingsModal() { setShowChartSettingsModal(false); }

  const templateData = [
    { id: leadAndProjectTemplateTypeId.newLead, title: 'Blank Lead', description: "" },
    { id: leadAndProjectTemplateTypeId.mep, title: 'MEP Lead', description: 'Template' },
    { id: leadAndProjectTemplateTypeId.webDev, title: 'Web Development Template Lead', description: 'Template' },
  ];

  if (loading) return <Loader />;

  // ── Prop-driven filters ───────────────────────────────────────────────────────
  const startDates = startDate ? dayjs(startDate) : null;
  const endDates = endDate ? dayjs(endDate) : null;

  const propDateFiltered = tableData?.filter((item: any) => {
    const d = dayjs(item.createdAt);
    if (startDates && d.isBefore(startDates.startOf('day'))) return false;
    if (endDates && d.isAfter(endDates.endOf('day'))) return false;
    return true;
  });

  const filteredByProps = (() => {
    if (statusId) return propDateFiltered?.filter((item: any) => item.status?.id === statusId);
    if (serviceId) return propDateFiltered?.filter((item: any) => item.service === serviceId);
    if (categoryId) return propDateFiltered?.filter((item: any) => item.category === categoryId);
    if (referralId) return propDateFiltered?.filter((item: any) => item.referrals?.some((r: any) => r.referralTypeId === referralId));
    if (sourceId) return propDateFiltered?.filter((item: any) => item.leadSource?.toLowerCase() === sourceId?.toLowerCase());
    if (subCategoryId) return propDateFiltered?.filter((item: any) => item.subCategory === subCategoryId);
    if (companyTypeId) return propDateFiltered?.filter((item: any) => item.companyType === companyTypeId);
    if (topLeadsId?.length) return tableData?.filter((item: any) => topLeadsId?.includes(item.id.trim()));
    if (locationId) {
      return propDateFiltered?.filter((item: any) => {
        if (locationId.toLowerCase() !== "unknown") {
          return item.countryId?.toString() === locationId || item.stateId?.toString() === locationId ||
            item.cityId?.toString() === locationId || item.country?.toLowerCase() === locationId.toLowerCase() ||
            item.state?.toLowerCase() === locationId.toLowerCase() || item.city?.toLowerCase() === locationId.toLowerCase();
        }
        return !(item.countryId || item.stateId || item.cityId || item.country || item.state || item.city);
      });
    }
    if (monthlyStatusName && monthlyStatusId) {
      return propDateFiltered?.filter((item: any) =>
        dayjs(item.createdAt).format("MMMM") === monthlyStatusName && item.status?.name === monthlyStatusId
      );
    }
    return propDateFiltered;
  })();

  // ── Quick filter: date + status + assigned (AND) ───────────────────────────────
  const quickFilteredData = filteredByProps?.filter((item: any) => {
    let dateMatch = true;
    const d = item.inquiryDate ? dayjs(item.inquiryDate) : null;
    if (alignment === "daily") {
      dateMatch = d ? d.isSame(day, "day") : false;
    } else if (alignment === "weekly") {
      dateMatch = d ? (!d.isBefore(weekStart.startOf("day")) && !d.isAfter(weekEnd.endOf("day"))) : false;
    } else if (alignment === "monthly") {
      dateMatch = d ? (!d.isBefore(monthStart.startOf("day")) && !d.isAfter(monthEnd.endOf("day"))) : false;
    } else if (alignment === "yearly" && yearStart && yearEnd) {
      dateMatch = d ? (!d.isBefore(yearStart.startOf("day")) && !d.isAfter(yearEnd.endOf("day"))) : false;
    } else if (alignment === "allyear") {
      dateMatch = true;
    } else if (alignment === "custom") {
      if (customStartDate || customEndDate) {
        if (!d) dateMatch = false;
        else {
          if (customStartDate && d.isBefore(customStartDate.startOf("day"))) dateMatch = false;
          if (customEndDate && d.isAfter(customEndDate.endOf("day"))) dateMatch = false;
        }
      }
    }
    const statusMatch = statusFilter ? item.status?.name?.toLowerCase() === statusFilter.toLowerCase() : true;
    const assignedMatch = assignedToFilter
      ? assignedToFilter === "__NA__"
        ? !item.assignedTo
        : item.assignedTo === assignedToFilter
      : true;
    return dateMatch && statusMatch && assignedMatch;
  });

  const hasAnyFilter = statusFilter || assignedToFilter;
  const clearAllFilters = () => { setStatusFilter(""); setAssignedToFilter(""); };

  // ── Total cost for filtered data ─────────────────────────────────────────────
  const totalFilteredCost = (quickFilteredData ?? []).reduce(
    (acc: number, item: any) => acc + (parseFloat(item.totalCost) || parseFloat(item.cost) || 0),
    0
  );
  const formatCost = (amount: number) => {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // ── Shared heights ─────────────────────────────────────────────────────────
  const FILTER_HEIGHT = isMobile ? "30px" : "36px";

  // ── Toggle group sx ───────────────────────────────────────────────────────────
  const toggleGroupSx = {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    "& .MuiToggleButton-root": {
      borderRadius: "20px",
      borderColor: "#A0B4D2 !important",
      color: "#000000 !important",
      paddingX: { xs: "32px", md: "45px" },
      borderWidth: "2px",
      fontWeight: "600",
      width: { xs: "65px", sm: "75px" },
      fontSize: { xs: "10px", sm: "12px" },
      height: { xs: "30px", sm: "36px" },
      fontFamily: "Inter",
      textTransform: "uppercase" as const,
    },
    "& .Mui-selected": {
      borderColor: "#9D4141 !important",
      color: "#9D4141 !important",
      backgroundColor: "transparent !important",
    },
    "& .MuiToggleButton-root:hover": {
      borderColor: "#9D4141 !important",
      color: "#9D4141 !important",
    },
  };

  // ── Mobile select sx ──────────────────────────────────────────────────────────
  const mobileSelectSx = {
    borderRadius: "20px",
    "& .MuiOutlinedInput-root": { borderRadius: "20px" },
    "& .MuiOutlinedInput-notchedOutline": {
      borderRadius: "20px",
      borderColor: "#A0B4D2",
      borderWidth: "2px",
    },
    "& .Mui-selected": { borderColor: "#9D4141 !important", color: "#9D4141 !important" },
  };

  // ── Pill select sx for Status & Assigned ──────────────────────────────────────
  const pillSelectSx = (hasValue: boolean) => ({
    borderRadius: "20px",
    fontSize: isMobile ? "10px" : "12px",
    fontFamily: "Inter",
    fontWeight: 600,
    height: FILTER_HEIGHT,
    color: hasValue ? "#9D4141" : "#000000",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: hasValue ? "#9D4141 !important" : "#A0B4D2 !important",
      borderWidth: "2px !important",
      borderRadius: "20px !important",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#9D4141 !important" },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#9D4141 !important" },
    "& .MuiSelect-icon": { color: hasValue ? "#9D4141" : "#A0B4D2" },
  });

  const menuSx = {
    PaperProps: {
      sx: {
        borderRadius: "12px",
        mt: 0.5,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        maxHeight: 320,
        "& .MuiMenuItem-root": {
          fontSize: "14px",
          fontFamily: "Inter",
          "&:hover": { backgroundColor: "rgba(157,65,65,0.06)" },
          "&.Mui-selected": { backgroundColor: "rgba(157,65,65,0.1)", color: "#9D4141", fontWeight: 600 },
        },
      },
    },
  };

  return (
    <>
      <Box>
        {/* ── Header ── */}
        <div className="d-flex align-items-center justify-content-between pt-5 mt-1">
          <div style={{ fontFamily: "Barlow", fontSize: "24px", fontWeight: "600" }}>Leads</div>
          {!hideNewLeadButton && (
            <div className="d-flex align-items-center gap-3">
              <Button variant="contained" onClick={handleOpenModal}
                sx={{ backgroundColor: '#9D4141', '&:hover': { backgroundColor: '#7e3434' }, textTransform: 'none', px: 3, py: 1, borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
                Old Lead
              </Button>
              {/* Bulk Import button from file 2 */}
              <Button variant="contained" onClick={() => setShowBulkImport(true)}
                sx={{ backgroundColor: '#1B84FF', '&:hover': { backgroundColor: '#1565c0' }, textTransform: 'none', px: 3, py: 1, borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'white' }}>
                Bulk Import
              </Button>
              <Button variant="contained" onClick={handleOpenModal}
                sx={{ backgroundColor: '#9D4141', '&:hover': { backgroundColor: '#7e3434' }, textTransform: 'none', px: 3, py: 1, borderRadius: '8px', fontSize: '14px', fontWeight: 500 }}>
                New Lead
              </Button>
            </div>
          )}
        </div>

        {/* ── Filter bar ── */}
        {!hideNewLeadButton && (
          <div style={{ marginTop: "16px", marginBottom: "8px" }}>

            {/* ── Row 1: toggle (or mobile select) | nav / custom pickers ── */}
            <div className="d-flex flex-row justify-content-between align-items-center mb-3">

              {/* LEFT: mobile → Select, desktop → ToggleButtonGroup */}
              <div className="d-flex flex-column d-md-block">
                {isMobile ? (
                  <Select
                    value={alignment}
                    onChange={(e) => handleAlignmentChange(e as any, e.target.value)}
                    displayEmpty
                    variant="outlined"
                    size="small"
                    sx={mobileSelectSx}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                    <MenuItem value="allyear">All Year</MenuItem>
                    <MenuItem value="custom">Custom</MenuItem>
                  </Select>
                ) : (
                  <ToggleButtonGroup
                    value={alignment}
                    exclusive
                    onChange={handleAlignmentChange}
                    aria-label="date range selection"
                    sx={toggleGroupSx}
                  >
                    <ToggleButton value="daily">Daily</ToggleButton>
                    <ToggleButton value="weekly">Weekly</ToggleButton>
                    <ToggleButton value="monthly">Monthly</ToggleButton>
                    <ToggleButton value="yearly">Yearly</ToggleButton>
                    <ToggleButton value="allyear" sx={{ width: "auto !important", whiteSpace: "nowrap", px: "16px !important" }}>All Year</ToggleButton>
                    <ToggleButton value="custom">Custom</ToggleButton>
                  </ToggleButtonGroup>
                )}
              </div>

              {/* RIGHT: nav arrows or custom date pickers */}
              {alignment === "daily" && (
                <NavigationButtons
                  onPrev={() => navigateDay("prev")}
                  onNext={() => navigateDay("next")}
                  displayText={day.format("DD MMM, YYYY")}
                />
              )}
              {alignment === "weekly" && (
                <NavigationButtons
                  onPrev={() => navigateWeek("prev")}
                  onNext={() => navigateWeek("next")}
                  displayText={`${weekStart.format("DD MMM")} - ${weekEnd.format("DD MMM")}`}
                />
              )}
              {alignment === "monthly" && (
                <NavigationButtons
                  onPrev={() => navigateMonth("prev")}
                  onNext={() => navigateMonth("next")}
                  displayText={`${monthStart.format("DD MMM")} - ${monthEnd.format("DD MMM")}`}
                />
              )}
              {alignment === "yearly" && yearStart && yearEnd && (
                <NavigationButtons
                  onPrev={() => navigateYear("prev")}
                  onNext={() => navigateYear("next")}
                  displayText={fiscalYearDisplay}
                />
              )}
              {alignment === "custom" && (
                <div className="d-flex align-items-center gap-4">
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      label="Start Date"
                      value={customStartDate ?? null}
                      onChange={(v) => setCustomStartDate(v ?? undefined)}
                      maxDate={customEndDate}
                      format="DD MMM, YYYY"
                    />
                    <DatePicker
                      label="End Date"
                      value={customEndDate ?? null}
                      onChange={(v) => setCustomEndDate(v ?? undefined)}
                      minDate={customStartDate}
                      format="DD MMM, YYYY"
                    />
                  </LocalizationProvider>
                </div>
              )}
            </div>

            {/* Custom missing-date hint */}
            {alignment === "custom" && (!customStartDate || !customEndDate) && (
              <div className="d-flex justify-content-center my-3">
                <div className="text-center p-4" style={{ background: "#f9f0f0", borderRadius: "12px", border: "1px solid #f0dada", maxWidth: 420 }}>
                  <h5 style={{ fontFamily: "Inter", fontWeight: 600, color: "#9D4141" }}>Custom Date Range</h5>
                  <p className="mb-1" style={{ fontSize: "13px", color: "#666" }}>You've selected custom date range mode.</p>
                  <p className="mb-0" style={{ fontSize: "13px", color: "#555" }}>
                    <strong>Missing:</strong>{" "}
                    {!customStartDate && "Start Date"}
                    {!customStartDate && !customEndDate && " & "}
                    {!customEndDate && "End Date"}
                  </p>
                </div>
              </div>
            )}

            {/* ── Row 2: Status | Assigned | spacer | count badge | clear ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>

              {/* ── Status dropdown ── */}
              <FormControl size="small" sx={{ minWidth: isMobile ? 140 : 170 }}>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  displayEmpty
                  sx={pillSelectSx(!!statusFilter)}
                  renderValue={(val) => {
                    if (!val) {
                      return <span style={{ color: "#A0B4D2", fontFamily: "Inter", fontSize: isMobile ? "10px" : "12px", fontWeight: 600 }}>Lead Status</span>;
                    }
                    const st = leadStatuses.find((s: any) => s.name === val);
                    return (
                      <span style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", overflow: "hidden" }}>
                        {st?.color && (
                          <span style={{ width: 10, height: 10, minWidth: 10, borderRadius: "50%", backgroundColor: st.color, display: "inline-block" }} />
                        )}
                        <span style={{ fontFamily: "Inter", fontSize: isMobile ? "10px" : "12px", fontWeight: 600, color: "#9D4141", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                          {val}
                        </span>
                        <span
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setStatusFilter("");
                          }}
                          style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 16, height: 16, minWidth: 16,
                            borderRadius: "50%",
                            color: "#9D4141",
                            fontSize: 10,
                            fontWeight: 700,
                            cursor: "pointer",
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </span>
                      </span>
                    );
                  }}
                  MenuProps={menuSx}
                >
                  <MenuItem value="" sx={{ color: "#999", fontSize: "13px" }}>All Statuses</MenuItem>
                  {leadStatuses.map((st: any) => (
                    <MenuItem key={st.id} value={st.name} sx={{ fontSize: "13px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: st.color, display: "inline-block", flexShrink: 0 }} />
                        {st.name}
                      </span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* ── Assigned To — Autocomplete pill ── */}
              <Autocomplete
                size="small"
                options={assignedToOptions}
                getOptionLabel={(emp: any) => emp.displayName || emp.employeeName}
                value={assignedToOptions.find((e: any) => e.employeeId === assignedToFilter) ?? null}
                onChange={(_: any, emp: any) => setAssignedToFilter(emp?.employeeId ?? "")}
                isOptionEqualToValue={(opt: any, val: any) => opt.employeeId === val.employeeId}
                filterOptions={(options, { inputValue }) => {
                  const q = inputValue.toLowerCase();
                  if (!q) return options;
                  return options.filter((o: any) =>
                    (o.displayName || o.employeeName || '').toLowerCase().includes(q)
                  );
                }}
                sx={{ minWidth: isMobile ? 150 : 200 }}
                clearOnEscape
                renderOption={(props, emp: any) => (
                  <li {...props} key={emp.employeeId}>
                    {emp.employeeId === "__NA__" ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          backgroundColor: "#f0f0f0", display: "flex", alignItems: "center",
                          justifyContent: "center", fontSize: "8px", color: "#999", fontWeight: 700,
                          letterSpacing: "0.02em",
                        }}>N/A</span>
                        <span style={{ fontFamily: "Inter", fontSize: "13px", color: "#888" }}>N/A — UNASSIGNED</span>
                      </span>
                    ) : (
                      <span style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                        <img
                          src={emp.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}&size=32&background=random`}
                          alt={emp.employeeName}
                          style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0, filter: emp.isInactive ? "grayscale(60%)" : "none" }}
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.employeeName)}`; }}
                        />
                        <span style={{ fontFamily: "Inter", fontSize: "13px" }}>
                          {emp.isInactive ? (
                            <>
                              {emp.employeeName}{" "}
                              <span style={{ fontSize: "11px", color: "#999", fontWeight: 400 }}>(Inactive)</span>
                            </>
                          ) : emp.employeeName}
                        </span>
                      </span>
                    )}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Assigned To"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: assignedToFilter ? (
                        <InputAdornment position="start" sx={{ ml: "4px", mr: 0 }}>
                          {assignedToFilter === "__NA__" ? (
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%",
                              backgroundColor: "#f0f0f0", display: "inline-flex", alignItems: "center",
                              justifyContent: "center", fontSize: "7px", color: "#999", fontWeight: 700,
                              letterSpacing: "0.02em",
                            }}>N/A</span>
                          ) : (
                            <img
                              src={
                                assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.employeeName || ""
                                )}&size=24&background=random`
                              }
                              alt=""
                              style={{
                                width: 20, height: 20, borderRadius: "50%", objectFit: "cover",
                                filter: assignedEmployeesFromLeads.find((e: any) => e.employeeId === assignedToFilter)?.isInactive ? "grayscale(60%)" : "none",
                              }}
                            />
                          )}
                        </InputAdornment>
                      ) : undefined,
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "20px",
                        height: FILTER_HEIGHT,
                        fontFamily: "Inter",
                        fontSize: isMobile ? "10px" : "12px",
                        fontWeight: 600,
                        color: assignedToFilter ? "#9D4141" : "#000000",
                        paddingRight: "8px !important",
                        "& fieldset": {
                          borderColor: assignedToFilter ? "#9D4141" : "#A0B4D2",
                          borderWidth: "2px",
                          borderRadius: "20px",
                        },
                        "&:hover fieldset": { borderColor: "#9D4141" },
                        "&.Mui-focused fieldset": { borderColor: "#9D4141" },
                      },
                      "& .MuiOutlinedInput-input": {
                        padding: "0 4px !important",
                        fontFamily: "Inter",
                        fontSize: isMobile ? "10px" : "12px",
                        fontWeight: 600,
                        color: assignedToFilter ? "#9D4141" : "#000000",
                        "&::placeholder": {
                          color: "#A0B4D2",
                          opacity: 1,
                          fontFamily: "Inter",
                          fontSize: isMobile ? "10px" : "12px",
                          fontWeight: 600,
                        },
                      },
                      "& .MuiAutocomplete-endAdornment": {
                        right: "6px",
                        "& .MuiSvgIcon-root": {
                          color: assignedToFilter ? "#9D4141" : "#A0B4D2",
                          fontSize: "18px",
                        },
                      },
                    }}
                  />
                )}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "12px",
                      mt: 0.5,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      "& .MuiAutocomplete-listbox": {
                        maxHeight: 280,
                        fontFamily: "Inter",
                        "& .MuiAutocomplete-option": {
                          fontSize: "13px",
                          "&:hover": { backgroundColor: "rgba(157,65,65,0.06)" },
                          '&[aria-selected="true"]': { backgroundColor: "rgba(157,65,65,0.1)", color: "#9D4141", fontWeight: 600 },
                        },
                      },
                    },
                  },
                }}
              />

              {/* Spacer left */}
              <div style={{ flex: 1 }} />

              {/* ── Combined Stats Badge: No. of Leads | Total Cost ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  borderRadius: "22px",
                  border: "2px solid #9D4141",
                  overflow: "hidden",
                  background: "#fff",
                  boxShadow: "0 2px 8px rgba(157,65,65,0.10)",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {/* Left segment — No. of Leads */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isMobile ? "4px 10px" : "5px 16px",
                    background: "#9D4141",
                    gap: "1px",
                  }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: isMobile ? "9px" : "12px", fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Leads
                  </span>
                  <span style={{ fontFamily: "Inter", fontSize: isMobile ? "13px" : "15px", fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
                    {quickFilteredData?.length ?? 0}
                    <span style={{ fontSize: isMobile ? "10px" : "12px", fontWeight: 500, color: "rgba(255,255,255,0.65)", marginLeft: 2 }}>
                      / {tableData?.length ?? 0}
                    </span>
                  </span>
                </div>

                {/* Divider */}
                <div style={{ width: "1.5px", background: "#9D4141", opacity: 0.25, alignSelf: "stretch" }} />

                {/* Right segment — Total Cost */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: isMobile ? "4px 10px" : "5px 16px",
                    background: "linear-gradient(135deg, #fdf2f2 0%, #fce8e8 100%)",
                    gap: "1px",
                  }}
                >
                  <span style={{ fontFamily: "Inter", fontSize: isMobile ? "9px" : "12px", fontWeight: 600, color: "#b06060", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Total Cost
                  </span>
                  <span style={{ fontFamily: "Inter", fontSize: isMobile ? "13px" : "15px", fontWeight: 800, color: "#9D4141", lineHeight: 1.1, letterSpacing: "0.01em" }}>
                    {formatCost(totalFilteredCost)}
                  </span>
                </div>
              </div>

              {/* Spacer right */}
              <div style={{ flex: 1 }} />

              {/* Clear all filters */}
              {hasAnyFilter && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "13px", color: "#9D4141", fontWeight: 700,
                    fontFamily: "Inter", padding: "2px 0",
                    textDecoration: "underline", textUnderlineOffset: "2px",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
          </div>
        )}

        <MaterialTable
          columns={columns}
          data={quickFilteredData}
          tableName="LeadsTablesMain"
          employeeId={currentEmployeeId}
          resource="LEADS"
          viewOwn={true}
          viewOthers={true}
          checkOwnWithOthers={true}
          enableColumnResizing={true}
          layoutMode="grid"
          muiTableContainerProps={{ sx: { maxHeight: "700px", overflowX: "auto" } }}
          muiTableProps={{
            sx: { borderCollapse: "separate", borderSpacing: "0 20px !important" },
            muiTableBodyRowProps: ({ row }: any) => ({
              sx: {
                cursor: "pointer",
                backgroundColor: `${row.original?.status?.color}20`,
                transition: "all 0.2s ease",
                "& .MuiTableCell-root": { fontSize: "15.5px", fontFamily: "Inter", fontWeight: "500", padding: "16px 20px !important", border: "none", color: "#333" },
                "& .MuiTableCell-root:first-of-type": { borderTopLeftRadius: "12px", borderBottomLeftRadius: "12px" },
                "& .MuiTableCell-root:last-of-type": { borderTopRightRadius: "12px", borderBottomRightRadius: "12px" },
                "&:hover": { backgroundColor: `${row.original?.status?.color}40`, transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
              },
              onClick: () => navigate(`/employee/lead/${row.original.id}`, { state: { leadData: row.original.id } }),
            }),
          }}
        />

        <DetailsModal open={isModalOpen} onClose={handleCloseModal} Datas={templateData} />
      </Box>

      {formValues && (
        <LeadFormModal
          leadTemplateId={formValues?.leadTemplateId}
          open={true}
          onClose={() => setFormValues(null)}
          title={`Edit ${formValues.title || formValues?.projectName} Lead`}
          initialData={{ id: formValues?.leadTemplateId }}
          initialFormData={formValues}
          isEditMode={true}
        />
      )}

      <Modal show={showChartSettingsModal} onHide={handleCloseChartSettingsModal} size="xl" centered className="responsive-modal">
        <Modal.Body style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px" }}>
            <span style={{ fontFamily: "Inter", fontWeight: 600, fontSize: "18px", color: "#333" }}>Customize Cards Visibility</span>
            <LeadsProjectCompanyChartSettings type={PROJECT_CHART_SETTINGS_MODAL_TYPE.LEAD} />
          </div>
        </Modal.Body>
      </Modal>

      {/* Bulk Import Modal from file 2 */}
      <LeadBulkImport
        show={showBulkImport}
        onHide={() => setShowBulkImport(false)}
      />
    </>
  );
};

export default LeadNewLead;
