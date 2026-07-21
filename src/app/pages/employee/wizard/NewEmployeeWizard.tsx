import { resolveActiveOrgId } from '@utils/activeOrg';
import { safeJsonParse } from "@utils/safeJson";
import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues, useFormikContext } from "formik";
import * as Yup from "yup";
import { StepperComponent } from "@metronic/assets/ts/components";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { uploadUserAsset } from "@services/uploader";
import Step2, { NAV_SECTIONS, COMPLETION_FNS, SECTION_OF_FIELD, ALL_SECTION_IDS } from "./steps/Step2";
import ObSectionsSidebar from "./steps/ObSectionsSidebar";
import Step3 from "./steps/Step3";
import Step4 from "./steps/Step4";
import StepAppSettings from "./steps/StepAppSettings";
import { buildEducationPayload, createEducationRow, getActiveEducationRows, getEducationCompletionValues, hasStartedEducationInfo, normalizeEducationRows } from "../../../../utils/educationUtils";
import "../glass.css";
import "./steps/Step2.css";
import { createNewUser, updateUser, archiveUser } from "@services/users";
import {
  createAddressDetails,
  createBankDetails,
  createDocumentsDetails,
  createEducationalDetails,
  createEmergencyContacts,
  createEmergencyDetails,
  createNewEmployee,
  createPreviousExperienceDetails,
  createRejoinHistoryDetails,
  fetchWizardData,
  updateAddressDetails,
  updateBankDetails,
  updateDocumentDetails,
  updateEducationalDetails,
  updateEmergencyContact,
  updateEmergencyDetails,
  updateEmployee,
  updateEmployeeRolesById,
  updateOnboardingDocumentDetailsById,
  updatePreviousExpDetails,
  updateRejoinHistoryDetails,
  deleteAllRejoinHistoryByEmployeeId,
  fetchApprovalWorkflowConfigs,
} from "@services/employee";
import { fetchCompanyOverview } from "@services/company";
import { successConfirmation, errorConfirmation } from "@utils/modal";
import { employeeOnBardingFormRegexes } from "@constants/regex";

/**
 * Professional Fees helpers
 */
function readProfessionalFeesEnabled(raw: unknown): "true" | "false" {
  if (raw === null || raw === undefined) return "false";
  if (raw === false || raw === 0 || raw === "0" || raw === "false" || raw === "FALSE") return "false";
  if (raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "TRUE") return "true";
  if (typeof raw === "object" && raw !== null && "data" in (raw as any)) {
    return (raw as any).data?.[0] ? "true" : "false";
  }
  return "false";
}

function toNumberOrNull(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function buildProfessionalFeesPayload(values: {
  professionalFeesEnabled: unknown;
  professionalFeesAmount: unknown;
  professionalFeesPercentage: unknown;
  professionalFeesType: unknown;
}) {
  const enabled = readProfessionalFeesEnabled(values.professionalFeesEnabled) === "true";
  const type = values.professionalFeesType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

  if (!enabled) {
    return {
      professionalFeesEnabled: false,
      professionalFeesType: "FIXED" as const,
      professionalFeesAmount: null,
      professionalFeesPercentage: null,
    };
  }

  if (type === "PERCENTAGE") {
    return {
      professionalFeesEnabled: true,
      professionalFeesType: "PERCENTAGE" as const,
      professionalFeesAmount: null,
      professionalFeesPercentage: toNumberOrNull(values.professionalFeesPercentage),
    };
  }

  return {
    professionalFeesEnabled: true,
    professionalFeesType: "FIXED" as const,
    professionalFeesAmount: toNumberOrNull(values.professionalFeesAmount),
    professionalFeesPercentage: null,
  };
}

const PROF_FEES_KEYS = new Set([
  "professionalFeesEnabled",
  "professionalFeesType",
  "professionalFeesAmount",
  "professionalFeesPercentage",
]);

function buildTds2Payload(values: {
  tds2Enabled: unknown;
  tds2Type: unknown;
  tds2Amount: unknown;
  tds2Percentage: unknown;
}) {
  const enabled = String(values.tds2Enabled) === "true";
  const type = values.tds2Type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

  if (!enabled) {
    return { tds2Enabled: false, tds2Type: "FIXED" as const, tds2Amount: null, tds2Percentage: null };
  }
  if (type === "PERCENTAGE") {
    return { tds2Enabled: true, tds2Type: "PERCENTAGE" as const, tds2Amount: null, tds2Percentage: toNumberOrNull(values.tds2Percentage) };
  }
  return { tds2Enabled: true, tds2Type: "FIXED" as const, tds2Amount: toNumberOrNull(values.tds2Amount), tds2Percentage: null };
}

const TDS2_KEYS = new Set(["tds2Enabled", "tds2Type", "tds2Amount", "tds2Percentage"]);

// Retention (fresher bond): monthly salary deduction active between start & end
// dates. Start date falls back to Date of Joining when HR leaves it blank.
function buildRetentionPayload(values: {
  retentionEnabled: unknown;
  retentionType: unknown;
  retentionAmount: unknown;
  retentionPercentage: unknown;
  retentionStartDate: unknown;
  retentionEndDate: unknown;
  dateOfJoining?: unknown;
}) {
  const enabled = String(values.retentionEnabled) === "true";
  const type = values.retentionType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED";

  if (!enabled) {
    return { retentionEnabled: false, retentionType: "FIXED" as const, retentionAmount: null, retentionPercentage: null, retentionStartDate: null, retentionEndDate: null };
  }
  return {
    retentionEnabled: true,
    retentionType: type,
    retentionAmount: type === "FIXED" ? toNumberOrNull(values.retentionAmount) : null,
    retentionPercentage: type === "PERCENTAGE" ? toNumberOrNull(values.retentionPercentage) : null,
    retentionStartDate: (values.retentionStartDate as string) || (values.dateOfJoining as string) || null,
    retentionEndDate: (values.retentionEndDate as string) || null,
  };
}

const RETENTION_KEYS = new Set(["retentionEnabled", "retentionType", "retentionAmount", "retentionPercentage", "retentionStartDate", "retentionEndDate"]);

const ONBOARDING_DRAFT_KEY = "employee-onboarding-draft";

// Draft autosave for the NEW-employee form. sessionStorage (not localStorage) so the draft lives
// only until the admin shuts the tab/website — surviving an accidental form close, navigation, or
// refresh, but never outliving the session. Only text/select/array `values` are drafted; uploaded
// File blobs live in separate React state and can't be serialized.
const loadDraft = (): any => safeJsonParse(sessionStorage.getItem(ONBOARDING_DRAFT_KEY) as any, null);
const saveDraft = (values: any) => {
  try { sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(values)); } catch { /* quota / serialization — ignore */ }
};
const clearDraft = () => {
  try {
    sessionStorage.removeItem(ONBOARDING_DRAFT_KEY);
    localStorage.removeItem(ONBOARDING_DRAFT_KEY); // drop any legacy localStorage draft too
  } catch { /* ignore */ }
};

const hasDraftValue = (value: any) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
};

// Recursively marks every leaf of a value as `touched`, preserving Formik's nested
// shape (arrays/objects) so `meta.touched` resolves correctly for dot-path fields
// like "addressInfo.presentAddressLine1" — used to reveal validation errors for a
// whole section at once when a user tries to skip past it.
const touchDeep = (value: any): any => {
  if (Array.isArray(value)) return value.map(touchDeep);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, touchDeep(v)]));
  return true;
};

// Ordered left-hand sections per top step. The floating "Continue" button walks the sections
// of WHATEVER step you're on (not only step 1) before advancing to the next step. Keep these
// in sync with each step component's own `sections` list. Module-level (not per-render) so
// `FormikValidationErrorFocus` below can also use it to jump to the right section on any step.
// Top-step display names (index = 1-based step number → its own title; index N is also the
// NEXT step's title when you're finishing step N-1). Drives the "Continue to <next step>" label
// consistently on every step's terminal button.
const STEP_TITLES = ["Personal Details", "Company Details", "App Settings", "Documents"];

const STEP_SECTIONS: Record<number, string[]> = {
  1: ALL_SECTION_IDS,
  2: ["employee_info", "contact_info", "hiring_info", "work_experience", "leave_settings"],
  3: ["reporting", "financial", "reimbursement", "access", "privacy"],
  4: ["upload_docs"],
};

// Which top-level Formik keys each section owns — drives per-section Continue gating AND
// (via FIELD_TO_SECTION below) redirecting the user straight to whichever section owns a
// missing/invalid required field, on every step, not just step 1.
const SECTION_FIELD_KEYS: Record<number, Record<string, string[]>> = {
  1: {
    "personal-info": ["firstName", "lastName", "dateOfBirth", "gender", "nickName", "maritalStatus", "anniversary", "bloodGroup"],
    "contact-info": ["personalEmailId", "personalPhoneNumber", "alternatePhoneNumber", "personalPhoneNumberExtension", "linkedInProfileUrl", "instagramProfileUrl", "facebookProfileUrl"],
    education: ["educationalInfo"],
    family: ["familyInfo"],
    emergency: ["emergencyDetails"],
    bank: ["bankInfo"],
    address: ["addressInfo"],
    meal: ["meal"],
  },
  2: {
    employee_info: ["organizationId", "subOrganizationId", "designationId", "departmentId", "branchId", "teamId", "employeeTypeId", "employeeTypeConfigId", "workingMethodId"],
    contact_info: ["companyEmailId", "companyPhoneNumber", "companyPhoneExtension"],
    hiring_info: ["sourceOfHireId", "referredById", "dateOfJoining", "dateOfExit", "rejoinHistory", "employeeStatusId", "employeeStatusConfigId"],
    work_experience: ["workExpInfo"],
    leave_settings: ["leaveAllocations"],
  },
  3: {
    reporting: ["reportsToId"],
    financial: ["ctcInLpa", "professionalFeesEnabled", "professionalFeesType", "professionalFeesAmount", "professionalFeesPercentage", "tds2Enabled", "tds2Type", "tds2Amount", "tds2Percentage", "retentionEnabled", "retentionStartDate", "retentionEndDate", "retentionType", "retentionAmount", "retentionPercentage"],
    reimbursement: ["reimbursementLimitPerRequest"],
    access: ["appRole"],
    privacy: ["isHiddenFromStaff"],
  },
};

// Inverted lookup: given a step and a top-level field key, which section owns it? Lets any
// error-focus/redirect logic land on the right section regardless of which step it's on.
const FIELD_TO_SECTION: Record<number, Record<string, string>> = Object.fromEntries(
  Object.entries(SECTION_FIELD_KEYS).map(([step, sections]) => [
    Number(step),
    Object.fromEntries(Object.entries(sections).flatMap(([sectionId, keys]) => keys.map((key) => [key, sectionId]))),
  ])
);

// Sections with no field-level requirement of their own (e.g. Leave Settings) that must still
// be opened at least once before the step they belong to can be completed.
const MUST_VISIT_SECTIONS = new Set(["leave_settings"]);

// The set of top-level field keys that currently FAIL validation for a step — computed
// SYNCHRONOUSLY from the given values via that step's Yup schema. This is the single source of
// truth for "can the user leave this section/step?", used by both the Continue button and the
// sidebar redirect. It deliberately avoids Formik's async `errors` object, which lags behind
// `enableReinitialize` resets and caused the edit-form freeze. A pure (values, schema) → keys
// function can't race anything, so the gating is correct on the very first render.
const computeInvalidKeys = (schema: any, values: any): Set<string> => {
  const keys = new Set<string>();
  try {
    schema.validateSync(values, { abortEarly: false });
  } catch (err: any) {
    (err?.inner ?? []).forEach((e: any) => {
      if (e?.path) keys.add(String(e.path).split(/[.[]/)[0]);
    });
  }
  return keys;
};

// True when none of the field keys a section owns currently fail validation. Drives the
// step-1 sidebar green tick so "complete" means schema-valid, not merely non-empty. Defaults
// to step 1 (the only step whose sidebar tick is completion-gated).
const isSectionValid = (sectionId: string, invalidKeys: Set<string>, step: number = 1): boolean =>
  (SECTION_FIELD_KEYS[step]?.[sectionId] ?? []).every((key) => !invalidKeys.has(key));

const getNameInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase() || "U";
};

