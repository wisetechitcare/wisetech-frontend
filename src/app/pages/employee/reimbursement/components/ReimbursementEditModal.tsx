import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import dayjs from "dayjs";
import { Option } from "@models/dropdown";
import { IReimbursementsUpdate } from "@models/employee";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import ReimbursementDropdown from "@app/modules/common/inputs/ReimbursementDropdown";
import { updateReimbursementById } from "@services/employee";
import { uploadUserAsset } from "@services/uploader";
import { getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { getAllProjects, getAllProjectStatuses } from "@services/projects";
import { fetchAllReimbursementTypesFromDb } from "@utils/statistics";
import { successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

const editSchema = Yup.object({
  expenseDate: Yup.string().label("Date"),
  clientTypeId: Yup.string().label("Company Type"),
  clientCompanyId: Yup.string().label("Company Name"),
  projectId: Yup.string().label("Project"),
  reimbursementTypeId: Yup.string().label("Reimbursement For"),
  amount: Yup.number()
    .required()
    .label("Amount")
    .min(1, "Amount must be greater than 0")
    .max(1000000, "Amount must be less than 10,00,000"),
  description: Yup.string().label("Note"),
  document: Yup.string().label("Reference Document"),
  fromLocation: Yup.string()
    .matches(/^[a-zA-Z\s]*$/, "From Location must contain only alphabets")
    .label("From Location"),
  toLocation: Yup.string()
    .matches(/^[a-zA-Z\s]*$/, "To Location must contain only alphabets")
    .label("To Location"),
});

interface Props {
  show: boolean;
  onHide: () => void;
  reimbursement: IReimbursementsUpdate | null;
  onSaved: () => void;
}

function ReimbursementEditModal({ show, onHide, reimbursement, onSaved }: Props) {
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [loading, setLoading] = useState(false);

  const [reimbursementOptions, setReimbursementOptions] = useState<any[]>([]);
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
  const [ongoingStatusIds, setOngoingStatusIds] = useState<string[]>([]);

  const [selectedReimbursementFor, setSelectedReimbursementFor] = useState<Option | null>(null);
  const [selectedClientType, setSelectedClientType] = useState<Option | null>(null);
  const [selectedClientCompany, setSelectedClientCompany] = useState<Option | null>(null);
  const [selectedProject, setSelectedProject] = useState<Option | null>(null);

  // Load static data once on mount
  useEffect(() => {
    setProjectsLoading(true);
    Promise.all([
      fetchAllReimbursementTypesFromDb(),
      getAllCompanyTypes(),
      getAllClientCompanies(),
      getAllProjectStatuses(),
      getAllProjects(),
    ]).then(([types, typesRes, companiesRes, statusesRes, projectsRes]) => {
      setReimbursementOptions(
        types
          .map((r: any) => ({ value: r.id, label: r.type, icon: r.icon }))
          .sort((a: any, b: any) => a.label.localeCompare(b.label)),
      );
      const allTypes = (typesRes.companyTypes || [])
        .map((ct: any) => ({ value: ct.id, label: ct.name }))
        .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
      setAllCompanyTypeOptions(allTypes);

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
      setCompanyTypeOptions(allTypes.filter((t: Option) => usedTypeIds.has(t.value)));

      const allStatuses: any[] = statusesRes?.projectStatuses || [];
      setOngoingStatusIds(
        allStatuses
          .filter((s: any) => s.name?.trim().toLowerCase() === "on ongoing")
          .map((s: any) => s.id),
      );
    }).finally(() => setProjectsLoading(false));
  }, []);

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

  // Restore dropdown selections when reimbursement or lookup arrays change
  useEffect(() => {
    if (!reimbursement || allCompanyTypeOptions.length === 0 || allClientCompanies.length === 0) return;

    setSelectedReimbursementFor(null);
    setSelectedClientType(null);
    setSelectedClientCompany(null);
    setSelectedProject(null);
    setFilteredCompanies([]);

    if (reimbursement.reimbursementTypeId && reimbursementOptions.length > 0) {
      const match = reimbursementOptions.find((o: any) => o.value === reimbursement.reimbursementTypeId);
      if (match) setSelectedReimbursementFor({ value: match.value, label: match.label, ...(match.icon && { icon: match.icon }) } as any);
    }

    if (reimbursement.clientTypeId) {
      // Resolved against the FULL master list (not the File-Location-scoped one) so
      // editing an older reimbursement never shows a blank Type.
      const ctMatch = allCompanyTypeOptions.find((c) => c.value === reimbursement.clientTypeId);
      if (ctMatch) setSelectedClientType({ value: ctMatch.value, label: ctMatch.label });

      let filtered = computeFilteredCompaniesForType(reimbursement.clientTypeId);

      if (reimbursement.clientCompanyId) {
        const ccMatch = allClientCompanies.find((c: any) => c.id === reimbursement.clientCompanyId);
        if (ccMatch) {
          setSelectedClientCompany({ value: ccMatch.id, label: ccMatch.companyName });
          // Legacy data may reference a company that isn't (yet) a File Location
          // company for any project — still show it so editing doesn't drop it.
          if (!filtered.some((c: any) => c.id === ccMatch.id)) {
            filtered = [...filtered, ccMatch].sort((a: any, b: any) => a.companyName.localeCompare(b.companyName));
          }
        }
      }
      setFilteredCompanies(filtered);
    }
  }, [reimbursement, allCompanyTypeOptions, allClientCompanies, reimbursementOptions]);

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
    const keepId = reimbursement?.projectId;
    list = list.filter((p: any) => (p.status?.id && ongoingStatusIds.includes(p.status.id)) || p.id === keepId);

    const opts: Option[] = list
      .map((p: any) => ({ value: p.id, label: p.title }))
      .sort((a: Option, b: Option) => a.label.localeCompare(b.label));
    setProjectOptions(opts);

    if (reimbursement?.projectId) {
      const projMatch = opts.find((o) => o.value === reimbursement.projectId);
      if (projMatch) setSelectedProject(projMatch);
    }
  }, [allProjects, selectedClientType, selectedClientCompany, ongoingStatusIds, reimbursement]);

  const handleClientTypeChange = (option: any, setFieldValue: (f: string, v: any) => void) => {
    setSelectedClientType(option);
    setFieldValue("clientTypeId", option?.value || "");
    setSelectedClientCompany(null);
    setFieldValue("clientCompanyId", "");
    setSelectedProject(null);
    setFieldValue("projectId", "");
    setFilteredCompanies(option?.value ? computeFilteredCompaniesForType(option.value) : []);
  };

  const handleClientCompanyChange = (option: any, setFieldValue: (f: string, v: any) => void) => {
    setSelectedClientCompany(option);
    setFieldValue("clientCompanyId", option?.value || "");
    // Reset project — the reactive projectOptions effect repopulates it for the new company.
    setSelectedProject(null);
    setFieldValue("projectId", "");
  };

  // Reverse autofill: picking a Project directly (independent of Company Type/Name)
  // backfills Company Type + Company Name from that project's File Location fields.
  const handleProjectChange = (option: any, setFieldValue: (f: string, v: any) => void) => {
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
    maxSize: number,
  ) => {
    const { files } = event.target;
    if (files && files[0].size > maxSize) {
      alert("File size should not exceed 5 MB");
      event.target.value = "";
      return;
    }
    if (files && files.length > 0) {
      const form = new FormData();
      form.append("file", files[0]);
      try {
        const { data: { path } } = await uploadUserAsset(form, userId, undefined, "reimbursement-docs");
        formikProps.setFieldValue("document", path, true);
      } catch {
        console.error("Failed to upload file.");
      }
    }
  };

  const handleSubmit = async (values: any) => {
    if (!reimbursement?.id) return;
    setLoading(true);
    try {
      const cleaned = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => {
          if (["employee", "employeeId", "reimbursementType", "type", "day", "isActive", "status"].includes(key)) return false;
          if (key === "amount") return true;
          return value !== "";
        }),
      );
      await updateReimbursementById(reimbursement.id.toString(), cleaned);
      successConfirmation("Reimbursement updated successfully");
      eventBus.emit("reimbursementRecords", { records: [] });
      onSaved();
      onHide();
    } catch {
      // error handled by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  if (!reimbursement) return null;

  const initialValues = {
    expenseDate: reimbursement.expenseDate
      ? dayjs(reimbursement.expenseDate).format("YYYY-MM-DD")
      : dayjs().format("YYYY-MM-DD"),
    clientTypeId: reimbursement.clientTypeId || "",
    clientCompanyId: reimbursement.clientCompanyId || "",
    projectId: reimbursement.projectId || "",
    reimbursementTypeId: reimbursement.reimbursementTypeId || "",
    fromLocation: reimbursement.fromLocation || "",
    toLocation: reimbursement.toLocation || "",
    amount: reimbursement.amount ?? undefined,
    document: reimbursement.document || "",
    description: reimbursement.description || "",
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Reimbursement Request</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Formik initialValues={initialValues} validationSchema={editSchema} onSubmit={handleSubmit} enableReinitialize>
          {(formikProps) => (
            <Form className="d-flex flex-column" noValidate>
              <div className="row">
                <div className="col-lg-6 mb-7">
                  <DateInput
                    isRequired={false}
                    inputLabel="Select Date"
                    formikProps={formikProps}
                    formikField="expenseDate"
                    placeHolder="Select Date"
                    maxDate={true}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6 mb-7">
                  <DropDownInput
                    isRequired={true}
                    formikField="clientTypeId"
                    inputLabel="Company Type"
                    placeholder="Select Company Type"
                    options={companyTypeOptions}
                    onChange={(option: any) => handleClientTypeChange(option, formikProps.setFieldValue)}
                    value={selectedClientType}
                  />
                </div>
                <div className="col-lg-6 mb-7">
                  <DropDownInput
                    isRequired={false}
                    formikField="clientCompanyId"
                    inputLabel="Company Name"
                    placeholder={
                      !formikProps.values.clientTypeId
                        ? "Select Company Type First"
                        : filteredCompanies.length === 0
                        ? "No clients for this type"
                        : "Select Company Name"
                    }
                    options={[...filteredCompanies]
                      .sort((a: any, b: any) => a.companyName.localeCompare(b.companyName))
                      .map((c: any) => ({ value: c.id, label: c.companyName }))}
                    disabled={!formikProps.values.clientTypeId}
                    onChange={(option: any) => handleClientCompanyChange(option, formikProps.setFieldValue)}
                    value={selectedClientCompany}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-lg mb-7">
                  <DropDownInput
                    isRequired={false}
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
                    onChange={(option: any) => handleProjectChange(option, formikProps.setFieldValue)}
                    value={selectedProject}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6 mb-7">
                  <ReimbursementDropdown
                    isRequired={true}
                    handleChange={(option: any) => {
                      formikProps.setFieldValue("reimbursementTypeId", option ? option.value : "");
                      setSelectedReimbursementFor(option || null);
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
                  />
                </div>
              </div>

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

              <div className="row">
                <div className="col-lg-12">
                  <label className="mb-3 fw-bold">Upload Reimbursement Bill</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="form-control form-control-lg form-control-solid"
                    onChange={(e) => uploadFile(e, formikProps, 5 * 1024 * 1024)}
                  />
                </div>
              </div>

              <div className="col-lg mt-4">
                <TextInput label="Remark" margin="mb-7" formikField="description" isRequired={false} />
              </div>

              <div className="d-flex justify-content-end mt-5">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !formikProps.isValid || formikProps.isSubmitting}
                >
                  {!loading && "Save Changes"}
                  {loading && (
                    <span className="indicator-progress" style={{ display: "block" }}>
                      Please wait...{" "}
                      <span className="spinner-border spinner-border-sm align-middle ms-2" />
                    </span>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </Modal.Body>
    </Modal>
  );
}

export default ReimbursementEditModal;
