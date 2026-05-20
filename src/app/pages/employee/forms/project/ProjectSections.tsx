import React from "react";
import { Row, Col, Form } from "react-bootstrap";
import { Grid } from "@mui/material";
import { useFormikContext, FieldArray, Field } from "formik";
import { Add, Delete } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import MultiSelectWithInlineCreate from "@app/modules/common/components/MultiSelectWithInlineCreate";
import PrefixInlineEdit from "@app/modules/common/components/PrefixInlineEdit";
import "@app/pages/employee/forms/shared/Workspace.css";

// ── Step 1: Overview & Details ─────────────────────────────────────────────

export const ProjectOverviewSection: React.FC<any> = (props) => {
  const { values } = useFormikContext<any>();
  const {
    categories, subcategories, services,
    transformToOptions, createNewService, createNewCategory, createNewSubcategoryWithContext,
    forceRefreshProjectServices, forceRefreshProjectCategories, forceRefreshProjectSubcategories,
    editingProjectId, projectData, editablePrefix, setEditablePrefix,
    formikProps, isDatesInvalid, getDateValidationMessage,
  } = props;

  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">Project Details</div>
      <Row className="mb-4">
        <Col md={4}>
          <div className="d-flex flex-column fv-row">
            <label className="d-flex align-items-center fs-6 form-label mb-2">
              <span>Project No.</span>
            </label>
            <div
              style={{
                border: "1px solid #D0D5DD", borderRadius: "5px",
                padding: "0 12px", height: "45px", display: "flex",
                alignItems: "center", justifyContent: "space-between",
              }}
            >
              <PrefixInlineEdit
                value={editablePrefix}
                label=""
                onChange={setEditablePrefix}
                disabled={false}
              />
            </div>
          </div>
        </Col>
        <Col md={4}>
          <DateInput
            formikField="startDate"
            inputLabel="Start Date"
            formikProps={formikProps}
            placeHolder="1/3/2025"
            isRequired={true}
          />
        </Col>
        <Col md={4}>
          <DateInput
            formikField="endDate"
            inputLabel="End Date"
            formikProps={formikProps}
            placeHolder="1/3/2025"
            isRequired={true}
          />
        </Col>
        {isDatesInvalid && isDatesInvalid() && (
          <Col md={12} className="mt-3">
            <div className="alert alert-warning d-flex align-items-center"
              style={{ backgroundColor: "#fff3cd", borderColor: "#ffeaa7", color: "#856404", padding: "8px 12px", borderRadius: "4px", fontSize: "14px" }}>
              <i className="fas fa-exclamation-triangle me-2" style={{ color: "#856404" }} />
              {getDateValidationMessage && getDateValidationMessage()}
            </div>
          </Col>
        )}
      </Row>
      <Row className="mb-4">
        <Col md={12}>
          <TextInput formikField="title" label="Project Name" placeholder="Enter project name" isRequired={true} />
        </Col>
      </Row>
      <Row>
        <Col md={4}>
          <MultiSelectWithInlineCreate
            formikField="serviceIds"
            inputLabel="Services"
            options={transformToOptions ? transformToOptions(services || []) : (services || []).map((s: any) => ({ value: s.id, label: s.name }))}
            onCreate={createNewService}
            onRefreshOptions={forceRefreshProjectServices}
            placeholder="Select Services"
            isRequired={false}
          />
        </Col>
        <Col md={4}>
          <MultiSelectWithInlineCreate
            formikField="categoryIds"
            inputLabel="Project Categories"
            options={transformToOptions ? transformToOptions(categories || []) : (categories || []).map((c: any) => ({ value: c.id, label: c.name }))}
            onCreate={createNewCategory}
            onRefreshOptions={forceRefreshProjectCategories}
            placeholder="Select Categories"
            isRequired={false}
          />
        </Col>
        <Col md={4}>
          <MultiSelectWithInlineCreate
            formikField="subcategoryIds"
            inputLabel="Project Sub Categories"
            options={transformToOptions ? transformToOptions(subcategories || []) : (subcategories || []).map((s: any) => ({ value: s.id, label: s.name }))}
            onCreate={createNewSubcategoryWithContext}
            onRefreshOptions={forceRefreshProjectSubcategories}
            placeholder="Select Sub Categories"
            isRequired={false}
          />
        </Col>
      </Row>
    </div>
  );
};

