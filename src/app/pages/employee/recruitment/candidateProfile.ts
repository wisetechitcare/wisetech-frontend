/**
 * Candidate wizard ↔ Applicant API mappers (mirror of backend preHireProfile utils).
 * Keep schemaVersion in sync with wisetech-backend/src/utils/preHireProfile.ts.
 */

export const PRE_HIRE_PROFILE_SCHEMA_VERSION = 1 as const;

export interface CandidateFormValues {
  firstName: string;
  lastName: string;
  personalEmailId: string;
  personalPhoneNumber: string;
  alternatePhoneNumber: string;
  personalPhoneNumberExtension: string;
  linkedInProfileUrl: string;
  instagramProfileUrl: string;
  facebookProfileUrl: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  anniversary: string;
  bloodGroup: string;
  avatar: string;
  currentEmployer: string;
  currentTitle: string;
  currentLocation: string;
  qualification: string;
  employeeLevelId: string;
  totalExperienceMonths: string | number;
  currentCtc: number | null;
  expectedCtc: number | null;
  noticePeriodDays: string | number;
  sourceId: string;
  referredById: string;
  proposedJoiningDate: string;
  requisitionId: string;
  meal: string;
  educationalInfo: unknown[];
  familyInfo: unknown[];
  emergencyDetails: Record<string, unknown>;
  addressInfo: Record<string, unknown>;
  workExpInfo: unknown[];
  documentFields: unknown[];
  documentInfo: Array<{
    documentId: string;
    path?: string;
    fileName?: string;
    identityNumber?: string;
    employeeId?: string;
  }>;
}

export const emptyCandidateFormValues = (): CandidateFormValues => ({
  firstName: "",
  lastName: "",
  personalEmailId: "",
  personalPhoneNumber: "",
  alternatePhoneNumber: "",
  personalPhoneNumberExtension: "",
  linkedInProfileUrl: "",
  instagramProfileUrl: "",
  facebookProfileUrl: "",
  dateOfBirth: "",
  gender: "",
  maritalStatus: "",
  anniversary: "",
  bloodGroup: "",
  avatar: "",
  currentEmployer: "",
  currentTitle: "",
  currentLocation: "",
  qualification: "",
  employeeLevelId: "",
  totalExperienceMonths: "",
  currentCtc: null,
  expectedCtc: null,
  noticePeriodDays: "",
  sourceId: "",
  referredById: "",
  proposedJoiningDate: "",
  requisitionId: "",
  meal: "",
  educationalInfo: [],
  familyInfo: [],
  emergencyDetails: {},
  addressInfo: {},
  workExpInfo: [],
  documentFields: [],
  documentInfo: [],
});

const trimOrNull = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

const numOrNull = (v: unknown): number | null => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Formik values → API create/update body (scalars + preHireProfile). */
export function formikToApplicantPayload(values: CandidateFormValues) {
  const preHireProfile = {
    schemaVersion: PRE_HIRE_PROFILE_SCHEMA_VERSION,
    personal: {
      dateOfBirth: trimOrNull(values.dateOfBirth),
      gender: trimOrNull(values.gender),
      maritalStatus: trimOrNull(values.maritalStatus),
      anniversary: trimOrNull(values.anniversary),
      bloodGroup: trimOrNull(values.bloodGroup),
    },
    contact: {
      alternatePhoneNumber: trimOrNull(values.alternatePhoneNumber),
      personalPhoneNumberExtension: trimOrNull(values.personalPhoneNumberExtension),
      linkedInProfileUrl: trimOrNull(values.linkedInProfileUrl),
      instagramProfileUrl: trimOrNull(values.instagramProfileUrl),
      facebookProfileUrl: trimOrNull(values.facebookProfileUrl),
    },
    educationalInfo: values.educationalInfo ?? [],
    familyInfo: values.familyInfo ?? [],
    emergencyDetails: values.emergencyDetails ?? {},
    addressInfo: values.addressInfo ?? {},
    meal: trimOrNull(values.meal),
    workExpInfo: values.workExpInfo ?? [],
    hiring: {
      proposedJoiningDate: trimOrNull(values.proposedJoiningDate),
      referredById: trimOrNull(values.referredById),
      sourceId: trimOrNull(values.sourceId),
    },
    documents: (values.documentInfo ?? [])
      .filter((d) => d?.documentId)
      .map((d) => ({
        documentId: d.documentId,
        path: d.path || null,
        fileName: d.fileName || null,
        identityNumber: d.identityNumber || null,
      })),
  };

  return {
    firstName: values.firstName.trim(),
    lastName: trimOrNull(values.lastName),
    email: trimOrNull(values.personalEmailId),
    phone: trimOrNull(values.personalPhoneNumber),
    currentEmployer: trimOrNull(values.currentEmployer),
    currentTitle: trimOrNull(values.currentTitle),
    currentLocation: trimOrNull(values.currentLocation),
    qualification: trimOrNull(values.qualification),
    employeeLevelId: trimOrNull(values.employeeLevelId),
    totalExperienceMonths: numOrNull(values.totalExperienceMonths),
    currentCtc: values.currentCtc,
    expectedCtc: values.expectedCtc,
    noticePeriodDays: numOrNull(values.noticePeriodDays),
    sourceId: trimOrNull(values.sourceId),
    referredById: trimOrNull(values.referredById),
    linkedInUrl: trimOrNull(values.linkedInProfileUrl),
    preHireProfile,
  };
}

