import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { Form, Formik, FormikValues } from "formik";
import * as Yup from "yup";
import { StepperComponent } from "@metronic/assets/ts/components";
import { KTIcon } from "@metronic/helpers";
import { PageLink, PageTitle } from "@metronic/layout/core";
import { uploadUserAsset } from "@services/uploader";
import Step2, { NAV_SECTIONS, COMPLETION_FNS } from "./steps/Step2";
import ObSectionsSidebar from "./steps/ObSectionsSidebar";
import Step3 from "./steps/Step3";
import Step4 from "./steps/Step4";
import StepAppSettings from "./steps/StepAppSettings";
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

const ONBOARDING_DRAFT_KEY = "employee-onboarding-draft";

const hasDraftValue = (value: any) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.length > 0;
  return String(value).trim() !== "";
};

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

  const trackedFields = [
    values.firstName, values.lastName, values.nickName,
    values.dateOfBirth, values.gender, values.maritalStatus,
    values.personalEmailId, values.personalPhoneNumber, values.alternatePhoneNumber,
    education.instituteName, education.qualificationName || education.degree,
    education.passingYear || education.fromDate, education.percentage || education.cgpa,
    family.name, family.relationship, family.mobileNumber, family.dateOfBirth,
    emergency.emergencyContactName, emergency.emergencyContactNumber,
    bank.accountNumber, bank.accountName, bank.ifscCode,
    address.presentAddressLine1, address.presentCountry,
    address.presentCity, address.presentPostalCode,
    values.dateOfJoining, values.companyEmailId, values.departmentId,
    values.designationId, values.branchId, values.appRole,
    values.documentInfo?.some((doc: any) => doc?.path || doc?.fileName || doc?.identityNumber),
  ];

  const completed = trackedFields.filter(hasDraftValue).length;
  return Math.round((completed / trackedFields.length) * 100);
};

const hasStartedEducationInfo = (education: any) =>
  Boolean(
    education?.instituteName || education?.qualificationMasterId ||
    education?.qualificationName || education?.degree ||
    education?.specialization || education?.stream || education?.customStream ||
    education?.fromDate || education?.toDate || education?.passingYear ||
    education?.percentage || education?.cgpa || education?.filePath || education?.fileName,
  );

const isSchoolQualification = (education: any) =>
  ["SSC", "HSC"].includes(String(education?.qualificationName || education?.degree || "").trim());

const isHscQualification = (education: any) =>
  String(education?.qualificationName || education?.degree || "").trim() === "HSC";

