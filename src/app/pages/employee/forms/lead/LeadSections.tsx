import React, { useEffect, useRef, useState } from "react";
import { Grid, Box, Typography, IconButton, CircularProgress, Switch, FormControlLabel } from "@mui/material";
import axios from "axios";
import { ProjectPointsSection } from "@app/modules/projectPoints";

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
import { PaymentStageSelector } from "./PaymentStageSelector";
import { MeetingScheduleSelector } from "./MeetingScheduleSelector";
import { SectionWrapper } from "./SectionWrapper";

interface LeadSectionsProps {
  // dropdown arrays
  categories: any[];
  subcategories: any[];
  services: any[];
  leadStatuses: any[];
  leadProjectStatuses?: any[];   // project execution statuses (Received, Ongoing, Completed)
  isReceivedStatus?: boolean;    // true when lead.status.isProjectTrigger
  cancellationReasons?: any[];   // master list for closure reason (Canceled / Lost)
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
  // Reverse cascade: selecting a Contact Person back-fills Company Type / Company / Sub Company.
  handleContactChange: (index: number, contactId: string, setFieldValue: Function) => void;
  teamFilteredContacts: any;

  // other options
  prefix: string;
  setPrefix: (val: string) => void;
  isEditMode: boolean;
  currLeadData?: any;
  hasDefaultStatus: () => boolean;
  formikProps: any;
}

/**
 * Build the Contact Person option source for a single leadTeams row.
 *
 * Reverse-lookup friendly: with nothing selected upstream we return EVERY
 * contact (so the user can find a person without remembering their company).
 * Once a Company (or just a Company Type) is chosen we forward-filter, and the
 * cascade-provided list (props.teamFilteredContacts[index]) always wins when it
 * has been populated.
 */
const buildRowContacts = (team: any, index: number, props: LeadSectionsProps): any[] => {
  const allContacts = props.contacts || [];
  const cascadeContacts = props.teamFilteredContacts && props.teamFilteredContacts[index];
  if (Array.isArray(cascadeContacts) && cascadeContacts.length > 0) {
    return cascadeContacts;
  }
  if (team.companyId) {
    return allContacts.filter((c: any) =>
      team.subCompanyId
        ? c.subCompanyId === team.subCompanyId || c.companyId === team.companyId
        : c.companyId === team.companyId
    );
  }
  if (team.companyTypeId) {
    const typeCompanyIds = new Set(
      (props.companies || [])
        .filter((c: any) => String(c.companyTypeId) === String(team.companyTypeId))
        .map((c: any) => c.id)
    );
    return allContacts.filter((c: any) => typeCompanyIds.has(c.companyId));
  }
  return allContacts;
};

/**
 * Company Type dropdown options — TOP-LEVEL (main) types only, matching the
 * Company form. Sub-types/services (a type whose parentTypeId points to a
 * top-level type) are excluded; orphans (parent missing/invalid) are promoted
 * so nothing silently disappears. Mirrors NewCompanyForm's `mainTypes` logic.
 */
