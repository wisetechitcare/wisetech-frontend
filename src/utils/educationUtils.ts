type EducationRow = {
  rowId: string;
  id?: string;
  instituteName: string;
  qualificationMasterId: string;
  qualificationName: string;
  degree: string;
  specialization: string;
  stream: string;
  customStream: string;
  fromDate: string;
  toDate: string;
  passingYear: string;
  percentage: string;
  cgpa: string;
  filePath: string;
  fileName: string;
  [key: string]: any;
};

const createRowId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeQualificationName = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const inferQualificationName = (raw: any = {}) => {
  const explicitName = normalizeQualificationName(raw?.qualificationName || "");
  if (explicitName) return explicitName;

  if (raw?.stream || raw?.customStream) return "HSC";
  if (raw?.passingYear !== undefined && raw?.passingYear !== null && raw?.passingYear !== "") return "SSC";
  if (raw?.fromDate || raw?.toDate || raw?.specialization) return "Degree";

  return "";
};

const getConfiguredFields = (qualificationName: string) => {
  const normalized = normalizeQualificationName(qualificationName).toUpperCase();

  if (normalized === "SSC") {
    return {
      usesPassingYear: true,
      usesDateRange: false,
      usesStream: false,
      usesSpecialization: false,
      detailField: "",
    };
  }

  if (normalized === "HSC") {
    return {
      usesPassingYear: true,
      usesDateRange: false,
      usesStream: true,
      usesSpecialization: false,
      detailField: "stream",
    };
  }

  return {
    usesPassingYear: false,
    usesDateRange: true,
    usesStream: false,
    usesSpecialization: true,
    detailField: "specialization",
  };
};

export const createEducationRow = (overrides: Partial<EducationRow> = {}): EducationRow => ({
  rowId: createRowId(),
  instituteName: "",
  qualificationMasterId: "",
  qualificationName: "",
  degree: "",
  specialization: "",
  stream: "",
  customStream: "",
  fromDate: "",
  toDate: "",
  passingYear: "",
  percentage: "",
  cgpa: "",
  filePath: "",
  fileName: "",
  ...overrides,
});

export const normalizeEducationRecord = (raw: any = {}, fallbackRowId?: string): EducationRow => {
  const qualificationName = inferQualificationName(raw);
  const normalized = createEducationRow({
    rowId: raw?.rowId || fallbackRowId || createRowId(),
    id: raw?.id,
    instituteName: raw?.instituteName || "",
    qualificationMasterId: raw?.qualificationMasterId || "",
    qualificationName,
    degree: raw?.degree || qualificationName || "",
    specialization: raw?.specialization || "",
    stream: raw?.stream || "",
    customStream: raw?.customStream || "",
    fromDate: raw?.fromDate || "",
    toDate: raw?.toDate || "",
    passingYear: raw?.passingYear || "",
    percentage: raw?.percentage ?? "",
    cgpa: raw?.cgpa ?? "",
    filePath: raw?.filePath || "",
    fileName: raw?.fileName || "",
  });

  return normalized;
};

export const normalizeEducationRows = (rows: any[] = []) =>
  rows.map((row, index) => normalizeEducationRecord(row, row?.rowId || `education-row-${index}`));

export const getQualificationConfig = (qualificationName: string) =>
  getConfiguredFields(normalizeQualificationName(qualificationName));

export const getEducationLabel = (education: Partial<EducationRow> = {}) =>
  normalizeQualificationName(education.qualificationName || education.degree || "") || "Education";

export const getEducationDetailValue = (education: Partial<EducationRow> = {}) => {
  const config = getQualificationConfig(String(education.qualificationName || education.degree || ""));

  if (config.usesStream) {
    return education.customStream || education.stream || "";
  }

  if (config.usesSpecialization) {
    return education.specialization || "";
  }

  return "";
};