export const ProjectAssignmentSection: React.FC<any> = (props) => {
  const { values } = useFormikContext<any>();
  const { employees, statuses, buildEmployeeOptions, setShowStatusModal } = props;

  const empList = employees || [];

  return (
    <>
      <div className="wt-section-card">
        <div className="wt-section-card-title">Assigned To</div>
        <Row>
          <Col md={6}>
            <DropDownInput
              formikField="projectManagerId"
              inputLabel="Project Manager"
              options={buildEmployeeOptions ? buildEmployeeOptions(empList, values.projectManagerId || undefined) : empList.map((e: any) => ({ value: e.employeeId, label: e.employeeName }))}
              isRequired={false}
              showColor={true}
              value={(() => {
                if (!values.projectManagerId) return null;
                const emp = empList.find((e: any) => e.employeeId === values.projectManagerId);
                if (emp) return { value: values.projectManagerId, label: emp.isActive === false ? `${emp.employeeName} (Inactive)` : emp.employeeName, avatar: emp.avatar || "" };
                return { value: values.projectManagerId, label: "Employee Not Found", avatar: "" };
              })()}
            />
          </Col>
        </Row>
      </div>

      <div className="wt-section-card">
        <div className="wt-section-card-title">Status</div>
        <Row>
          <Col md={6}>
            <DropDownInput
              formikField="statusId"
              inputLabel="Project Status"
              options={(statuses || []).map((s: any) => ({ value: s.id, label: s.name, color: s.color }))}
              showColor={true}
              isRequired={false}
            />
            {setShowStatusModal && (
              <div onClick={() => setShowStatusModal(true)} style={{ cursor: "pointer", color: "#9D4141" }} className="ms-2 mt-1">
                + New Status
              </div>
            )}
          </Col>
        </Row>
      </div>
    </>
  );
};

// ── Step 2: Project Specifications ─────────────────────────────────────────

