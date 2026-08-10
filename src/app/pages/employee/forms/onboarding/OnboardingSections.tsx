import React, { useEffect, useState } from "react";
import { useFormikContext } from "formik";

import AddAnotherBtn from "@app/modules/common/utils/AddAnotherBtn";
import DropDownInput from "@app/modules/common/inputs/DropdownInput";
import TextInput from "@app/modules/common/inputs/TextInput";
import RadioInput from "@app/modules/common/inputs/RadioInput";
import MonthYearInput from "@app/modules/common/inputs/MonthYearInput";
import { useSalaryMaster } from "@modules/payroll/hooks/useSalaryComponentNames";
import { fetchAllEmployees, fetchQualificationMasters } from "@services/employee";

import { Notice, ToggleRow } from "../shared/FormPrimitives";

// Field renderers are reused verbatim from the legacy wizard — this migration
// changes the SHELL (one tree timeline, shared design system), not the fields.
import AddressInfo from "../../wizard/forms/AddressInfo";
import BasicInfo from "../../wizard/forms/BasicInfo";
import BankInfo from "../../wizard/forms/BankInfo";
import EducationalInfo from "../../wizard/forms/EducationInfo";
import EmergencyDetails from "../../wizard/forms/EmergencyDetails";
import FamilyInfo from "../../wizard/forms/FamilyInfo";
import PersonalContactInfo from "../../wizard/forms/PersonalContactInfo";
import ProfilePicture from "../../wizard/forms/ProfilePicture";
import MealPreferences from "../../wizard/forms/MealPreference";
import EmployeeInfo from "../../wizard/forms/EmployeeInfo";
import HiringInfo from "../../wizard/forms/HiringInfo";
import WorkContactInfo from "../../wizard/forms/WorkContactInfo";
import WorkExperience from "../../wizard/forms/WorkExperience";
import LeaveAllocationStep from "../../wizard/forms/LeaveAllocationStep";
import AppSettings from "../../wizard/forms/AppSettings";
import Documents from "../../wizard/forms/Documents";

// `ob-repeating-section` and the field-level `ob-*` rules the renderers above
// rely on still live here. The obsolete shell classes it also carries
// (ob-header-bar, ob-horiz-stepper, ob-sections-sidebar…) are simply unused now.
import "../../wizard/steps/Step2.css";

import { createEducationRow } from "@utils/educationUtils";

const ADD_NEW_QUALIFICATION = "__ADD_NEW__";

const createNewFamilyMember = () => ({
  name: "",
  relationship: "",
  mobileNumber: "",
});

const createNewWorkExp = () => ({
  companyName: "",
  jobTitle: "",
  fromDate: "",
  toDate: "",
  isCurrentEmployer: false,
});

const NEW_REJOIN_ENTRY = { dateOfReJoining: "", dateOfReExit: "", reason: "" };

/**
 * Props every onboarding leaf section receives. The wizard forwards the whole
 * object to each section's `render`, so a section destructures only what it
 * needs — same contract as ContactSections / CompanySections.
 */
