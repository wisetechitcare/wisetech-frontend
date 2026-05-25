import React from "react";
import { Grid, Box, Typography, IconButton } from "@mui/material";
import { FieldArray, useFormikContext } from "formik";
import { Button } from "react-bootstrap";
import { Close, Add, Delete, Help, CheckCircleOutline, InfoOutlined } from "@mui/icons-material";
import TextInput from "@app/modules/common/inputs/TextInput";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextAreaInput from "@app/modules/common/inputs/TextAreaInput";
import DateInput from "@app/modules/common/inputs/DateInput";
import MultiSelectWithInlineCreate from "@app/modules/common/components/MultiSelectWithInlineCreate";
import FormikDropdownInput from "@app/modules/common/inputs/FormikDropdownInput";
import PrefixInlineEdit from "@app/modules/common/components/PrefixInlineEdit";
import { CommercialsGrid } from "../shared/CommercialsGrid";
import { SectionWrapper } from "./SectionWrapper";
import PercentageConfigurationTable from "../../leads/lead/components/PercentageConfigurationTable";
import MeetingConfigurationTable from "../../leads/lead/components/MeetingConfigurationTable";
import { KTIcon } from "@metronic/helpers";

interface LeadSectionsProps {
  // dropdown arrays
  categories: any[];
  subcategories: any[];
  services: any[];
  leadStatuses: any[];
  employees: any[];
  teams: any[];
  countries: any[];
  leadDirectSources: any[];
  referralTypes: any[];
  companies: any[];
  contacts: any[];
  companyTypes: any[];
  proposalTemplates?: any[];

  // inline create modal triggers
  setShowCategoryModal: (show: boolean) => void;
  setShowSubcategoryModal: (show: boolean) => void;
  setShowServiceModal: (show: boolean) => void;
  setShowCompanyModal: (show: boolean) => void;
  setShowSubCompanyModal: (show: boolean) => void;
  setShowBranchModal: (show: boolean) => void;
  setShowContactModal: (show: boolean) => void;
  setShowDirectSourceModal: (show: boolean) => void;
  setShowReferralTypeModal: (show: boolean) => void;
  setShowCompanyTypeModal: (show: boolean) => void;

  // address handlers
  handleAddressCountryChange: (index: number, countryId: string, setFieldValue: Function) => void;
  handleAddressStateChange: (index: number, stateId: string, countryId: string, setFieldValue: Function) => void;

  // team filtering logic
  teamFilteredCompanies: any;
  teamFilteredSubCompanies: any;
  handleCompanyTypeChange: (index: number, typeId: string, setFieldValue: Function) => void;
  handleCompanyChange: (index: number, companyId: string, setFieldValue: Function) => void;
  handleSubCompanyChange: (index: number, subCompanyId: string, companyId: string, setFieldValue: Function) => void;
  teamFilteredContacts: any;

  // other options
  prefix: string;
  setPrefix: (val: string) => void;
  isEditMode: boolean;
  currLeadData?: any;
  hasDefaultStatus: () => boolean;
  formikProps: any;
}

