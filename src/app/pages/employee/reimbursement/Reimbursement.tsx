import React, { useRef } from "react";
import { KTCard, KTCardBody, KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Route, Routes, Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import PendingReimbursementsPage, { PendingReimbursementsPageHandle } from "./PendingReimbursementsPage";
import MaterialTable from "@app/modules/common/components/MaterialTable";
import { errorConfirmation, successConfirmation } from "@utils/modal";
import { useFormik } from "formik";
import { useEffect, useState } from "react";
import * as Yup from "yup";
import dayjs, { Dayjs } from "dayjs";
import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@redux/store";
import { MRT_ColumnDef } from "material-react-table";
import MaterialToggleReimbursement, {
  PeriodAlignment,
  ToggleItemsCallBackFunctions,
} from "./MaterialToggleReimbursement";
import { UsersListWrapper } from "@app/modules/apps/user-management/users-list/UsersList";
import {
  fetchAllReimbursementTypesFromDb,
  fetchEmpAlltimeReimbursements,
  fetchEmpMonthlyReimbursements,
  fetchEmpYearlyReimbursements,
} from "@utils/statistics";
import { IReimbursementsCreate, IReimbursementsFetch, IReimbursementsUpdate } from "@models/employee";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues, useField } from "formik";
import { Option } from "@models/dropdown";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import { createNewTowns, fetchAllReimbursementTypes, fetchAllTowns } from "@services/options";
import ReimbursementDropdown from "@app/modules/common/inputs/ReimbursementDropdown";
import { uploadUserAsset } from "@services/uploader";
import { createPendingReimbursementDraft, updatePendingReimbursementDraft, updateReimbursementById, downloadEmployeePeriodBillPdf } from "@services/employee";
import { generateFiscalYearFromGivenYear } from "@utils/file";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import ReimbursementPaymentHistoryTable from "./components/ReimbursementPaymentHistoryTable";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import eventBus from "@utils/EventBus";
import { useEventBus } from "@hooks/useEventBus";
import { EVENT_KEYS } from "@constants/eventKeys";
import { Select } from "@mui/material";
import { getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { getAllProjects, getAllProjectStatuses } from "@services/projects";

const getReimbursementSchema = (currentReimbursement: IReimbursementsCreate) => {
  return Yup.object({
    expenseDate: currentReimbursement
      ? Yup.string().label("Date")
      : Yup.string().required().label("Date"),
    clientTypeId: Yup.string().label("Company Type"),
    clientCompanyId: Yup.string().required("Company Name is required").label("Company Name"),
    projectId: Yup.string().required("Project Name is required").label("Project"),
    reimbursementTypeId: currentReimbursement
      ? Yup.string().label("Reimbursement For")
      : Yup.string().required().label("Reimbursement For"),
    amount: currentReimbursement
      ? Yup.number()
          .required()
          .label("Amount")
          .min(1, "Amount must be greater than 0")
          .max(1000000, "Amount must be less than 10,00,000")
      : Yup.number()
          .required()
          .label("Amount")
          .min(1, "Amount must be greater than 0")
          .max(1000000, "Amount must be less than 10,00,000"),
    description: Yup.string().label("Note"),
    document: currentReimbursement
      ? Yup.string().label("Reference Document")
      : Yup.string().label("Reference Document"),
    fromLocation: Yup.string().required("From Location is required").matches(/^[a-zA-Z\s]*$/, "From Location must contain only alphabets").label("From Location"),
    toLocation: Yup.string().required("To Location is required").matches(/^[a-zA-Z\s]*$/, "To Location must contain only alphabets").label("To Location"),
  });
};

let initialState = {
  expenseDate: dayjs().format("YYYY-MM-DD"),
  clientTypeId: "",
  clientCompanyId: "",
  projectId: "",
  reimbursementTypeId: "",
  fromLocation: "",
  toLocation: "",
  amount: undefined,
  document: "",
  description: "",
};

function Reimbursement() {
  const [totalRequestedAmount, setTotalRequestedAmount] = useState(0);
  const dispatch = useDispatch();
  const [totalRequests, setTotalRequests] = useState(0);
  const [approvedRequests, setApprovedRequests] = useState(0);
  const [rejectedRequests, setRejectedRequests] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [approvedAmount, setApprovedAmount] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [rejectedAmount, setRejectedAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [currentPeriod, setCurrentPeriod] = useState<{ alignment: PeriodAlignment; date: Dayjs }>({ alignment: 'monthly', date: dayjs() });
  const [showEditDeleteOption, setShowEditDeleteOption] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [pendingDraftsCount, setPendingDraftsCount] = useState(0);
  const pendingPageRef = useRef<PendingReimbursementsPageHandle>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Landed here from the mobile bottom-nav "+" quick-actions sheet — open the
  // New Reimbursement modal immediately instead of making the user find/tap the
  // button. Clears the nav state after so a back/forward or refresh doesn't
  // re-trigger it.
  useEffect(() => {
    if ((location.state as any)?.quickAction === 'newExpense') {
      pendingPageRef.current?.openAddModal();
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [show, setShow] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [reimbursementOptions, setReimbursementOptions] = useState<any[]>([]);
  const [selectedReimbursementFor, setSelectedReimbursementFor] =
    useState<Option | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentReimbursement, setCurrentReimbursement] = useState<any>(null);
  const employeeId = useSelector(
    (state: RootState) => state.employee.currentEmployee.id
  );
  const employeeCode = useSelector(
    (state: RootState) => state.employee.currentEmployee.employeeCode
  );
  const authUser = useSelector((state: RootState) => state.auth.currentUser);
  const employeeName = `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim();
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  // Client type / company / project state
  // companyTypeOptions is scoped to types actually used as a project's File Location;
  // allCompanyTypeOptions is the full master list, kept only to resolve labels for
  // legacy reimbursements whose saved type/company predates that scoping.
  const [companyTypeOptions, setCompanyTypeOptions] = useState<Option[]>([]);
  const [allCompanyTypeOptions, setAllCompanyTypeOptions] = useState<Option[]>([]);
  const [allClientCompanies, setAllClientCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  // Full project list (title + fileLocationCompanyType/fileLocationCompany), loaded once.
  // Powers the Project dropdown's direct-search + Company Type/Name reverse-autofill.
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedClientType, setSelectedClientType] = useState<Option | null>(null);
  const [selectedClientCompany, setSelectedClientCompany] = useState<Option | null>(null);
  const [selectedProject, setSelectedProject] = useState<Option | null>(null);
  // IDs of project statuses that are considered "On Ongoing" — loaded from DB on mount
  const [ongoingStatusIds, setOngoingStatusIds] = useState<string[]>([]);

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void { /* handled by onPeriodChange */ },
    yearly: function (year: Dayjs): void { /* handled by onPeriodChange */ },
    allTime: function (): void { /* handled by onPeriodChange */ },
  };

  // ── Shared stats calculator ────────────────────────────────────────────────
  const applyStats = (data: IReimbursementsFetch[]) => {
    let totalAmount = 0, totalRequest = 0, approvedCount = 0, rejectedCount = 0, pendingCount = 0;
    let approvedAmt = 0, pendingAmt = 0, rejectedAmt = 0, paidAmt = 0, remainingAmt = 0;
    data.forEach((ele) => {
      if (ele.id) {
        const amt = parseInt(ele.amount ?? "0");
        totalAmount += amt;
        totalRequest += 1;
        if (ele.status === "Pending") {
          pendingCount++;
          pendingAmt += amt;
        } else if (ele.status === "Rejected") {
          rejectedCount++;
          rejectedAmt += amt;
        } else {
          approvedCount++;
          approvedAmt += amt;
          if (ele.paymentStatus === 'PAID') {
            paidAmt += amt;
          } else {
            remainingAmt += amt;
          }
        }
      }
    });
    setTotalRequestedAmount(totalAmount);
    setTotalRequests(totalRequest);
    setApprovedRequests(approvedCount);
    setRejectedRequests(rejectedCount);
    setPendingRequests(pendingCount);
    setApprovedAmount(approvedAmt);
    setPendingAmount(pendingAmt);
    setRejectedAmount(rejectedAmt);
    setPaidAmount(paidAmt);
    setRemainingAmount(remainingAmt);
    setOverviewLoading(false);
  };

  // ── Stats: re-fetch whenever the period or a data mutation occurs ──────────
  useEffect(() => {
    const { alignment, date } = currentPeriod;
    const fetchPromise =
      alignment === 'monthly' ? fetchEmpMonthlyReimbursements(date) :
      alignment === 'yearly'  ? fetchEmpYearlyReimbursements(date)  :
      fetchEmpAlltimeReimbursements();
    fetchPromise.then((data) => {
      applyStats(data);
      setReimbursementData(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriod, statsRefreshKey, employeeId]);

  // Refresh stats whenever a reimbursement changes on any connected client (WebSocket)
  useEventBus(EVENT_KEYS.reimbursementChanged, () => {
    setStatsRefreshKey((prev) => prev + 1);
  });

  // ── Load all static dropdown data once on mount ────────────────────────────
  useEffect(() => {
    fetchAllReimbursementsTypesData();
    loadClientTypeAndCompanyData();
  }, []);

  const fetchAllReimbursementsTypesData = async () => {
    const reimbursementResponse = await fetchAllReimbursementTypesFromDb();
    const opts = reimbursementResponse.map((r: any) => ({
      value: r.id,
      label: r.type,
      icon: r.icon,   // keep icon on every option object
    })).sort((a: any, b: any) => a.label.localeCompare(b.label));
    setReimbursementOptions(opts);
  };

  const loadClientTypeAndCompanyData = async () => {
    setProjectsLoading(true);
    try {
      const [typesRes, companiesRes, statusesRes, projectsRes] = await Promise.all([
        getAllCompanyTypes(),
        getAllClientCompanies(),
        getAllProjectStatuses(),
        getAllProjects(),
      ]);
      const types = (typesRes.companyTypes || []).map((ct: any) => ({
        value: ct.id,
        label: ct.name,
      })).sort((a: Option, b: Option) => a.label.localeCompare(b.label));
      setAllCompanyTypeOptions(types);

      // Confirmed key from ClientCompaniesMain.tsx: companiesRes?.data?.companies
      const companies =
        companiesRes?.data?.companies ||
        companiesRes?.clientCompanies ||
        companiesRes?.data?.clientCompanies ||
        companiesRes?.companies ||
        [];
      setAllClientCompanies(companies);

      const projects = projectsRes?.data?.projects || projectsRes?.projects || [];
      setAllProjects(projects);

      // Company Type/Name options are scoped to only those actually set as a
      // project's File Location In Computer Folder — not the full client-company
      // master list — per the "fetch from File Location" flow requirement.
      const usedTypeIds = new Set(
        projects.map((p: any) => p.fileLocationCompanyType).filter(Boolean)
      );
      setCompanyTypeOptions(types.filter((t: Option) => usedTypeIds.has(t.value)));

      // Derive "On Ongoing" status IDs from the Project Configuration table — no hardcoded values
      const allStatuses: any[] = statusesRes?.projectStatuses || [];
      const ids = allStatuses
        .filter((s: any) => s.name?.trim().toLowerCase() === "on ongoing")
        .map((s: any) => s.id);
      setOngoingStatusIds(ids);
    } catch (err) {
      console.error("Failed to load client data", err);
    } finally {
      setProjectsLoading(false);
    }
  };

  // Company Name options for a given Company Type — scoped to companies actually
  // used as a project's File Location under that type.
  const computeFilteredCompaniesForType = (typeId: string) => {
    const usedCompanyIds = new Set(
      allProjects
        .filter((p: any) => p.fileLocationCompanyType === typeId)
        .map((p: any) => p.fileLocationCompany)
        .filter(Boolean)
    );
    return allClientCompanies
      .filter((c: any) => c.companyTypeId === typeId && usedCompanyIds.has(c.id))
      .sort((a: any, b: any) => a.companyName.localeCompare(b.companyName));
  };

  // ── REACTIVE edit-mode restoration (LeadFormModal pattern) ────────────────
  // Runs whenever EITHER currentReimbursement OR the loaded arrays change.
  // This guarantees that even if the arrays finish loading after handleEdit fires,
  // the dropdowns will still resolve correctly — no stale closure issues.
  useEffect(() => {
    if (!editMode || !currentReimbursement) return;
    if (allCompanyTypeOptions.length === 0 || allClientCompanies.length === 0) return;

    const rec = currentReimbursement;

    // 1. Reimbursement For — find full option object so icon is included
    if (rec.reimbursementTypeId && reimbursementOptions.length > 0) {
      const match = reimbursementOptions.find((o: any) => o.value === rec.reimbursementTypeId);
      if (match) {
        setSelectedReimbursementFor({ value: match.value, label: match.label, ...(match.icon && { icon: match.icon }) } as any);
      }
    }

    // 2. Company Type — resolved against the FULL master list (not the File-Location-scoped
    // one) so editing an older reimbursement never shows a blank Type.
    if (rec.clientTypeId) {
      const ctMatch = allCompanyTypeOptions.find((c) => c.value === rec.clientTypeId);
      if (ctMatch) {
        setSelectedClientType({ value: ctMatch.value, label: ctMatch.label });
      }
      // Populate the browsable Company Name list for the restored client type.
      let filtered = computeFilteredCompaniesForType(rec.clientTypeId);

      // 3. Company Name — look up companyName from allClientCompanies. Legacy data may
      // reference a company that isn't (yet) a File Location company for any project —
      // still show it so editing doesn't silently drop the saved value.
      if (rec.clientCompanyId) {
        const ccMatch = allClientCompanies.find((c: any) => c.id === rec.clientCompanyId);
        if (ccMatch) {
          setSelectedClientCompany({ value: ccMatch.id, label: ccMatch.companyName });
          if (!filtered.some((c: any) => c.id === ccMatch.id)) {
            filtered = [...filtered, ccMatch].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName));
          }
        }
      }
      setFilteredCompanies(filtered);
    }
  }, [editMode, currentReimbursement, allCompanyTypeOptions, allClientCompanies, reimbursementOptions]);

  // ── Project options — always derived locally from the bulk project list so the field
  // can be searched directly regardless of Company Type/Name selection. Picking a Company
  // Type/Name narrows the list; picking a Project directly reverse-autofills them instead.
  useEffect(() => {
    if (allProjects.length === 0) {
      setProjectOptions([]);
      return;
    }
    let list = allProjects;
    if (selectedClientCompany?.value) {
      list = list.filter((p: any) => p.fileLocationCompany === selectedClientCompany.value);
    } else if (selectedClientType?.value) {
      list = list.filter((p: any) => p.fileLocationCompanyType === selectedClientType.value);
    }
    // Keep ongoing projects, plus the currently-saved project even if its status has since
    // changed, so existing reimbursements never lose their linked project reference.
    const keepId = editMode ? currentReimbursement?.projectId : undefined;
    list = list.filter((p: any) => (p.status?.id && ongoingStatusIds.includes(p.status.id)) || p.id === keepId);

    const opts: Option[] = list
      .map((p: any) => ({ value: p.id, label: p.title }))
      .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
    setProjectOptions(opts);

    if (editMode && currentReimbursement?.projectId) {
      const projMatch = opts.find((o) => o.value === currentReimbursement.projectId);
      if (projMatch) setSelectedProject(projMatch);
    }
  }, [allProjects, selectedClientType, selectedClientCompany, ongoingStatusIds, editMode, currentReimbursement]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleNew = () => {
    setSelectedReimbursementFor(null);
    setSelectedClientType(null);
    setSelectedClientCompany(null);
    setSelectedProject(null);
    setFilteredCompanies([]);
    setProjectOptions([]);

    initialState = {
      expenseDate: dayjs().format("YYYY-MM-DD"),
      clientTypeId: "",
      clientCompanyId: "",
      projectId: "",
      reimbursementTypeId: "",
      fromLocation: "",
      toLocation: "",
      amount: undefined,
      document: "",
      description: "",
    };

    setShow(true);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  // handleEdit is now simple — just set state. The reactive useEffects above
  // handle all dropdown restoration once arrays are confirmed non-empty.
  const handleEdit = (reimbursement: IReimbursementsUpdate) => {
    // Reset all selected dropdowns first so stale values never flash
    setSelectedReimbursementFor(null);
    setSelectedClientType(null);
    setSelectedClientCompany(null);
    setSelectedProject(null);
    setFilteredCompanies([]);
    setProjectOptions([]);

    setCurrentReimbursement(reimbursement);
    setEditMode(true);
    setShow(true);
  };

  const handleSubmit = async (values: any, actions: FormikValues) => {
    try {
      setLoading(true);
      if (editMode) {
        if (values.employee) delete values.employee;
        if (values.employeeId) delete values.employeeId;
        if (values.reimbursementType) delete values.reimbursementType;
        if (values.type) delete values.type;
        if (values.day) delete values.day;
        if (values.isActive) delete values.isActive;
        if (values.status) delete values.status;

        const filteredValues = Object.fromEntries(
          Object.entries(values).filter(
            ([key, value]) => key === "amount" || value !== ""
          )
        );

        await updateReimbursementById(currentReimbursement.id, filteredValues);
        setLoading(false);
        successConfirmation("Reimbursement updated successfully");
        eventBus.emit("reimbursementRecords", { records: [] });
        setStatsRefreshKey((prev) => prev + 1);
        setShow(false);
        setEditMode(false);
        return;
      }

      values.employeeId = employeeId;
      // Filter out properties with empty string values, except for "amount"
      const filteredValues = Object.fromEntries(
        Object.entries(values).filter(
          ([key, value]) => key === "amount" || value !== ""
        )
      );

      const payload: IReimbursementsCreate = {
        ...filteredValues,
        reimbursementTypeId: filteredValues.reimbursementTypeId,
        expenseDate: filteredValues.expenseDate,
        amount: filteredValues.amount ?? 0,
        description: filteredValues.description,
      } as IReimbursementsCreate;

      await createPendingReimbursementDraft(payload);
      setLoading(false);
      successConfirmation("Reimbursement saved to Pending Requests. Go to 'Pending Requests' to submit for approval.");
      setShow(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handlePeriodChange = (alignment: PeriodAlignment, date: Dayjs) => {
    setOverviewLoading(true);
    setCurrentPeriod({ alignment, date });
  };

  const [downloadingBill, setDownloadingBill] = useState(false);

  const handleDownloadBill = async () => {
    if (!employeeId) {
      errorConfirmation('Employee information is unavailable.');
      return;
    }

    const hasApproved = reimbursementData.some((r) => r.status === 'Approved');
    if (!hasApproved) {
      errorConfirmation('No approved reimbursements found for the selected period.');
      return;
    }

    setDownloadingBill(true);
    try {
      const { alignment, date } = currentPeriod;

      let from: string | undefined;
      let to: string | undefined;
      let label = 'All Time';

      if (alignment === 'monthly') {
        from = date.startOf('month').format('YYYY-MM-DD');
        to = date.endOf('month').format('YYYY-MM-DD');
        label = date.format('MMM YYYY');
      } else if (alignment === 'yearly') {
        try {
          const fy = await generateFiscalYearFromGivenYear(date);
          from = fy.startDate ? dayjs(fy.startDate).format('YYYY-MM-DD') : date.startOf('year').format('YYYY-MM-DD');
          to = fy.endDate ? dayjs(fy.endDate).format('YYYY-MM-DD') : date.endOf('year').format('YYYY-MM-DD');
        } catch {
          from = date.startOf('year').format('YYYY-MM-DD');
          to = date.endOf('year').format('YYYY-MM-DD');
        }
        label = `FY ${date.format('YYYY')}`;
      }

      const blob = await downloadEmployeePeriodBillPdf(employeeId, { from, to, label });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reimbursement_Bill_${label.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ PDF Download Error:', error);
      errorConfirmation('Failed to download reimbursement bill. Please try again.');
    } finally {
      setDownloadingBill(false);
    }
  };

  const handleClose = () => {
    setShow(false);
    setEditMode(false);
    setCurrentReimbursement(null);
  };

  // Preserves full option object (including icon) so ReimbursementDropdown
  // renders icon + name in the selected-value slot, not just in the list.
  const handleChange = (
    selectedOption: any,
    formikField: string,
    setSelectedOptionState: React.Dispatch<React.SetStateAction<any>>,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setFieldValue(formikField, selectedOption ? selectedOption.value : "");
    setSelectedOptionState(selectedOption || null);
  };

  const handleClientTypeChange = (
    option: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setSelectedClientType(option);
    setFieldValue("clientTypeId", option?.value || "");
    // Reset downstream fields
    setSelectedClientCompany(null);
    setFieldValue("clientCompanyId", "");
    setSelectedProject(null);
    setFieldValue("projectId", "");
    setFilteredCompanies(option?.value ? computeFilteredCompaniesForType(option.value) : []);
  };

  const handleClientCompanyChange = (
    option: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setSelectedClientCompany(option);
    setFieldValue("clientCompanyId", option?.value || "");
    // Reset project — the reactive projectOptions effect repopulates it for the new company.
    setSelectedProject(null);
    setFieldValue("projectId", "");
  };

  // Reverse autofill: picking a Project directly (independent of Company Type/Name)
  // backfills Company Type + Company Name from that project's File Location fields.
  const handleProjectChange = (
    option: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setSelectedProject(option);
    setFieldValue("projectId", option?.value || "");
    if (!option?.value) return;

    const proj = allProjects.find((p: any) => p.id === option.value);
    if (!proj) return;

    if (proj.fileLocationCompanyType) {
      const typeMatch = allCompanyTypeOptions.find((t) => t.value === proj.fileLocationCompanyType);
      if (typeMatch) {
        setSelectedClientType(typeMatch);
        setFieldValue("clientTypeId", typeMatch.value);
        setFilteredCompanies(computeFilteredCompaniesForType(typeMatch.value));
      }
    }
    if (proj.fileLocationCompany) {
      const companyMatch = allClientCompanies.find((c: any) => c.id === proj.fileLocationCompany);
      if (companyMatch) {
        setSelectedClientCompany({ value: companyMatch.id, label: companyMatch.companyName });
        setFieldValue("clientCompanyId", companyMatch.id);
      }
    }
  };

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    fileMaxUploadSize: number
  ) => {
    const {
      target: { files },
    } = event;
    if (files && files[0].size > fileMaxUploadSize) {
      alert("File size should not exceed 5 MB");
      event.target.value = "";
      return;
    }

    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const {
          data: { path },
        } = await uploadUserAsset(form, userId, undefined, "reimbursement-docs");
        formikProps.setFieldValue("document", path, true);
        console.log("File uploaded successfully!");
      } catch (error) {
        console.error("Failed to upload file. Please try again.");
      }
    }
  };

  return (
    <>
      {/* Pending Requests section with Employee Details + KPI overview */}
      <PendingReimbursementsPage
        ref={pendingPageRef}
        onDraftsChange={setPendingDraftsCount}
        totalRequests={totalRequests}
        totalRequestedAmount={totalRequestedAmount}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
        approvedAmount={approvedAmount}
        pendingAmount={pendingAmount}
        rejectedAmount={rejectedAmount}
        paidAmount={paidAmount}
        remainingAmount={remainingAmount}
        overviewLoading={overviewLoading}
      />

      {/* Divider */}
      <div style={{ borderColor: '#e9ecef', borderWidth: '2px' }} />

      <div className="d-flex justify-content-between align-items-center my-6">
        <h2 className="mb-0">My Reimbursement Records</h2>
      </div>
      <MaterialToggleReimbursement
        toggleItemsActions={toggleItemsActions}
        onPeriodChange={handlePeriodChange}
        showEditDeleteOption={true}
        resource={resourceNameMapWithCamelCase.reimbursement}
        viewOwn={true}
        viewOthers={false}
        viewMode="submissions"
        selectedEmployeeId={employeeId}
        actionSlot={
          <div className="d-flex align-items-center gap-3">
            {pendingDraftsCount === 0 && hasPermission(
              resourceNameMapWithCamelCase.reimbursement,
              permissionConstToUseWithHasPermission.create
            ) && (
              <button
                onClick={() => pendingPageRef.current?.openAddModal()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '7px 14px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e2e8f0'; }}
              >
                <KTIcon iconName='plus' className='fs-6' />
                <span>Add Reimbursement Request</span>
              </button>
            )}
            <button
              onClick={handleDownloadBill}
              disabled={downloadingBill}
              title="Download Reimbursement Slip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '7px 14px',
                border: 'none',
                borderRadius: '6px',
                background: '#d32f2f',
                color: '#fff',
                fontWeight: 500,
                fontSize: '12px',
                cursor: downloadingBill ? 'not-allowed' : 'pointer',
                opacity: downloadingBill ? 0.6 : 1,
                boxShadow: '0 2px 6px rgba(211,47,47,0.2)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!downloadingBill) { (e.currentTarget as HTMLButtonElement).style.background = '#b71c1c'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(211,47,47,0.3)'; } }}
              onMouseLeave={e => { if (!downloadingBill) { (e.currentTarget as HTMLButtonElement).style.background = '#d32f2f'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(211,47,47,0.2)'; } }}
            >
              {downloadingBill ? (
                <>
                  <span className="spinner-border spinner-border-sm" style={{ width: '1rem', height: '1rem', borderWidth: '0.15em' }} />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <KTIcon iconName="file-down" className="fs-6 text-white" />
                  <span>Download Reimbursement Slip</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {employeeId && (
        <ReimbursementPaymentHistoryTable
          employeeId={employeeId}
          employeeCode={employeeCode}
          employeeName={employeeName}
          refreshKey={statsRefreshKey}
        />
      )}

      {/* modal code starts here */}
      {/* 1. show/hide, 2. handleClose, 3. Title, 4. initialState, 5. reimbursementSchema, 6. handleSubmit */}
      <Modal show={show} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? "Edit" : "New"} Reimbursement Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Formik
            initialValues={{
              ...initialState,
              ...(editMode &&
                currentReimbursement && {
                  ...currentReimbursement,
                  expenseDate: currentReimbursement.expenseDate
                    ? dayjs(currentReimbursement.expenseDate).format("YYYY-MM-DD")
                    : dayjs().format("YYYY-MM-DD"),
                  clientTypeId: currentReimbursement?.clientTypeId || "",
                  clientCompanyId: currentReimbursement?.clientCompanyId || "",
                  projectId: currentReimbursement?.projectId || "",
                }),
            }}
            onSubmit={handleSubmit}
            validationSchema={getReimbursementSchema(currentReimbursement)}
          >
            {(formikProps) => {
              return (
                <Form
                  className="d-flex flex-column"
                  noValidate
                  id="employee_reimbursement_form"
                  // placeholder={undefined}
                >
                  {/* Row 1: Date */}
                  <div className="row">
                    <div className="col-lg-6 mb-7">
                      <DateInput
                        isRequired={currentReimbursement ? false : true}
                        inputLabel={"Select Date"}
                        formikProps={formikProps}
                        formikField="expenseDate"
                        placeHolder={"Select Date"}
                        maxDate={true}
                      />
                    </div>
                  </div>

                  {/* Row 2: Company Type + Company Name */}
                  <div className="row">
                    <div className="col-lg-6 mb-7">
                      <DropDownInput
                        isRequired={true}
                        formikField="clientTypeId"
                        inputLabel="Company Type"
                        placeholder="Select Company Type"
                        options={companyTypeOptions}
                        onChange={(option: any) =>
                          handleClientTypeChange(option, formikProps.setFieldValue)
                        }
                        value={selectedClientType}
                      />
                    </div>

                    <div className="col-lg-6 mb-7">
                      <DropDownInput
                        isRequired={true}
                        formikField="clientCompanyId"
                        inputLabel="Company Name"
                        placeholder={
                          !formikProps.values.clientTypeId
                            ? "Select Company Type First"
                            : filteredCompanies.length === 0
                            ? "No clients for this type"
                            : "Select Company Name"
                        }
                        options={[...filteredCompanies].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName)).map((c: any) => ({
                          value: c.id,
                          label: c.companyName,
                        }))}
                        disabled={!formikProps.values.clientTypeId}
                        onChange={(option: any) =>
                          handleClientCompanyChange(option, formikProps.setFieldValue)
                        }
                        value={selectedClientCompany}
                      />
                    </div>
                  </div>

                  {/* Row 3: Project (dynamic, loads based on client selection) */}
                  <div className="row">
                    <div className="col-lg mb-7">
                      <DropDownInput
                        isRequired={true}
                        formikField="projectId"
                        inputLabel="Choose Project Name"
                        placeholder={
                          projectsLoading
                            ? "Loading Projects..."
                            : projectOptions.length === 0
                            ? "No Ongoing Projects Found"
                            : "Search Project"
                        }
                        options={projectOptions}
                        disabled={projectsLoading}
                        onChange={(option: any) =>
                          handleProjectChange(option, formikProps.setFieldValue)
                        }
                        value={selectedProject}
                      />
                    </div>
                  </div>

                  {/* Row 4: Reimbursement For + Amount */}
                  <div className="row">
                    <div className="col-lg-6 mb-7">
                      <ReimbursementDropdown
                        isRequired={true}
                        handleChange={(option: any) => {
                          handleChange(
                            option,
                            "reimbursementTypeId",
                            setSelectedReimbursementFor,
                            formikProps.setFieldValue
                          );
                        }}
                        formikField="reimbursementTypeId"
                        inputLabel="Reimbursement For"
                        options={reimbursementOptions}
                        value={selectedReimbursementFor}
                      />
                    </div>

                    <div className="col-lg-6">
                      <TextInput
                        isRequired={true}
                        label="Enter Amount"
                        margin="mb-7"
                        formikField="amount"
                        inputValidation="decimal"
                        // type="number"
                      />
                    </div>
                  </div>

                  {/* Row 5: From Location + To Location */}
                  <div className="row">
                    <div className="col-lg-6">
                      <label className="form-label fw-bold required">From Location</label>
                      <input
                        type="text"
                        className={`form-control form-control-lg form-control-solid${formikProps.touched.fromLocation && formikProps.errors.fromLocation ? " is-invalid" : ""}`}
                        placeholder="From Location"
                        {...formikProps.getFieldProps("fromLocation")}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (!/^[a-zA-Z\s]$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) e.preventDefault();
                        }}
                      />
                      {formikProps.touched.fromLocation && formikProps.errors.fromLocation && (
                        <div className="fv-plugins-message-container">
                          <div className="fv-help-block">{String(formikProps.errors.fromLocation)}</div>
                        </div>
                      )}
                    </div>

                    <div className="col-lg-6 mb-7">
                      <label className="form-label fw-bold required">To Location</label>
                      <input
                        type="text"
                        className={`form-control form-control-lg form-control-solid${formikProps.touched.toLocation && formikProps.errors.toLocation ? " is-invalid" : ""}`}
                        placeholder="To Location"
                        {...formikProps.getFieldProps("toLocation")}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (!/^[a-zA-Z\s]$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) e.preventDefault();
                        }}
                      />
                      {formikProps.touched.toLocation && formikProps.errors.toLocation && (
                        <div className="fv-plugins-message-container">
                          <div className="fv-help-block">{String(formikProps.errors.toLocation)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 6: Document Upload */}
                  <div className="row">
                    <div className="col-lg-12">
                      <label className="mb-3 fw-bold">Upload Reimbursement Bill</label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="form-control form-control-lg form-control-solid"
                        required={false}
                        onChange={(event) =>
                          uploadFile(event, formikProps, 5 * 1024 * 1024)
                        }
                      />
                      {!reimbursementData &&
                        formikProps.touched.document &&
                        formikProps.errors.document && (
                          <div className="fv-plugins-message-container">
                            <div className="fv-help-block">
                              {typeof formikProps.errors.document === "string" &&
                                formikProps.errors.document}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Row 7: Remark */}
                  <div className="col-lg">
                    <TextInput
                      label="Remark"
                      margin="mb-7"
                      formikField="description"
                      isRequired={false}
                    />
                  </div>

                  {/* Submit */}
                  <div className="d-flex justify-content-end mt-5">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        loading || !formikProps.isValid || formikProps.isSubmitting
                      }
                    >
                      {!loading && (editMode ? "Save Changes" : "Save to Pending Requests")}
                      {loading && (
                        <span
                          className="indicator-progress"
                          style={{ display: "block" }}
                        >
                          Please wait...{" "}
                          <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                        </span>
                      )}
                    </button>
                  </div>
                </Form>
              );
            }}
          </Formik>
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Reimbursement;