export interface OnboardingSectionsProps {
  formikProps: any;
  editMode: boolean;
  /** Registers a pending file upload against a document id. */
  setFile: (docId: string, file: any) => void;
  removeFile?: (docId: string) => void;
  setEducationFile?: (index: number, file: any) => void;
  /** Holds the bank proof until the employee exists to attach it to. */
  setBankFile?: (file: any) => void;
  /**
   * Object-URL preview of a just-picked profile photo. Owned by the HOST, not
   * this section — the wizard renders one section at a time, so a preview held
   * in local state would die the moment the user navigates away.
   */
  profilePhotoPreview?: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 1 — Personal Details
   ═══════════════════════════════════════════════════════════════════════════ */

export const PersonalInfoSection: React.FC<OnboardingSectionsProps> = ({
  formikProps,
  setFile,
  removeFile,
  profilePhotoPreview,
}) => {
  const { values, setFieldValue } = useFormikContext<any>();

  return (
    <div className="ob-personal-info-layout">
      <ProfilePicture
        setFile={setFile}
        // Show the host's object-URL preview for a freshly picked file, falling
        // back to the saved URL. Writing the preview into `values.avatar`
        // instead would ship the entire base64 blob to the backend on save,
        // since the employee payload sends `avatar` verbatim.
        avatar={profilePhotoPreview || values?.avatar}
        onRemove={() => {
          // Clear the saved avatar URL and drop any pending upload so the
          // removal actually persists on save (not just visually).
          setFieldValue("avatar", "");
          removeFile?.("userProfilePicture");
        }}
      />
      <div className="ob-personal-info-fields">
        <BasicInfo formikProps={formikProps} />
      </div>
    </div>
  );
};

export const ContactInfoSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => (
  <PersonalContactInfo formikProps={formikProps} />
);

export const EducationSection: React.FC<OnboardingSectionsProps> = ({
  formikProps,
  setFile,
  setEducationFile,
}) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const rows: any[] = Array.isArray(values.educationalInfo) ? values.educationalInfo : [];
  const [qualificationOptions, setQualificationOptions] = useState<any[]>([]);

  const loadQualificationOptions = async () => {
    let qualifications: any[] = [];
    try {
      const res = await fetchQualificationMasters();
      qualifications = res?.data?.qualifications || [];
    } catch {
      qualifications = [];
    }
    // Options come purely from the Qualification config now. The four defaults that
    // used to be merged in here (SSC/HSC/Diploma/Degree) were frontend-only, so they
    // could not be renamed or removed and selecting one stored a bare label instead of
    // an id. They are real rows in qualification_master now — nothing is hardcoded.
    const byName = new Map<string, any>();
    qualifications.forEach((q: any) => {
      if (!q?.name) return;
      byName.set(q.name.toLowerCase(), { value: q.id, label: q.name, name: q.name });
    });
    const opts = Array.from(byName.values());
    setQualificationOptions([
      ...opts,
      { value: ADD_NEW_QUALIFICATION, label: "+ Add New", name: "+ Add New" },
    ]);
    return opts;
  };