const calculateProfileCompletion = (values: any) => {
  const education = values.educationalInfo?.[0] || {};
  const family = values.familyInfo?.[0] || {};
  const emergency = values.emergencyDetails || {};
  const bank = values.bankInfo || {};
  const address = values.addressInfo || {};
  const educationCompletion = getEducationCompletionValues(education);

  // Which top-level keys currently fail validation, gathered across every step's schema.
  // A tracked field only counts toward "% complete" when it is non-empty AND its owning key
  // is valid — so the bar can no longer climb on invalid input (e.g. a too-short phone) and
  // the header % now means "valid progress", not merely "something typed".
  const invalidKeys = new Set<string>();
  newEmployeeWizardSchema.forEach((schema) => {
    computeInvalidKeys(schema, values).forEach((k) => invalidKeys.add(k));
  });

  // Each tracked field is tagged with the top-level Formik key that owns it, so a validation
  // failure on that key excludes the field from the "completed" count.
  const trackedFields: Array<{ value: any; key: string }> = [
    { value: values.firstName, key: "firstName" },
    { value: values.lastName, key: "lastName" },
    { value: values.nickName, key: "nickName" },
    { value: values.dateOfBirth, key: "dateOfBirth" },
    { value: values.gender, key: "gender" },
    { value: values.maritalStatus, key: "maritalStatus" },
    { value: values.personalEmailId, key: "personalEmailId" },
    { value: values.personalPhoneNumber, key: "personalPhoneNumber" },
    { value: values.alternatePhoneNumber, key: "alternatePhoneNumber" },
    ...educationCompletion.map((value: any) => ({ value, key: "educationalInfo" })),
    { value: family.name, key: "familyInfo" },
    { value: family.relationship, key: "familyInfo" },
    { value: family.mobileNumber, key: "familyInfo" },
    { value: family.dateOfBirth, key: "familyInfo" },
    { value: emergency.emergencyContactName, key: "emergencyDetails" },
    { value: emergency.emergencyContactNumber, key: "emergencyDetails" },
    { value: bank.accountNumber, key: "bankInfo" },
    { value: bank.accountName, key: "bankInfo" },
    { value: bank.ifscCode, key: "bankInfo" },
    // Both required address lines count (schema requires present AND permanent line 1),
    // aligning this with the sidebar's permanent-address completion.
    { value: address.permanentAddressLine1, key: "addressInfo" },
    { value: address.presentAddressLine1, key: "addressInfo" },
    { value: address.presentCity, key: "addressInfo" },
    { value: address.presentPostalCode, key: "addressInfo" },
    { value: values.dateOfJoining, key: "dateOfJoining" },
    { value: values.companyEmailId, key: "companyEmailId" },
    { value: values.departmentId, key: "departmentId" },
    { value: values.designationId, key: "designationId" },
    { value: values.branchId, key: "branchId" },
    { value: values.appRole, key: "appRole" },
    { value: values.documentInfo?.some((doc: any) => doc?.path || doc?.fileName || doc?.identityNumber), key: "documentInfo" },
  ];

  const completed = trackedFields.filter(({ value, key }) => hasDraftValue(value) && !invalidKeys.has(key)).length;
  return Math.round((completed / trackedFields.length) * 100);
};

const createDefaultWorkExpInfo = () => ({ companyName: "", jobTitle: "", fromDate: "", toDate: "", isCurrentEmployer: false });

const hasWorkExpInfo = (workExp: any) =>
  Boolean(workExp?.companyName || workExp?.jobTitle || workExp?.fromDate || workExp?.toDate);

const withDefaultWorkExpInfo = (workExpInfo: any) =>
  Array.isArray(workExpInfo) && workExpInfo.length > 0 ? workExpInfo : [createDefaultWorkExpInfo()];

const optionalString = () =>
  Yup.string().transform((value) => (value === "" ? undefined : value)).notRequired();

