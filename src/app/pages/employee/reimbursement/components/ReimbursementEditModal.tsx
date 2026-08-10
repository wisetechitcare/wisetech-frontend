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
import { errorConfirmation } from "@utils/modal";
import { useReimbursementFormLookups } from "../hooks/useReimbursementFormLookups";
import { getReimbursementSchema, categoryRequiresLocation } from "../utils/reimbursementSchema";
import { getAllCompanyTypes, getAllClientCompanies } from "@services/companies";
import { getReimbursementProjectOptions, getAllProjectStatuses } from "@services/projects";
import { fetchAllReimbursementTypesFromDb } from "@utils/statistics";
import { successConfirmation } from "@utils/modal";
import eventBus from "@utils/EventBus";
import { useSelector } from "react-redux";
import { RootState } from "@redux/store";

// The schema lives in utils/reimbursementSchema — this file used to carry a third copy
// that made every field optional, so the admin edit path could clear values the other
// two entry points insist on.

interface Props {
  show: boolean;
  onHide: () => void;
  reimbursement: IReimbursementsUpdate | null;
  onSaved: () => void;
}

function ReimbursementEditModal({ show, onHide, reimbursement, onSaved }: Props) {
  const userId = useSelector((state: RootState) => state.auth.currentUser.id);
  const [loading, setLoading] = useState(false);

  // The lookup cascade — five fetches, File-Location scoping, saved-selection restore and
  // reverse autofill — lives in one hook now. It existed three times, ~180 lines apiece, and the
  // copies had already drifted on which lookups they loaded.
  const {
    reimbursementOptions, companyTypeOptions, filteredCompanies, projectOptions, projectsLoading,
    selectedReimbursementFor, selectedClientType, selectedClientCompany, selectedProject,
    handleCategoryChange, handleClientTypeChange, handleClientCompanyChange, handleProjectChange,
  } = useReimbursementFormLookups(reimbursement);

  const uploadFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    formikProps: any,
    maxSize: number,
  ) => {
    const { files } = event.target;
    if (files && files[0].size > maxSize) {
      // A raw browser alert() in a fully styled app. The server caps uploads at 10 MB
      // anyway (Phase 0); this is the friendly early warning, not the enforcement.
      errorConfirmation("That file is over 5 MB. Please attach a smaller receipt.");
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
    // Lead-as-master: batch-created rows carry leadId and a NULL projectId, so seeding from
    // projectId alone blanked the project every time this modal opened on a submitted row.
    projectId: (reimbursement as any).leadId || reimbursement.projectId || "",
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
        <Formik
          initialValues={initialValues}
          validationSchema={getReimbursementSchema({
            isEditing: true,
            category: selectedReimbursementFor,
          })}
          onSubmit={handleSubmit}
          enableReinitialize
        >
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
                    // Same window as a new request — an edit cannot move an expense
                    // into a past month or the future.
                    minDate={dayjs().startOf('month')}
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
                    disableAlphabeticalSort={true}
                  />
                </div>
              </div>

              <div className="row">
                <div className="col-lg-6 mb-7">
                  <ReimbursementDropdown
                    isRequired={true}
                    handleChange={(option: any) => handleCategoryChange(option, formikProps.setFieldValue)}
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

              {/* Travel categories only — requiring From/To on meals is why so many rows carry
                  junk locations. */}
              {categoryRequiresLocation(selectedReimbursementFor) && (
              <div className="row">
                <div className="col-lg-6">
                  <label className="form-label fw-bold">From Location</label>
                  <input
                    type="text"
                    className={`form-control form-control-lg form-control-solid${formikProps.touched.fromLocation && formikProps.errors.fromLocation ? " is-invalid" : ""}`}
                    placeholder="From Location"
                    {...formikProps.getFieldProps("fromLocation")}
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
                  />
                  {formikProps.touched.toLocation && formikProps.errors.toLocation && (
                    <div className="fv-plugins-message-container">
                      <div className="fv-help-block">{String(formikProps.errors.toLocation)}</div>
                    </div>
                  )}
                </div>
              </div>

              )}
              <div className="row">
                <div className="col-lg-12">
                  <label className="mb-3 fw-bold">Upload Reimbursement Bill</label>
                  <input
                    type="file"
                    // Opens the camera directly on a phone instead of a file browser — a receipt is
                    // something you photograph, not something you already have on disk.
                    capture="environment"
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