  useEffect(() => {
    loadQualificationOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = () => setFieldValue("educationalInfo", [...rows, createEducationRow()]);
  const remove = (i: number) => {
    if (rows.length <= 1) return;
    setFieldValue("educationalInfo", rows.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="ob-repeating-section">
      {rows.map((_: any, index: number) => (
        <div key={`edu-${index}`}>
          <EducationalInfo
            formikProps={formikProps}
            userId={values?.userId}
            index={index}
            setFile={setFile}
            canRemove={index > 0}
            onRemove={() => remove(index)}
            qualificationOptions={qualificationOptions}
            onQualificationCreated={loadQualificationOptions}
            setEducationFile={setEducationFile}
          />
        </div>
      ))}
      <AddAnotherBtn onClick={add} />
    </div>
  );
};

export const FamilySection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const rows: any[] = Array.isArray(values.familyInfo) ? values.familyInfo : [];

  const add = () => setFieldValue("familyInfo", [...rows, createNewFamilyMember()]);
  const remove = (i: number) => {
    if (rows.length <= 1) return;
    setFieldValue("familyInfo", rows.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="ob-repeating-section">
      {rows.map((_: any, index: number) => (
        <div key={`fam-${index}`}>
          <FamilyInfo
            formikProps={formikProps}
            index={index}
            canRemove={index > 0}
            onRemove={() => remove(index)}
          />
        </div>
      ))}
      <AddAnotherBtn onClick={add} />
    </div>
  );
};

export const EmergencySection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => (
  <EmergencyDetails formikProps={formikProps} />
);

export const BankSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => {
  const { values } = useFormikContext<any>();
  return <BankInfo formikProps={formikProps} userId={values?.userId} />;
};

export const AddressSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => (
  <div className="ob-repeating-section">
    <AddressInfo formikProps={formikProps} />
  </div>
);

export const AdditionalDetailsSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => (
  <MealPreferences formikProps={formikProps} />
);

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 2 — Company Details
   ═══════════════════════════════════════════════════════════════════════════ */

export const EmployeeInfoSection: React.FC<OnboardingSectionsProps> = () => <EmployeeInfo />;

export const WorkContactSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => (
  <WorkContactInfo formikProps={formikProps} />
);

export const HiringSection: React.FC<OnboardingSectionsProps> = ({ formikProps, editMode }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const rejoinRows: any[] = Array.isArray(values.rejoinHistory) ? values.rejoinHistory : [];

  return (
    <HiringInfo
      formikProps={formikProps}
      editMode={editMode}
      rejoinRows={rejoinRows}
      onAddRejoin={() => setFieldValue("rejoinHistory", [...rejoinRows, NEW_REJOIN_ENTRY])}
      onRemoveRejoin={(i: number) =>
        setFieldValue("rejoinHistory", rejoinRows.filter((_: any, idx: number) => idx !== i))
      }
    />
  );
};

export const WorkExperienceSection: React.FC<OnboardingSectionsProps> = ({ formikProps }) => {
  const { values, setFieldValue } = useFormikContext<any>();
  const rows: any[] = Array.isArray(values.workExpInfo) ? values.workExpInfo : [];

  const add = () => setFieldValue("workExpInfo", [...rows, createNewWorkExp()]);
  const remove = (i: number) => {
    if (rows.length <= 1) return;
    setFieldValue("workExpInfo", rows.filter((_: any, idx: number) => idx !== i));
  };

  return (
    <div className="ob-repeating-section">
      {rows.map((_: any, index: number) => (
        <div key={`workInfo-${index}`}>
          <WorkExperience
            formikProps={formikProps}
            index={index}
            canRemove={index > 0}
            onRemove={() => remove(index)}
          />
        </div>
      ))}
      <AddAnotherBtn onClick={add} />
    </div>
  );
};

export const LeaveSettingsSection: React.FC<OnboardingSectionsProps> = () => (
  <>
    <Notice tone="warning" icon="bi-exclamation-triangle">
      Review the leave settings before saving — allocations depend on the selected branch.
    </Notice>
    <div className="mt-4">
      <LeaveAllocationStep />
    </div>
  </>
);

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 3 — App Settings
   ═══════════════════════════════════════════════════════════════════════════ */

export const ReportingSection: React.FC<OnboardingSectionsProps> = () => {
  const [managerOptions, setManagerOptions] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function getManagers() {
      try {
        const {
          data: { employees },
        } = await fetchAllEmployees();
        if (cancelled) return;
        setManagerOptions(
          employees.map((emp: any) => ({
            value: emp.id,
            label: `${emp.users.firstName} ${emp.users.lastName}`,
          }))
        );
      } catch {
        if (!cancelled) setManagerOptions([]);
      }
    }
    getManagers();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="row">
      <div className="col-lg-6 col-md-6 col-sm-12">
        <DropDownInput
          isRequired={false}
          formikField="reportsToId"
          inputLabel="Reporting Manager"
          placeholder="Select reporting manager"
          options={managerOptions}
        />
      </div>
    </div>
  );
};

export const FinancialSection: React.FC<OnboardingSectionsProps> = ({ formikProps, editMode }) => {
  const { resolveComponent } = useSalaryMaster();
  const tds1Comp = resolveComponent("Professional Fees");
  const tds2Comp = resolveComponent("TDS 2");
  const tds1Name = tds1Comp?.shortCode
    ? tds1Comp.shortCode
    : tds1Comp?.displayName
      ? tds1Comp.displayName
      : "Tax Deducted at Source (TDS)";
  const tds2Name = tds2Comp?.shortCode
    ? tds2Comp.shortCode
    : tds2Comp?.displayName
      ? tds2Comp.displayName
      : "TDS 2";

  const formatINNumber = (val: any) => {
    if (!val) return "";
    return Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(val));
  };
  const parseINNumber = (val: string) => val.replace(/,/g, "");

  const ctcValue = parseFloat(formikProps.values.ctcInLpa || "0");
  const isCTCReadonly = editMode && ctcValue > 0;

  const pfEnabled = String(formikProps.values.professionalFeesEnabled) === "true";
  const pfType = formikProps.values.professionalFeesType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
  const tds2Enabled = String(formikProps.values.tds2Enabled) === "true";
  const tds2Type = formikProps.values.tds2Type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";
  const retentionEnabled = String(formikProps.values.retentionEnabled) === "true";
  const retentionType =
    formikProps.values.retentionType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

  // Retention start month auto-fills from the joining month the moment HR
  // enables the toggle — stays editable afterwards. Month-only: stored as
  // the first day of the month ('YYYY-MM-01').
  useEffect(() => {
    if (
      retentionEnabled &&
      !formikProps.values.retentionStartDate &&
      formikProps.values.dateOfJoining
    ) {
      formikProps.setFieldValue(
        "retentionStartDate",
        `${String(formikProps.values.dateOfJoining).slice(0, 7)}-01`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retentionEnabled]);

  return (
    <>
      {/* CTC */}
      <div className="row mb-4">
        <div className="col-lg-4 col-md-6 col-sm-12">
          <TextInput
            isRequired={true}
            label="CTC"
            formikField="ctcInLpa"
            formatter={formatINNumber}
            parser={parseINNumber}
            readonly={isCTCReadonly}
          />
          {isCTCReadonly && (
            <span className="wt-field-hint">
              Salary cannot be updated here — use the Increment option in the Salary module.
            </span>
          )}
        </div>
      </div>

      {/* Professional Fees (TDS1) */}
      <div className="row">
        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
          <RadioInput
            formikField="professionalFeesEnabled"
            inputLabel="Employee Type"
            radioBtns={[
              { label: "Contract Based", value: "true" },
              { label: "Salary Based", value: "false" },
            ]}
            isRequired={true}
          />
        </div>

        {pfEnabled && (
          <>
            <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
              <RadioInput
                formikField="professionalFeesType"
                inputLabel="Type"
                radioBtns={[
                  { label: "Fixed", value: "FIXED" },
                  { label: "Percentage", value: "PERCENTAGE" },
                ]}
                isRequired={true}
              />
            </div>

            <div className="col-lg-4 col-md-4 col-sm-12">
              {pfType === "PERCENTAGE" ? (
                <TextInput
                  isRequired={true}
                  label={`${tds1Name} %`}
                  formikField="professionalFeesPercentage"
                />
              ) : (
                <TextInput
                  isRequired={true}
                  label={`${tds1Name} Amount`}
                  formikField="professionalFeesAmount"
                  formatter={formatINNumber}
                  parser={parseINNumber}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* TDS2 — independent from TDS1 / PTAX */}
      <div className="separator separator-dashed my-6" />
      <div className="row">
        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
          <RadioInput
            formikField="tds2Enabled"
            inputLabel={`${tds2Name} (Additional)`}
            radioBtns={[
              { label: "Enabled", value: "true" },
              { label: "Disabled", value: "false" },
            ]}
            isRequired={true}
          />
        </div>

        {tds2Enabled && (
          <>
            <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
              <RadioInput
                formikField="tds2Type"
                inputLabel={`${tds2Name} Type`}
                radioBtns={[
                  { label: "Fixed", value: "FIXED" },
                  { label: "Percentage", value: "PERCENTAGE" },
                ]}
                isRequired={true}
              />
            </div>
            <div className="col-lg-4 col-md-4 col-sm-12">
              {tds2Type === "PERCENTAGE" ? (
                <TextInput
                  isRequired={true}
                  label={`${tds2Name} %`}
                  formikField="tds2Percentage"
                />
              ) : (
                <TextInput
                  isRequired={true}
                  label={`${tds2Name} Amount`}
                  formikField="tds2Amount"
                  formatter={formatINNumber}
                  parser={parseINNumber}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Retention (fresher bond) — monthly deduction between start & end dates */}
      <div className="separator separator-dashed my-6" />
      <div className="row">
        <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
          <RadioInput
            formikField="retentionEnabled"
            inputLabel="Retention (Fresher Bond)"
            radioBtns={[
              { label: "Enabled", value: "true" },
              { label: "Disabled", value: "false" },
            ]}
            isRequired={true}
          />
        </div>

        {retentionEnabled && (
          <>
            <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
              <MonthYearInput
                formikField="retentionStartDate"
                inputLabel="Retention Start Month"
                placeHolder="Auto-filled from joining month"
                isRequired={true}
                formikProps={formikProps}
              />
            </div>
            <div className="col-lg-4 col-md-4 col-sm-12">
              <MonthYearInput
                formikField="retentionEndDate"
                inputLabel="Retention End Month"
                placeHolder="Retention End Month"
                isRequired={true}
                formikProps={formikProps}
                minDateField="retentionStartDate"
              />
            </div>
          </>
        )}
      </div>

      {retentionEnabled && (
        <div className="row mt-4">
          <div className="col-lg-4 col-md-4 col-sm-12 mb-3 mb-lg-0">
            <RadioInput
              formikField="retentionType"
              inputLabel="Retention Type"
              radioBtns={[
                { label: "Fixed", value: "FIXED" },
                { label: "Percentage", value: "PERCENTAGE" },
              ]}
              isRequired={true}
            />
          </div>
          <div className="col-lg-4 col-md-4 col-sm-12">
            {retentionType === "PERCENTAGE" ? (
              <TextInput
                isRequired={true}
                label="Retention % (per month)"
                formikField="retentionPercentage"
              />
            ) : (
              <TextInput
                isRequired={true}
                label="Retention Amount (per month)"
                formikField="retentionAmount"
                formatter={formatINNumber}
                parser={parseINNumber}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export const ReimbursementSection: React.FC<OnboardingSectionsProps> = () => (
  <div className="row">
    <div className="col-lg-6 col-md-6 col-sm-12">
      <TextInput
        isRequired={false}
        label="Reimbursement Limit Per Request"
        formikField="reimbursementLimitPerRequest"
      />
    </div>
  </div>
);

export const SystemAccessSection: React.FC<OnboardingSectionsProps> = () => <AppSettings />;

export const PrivacySection: React.FC<OnboardingSectionsProps> = () => {
  const { values, setFieldValue } = useFormikContext<any>();
  return (
    <ToggleRow
      id="isHiddenFromStaff"
      title="Hide From Staff Directory"
      subtitle="When enabled, this employee profile is visible only to Admin users and the employee themselves. They keep full access to their own attendance, payroll and leave — only their discoverability is restricted."
      checked={values.isHiddenFromStaff === true}
      onChange={(checked) => setFieldValue("isHiddenFromStaff", checked)}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   GROUP 4 — Documents
   ═══════════════════════════════════════════════════════════════════════════ */

export const DocumentsSection: React.FC<OnboardingSectionsProps> = ({ formikProps, setFile }) => {
  const { values } = useFormikContext<any>();
  const documentFields: any[] = Array.isArray(values.documentFields) ? values.documentFields : [];

  // The list is the company's Onboarding Docs configuration, mirrored into Formik by
  // OnboardingWorkspace. Empty means none is configured (or enabled) — which is a real
  // state to explain, not a blank panel: the section used to render its notice over
  // nothing and read as broken.
  if (documentFields.length === 0) {
    return (
      <div className="ob-doc-empty">
        <span className="ob-doc-empty-title">No documents requested</span>
        <span className="ob-doc-empty-hint">
          Nothing is configured for this company yet. Add document types under
          Organization → Onboarding Docs and they will appear here.
        </span>
      </div>
    );
  }

  return (
    <>
      <Notice tone="info" icon="bi-info-circle">
        Please upload PDF files only — other file types such as images will not be accepted.
      </Notice>

      <div className="ob-repeating-section mt-4">
        {documentFields.map((field: any, index: number) => (
          <div key={field?.id ?? `documentFields-${index}`}>
            <Documents formikProps={formikProps} index={index} setFile={setFile} />
          </div>
        ))}
      </div>
    </>
  );
};