const newEmployeeWizardSchema = [
  Yup.object({
    avatar: Yup.string(),
    firstName: Yup.string().required("First name is required")
      .min(4, "First name must be at least 4 characters")
      .max(20, "First name must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["firstName"], "First name can only contain alphabetic characters"),
    lastName: Yup.string().required().label("Last Name")
      .min(4, "Last name must be at least 4 characters")
      .max(20, "Last name must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["lastName"], "Last name can only contain alphabetic characters"),
    nickName: optionalString(),
    gender: Yup.string().required().label("Gender"),
    maritalStatus: optionalString().label("Marital Status"),
    dateOfBirth: Yup.string().required().label("Date Of Birth"),
    anniversary: optionalString().label("Anniversary Date"),
    bloodGroup: optionalString().label("Blood Group"),
    personalEmailId: Yup.string().email().required().label("Personal Email Address")
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
    personalPhoneNumber: Yup.string().required().label("Personal Phone Number")
      .min(10, "Phone Number must be at least 10 characters")
      .max(20, "Phone Number must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["personalPhoneNumber"], "Phone Number can only contain numeric characters"),
    personalPhoneNumberExtension: optionalString().label("Personal Phone Number Extension"),
    alternatePhoneNumber: optionalString().label("Alternate Phone Number")
      .min(10, "Phone Number must be at least 10 characters")
      .max(20, "Phone Number must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["alternatePhoneNumber"], "Phone Number can only contain numeric characters"),
    linkedInProfileUrl: optionalString().label("LinkedIn Profile URL").url("Enter a valid URL (e.g. https://linkedin.com/in/username)"),
    instagramProfileUrl: optionalString().label("Instagram Profile URL").url("Enter a valid URL (e.g. https://instagram.com/username)"),
    facebookProfileUrl: optionalString().label("Facebook Profile URL").url("Enter a valid URL (e.g. https://facebook.com/username)"),
    meal: optionalString().label("Meal"),
    educationalInfo: Yup.array().of(
      Yup.object({
        instituteName: optionalString().label("Institute Name")
          .min(4, "Institute Name must be at least 4 characters")
          .max(100, "Institute Name must be at most 100 characters"),
        qualificationMasterId: optionalString().label("Qualification"),
        qualificationName: optionalString().label("Qualification"),
        degree: optionalString().label("Degree")
          .min(2, "Degree Name must be at least 2 characters")
          .max(80, "Degree Name must be at most 80 characters"),
        specialization: optionalString().label("Specialization"),
        stream: optionalString().label("Stream"),
        customStream: optionalString().label("Custom Stream Name"),
        fromDate: optionalString().label("Date Started"),
        toDate: optionalString().label("Date Ended"),
        passingYear: optionalString().label("Passing Year"),
        percentage: Yup.number().typeError("Percentage must be a number")
          .min(0, "Percentage cannot be less than 0").max(100, "Percentage cannot be more than 100")
          .nullable().transform((v, o) => o === "" ? null : v),
        cgpa: Yup.number().typeError("CGPA must be a number")
          .min(0, "CGPA cannot be less than 0").max(10, "CGPA cannot be more than 10")
          .nullable().transform((v, o) => o === "" ? null : v),
        filePath: optionalString().label("Upload Certificate"),
      })
        // NOTE: Onboarding may capture only partial education info — the admin
        // often doesn't have every detail. So starting a row no longer forces
        // the rest of the section to be filled. Only sanity checks below apply.
        .test("education-passing-year-format", "Passing Year must be a valid year", function (value) {
          if (!value?.passingYear) return true;
          const year = Number(value.passingYear);
          const currentYear = new Date().getFullYear();
          if (/^\d{4}$/.test(String(value.passingYear)) && year >= 1900 && year <= currentYear) return true;
          return this.createError({ path: `${this.path}.passingYear`, message: "Passing Year must be between 1900 and the current year" });
        })
        .test("education-date-order", "Date Completed cannot be before Date Started", function (value) {
          if (!value?.fromDate || !value?.toDate) return true;
          if (new Date(value.toDate) >= new Date(value.fromDate)) return true;
          return this.createError({ path: `${this.path}.toDate`, message: "Date Completed cannot be before Date Started" });
        })
        .test("education-future-completion", "Date Completed cannot be in the future", function (value) {
          if (!value?.toDate) return true;
          const completedAt = new Date(value.toDate);
          const today = new Date(); today.setHours(23, 59, 59, 999);
          if (completedAt <= today) return true;
          return this.createError({ path: `${this.path}.toDate`, message: "Date Completed cannot be in the future" });
        }),
    ).required()
      .test("education-duplicates", "Duplicate qualification entry found", function (educations) {
        const seen = new Set<string>();
        for (let index = 0; index < (educations || []).length; index++) {
          const education = educations?.[index];
          if (!hasStartedEducationInfo(education)) continue;
          const key = [education?.qualificationName || education?.degree, education?.specialization || education?.stream || education?.customStream || ""].join("|").toLowerCase();
          if (seen.has(key)) return this.createError({ path: `${this.path}.${index}.qualificationMasterId`, message: "Duplicate qualification entry found" });
          seen.add(key);
        }
        return true;
      })
      .test("education-sequence", "Academic sequence is invalid", function (educations) {
        const rows = (educations || []).filter(hasStartedEducationInfo);
        const byName = (name: string) => rows.find((row: any) => String(row?.qualificationName || row?.degree) === name);
        const ssc = byName("SSC"); const hsc = byName("HSC");
        const degree = byName("Degree"); const masters = byName("Masters");
        if (ssc?.passingYear && hsc?.passingYear && Number(hsc.passingYear) < Number(ssc.passingYear))
          return this.createError({ path: `${this.path}.${educations?.indexOf(hsc)}.passingYear`, message: "HSC passing year cannot be before SSC" });
        if (masters && !degree)
          return this.createError({ path: `${this.path}.${educations?.indexOf(masters)}.qualificationMasterId`, message: "Masters requires a Degree entry first" });
        return true;
      }),
    familyInfo: Yup.array().of(
      Yup.object({
        name: Yup.string().required().label("Family Member Name")
          .min(4, "Family Member name must be at least 4 characters").max(20, "Family Member name must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.name"], "Family Member name can only contain alphabetic characters"),
        relationship: Yup.string().required().label("Member Relationship")
          .min(3, "Member Relationship name must be at least 3 characters").max(20, "Member Relationship name must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.relationship"], "Member Relationship name can only contain alphabetic characters"),
        mobileNumber: Yup.string().required().label("Member Phone Number")
          .min(10, "Phone Number must be at least 10 characters").max(20, "Phone Number must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.mobileNumber"], "Phone Number can only contain numeric characters"),
        // Date of Birth stays optional per requirement.
        dateOfBirth: optionalString().label("Date of Birth"),
      }),
      // At least one family member is required: Name, Relation and Phone are mandatory
      // for each relative row (Date of Birth stays optional). The wizard seeds one blank
      // row, so the user must complete it before leaving the Family section.
    ).required().label("Family info"),
    emergencyDetails: Yup.object({
      bloodGroup: optionalString().label("Blood Group"),
      allergies: optionalString().label("Allergies")
        .test("max-words", "Allergies must be at most 40 words", (value) => !value || value.trim().split(/\s+/).filter(Boolean).length <= 40),
      emergencyContactName: optionalString().label("Emergency Contact Name")
        .min(4, "Emergency Contact name must be at least 4 characters").max(100, "Emergency Contact name must be at most 100 characters")
        .matches(employeeOnBardingFormRegexes["emergencyDetails.emergencyContactName"], "Emergency Contact name can only contain alphabetic characters"),
      emergencyContactNumber: optionalString().label("Emergency Contact Number")
        .min(10, "Phone Number must be at least 10 characters").max(20, "Phone Number must be at most 20 characters")
        .matches(employeeOnBardingFormRegexes["emergencyDetails.emergencyContactNumber"], "Phone Number can only contain numeric characters"),
    }).required(),
    bankInfo: Yup.object({
      accountName: optionalString().label("Account Holder Name")
        .min(4, "Account Holder name must be at least 4 characters").max(20, "Account Holder name must be at most 20 characters")
        .matches(employeeOnBardingFormRegexes["bankInfo.accountName"], "Account Holder name can only contain alphabetic characters"),
      accountNumber: optionalString().label("Account Number")
        .min(8, "Account Number must be at least 8 characters").max(20, "Account Number must be at most 20 characters")
        .matches(employeeOnBardingFormRegexes["bankInfo.accountNumber"], "Account Number can only contain numeric characters"),
      bankName: optionalString().label("Bank Name")
        .min(2, "Bank Name must be at least 2 characters").max(100, "Bank Name must be at most 100 characters"),
      ifscCode: optionalString().label("IFSC Code")
        .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid 11-character IFSC code (e.g. HDFC0001234)"),
      filePath: optionalString().label("Upload Bank Proof"),
    }).required(),
    addressInfo: Yup.object({
      // Only the Address line itself is required — Country/State/City/Zip/Address Line 2 can
      // all stay empty. No minimum on the address line either — a single short word is fine.
      // Only a max length is enforced, purely as a size guard (not a content-shape rule).
      permanentAddressLine1: Yup.string().required().label("Address").max(150, "Address must be at most 150 characters"),
      permanentAddressLine2: optionalString().label("Address Line 2").max(150, "Address Line 2 must be at most 150 characters"),
      permanentCountry: optionalString().label("Country"),
      permanentState: optionalString().label("State"),
      permanentCity: optionalString().label("City"),
      permanentPostalCode: optionalString().label("Zip Code")
        .min(4, "Zip Code must be at least 4 characters").max(16, "Zip Code must be at most 16 characters")
        .matches(employeeOnBardingFormRegexes["addressInfo.permanentPostalCode"], "Zip Code can only contain numeric characters"),
      presentAddressLine1: Yup.string().required().label("Address").max(150, "Address must be at most 150 characters"),
      presentAddressLine2: optionalString().label("Address Line 2").max(150, "Address Line 2 must be at most 150 characters"),
      presentCountry: optionalString().label("Country"),
      presentState: optionalString().label("State"),
      presentCity: optionalString().label("City"),
      presentPostalCode: optionalString().label("Zip Code")
        .min(4, "Zip Code must be at least 4 characters").max(16, "Zip Code must be at most 16 characters")
        .matches(employeeOnBardingFormRegexes["addressInfo.permanentPostalCode"], "Zip Code can only contain numeric characters"),
    }).required(),
  }),
  Yup.object({
    organizationId: Yup.string().required().label("Organization"),
    subOrganizationId: optionalString().label("Sub-Organization"),
    designationId: Yup.string().required().label("Job Profile"),
    departmentId: Yup.string().required().label("Department"),
    branchId: Yup.string().required().label("Branch"),
    teamId: Yup.string().required().label("Team"),
    employeeTypeId: optionalString().label("Employee Type (Old)"),
    employeeTypeConfigId: optionalString().label("Employee Type"),
    workingMethodId: optionalString().label("Working Method"),
    companyEmailId: Yup.string().required().label("Company Email Address")
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
    companyPhoneNumber: Yup.string().required().label("Company Phone Number")
      .min(10, "Phone Number must be at least 10 characters").max(20, "Phone Number must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["companyPhoneNumber"], "Phone Number can only contain numeric characters"),
    companyPhoneExtension: optionalString().label("Company Phone Extension"),
    sourceOfHireId: optionalString().label("Source Of Hire"),
    referredById: optionalString(),
    dateOfJoining: Yup.string().required().label("Date Of Joining"),
    dateOfExit: optionalString(),
    rejoinHistory: Yup.array().of(
      Yup.object({ dateOfReJoining: optionalString(), dateOfReExit: optionalString(), reason: optionalString() }),
    ),
    employeeStatusId: optionalString().label("Employee Status (Old)"),
    employeeStatusConfigId: optionalString().label("Employee Status"),
    workExpInfo: Yup.array().of(
      Yup.object({
        companyName: optionalString().label("Company Name")
          .min(2, "Company Name must be at least 2 characters").max(100, "Company Name must be at most 100 characters"),
        jobTitle: optionalString().label("Job Title")
          .min(2, "Job Title must be at least 2 characters").max(100, "Job Title must be at most 100 characters"),
        fromDate: optionalString().label("From Date"),
        toDate: optionalString().label("To Date"),
        isCurrentEmployer: Yup.boolean().label("Currently Working Here"),
      }),
      // Work experience is fully optional during onboarding — a partially
      // filled entry is allowed, so starting one field no longer forces the rest.
    ),
  }),
  Yup.object({
    reportsToId: optionalString().label("Reporting Manager"),
    // Marked required in the UI (AppSettings) — enforce it here so the asterisk is honest.
    // Defaults to "1" in initialState, so this never blocks a real submission.
    isEmployeeActive: Yup.string().required().label("Is Employee Active"),
    // Required but "0" is a valid CTC — plain .required() only rejects empty/undefined,
    // it does not reject the numeric value zero.
    ctcInLpa: Yup.string().required().label("CTC In LPA"),
    professionalFeesEnabled: Yup.string().required().label("Employee Type"),
    professionalFeesType: optionalString().label("Employee Type — Fee Type")
      .when("professionalFeesEnabled", { is: "true", then: (s) => s.required() }),
    professionalFeesAmount: optionalString().label("Employee Type — Fee Amount")
      .when(["professionalFeesEnabled", "professionalFeesType"], { is: (enabled: string, t: string) => enabled === "true" && t !== "PERCENTAGE", then: (s) => s.required() }),
    professionalFeesPercentage: optionalString().label("Employee Type — Fee Percentage")
      .when(["professionalFeesEnabled", "professionalFeesType"], { is: (enabled: string, t: string) => enabled === "true" && t === "PERCENTAGE", then: (s) => s.required() }),
    tds2Enabled: Yup.string().required().label("TDS 2 (Additional)"),
    tds2Type: optionalString().label("TDS 2 Type")
      .when("tds2Enabled", { is: "true", then: (s) => s.required() }),
    tds2Amount: optionalString().label("TDS 2 Amount")
      .when(["tds2Enabled", "tds2Type"], { is: (enabled: string, t: string) => enabled === "true" && t !== "PERCENTAGE", then: (s) => s.required() }),
    tds2Percentage: optionalString().label("TDS 2 Percentage")
      .when(["tds2Enabled", "tds2Type"], { is: (enabled: string, t: string) => enabled === "true" && t === "PERCENTAGE", then: (s) => s.required() }),
    retentionEnabled: Yup.string().required().label("Retention (Fresher Bond)"),
    retentionStartDate: optionalString().label("Retention Start Month")
      .when("retentionEnabled", { is: "true", then: (s) => s.required() }),
    retentionEndDate: optionalString().label("Retention End Month")
      .when("retentionEnabled", { is: "true", then: (s) => s.required() }),
    retentionType: optionalString().label("Retention Type")
      .when("retentionEnabled", { is: "true", then: (s) => s.required() }),
    retentionAmount: optionalString().label("Retention Amount")
      .when(["retentionEnabled", "retentionType"], { is: (enabled: string, t: string) => enabled === "true" && t !== "PERCENTAGE", then: (s) => s.required() }),
    retentionPercentage: optionalString().label("Retention Percentage")
      .when(["retentionEnabled", "retentionType"], { is: (enabled: string, t: string) => enabled === "true" && t === "PERCENTAGE", then: (s) => s.required() }),
    appRole: Yup.string().required().label("App Role"),
  }),
  Yup.object({
    obj: optionalString(),
    documentInfo: Yup.array().of(
      Yup.object({
        fileName: optionalString(), identityNumber: optionalString(),
        path: optionalString(), documentId: optionalString(), employeeId: optionalString(),
      }),
    ),
  }),
];

const createDefaultEducationInfo = () => createEducationRow();

const createDefaultFamilyInfo = () => ({ name: "", relationship: "", mobileNumber: "", dateOfBirth: "" });

const hasEducationInfo = hasStartedEducationInfo;

const hasFamilyInfo = (familyMember: any) =>
  Boolean(familyMember?.name || familyMember?.relationship || familyMember?.mobileNumber || familyMember?.dateOfBirth);

const withDefaultEducationInfo = (educationalInfo: any) =>
  Array.isArray(educationalInfo) && educationalInfo.length > 0
    ? normalizeEducationRows(educationalInfo)
    : [createDefaultEducationInfo()];

const withDefaultFamilyInfo = (familyInfo: any) =>
  Array.isArray(familyInfo) && familyInfo.length > 0 ? familyInfo : [createDefaultFamilyInfo()];

const initialState = {
  method: "0", avatar: "", firstName: "", isAdmin: "0", isEmployeeActive: "1",
  lastName: "", nickName: "", gender: "", maritalStatus: "", reportsToId: "",
  dateOfBirth: "", bloodGroup: "", personalEmailId: "", personalPhoneNumber: "",
  alternatePhoneNumber: "", personalPhoneNumberExtension: "", linkedInProfileUrl: "",
  instagramProfileUrl: "", facebookProfileUrl: "", hobbies: "", notes: "", meal: "",
  educationalInfo: [createDefaultEducationInfo()],
  familyInfo: [createDefaultFamilyInfo()],
  emergencyDetails: { bloodGroup: "", allergies: "", emergencyContactName: "", emergencyContactNumber: "" },
  bankInfo: { accountName: "", accountNumber: "", bankName: "", ifscCode: "", filePath: "" },
  addressInfo: {
    permanentAddressLine1: "", permanentAddressLine2: "", permanentCountry: "",
    permanentState: "", permanentCity: "", permanentPostalCode: "",
    presentAddressLine1: "", presentAddressLine2: "", presentCountry: "",
    presentState: "", presentCity: "", presentPostalCode: "",
  },
  organizationId: "", subOrganizationId: "",
  designationId: "", departmentId: "", branchId: "", teamId: "", roomOrBlock: "",
  employeeTypeId: "", employeeTypeConfigId: "", workingMethodId: "", shift: "",
  experienceLevel: "", employeeLevelId: "", companyEmailId: "", companyPhoneNumber: "",
  companyPhoneExtension: "", sourceOfHire: "", referredBy: "", dateOfJoining: "",
  dateOfExit: "", rejoinHistory: [{ dateOfReJoining: "", dateOfReExit: "", reason: "" }],
  employeeStatusId: "", employeeStatusConfigId: "", ctcInLpa: "", appRole: "",
  allowOverTime: "0",
  leaveAllocations: [] as any[],
  workExpInfo: [createDefaultWorkExpInfo()],
  documentInfo: [{ identityNumber: "", employeeId: "", documentId: "", path: "", fileName: "" }],
  roles: [] as any[],
  professionalFeesEnabled: "false", professionalFeesAmount: "",
  professionalFeesPercentage: "", professionalFeesType: "FIXED",
  tds2Enabled: "false", tds2Type: "FIXED", tds2Amount: "", tds2Percentage: "",
  retentionEnabled: "false", retentionType: "FIXED", retentionAmount: "",
  retentionPercentage: "", retentionStartDate: "", retentionEndDate: "",
  isHiddenFromStaff: false,
  reimbursementLimitPerRequest: "",
};

const newEmployeeWizardBreadcrumb: Array<PageLink> = [
  { title: "Employee Management", path: "/employees", isSeparator: false, isActive: false },
  { title: "", path: "", isSeparator: true, isActive: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// Save helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const saveNewUser = async (values: any) => {
  const {
    firstName, lastName, dateOfBirth, personalPhoneNumber, personalEmailId,
    alternatePhoneNumber, personalPhoneNumberExtension, isEmployeeActive,
    bloodGroup, hobbies, notes, linkedInProfileUrl, instagramProfileUrl, facebookProfileUrl,
    isAdmin,
  } = values;

  const user = {
    firstName, lastName,
    isActive: isEmployeeActive === "1",
    isAdmin: isAdmin === "1",
    dateOfBirth,
    ...(personalPhoneNumber && { personalPhoneNumber }),
    ...(personalEmailId && { personalEmailId }),
    ...(personalPhoneNumberExtension && { personalPhoneNumberExtension }),
    ...(alternatePhoneNumber && { alternatePhoneNumber }),
    ...(bloodGroup && { bloodGroup }),
    ...(notes && { notes }),
    ...(hobbies && { hobbies }),
    ...(linkedInProfileUrl && { linkedInProfileUrl }),
    ...(instagramProfileUrl && { instagramProfileUrl }),
    ...(facebookProfileUrl && { facebookProfileUrl }),
  };

  const { data: { id: savedUserId } } = await createNewUser(user);
  return savedUserId;
};

const saveNewEmployee = async (values: any, userId: string) => {
  const { data: { companyOverview } } = await fetchCompanyOverview();
  // Employee belongs to the chosen organization (sub-org if one was selected),
  // falling back to the default org for backward compatibility.
  const companyId = values.subOrganizationId || values.organizationId || (resolveActiveOrgId(companyOverview) ?? '');
  let vegMealPreference, nonVegMealPreference, veganMealPreference;

  const {
    dateOfJoining, ctcInLpa, gender, designationId, branchId, dateOfExit,
    employeeTypeId, employeeTypeConfigId, maritalStatus, sourceOfHireId,
    workingMethodId, departmentId, companyEmailId, referredById, method,
    nickName, employeeCode, companyPhoneNumber, companyPhoneExtension,
    employeeStatusId, employeeStatusConfigId, avatar, meal, reportsToId,
    anniversary, documentFields, documentInfo, appRole, isAdmin, rejoinHistory,
    teamId, roomOrBlock, shift, experienceLevel, employeeLevelId,
    allowOverTime,
    professionalFeesEnabled, professionalFeesAmount,
    professionalFeesPercentage, professionalFeesType, isHiddenFromStaff,
    tds2Enabled, tds2Type, tds2Amount, tds2Percentage,
    retentionEnabled, retentionType, retentionAmount,
    retentionPercentage, retentionStartDate, retentionEndDate,
    reimbursementLimitPerRequest: reimbLimitNew,
  } = values;

  let { aadharCardPath, panCardPath, aadharNumber, panNumber } = values;

  const aadharDocumentId = values?.documentFields?.find(
    (doc: any) => doc?.fieldName?.toLowerCase().trim().replace(" ", "") === "aadharcard"
  )?.id;
  const panDocumentId = values?.documentFields?.find(
    (doc: any) => doc?.fieldName?.toLowerCase().trim().replace(" ", "") === "pancard"
  )?.id;

  if (documentInfo?.findIndex((doc: any) => doc?.documentId === aadharDocumentId) !== -1) {
    const r = documentInfo?.filter((doc: any) => doc?.documentId === aadharDocumentId)
      ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    aadharCardPath = r?.path; aadharNumber = r?.identityNumber;
  }
  if (documentInfo?.findIndex((doc: any) => doc?.documentId === panDocumentId) !== -1) {
    const r = documentInfo?.filter((doc: any) => doc?.documentId === panDocumentId)
      ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    panCardPath = r?.path; panNumber = r?.identityNumber;
  }

  if (meal === "0") vegMealPreference = true;
  if (meal === "1") nonVegMealPreference = true;
  if (meal === "2") veganMealPreference = true;

  const employee: any = {
    ...(avatar && { avatar }), userId, isActive: true,
    ...(employeeTypeId && { employeeTypeId }),
    ...(employeeTypeConfigId && { employeeTypeConfigId }),
    sourceOfHireId,
    ...(employeeStatusId && { employeeStatusId }),
    ...(employeeStatusConfigId && { employeeStatusConfigId }),
    companyId, method: parseInt(method), dateOfJoining, gender: parseInt(gender),
    ...(isAdmin && { isAdmin: isAdmin == "1" }),
    ...(branchId && { branchId }),
    ...(anniversary && { anniversary }),
    reportsToId,
    ...(aadharNumber && { aadharNumber }), ...(aadharCardPath && { aadharCardPath }),
    ...(panNumber && { panNumber }), ...(panCardPath && { panCardPath }),
    ...(workingMethodId && { workingMethodId }),
    ...(departmentId && { departmentId }), ...(ctcInLpa && { ctcInLpa }),
    ...(designationId && { designationId }),
    ...(maritalStatus && { maritalStatus: parseInt(maritalStatus) }),
    ...(companyEmailId && { companyEmailId }), ...(referredById && { referredById }),
    ...(companyPhoneNumber && { companyPhoneNumber }),
    ...(companyPhoneExtension && { companyPhoneExtension }),
    ...(employeeCode && { employeeCode }), ...(nickName && { nickName }),
    ...(dateOfExit && { dateOfExit }),
    ...(vegMealPreference && { vegMealPreference }),
    ...(nonVegMealPreference && { nonVegMealPreference }),
    ...(veganMealPreference && { veganMealPreference }),
    ...(teamId && { teamId }), ...(roomOrBlock && { roomOrBlock }),
    ...(shift && { shift }), ...(experienceLevel && { experienceLevel }),
    ...(employeeLevelId && { employeeLevelId }),
    ...(allowOverTime && { allowOverTime }),
    // Leave Settings section removed — no longer needed
    // ...(Array.isArray(values.leaveAllocations) && { leaveAllocations: values.leaveAllocations }),
    ...buildProfessionalFeesPayload({ professionalFeesEnabled, professionalFeesAmount, professionalFeesPercentage, professionalFeesType }),
    ...buildTds2Payload({ tds2Enabled, tds2Type, tds2Amount, tds2Percentage }),
    ...buildRetentionPayload({ retentionEnabled, retentionType, retentionAmount, retentionPercentage, retentionStartDate, retentionEndDate, dateOfJoining }),
    isHiddenFromStaff: isHiddenFromStaff === true,
    reimbursementLimitPerRequest: (reimbLimitNew !== "" && reimbLimitNew != null && !isNaN(Number(reimbLimitNew))) ? Number(reimbLimitNew) : null,
  };

  Object.keys(employee).forEach((key) => {
    if (key === "gender" || key === "maritalStatus" || key === "isHiddenFromStaff" || key === "reimbursementLimitPerRequest" || PROF_FEES_KEYS.has(key) || TDS2_KEYS.has(key) || RETENTION_KEYS.has(key)) return;
    if (!employee[key] && employee[key] !== 0 && employee[key] !== false) delete employee[key];
  });
  if (!employee.employeeTypeConfigId) delete employee.employeeTypeConfigId;
  if (!employee.employeeStatusConfigId) delete employee.employeeStatusConfigId;

  const { data: { id: savedEmployeeId } } = await createNewEmployee(employee);
  return savedEmployeeId;
};

const saveEmployeeData = async (values: any, employeeId: string) => {
  const { workExpInfo, addressInfo, bankInfo, familyInfo, documentInfo: documents, educationalInfo, rejoinHistory, emergencyDetails } = values;
  try {
    const filledFamilyInfo = familyInfo.filter(hasFamilyInfo);
    const filledEducationalInfo = educationalInfo.filter(hasEducationInfo);
    const filledWorkExpInfo = workExpInfo.filter(hasWorkExpInfo);
    const isSameAddress = addressInfo.permanentAddressLine1 === addressInfo.presentAddressLine1;

    const reqPromises = [
      () => createPreviousExperienceDetails(filledWorkExpInfo.map((el: any) => ({
        ...(el.companyName && { companyName: el.companyName }),
        ...(el.jobTitle && { jobTitle: el.jobTitle }),
        ...(el.fromDate && { fromDate: el.fromDate }),
        ...(el.toDate && { toDate: el.toDate }),
        employeeId,
      }))),
      () => createRejoinHistoryDetails(rejoinHistory.filter((el: any) => el.dateOfReJoining || el.dateOfReExit || el.reason).map((el: any) => ({
        ...(el.dateOfReJoining && { dateOfReJoining: el.dateOfReJoining }),
        ...(el.dateOfReExit && { dateOfReExit: el.dateOfReExit }),
        ...(el.reason && { reason: el.reason }),
        employeeId,
      }))),
      () => createEmergencyContacts(filledFamilyInfo.map((el: any) => ({
        ...(el.name && { name: el.name }),
        ...(el.mobileNumber && { mobileNumber: el.mobileNumber }),
        ...(el.dateOfBirth && { dateOfBirth: el.dateOfBirth }),
        ...(el.relationship && { relation: el.relationship }),
        employeeId,
      }))),
      () => createEducationalDetails(filledEducationalInfo.map((el: any) => buildEducationPayload(el, employeeId)).filter(Boolean)),
      () => createAddressDetails({ ...addressInfo, employeeId, ...(isSameAddress && { presentAddressLine1: undefined, presentAddressLine2: undefined, presentCountry: undefined, presentState: undefined, presentCity: undefined, presentPostalCode: undefined }) }),
      () => createBankDetails({ ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }), ...(bankInfo.accountName && { accountName: bankInfo.accountName }), ...(bankInfo.bankName && { bankName: bankInfo.bankName }), ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }), ...(bankInfo.filePath && { filePath: bankInfo.filePath }), employeeId }),
      () => createEmergencyDetails({ ...(emergencyDetails.bloodGroup && { bloodGroup: emergencyDetails.bloodGroup }), ...(emergencyDetails.allergies && { allergies: emergencyDetails.allergies }), ...(emergencyDetails.emergencyContactName && { emergencyContactName: emergencyDetails.emergencyContactName }), ...(emergencyDetails.emergencyContactNumber && { emergencyContactNumber: emergencyDetails.emergencyContactNumber }), employeeId }),
      () => createDocumentsDetails(documents.map((el: any) => ({ ...el, employeeId }))),
    ];

    const responses = await Promise.all(reqPromises.map((fn) => fn()));
    const allSuccessful = responses.every((response) => response?.statusCode === 200);
    if (!allSuccessful) throw new Error("Some operations failed to complete successfully");
    return true;
  } catch (err) { console.log(err); }
};

