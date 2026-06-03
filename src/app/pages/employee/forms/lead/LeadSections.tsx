import React, { useEffect, useState } from "react";
import { Grid, Box, Typography, IconButton, CircularProgress } from "@mui/material";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

import { SmartLocationPicker } from "./SmartLocationPicker";
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

interface LeadSectionsProps {
  // dropdown arrays
  categories: any[];
  subcategories: any[];
  services: any[];
  leadStatuses: any[];
  leadProjectStatuses?: any[];   // project execution statuses (Received, Ongoing, Completed)
  isReceivedStatus?: boolean;    // true when lead.status.isReceivedTrigger
  employees: any[];
  teams: any[];
  countries: any[];
  leadDirectSources: any[];
  referralTypes: any[];
  companies: any[];
  contacts: any[];
  companyTypes: any[];

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
          <DateInput formikField="leadInquiryDate" inputLabel="Lead Inquiry Date" formikProps={props.formikProps} placeHolder="Select Date" isRequired={false} />
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
  const employeeOptions = (props.employees || [])
    .filter(x => x.isActive !== false)
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map(x => ({ value: x.employeeId, label: x.employeeName }));
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <DropDownInput formikField="leadAssignedTo" inputLabel="Assigned to " options={employeeOptions} />
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
  const employeeOptions = (props.employees || [])
    .filter(x => x.isActive !== false)
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map(x => ({ value: x.employeeId, label: x.employeeName }));
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
  const [mapRefreshKeys, setMapRefreshKeys] = React.useState<{[key: number]: number}>({});

  const handleRefreshMap = (index: number) => {
    setMapRefreshKeys(prev => ({
      ...prev,
      [index]: (prev[index] || 0) + 1
    }));
  };

  useEffect(() => {
    if (values.addresses && Array.isArray(values.addresses)) {
      values.addresses.forEach((address: any, index: number) => {
        const link = address.googleMapLink;
        if (link && !address.latitude && !address.longitude) {
          const latLngMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (latLngMatch) {
            setFieldValue(`addresses.${index}.latitude`, latLngMatch[1]);
            setFieldValue(`addresses.${index}.longitude`, latLngMatch[2]);
          }
        }
      });
    }
  }, [values.addresses, setFieldValue]);
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
                  <div className="position-relative">
                    {values.addresses.length > 1 && (
                      <IconButton
                        onClick={() => remove(index)}
                        sx={{ position: "absolute", top: -8, right: 0, color: "red", zIndex: 10 }}
                        size="small"
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    )}
                    <SmartLocationPicker 
                      index={index} 
                      countryOptions={countryOptions} 
                      handleAddressCountryChange={props.handleAddressCountryChange}
                      handleAddressStateChange={props.handleAddressStateChange}
                    />
                  </div>
              );
            })}
            {values.addresses.length === 0 && (
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => push({ country: "", state: "", city: "", projectAddress: "", pincode: "", googleMapLink: "", gmbLink: "", latitude: "", longitude: "" })}
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
//
// Two separate dropdowns:
//   Lead Status    — always visible (PENDING / NOT_RECEIVED / RECEIVED / …)
//   Project Status — only visible when Lead status has isReceivedTrigger=true
//                    (RECEIVED / NOT_RECEIVED / ONGOING / COMPLETED / …)
//
// Writes: Lead Status → statusId, Project Status → projectStatusId
export const StatusSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const isReceived = props.isReceivedStatus ?? false;

  const leadStatuses = props.leadStatuses || [];
  const leadProjectStatuses = props.leadProjectStatuses || [];

  const handleLeadStatusChange = (selectedId: string) => {
    setFieldValue('statusId', selectedId);
    const selected = leadStatuses.find((x: any) => x.id === selectedId);
    if (!selected?.isReceivedTrigger) {
      // Leaving Received — project no longer active, clear project status
      setFieldValue('projectStatusId', '');
    }
  };

  const handleProjectStatusChange = (selectedId: string) => {
    setFieldValue('projectStatusId', selectedId);
  };

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        {/* Lead Status — always visible */}
        <Grid item xs={12} md={isReceived ? 6 : 12}>
          <div className="d-flex flex-column gap-1">
            <label className="form-label fs-6 fw-semibold required">
              Lead Status
            </label>
            <select
              className="form-select form-select-solid"
              value={values.statusId || ''}
              onChange={e => handleLeadStatusChange(e.target.value)}
            >
              <option value="">Select lead status…</option>
              {leadStatuses.map((x: any) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </div>
        </Grid>

        {/* Project Status — only when Lead is Received (isReceivedTrigger=true) */}
        {isReceived && (
          <Grid item xs={12} md={6}>
            <div className="d-flex flex-column gap-1">
              <label className="form-label fs-6 fw-semibold">
                Project Status
                <span className="badge badge-light-success ms-3 fs-8 fw-normal">Project Active</span>
              </label>
              <select
                className="form-select form-select-solid"
                value={values.projectStatusId || ''}
                onChange={e => handleProjectStatusChange(e.target.value)}
              >
                <option value="">Select project status…</option>
                {leadProjectStatuses.map((x: any) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
              {leadProjectStatuses.length === 0 && (
                <span className="text-muted fs-8">Loading project statuses…</span>
              )}
            </div>
          </Grid>
        )}
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
  const employeeOptions = (props.employees || [])
    .filter(x => x.isActive !== false)
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map(x => ({ value: x.employeeId, label: x.employeeName }));

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
          <DateInput formikField="leadInquiryDate" inputLabel="Lead Inquiry Date" formikProps={props.formikProps} placeHolder="Select Date" isRequired={false} />
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
            onCreate={async () => props.setShowServiceModal(true)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="categoryIds"
            inputLabel="Categories"
            options={transformToOptions(props.categories)}
            placeholder="Select categories…"
            isRequired={false}
            onCreate={async () => props.setShowCategoryModal(true)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MultiSelectWithInlineCreate
            formikField="subcategoryIds"
            inputLabel="Sub Categories"
            options={transformToOptions(props.subcategories)}
            placeholder="Select subcategories…"
            isRequired={false}
            onCreate={async () => props.setShowSubcategoryModal(true)}
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
  const currentStatusObj = (props.leadStatuses || []).find((x) => x.id === values.statusId);
  const currentStatusName = currentStatusObj?.name;
  const isReceived = !!(currentStatusObj?.isReceivedTrigger);
  const isCanceled = currentStatusName === "Canceled";
  const projectStatusName = isReceived
    ? (props.leadProjectStatuses || []).find((x: any) => x.id === values.projectStatusId)?.name
    : null;

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
            <span className="wt-review-label">Lead Status</span>
            <span className="wt-review-value"
              style={{ color: isReceived ? "#15803d" : isCanceled ? "#dc2626" : undefined }}
            >
              {currentStatusName || "—"}
            </span>
          </div>
          {isReceived && (
            <div className="wt-review-row">
              <span className="wt-review-label">Project Status</span>
              <span className="wt-review-value" style={{ color: "#1976d2" }}>
                {projectStatusName || "—"}
              </span>
            </div>
          )}
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