// 1. Lead Details Section
export const LeadDetailsSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const transformToOptions = (arr: any[]) => {
    return (arr || []).map((x) => ({ value: x.id || x.value, label: x.name || x.label }));
  };

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography sx={{ mb: 0.8, fontSize: "14px", fontWeight: 500, color: "black" }}>
            Inquiry No.
          </Typography>
          <Box sx={{ border: "1px solid #D0D5DD", borderRadius: "8px", px: 2, py: 1.6, height: "45px", display: "flex", alignItems: "center" }}>
            <PrefixInlineEdit value={props.prefix} label="" onChange={props.setPrefix} disabled={false} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput formikField="leadInquiryDate" label="Lead Inquiry Date" isRequired={false} />
        </Grid>
        <Grid item xs={12}>
          <TextInput formikField="projectName" label="Lead Name" isRequired={true} />
        </Grid>

        {/* Lead Category, Services & Status options */}
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="serviceIds"
            inputLabel="Services"
            options={transformToOptions(props.services)}
            placeholder="Select services..."
            isRequired={false}
            onCreateNew={async () => {
              props.setShowServiceModal(true);
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="categoryIds"
            inputLabel="Categories"
            options={transformToOptions(props.categories)}
            placeholder="Select categories..."
            isRequired={false}
            onCreateNew={async () => {
              props.setShowCategoryModal(true);
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="subcategoryIds"
            inputLabel="Sub Categories"
            options={transformToOptions(props.subcategories)}
            placeholder="Select subcategories..."
            isRequired={false}
            onCreateNew={async () => {
              props.setShowSubcategoryModal(true);
            }}
          />
        </Grid>

        {/* Team details loop */}
        <Grid item xs={12}>
          <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
            Linked Client Companies
          </Typography>
          <FieldArray name="leadTeams">
            {({ push, remove }) => (
              <div className="d-flex flex-column gap-4">
                {(values.leadTeams || []).map((team: any, index: number) => {
                  const sortedCompanyTypes = (props.companyTypes || []).map(x => ({ value: x.id, label: x.name }));
                  const filteredCompanies = props.teamFilteredCompanies[index] || props.companies;
                  const selectedCompany = props.companies.find((c: any) => c.id === team.companyId);
                  const filteredSubCompanies = props.teamFilteredSubCompanies[index] || (selectedCompany?.subCompanies || []);

                  return (
                    <div key={index} className="p-4 border rounded bg-light position-relative">
                      <IconButton
                        onClick={() => remove(index)}
                        sx={{ position: "absolute", top: 8, right: 8, color: "red" }}
                        size="small"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                          <DropDownInput
                            formikField={`leadTeams.${index}.companyTypeId`}
                            inputLabel="Company Type"
                            options={sortedCompanyTypes}
                            onChange={(val: any) => props.handleCompanyTypeChange(index, val?.value, setFieldValue)}
                            isRequired={false}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <DropDownInput
                            formikField={`leadTeams.${index}.companyId`}
                            inputLabel="Company"
                            options={(filteredCompanies || []).map((x: any) => ({ value: x.id, label: x.companyName }))}
                            onChange={(val: any) => props.handleCompanyChange(index, val?.value, setFieldValue)}
                            isRequired={false}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <DropDownInput
                            formikField={`leadTeams.${index}.subCompanyId`}
                            inputLabel="Sub Company"
                            options={(filteredSubCompanies || []).map((x: any) => ({ value: x.id, label: x.subCompanyName || x.companyName || x.name || "Unnamed Sub Company" }))}
                            onChange={(val: any) => props.handleSubCompanyChange(index, val?.value, team.companyId, setFieldValue)}
                            isRequired={false}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <DropDownInput
                            formikField={`leadTeams.${index}.contactId`}
                            inputLabel="Contact Person"
                            options={((props.teamFilteredContacts && props.teamFilteredContacts[index]) || (props.contacts || [])
                              .filter((c: any) => {
                                if (team.subCompanyId) {
                                  return c.subCompanyId === team.subCompanyId || c.companyId === team.companyId;
                                }
                                return c.companyId === team.companyId;
                              }))
                              .map((x: any) => ({ value: x.id, label: x.fullName || x.name || "Unnamed Contact" }))}
                            isRequired={false}
                          />
                        </Grid>
                      </Grid>
                    </div>
                  );
                })}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => push({ companyTypeId: "", companyId: "", subCompanyId: "", contactId: "" })}
                  className="align-self-start fw-bold mt-2"
                >
                  + Add Client Company Connection
                </Button>
              </div>
            )}
          </FieldArray>
        </Grid>
      </Grid>
    </div>
  );
};

// 2. Project Details Section
export const ProjectDetailsSection: React.FC = () => {
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextInput formikField="plotArea" label="Plot Area" type="number" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DropDownInput formikField="plotAreaUnit" inputLabel="Plot Area Unit" options={[
            { value: "SFT", label: "Sq. Ft" },
            { value: "SQM", label: "Sq. M" },
            { value: "ACRE", label: "Acres" },
          ]} isRequired={false} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput formikField="builtUpArea" label="Built Up Area" type="number" />
        </Grid>
        <Grid item xs={12} md={6}>
          <DropDownInput formikField="builtUpAreaUnit" inputLabel="Built Up Area Unit" options={[
            { value: "SFT", label: "Sq. Ft" },
            { value: "SQM", label: "Sq. M" },
          ]} isRequired={false} />
        </Grid>
        <Grid item xs={12}>
          <TextAreaInput formikField="buildingDetail" label="Building Detail / Spec" rows={3} />
        </Grid>
      </Grid>
    </div>
  );
};

