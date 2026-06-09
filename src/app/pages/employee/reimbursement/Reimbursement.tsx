import React from "react";
import { KTCard, KTCardBody } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { Route, Routes, Outlet, Navigate } from "react-router-dom";
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
import { createEmployeeReimbursement, updateReimbursementById } from "@services/employee";
import Overview from "./views/common/Overview";
import { permissionConstToUseWithHasPermission, resourceNameMapWithCamelCase } from "@constants/statistics";
import { fetchRolesAndPermissions } from "@redux/slices/rolesAndPermissions";
import { hasPermission } from "@utils/authAbac";
import eventBus from "@utils/EventBus";
import { Select } from "@mui/material";
import { getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { getProjectsByCompanyId } from "@services/projects";
const getProjectsByCompanyIdForReimbursement = getProjectsByCompanyId;

const getReimbursementSchema = (currentReimbursement: IReimbursementsCreate) => {
  return Yup.object({
    expenseDate: currentReimbursement
      ? Yup.string().label("Date")
      : Yup.string().required().label("Date"),
    clientTypeId: Yup.string().label("Client Type"),
    clientCompanyId: Yup.string().label("Client Name"),
    projectId: Yup.string().label("Project"),
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
    description: currentReimbursement
      ? Yup.string().label("Note")
      : Yup.string().required().label("Note"),
    document: currentReimbursement
      ? Yup.string().label("Reference Document")
      : Yup.string().label("Reference Document"),
    fromLocation: Yup.string().matches(/^[a-zA-Z\s]*$/, "From Location must contain only alphabets").label("From Location"),
    toLocation: Yup.string().matches(/^[a-zA-Z\s]*$/, "To Location must contain only alphabets").label("To Location"),
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
  const [reimbursementData, setReimbursementData] = useState<IReimbursementsFetch[]>([]);
  const [showEditDeleteOption, setShowEditDeleteOption] = useState(true);
  const [refreshFlag, setRefreshFlag] = useState(false);
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
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);

  // Client type / company / project state
  const [companyTypeOptions, setCompanyTypeOptions] = useState<Option[]>([]);
  const [allClientCompanies, setAllClientCompanies] = useState<any[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<any[]>([]);
  const [projectOptions, setProjectOptions] = useState<Option[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedClientType, setSelectedClientType] = useState<Option | null>(null);
  const [selectedClientCompany, setSelectedClientCompany] = useState<Option | null>(null);
  const [selectedProject, setSelectedProject] = useState<Option | null>(null);

  const toggleItemsActions: ToggleItemsCallBackFunctions = {
    monthly: function (month: Dayjs): void {
      fetchEmpMonthlyReimbursements(month);
    },
    yearly: function (year: Dayjs): void {
      fetchEmpYearlyReimbursements(year);
    },
    allTime: function (year: Dayjs): void {
      fetchEmpAlltimeReimbursements();
    },
  };

  // ── Stats load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const currentYear = dayjs().startOf("year");
    fetchEmpYearlyReimbursements(currentYear).then((data) => {
      let totalAmount = 0,
        totalRequest = 0,
        approvedCount = 0,
        rejectedCount = 0,
        pendingCount = 0;
      data.forEach((ele) => {
        if (ele.id && ele.employeeId == employeeId) {
          totalAmount += parseInt(ele.amount ? ele.amount : "0");
          totalRequest += 1;
          if (ele.status == "Pending") {
            pendingCount += 1;
          } else if (ele.status == "Rejected") {
            rejectedCount += 1;
          } else {
            approvedCount += 1;
          }
        }
      });
      setApprovedRequests(approvedCount);
      setPendingRequests(pendingCount);
      setRejectedRequests(rejectedCount);
      setTotalRequests(totalRequest);
      setTotalRequestedAmount(totalAmount);
      setReimbursementData(data);
    });
  }, [show, employeeId]);

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
    try {
      const [typesRes, companiesRes] = await Promise.all([
        getAllCompanyTypes(),
        getAllClientCompanies(),
      ]);
      const types = (typesRes.companyTypes || []).map((ct: any) => ({
        value: ct.id,
        label: ct.name,
      })).sort((a: Option, b: Option) => a.label.localeCompare(b.label));
      setCompanyTypeOptions(types);

      // Confirmed key from ClientCompaniesMain.tsx: companiesRes?.data?.companies
      const companies =
        companiesRes?.data?.companies ||
        companiesRes?.clientCompanies ||
        companiesRes?.data?.clientCompanies ||
        companiesRes?.companies ||
        [];
      setAllClientCompanies(companies);
    } catch (err) {
      console.error("Failed to load client data", err);
    }
  };

  // ── REACTIVE edit-mode restoration (LeadFormModal pattern) ────────────────
  // Runs whenever EITHER currentReimbursement OR the loaded arrays change.
  // This guarantees that even if the arrays finish loading after handleEdit fires,
  // the dropdowns will still resolve correctly — no stale closure issues.
  useEffect(() => {
    if (!editMode || !currentReimbursement) return;
    if (companyTypeOptions.length === 0 || allClientCompanies.length === 0) return;

    const rec = currentReimbursement;

    // 1. Reimbursement For — find full option object so icon is included
    if (rec.reimbursementTypeId && reimbursementOptions.length > 0) {
      const match = reimbursementOptions.find((o: any) => o.value === rec.reimbursementTypeId);
      if (match) {
        setSelectedReimbursementFor({ value: match.value, label: match.label, ...(match.icon && { icon: match.icon }) } as any);
      }
    }

    // 2. Client Type — look up name from companyTypeOptions
    if (rec.clientTypeId) {
      const ctMatch = companyTypeOptions.find((c) => c.value === rec.clientTypeId);
      if (ctMatch) {
        setSelectedClientType({ value: ctMatch.value, label: ctMatch.label });
      }
      // Populate filtered companies for the restored client type
      const filtered = allClientCompanies.filter(
        (c: any) => c.companyTypeId === rec.clientTypeId
      );
      setFilteredCompanies([...filtered].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName)));

      // 3. Client Name — look up companyName from allClientCompanies
      if (rec.clientCompanyId) {
        const ccMatch = allClientCompanies.find((c: any) => c.id === rec.clientCompanyId);
        if (ccMatch) {
          setSelectedClientCompany({ value: ccMatch.id, label: ccMatch.companyName });
        }
      }
    }
  }, [editMode, currentReimbursement, companyTypeOptions, allClientCompanies, reimbursementOptions]);

  // ── REACTIVE project restoration — runs after clientCompanyId + projectId are known ──
  // Separated so project fetch doesn't block the type/name restoration above.
  useEffect(() => {
    if (!editMode || !currentReimbursement?.clientCompanyId) return;

    // Pass the currently saved projectId so the server always includes that project
    // in results even if its status has since changed from "On Ongoing" — this
    // keeps historical reimbursement records intact without breaking old data.
    getProjectsByCompanyIdForReimbursement(
      currentReimbursement.clientCompanyId
    )
      .then((res: any) => {
        const projects = res?.projects || res?.data?.projects || [];
        const opts: Option[] = projects.map((p: any) => ({
          value: p.id,
          label: p.title,
        })).sort((a: Option, b: Option) => a.label.localeCompare(b.label));
        setProjectOptions(opts);

        if (currentReimbursement.projectId) {
          const projMatch = opts.find((o) => o.value === currentReimbursement.projectId);
          setSelectedProject(projMatch || null);
        }
      })
      .catch(() => setProjectOptions([]));
  }, [editMode, currentReimbursement?.clientCompanyId, currentReimbursement?.projectId]);

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

      await createEmployeeReimbursement(payload);
      setLoading(false);
      successConfirmation("Reimbursement created successfully");
      eventBus.emit("reimbursementRecords", { records: [] });
      setShow(false);
    } catch (err) {
      setLoading(false);
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
    setProjectOptions([]);
    if (option?.value) {
      const filtered = allClientCompanies.filter(
        (c: any) => c.companyTypeId === option.value
      );
      setFilteredCompanies([...filtered].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName)));
    } else {
      setFilteredCompanies([]);
    }
  };

  const handleClientCompanyChange = async (
    option: any,
    setFieldValue: (field: string, value: any) => void
  ) => {
    setSelectedClientCompany(option);
    setFieldValue("clientCompanyId", option?.value || "");
    // Reset project
    setSelectedProject(null);
    setFieldValue("projectId", "");
    setProjectOptions([]);

    if (option?.value) {
      setProjectsLoading(true);
      try {
        // In create mode there is no pre-existing project, so no includeProjectId is passed.
        // The server will return only projects whose status is "On Ongoing".
        const res = await getProjectsByCompanyIdForReimbursement(option.value);
        const projects = res?.projects || res?.data?.projects || [];
        setProjectOptions(
          projects.map((p: any) => ({
            value: p.id,
            label: p.title,
          })).sort((a: Option, b: Option) => a.label.localeCompare(b.label))
        );
      } catch {
        setProjectOptions([]);
      } finally {
        setProjectsLoading(false);
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
      {/* <UsersListWrapper /> */}
      <Overview
        totalRequestedAmount={totalRequestedAmount}
        totalRequests={totalRequests}
        approvedRequests={approvedRequests}
        rejectedRequests={rejectedRequests}
        pendingRequests={pendingRequests}
      />

      <div
        className="py-1 rounded-3 my-4 d-flex justify-content-end align-items-center"
        style={{ paddingRight: "1.25rem" }}
      >
        {hasPermission(
          resourceNameMapWithCamelCase.reimbursement,
          permissionConstToUseWithHasPermission.create
        ) && (
          <button
            className="d-flex justify-content-between align-items-center bg-primary  btn btn-lg btn-primary fs-5 w-auto"
            onClick={() => handleNew()}
          >
            <div className="d-flex justify-content-center invisible"></div>
            <div>Request Reimbursement</div>
          </button>
        )}
      </div>
      <div className="my-6">
        <h2>My Reimbursement Records</h2>
      </div>
      <MaterialToggleReimbursement
        toggleItemsActions={toggleItemsActions}
        onEdit={handleEdit}
        showEditDeleteOption={showEditDeleteOption}
        resource={resourceNameMapWithCamelCase.reimbursement}
        viewOwn={true}
        viewOthers={false}
      />

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
              useEffect(() => {}, []); // fetch any data if required in future in useEffect
              return (
                <Form
                  className="d-flex flex-column"
                  noValidate
                  id="employee_reimbursement_form"
                  placeholder={undefined}
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

                  {/* Row 2: Client Type + Client Name */}
                  <div className="row">
                    <div className="col-lg-6 mb-7">
                      <DropDownInput
                        isRequired={true}
                        formikField="clientTypeId"
                        inputLabel="Client Type"
                        placeholder="Select Client Type"
                        options={companyTypeOptions}
                        onChange={(option: any) =>
                          handleClientTypeChange(option, formikProps.setFieldValue)
                        }
                        value={selectedClientType}
                      />
                    </div>

                    <div className="col-lg-6 mb-7">
                      <DropDownInput
                        isRequired={false}
                        formikField="clientCompanyId"
                        inputLabel="Client Name"
                        placeholder={
                          !formikProps.values.clientTypeId
                            ? "Select Client Type First"
                            : filteredCompanies.length === 0
                            ? "No clients for this type"
                            : "Select Client Name"
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
                        isRequired={false}
                        formikField="projectId"
                        inputLabel="Choose Project Name"
                        placeholder={
                          !formikProps.values.clientCompanyId
                            ? "Select Client Type & Name First"
                            : projectsLoading
                            ? "Loading Projects..."
                            : projectOptions.length === 0
                            ? "No Ongoing Projects Found"
                            : "Select Project"
                        }
                        options={projectOptions}
                        disabled={!formikProps.values.clientCompanyId || projectsLoading}
                        onChange={(option: any) => {
                          setSelectedProject(option);
                          formikProps.setFieldValue("projectId", option?.value || "");
                        }}
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
                      <label className="form-label fw-bold">From Location</label>
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
                      <label className="form-label fw-bold">To Location</label>
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
                      isRequired={true}
                      label="Remark"
                      margin="mb-7"
                      formikField="description"
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
                      {!loading && "Save Changes"}
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