export const getEducationDisplayTitle = (education: Partial<EducationRow> = {}) => {
  const label = getEducationLabel(education);
  const detail = getEducationDetailValue(education);
  return detail ? `${label} - ${detail}` : label;
};

export const getEducationPrimaryValue = (education: Partial<EducationRow> = {}) => {
  const config = getQualificationConfig(String(education.qualificationName || education.degree || ""));
  return config.usesPassingYear ? education.passingYear || "" : education.fromDate || "";
};

export const getEducationSecondaryValue = (education: Partial<EducationRow> = {}) => {
  const config = getQualificationConfig(String(education.qualificationName || education.degree || ""));
  return config.usesPassingYear ? "" : education.toDate || "";
};

export const hasStartedEducationInfo = (education: any = {}) => Boolean(
  education?.instituteName ||
  education?.qualificationMasterId ||
  education?.qualificationName ||
  education?.degree ||
  education?.specialization ||
  education?.stream ||
  education?.customStream ||
  education?.fromDate ||
  education?.toDate ||
  education?.passingYear ||
  education?.percentage ||
  education?.cgpa ||
  education?.filePath ||
  education?.fileName
);

export const getActiveEducationRows = (rows: any[] = []) =>
  normalizeEducationRows(rows).filter(hasStartedEducationInfo);

export const resetEducationFieldsForQualification = (row: EducationRow, qualificationName: string) => {
  const config = getQualificationConfig(qualificationName);
  const next = { ...row, qualificationName: normalizeQualificationName(qualificationName), degree: normalizeQualificationName(qualificationName) };

  if (config.usesPassingYear) {
    next.fromDate = "";
    next.toDate = "";
    next.specialization = "";
  } else {
    next.passingYear = "";
    next.stream = "";
    next.customStream = "";
  }

  return next;
};

export const buildEducationPayload = (education: any = {}, employeeId?: string) => {
  const normalized = normalizeEducationRecord(education);

  if (!hasStartedEducationInfo(normalized)) {
    return null;
  }

  const config = getQualificationConfig(normalized.qualificationName);
  const payload: Record<string, any> = {
    ...(normalized.instituteName && { instituteName: normalized.instituteName }),
    ...(normalized.qualificationMasterId && { qualificationMasterId: normalized.qualificationMasterId }),
    ...(normalized.qualificationName && { qualificationName: normalized.qualificationName }),
    ...(normalized.degree && { degree: normalized.degree }),
    ...(normalized.filePath && { filePath: normalized.filePath }),
    ...(normalized.fileName && { fileName: normalized.fileName }),
    ...(normalized.percentage !== "" && { percentage: normalized.percentage }),
    ...(normalized.cgpa !== "" && { cgpa: normalized.cgpa }),
    ...(employeeId && { employeeId }),
  };

  if (config.usesPassingYear) {
    if (normalized.passingYear) payload.passingYear = normalized.passingYear;
  } else {
    if (normalized.fromDate) payload.fromDate = normalized.fromDate;
    if (normalized.toDate) payload.toDate = normalized.toDate;
    if (normalized.specialization) payload.specialization = normalized.specialization;
  }

  if (config.usesStream) {
    if (normalized.stream) payload.stream = normalized.stream;
    if (normalized.customStream) payload.customStream = normalized.customStream;
  }

  return payload;
};

export const getEducationCompletionValues = (education: any = {}) => {
  const normalized = normalizeEducationRecord(education);
  const config = getQualificationConfig(normalized.qualificationName);

  return [
    normalized.instituteName,
    normalized.qualificationName || normalized.degree,
    config.usesPassingYear ? normalized.passingYear : normalized.fromDate,
    normalized.percentage || normalized.cgpa,
  ];
};

export const getEducationAcademicLabel = (education: any = {}) => {
  const config = getQualificationConfig(String(education?.qualificationName || education?.degree || ""));

  if (config.usesPassingYear) {
    return "Passing Year";
  }

  return "From / To";
};