const mainCompanyTypeOptions = (companyTypes: any[]): { value: any; label: string }[] => {
  const list = companyTypes || [];
  const typeById = new Map(list.map((t: any) => [t.id, t]));
  const parentIsTopLevel = (pid: any) => {
    const p = typeById.get(pid);
    return !!p && (!p.parentTypeId || !typeById.has(p.parentTypeId));
  };
  const isSub = (t: any) =>
    !!(t.parentTypeId && typeById.has(t.parentTypeId) && parentIsTopLevel(t.parentTypeId));
  return list.filter((t: any) => !isSub(t)).map((t: any) => ({ value: t.id, label: t.name }));
};

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
            Inquiry No. <span className="text-danger">*</span>
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
            onCreate={async () => {
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
            onCreate={async () => {
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
            onCreate={async () => {
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
                  const sortedCompanyTypes = mainCompanyTypeOptions(props.companyTypes);
                  let filteredCompanies = props.companies || [];
                  if (team.companyTypeId) {
                    filteredCompanies = filteredCompanies.filter((c: any) => String(c.companyTypeId) === String(team.companyTypeId));
                  }

                  let filteredSubCompanies = [];
                  if (team.companyId) {
                    const selectedCompany = props.companies.find((c: any) => c.id === team.companyId);
                    filteredSubCompanies = selectedCompany?.subCompanies || [];
                  } else if (team.companyTypeId) {
                    filteredSubCompanies = filteredCompanies.flatMap((c: any) => c.subCompanies || []);
                  } else {
                    filteredSubCompanies = (props.companies || []).flatMap((c: any) => c.subCompanies || []);
                  }

                  let filteredContacts = props.contacts || [];
                  if (team.subCompanyId) {
                    filteredContacts = filteredContacts.filter((c: any) => c.subCompanyId === team.subCompanyId || c.companyId === team.companyId);
                  } else if (team.companyId) {
                    filteredContacts = filteredContacts.filter((c: any) => c.companyId === team.companyId);
                  } else if (team.companyTypeId) {
                    const typeCompanyIds = new Set(filteredCompanies.map((c: any) => c.id));
                    filteredContacts = filteredContacts.filter((c: any) => typeCompanyIds.has(c.companyId));
                  }

                  const contactOptions = filteredContacts.map((x: any) => ({
                    value: x.id,
                    label: x.fullName || x.name || "Unnamed Contact",
                    avatar: x.profilePhoto || null,
                  }));

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
                            options={contactOptions}
                            onChange={(val: any) =>
                              props.handleContactChange(index, val?.value, setFieldValue)
                            }
                            isRequired={false}
                          />
                        </Grid>
                      </Grid>
                    </div>
                  );
                })}
                {/* Single Address To — hidden once one client connection exists. */}
                {(values.leadTeams || []).length === 0 && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => push({ companyTypeId: "", companyId: "", subCompanyId: "", contactId: "" })}
                    className="align-self-start fw-bold mt-2"
                  >
                    + Add Client Company Connection
                  </Button>
                )}
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
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <>
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextInput formikField="plotArea" label="Plot Area" type="number" isRequired={false} />
          </Grid>
          <Grid item xs={12} md={6}>
            <DropDownInput formikField="plotAreaUnit" inputLabel="Plot Area Unit" options={[
              { value: "SFT", label: "Sq. Ft" },
              { value: "SQM", label: "Sq. M" },
              { value: "ACRE", label: "Acres" },
            ]} isRequired={false} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextInput formikField="builtUpArea" label="Built Up Area" type="number" isRequired={false} />
          </Grid>
          <Grid item xs={12} md={6}>
            <DropDownInput formikField="builtUpAreaUnit" inputLabel="Built Up Area Unit" options={[
              { value: "SFT", label: "Sq. Ft" },
              { value: "SQM", label: "Sq. M" },
            ]} isRequired={false} />
          </Grid>
          <Grid item xs={12}>
            <TextAreaInput formikField="buildingDetail" label="Building Detail / Spec" rows={3} isRequired={false} />
          </Grid>
        </Grid>
      </div>

      {/* Project Points Section */}
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <ProjectPointsSection
          value={values.projectPoints || []}
          onChange={(newPoints) => setFieldValue('projectPoints', newPoints)}
          title="Project Points"
        />
      </div>
    </>
  );
};

// 3. Team Details Section (Internal Lead Team)
export const TeamDetailsSection: React.FC<LeadSectionsProps> = (props) => {
  const employeeOptions = (props.employees || [])
    .filter(x => x.isActive !== false)
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map(x => ({ value: x.employeeId, label: x.employeeName, avatar: x.avatar || null }));
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={12}>
          <DropDownInput formikField="leadAssignedTo" inputLabel="Assigned to " options={employeeOptions} isRequired={false} showColor />
        </Grid>
      </Grid>
    </div>
  );
};