// 3. Team Details Section (Internal Lead Team)
export const TeamDetailsSection: React.FC<LeadSectionsProps> = (props) => {
  const employeeOptions = (props.employees || []).map(x => ({ value: x.employeeId, label: x.employeeName }));
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <DropDownInput formikField="leadAssignedTo" inputLabel="Sales Manager / Head" options={employeeOptions} />
        </Grid>
        <Grid item xs={12} md={4}>
          <DropDownInput formikField="telemarketerId" inputLabel="Telemarketer" options={employeeOptions} />
        </Grid>
        <Grid item xs={12} md={4}>
          <DropDownInput formikField="coordinatorId" inputLabel="Coordinator" options={employeeOptions} />
        </Grid>
      </Grid>
    </div>
  );
};

// 4. File Location Section
export const FileLocationSection: React.FC<LeadSectionsProps> = (props) => {
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DropDownInput
            formikField="fileLocationCompanyType"
            inputLabel="File Company Type"
            options={(props.companyTypes || []).map(x => ({ value: x.id, label: x.name }))}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DropDownInput
            formikField="fileLocationCompany"
            inputLabel="File Company Name"
            options={(props.companies || []).map(x => ({ value: x.id, label: x.companyName }))}
          />
        </Grid>
      </Grid>
    </div>
  );
};

// 5. Referral Details Section
export const ReferralSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const employeeOptions = (props.employees || []).map(x => ({ value: x.employeeId, label: x.employeeName }));
  const sourceTypes = [
    { value: "DIRECT", label: "Direct Source" },
    { value: "REFERRAL", label: "Referrals" },
  ];

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DropDownInput formikField="leadSourceType" inputLabel="Lead Source Type" options={sourceTypes} />
        </Grid>

        {values.leadSourceType === "DIRECT" && (
          <Grid item xs={12} md={6}>
            <DropDownInput
              formikField="leadDirectSource"
              inputLabel="Direct Source"
              options={(props.leadDirectSources || []).map(x => ({ value: x.id, label: x.name }))}
            />
          </Grid>
        )}

        {values.leadSourceType === "REFERRAL" && (
          <Grid item xs={12}>
            <Typography className="fs-6 fw-bold text-gray-800 mb-3">Referral Connections</Typography>
            <FieldArray name="referrals">
              {({ push, remove }) => (
                <div className="d-flex flex-column gap-4">
                  {(values.referrals || []).map((ref: any, index: number) => (
                    <div key={index} className="p-4 border rounded bg-light position-relative">
                      <IconButton
                        onClick={() => remove(index)}
                        sx={{ position: "absolute", top: 8, right: 8, color: "red" }}
                        size="small"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <DropDownInput
                            formikField={`referrals.${index}.referralType`}
                            inputLabel="Referral Type"
                            options={(props.referralTypes || []).map(x => ({ value: x.id, label: x.name }))}
                          />
                        </Grid>
                        {ref.referralType === "INTERNAL" ? (
                          <Grid item xs={12} md={8}>
                            <DropDownInput
                              formikField={`referrals.${index}.referredByEmployeeId`}
                              inputLabel="Referring Employee"
                              options={employeeOptions}
                            />
                          </Grid>
                        ) : (
                          <>
                            <Grid item xs={12} md={4}>
                              <DropDownInput
                                formikField={`referrals.${index}.referringCompanyType`}
                                inputLabel="Referring Company Type"
                                options={(props.companyTypes || []).map(x => ({ value: x.id, label: x.name }))}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <DropDownInput
                                formikField={`referrals.${index}.referringCompany`}
                                inputLabel="Referring Company"
                                options={(props.companies || []).map(x => ({ value: x.id, label: x.companyName }))}
                              />
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </div>
                  ))}
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => push({ referralType: "", referredByEmployeeId: "", referringCompanyType: "", referringCompany: "" })}
                    className="align-self-start fw-bold mt-2"
                  >
                    + Add Referral Source
                  </Button>
                </div>
              )}
            </FieldArray>
          </Grid>
        )}
      </Grid>
    </div>
  );
};

// 6. Commercials Section
export const CommercialsSection: React.FC = () => {
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
        Commercial Work Areas
      </Typography>
      <CommercialsGrid type="lead" />
    </div>
  );
};