// Debounced draft autosave for the create form: writes Formik `values` to sessionStorage as the
// admin types (only when enabled + dirty, so a pristine form never writes a draft) and FLUSHES the
// latest values immediately on unmount, so closing/navigating away preserves the newest keystrokes
// even mid-debounce.
function DraftAutosave({ enabled }: { enabled: boolean }) {
  const { values, dirty } = useFormikContext<any>();
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef<{ values: any; dirty: boolean }>({ values, dirty });
  latestRef.current = { values, dirty };

  useEffect(() => {
    if (!enabled || !dirty) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => saveDraft(values), 600);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [enabled, dirty, values]);

  // Flush on unmount (form closed / navigated away) so nothing typed is lost.
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      const { values: v, dirty: d } = latestRef.current;
      if (enabled && d) saveDraft(v);
    };
  }, [enabled]);

  return null;
}

function FormikValidationErrorFocus({ activeStepIndex, setActiveSection }: { activeStepIndex: number; setActiveSection: (id: string) => void }) {
  const { errors, submitCount } = useFormikContext<any>();

  useEffect(() => {
    if (submitCount > 0 && Object.keys(errors).length > 0) {
      const getFirstErrorField = (errs: any, prefix = ""): string => {
        if (typeof errs === "string") {
          return prefix;
        }
        if (Array.isArray(errs)) {
          for (let i = 0; i < errs.length; i++) {
            if (errs[i]) {
              return getFirstErrorField(errs[i], `${prefix}.${i}`);
            }
          }
        }
        if (typeof errs === "object" && errs !== null) {
          const keys = Object.keys(errs);
          if (keys.length > 0) {
            return getFirstErrorField(errs[keys[0]], prefix ? `${prefix}.${keys[0]}` : keys[0]);
          }
        }
        return prefix;
      };

      const fieldName = getFirstErrorField(errors);
      if (fieldName) {
        // Every step renders one section at a time, so the offending field may not be in the
        // DOM. Switch to the section that owns it first, then scroll/focus it. FIELD_TO_SECTION
        // covers all steps (step 1 also falls back to SECTION_OF_FIELD, which additionally
        // knows about the step-1-only "meal" completion field it was originally built for).
        const topKey = fieldName.split('.')[0];
        const targetSection = FIELD_TO_SECTION[activeStepIndex]?.[topKey]
          ?? (activeStepIndex === 1 ? SECTION_OF_FIELD[topKey] : undefined);
        if (targetSection) setActiveSection(targetSection);

        const scrollToField = () => {
          let inputEl = document.querySelector(`[name="${fieldName}"]`) as HTMLElement;
          if (!inputEl) {
            inputEl = document.getElementById(fieldName) as HTMLElement;
          }
          if (!inputEl) {
            inputEl = document.querySelector(`[name^="${fieldName}"]`) as HTMLElement;
          }
          if (inputEl) {
            inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            inputEl.focus({ preventScroll: true });
          }
        };
        // Longer delay when we changed section so the new section finishes animating in.
        setTimeout(scrollToField, targetSection ? 380 : 150);
      }
    }
  }, [submitCount]);

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

function NewEmployeeWizard({ editMode, openModal }: any) {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const stepperRef = useRef<HTMLDivElement | null>(null);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const formikRef = useRef<any>(null);
  const profilePhotoPreviewRef = useRef<string>("");
  const [stepper, setStepper] = useState<StepperComponent | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(1);
  const [currentSchema, setCurrentSchema] = useState(newEmployeeWizardSchema[0]);
  const [show, setShow] = useState(openModal);
  const [files, setFiles] = useState<{ [key: string]: File }>({});
  const [educationFiles, setEducationFiles] = useState<{ [key: string]: File }>({});
  // Session draft restore (create mode only). Read once so the flag stays stable across renders.
  const initialDraftRef = useRef<any>(editMode ? null : loadDraft());
  const [defaultState, setDefaultState] = useState(() =>
    initialDraftRef.current ? { ...initialState, ...initialDraftRef.current } : initialState
  );
  const [showDraftNotice, setShowDraftNotice] = useState<boolean>(!!initialDraftRef.current);
  const [activeSection, setActiveSection] = useState("personal-info");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Section "required to visit" — sections with no field-level requirement of their own
  // (e.g. Leave Settings) but that must still be opened at least once before the step
  // can be completed.
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set(["personal-info", "employee_info", "reporting", "upload_docs"]));

  // Every section change goes through here — sidebar clicks included, not just the floating
  // Continue button. If the requested section is AHEAD of an earlier section that still has
  // errors, land on that earlier section instead: this is what makes a missing required field
  // "redirect you straight to it" rather than silently letting you skip past it via the sidebar
  // (the Continue button already blocks forward movement one section at a time, but sidebar
  // navigation bypasses that — this closes the same gap for jumps of more than one section).
  // Applies in edit mode too — an existing record missing a now-required field must still be
  // fixed before moving on.
  const changeSection = (id: string) => {
    const stepSections = STEP_SECTIONS[activeStepIndex] ?? [];
    const requestedIdx = stepSections.indexOf(id);
    const currentIdx = stepSections.indexOf(activeSection);
    const fp = formikRef.current;

    if (requestedIdx > currentIdx && fp) {
      // Same synchronous validity check the Continue button uses — never Formik's async errors.
      const invalidKeys = computeInvalidKeys(currentSchema, fp.values);
      const firstInvalidIdx = stepSections
        .slice(0, requestedIdx + 1)
        .findIndex((sectionId) => (SECTION_FIELD_KEYS[activeStepIndex]?.[sectionId] ?? []).some((key) => invalidKeys.has(key)));
      if (firstInvalidIdx !== -1 && stepSections[firstInvalidIdx] !== id) {
        const redirectTo = stepSections[firstInvalidIdx];
        setActiveSection(redirectTo);
        setVisitedSections((prev) => (prev.has(redirectTo) ? prev : new Set(prev).add(redirectTo)));
        // This IS an attempted move — reveal why the user got bounced here.
        revealSectionErrors(redirectTo);
        return;
      }
    }

    setActiveSection(id);
    setVisitedSections((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  // When the top step changes, snap to that step's FIRST section (unless we're already on a
  // section that belongs to the new step), so every step opens at its start.
  useEffect(() => {
    const sections = STEP_SECTIONS[activeStepIndex] ?? ["personal-info"];
    setActiveSection((prev) => (sections.includes(prev) ? prev : sections[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStepIndex]);

  // Reveal a section's validation errors ON DEMAND — marks its fields touched AND validates so
  // the red "required" messages appear. Called only when the user actually TRIES to move past an
  // incomplete section (Continue click / blocked sidebar jump), never on a fresh page load, so an
  // untouched form never shows red until the user attempts to proceed.
  const revealSectionErrors = (sectionId: string, stepIdx: number = activeStepIndex) => {
    const fp = formikRef.current;
    if (!fp) return;
    const keys = SECTION_FIELD_KEYS[stepIdx]?.[sectionId] ?? [];
    const patch = Object.fromEntries(keys.map((key) => [key, touchDeep(fp.values?.[key])]));
    fp.setTouched({ ...fp.touched, ...patch }, true);
  };
  const [mobileProfilePhotoPreview, setMobileProfilePhotoPreview] = useState("");
  const [sidebarProfileHasAppeared, setSidebarProfileHasAppeared] = useState(false);
  const [sidebarProfileShouldAnimate, setSidebarProfileShouldAnimate] = useState(false);

  // Discard the restored draft and reset the create form back to blank.
  const discardDraft = () => {
    clearDraft();
    setDefaultState(initialState);
    formikRef.current?.resetForm({ values: initialState });
    setShowDraftNotice(false);
  };

  // Mobile: modal-body scrolls. Desktop: fixed panels; inner section-body scrolls.
  useEffect(() => {
    const el = modalBodyRef.current;
    if (!show || !el) return;

    const mq = window.matchMedia("(max-width: 991px)");
    const syncModalLayout = () => {
      el.style.height = "100dvh";
      el.style.maxHeight = "100dvh";
      el.style.overflowX = "hidden";
      if (mq.matches) {
        el.style.display = "block";
        el.style.overflowY = "auto";
        (el.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = "touch";
      } else {
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.overflowY = "hidden";
        (el.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = "";
      }
    };

    syncModalLayout();
    mq.addEventListener("change", syncModalLayout);
    return () => {
      mq.removeEventListener("change", syncModalLayout);
      el.style.overflowY = "";
      el.style.overflowX = "";
      el.style.height = "";
      el.style.maxHeight = "";
      el.style.display = "";
      el.style.flexDirection = "";
      (el.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = "";
    };
  }, [show]);

  // Trigger Formik validation when the step changes or the (edit-mode) data loads.
  //
  // Deferred to a macrotask on purpose: when `defaultState` changes, Formik's
  // `enableReinitialize` resets the form (new values, cleared errors) in an effect that
  // schedules its own re-render. Validating synchronously here would run against the STALE
  // pre-reset (empty) values, and its async result would then overwrite the reset's cleared
  // errors — leaving every required field flagged and the Continue button wrongly disabled
  // until some later re-validation. `setTimeout(0)` lets the reset commit first, so we
  // validate the actual loaded data. (This was the "edit form is frozen until you click
  // Step 2" bug.)
  useEffect(() => {
    const id = window.setTimeout(() => formikRef.current?.validateForm(), 0);
    return () => window.clearTimeout(id);
  }, [activeStepIndex, defaultState]);

  const addFileToState = (documentId: string, file: File) => {
    setFiles((prev: any) => ({ ...prev, [documentId]: file }));

    if (documentId === "userProfilePicture") {
      if (profilePhotoPreviewRef.current) URL.revokeObjectURL(profilePhotoPreviewRef.current);
      const previewUrl = URL.createObjectURL(file);
      profilePhotoPreviewRef.current = previewUrl;
      setMobileProfilePhotoPreview(previewUrl);
    }
  };

  // Drop a pending upload so a removed file is not re-uploaded on save.
  const removeFileFromState = (documentId: string) => {
    setFiles((prev: any) => {
      const next = { ...prev };
      delete next[documentId];
      return next;
    });

    if (documentId === "userProfilePicture") {
      if (profilePhotoPreviewRef.current) {
        URL.revokeObjectURL(profilePhotoPreviewRef.current);
        profilePhotoPreviewRef.current = "";
      }
      setMobileProfilePhotoPreview("");
    }
  };

  useEffect(() => {
    return () => {
      if (profilePhotoPreviewRef.current) URL.revokeObjectURL(profilePhotoPreviewRef.current);
    };
  }, []);

  useEffect(() => {
    if (activeStepIndex > 1 && !sidebarProfileHasAppeared) {
      setSidebarProfileHasAppeared(true);
      setSidebarProfileShouldAnimate(true);
      const timer = window.setTimeout(() => setSidebarProfileShouldAnimate(false), 400);
      return () => window.clearTimeout(timer);
    }
  }, [activeStepIndex, sidebarProfileHasAppeared]);

  const addEducationFileToState = (index: number, file: File | null) => {
    setEducationFiles((prev: any) => {
      const next = { ...prev };
      if (file) next[String(index)] = file; else delete next[String(index)];
      return next;
    });
  };

  const uploadEducationDocuments = async (values: any, userId: string) => {
    const entries = Object.entries(educationFiles);
    if (!entries.length) return;
    await Promise.all(entries.map(async ([indexKey, fileData]) => {
      const index = Number(indexKey);
      const education = values.educationalInfo?.[index];
      if (!education || education.filePath) return;
      const formData = new FormData();
      const employeeName = `${values.firstName || "employee"}-${values.lastName || "education"}`;
      const fileExtension = (fileData as File).name.split(".").pop();
      const fileName = `${employeeName.toLowerCase().replace(/\s+/g, "")}-education-${index + 1}.${fileExtension}`;
      formData.append("file", new File([fileData as File], fileName, { type: (fileData as File).type }));
      const response = await uploadUserAsset(formData, userId, fileName, "education-docs");
      values.educationalInfo[index] = { ...education, filePath: response.data.path, fileName: (fileData as File).name };
    }));
  };

  const loadStepper = () => {
    const createdStepper = StepperComponent.createInsance(stepperRef.current as HTMLDivElement);
    if (!createdStepper) return;
    setStepper(createdStepper);
    setActiveStepIndex(createdStepper.currentStepIndex);
  };

  const scrollWizardToTop = () => {
    window.requestAnimationFrame(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      stepperRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  // Section-aware Back: within a step, Back walks to the PREVIOUS SECTION first (mirroring how
  // Continue walks forward section-by-section) and only drops to the previous top-level step
  // once there's no earlier section left in the current one — otherwise Back from e.g. Hiring
  // Info inside "Company Details" jumped straight to "Personal Details" instead of Contact Info.
  const prevStep = () => {
    const currentStepSections = STEP_SECTIONS[activeStepIndex] ?? [];
    const sectionIdx = currentStepSections.indexOf(activeSection);
    if (sectionIdx > 0) {
      changeSection(currentStepSections[sectionIdx - 1]);
      scrollWizardToTop();
      return;
    }

    if (activeStepIndex <= 1) return;
    let targetStep: number;
    if (stepper) {
      stepper.goPrev();
      targetStep = stepper.currentStepIndex;
    } else {
      targetStep = activeStepIndex - 1;
    }
    setActiveStepIndex(targetStep);
    setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
    // Land on the target step's LAST section, so Back lands exactly where Continue would have
    // come from.
    const targetSections = STEP_SECTIONS[targetStep] ?? ["personal-info"];
    changeSection(targetSections[targetSections.length - 1]);
    scrollWizardToTop();
  };

  // Advance to the next top-level step WITHOUT going through Formik's validation gate — used by
  // the edit-mode Continue buttons, where an existing record may legitimately not satisfy
  // newly-added requirements and must not be trapped on a step. New-employee onboarding keeps the
  // validation-gated `type="submit"` path so it stays strictly guided.
  const advanceToNextStep = () => {
    let targetStep: number;
    if (stepper) {
      stepper.goNext();
      targetStep = stepper.currentStepIndex;
    } else {
      targetStep = activeStepIndex + 1;
    }
    setActiveStepIndex(targetStep);
    setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
    setActiveSection((STEP_SECTIONS[targetStep] ?? ["personal-info"])[0]);
    formikRef.current?.setTouched({});
    scrollWizardToTop();
  };

  const updateWizardData = async (values: any) => {
    const { data: { companyOverview } } = await fetchCompanyOverview();
    const companyId = values.subOrganizationId || values.organizationId || (resolveActiveOrgId(companyOverview) ?? '');
    const {
      userId, firstName, lastName, dateOfBirth, appRole,
      personalPhoneNumber, personalEmailId, alternatePhoneNumber,
      personalPhoneNumberExtension, isEmployeeActive, bloodGroup,
      hobbies, notes, linkedInProfileUrl, instagramProfileUrl, facebookProfileUrl,
    } = values;

    const documentPromise = Object.keys(files).map(async (docId) => {
      const fileData = files[docId];
      const formData = new FormData();
      formData.append("file", fileData);
      const docField = values.documentFields?.find((f: any) => f.id === docId);
      const fieldName = docField?.fieldName || docId;
      const baseName = fieldName.toLowerCase().replace(/\s+/g, "-");
      const extension = fileData.name.split(".").pop();
      const fileName = extension ? `${baseName}.${extension}` : baseName;
      const response = await uploadUserAsset(formData, userId, fileName, "onboarding-docs");
      return { documentId: docId, path: response.data.path, fileName };
    });

    const documentInfo = values.documentInfo;
    const documentUploaded = await Promise.all(documentPromise);
    const filteredDocs = documentUploaded.filter((doc: any) => doc.documentId !== "userProfilePicture");
    documentUploaded.forEach((doc: any) => doc.documentId === "userProfilePicture" ? (values.avatar = doc.path) : null);

    values.documentInfo = documentInfo.map((docInfo: any) => {
      const uploadedFile = filteredDocs.find((d: any) => d.documentId === docInfo.documentId);
      return { ...docInfo, ...(uploadedFile && { path: uploadedFile.path, fileName: uploadedFile.fileName }) };
    });

    await uploadEducationDocuments(values, userId);

    let vegMealPreference, nonVegMealPreference, veganMealPreference;

    const userPayload = {
      firstName, lastName, isActive: isEmployeeActive === "1",
      isAdmin: values.isAdmin === "1",
      ...(dateOfBirth && { dateOfBirth }),
      ...(personalPhoneNumber && { personalPhoneNumber }),
      ...(personalEmailId && { personalEmailId }),
      ...(personalPhoneNumberExtension && { personalPhoneNumberExtension }),
      ...(alternatePhoneNumber && { alternatePhoneNumber }),
      ...(bloodGroup && { bloodGroup }),
      ...(hobbies && { hobbies }),
      ...(notes && { notes }),
      ...(linkedInProfileUrl && { linkedInProfileUrl }),
      ...(instagramProfileUrl && { instagramProfileUrl }),
      ...(facebookProfileUrl && { facebookProfileUrl }),
    };

    const {
      employeeId, dateOfJoining, ctcInLpa, gender, designationId, branchId, dateOfExit,
      employeeTypeId, employeeTypeConfigId, maritalStatus, sourceOfHireId, workingMethodId,
      departmentId, companyEmailId, referredById, method, nickName, employeeCode,
      companyPhoneNumber, companyPhoneExtension, employeeStatusId, employeeStatusConfigId,
      avatar, meal, anniversary, reportsToId,
      allowOverTime, professionalFeesEnabled, professionalFeesAmount,
      professionalFeesPercentage, professionalFeesType, isAdmin, rejoinHistory, teamId,
      roomOrBlock, shift, experienceLevel, employeeLevelId, isHiddenFromStaff: isHiddenFromStaffEdit,
      tds2Enabled, tds2Type, tds2Amount, tds2Percentage,
      retentionEnabled, retentionType, retentionAmount,
      retentionPercentage, retentionStartDate, retentionEndDate,
      reimbursementLimitPerRequest: reimbLimitEdit,
    } = values;

    let { aadharCardPath, panCardPath, aadharNumber, panNumber } = values;

    if (appRole) {
      try { await updateEmployeeRolesById(employeeId, { roleIds: [appRole] }); }
      catch (error) { console.log("Error while updating employee roles", error); }
    }

    const aadharDocumentId = values?.documentFields?.find(
      (doc: any) => doc?.fieldName?.toLowerCase().trim().replace(" ", "") === "aadharcard"
    )?.id;
    const panDocumentId = values?.documentFields?.find(
      (doc: any) => doc?.fieldName?.toLowerCase().trim().replace(" ", "") === "pancard"
    )?.id;

    if (documentInfo?.findIndex((doc: any) => doc?.documentId === aadharDocumentId) !== -1) {
      const r = documentInfo?.filter((doc: any) => doc?.documentId === aadharDocumentId)
        ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      aadharCardPath = r?.path; aadharNumber = r?.identityNumber;
      if (r?.id && r?.identityNumber && r?.path) await updateDocumentDetails(r.id, { ...r, identityNumber: aadharNumber });
    }

    if (documentInfo?.findIndex((doc: any) => doc?.documentId === panDocumentId) !== -1) {
      const r = documentInfo?.filter((doc: any) => doc?.documentId === panDocumentId)
        ?.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      panCardPath = r?.path; panNumber = r?.identityNumber;
      if (r?.id && r?.identityNumber && r?.path) await updateDocumentDetails(r.id, { ...r, identityNumber: panNumber });
    }

    if (meal === "0") vegMealPreference = true;
    if (meal === "1") nonVegMealPreference = true;
    if (meal === "2") veganMealPreference = true;

    const employeePayload: any = {
      // Always send avatar (even when empty) so removing the photo persists —
      // a guarded `...(avatar && {avatar})` would silently keep the old image.
      avatar: avatar || "", id: employeeId, userId, dateOfJoining, ctcInLpa,
      gender: parseInt(gender), designationId, branchId,
      isActive: isEmployeeActive === "1",
      ...(employeeTypeId && { employeeTypeId }),
      ...(employeeTypeConfigId && { employeeTypeConfigId }),
      maritalStatus: parseInt(maritalStatus), reportsToId, sourceOfHireId,
      workingMethodId, departmentId, companyEmailId,
      ...(employeeStatusId && { employeeStatusId }),
      ...(employeeStatusConfigId && { employeeStatusConfigId }),
      companyId, method: parseInt(method), companyPhoneNumber, companyPhoneExtension, employeeCode,
      ...(isAdmin && { isAdmin: isAdmin === "1" }),
      ...(allowOverTime && { allowOverTime }),
      ...(aadharNumber && { aadharNumber }), ...(aadharCardPath && { aadharCardPath }),
      ...(panNumber && { panNumber }), ...(panCardPath && { panCardPath }),
      ...(anniversary && { anniversary }), ...(referredById && { referredById }),
      ...(nickName && { nickName }), ...(dateOfExit && { dateOfExit }),
      ...(vegMealPreference && { vegMealPreference }),
      ...(nonVegMealPreference && { nonVegMealPreference }),
      ...(veganMealPreference && { veganMealPreference }),
      ...(teamId && { teamId }), ...(roomOrBlock && { roomOrBlock }),
      ...(shift && { shift }), ...(experienceLevel && { experienceLevel }),
      ...(employeeLevelId && { employeeLevelId }),
      // Leave Settings section removed — no longer needed
      // ...(Array.isArray(values.leaveAllocations) && { leaveAllocations: values.leaveAllocations }),
      ...buildProfessionalFeesPayload({ professionalFeesEnabled, professionalFeesAmount, professionalFeesPercentage, professionalFeesType }),
      ...buildTds2Payload({ tds2Enabled, tds2Type, tds2Amount, tds2Percentage }),
      ...buildRetentionPayload({ retentionEnabled, retentionType, retentionAmount, retentionPercentage, retentionStartDate, retentionEndDate, dateOfJoining }),
      isHiddenFromStaff: isHiddenFromStaffEdit === true,
      reimbursementLimitPerRequest: (reimbLimitEdit !== "" && reimbLimitEdit != null && !isNaN(Number(reimbLimitEdit))) ? Number(reimbLimitEdit) : null,
    };

    Object.keys(employeePayload).forEach((key) => {
      if (key === "gender" || key === "maritalStatus" || key === "isHiddenFromStaff" || key === "reimbursementLimitPerRequest" || PROF_FEES_KEYS.has(key) || TDS2_KEYS.has(key) || RETENTION_KEYS.has(key)) return;
      if (!employeePayload[key] && employeePayload[key] !== 0 && employeePayload[key] !== false) delete employeePayload[key];
    });
    if (!employeePayload.employeeTypeConfigId) delete employeePayload.employeeTypeConfigId;
    if (!employeePayload.employeeStatusConfigId) delete employeePayload.employeeStatusConfigId;

    const reqPromise = [
      () => updateUser(userId, userPayload),
      () => updateEmployee(employeeId, employeePayload),
    ];

    const { workExpInfo, bankInfo, educationalInfo, familyInfo, addressInfo, emergencyDetails } = values;

    const addrPayload = addressInfo.permanentAddressLine1 === addressInfo.presentAddressLine1
      ? { ...addressInfo, presentAddressLine1: undefined, presentAddressLine2: undefined, presentCountry: undefined, presentState: undefined, presentCity: undefined, presentPostalCode: undefined }
      : addressInfo;
    reqPromise.push(() => addressInfo?.id ? updateAddressDetails(addressInfo.id, addrPayload) : createAddressDetails({ ...addrPayload, employeeId }));

    workExpInfo.filter((w: any) => w?.id || hasWorkExpInfo(w)).forEach((w: any) =>
      reqPromise.push(() => w?.id ? updatePreviousExpDetails(w.id, w) : createPreviousExperienceDetails([{ ...(w.companyName && { companyName: w.companyName }), ...(w.jobTitle && { jobTitle: w.jobTitle }), ...(w.fromDate && { fromDate: w.fromDate }), ...(w.toDate && { toDate: w.toDate }), employeeId }])));

    getActiveEducationRows(educationalInfo).forEach((e: any) =>
      reqPromise.push(() => e?.id ? updateEducationalDetails(e.id, buildEducationPayload(e)) : createEducationalDetails([buildEducationPayload(e, employeeId)].filter(Boolean))));

    familyInfo.filter((f: any) => f?.id || hasFamilyInfo(f)).forEach((f: any) =>
      reqPromise.push(() => f?.id ? updateEmergencyContact(f.id, f) : createEmergencyContacts([{ ...(f.name && { name: f.name }), ...(f.mobileNumber && { mobileNumber: f.mobileNumber }), ...(f.dateOfBirth && { dateOfBirth: f.dateOfBirth }), ...(f.relationship && { relation: f.relationship }), employeeId }])));

    const filteredRejoinHistory = rejoinHistory?.filter((r: any) => r.dateOfReJoining || r.dateOfReExit || r.reason);
    await deleteAllRejoinHistoryByEmployeeId(employeeId);
    if (filteredRejoinHistory.length > 0) {
      await createRejoinHistoryDetails(filteredRejoinHistory.map((r: any) => ({
        ...(r.dateOfReJoining && { dateOfReJoining: r.dateOfReJoining }),
        ...(r.dateOfReExit && { dateOfReExit: r.dateOfReExit }),
        ...(r.reason && { reason: r.reason }),
        employeeId,
      })));
    }

    reqPromise.push(() => bankInfo?.id
      ? updateBankDetails(bankInfo.id, bankInfo)
      : createBankDetails({ ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }), ...(bankInfo.accountName && { accountName: bankInfo.accountName }), ...(bankInfo.bankName && { bankName: bankInfo.bankName }), ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }), ...(bankInfo.filePath && { filePath: bankInfo.filePath }), employeeId }));

    reqPromise.push(() => emergencyDetails?.id
      ? updateEmergencyDetails(emergencyDetails.id, emergencyDetails)
      : createEmergencyDetails({ ...(emergencyDetails.bloodGroup && { bloodGroup: emergencyDetails.bloodGroup }), ...(emergencyDetails.allergies && { allergies: emergencyDetails.allergies }), ...(emergencyDetails.emergencyContactName && { emergencyContactName: emergencyDetails.emergencyContactName }), ...(emergencyDetails.emergencyContactNumber && { emergencyContactNumber: emergencyDetails.emergencyContactNumber }), employeeId }));

    values.documentInfo.forEach((docInfo: any) =>
      reqPromise.push(() => docInfo?.id ? updateDocumentDetails(docInfo?.id, { ...docInfo, employeeId }) : createDocumentsDetails([{ ...docInfo, employeeId }])));

    try {
      await Promise.all(reqPromise.map((fn) => fn()));
      await successConfirmation("Employee data updated successfully.");
      navigate("/employees");
    } catch (error: any) {
      let errMessage = "Something went wrong. Please try again with required fields filled with correct values.";
      if (error.response?.data) {
        const { status, data } = error.response;
        if (status === 400 && data.detail) errMessage = data.detail;
        else if (status === 400 && data.message) errMessage = data.message;
        else if (data.error) errMessage = data.error;
        else if (status === 500 && data.detail?.includes("users_alternate_phone_number_key")) errMessage = "AlternatePhoneNumber already exists.";
        else if (status === 500 && data.detail?.includes("employees_company_email_id_key")) errMessage = "Company Email Id already exists.";
        else if (status === 500 && data.detail?.includes("users_personal_phone_number_key")) errMessage = "PersonalPhoneNumber already exists.";
      }
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.validationError || [];
        const formattedErrors = validationErrors.map((e: any) => `• ${e.errors.join(", ")}`).join("<br>");
        if (formattedErrors.length > 0) { errorConfirmation(`Please fill all required fields:<br><br>${formattedErrors}`); return; }
      }
      errorConfirmation(errMessage);
    }
  };

  // Approval Settings is mandatory before an edit can be saved: every workflow
  // (Attendance, Leave, Reimbursement) must have at least a Level-1 approver.
  // Verified against the backend so it doesn't depend on the section being open.
  const REQUIRED_APPROVAL_WORKFLOWS = [
    { key: "attendance", label: "Attendance" },
    { key: "leave", label: "Leave" },
    { key: "reimbursement", label: "Reimbursement" },
  ];
  const getMissingApprovalWorkflows = async (): Promise<string[]> => {
    if (!employeeId) return [];
    try {
      const res = await fetchApprovalWorkflowConfigs(employeeId);
      const configs: any[] = res?.data || res || [];
      return REQUIRED_APPROVAL_WORKFLOWS
        .filter(({ key }) => !configs.some((c: any) =>
          c?.workflowType === key && Number(c?.level) === 1 && c?.isActive && c?.approverId))
        .map(({ label }) => label);
    } catch (error) {
      // Don't hard-block a save on a transient fetch failure.
      console.error("Failed to verify approval settings:", error);
      return [];
    }
  };

  const submitStep = async (values: any, actions: FormikValues) => {
    const currentStepIndex = stepper?.currentStepIndex || activeStepIndex;
    const totalStepsNumber = stepper?.totalStepsNumber || newEmployeeWizardSchema.length;

    if (currentStepIndex === totalStepsNumber && editMode) {
      const missingApproval = await getMissingApprovalWorkflows();
      if (missingApproval.length) {
        errorConfirmation(
          `Please configure Approval Settings before saving.<br><br>Missing a Level 1 approver for: <strong>${missingApproval.join(", ")}</strong>.<br>Open the App Settings step → Approval Settings and save each chain.`
        );
        return;
      }
      try { setIsSubmitting(true); await updateWizardData(values); }
      catch (error) {
        // Never fail silently — surface the reason so the user knows what went wrong
        // (e.g. a half-filled row the backend rejected) instead of a dead-end submit.
        console.error("Update wizard error:", error);
        await handleSubmissionError(error);
      }
      finally { setIsSubmitting(false); }
      return;
    }

    if (currentStepIndex !== totalStepsNumber) {
      let targetStep: number;
      if (stepper) {
        stepper.goNext();
        targetStep = stepper.currentStepIndex;
      } else {
        targetStep = currentStepIndex + 1;
      }
      setActiveStepIndex(targetStep);
      setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
      // Open the new step at its OWN first section (activeSection is shared across steps).
      setActiveSection((STEP_SECTIONS[targetStep] ?? ["personal-info"])[0]);
      actions.setTouched({});
      scrollWizardToTop();
    } else {
      let savedUserId: string | null = null;
      try {
        setIsSubmitting(true);
        savedUserId = await saveNewUser(values);
        if (!savedUserId) { if (typeof savedUserId === "boolean") return; throw new Error("Failed to save user"); }

        const documentPromises = Object.keys(files).map(async (docId) => {
          const fileData = files[docId];
          const formData = new FormData();
          formData.append("file", fileData);
          try {
            const docField = values.documentFields?.find((f: any) => f.id === docId);
            const fieldName = docField?.fieldName || docId;
            const baseName = fieldName.toLowerCase().replace(/\s+/g, "-");
            const extension = fileData.name.split(".").pop();
            const fileName = extension ? `${baseName}.${extension}` : baseName;
            const response = await uploadUserAsset(formData, savedUserId!, fileName, "onboarding-docs");
            return { documentId: docId, path: response.data.path, fileName };
          } catch (uploadError) { throw new Error(`Failed to upload document: ${fileData.name}`); }
        });

        const documentUploaded = await Promise.all(documentPromises);
        const filteredDocs = documentUploaded.filter((doc) => doc.documentId !== "userProfilePicture");
        const profilePicture = documentUploaded.find((doc) => doc.documentId === "userProfilePicture");
        if (profilePicture) values.avatar = profilePicture.path;

        values.documentInfo = (values.documentInfo || []).map((docInfo: any) => {
          const uploadedFile = filteredDocs.find((doc) => doc.documentId === docInfo.documentId);
          return { ...docInfo, ...(uploadedFile && { path: uploadedFile.path, fileName: uploadedFile.fileName }) };
        });

        await uploadEducationDocuments(values, savedUserId);
        const savedEmployeeId = await saveNewEmployee(values, savedUserId);
        if (!savedEmployeeId) throw new Error("Failed to save employee data");

        if (values.appRole) {
          try { await updateEmployeeRolesById(savedEmployeeId, { roleIds: [values.appRole] }); }
          catch (roleError) { console.error("Error while updating employee roles:", roleError); }
        }

        await saveEmployeeData(values, savedEmployeeId);
        successConfirmation("Successfully onboarded an employee");
        clearDraft();
        stepper?.goto(1);
        setActiveStepIndex(1);
        setActiveSection("personal-info");
        setCurrentSchema(newEmployeeWizardSchema[0]);
        actions.resetForm();
      } catch (error) {
        console.error("Submission error:", error);
        if (savedUserId) {
          try { await archiveUser(savedUserId, { status: "archived" }); }
          catch (archiveError) { console.error("Failed to archive user during cleanup:", archiveError); }
        }
        await handleSubmissionError(error);
      } finally { setIsSubmitting(false); }
    }

    setCurrentSchema(newEmployeeWizardSchema[(stepper?.currentStepIndex || activeStepIndex) - 1]);
  };

  const handleSubmissionError = async (error: any) => {
    try {
      if (error?.response?.status === 422) {
        const validationErrors = error.response?.data?.validationError || [];
        const importantFields = ["firstName","lastName","personalEmailId","personalPhoneNumber","dateOfBirth","gender","dateOfJoining","departmentId","branchId","employeeTypeId","companyEmailId"];
        const filteredErrors = validationErrors.filter((e: any) => importantFields.includes(e.field)).map((e: any) => `• ${e.errors.join(" ")}`).join("\n\n");
        if (filteredErrors.length > 0) { errorConfirmation(filteredErrors.replace(/\n/g, "<br>")); return; }
        else { errorConfirmation("No specific validation errors found, but the request failed. Please try again."); return; }
      }
      const responseData = error?.response?.data || {};
      const errorMessage = responseData.detail || responseData.message || responseData.error || responseData.errors?.map((e: string) => `• ${e}`).join("\n") || error?.response?.statusText || "An unknown error occurred.";
      errorConfirmation(errorMessage.replace(/\n/g, "<br>"));
    } catch {
      const fallback = error instanceof Error ? `Error during submission: ${error.message}` : typeof error === "string" ? `Error during submission: ${error}` : "An unexpected error occurred during submission.";
      errorConfirmation(fallback);
    }
    if (!error?.response) errorConfirmation("A network error occurred. Please check your internet connection and try again.");
  };

  useEffect(() => {
    if (!stepperRef.current) return;
    loadStepper();
  }, [stepperRef]);

  useEffect(() => {
    setCurrentSchema(newEmployeeWizardSchema[activeStepIndex - 1]);
  }, [activeStepIndex]);

  // Sidebar nav click handler
  useEffect(() => {
    if (!stepper || !stepperRef.current) return;
    const navItems = Array.from(stepperRef.current.querySelectorAll('[data-kt-stepper-element="nav"]')) as HTMLElement[];
    const handlers: Array<(e: Event) => void> = [];

    navItems.forEach((item, index) => {
      const targetStep = index + 1;
      const handler = (e: Event) => {
        const currentIndex = stepper.currentStepIndex;
        if (targetStep === currentIndex) { e.stopImmediatePropagation(); return; }
        if (targetStep < currentIndex) {
          e.stopImmediatePropagation();
          stepper.goto(targetStep);
          setActiveStepIndex(targetStep);
          setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
          setActiveSection((STEP_SECTIONS[targetStep] ?? ["personal-info"])[0]);
          scrollWizardToTop(); return;
        }
        e.stopImmediatePropagation();
        if (!formikRef.current) return;
        formikRef.current.validateForm().then((errors: any) => {
          if (Object.keys(errors).length === 0) {
            stepper.goto(targetStep);
            setActiveStepIndex(targetStep);
            setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
            // Also land on the new step's first section immediately (the backward-jump branch
            // above already does this). Without it, activeSection stays on the previous step's
            // section for a frame, which is exactly the out-of-sync state that made Continue
            // behave like a step-submit and skip sections.
            setActiveSection((STEP_SECTIONS[targetStep] ?? ["personal-info"])[0]);
            scrollWizardToTop();
          } else {
            const touchedObj: Record<string, boolean> = {};
            const flatten = (obj: any, prefix = "") => {
              for (const key of Object.keys(obj)) {
                const path = prefix ? `${prefix}.${key}` : key;
                if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) flatten(obj[key], path);
                else touchedObj[path] = true;
              }
            };
            flatten(errors);
            formikRef.current.setTouched(touchedObj, false);
          }
        });
      };
      item.addEventListener("click", handler, { capture: true });
      handlers.push(handler);
    });

    return () => { navItems.forEach((item, idx) => item.removeEventListener("click", handlers[idx], { capture: true })); };
  }, [stepper]);

  // Edit mode data load
  useEffect(() => {
    if (!editMode) return;
    async function wizard() {
      if (!employeeId) return;
      const { data: { wizardData } } = await fetchWizardData(employeeId, false);

      let presentAddress = {};
      const { allowOverTime } = wizardData;
      const isSameAddress = wizardData.addressInfo?.presentAddressLine1 === null;
      if (isSameAddress) {
        const { permanentAddressLine1, permanentAddressLine2, permanentCountry, permanentState, permanentCity, permanentPostalCode } = wizardData.addressInfo;
        presentAddress = { presentAddressLine1: permanentAddressLine1, presentAddressLine2: permanentAddressLine2, presentCountry: permanentCountry, presentState: permanentState, presentCity: permanentCity, presentPostalCode: permanentPostalCode };
      }

      const newState = {
        ...initialState, ...wizardData, method: "0",
        educationalInfo: withDefaultEducationInfo(wizardData?.educationalInfo),
        familyInfo: withDefaultFamilyInfo(wizardData?.familyInfo),
        workExpInfo: withDefaultWorkExpInfo(wizardData?.workExpInfo),
        addressInfo: { ...wizardData.addressInfo, ...presentAddress },
        emergencyDetails: wizardData?.emergencyDetails || { bloodGroup: "", allergies: "", emergencyContactName: "", emergencyContactNumber: "" },
        appRole: wizardData?.roles[0]?.id,
        isEmployeeActive: wizardData?.isActive ? "1" : "0",
        isAdmin: wizardData?.isAdmin ? "1" : "0",
        allowOverTime,
        bloodGroup: wizardData?.users?.bloodGroup || wizardData?.bloodGroup || "",
        ...(wizardData?.employeeTypeConfigId && { employeeTypeConfigId: wizardData.employeeTypeConfigId }),
        ...(wizardData?.employeeStatusConfigId && { employeeStatusConfigId: wizardData.employeeStatusConfigId }),
        teamId: wizardData?.teamId || "", roomOrBlock: wizardData?.roomOrBlock || "",
        shift: wizardData?.shift || "", experienceLevel: wizardData?.experienceLevel || "",
        employeeLevelId: wizardData?.employeeLevelId || "",
        linkedInProfileUrl: wizardData?.users?.linkedInProfileUrl || "",
        instagramProfileUrl: wizardData?.users?.instagramProfileUrl || "",
        facebookProfileUrl: wizardData?.users?.facebookProfileUrl || "",
        hobbies: wizardData?.users?.hobbies || "", notes: wizardData?.users?.notes || "",
        isHiddenFromStaff: wizardData?.isHiddenFromStaff === true,
        professionalFeesEnabled: readProfessionalFeesEnabled(wizardData?.professionalFeesEnabled ?? (wizardData as any)?.professional_fees_enabled),
        professionalFeesAmount: (() => { const v = wizardData?.professionalFeesAmount ?? (wizardData as any)?.professional_fees_amount; return v != null && v !== "" ? String(v) : ""; })(),
        professionalFeesPercentage: (() => { const v = (wizardData as any)?.professionalFeesPercentage ?? (wizardData as any)?.professional_fees_percentage; return v != null && v !== "" ? String(v) : ""; })(),
        professionalFeesType: wizardData?.professionalFeesType || (wizardData as any)?.professional_fees_type || "FIXED",
        tds2Enabled: (() => { const v = (wizardData as any)?.tds2Enabled ?? (wizardData as any)?.tds2_enabled; return (v === true || v === 1 || v === '1' || v === 'true') ? "true" : "false"; })(),
        tds2Type: (wizardData as any)?.tds2Type || (wizardData as any)?.tds2_type || "FIXED",
        tds2Amount: (() => { const v = (wizardData as any)?.tds2Amount ?? (wizardData as any)?.tds2_amount; return v != null && v !== "" ? String(v) : ""; })(),
        tds2Percentage: (() => { const v = (wizardData as any)?.tds2Percentage ?? (wizardData as any)?.tds2_percentage; return v != null && v !== "" ? String(v) : ""; })(),
        retentionEnabled: (() => { const v = (wizardData as any)?.retentionEnabled; return (v === true || v === 1 || v === '1' || v === 'true') ? "true" : "false"; })(),
        retentionType: (wizardData as any)?.retentionType || "FIXED",
        retentionAmount: (() => { const v = (wizardData as any)?.retentionAmount; return v != null && v !== "" ? String(v) : ""; })(),
        retentionPercentage: (() => { const v = (wizardData as any)?.retentionPercentage; return v != null && v !== "" ? String(v) : ""; })(),
        // Dates arrive as ISO datetimes — keep only the date part for the pickers.
        retentionStartDate: (() => { const v = (wizardData as any)?.retentionStartDate; return v ? String(v).slice(0, 10) : ""; })(),
        retentionEndDate: (() => { const v = (wizardData as any)?.retentionEndDate; return v ? String(v).slice(0, 10) : ""; })(),
        reimbursementLimitPerRequest: wizardData?.reimbursementLimitPerRequest != null ? String(wizardData.reimbursementLimitPerRequest) : "",
      };
      setDefaultState(newState);
    }
    wizard();
  }, [employeeId, defaultState.method]);

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); formikRef.current?.submitForm(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleClose = () => { setShow(false); navigate("/employees"); };

  return (
    <>
      <Modal show={show} onHide={handleClose} dialogClassName="full-width-modal" className="full-width-modal">
        <Modal.Body ref={modalBodyRef} className="employee__form_wizard__modal_body ob-modal-body">
          <Formik
            initialValues={defaultState}
            validationSchema={currentSchema}
            onSubmit={submitStep}
            enableReinitialize={true}
          >
            {(formikProps) => {
              formikRef.current = formikProps;

              const completion = calculateProfileCompletion(formikProps.values);
              const isLastStep = activeStepIndex === newEmployeeWizardSchema.length;
              const headerEmployeeName = `${formikProps.values.firstName || ""} ${formikProps.values.lastName || ""}`.trim();
              const headerEmployeeAvatar = mobileProfilePhotoPreview || formikProps.values.avatar || "";
              const headerEmployeeInitials = getNameInitials(headerEmployeeName);
              const mobileRingSize = 40;
              const mobileRingRadius = 18;
              const mobileRingCircumference = 2 * Math.PI * mobileRingRadius;
              const mobileRingOffset = mobileRingCircumference * (1 - completion / 100);
              const sidebarProfile =
                activeStepIndex > 1 && (headerEmployeeName || headerEmployeeAvatar)
                  ? {
                    name: headerEmployeeName,
                    avatar: headerEmployeeAvatar,
                    initials: headerEmployeeInitials,
                    animate: sidebarProfileShouldAnimate,
                  }
                  : undefined;

              const stepSections = STEP_SECTIONS[activeStepIndex] ?? [];
              const sectionIdx = stepSections.indexOf(activeSection);
              // ONLY the genuine last section is "last". Previously `sectionIdx < 0` (activeSection
              // momentarily out of sync with the step's section list — e.g. right after a top-stepper
              // jump, before the snap effect re-aligns it) was ALSO treated as last, turning the
              // Continue button into a step-submit that skipped the remaining sections and jumped
              // straight to the next step (the "Privacy Controls is skipped → Documents opens" bug).
              const isLastSection = sectionIdx >= 0 && sectionIdx === stepSections.length - 1;

              // Which top-level field keys currently FAIL validation — computed SYNCHRONOUSLY from
              // the values on screen right now, via the step's own Yup schema (single source of
              // truth, so conditional/`.when` requirements like Financial Config are handled for
              // free). This deliberately does NOT read Formik's async `errors` object: that lags
              // behind reinitialize/reset and produced the "edit form is frozen until you touch
              // another step" bug. A pure sync function of (values, schema) can't race anything.
              const invalidKeys = computeInvalidKeys(currentSchema, formikProps.values);

              // Is the ACTIVE section (not the whole step) free of validation errors right now?
              // Drives both the CTA styling and — critically — whether "Continue" may move past
              // this section at all.
              const activeSectionKeys = SECTION_FIELD_KEYS[activeStepIndex]?.[activeSection] ?? [];
              const isStepReady = activeSectionKeys.every((key) => !invalidKeys.has(key));

              // Whole-step validity — every field of the CURRENT step is valid. Drives the
              // step-terminal Continue/Submit buttons.
              const isWholeStepValid = invalidKeys.size === 0;

              return (
                <Form className="ob-wizard-root" noValidate id="employee_onboarding_form">
                  <FormikValidationErrorFocus activeStepIndex={activeStepIndex} setActiveSection={setActiveSection} />
                  <DraftAutosave enabled={!editMode} />
                  <div ref={stepperRef} className="stepper stepper-pills d-flex flex-column flex-row-fluid" id="kt_create_account_stepper">

                    {/* ── Header Bar ── */}
                    <header className="ob-header-bar">
                      <div className="ob-header-left">
                        <h2 className="ob-header-title">Employee Onboarding</h2>
                        {editMode && defaultState.firstName && (
                          <span className="ob-header-user-chip">{defaultState.firstName} {defaultState.lastName}</span>
                        )}
                      </div>
                      <div className="ob-header-right">
                        <div className="ob-profile-completion">
                          <span className="ob-completion-label">{completion}% Complete</span>
                          <div className="ob-completion-bar-track">
                            <div className="ob-completion-bar-fill" style={{ width: `${completion}%` }} />
                          </div>
                        </div>
                        {(headerEmployeeName || headerEmployeeAvatar) && (
                          <span className="ob-header-mobile-profile" title={headerEmployeeName}>
                            <span className="ob-header-mobile-avatar" aria-hidden>
                              <svg
                                className="ob-header-mobile-ring"
                                width={mobileRingSize}
                                height={mobileRingSize}
                                viewBox={`0 0 ${mobileRingSize} ${mobileRingSize}`}
                              >
                                <circle
                                  className="ob-header-mobile-ring-track"
                                  cx={mobileRingSize / 2}
                                  cy={mobileRingSize / 2}
                                  r={mobileRingRadius}
                                />
                                <circle
                                  key={`${activeStepIndex}-${completion}`}
                                  className="ob-header-mobile-ring-progress"
                                  cx={mobileRingSize / 2}
                                  cy={mobileRingSize / 2}
                                  r={mobileRingRadius}
                                  style={{
                                    "--ring-circumference": mobileRingCircumference,
                                    "--ring-offset": mobileRingOffset,
                                  } as any}
                                />
                              </svg>
                              <span className="ob-header-mobile-avatar-inner">
                              {headerEmployeeAvatar ? (
                                <img src={headerEmployeeAvatar} alt="" />
                              ) : (
                                headerEmployeeInitials
                              )}
                              </span>
                            </span>
                            <span className="ob-header-mobile-copy">
                              <span className="ob-header-mobile-name">{headerEmployeeName}</span>
                              <span className="ob-header-mobile-percent">{completion}%</span>
                            </span>
                          </span>
                        )}
                      </div>
                    </header>

                    {/* ── Stepper Nav ── */}
                    <nav className="ob-stepper-nav-bar">
                      <div className="ob-horiz-stepper">
                        {[
                          { label: "Personal Details", desc: "~2 min" },
                          { label: "Company Details", desc: "~3 min" },
                          { label: "App Settings", desc: "~2 min" },
                          { label: "Documents", desc: "~1 min" },
                        ].map((step, i) => {
                          const stepNum = i + 1;
                          const isCurrent = activeStepIndex === stepNum;
                          const isCompleted = activeStepIndex > stepNum;
                          return (
                            <Fragment key={stepNum}>
                              <div
                                className={`stepper-item ob-step-item ${isCurrent ? "current" : ""} ${isCompleted ? "completed" : ""}`}
                                data-kt-stepper-element="nav"
                              >
                                <div className="ob-step-circle">
                                  {isCompleted ? <KTIcon iconName="check" className="fs-6 text-white" /> : stepNum}
                                </div>
                                <div className="ob-step-labels">
                                  <div className="ob-step-name">{step.label}</div>
                                  <div className="ob-step-desc">{step.desc}</div>
                                </div>
                              </div>
                              {i < 3 && (
                                <div className={`ob-step-connector ${isCompleted ? "completed" : ""}`} />
                              )}
                            </Fragment>
                          );
                        })}
                      </div>
                    </nav>

                    {/* ── Draft-restored notice (create mode only) ── */}
                    {!editMode && showDraftNotice && (
                      <div className="ob-draft-notice" role="status">
                        <i className="bi bi-clock-history ob-draft-notice-icon" aria-hidden></i>
                        <span className="ob-draft-notice-text">
                          Restored your unsaved draft — pick up where you left off.
                          <span className="ob-draft-notice-sub"> Uploaded files aren't saved and may need re-attaching.</span>
                        </span>
                        <button type="button" className="ob-draft-notice-discard" onClick={discardDraft}>
                          Discard &amp; start fresh
                        </button>
                        <button
                          type="button"
                          className="ob-draft-notice-close"
                          aria-label="Dismiss"
                          onClick={() => setShowDraftNotice(false)}
                        >
                          <KTIcon iconName="cross" className="fs-5" />
                        </button>
                      </div>
                    )}

                    {/* ── Main Content ── */}
                    <main className="ob-main-layout">
                      <div key={activeStepIndex} className="wizard-step-transition">

                        {/* STEP 1 */}
                        {activeStepIndex === 1 && (
                          <div className="ob-two-col-layout">
                            <ObSectionsSidebar
                              sections={[
                                ...NAV_SECTIONS.map((section) => {
                                  const { filled, total } =
                                    COMPLETION_FNS[section.id]?.(formikProps.values) ?? { filled: 0, total: 0 };
                                  return {
                                    id: section.id,
                                    label: section.label,
                                    icon: section.icon,
                                    // A section earns its green tick only when it is both filled AND
                                    // schema-valid — so a filled-but-invalid field (e.g. a 5-digit
                                    // phone) never shows a tick while its border is red.
                                    isComplete: total > 0 && filled >= total && isSectionValid(section.id, invalidKeys),
                                  };
                                }),
                                (() => {
                                  const { filled, total } =
                                    COMPLETION_FNS.meal?.(formikProps.values) ?? { filled: 0, total: 0 };
                                  return {
                                    id: "meal",
                                    label: "Additional Details",
                                    icon: (
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 8v4l3 3" />
                                      </svg>
                                    ),
                                    isComplete: total > 0 && filled >= total && isSectionValid("meal", invalidKeys),
                                  };
                                })(),
                              ]}
                              activeSection={activeSection}
                              onSectionChange={changeSection}
                            />
                            <div className="ob-form-area">
                              <Step2
                                formikProps={formikProps}
                                setFile={addFileToState}
                                removeFile={removeFileFromState}
                                setEducationFile={addEducationFileToState}
                                activeSection={activeSection}
                                onSectionChange={changeSection}
                                completion={completion}
                                activeSectionValid={isStepReady}
                              />
                            </div>
                          </div>
                        )}

                        {activeStepIndex === 2 && <Step3 formikProps={formikProps} editMode={editMode} sidebarProfile={sidebarProfile} activeSection={activeSection} onSectionChange={changeSection} />}
                        {activeStepIndex === 3 && <StepAppSettings formikProps={formikProps} editMode={editMode} sidebarProfile={sidebarProfile} activeSection={activeSection} onSectionChange={changeSection} />}
                        {activeStepIndex === 4 && <Step4 formikProps={formikProps} setFile={addFileToState} sidebarProfile={sidebarProfile} activeSection={activeSection} onSectionChange={changeSection} />}
                      </div>
                    </main>

                    {/* ── Floating Action Buttons ── */}
                    <div className="ob-floating-actions">
                      {/* Cancel */}
                      <button type="button" className="ob-float-cancel-btn" onClick={handleClose}>
                        <KTIcon iconName="cross" className="fs-5" />
                        Cancel
                      </button>

                      {/* Back (hidden on step 1) */}
                      {activeStepIndex > 1 && (
                        <button type="button" className="ob-float-back-btn" onClick={prevStep} disabled={isSubmitting}>
                          <KTIcon iconName="arrow-left" className="fs-5" />
                          Back
                        </button>
                      )}

                      {/* Continue / Submit — walks the current step's left-hand sections first,
                          and only advances to the next top step from the LAST section. Applies to
                          every step, so the button behaves consistently throughout the wizard. */}
                      {(() => {
                        // Not on the last section of this step → advance to the next section only
                        // once this section's required fields are valid. If not, the click REVEALS
                        // the red errors (this is the "trying to move" moment) and stays put. The
                        // button is greyed (is-incomplete) as a hint but stays clickable, so the
                        // click can surface what's missing — a fresh, untouched form shows no red.
                        if (!isLastSection) {
                          return (
                            <button
                              type="button"
                              className={`ob-float-continue-btn ${isStepReady ? "is-ready" : "is-incomplete"}`}
                              disabled={isSubmitting}
                              onClick={() => {
                                if (!isStepReady) { revealSectionErrors(activeSection); return; }
                                changeSection(stepSections[sectionIdx + 1]);
                                scrollWizardToTop();
                              }}
                            >
                              Continue
                              <KTIcon iconName="arrow-right" className="fs-5" />
                            </button>
                          );
                        }

                        // Last section of step 1 → validate the step, then go to Company Details.
                        // Clickable even when incomplete: an incomplete click runs submitForm,
                        // which reveals the red errors and (via FormikValidationErrorFocus) jumps
                        // to the first missing field's section. Greyed as a hint until valid.
                        if (activeStepIndex === 1) {
                          return (
                            <button
                              type="button"
                              className={`ob-float-continue-btn ${isWholeStepValid ? "is-ready" : "is-incomplete"}`}
                              disabled={isSubmitting}
                              onClick={() => {
                                formikProps.validateForm().then((errors) => {
                                  if (Object.keys(errors).length === 0) advanceToNextStep();
                                  else formikProps.submitForm();
                                });
                              }}
                            >
                              Continue to {STEP_TITLES[activeStepIndex] ?? "Next"}
                              <KTIcon iconName="arrow-right" className="fs-5" />
                            </button>
                          );
                        }

                        // Last section of the final step → submit the whole form. Clickable when
                        // incomplete so the submit attempt reveals the missing fields.
                        if (isLastStep) {
                          return (
                            <button type="submit" className="ob-float-submit-btn" disabled={isSubmitting}>
                              {isSubmitting ? (
                                <>
                                  Saving...
                                  <span className="spinner-border spinner-border-sm align-middle ms-1" />
                                </>
                              ) : (
                                <>
                                  Submit
                                  <KTIcon iconName="check" className="fs-5" />
                                </>
                              )}
                            </button>
                          );
                        }

                        // Last section of steps 2/3 → submit, UNLESS a "must visit" section for this
                        // step (e.g. Leave Settings) hasn't been opened yet — send the user there
                        // first instead of letting them submit straight past it.
                        const unvisitedRequired = stepSections.find((id) => MUST_VISIT_SECTIONS.has(id) && !visitedSections.has(id));
                        if (unvisitedRequired) {
                          return (
                            <button
                              type="button"
                              className="ob-float-continue-btn is-incomplete"
                              disabled={isSubmitting}
                              onClick={() => {
                                changeSection(unvisitedRequired);
                                scrollWizardToTop();
                              }}
                            >
                              Review {unvisitedRequired.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}
                              <KTIcon iconName="arrow-right" className="fs-5" />
                            </button>
                          );
                        }

                        return (
                          <button
                            type="submit"
                            className={`ob-float-continue-btn ${isWholeStepValid ? "is-ready" : "is-incomplete"}`}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <>
                                Please wait...
                                <span className="spinner-border spinner-border-sm align-middle ms-1" />
                              </>
                            ) : (
                              <>
                                Continue to {STEP_TITLES[activeStepIndex] ?? "Next"}
                                <KTIcon iconName="arrow-right" className="fs-5" />
                              </>
                            )}
                          </button>
                        );
                      })()}

                      {/* <span className="ob-float-shortcut">Ctrl + Enter</span> */}
                    </div>

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

export default NewEmployeeWizard;