/** Applicant API row → Formik values for edit. */
export function applicantToFormikValues(
  applicant: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    currentEmployer?: string | null;
    currentTitle?: string | null;
    currentLocation?: string | null;
    qualification?: string | null;
    employeeLevelId?: string | null;
    totalExperienceMonths?: number | null;
    currentCtc?: number | string | null;
    expectedCtc?: number | string | null;
    noticePeriodDays?: number | null;
    sourceId?: string | null;
    referredById?: string | null;
    linkedInUrl?: string | null;
    photoS3Url?: string | null;
    preHireProfile?: Record<string, unknown> | null;
    preHireProfileJson?: Record<string, unknown> | null;
  },
  extras?: { requisitionId?: string; documentFields?: unknown[] },
): CandidateFormValues {
  const profile = (applicant.preHireProfile ?? applicant.preHireProfileJson ?? {}) as Record<string, any>;
  const personal = profile.personal ?? {};
  const contact = profile.contact ?? {};
  const hiring = profile.hiring ?? {};
  const docs = Array.isArray(profile.documents) ? profile.documents : [];

  return {
    ...emptyCandidateFormValues(),
    firstName: applicant.firstName ?? "",
    lastName: applicant.lastName ?? "",
    personalEmailId: applicant.email ?? "",
    personalPhoneNumber: applicant.phone ?? "",
    alternatePhoneNumber: contact.alternatePhoneNumber ?? "",
    personalPhoneNumberExtension: contact.personalPhoneNumberExtension ?? "",
    linkedInProfileUrl: contact.linkedInProfileUrl ?? applicant.linkedInUrl ?? "",
    instagramProfileUrl: contact.instagramProfileUrl ?? "",
    facebookProfileUrl: contact.facebookProfileUrl ?? "",
    dateOfBirth: personal.dateOfBirth ?? "",
    gender: personal.gender ?? "",
    maritalStatus: personal.maritalStatus ?? "",
    anniversary: personal.anniversary ?? "",
    bloodGroup: personal.bloodGroup ?? "",
    avatar: applicant.photoS3Url ?? "",
    currentEmployer: applicant.currentEmployer ?? "",
    currentTitle: applicant.currentTitle ?? "",
    currentLocation: applicant.currentLocation ?? "",
    qualification: applicant.qualification ?? "",
    employeeLevelId: applicant.employeeLevelId ?? "",
    totalExperienceMonths: applicant.totalExperienceMonths ?? "",
    currentCtc: applicant.currentCtc != null ? Number(applicant.currentCtc) : null,
    expectedCtc: applicant.expectedCtc != null ? Number(applicant.expectedCtc) : null,
    noticePeriodDays: applicant.noticePeriodDays ?? "",
    sourceId: applicant.sourceId ?? hiring.sourceId ?? "",
    referredById: applicant.referredById ?? hiring.referredById ?? "",
    proposedJoiningDate: hiring.proposedJoiningDate ?? "",
    requisitionId: extras?.requisitionId ?? "",
    meal: profile.meal ?? "",
    educationalInfo: Array.isArray(profile.educationalInfo) ? profile.educationalInfo : [],
    familyInfo: Array.isArray(profile.familyInfo) ? profile.familyInfo : [],
    emergencyDetails: profile.emergencyDetails ?? {},
    addressInfo: profile.addressInfo ?? {},
    workExpInfo: Array.isArray(profile.workExpInfo) ? profile.workExpInfo : [],
    documentFields: extras?.documentFields ?? [],
    documentInfo: docs.map((d: any) => ({
      documentId: String(d.documentId ?? ""),
      path: d.path ?? "",
      fileName: d.fileName ?? "",
      identityNumber: d.identityNumber ?? "",
      employeeId: "",
    })),
  };
}

/** Minimal identity gate — first name + email or phone. */
export function candidateIdentityOk(values: CandidateFormValues): boolean {
  const name = values.firstName.trim();
  const email = values.personalEmailId.trim();
  const phone = values.personalPhoneNumber.trim();
  return Boolean(name && (email || phone));
}