// 4. File Location Section
export const FileLocationSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const allCompanies = props.companies || [];
  const allCompanyTypes = props.companyTypes || [];

  const selectedType = values.fileLocationCompanyType;
  const selectedCompany = allCompanies.find((c: any) => String(c.id) === String(values.fileLocationCompany));

  // Keep Type in sync with Company even for pre-existing/legacy data saved before
  // this pairing existed (Company set, Type left blank) — backfill it on load too,
  // not just when the user picks a Company through the dropdown below.
  useEffect(() => {
    if (selectedCompany?.companyTypeId && !selectedType) {
      setFieldValue("fileLocationCompanyType", selectedCompany.companyTypeId);
    }
  }, [selectedCompany?.companyTypeId, selectedType]);

  // Forward-filter: once a Company Type is picked, only that type's companies show.
  // With nothing picked, every company is available.
  const filteredCompanies = selectedType
    ? allCompanies.filter((c: any) => String(c.companyTypeId) === String(selectedType))
    : allCompanies;

  const typeOptions = allCompanyTypes.map((x: any) => ({ value: x.id, label: x.name }));

  // The Company list must ALWAYS include the currently-saved value, so an existing
  // lead pre-populates on edit even when the saved Company falls outside the active
  // type filter. Without this the dropdown renders empty on edit.

  const companyOptions = (() => {
    const opts = filteredCompanies.map((x: any) => ({ value: x.id, label: x.companyName, avatar: x.logo || null }));
    if (values.fileLocationCompany && !opts.some((o: any) => String(o.value) === String(values.fileLocationCompany))) {
      const saved = allCompanies.find((c: any) => String(c.id) === String(values.fileLocationCompany));
      if (saved) opts.unshift({ value: saved.id, label: saved.companyName, avatar: saved.logo || null });
    }
    return opts;
  })();

  return (
    <div className="wt-section-card">
      <div className="wt-section-heading">
        File Location In Computer Folder
      </div>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DropDownInput
            isRequired={false}
            formikField="fileLocationCompanyType"
            inputLabel="Company Type In Computer Folder"
            options={typeOptions}
            onChange={(opt: any) => {
              const typeId = opt?.value || "";
              setFieldValue("fileLocationCompanyType", typeId);
              // Clearing the Type also clears the Company — they're a linked pair.
              if (!typeId) {
                setFieldValue("fileLocationCompany", "");
                return;
              }
              // Switching to a different Type drops a Company that no longer matches it.
              if (selectedCompany && String(selectedCompany.companyTypeId) !== String(typeId)) {
                setFieldValue("fileLocationCompany", "");
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DropDownInput
            isRequired={false}
            formikField="fileLocationCompany"
            inputLabel="Company Name In Computer Folder"
            options={companyOptions}
            showColor
            onChange={(opt: any) => {
              const companyId = opt?.value || "";
              setFieldValue("fileLocationCompany", companyId);
              // Reverse cascade: picking a Company directly back-fills its Company Type.
              const company = allCompanies.find((c: any) => c.id === companyId);
              if (company?.companyTypeId) {
                setFieldValue("fileLocationCompanyType", company.companyTypeId);
              }
            }}
          />
        </Grid>
      </Grid>
    </div>
  );
};

// 5. Referral Details Section
// Lead Source Type Selector
export const LeadSourceTypeSection: React.FC<LeadSectionsProps> = (props) => {
  const sourceTypes = [
    { value: "DIRECT", label: "Direct Source" },
    { value: "REFERRAL", label: "Referrals" },
  ];

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DropDownInput formikField="leadSourceType" inputLabel="Lead Source Type" options={sourceTypes} isRequired={false} />
        </Grid>
      </Grid>
    </div>
  );
};

// Direct Source Section
export const DirectSourceSection: React.FC<LeadSectionsProps> = (props) => {
  const directSources = props.leadDirectSources || [];
  const hasOptions = directSources.length > 0;
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
        Direct Source
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <DropDownInput
            isRequired={false}
            formikField="leadDirectSource"
            inputLabel="Direct Source"
            options={directSources.map(x => ({ value: x.id, label: x.name }))}
          />
          {/* When the list is empty there is nothing to select (and therefore nothing
              to save). Make that explicit and offer an inline way to add one. */}
          {!hasOptions && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
              No direct sources configured yet.
              {props.setShowDirectSourceModal && (
                <button
                  type="button"
                  className="btn btn-link p-0 ms-1 align-baseline fw-bold"
                  style={{ fontSize: 12 }}
                  onClick={() => props.setShowDirectSourceModal(true)}
                >
                  + Add a Direct Source
                </button>
              )}
            </div>
          )}
        </Grid>
      </Grid>
    </div>
  );
};