// 7. Address Details Section
export const AddressSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const countryOptions = (props.countries || []).map(x => ({ value: x.id, label: x.name }));

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <FieldArray name="addresses">
        {({ push, remove }) => (
          <div className="d-flex flex-column gap-4">
            {(values.addresses || []).map((addr: any, index: number) => {
              const states = values.addressStatesOptions?.[index] || [];
              const cities = values.addressCitiesOptions?.[index] || [];

              return (
                <div key={index} className="p-4 border rounded bg-light position-relative">
                  {values.addresses.length > 1 && (
                    <IconButton
                      onClick={() => remove(index)}
                      sx={{ position: "absolute", top: 8, right: 8, color: "red" }}
                      size="small"
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  )}
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <DropDownInput
                        formikField={`addresses.${index}.country`}
                        inputLabel="Country"
                        options={countryOptions}
                        onChange={(val: any) => props.handleAddressCountryChange(index, val?.value, setFieldValue)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DropDownInput
                        formikField={`addresses.${index}.state`}
                        inputLabel="State"
                        options={(states || []).map((x: any) => ({ value: x.id, label: x.name }))}
                        onChange={(val: any) => props.handleAddressStateChange(index, val?.value, addr.country, setFieldValue)}
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <DropDownInput
                        formikField={`addresses.${index}.city`}
                        inputLabel="City"
                        options={(cities || []).map((x: any) => ({ value: x.id, label: x.name }))}
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <TextInput formikField={`addresses.${index}.projectAddress`} label="Google Location Address" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextInput formikField={`addresses.${index}.pincode`} label="Pincode" />
                    </Grid>
                  </Grid>
                </div>
              );
            })}
            {values.addresses.length === 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => push({ country: "", state: "", city: "", projectAddress: "", pincode: "" })}
                className="align-self-start fw-bold mt-2"
              >
                + Add Address details
              </Button>
            )}
          </div>
        )}
      </FieldArray>
    </div>
  );
};

// 8. Additional Details Section
export const AdditionalDetailsSection: React.FC = () => {
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextAreaInput formikField="remarks" label="Remarks" rows={2} isRequired={false} />
        </Grid>
        <Grid item xs={12}>
          <TextAreaInput formikField="description" label="Detailed Description" rows={3} isRequired={false} />
        </Grid>
      </Grid>
    </div>
  );
};

// 9. Status Section
export const StatusSection: React.FC<LeadSectionsProps> = (props) => {
  const statusOptions = (props.leadStatuses || []).map(x => ({ value: x.id, label: x.name }));
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <DropDownInput formikField="statusId" inputLabel="Lead Lifecycle Status" options={statusOptions} isRequired={true} />
        </Grid>
      </Grid>
    </div>
  );
};

// 10. Cancellation Reason Section
export const CancellationReasonSection: React.FC<LeadSectionsProps> = (props) => {
  const { values } = useFormikContext<any>();
  const isCanceled = (props.leadStatuses || []).find(x => x.id === values.statusId)?.name === "Canceled";

  if (!isCanceled) return null;

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6 border-danger">
      <Typography className="fs-6 fw-bold text-danger mb-3">Cancellation Details</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextInput formikField="cancellationRemarks" label="Cancellation Remarks" isRequired={true} />
        </Grid>
      </Grid>
    </div>
  );
};