const createDefaultWorkExpInfo = () => ({ companyName: "", jobTitle: "", fromDate: "", toDate: "" });

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
        .test("education-qualification", "Qualification is required", function (value) {
          if (!hasStartedEducationInfo(value) || value?.qualificationName || value?.degree) return true;
          return this.createError({ path: `${this.path}.qualificationMasterId`, message: "Qualification is required" });
        })
        .test("education-school-passing-year", "Passing Year is required", function (value) {
          if (!hasStartedEducationInfo(value) || !isSchoolQualification(value) || value?.passingYear) return true;
          return this.createError({ path: `${this.path}.passingYear`, message: "Passing Year is required" });
        })
        .test("education-passing-year-format", "Passing Year must be a valid year", function (value) {
          if (!value?.passingYear) return true;
          const year = Number(value.passingYear);
          const currentYear = new Date().getFullYear();
          if (/^\d{4}$/.test(String(value.passingYear)) && year >= 1900 && year <= currentYear) return true;
          return this.createError({ path: `${this.path}.passingYear`, message: "Passing Year must be between 1900 and the current year" });
        })
        .test("education-hsc-stream", "Stream is required", function (value) {
          if (!hasStartedEducationInfo(value) || !isHscQualification(value) || value?.stream) return true;
          return this.createError({ path: `${this.path}.stream`, message: "Stream is required" });
        })
        .test("education-custom-stream", "Custom Stream Name is required", function (value) {
          if (!hasStartedEducationInfo(value) || !isHscQualification(value) || value?.stream !== "Others" || value?.customStream) return true;
          return this.createError({ path: `${this.path}.customStream`, message: "Custom Stream Name is required" });
        })
        .test("education-from-date", "Date Started is required", function (value) {
          if (!hasStartedEducationInfo(value) || isSchoolQualification(value) || value?.fromDate) return true;
          return this.createError({ path: `${this.path}.fromDate`, message: "Date Started is required" });
        })
        .test("education-to-date", "Date Completed is required", function (value) {
          if (!hasStartedEducationInfo(value) || isSchoolQualification(value) || value?.toDate) return true;
          return this.createError({ path: `${this.path}.toDate`, message: "Date Completed is required" });
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
        name: optionalString().label("Family Member Name")
          .min(4, "Family Member name must be at least 4 characters").max(20, "Family Member name must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.name"], "Family Member name can only contain alphabetic characters"),
        relationship: optionalString().label("Member Relationship")
          .min(3, "Member Relationship name must be at least 3 characters").max(20, "Member Relationship name must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.relationship"], "Member Relationship name can only contain alphabetic characters"),
        mobileNumber: optionalString().label("Member Phone Number")
          .min(10, "Phone Number must be at least 10 characters").max(20, "Phone Number must be at most 20 characters")
          .matches(employeeOnBardingFormRegexes["familyInfo.mobileNumber"], "Phone Number can only contain numeric characters"),
        dateOfBirth: optionalString().label("Date of Birth"),
      }),
    ).required().label("Family info"),
    emergencyDetails: Yup.object({
      bloodGroup: optionalString().label("Blood Group"),
      allergies: optionalString().label("Allergies").max(100, "Allergies must be at most 100 characters"),
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
      ifscCode: optionalString().label("IFSC Code"),
      filePath: optionalString().label("Upload Bank Proof"),
    }).required(),
    addressInfo: Yup.object({
      permanentAddressLine1: optionalString().label("Address Line 1").min(8, "Address Line must be at least 8 characters"),
      permanentAddressLine2: optionalString().label("Address Line 2").min(8, "Address Line must be at least 8 characters"),
      permanentCountry: optionalString().label("Country"),
      permanentState: optionalString().label("State"),
      permanentCity: optionalString().label("City"),
      permanentPostalCode: optionalString().label("Postal Code")
        .min(4, "Postal Code must be at least 4 characters").max(16, "Postal Code must be at most 16 characters")
        .matches(employeeOnBardingFormRegexes["addressInfo.permanentPostalCode"], "Postal Code can only contain numeric characters"),
      presentAddressLine1: optionalString(),
      presentAddressLine2: optionalString(),
      presentCountry: optionalString(),
      presentState: optionalString(),
      presentCity: optionalString(),
      presentPostalCode: optionalString(),
    }).required(),
  }),
  Yup.object({
    designationId: Yup.string().required().label("Job Profile"),
    departmentId: Yup.string().required().label("Department"),
    branchId: Yup.string().required().label("Branch"),
    employeeTypeId: optionalString().label("Employee Type (Old)"),
    employeeTypeConfigId: optionalString().label("Employee Type"),
    workingMethodId: optionalString().label("Working Method"),
    companyEmailId: optionalString().label("Company Email Address")
      .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Invalid email address"),
    companyPhoneNumber: optionalString().label("Company Phone Number")
      .min(10, "Phone Number must be at least 10 characters").max(20, "Phone Number must be at most 20 characters")
      .matches(employeeOnBardingFormRegexes["companyPhoneNumber"], "Phone Number can only contain numeric characters"),
    companyPhoneExtension: optionalString().label("Company Phone Extension"),
    sourceOfHireId: optionalString().label("Source Of Hire"),
    referredById: optionalString(),
    dateOfJoining: optionalString().label("Date Of Joining"),
    dateOfExit: optionalString(),
    rejoinHistory: Yup.array().of(
      Yup.object({ dateOfReJoining: optionalString(), dateOfReExit: optionalString(), reason: optionalString() }),
    ),
    employeeStatusId: optionalString().label("Employee Status (Old)"),
    employeeStatusConfigId: optionalString().label("Employee Status"),
    workExpInfo: Yup.array().of(
      Yup.object({
        companyName: optionalString().label("Company Name"),
        jobTitle: optionalString().label("Job Title"),
        fromDate: optionalString().label("From Date"),
        toDate: optionalString().label("To Date"),
      })
        .test("work-company-name", "Company Name is required", function (value) {
          if (!hasWorkExpInfo(value) || value?.companyName) return true;
          return this.createError({ path: `${this.path}.companyName`, message: "Company Name is required" });
        })
        .test("work-job-title", "Job Title is required", function (value) {
          if (!hasWorkExpInfo(value) || value?.jobTitle) return true;
          return this.createError({ path: `${this.path}.jobTitle`, message: "Job Title is required" });
        })
        .test("work-from-date", "From Date is required", function (value) {
          if (!hasWorkExpInfo(value) || value?.fromDate) return true;
          return this.createError({ path: `${this.path}.fromDate`, message: "From Date is required" });
        })
        .test("work-to-date", "To Date is required", function (value) {
          if (!hasWorkExpInfo(value) || value?.toDate) return true;
          return this.createError({ path: `${this.path}.toDate`, message: "To Date is required" });
        }),
    ),
  }),
  Yup.object({
    reportsToId: optionalString().label("Reporting Manager"),
    ctcInLpa: optionalString().label("CTC In LPA"),
    appRole: optionalString().label("App Role"),
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

const createDefaultEducationInfo = () => ({
  instituteName: "", qualificationMasterId: "", qualificationName: "", degree: "",
  specialization: "", stream: "", customStream: "", fromDate: "", toDate: "",
  passingYear: "", percentage: "", cgpa: "", filePath: "", fileName: "",
});

const createDefaultFamilyInfo = () => ({ name: "", relationship: "", mobileNumber: "", dateOfBirth: "" });

const hasEducationInfo = hasStartedEducationInfo;

const buildEducationPayload = (education: any, employeeId?: string) => ({
  ...(education.instituteName && { instituteName: education.instituteName }),
  ...(education.qualificationMasterId && { qualificationMasterId: education.qualificationMasterId }),
  ...((education.qualificationName || education.degree) && { qualificationName: education.qualificationName || education.degree }),
  ...(education.degree && { degree: education.degree }),
  ...(education.specialization && { specialization: education.specialization }),
  ...(education.stream && { stream: education.stream }),
  ...(education.customStream && { customStream: education.customStream }),
  ...(education.filePath && { filePath: education.filePath }),
  ...(education.fileName && { fileName: education.fileName }),
  ...(education.fromDate && { fromDate: education.fromDate }),
  ...(education.toDate && { toDate: education.toDate }),
  ...(education.passingYear && { passingYear: education.passingYear }),
  ...(education.percentage && { percentage: education.percentage }),
  ...(education.cgpa && { cgpa: education.cgpa }),
  ...(employeeId && { employeeId }),
});

const hasFamilyInfo = (familyMember: any) =>
  Boolean(familyMember?.name || familyMember?.relationship || familyMember?.mobileNumber || familyMember?.dateOfBirth);

const withDefaultEducationInfo = (educationalInfo: any) =>
  Array.isArray(educationalInfo) && educationalInfo.length > 0 ? educationalInfo : [createDefaultEducationInfo()];

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
  bankInfo: { accountName: "", accountNumber: "", ifscCode: "", filePath: "" },
  addressInfo: {
    permanentAddressLine1: "", permanentAddressLine2: "", permanentCountry: "",
    permanentState: "", permanentCity: "", permanentPostalCode: "",
    presentAddressLine1: "", presentAddressLine2: "", presentCountry: "",
    presentState: "", presentCity: "", presentPostalCode: "",
  },
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
  isHiddenFromStaff: false,
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
  } = values;

  const user = {
    firstName, lastName,
    isActive: isEmployeeActive === "1",
    isAdmin: false,
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
  const companyId = companyOverview[0].id;
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
    ...(Array.isArray(values.leaveAllocations) && { leaveAllocations: values.leaveAllocations }),
    ...buildProfessionalFeesPayload({ professionalFeesEnabled, professionalFeesAmount, professionalFeesPercentage, professionalFeesType }),
    isHiddenFromStaff: isHiddenFromStaff === true,
  };

  Object.keys(employee).forEach((key) => {
    if (key === "gender" || key === "maritalStatus" || key === "isHiddenFromStaff" || PROF_FEES_KEYS.has(key)) return;
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
      () => createEducationalDetails(filledEducationalInfo.map((el: any) => buildEducationPayload(el, employeeId))),
      () => createAddressDetails({ ...addressInfo, employeeId, ...(isSameAddress && { presentAddressLine1: undefined, presentAddressLine2: undefined, presentCountry: undefined, presentState: undefined, presentCity: undefined, presentPostalCode: undefined }) }),
      () => createBankDetails({ ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }), ...(bankInfo.accountName && { accountName: bankInfo.accountName }), ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }), ...(bankInfo.filePath && { filePath: bankInfo.filePath }), employeeId }),
      () => createEmergencyDetails({ ...(emergencyDetails.bloodGroup && { bloodGroup: emergencyDetails.bloodGroup }), ...(emergencyDetails.allergies && { allergies: emergencyDetails.allergies }), ...(emergencyDetails.emergencyContactName && { emergencyContactName: emergencyDetails.emergencyContactName }), ...(emergencyDetails.emergencyContactNumber && { emergencyContactNumber: emergencyDetails.emergencyContactNumber }), employeeId }),
      () => createDocumentsDetails(documents.map((el: any) => ({ ...el, employeeId }))),
    ];

    const responses = await Promise.all(reqPromises.map((fn) => fn()));
    const allSuccessful = responses.every((response) => response?.statusCode === 200);
    if (!allSuccessful) throw new Error("Some operations failed to complete successfully");
    return true;
  } catch (err) { console.log(err); }
};

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
  const [defaultState, setDefaultState] = useState(initialState);
  const [activeSection, setActiveSection] = useState("personal-info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mobileProfilePhotoPreview, setMobileProfilePhotoPreview] = useState("");
  const [sidebarProfileHasAppeared, setSidebarProfileHasAppeared] = useState(false);
  const [sidebarProfileShouldAnimate, setSidebarProfileShouldAnimate] = useState(false);

  // Clear any stale draft on mount so new employee form starts blank
  useEffect(() => {
    if (!editMode) localStorage.removeItem(ONBOARDING_DRAFT_KEY);
  }, []);

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

  const addFileToState = (documentId: string, file: File) => {
    setFiles((prev: any) => ({ ...prev, [documentId]: file }));

    if (documentId === "userProfilePicture") {
      if (profilePhotoPreviewRef.current) URL.revokeObjectURL(profilePhotoPreviewRef.current);
      const previewUrl = URL.createObjectURL(file);
      profilePhotoPreviewRef.current = previewUrl;
      setMobileProfilePhotoPreview(previewUrl);
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

  const prevStep = () => {
    if (activeStepIndex <= 1) return;
    if (stepper) {
      stepper.goPrev();
      setActiveStepIndex(stepper.currentStepIndex);
      setCurrentSchema(newEmployeeWizardSchema[stepper.currentStepIndex - 1]);
    } else {
      const prev = activeStepIndex - 1;
      setActiveStepIndex(prev);
      setCurrentSchema(newEmployeeWizardSchema[prev - 1]);
    }
    if (activeStepIndex === 2) setActiveSection("personal-info");
    scrollWizardToTop();
  };

  const updateWizardData = async (values: any) => {
    const { data: { companyOverview } } = await fetchCompanyOverview();
    const companyId = companyOverview[0].id;
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
      roomOrBlock, shift, experienceLevel, employeeLevelId,
      isHiddenFromStaff: isHiddenFromStaffEdit,
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
      ...(avatar && { avatar }), id: employeeId, userId, dateOfJoining, ctcInLpa,
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
      ...(Array.isArray(values.leaveAllocations) && { leaveAllocations: values.leaveAllocations }),
      ...buildProfessionalFeesPayload({ professionalFeesEnabled, professionalFeesAmount, professionalFeesPercentage, professionalFeesType }),
      isHiddenFromStaff: isHiddenFromStaffEdit === true,
    };

    Object.keys(employeePayload).forEach((key) => {
      if (key === "gender" || key === "maritalStatus" || key === "isHiddenFromStaff" || PROF_FEES_KEYS.has(key)) return;
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

    educationalInfo.filter((e: any) => e?.id || hasEducationInfo(e)).forEach((e: any) =>
      reqPromise.push(() => e?.id ? updateEducationalDetails(e.id, buildEducationPayload(e)) : createEducationalDetails([buildEducationPayload(e, employeeId)])));

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
      : createBankDetails({ ...(bankInfo.accountNumber && { accountNumber: bankInfo.accountNumber }), ...(bankInfo.accountName && { accountName: bankInfo.accountName }), ...(bankInfo.ifscCode && { ifscCode: bankInfo.ifscCode }), ...(bankInfo.filePath && { filePath: bankInfo.filePath }), employeeId }));

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

  const submitStep = async (values: any, actions: FormikValues) => {
    const currentStepIndex = stepper?.currentStepIndex || activeStepIndex;
    const totalStepsNumber = stepper?.totalStepsNumber || newEmployeeWizardSchema.length;

    if (currentStepIndex === totalStepsNumber && editMode) {
      try { setIsSubmitting(true); await updateWizardData(values); }
      catch (error) { console.error("Update wizard error:", error); }
      finally { setIsSubmitting(false); }
      return;
    }

    if (currentStepIndex !== totalStepsNumber) {
      if (stepper) {
        stepper.goNext();
        setActiveStepIndex(stepper.currentStepIndex);
        setCurrentSchema(newEmployeeWizardSchema[stepper.currentStepIndex - 1]);
      } else {
        const next = currentStepIndex + 1;
        setActiveStepIndex(next);
        setCurrentSchema(newEmployeeWizardSchema[next - 1]);
      }
      setActiveSection("personal-info");
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
        localStorage.removeItem(ONBOARDING_DRAFT_KEY);
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
          if (targetStep === 1) setActiveSection("personal-info");
          scrollWizardToTop(); return;
        }
        e.stopImmediatePropagation();
        if (!formikRef.current) return;
        formikRef.current.validateForm().then((errors: any) => {
          if (Object.keys(errors).length === 0) {
            stepper.goto(targetStep);
            setActiveStepIndex(targetStep);
            setCurrentSchema(newEmployeeWizardSchema[targetStep - 1]);
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

              useEffect(() => { formikProps.validateForm(); }, [activeStepIndex, defaultState]);

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

              // Determine if required fields for this step are filled (for CTA styling)
              const isStepReady = (() => {
                const v = formikProps.values;
                if (activeStepIndex === 1) return [v.firstName, v.lastName, v.dateOfBirth, v.gender, v.personalEmailId, v.personalPhoneNumber].every(hasDraftValue);
                if (activeStepIndex === 2) return [v.designationId, v.departmentId, v.branchId].every(hasDraftValue);
                return true;
              })();

              return (
                <Form className="ob-wizard-root" noValidate id="employee_onboarding_form">
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
                            <>
                              <div
                                key={stepNum}
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
                                <div key={`conn-${i}`} className={`ob-step-connector ${isCompleted ? "completed" : ""}`} />
                              )}
                            </>
                          );
                        })}
                      </div>
                    </nav>

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
                                    isComplete: total > 0 && filled >= total,
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
                                    isComplete: total > 0 && filled >= total,
                                  };
                                })(),
                              ]}
                              activeSection={activeSection}
                              onSectionChange={setActiveSection}
                            />
                            <div className="ob-form-area">
                              <Step2
                                formikProps={formikProps}
                                setFile={addFileToState}
                                setEducationFile={addEducationFileToState}
                                activeSection={activeSection}
                                onSectionChange={setActiveSection}
                                completion={completion}
                              />
                            </div>
                          </div>
                        )}

                        {activeStepIndex === 2 && <Step3 formikProps={formikProps} editMode={editMode} sidebarProfile={sidebarProfile} />}
                        {activeStepIndex === 3 && <StepAppSettings formikProps={formikProps} editMode={editMode} sidebarProfile={sidebarProfile} />}
                        {activeStepIndex === 4 && <Step4 formikProps={formikProps} setFile={addFileToState} sidebarProfile={sidebarProfile} />}
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

                      {/* Continue / Submit */}
                      {activeStepIndex === 1 ? (
                        <button
                          type="button"
                          className={`ob-float-continue-btn ${isStepReady ? "is-ready" : "is-incomplete"}`}
                          disabled={isSubmitting}
                          onClick={() => {
                            formikProps.validateForm().then((errors) => {
                              if (Object.keys(errors).length === 0) {
                                if (stepper) {
                                  stepper.goNext();
                                  setActiveStepIndex(stepper.currentStepIndex);
                                  setCurrentSchema(newEmployeeWizardSchema[stepper.currentStepIndex - 1]);
                                } else {
                                  setActiveStepIndex(2);
                                  setCurrentSchema(newEmployeeWizardSchema[1]);
                                }
                                formikProps.setTouched({});
                                scrollWizardToTop();
                              } else {
                                formikProps.submitForm();
                              }
                            });
                          }}
                        >
                          Continue
                          <KTIcon iconName="arrow-right" className="fs-5" />
                        </button>
                      ) : isLastStep ? (
                        <button
                          type="submit"
                          className="ob-float-submit-btn"
                          disabled={isSubmitting}
                        >
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
                      ) : (
                        <button
                          type="submit"
                          className={`ob-float-continue-btn ${isStepReady ? "is-ready" : "is-incomplete"}`}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              Please wait...
                              <span className="spinner-border spinner-border-sm align-middle ms-1" />
                            </>
                          ) : (
                            <>
                              Continue
                              <KTIcon iconName="arrow-right" className="fs-5" />
                            </>
                          )}
                        </button>
                      )}

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