// Referral Details Section
export const ReferralDetailsSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const employeeOptions = (props.employees || [])
    .filter(x => x.isActive !== false)
    .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
    .map(x => ({ 
      value: x.employeeId, 
      label: x.employeeName,
      avatar: x.avatar || x.users?.avatar || null
    }));
  // The referral-type dropdown stores the type's ID (a UUID), NOT the literal
  // string "INTERNAL". Resolve the selected type and read its isInternal flag
  // (with a name fallback) so the Internal path shows the "Referring Employee"
  // field instead of the company fields.
  const isInternalReferral = (referralTypeId: string): boolean => {
    const t = (props.referralTypes || []).find((x: any) => x.id === referralTypeId);
    return t?.isInternal === true || /internal/i.test(t?.name || "");
  };

  // The dropdown always offers exactly Internal and External (the backend
  // guarantees both rows exist). A saved legacy type on an existing lead is
  // appended so edit still pre-populates.
  const allTypes = props.referralTypes || [];
  const internalType = allTypes.find((x: any) => x.isInternal === true)
    || allTypes.find((x: any) => /^internal$/i.test((x.name || "").trim()));
  const externalType = allTypes.find((x: any) => /^external$/i.test((x.name || "").trim()))
    || allTypes.find((x: any) => x.isInternal !== true);
  const baseTypeOptions = [internalType, externalType]
    .filter(Boolean)
    .map((x: any) => ({ value: x.id, label: x.name }));
  const referralTypeOptions = (savedTypeId: string) => {
    if (savedTypeId && !baseTypeOptions.some(o => String(o.value) === String(savedTypeId))) {
      const saved = allTypes.find((x: any) => String(x.id) === String(savedTypeId));
      if (saved) return [...baseTypeOptions, { value: saved.id, label: saved.name }];
    }
    return baseTypeOptions;
  };

  // On a NEW lead, pre-select the two default referral rows — first External,
  // second Internal — once the referral types have loaded from the backend
  // (their ids are UUIDs, unknown at form-init time). Seeds only once, and only
  // while both rows are still blank, so it never overrides a user's own choice
  // or the saved values of a lead being edited. Rows added later via
  // "+ Add Referral Source" stay blank.
  const didSeedReferralTypesRef = useRef(false);
  useEffect(() => {
    if (didSeedReferralTypesRef.current) return;
    if (props.isEditMode) return;
    if (!internalType || !externalType) return;
    const refs = values.referrals || [];
    if (refs.length < 2) return;
    if (refs[0]?.referralType || refs[1]?.referralType) return;
    setFieldValue("referrals.0.referralType", externalType.id);
    setFieldValue("referrals.1.referralType", internalType.id);
    didSeedReferralTypesRef.current = true;
  }, [props.isEditMode, internalType, externalType, values.referrals, setFieldValue]);

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
        Referral Details
      </Typography>
      <FieldArray name="referrals">
        {({ push, remove }) => (
          <div className="d-flex flex-column gap-3">
            {(values.referrals || []).map((ref: any, index: number) => (
              <div key={index} className="wt-entry-card">
                <button
                  type="button"
                  className="wt-entry-card-remove"
                  onClick={() => remove(index)}
                  aria-label="Remove referral"
                >
                  <Close fontSize="small" />
                </button>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <DropDownInput
                      isRequired={false}
                      formikField={`referrals.${index}.referralType`}
                      inputLabel="Referral Type"
                      options={referralTypeOptions(ref.referralType)}
                      onChange={(opt: any) => {
                        const newType = opt?.value || "";
                        setFieldValue(`referrals.${index}.referralType`, newType);
                        // Clear the opposite branch so a row never carries both a
                        // referring company AND a referring employee.
                        if (isInternalReferral(newType)) {
                          setFieldValue(`referrals.${index}.referringCompanyType`, "");
                          setFieldValue(`referrals.${index}.referringCompany`, "");
                          setFieldValue(`referrals.${index}.referringContact`, "");
                        } else {
                          setFieldValue(`referrals.${index}.referredByEmployeeId`, "");
                        }
                      }}
                    />
                  </Grid>
                </Grid>
                {/* Separate row so the External branch's 3 fields (4+4+4=12) always
                    lay out on one line, independent of the Referral Type row above. */}
                <Grid container spacing={2} className="mt-1">
                  {isInternalReferral(ref.referralType) ? (
                    <Grid item xs={12} md={8}>
                      <DropDownInput
                        isRequired={false}
                        formikField={`referrals.${index}.referredByEmployeeId`}
                        inputLabel="Referring Employee"
                        options={employeeOptions}
                        showColor={true}
                      />
                    </Grid>
                  ) : (
                    <React.Fragment>
                      {(() => {
                        const sortedCompanyTypes = mainCompanyTypeOptions(props.companyTypes);

                        let filteredCompanies = props.companies || [];
                        if (ref.referringCompanyType) {
                          filteredCompanies = filteredCompanies.filter((c: any) => String(c.companyTypeId) === String(ref.referringCompanyType));
                        }

                        let filteredContacts = props.contacts || [];
                        if (ref.referringCompany) {
                          filteredContacts = filteredContacts.filter((c: any) => String(c.companyId) === String(ref.referringCompany));
                        } else if (ref.referringCompanyType) {
                          const typeCompanyIds = new Set(filteredCompanies.map((c: any) => c.id));
                          filteredContacts = filteredContacts.filter((c: any) => typeCompanyIds.has(c.companyId));
                        }

                        return (
                          <>
                            <Grid item xs={12} md={4}>
                              <DropDownInput
                                isRequired={false}
                                formikField={`referrals.${index}.referringCompanyType`}
                                inputLabel="Referring Company Type"
                                options={sortedCompanyTypes}
                                onChange={(opt: any) => {
                                  setFieldValue(`referrals.${index}.referringCompanyType`, opt?.value || "");
                                  setFieldValue(`referrals.${index}.referringCompany`, "");
                                  setFieldValue(`referrals.${index}.referringContact`, "");
                                }}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <DropDownInput
                                isRequired={false}
                                formikField={`referrals.${index}.referringCompany`}
                                inputLabel="Referring Company"
                                options={filteredCompanies.map((x: any) => ({ value: x.id, label: x.companyName, avatar: x.logo || null }))}
                                onChange={(opt: any) => {
                                  const companyId = opt?.value || "";
                                  setFieldValue(`referrals.${index}.referringCompany`, companyId);
                                  setFieldValue(`referrals.${index}.referringContact`, "");
                                  if (companyId) {
                                    const selectedCompany = (props.companies || []).find((c: any) => c.id === companyId);
                                    if (selectedCompany?.companyTypeId) {
                                      setFieldValue(`referrals.${index}.referringCompanyType`, selectedCompany.companyTypeId);
                                    }
                                  }
                                }}
                                showColor
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <DropDownInput
                                isRequired={false}
                                formikField={`referrals.${index}.referringContact`}
                                inputLabel="Referring Contact"
                                options={filteredContacts.map((c: any) => ({
                                  value: c.id,
                                  label: c.fullName || c.name || "Unnamed Contact",
                                  avatar: c.profilePhoto || null,
                                }))}
                                onChange={(opt: any) => {
                                  const contactId = opt?.value || "";
                                  setFieldValue(`referrals.${index}.referringContact`, contactId);
                                  if (contactId) {
                                    const selectedContact = (props.contacts || []).find((c: any) => c.id === contactId);
                                    if (selectedContact?.companyId) {
                                      setFieldValue(`referrals.${index}.referringCompany`, selectedContact.companyId);
                                      const selectedCompany = (props.companies || []).find((c: any) => c.id === selectedContact.companyId);
                                      if (selectedCompany?.companyTypeId) {
                                        setFieldValue(`referrals.${index}.referringCompanyType`, selectedCompany.companyTypeId);
                                      }
                                    }
                                  }
                                }}
                                showColor
                              />
                            </Grid>
                          </>
                        );
                      })()}
                    </React.Fragment>
                  )}
                </Grid>
              </div>
            ))}
            <Button
              variant="outline-primary"
              size="sm"
              type="button"
              onClick={() => push({ referralType: "", referredByEmployeeId: "", referringCompanyType: "", referringCompany: "", referringContact: "" })}
              className="align-self-start fw-bold mt-1"
            >
              + Add Referral Source
            </Button>
          </div>
        )}
      </FieldArray>
    </div>
  );
};