// 11. PO Details Section
export const PODetailsSection: React.FC<LeadSectionsProps> = (props) => {
  const { values } = useFormikContext<any>();
  const statusLabel = (props.leadStatuses || []).find(x => x.id === values.statusId)?.name;
  const showPO = statusLabel === "Received";

  if (!showPO) return null;

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6 border-primary">
      <Typography className="fs-6 fw-bold text-primary mb-3">Purchase Order (PO) Details</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <DropDownInput
            formikField="poStatus"
            inputLabel="PO Status"
            options={[
              { value: "Pending", label: "Pending" },
              { value: "Approved", label: "Approved" },
              { value: "Rejected", label: "Rejected" },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextInput formikField="poNumber" label="PO Number" />
        </Grid>
        <Grid item xs={12} md={4}>
          <DateInput formikField="poDate" inputLabel="PO Date" formikProps={props.formikProps} placeHolder="Select PO Date" isRequired={false} />
        </Grid>
      </Grid>
    </div>
  );
};

// 12. Handle By Section
export const HandleBySection: React.FC<LeadSectionsProps> = (props) => {
  const { values } = useFormikContext<any>();
  const statusLabel = (props.leadStatuses || []).find(x => x.id === values.statusId)?.name;
  const showHandleBy = statusLabel === "Received";
  const employeeOptions = (props.employees || []).map(x => ({ value: x.employeeId, label: x.employeeName }));

  if (!showHandleBy) return null;

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
        Work Handled By Allocation
      </Typography>
      <FieldArray name="handledByEntries">
        {({ push, remove }) => (
          <div className="d-flex flex-column gap-3">
            {(values.handledByEntries || []).map((entry: any, index: number) => (
              <div key={index} className="p-3 border rounded bg-light d-flex align-items-center gap-3">
                <div style={{ flex: 1 }}>
                  <DropDownInput
                    formikField={`handledByEntries.${index}.employeeId`}
                    inputLabel="Assigned Employee"
                    options={employeeOptions}
                  />
                </div>
                <div style={{ width: "20%" }}>
                  <TextInput
                    formikField={`handledByEntries.${index}.sharePercentage`}
                    label="Share Percentage (%)"
                    type="number"
                  />
                </div>
                <IconButton onClick={() => remove(index)} color="error" className="mt-6">
                  <Delete />
                </IconButton>
              </div>
            ))}
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => push({ employeeId: "", sharePercentage: "" })}
              className="align-self-start fw-bold mt-2"
            >
              + Add Work Handled Employee
            </Button>
          </div>
        )}
      </FieldArray>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// WIZARD-OPTIMISED COMPONENTS (used in the 6-step true wizard pages)
// All business logic identical to originals — only layout extracted for clarity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 13. Lead Basic Info Section
 * Used in Wizard Step 1 — basic lead fields WITHOUT the leadTeams FieldArray.
 * The FieldArray lives in ClientCompaniesSection (Step 2) to keep each step focused.
 */
export const LeadBasicInfoSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const transformToOptions = (arr: any[]) =>
    (arr || []).map((x) => ({ value: x.id || x.value, label: x.name || x.label }));

  return (
    <div className="wt-section-card">
      <div className="wt-section-heading">
        Lead Information
      </div>
      <Grid container spacing={3}>
        {/* Inquiry No + Date */}
        <Grid item xs={12} md={6}>
          <Typography sx={{ mb: 0.8, fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Inquiry No.
          </Typography>
          <Box
            sx={{
              border: "1px solid #D0D5DD",
              borderRadius: "8px",
              px: 2,
              py: 1.6,
              height: "45px",
              display: "flex",
              alignItems: "center",
              background: "#fff",
            }}
          >
            <PrefixInlineEdit
              value={props.prefix}
              label=""
              onChange={props.setPrefix}
              disabled={false}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextInput formikField="leadInquiryDate" label="Lead Inquiry Date" isRequired={false} />
        </Grid>

        {/* Lead Name */}
        <Grid item xs={12}>
          <TextInput formikField="projectName" label="Lead Name" isRequired={true} />
        </Grid>

        {/* Services / Categories / Subcategories */}
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="serviceIds"
            inputLabel="Services"
            options={transformToOptions(props.services)}
            placeholder="Select services…"
            isRequired={false}
            onCreateNew={async () => props.setShowServiceModal(true)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="categoryIds"
            inputLabel="Categories"
            options={transformToOptions(props.categories)}
            placeholder="Select categories…"
            isRequired={false}
            onCreateNew={async () => props.setShowCategoryModal(true)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="subcategoryIds"
            inputLabel="Sub Categories"
            options={transformToOptions(props.subcategories)}
            placeholder="Select subcategories…"
            isRequired={false}
            onCreateNew={async () => props.setShowSubcategoryModal(true)}
          />
        </Grid>
      </Grid>
    </div>
  );
};

/**
 * 14. Client Companies Section (leadTeams FieldArray)
 * Used in Wizard Step 2 — Company & Relationships.
 * Contains identical business logic from LeadDetailsSection's leadTeams block.
 */
export const ClientCompaniesSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <div className="wt-section-card">
      <div className="wt-section-heading">
        Linked Client Companies
      </div>
      <FieldArray name="leadTeams">
        {({ push, remove }) => (
          <div className="d-flex flex-column gap-3">
            {(values.leadTeams || []).map((team: any, index: number) => {
              const sortedCompanyTypes = (props.companyTypes || []).map((x) => ({
                value: x.id,
                label: x.name,
              }));
              const filteredCompanies =
                props.teamFilteredCompanies[index] || props.companies;
              const selectedCompany = props.companies.find(
                (c: any) => c.id === team.companyId
              );
              const filteredSubCompanies =
                props.teamFilteredSubCompanies[index] ||
                (selectedCompany?.subCompanies || []);

              return (
                <div key={index} className="wt-entry-card">
                  <button
                    type="button"
                    className="wt-entry-card-remove"
                    onClick={() => remove(index)}
                    aria-label="Remove company"
                  >
                    <Close fontSize="small" />
                  </button>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <DropDownInput
                        formikField={`leadTeams.${index}.companyTypeId`}
                        inputLabel="Company Type"
                        options={sortedCompanyTypes}
                        onChange={(val: any) =>
                          props.handleCompanyTypeChange(index, val?.value, setFieldValue)
                        }
                        isRequired={false}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <DropDownInput
                        formikField={`leadTeams.${index}.companyId`}
                        inputLabel="Company"
                        options={(filteredCompanies || []).map((x: any) => ({
                          value: x.id,
                          label: x.companyName,
                        }))}
                        onChange={(val: any) =>
                          props.handleCompanyChange(index, val?.value, setFieldValue)
                        }
                        isRequired={false}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <DropDownInput
                        formikField={`leadTeams.${index}.subCompanyId`}
                        inputLabel="Sub Company"
                        options={(filteredSubCompanies || []).map((x: any) => ({
                          value: x.id,
                          label: x.subCompanyName || x.companyName || x.name || "Unnamed Sub Company",
                        }))}
                        onChange={(val: any) =>
                          props.handleSubCompanyChange(
                            index,
                            val?.value,
                            team.companyId,
                            setFieldValue
                          )
                        }
                        isRequired={false}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <DropDownInput
                        formikField={`leadTeams.${index}.contactId`}
                        inputLabel="Contact Person"
                        options={((props.teamFilteredContacts && props.teamFilteredContacts[index]) || (props.contacts || [])
                          .filter((c: any) => {
                            if (team.subCompanyId) {
                              return c.subCompanyId === team.subCompanyId || c.companyId === team.companyId;
                            }
                            return c.companyId === team.companyId;
                          }))
                          .map((x: any) => ({ value: x.id, label: x.fullName || x.name || "Unnamed Contact" }))}
                        isRequired={false}
                      />
                    </Grid>
                  </Grid>
                </div>
              );
            })}

            <Button
              variant="outline-primary"
              size="sm"
              type="button"
              onClick={() =>
                push({ companyTypeId: "", companyId: "", subCompanyId: "", contactId: "" })
              }
              className="align-self-start fw-bold mt-1"
            >
              + Add Client Company Connection
            </Button>
          </div>
        )}
      </FieldArray>
    </div>
  );
};

/**
 * 15. Lead Review Step
 * Used in Wizard Step 6 — Review & Conversion.
 * Shows a premium summary of all data entered, plus conditional PO / Handle By / Cancellation sections.
 * No new business logic — delegates rendering to existing section components.
 */
export const LeadReviewStep: React.FC<LeadSectionsProps> = (props) => {
  const { values } = useFormikContext<any>();
  const currentStatusName = (props.leadStatuses || []).find(
    (x) => x.id === values.statusId
  )?.name;
  const isReceived = currentStatusName === "Received";
  const isCanceled = currentStatusName === "Canceled";

  // Commercials total
  const commercialsTotal = (values.projectAreas || []).reduce(
    (sum: number, area: any) => sum + (parseFloat(area.cost) || 0),
    0
  );

  return (
    <div className="d-flex flex-column gap-4">

      {/* ── Overview & Scope summary cards ────────────────────────────── */}
      <div className="wt-review-grid">
        <div className="wt-review-card">
          <div className="wt-review-card-title">Lead Overview</div>
          <div className="wt-review-row">
            <span className="wt-review-label">Lead Name</span>
            <span className="wt-review-value">{values.projectName || "—"}</span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Inquiry Date</span>
            <span className="wt-review-value">{values.leadInquiryDate || "—"}</span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Lead Source</span>
            <span className="wt-review-value">{values.leadSourceType || "—"}</span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Status</span>
            <span className="wt-review-value"
              style={{ color: isReceived ? "#15803d" : isCanceled ? "#dc2626" : undefined }}
            >
              {currentStatusName || "—"}
            </span>
          </div>
        </div>

        <div className="wt-review-card">
          <div className="wt-review-card-title">Project & Commercial</div>
          <div className="wt-review-row">
            <span className="wt-review-label">Plot Area</span>
            <span className="wt-review-value">
              {values.plotArea ? `${values.plotArea} ${values.plotAreaUnit || ""}` : "—"}
            </span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Built-Up Area</span>
            <span className="wt-review-value">
              {values.builtUpArea ? `${values.builtUpArea} ${values.builtUpAreaUnit || ""}` : "—"}
            </span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Work Areas</span>
            <span className="wt-review-value">{(values.projectAreas || []).length} items</span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Total Value</span>
            <span
              className="wt-review-value"
              style={{ color: "#8B1A2F", fontWeight: 700 }}
            >
              ₹{" "}
              {commercialsTotal.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="wt-review-card">
          <div className="wt-review-card-title">Team & Companies</div>
          <div className="wt-review-row">
            <span className="wt-review-label">Client Companies</span>
            <span className="wt-review-value">{(values.leadTeams || []).length} linked</span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Address Records</span>
            <span className="wt-review-value">{(values.addresses || []).length} added</span>
          </div>
        </div>

        <div className="wt-review-card">
          <div className="wt-review-card-title">Additional Info</div>
          <div className="wt-review-row">
            <span className="wt-review-label">Remarks</span>
            <span className="wt-review-value" style={{ fontStyle: values.remarks ? undefined : "italic", color: values.remarks ? undefined : "var(--wt-gray-400)" }}>
              {values.remarks ? values.remarks.substring(0, 40) + (values.remarks.length > 40 ? "…" : "") : "None"}
            </span>
          </div>
          <div className="wt-review-row">
            <span className="wt-review-label">Description</span>
            <span className="wt-review-value" style={{ fontStyle: values.description ? undefined : "italic", color: values.description ? undefined : "var(--wt-gray-400)" }}>
              {values.description ? values.description.substring(0, 40) + (values.description.length > 40 ? "…" : "") : "None"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Lead Preservation Notice ──────────────────────────────────── */}
      <div className="wt-preserve-notice">
        <InfoOutlined style={{ fontSize: "0.9rem", flexShrink: 0, marginTop: "1px" }} />
        This lead will remain preserved when converted to a project. All associated data, history, and documents stay intact.
      </div>

      {/* ── Conversion Banner (only when status = Received) ───────────── */}
      {isReceived && (
        <div className="wt-conversion-banner">
          <div className="wt-conversion-banner-head">
            <CheckCircleOutline style={{ color: "#15803d", fontSize: "1.1rem" }} />
            <span className="wt-conversion-banner-title">Ready for Conversion</span>
          </div>
          <p className="wt-conversion-banner-sub">
            This lead is marked as <strong>Received</strong>. You may save it as a lead or proceed to convert it into a project. The lead record will be fully preserved.
          </p>
          <div className="wt-synced-fields">
            {["Company", "Contact", "Team", "Address", "Categories", "Commercials", "Documents"].map((f) => (
              <span key={f} className="wt-synced-chip">✓ {f}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Conditional: PO Details (status = Received) ───────────────── */}
      {isReceived && <PODetailsSection {...props} />}

      {/* ── Conditional: Work Handled By (status = Received) ─────────── */}
      {isReceived && <HandleBySection {...props} />}

      {/* ── Conditional: Cancellation Details (status = Canceled) ────── */}
      {isCanceled && <CancellationReasonSection {...props} />}
    </div>
  );
};

/**
 * 19. Proposal Configuration Section
 * Used in Wizard Step 5 — Proposal Configuration.
 * Displays Template dropdown, Percentage table and Meeting count table.
 */
export const ProposalConfigurationSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();

  const totalCost = (values.projectAreas || []).reduce(
    (sum: number, area: any) => sum + (parseFloat(area.cost) || 0),
    0
  );

  const area = parseFloat(values.builtUpArea || "0") || 0;

  // Group values.rules by minArea-maxArea to match the right group
  const groupedRules: any[] = [];
  const rulesMap = new Map<string, any>();
  (values.rules || []).forEach((r: any) => {
    const min = r.minArea !== undefined ? r.minArea : r.min_area;
    const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
    const areaKey = `${min}-${max}`;
    if (!rulesMap.has(areaKey)) {
      rulesMap.set(areaKey, {
        minArea: min,
        maxArea: max,
        min_area: min,
        max_area: max,
        configurations: []
      });
      groupedRules.push(rulesMap.get(areaKey));
    }
    rulesMap.get(areaKey).configurations.push(r);
  });

  // Find matching area-specific rule (minArea <= area <= maxArea)
  const matchingAreaRules = groupedRules.filter(r =>
    Number(r.minArea) !== -1 &&
    area >= Number(r.minArea) &&
    area <= Number(r.maxArea)
  );

  // Sort by smallest span
  const bestAreaRule = matchingAreaRules.sort(
    (a, b) => (Number(a.maxArea) - Number(a.minArea)) - (Number(b.maxArea) - Number(b.minArea))
  )[0];

  const matchedMeetings = bestAreaRule ? bestAreaRule.configurations : [];

  const setPercentages = (newPercentages: any[]) => {
    setFieldValue("globalPaymentStages", newPercentages);
  };

  const setMeetings = (newMeetings: any[]) => {
    if (!bestAreaRule) return;

    // Filter out rules matching current range
    const otherRules = (values.rules || []).filter((r: any) => {
      const min = r.minArea !== undefined ? r.minArea : r.min_area;
      const max = r.maxArea !== undefined ? r.maxArea : r.max_area;
      return !(Number(min) === Number(bestAreaRule.minArea) && Number(max) === Number(bestAreaRule.maxArea));
    });

    const updatedAreaRules = newMeetings.map(m => ({
      ...m,
      minArea: bestAreaRule.minArea,
      maxArea: bestAreaRule.maxArea,
      min_area: bestAreaRule.minArea,
      max_area: bestAreaRule.maxArea,
      configType: "meeting",
      config_type: "meeting"
    }));

    setFieldValue("rules", [...otherRules, ...updatedAreaRules]);
  };

  const templateOptions = React.useMemo(() => {
    return (props.proposalTemplates || []).map((t: any) => ({
      value: t.id,
      label: t.templateName || t.templateCode || t.id,
    }));
  }, [props.proposalTemplates]);

  return (
    <div className="d-flex flex-column gap-6">
      {/* Template selector card */}
      <div className="wt-section-card">
        <div className="wt-section-heading">Proposal Configuration</div>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormikDropdownInput
              formikField="proposalTemplateId"
              inputLabel="Proposal Template"
              options={templateOptions}
              placeholder="Select a Proposal Template..."
              isRequired={false}
            />
          </Grid>
        </Grid>
      </div>

      {/* Percentage (Payment breakdown) card */}
      <div className="wt-section-card">
        <div className="p-2">
          <PercentageConfigurationTable
            percentages={values.globalPaymentStages || []}
            setPercentages={setPercentages}
            totalCost={totalCost > 0 ? totalCost : undefined}
            title="Global Payment Stages"
            description="Edit payment breakdowns to adjust stages and percentage values"
          />
        </div>
      </div>

      {/* Meetings schedule card */}
      <div className="wt-section-card">
        <div className="p-2">
          {bestAreaRule ? (
            <MeetingConfigurationTable
              meetings={matchedMeetings}
              setMeetings={setMeetings}
              title={`Meetings & Durations (Range: ${bestAreaRule.minArea} - ${bestAreaRule.maxArea} sqft)`}
            />
          ) : (
            <div className="my-4">
              <h6 className="fw-bolder mb-3 text-gray-800">
                <KTIcon iconName="timer" className="text-warning me-2 fs-2" />
                Meetings & Durations
              </h6>
              <div className="alert alert-dismissible bg-light-warning d-flex flex-column flex-sm-row p-5 mb-0 border border-dashed border-warning rounded">
                <KTIcon iconName="information-5" className="fs-2hx text-warning me-4 mb-5 mb-sm-0" />
                <div className="d-flex flex-column pe-0 pe-sm-10">
                  <h4 className="fw-semibold text-warning-emphasis">No Matched Range</h4>
                  <span className="text-warning-emphasis fs-7">
                    The current built-up area of <strong>{area} sqft</strong> does not fall within any configured meeting ranges for this template.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