export const ProjectSpecsSection: React.FC<any> = () => {
  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">Project Specifications</div>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <div className="d-flex flex-column fv-row">
            <div className="d-flex" style={{ gap: "8px", marginBottom: "8px" }}>
              <label className="d-flex align-items-center fs-6 form-label mb-0" style={{ flex: 1 }}>Plot Area</label>
              <label className="d-flex align-items-center fs-6 form-label mb-0" style={{ width: "140px" }}>Unit</label>
            </div>
            <div className="d-flex" style={{ gap: "8px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <Field name="plotArea">
                  {({ field }: { field: any }) => (
                    <input {...field} type="text" className="employee__form_wizard__input form-control" placeholder="Enter Plot Area" />
                  )}
                </Field>
              </div>
              <div style={{ width: "140px" }}>
                <DropDownInput
                  formikField="plotAreaUnit"
                  inputLabel=""
                  isRequired={false}
                  options={[{ value: "sqft", label: "sqft" }, { value: "sqm", label: "sqm" }, { value: "acre", label: "acre" }]}
                  placeholder="Unit"
                />
              </div>
            </div>
          </div>
        </Grid>

        <Grid item xs={12} md={6}>
          <div className="d-flex flex-column fv-row">
            <div className="d-flex" style={{ gap: "8px", marginBottom: "8px" }}>
              <label className="d-flex align-items-center fs-6 form-label mb-0" style={{ flex: 1 }}>Built-Up Area</label>
              <label className="d-flex align-items-center fs-6 form-label mb-0" style={{ width: "140px" }}>Unit</label>
            </div>
            <div className="d-flex" style={{ gap: "8px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <Field name="builtUpArea">
                  {({ field }: { field: any }) => (
                    <input {...field} type="text" className="employee__form_wizard__input form-control" placeholder="Enter Built-Up Area" />
                  )}
                </Field>
              </div>
              <div style={{ width: "140px" }}>
                <DropDownInput
                  formikField="builtUpAreaUnit"
                  inputLabel=""
                  isRequired={false}
                  options={[{ value: "sqft", label: "sqft" }, { value: "sqm", label: "sqm" }, { value: "acre", label: "acre" }]}
                  placeholder="Unit"
                />
              </div>
            </div>
          </div>
        </Grid>

        <Grid item xs={12}>
          <TextInput formikField="buildingDetail" label="Building Detail" isRequired={false} />
        </Grid>

        <Grid item xs={12}>
          <div className="d-flex align-items-center" style={{ gap: "8px", marginBottom: "4px" }}>
            <div style={{ width: "110px" }} />
            <div style={{ flex: 1, fontWeight: 600, fontSize: "13px", color: "#444", fontFamily: "Inter" }}>Heading</div>
            <div style={{ flex: 2, fontWeight: 600, fontSize: "13px", color: "#444", fontFamily: "Inter" }}>Description</div>
          </div>
        </Grid>

        {([1, 2, 3] as const).map((n) => (
          <Grid item xs={12} key={n}>
            <div className="d-flex align-items-start" style={{ gap: "8px" }}>
              <div style={{ width: "110px", paddingTop: "10px", fontWeight: 500, fontSize: "14px", color: "#333", fontFamily: "Inter", flexShrink: 0 }}>
                Other Point - {n}
              </div>
              <div style={{ flex: 1 }}>
                <Field name={`otherPoint${n}Heading`}>
                  {({ field }: { field: any }) => (
                    <input {...field} type="text" className="employee__form_wizard__input form-control" placeholder="Heading" />
                  )}
                </Field>
              </div>
              <div style={{ flex: 2 }}>
                <Field name={`otherPoint${n}Description`}>
                  {({ field }: { field: any }) => (
                    <input {...field} type="text" className="employee__form_wizard__input form-control" placeholder="Description" />
                  )}
                </Field>
              </div>
            </div>
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

// ── Step 3: Team & Companies ───────────────────────────────────────────────

export const ProjectTeamSection: React.FC<any> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const {
    companyTypes, companies, clientFilteredCompanies, clientFilteredSubCompanies, clientFilteredContacts,
    fetchClientCompaniesByCompanyTypeId, fetchClientSubCompaniesByCompanyId, fetchClientContactsBySubCompanyId,
    setClientFilteredSubCompanies, setClientFilteredContacts,
    setShowCompanyTypeModal, setShowCompanyModal, setShowSubCompanyModal, setShowContactModal,
    sortCompaniesByName, sortContactsByName, contacts,
  } = props;

  const _sortCompanies = sortCompaniesByName || ((list: any[]) => list);
  const _sortContacts = sortContactsByName || ((list: any[]) => list);

  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">Team Details (Client Companies)</div>
      <FieldArray name="companies">
        {({ push, remove }) => (
          <>
            {(values.companies || []).map((company: any, index: number) => {
              const selectedCompanyTypeId = values.companies[index]?.companyTypeId;
              const selectedCompanyId = values.companies[index]?.company;
              const selectedSubCompanyId = values.companies[index]?.subCompanyId;
              const selectedContactPersonId = values.companies[index]?.contactPerson;
              const selectedCompanyObj = (companies || []).find((c: any) => c.id === selectedCompanyId);

              const sortedFallbackCompanies = selectedCompanyTypeId
                ? _sortCompanies((companies || []).filter((c: any) => String(c.companyTypeId) === String(selectedCompanyTypeId)))
                : [];
              const filteredCompanies = (clientFilteredCompanies || {})[index] || sortedFallbackCompanies;

              const fallbackSubCompanies = selectedCompanyId && selectedCompanyObj?.subCompanies ? selectedCompanyObj.subCompanies : [];
              const filteredSubCompanies = (clientFilteredSubCompanies || {})[index] || fallbackSubCompanies;

              const sortedFallbackContacts = selectedSubCompanyId
                ? _sortContacts((contacts || []).filter((c: any) =>
                    String(c.subCompanyId) === String(selectedSubCompanyId) ||
                    (!c.subCompanyId && selectedCompanyId && String(c.companyId) === String(selectedCompanyId))
                  ))
                : selectedCompanyId
                ? _sortContacts((contacts || []).filter((c: any) => String(c.companyId) === String(selectedCompanyId)))
                : [];
              const filteredContacts = (clientFilteredContacts || {})[index] || sortedFallbackContacts;

              if (selectedContactPersonId && !filteredContacts.some((c: any) => c.id === selectedContactPersonId)) {
                const curr = (contacts || []).find((c: any) => c.id === selectedContactPersonId);
                if (curr) filteredContacts.push(curr);
              }

              return (
                <div key={index} className="wt-entry-card">
                  <Row>
                    <Col md={3}>
                      <DropDownInput
                        formikField={`companies.${index}.companyTypeId`}
                        inputLabel="Company Type"
                        options={(companyTypes || []).map((t: any) => ({ value: t.id, label: t.name }))}
                        isRequired={false}
                        onChange={(option: any) => {
                          const val = option?.value || "";
                          setFieldValue(`companies.${index}.companyTypeId`, val);
                          setFieldValue(`companies.${index}.company`, "");
                          setFieldValue(`companies.${index}.subCompanyId`, "");
                          setFieldValue(`companies.${index}.contactPerson`, "");
                          fetchClientCompaniesByCompanyTypeId?.(val, index);
                          setClientFilteredSubCompanies?.((prev: any) => ({ ...prev, [index]: [] }));
                          setClientFilteredContacts?.((prev: any) => ({ ...prev, [index]: [] }));
                        }}
                      />
                      {setShowCompanyTypeModal && (
                        <div onClick={() => setShowCompanyTypeModal(true)} style={{ cursor: "pointer", color: "#9D4141" }} className="ms-2">
                          + New Company Type
                        </div>
                      )}
                    </Col>
                    <Col md={3}>
                      <DropDownInput
                        formikField={`companies.${index}.company`}
                        inputLabel="Company"
                        options={filteredCompanies.map((c: any) => ({ value: c.id, label: c.companyName }))}
                        isRequired={false}
                        onChange={async (option: any) => {
                          const val = option?.value || "";
                          setFieldValue(`companies.${index}.company`, val);
                          setFieldValue(`companies.${index}.subCompanyId`, "");
                          setFieldValue(`companies.${index}.contactPerson`, "");
                          await fetchClientSubCompaniesByCompanyId?.(val, index);
                          await fetchClientContactsBySubCompanyId?.("", index, val);
                        }}
                      />
                      {setShowCompanyModal && (
                        <div onClick={() => setShowCompanyModal(true)} style={{ cursor: "pointer", color: "#9D4141" }} className="ms-2">
                          + New Company
                        </div>
                      )}
                    </Col>
                    <Col md={3}>
                      <DropDownInput
                        formikField={`companies.${index}.subCompanyId`}
                        inputLabel="Sub Company"
                        options={filteredSubCompanies.map((s: any) => ({ value: s.id, label: s.subCompanyName }))}
                        isRequired={false}
                        onChange={async (option: any) => {
                          const val = option?.value || "";
                          setFieldValue(`companies.${index}.subCompanyId`, val);
                          setFieldValue(`companies.${index}.contactPerson`, "");
                          await fetchClientContactsBySubCompanyId?.(val, index, selectedCompanyId);
                        }}
                      />
                      {setShowSubCompanyModal && (
                        <div onClick={() => setShowSubCompanyModal(true)} style={{ cursor: "pointer", color: "#9D4141" }} className="ms-2">
                          + New Sub Company
                        </div>
                      )}
                    </Col>
                    <Col md={2}>
                      <DropDownInput
                        formikField={`companies.${index}.contactPerson`}
                        inputLabel="Contact Person"
                        options={filteredContacts.map((c: any) => ({ value: c.id, label: c.fullName, avatar: c.profilePhoto }))}
                        showColor={true}
                        isRequired={false}
                      />
                      {setShowContactModal && (
                        <div onClick={() => setShowContactModal(true)} style={{ cursor: "pointer", color: "#9D4141" }} className="ms-2">
                          + New Contact
                        </div>
                      )}
                    </Col>
                    <Col md={1} className="d-flex align-items-center justify-content-end">
                      {(values.companies || []).length > 1 && (
                        <div onClick={() => remove(index)} style={{ cursor: "pointer", color: "#9D4141", fontSize: "20px" }}>×</div>
                      )}
                    </Col>
                  </Row>
                </div>
              );
            })}
          </>
        )}
      </FieldArray>
    </div>
  );
};

export const ProjectFileLocationSection: React.FC<any> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const { companies, companyTypes } = props;

  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">File Location in Computer</div>
      <Row>
        <Col md={6}>
          <DropDownInput
            formikField="fileLocationCompanyType"
            inputLabel="Company Type"
            isRequired={false}
            onChange={(val: any) => {
              const newType = val?.value || "";
              setFieldValue("fileLocationCompanyType", newType);
              if (values.fileLocationCompanyType !== newType) setFieldValue("fileLocationCompany", "");
            }}
            options={(companyTypes || []).map((t: any) => ({ value: t.id, label: t.name }))}
            placeholder="Select company type"
          />
        </Col>
        <Col md={6}>
          <DropDownInput
            formikField="fileLocationCompany"
            inputLabel="Company"
            isRequired={false}
            disabled={!values.fileLocationCompanyType}
            options={(companies || [])
              .filter((c: any) => c.companyTypeId === values.fileLocationCompanyType)
              .map((c: any) => ({ value: c.id, label: c.companyName }))}
            placeholder={!values.fileLocationCompanyType ? "Select company type first" : "Select company"}
          />
        </Col>
      </Row>
    </div>
  );
};

// ── Step 4: Commercials ─────────────────────────────────────────────────────

export const ProjectCommercialsSection: React.FC<any> = () => {
  const { values } = useFormikContext<any>();

  const totalCost = (values.commercials || []).reduce((total: number, c: any) => {
    if (c.costType === "RATE") return total + parseFloat(c.rateCost || "0");
    if (c.costType === "LUMPSUM") return total + parseFloat(c.lumpsumCost || "0");
    return total;
  }, 0);

  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">Commercial Details</div>
      <FieldArray name="commercials">
        {({ push, remove }) => (
          <>
            {(values.commercials || []).map((commercial: any, index: number) => (
              <div key={index} className={index > 0 ? "mt-4 pt-4 border-top" : ""}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div style={{ fontFamily: "Inter", fontWeight: 500, fontSize: "14px", color: "#798DB3" }}>
                    Area {index + 1}
                  </div>
                  {(values.commercials || []).length > 1 && (
                    <div onClick={() => remove(index)} style={{ cursor: "pointer", color: "#9D4141", fontSize: "20px", padding: "5px" }}>×</div>
                  )}
                </div>
                <Row>
                  <Col md={3}>
                    <TextInput formikField={`commercials.${index}.label`} label="Label" placeholder="Enter label" isRequired={false} />
                  </Col>
                  <Col md={2}>
                    <TextInput formikField={`commercials.${index}.area`} label="Area (sqft)" placeholder="Enter area" isRequired={false} inputValidation="decimal" />
                  </Col>
                  <Col md={2}>
                    <DropDownInput
                      formikField={`commercials.${index}.costType`}
                      inputLabel="Cost Type"
                      options={[{ value: "RATE", label: "Rate" }, { value: "LUMPSUM", label: "Lumpsum" }]}
                      isRequired={false}
                    />
                  </Col>
                  {commercial.costType === "RATE" ? (
                    <>
                      <Col md={2}>
                        <TextInput formikField={`commercials.${index}.rate`} label="Rate" placeholder="Rate" isRequired={false} inputValidation="decimal" type="number" />
                      </Col>
                      <Col md={3}>
                        <TextInput formikField={`commercials.${index}.rateCost`} label="Cost" placeholder="Cost" isRequired={false} inputValidation="decimal" type="number" readonly={true} />
                      </Col>
                    </>
                  ) : (
                    <Col md={3}>
                      <TextInput formikField={`commercials.${index}.lumpsumCost`} label="Cost" placeholder="Cost" isRequired={false} inputValidation="decimal" type="number" />
                    </Col>
                  )}
                </Row>
              </div>
            ))}

            <div className="d-flex justify-content-end align-items-center mt-4 mb-3">
              <span style={{ fontFamily: "Inter", fontSize: "14px", color: "#666", marginRight: "8px" }}>Total Cost:</span>
              <span style={{ fontFamily: "Inter", fontSize: "16px", fontWeight: 600, color: "black" }}>
                ₹ {totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div
              onClick={() => push({ area: "", label: "", costType: "RATE", rate: "", rateCost: "", lumpsum: "", lumpsumCost: "" })}
              style={{
                cursor: "pointer", color: "#9D4141", border: "1px dotted #9D4141",
                borderRadius: "5px", padding: "8px 10px", marginTop: "15px", textAlign: "center",
              }}
            >
              + Add More Commercial
            </div>
          </>
        )}
      </FieldArray>
    </div>
  );
};

// ── Step 5: Address & Location ──────────────────────────────────────────────

export const ProjectAddressSection: React.FC<any> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const { countries, states, cities, handleCountryChange, handleStateChange, getFilteredAndSortedOptions, viewLocation } = props;

  return (
    <div className="wt-section-card">
      <div className="wt-section-card-title">Address & Location</div>
      <FieldArray name="addresses">
        {() => (
          <>
            {(values.addresses || []).map((address: any, index: number) => (
              <div key={index} className={index > 0 ? "mt-4 pt-4 border-top" : ""}>
                <Row className="mb-3">
                  <Col md={6}>
                    <TextInput formikField={`addresses.${index}.fullAddress`} label="Address" isRequired={false} />
                  </Col>
                  <Col md={6}>
                    <DropDownInput
                      formikField={`addresses.${index}.country`}
                      inputLabel="Country"
                      options={(countries || []).map((c: any) => ({ label: c.name, value: c.id }))}
                      isRequired={false}
                      enableSmartSort={true}
                      smartFilterFunction={getFilteredAndSortedOptions}
                      onChange={(option: any) => {
                        setFieldValue(`addresses.${index}.country`, option?.value || "");
                        setFieldValue(`addresses.${index}.state`, "");
                        setFieldValue(`addresses.${index}.city`, "");
                        if (option?.value) handleCountryChange?.(option.value);
                      }}
                      value={values.addresses[index]?.country
                        ? { label: (countries || []).find((c: any) => c.id === values.addresses[index].country)?.name || "", value: values.addresses[index].country }
                        : null}
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <DropDownInput
                      formikField={`addresses.${index}.state`}
                      inputLabel="State"
                      options={values.addresses[index]?.country ? (states || []).map((s: any) => ({ label: s.name, value: s.id })) : []}
                      placeholder={!values.addresses[index]?.country ? "Please select country first" : "Select State"}
                      disabled={!values.addresses[index]?.country}
                      isRequired={false}
                      enableSmartSort={true}
                      smartFilterFunction={getFilteredAndSortedOptions}
                      onChange={(option: any) => {
                        setFieldValue(`addresses.${index}.state`, option?.value || "");
                        setFieldValue(`addresses.${index}.city`, "");
                        if (option?.value && values.addresses[index]?.country) {
                          handleStateChange?.(values.addresses[index].country, option.value);
                        }
                      }}
                      value={values.addresses[index]?.state
                        ? { label: (states || []).find((s: any) => s.id === values.addresses[index].state || s.name === values.addresses[index].state)?.name || values.addresses[index].state, value: values.addresses[index].state }
                        : null}
                    />
                  </Col>
                  <Col md={6}>
                    <DropDownInput
                      formikField={`addresses.${index}.city`}
                      inputLabel="City"
                      options={values.addresses[index]?.state ? [
                        ...(cities || []).map((c: any) => ({ label: c.name, value: c.id })),
                        ...(values.addresses[index]?.city && !(cities || []).find((c: any) => c.id === values.addresses[index].city)
                          ? [{ label: values.addresses[index].city, value: values.addresses[index].city }]
                          : []),
                      ] : []}
                      placeholder={!values.addresses[index]?.state ? "Please select state first" : "Select City"}
                      disabled={!values.addresses[index]?.state}
                      isRequired={false}
                      enableSmartSort={true}
                      smartFilterFunction={getFilteredAndSortedOptions}
                      onChange={(option: any) => setFieldValue(`addresses.${index}.city`, option?.value || "")}
                      value={values.addresses[index]?.city
                        ? { label: (cities || []).find((c: any) => c.id === values.addresses[index].city)?.name || values.addresses[index].city, value: values.addresses[index].city }
                        : null}
                    />
                  </Col>
                </Row>
                <Row className="mb-3">
                  <Col md={6}>
                    <TextInput formikField={`addresses.${index}.locality`} label="Locality" isRequired={false} />
                  </Col>
                  <Col md={6}>
                    <TextInput formikField={`addresses.${index}.zipcode`} label="Zip Code" isRequired={false} />
                  </Col>
                </Row>

                <div className="mt-4 p-3" style={{ borderRadius: "8px", backgroundColor: "#9fd491" }}>
                  <div className="mb-3" style={{ fontFamily: "Inter", fontSize: "14px", fontWeight: 500, color: "#0D47A1" }}>LOCATION ON MAP</div>
                  <Row>
                    <Col md={3}>
                      <TextInput formikField={`addresses.${index}.googleMapLink`} label="Google Map Link" isRequired={false} />
                    </Col>
                    <Col md={3}>
                      <TextInput formikField={`addresses.${index}.gmbLink`} label="Google Business Link" isRequired={false} />
                    </Col>
                    <Col md={3}>
                      <TextInput formikField={`addresses.${index}.latitude`} label="Latitude" isRequired={false} />
                    </Col>
                    <Col md={3}>
                      <TextInput formikField={`addresses.${index}.longitude`} label="Longitude" isRequired={false} />
                    </Col>
                  </Row>
                  <div
                    className="d-flex justify-content-end mt-3"
                    onClick={() => viewLocation?.(values.addresses[index]?.latitude || "", values.addresses[index]?.longitude || "")}
                    style={{ cursor: "pointer", color: "#0D47A1" }}
                  >
                    View Location On Map
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </FieldArray>
    </div>
  );
};

// ── Step 6: Review & Workflow ───────────────────────────────────────────────

export const ProjectReviewStep: React.FC<any> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const {
    employees, teams, buildEmployeeOptions,
    companyTypes, companies, contacts,
    relationFilteredCompanies, relationFilteredSubCompanies, relationFilteredContacts,
    fetchRelationCompaniesByCompanyTypeId, fetchRelationSubCompaniesByCompanyId, fetchRelationContactsBySubCompanyId,
    setRelationFilteredSubCompanies, setRelationFilteredContacts,
    setShowCompanyTypeModal, setShowCompanyModal, setShowSubCompanyModal, setShowContactModal,
    sortCompaniesByName, sortContactsByName,
    uploadFile, formikProps, userId, getFileNameFromUrl,
  } = props;

  const _sortCompanies = sortCompaniesByName || ((list: any[]) => list);
  const _sortContacts = sortContactsByName || ((list: any[]) => list);

  return (
    <>
      {/* Handle By */}
      <div className="wt-section-card">
        <div className="wt-section-card-title">Handle By</div>
        {(!values.handledByEntries || values.handledByEntries.length === 0) && (
          <div style={{ textAlign: "center", padding: "1rem 0", color: "#666" }}>
            No entries yet. Click "Add Handle By" to get started.
          </div>
        )}
        {(values.handledByEntries || []).map((entry: any, idx: number) => (
          <div key={entry.id || idx} className="d-flex align-items-end gap-2 mb-2" style={{ gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <DropDownInput
                formikField={`handledByEntries[${idx}].employeeId`}
                inputLabel={idx === 0 ? "Handle By" : ""}
                isRequired={false}
                options={buildEmployeeOptions ? buildEmployeeOptions(employees || [], entry.employeeId || undefined) : (employees || []).map((e: any) => ({ value: e.employeeId, label: e.employeeName }))}
                placeholder="Select employee"
                showColor={true}
              />
            </div>
            <div style={{ flex: 1 }}>
              <DateInput formikField={`handledByEntries[${idx}].handledDate`} inputLabel={idx === 0 ? "Date In" : ""} formikProps={formikProps} placeHolder="DD-MM-YYYY" isRequired={false} />
            </div>
            <div style={{ flex: 1 }}>
              <DateInput formikField={`handledByEntries[${idx}].handledOutDate`} inputLabel={idx === 0 ? "Date Out" : ""} formikProps={formikProps} placeHolder="DD-MM-YYYY" isRequired={false} />
            </div>
            <div style={{ paddingBottom: "4px" }}>
              <IconButton
                onClick={() => setFieldValue("handledByEntries", (values.handledByEntries || []).filter((_: any, i: number) => i !== idx))}
                sx={{ color: "#d32f2f", padding: "6px" }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </div>
          </div>
        ))}
        <div
          onClick={() => {
            const today = new Date().toISOString().split("T")[0];
            setFieldValue("handledByEntries", [...(values.handledByEntries || []), { id: Date.now().toString(), employeeId: "", handledDate: today, handledOutDate: "" }]);
          }}
          style={{ marginTop: "8px", padding: "8px 12px", borderStyle: "dotted", borderColor: "#DBB3B3", borderWidth: "1px", borderRadius: "8px", color: "#9D4141", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontFamily: "Inter" }}
        >
          <Add fontSize="small" />
          Add Handle By
        </div>
      </div>

      {/* PO Details */}
      <div className="wt-section-card">
        <div className="wt-section-card-title">PO Details</div>
        <Row>
          <Col md={6}>
            <TextInput formikField="poNumber" label="PO Number" placeholder="0" isRequired={false} inputValidation="numbers-space" />
          </Col>
          <Col md={6}>
            <DateInput formikField="poDate" inputLabel="PO Date" isRequired={false} formikProps={formikProps} placeHolder="1/3/2025" />
          </Col>
        </Row>
        <Row className="mt-3">
          <Col md={12}>
            <label className="mb-2 fw-bold" style={{ fontSize: "14px", fontFamily: "Inter" }}>Attach PO File</label>
            {values.poFile && (
              <div className="mb-3 p-3 bg-light rounded">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <small className="text-muted">Current PO file:</small>
                    <div className="fw-bold text-primary">📎 {getFileNameFromUrl ? getFileNameFromUrl(values.poFile) : values.poFile}</div>
                  </div>
                  <div>
                    <a href={values.poFile} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary me-2">View</a>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setFieldValue("poFile", "")}>Remove</button>
                  </div>
                </div>
              </div>
            )}
            <input
              type="file"
              accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
              className="form-control form-control-lg form-control-solid"
              onChange={async (event) => {
                const files = event.target.files;
                if (files && files[0]) {
                  if (files[0].size > 5 * 1024 * 1024) { alert("File size should not exceed 5 MB"); event.target.value = ""; return; }
                  const form = new FormData();
                  form.append("file", files[0]);
                  try {
                    const { uploadUserAsset } = await import("@services/uploader");
                    const { data: { path } } = await uploadUserAsset(form, userId, "projects/po");
                    setFieldValue("poFile", path, true);
                  } catch (error) {
                    console.error("Failed to upload PO file.");
                  }
                }
              }}
            />
            <small className="text-muted">{values.poFile ? "Upload a new file to replace the current PO document" : "Select a PO document to upload"}</small>
          </Col>
        </Row>
      </div>

      {/* Relation Companies */}
      <div className="wt-section-card">
        <div className="wt-section-card-title">Other Relation Companies</div>
        <FieldArray name="projectCompanyMappings">
          {({ push, remove }) => (
            <>
              {(values.projectCompanyMappings || []).map((company: any, index: number) => {
                const selectedCompanyTypeId = values.projectCompanyMappings[index]?.companyTypeId;
                const selectedCompanyId = values.projectCompanyMappings[index]?.company;
                const selectedCompanyObj = (companies || []).find((c: any) => c.id === selectedCompanyId);

                const sortedFallbackCompanies = selectedCompanyTypeId
                  ? _sortCompanies((companies || []).filter((c: any) => String(c.companyTypeId) === String(selectedCompanyTypeId)))
                  : [];
                const filteredCompanies = (relationFilteredCompanies || {})[index] || sortedFallbackCompanies;

                const fallbackSubCompanies = selectedCompanyId && selectedCompanyObj?.subCompanies ? selectedCompanyObj.subCompanies : [];
                const filteredSubCompanies = (relationFilteredSubCompanies || {})[index] || fallbackSubCompanies;

                const filteredContacts = (relationFilteredContacts || {})[index] || [];

                return (
                  <div key={index} className="wt-entry-card">
                    <Row>
                      <Col md={3}>
                        <DropDownInput
                          formikField={`projectCompanyMappings.${index}.companyTypeId`}
                          inputLabel="Company Type"
                          options={(companyTypes || []).map((t: any) => ({ value: t.id, label: t.name }))}
                          isRequired={false}
                          onChange={(option: any) => {
                            const val = option?.value || "";
                            setFieldValue(`projectCompanyMappings.${index}.companyTypeId`, val);
                            setFieldValue(`projectCompanyMappings.${index}.company`, "");
                            setFieldValue(`projectCompanyMappings.${index}.refferingSubCompanyId`, "");
                            setFieldValue(`projectCompanyMappings.${index}.contactPerson`, "");
                            fetchRelationCompaniesByCompanyTypeId?.(val, index);
                            setRelationFilteredSubCompanies?.((prev: any) => ({ ...prev, [index]: [] }));
                            setRelationFilteredContacts?.((prev: any) => ({ ...prev, [index]: [] }));
                          }}
                        />
                      </Col>
                      <Col md={3}>
                        <DropDownInput
                          formikField={`projectCompanyMappings.${index}.company`}
                          inputLabel="Company"
                          options={filteredCompanies.map((c: any) => ({ value: c.id, label: c.companyName }))}
                          isRequired={false}
                          onChange={async (option: any) => {
                            const val = option?.value || "";
                            setFieldValue(`projectCompanyMappings.${index}.company`, val);
                            setFieldValue(`projectCompanyMappings.${index}.refferingSubCompanyId`, "");
                            setFieldValue(`projectCompanyMappings.${index}.contactPerson`, "");
                            await fetchRelationSubCompaniesByCompanyId?.(val, index);
                            await fetchRelationContactsBySubCompanyId?.("", index, val);
                          }}
                        />
                      </Col>
                      <Col md={3}>
                        <DropDownInput
                          formikField={`projectCompanyMappings.${index}.refferingSubCompanyId`}
                          inputLabel="Sub Company"
                          options={filteredSubCompanies.map((s: any) => ({ value: s.id, label: s.subCompanyName }))}
                          isRequired={false}
                          onChange={async (option: any) => {
                            const val = option?.value || "";
                            setFieldValue(`projectCompanyMappings.${index}.refferingSubCompanyId`, val);
                            setFieldValue(`projectCompanyMappings.${index}.contactPerson`, "");
                            await fetchRelationContactsBySubCompanyId?.(val, index, selectedCompanyId);
                          }}
                        />
                      </Col>
                      <Col md={2}>
                        <DropDownInput
                          formikField={`projectCompanyMappings.${index}.contactPerson`}
                          inputLabel="Contact Person"
                          options={filteredContacts.map((c: any) => ({ value: c.id, label: c.fullName, avatar: c.profilePhoto }))}
                          showColor={true}
                          isRequired={false}
                        />
                      </Col>
                      <Col md={1} className="d-flex align-items-center justify-content-end">
                        <div onClick={() => remove(index)} style={{ cursor: "pointer", color: "#9D4141", fontSize: "20px" }}>×</div>
                      </Col>
                    </Row>
                  </div>
                );
              })}
              <div
                onClick={() => push({ companyTypeId: "", company: "", refferingSubCompanyId: "", contactPerson: "" })}
                style={{ cursor: "pointer", color: "#9D4141", border: "1px dotted #9D4141", borderRadius: "5px", padding: "8px 10px", marginTop: "12px", textAlign: "center" }}
              >
                + Add Relation Company
              </div>
            </>
          )}
        </FieldArray>
      </div>

      {/* Internal Team Details */}
      <div className="wt-section-card">
        <div className="wt-section-card-title">Internal Team Details</div>
        <FieldArray name="teamDetails">
          {({ push, remove }) => (
            <Row>
              {(values.teamDetails || []).map((team: any, index: number) => (
                <Col md={4} key={index} className="mb-3" style={{ position: "relative" }}>
                  <DropDownInput
                    formikField={`teamDetails.${index}.teamId`}
                    inputLabel="Choose Team"
                    options={(teams || []).map((t: any) => ({ value: t.id, label: t.name }))}
                    isRequired={false}
                  />
                  {(values.teamDetails || []).length > 1 && (
                    <div onClick={() => remove(index)} style={{ cursor: "pointer", color: "#9D4141", fontSize: "18px", position: "absolute", right: "5px", top: "1px", backgroundColor: "white", borderRadius: "50%", width: "25px", height: "25px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</div>
                  )}
                </Col>
              ))}
              <Col md={4} className="mb-3">
                <div onClick={() => push({ teamId: "" })} style={{ cursor: "pointer", color: "#9D4141", border: "1px dotted #9D4141", borderRadius: "5px", padding: "8px 1px", marginTop: "28px", textAlign: "center" }}>
                  + Add More Team
                </div>
              </Col>
            </Row>
          )}
        </FieldArray>
      </div>

      {/* Additional Details */}
      <div className="wt-section-card">
        <div className="wt-section-card-title">Additional Details</div>
        <Row>
          <Col md={12}>
            <label className="mb-3 fw-bold">Upload Document File</label>
            <input
              type="file"
              accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.xls,.xlsx"
              className="form-control form-control-lg form-control-solid"
              onChange={(event) => uploadFile?.(event, formikProps, 5 * 1024 * 1024)}
            />
            <small className="text-muted">{values.documents ? "Upload a new file to replace the current document" : "Select a document to upload"}</small>
          </Col>
        </Row>
        <Row className="mt-4">
          <Col md={12}>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={values.description}
                onChange={(e) => setFieldValue("description", e.target.value)}
              />
              <Form.Text className="text-muted">{(values.description || "").length}/200 characters</Form.Text>
            </Form.Group>
          </Col>
        </Row>
      </div>
    </>
  );
};