// Keep the old ReferralSection name for backwards compatibility, but make it render all three components
export const ReferralSection: React.FC<LeadSectionsProps> = (props) => {
  return (
    <>
      <DirectSourceSection {...props} />
      <ReferralDetailsSection {...props} />
    </>
  );
};

// 6. Commercials Section
export const CommercialsSection: React.FC = () => {
  return (
    <>
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
          Commercial Work Areas
        </Typography>
        <CommercialsGrid type="lead" />
      </div>

      {/* Payment Stage subsection */}
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
          Payment Stage
        </Typography>
        <PaymentStageSelector />
      </div>

      {/* Meeting Schedule subsection */}
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
          Meeting Schedule
        </Typography>
        <MeetingScheduleSelector />
      </div>
    </>
  );
};

// 7. Description Section
export const RemarksAndDocumentsSection: React.FC<LeadSectionsProps> = (props) => {
  return (
    <>
      <div className="card shadow-sm border p-6 bg-white mb-6">
        <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
          Detailed Description
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextAreaInput
              formikField="description"
              label="Detailed Description"
              placeholder="Provide a detailed description of the project or lead"
              isRequired={false}
            />
          </Grid>
        </Grid>
      </div>
    </>
  );
};

// 8. Address Details Section
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
                onClick={() => push({ country: "", state: "", city: "", locality: "", projectAddress: "", pincode: "", googleMapLink: "", gmbLink: "", latitude: "", longitude: "" })}
                className="align-self-start fw-bold mt-2"
              >
                + Add Address details
              </Button>
            )}
          </div>
        )}
      </FieldArray>

      {/* ── Location Verification ─────────────────────────────────────── */}
      <div className="mt-5 pt-4 border-top">
        <Typography className="fs-6 fw-bold text-gray-800 mb-3">Location Verification</Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={!!values.projectMeta?.isLocationIncorrect}
                  onChange={(e) => setFieldValue("projectMeta.isLocationIncorrect", e.target.checked)}
                  color="warning"
                />
              }
              label={<Typography sx={{ fontSize: "14px", fontWeight: 500 }}>Location Incorrect</Typography>}
            />
          </Grid>
          {values.projectMeta?.isLocationIncorrect && (
            <Grid item xs={12} md={9}>
              <TextInput formikField="projectMeta.locationRemark" label="Location Remark" isRequired={false} />
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
};

// 8. Additional Details Section
export const AdditionalDetailsSection: React.FC = () => {
  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
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
//   Project Status — only visible when Lead status has isProjectTrigger=true
//                    (RECEIVED / NOT_RECEIVED / ONGOING / COMPLETED / …)
//
// Writes: Lead Status → statusId, Project Status → projectStatusId
// A status is a terminal "lost" closure if it carries the isLostOutcome flag, or
// (back-compat) is the legacy "Canceled" status. Such leads require a reason.
const isClosureStatus = (status?: any): boolean =>
  !!status && (status.isLostOutcome === true || status.name === "Canceled");

export const StatusSection: React.FC<LeadSectionsProps> = (props) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const isReceived = props.isReceivedStatus ?? false;

  const leadStatuses = props.leadStatuses || [];
  const cancellationReasons = props.cancellationReasons || [];
  const selectedStatus = leadStatuses.find((x: any) => x.id === values.statusId);
  const isClosure = isClosureStatus(selectedStatus);
  const isNotReceived = selectedStatus?.name === "Not Received";

  return (
    <div className="card shadow-sm border p-6 bg-white mb-6">
      <Grid container spacing={3}>
        {/* Lead Status — the only editable field in this step. */}
        <Grid item xs={12}>
          <DropDownInput
            formikField="statusId"
            inputLabel="Lead Status"
            isRequired={true}
            showColor={true}
            placeholder="Select lead status…"
            options={leadStatuses.map((x: any) => ({ value: x.id, label: x.name, color: x.color }))}
            onChange={(opt: any) => {
              const selectedId = opt?.value || "";
              setFieldValue("statusId", selectedId);
              const selected = leadStatuses.find((x: any) => x.id === selectedId);
              if (!selected?.isProjectTrigger) {
                // Leaving a project-trigger status — clear the project status too
                setFieldValue("projectStatusId", "");
              }
              // Leaving a closure status — clear the closure capture so stale
              // reason/note values are never persisted on a reopened lead.
              if (!isClosureStatus(selected)) {
                setFieldValue("cancellationReasonId", "");
                setFieldValue("cancellationNote", "");
              }
            }}
          />
        </Grid>

        {/* Not Received capture — optional cancellation reason for Not Received status. */}
        {isNotReceived && (
          <Grid item xs={12}>
            <div
              className="p-4 rounded"
              style={{ background: "#fef9e7", border: "1px solid #fde68a" }}
            >
              <div style={{ fontWeight: 700, color: "#b45309", fontSize: 15, marginBottom: 10 }}>
                Not Received — Cancellation Reason
              </div>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <DropDownInput
                    formikField="cancellationReasonId"
                    inputLabel="Cancellation Reason"
                    isRequired={false}
                    showColor={true}
                    placeholder="Select a reason (optional)…"
                    options={cancellationReasons.map((r: any) => ({
                      value: r.id,
                      label: r.reason,
                      color: r.color,
                    }))}
                  />
                </Grid>
              </Grid>
              <div style={{ color: "#b45309", fontSize: 12, marginTop: 8 }}>
                Add an optional reason for why this lead was not received. Manage reasons under Lead Configuration → Cancellation Reasons.
              </div>
            </div>
          </Grid>
        )}

        {/* Closure capture — required reason + note for Canceled / Lost outcomes. */}
        {isClosure && (
          <Grid item xs={12}>
            <div
              className="p-4 rounded"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <div style={{ fontWeight: 700, color: "#b91c1c", fontSize: 15, marginBottom: 10 }}>
                {selectedStatus?.isLostOutcome ? "Lost — Closure Details" : "Cancellation Details"}
              </div>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DropDownInput
                    formikField="cancellationReasonId"
                    inputLabel="Closure Reason"
                    isRequired={true}
                    showColor={true}
                    placeholder="Select a reason…"
                    options={cancellationReasons.map((r: any) => ({
                      value: r.id,
                      label: r.reason,
                      color: r.color,
                    }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextInput
                    formikField="cancellationNote"
                    label="Closure Note"
                    isRequired={false}
                  />
                </Grid>
              </Grid>
              <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>
                This lead will be marked as <strong>cancelled / lost</strong> and dated on save.
                Manage reasons under Lead Configuration → Cancellation Reasons.
              </div>
            </div>
          </Grid>
        )}

        {/* When the status is project-triggering, capture the commercial/PO details
            right here — they're set once on receipt and become read-only on the
            Project detail page afterwards. */}
        {isReceived && (
          <Grid item xs={12}>
            <div
              className="d-flex align-items-center gap-3 p-4 rounded mb-4"
              style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}
            >
              <CheckCircleOutline style={{ color: "#15803d", fontSize: "2rem", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: "#0A5C2A", fontSize: 15 }}>
                  This lead has been converted to a Project
                </div>
                <div style={{ color: "#15803d", fontSize: 13, marginTop: 2 }}>
                  Add the received date, contract financials and purchase order details
                  below — the lead record stays fully preserved.
                </div>
              </div>
            </div>

            <div className="mb-4">
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <DateInput
                    formikField="receivedDate"
                    inputLabel="Received Date"
                    formikProps={props.formikProps}
                    placeHolder="Select received date"
                    isRequired={false}
                  />
                  <p className="text-muted fs-8 mt-2 mb-0">
                    Auto-filled with today's date when the status is set to Received. Adjust if needed.
                  </p>
                </Grid>
              </Grid>
            </div>

            <div className="mb-4">
              <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
                Contract Financials
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextInput
                    formikField="projectMeta.contractRate"
                    label="Contract Rate"
                    isRequired={false}
                    inputValidation="decimal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextInput
                    formikField="projectMeta.finalCost"
                    label="Final Cost"
                    isRequired={false}
                    inputValidation="decimal"
                  />
                </Grid>
              </Grid>
            </div>

            <div>
              <Typography className="fs-6 fw-bold text-gray-800 mb-3 border-bottom pb-2">
                Purchase Order
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <DropDownInput
                    formikField="poStatus"
                    inputLabel="PO Status"
                    isRequired={false}
                    options={[
                      { value: "Pending", label: "Pending" },
                      { value: "Approved", label: "Approved" },
                      { value: "Rejected", label: "Rejected" },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextInput formikField="poNumber" label="PO Number" isRequired={false} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <DateInput
                    formikField="poDate"
                    inputLabel="PO Date"
                    formikProps={props.formikProps}
                    placeHolder="Select PO Date"
                    isRequired={false}
                  />
                </Grid>
              </Grid>
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
            isRequired={false}
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
          <TextInput formikField="poNumber" label="PO Number" isRequired={false} />
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
            isRequired={false}
                    formikField={`handledByEntries.${index}.employeeId`}
                    inputLabel="Assigned Employee"
                    options={employeeOptions}
                  />
                </div>
                <div style={{ width: "20%" }}>
                  <TextInput
            isRequired={false}
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
        {/* Inquiry No + Revision No (read-only) + Date */}
        <Grid item xs={12} md={4}>
          <Typography sx={{ mb: 0.8, fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Inquiry No. <span className="text-danger">*</span>
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
        <Grid item xs={12} md={4}>
          <Typography sx={{ mb: 0.8, fontSize: "13px", fontWeight: 500, color: "#374151" }}>
            Revision No.
          </Typography>
          <Box
            sx={{
              border: "1px solid #D0D5DD",
              borderRadius: "8px",
              px: 2,
              height: "45px",
              display: "flex",
              alignItems: "center",
              background: "#F3F4F6",
              color: "#6B7280",
              fontSize: "14px",
              cursor: "not-allowed",
            }}
            title="Revision number is managed automatically by the audit system"
          >
            {props.currLeadData?.revisionCount !== undefined &&
            props.currLeadData?.revisionCount !== null
              ? `R${props.currLeadData.revisionCount}`
              : "—"}
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
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
        Address To 
      </div>
      <FieldArray name="leadTeams">
        {({ push, remove }) => (
          <div className="d-flex flex-column gap-3">
            {(values.leadTeams || []).map((team: any, index: number) => {
              const sortedCompanyTypes = mainCompanyTypeOptions(props.companyTypes);
              const filteredCompanies =
                props.teamFilteredCompanies[index] || props.companies;
              const selectedCompany = props.companies.find(
                (c: any) => c.id === team.companyId
              );
              const filteredSubCompanies =
                props.teamFilteredSubCompanies[index] ||
                (selectedCompany?.subCompanies || []);

              // Contact Person list — reverse-lookup friendly. When nothing
              // upstream is chosen we show EVERY contact so the user can pick a
              // person without remembering their company; picking one back-fills
              // Company Type / Company / Sub Company via handleContactChange.
              // Forward filtering still applies once a company/type is selected.
              const rowContacts = buildRowContacts(team, index, props);
              const contactOptions = rowContacts.map((x: any) => ({
                value: x.id,
                label: x.fullName || x.name || "Unnamed Contact",
                avatar: x.profilePhoto || null,
              }));

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
                          avatar: x.logo || null,
                        }))}
                        onChange={(val: any) =>
                          props.handleCompanyChange(index, val?.value, setFieldValue)
                        }
                        isRequired={false}
                        showColor
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
                        options={contactOptions}
                        onChange={(val: any) =>
                          props.handleContactChange(index, val?.value, setFieldValue)
                        }
                        isRequired={false}
                        showColor
                      />
                    </Grid>
                  </Grid>
                </div>
              );
            })}

            {/* Address To is a SINGLE client connection — the "+ Add" button is
                hidden once one row exists. This single Address To is mirrored
                one-way into the project's External Team; additional stakeholders
                are managed there, not here. */}
            {(values.leadTeams || []).length === 0 && (
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
            )}
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
  const isReceived = !!(currentStatusObj?.isProjectTrigger);
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

      {/* PO Details and Work Handled By Allocation moved to the Project Execution
          step (they are project-execution concerns, shown only for Received leads). */}

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
