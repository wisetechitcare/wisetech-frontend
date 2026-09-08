import axios from "axios";
import { RECRUITMENT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// ─── Types (Phase 1) ─────────────────────────────────────────────────────────
export interface RequisitionStage {
    id: string;
    name: string;
    color?: string | null;
    sortOrder: number;
    isDefault: boolean;
    isActive: boolean;
    isOpenTrigger: boolean;
    isTerminal: boolean;
}

export interface JobRequisition {
    id: string;
    prefix?: string | null;
    title: string;
    jobDescription?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    branchId?: string | null;
    employeeTypeConfigId?: string | null;
    employeeLevelId?: string | null;
    hiringManagerId?: string | null;
    recruiterId?: string | null;
    headcount: number;
    filledCount: number;
    minCtcInLpa?: number | string | null;
    maxCtcInLpa?: number | string | null;
    targetStartDate?: string | null;
    requisitionStageId?: string | null;
    requisitionStage?: RequisitionStage | null;
    status: number; // 0 pending · 1 approved · 2 rejected
    isActive: boolean;
    revisionCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface RequisitionPayload {
    title: string;
    jobDescription?: string | null;
    departmentId?: string | null;
    designationId?: string | null;
    branchId?: string | null;
    employeeTypeConfigId?: string | null;
    employeeLevelId?: string | null;
    hiringManagerId?: string | null;
    recruiterId?: string | null;
    headcount?: number;
    minCtcInLpa?: number | null;
    maxCtcInLpa?: number | null;
    targetStartDate?: string | null;
    requisitionStageId?: string | null;
    isActive?: boolean;
    expectedRevisionCount?: number;
}

export interface RequisitionStagePayload {
    name: string;
    color?: string | null;
    sortOrder?: number;
    isDefault?: boolean;
    isOpenTrigger?: boolean;
    isTerminal?: boolean;
    isActive?: boolean;
}

// ─── Requisitions ────────────────────────────────────────────────────────────
/**
 * Query string for a recruitment list read. Blank values are dropped, so `companyId`
 * is simply absent when the org filter is on "All" — which the API reads as the
 * caller's whole organization family. Replaces three hand-rolled param builders that
 * each did this slightly differently.
 */
/**
 * Props for a recruitment view that honours the shell's organization filter.
 * `undefined` means "no filter" — the API then reads the whole org family.
 */
export interface OrgScoped {
    companyId?: string;
}

const listQuery = (params: Record<string, string | undefined> = {}): string => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
    const s = qs.toString();
    return s ? `?${s}` : "";
};

export const getRequisitions = async (companyId?: string): Promise<JobRequisition[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_REQUISITIONS}${listQuery({ companyId })}`);
    return data?.requisitions ?? [];
};

export const getRequisitionById = async (id: string): Promise<JobRequisition | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_REQUISITION_BY_ID.replace(":id", id)}`);
    return data?.requisition ?? null;
};

export const createRequisition = async (payload: RequisitionPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_REQUISITION}`, payload);
    return data;
};

export const updateRequisition = async (id: string, payload: RequisitionPayload) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.UPDATE_REQUISITION.replace(":id", id)}`, payload);
    return data;
};

export const archiveRequisition = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${RECRUITMENT.ARCHIVE_REQUISITION.replace(":id", id)}`);
    return data;
};

export const submitRequisitionApproval = async (id: string, approverIds?: string[]) => {
    const { data } = await axios.post(
        `${API_BASE_URL}/${RECRUITMENT.SUBMIT_REQUISITION_APPROVAL.replace(":id", id)}`,
        approverIds && approverIds.length ? { approverIds } : {},
    );
    return data;
};

// ─── Requisition stages (config master) ──────────────────────────────────────
const STAGES_PATH = RECRUITMENT.CONFIG_ENTITY.replace(":type", "requisition-stages");
const STAGE_BY_ID_PATH = (id: string) =>
    RECRUITMENT.CONFIG_ENTITY_BY_ID.replace(":type", "requisition-stages").replace(":id", id);

export const getRequisitionStages = async (): Promise<RequisitionStage[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${STAGES_PATH}`);
    return data?.stages ?? [];
};

export const createRequisitionStage = async (payload: RequisitionStagePayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${STAGES_PATH}`, payload);
    return data;
};

export const updateRequisitionStage = async (id: string, payload: RequisitionStagePayload) => {
    const { data } = await axios.put(`${API_BASE_URL}/${STAGE_BY_ID_PATH(id)}`, payload);
    return data;
};

export const deleteRequisitionStage = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${STAGE_BY_ID_PATH(id)}`);
    return data;
};

// ─── Phase 2 types (applicants / applications / pipeline config) ──────────────
export interface ApplicantSource { id: string; name: string; color?: string | null; isReferral: boolean; sortOrder: number; isActive: boolean; }
export interface RejectionReason { id: string; reason: string; color?: string | null; sortOrder: number; isActive: boolean; }
export interface ApplicationStatus {
    id: string; name: string; color?: string | null; sortOrder: number;
    isDefault: boolean; isActive: boolean; isHiredOutcome: boolean; isRejectedOutcome: boolean; requiresReason: boolean;
    autoEmailSubject?: string | null; autoEmailBody?: string | null; autoAdvanceThreshold?: number | string | null;
}
export interface Applicant {
    id: string; firstName: string; lastName?: string | null; email: string; phone?: string | null;
    currentEmployer?: string | null; currentTitle?: string | null; totalExperienceMonths?: number | null;
    currentLocation?: string | null; qualification?: string | null; employeeLevelId?: string | null;
    currentCtcInLpa?: number | string | null;
    expectedCtcInLpa?: number | string | null; noticePeriodDays?: number | null; resumeS3Url?: string | null;
    resumeFileName?: string | null; linkedInUrl?: string | null; sourceId?: string | null; source?: ApplicantSource | null;
    isBlacklisted: boolean; isActive: boolean; createdAt: string;
}
export interface Application {
    id: string; prefix?: string | null; applicantId: string; applicant?: Applicant | null;
    requisitionId?: string | null; requisition?: { id: string; title: string; prefix?: string | null } | null;
    statusId?: string | null; status?: ApplicationStatus | null; assignedRecruiterId?: string | null;
    ruleScore?: number | string | null; aiScore?: number | string | null; aiRecommendation?: string | null;
    rejectionReasonId?: string | null; rejectionReason?: RejectionReason | null; rejectionNote?: string | null;
    coverLetter?: string | null; appliedDate?: string | null; lastStageChangeAt?: string | null; hiredDate?: string | null;
    convertedEmployeeId?: string | null;
    isActive: boolean; revisionCount: number; createdAt: string;
}

export interface ApplicantPayload {
    firstName: string;
    lastName?: string | null;
    /**
     * Optional, because a candidate is identified by email OR phone. Most real intake —
     * WhatsApp, walk-in, referral — arrives with a number and no address, and the API
     * rejects only a record carrying neither.
     */
    email: string;
    phone?: string | null;
    currentEmployer?: string | null;
    currentTitle?: string | null;
    currentLocation?: string | null;
    qualification?: string | null;
    /** Seniority, from the same ladder a requisition picks from. */
    employeeLevelId?: string | null;
    totalExperienceMonths?: number | null;
    /** What they earn now. `expectedCtcInLpa` is what they are asking for; both are LPA. */
    currentCtcInLpa?: number | null;
    expectedCtcInLpa?: number | null;
    noticePeriodDays?: number | null;
    sourceId?: string | null;
}
export interface ApplicationCreatePayload {
    applicantId?: string | null;
    applicant?: ApplicantPayload | null;
    requisitionId?: string | null;
    statusId?: string | null;
    assignedRecruiterId?: string | null;
    coverLetter?: string | null;
}
export interface StageMovePayload {
    statusId: string; note?: string | null; rejectionReasonId?: string | null; rejectionNote?: string | null; expectedRevisionCount?: number;
}

// ─── Applications ────────────────────────────────────────────────────────────
export const getApplications = async (filters: { requisitionId?: string; statusId?: string; search?: string } = {}, companyId?: string): Promise<Application[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_APPLICATIONS}${listQuery({ ...filters, companyId })}`);
    return data?.applications ?? [];
};

export const createApplication = async (payload: ApplicationCreatePayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_APPLICATION}`, payload);
    return data;
};

export const moveApplicationStage = async (id: string, payload: StageMovePayload) => {
    const { data } = await axios.patch(`${API_BASE_URL}/${RECRUITMENT.MOVE_APPLICATION_STAGE.replace(":id", id)}`, payload);
    return data;
};

export const archiveApplication = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${RECRUITMENT.ARCHIVE_APPLICATION.replace(":id", id)}`);
    return data;
};

// ─── Candidate detail + notes ────────────────────────────────────────────────
export interface ApplicationNote {
    id: string;
    applicationId: string;
    authorId?: string | null;
    body: string;
    createdAt: string;
}

/** Stage transition as recorded by the server, newest first. */
export interface StageHistoryEntry {
    id: string;
    fromStatusId?: string | null;
    toStatusId?: string | null;
    changedById?: string | null;
    isAutomated: boolean;
    note?: string | null;
    changedAt: string;
}

export type ApplicationDetail = Application & { stageHistory?: StageHistoryEntry[] };

/** The full record behind one pipeline row — the endpoint existed with no caller until now. */
export const getApplicationById = async (id: string): Promise<ApplicationDetail | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_BY_ID.replace(":id", id)}`);
    return data?.application ?? null;
};

export const getApplicationNotes = async (applicationId: string): Promise<ApplicationNote[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_NOTES.replace(":id", applicationId)}`);
    return data?.notes ?? [];
};

export const createApplicationNote = async (applicationId: string, body: string) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_NOTES.replace(":id", applicationId)}`, { body });
    return data;
};

export const deleteApplicationNote = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${RECRUITMENT.DELETE_APPLICATION_NOTE.replace(":id", id)}`);
    return data;
};

// ─── Convert-to-employee hand-off ────────────────────────────────────────────
// PipelineView stashes the application id, then opens the New Employee wizard;
// on a successful create the wizard consumes the stash and links the two records
// so `convertedEmployeeId` is actually written. Timestamped, because an abandoned
// conversion must never attach a later, unrelated employee to the application.
const CONVERT_KEY = "recruitment-convert-application-id";
const CONVERT_TTL_MS = 30 * 60_000;

export const stashConversion = (applicationId: string) => {
    try {
        sessionStorage.setItem(CONVERT_KEY, JSON.stringify({ applicationId, ts: Date.now() }));
    } catch { /* quota — the back-link is best-effort, never block the conversion */ }
};

/** Reads AND clears the stash, so one conversion can only ever link once. */
export const takeConversion = (): string | null => {
    try {
        const raw = sessionStorage.getItem(CONVERT_KEY);
        sessionStorage.removeItem(CONVERT_KEY);
        if (!raw) return null;
        const { applicationId, ts } = JSON.parse(raw) ?? {};
        if (!applicationId || typeof ts !== "number" || Date.now() - ts > CONVERT_TTL_MS) return null;
        return String(applicationId);
    } catch { return null; }
};

export const clearConversion = () => {
    try { sessionStorage.removeItem(CONVERT_KEY); } catch { /* ignore */ }
};

/** Back-link a newly created employee to the application it came from. */
export const linkConvertedEmployee = async (applicationId: string, employeeId: string) => {
    const { data } = await axios.patch(
        `${API_BASE_URL}/${RECRUITMENT.UPDATE_APPLICATION_SECTION.replace(":id", applicationId)}`,
        { convertedEmployeeId: employeeId },
    );
    return data;
};

// ─── Applicants ──────────────────────────────────────────────────────────────
/**
 * Attach a resume to a candidate entered by hand.
 *
 * Multipart, because the file is the payload. The browser must set its own
 * multipart boundary, so Content-Type is deliberately NOT specified here — naming it
 * would send a boundary-less header and the server would reject every upload.
 *
 * The response carries the applicant with a short-lived signed URL already in
 * resumeS3Url, so the caller can open what it just uploaded without a second request.
 */
export const uploadApplicantResume = async (applicantId: string, file: File): Promise<Applicant> => {
    const form = new FormData();
    form.append("resume", file);
    const { data } = await axios.post(
        `${API_BASE_URL}/${RECRUITMENT.UPLOAD_APPLICANT_RESUME.replace(":id", applicantId)}`,
        form,
    );
    return data?.applicant;
};

export const getApplicants = async (search?: string, companyId?: string): Promise<Applicant[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_APPLICANTS}${listQuery({ search, companyId })}`);
    return data?.applicants ?? [];
};

export const createApplicant = async (payload: ApplicantPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_APPLICANT}`, payload);
    return data;
};

export const getApplicantById = async (id: string): Promise<Applicant | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICANT_BY_ID.replace(":id", id)}`);
    return data?.applicant ?? null;
};

// There is deliberately no deleteApplicant: candidate records are never hard-deleted (audit +
// data-retention). Deactivating/blacklisting flows through this update instead.
export const updateApplicant = async (id: string, payload: Partial<ApplicantPayload> & { isBlacklisted?: boolean; isActive?: boolean }) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.UPDATE_APPLICANT.replace(":id", id)}`, payload);
    return data;
};

// ─── Pipeline config masters ─────────────────────────────────────────────────
const cfgPath = (type: string) => RECRUITMENT.CONFIG_ENTITY.replace(":type", type);
const cfgByIdPath = (type: string, id: string) => RECRUITMENT.CONFIG_ENTITY_BY_ID.replace(":type", type).replace(":id", id);

export const getApplicationStatuses = async (): Promise<ApplicationStatus[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${cfgPath("application-statuses")}`);
    return data?.statuses ?? [];
};
export const createApplicationStatus = async (payload: Partial<ApplicationStatus> & { name: string }) => {
    const { data } = await axios.post(`${API_BASE_URL}/${cfgPath("application-statuses")}`, payload);
    return data;
};
export const updateApplicationStatus = async (
    id: string,
    payload: Partial<Pick<ApplicationStatus, "name" | "color" | "isDefault" | "isHiredOutcome" | "isRejectedOutcome" | "requiresReason" | "autoEmailSubject" | "autoEmailBody" | "autoAdvanceThreshold">>,
) => {
    const { data } = await axios.put(`${API_BASE_URL}/${cfgByIdPath("application-statuses", id)}`, payload);
    return data;
};
export const deleteApplicationStatus = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${cfgByIdPath("application-statuses", id)}`);
    return data;
};

export const getRejectionReasons = async (): Promise<RejectionReason[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${cfgPath("rejection-reasons")}`);
    return data?.reasons ?? [];
};
export const createRejectionReason = async (payload: Partial<RejectionReason> & { reason: string }) => {
    const { data } = await axios.post(`${API_BASE_URL}/${cfgPath("rejection-reasons")}`, payload);
    return data;
};
export const deleteRejectionReason = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${cfgByIdPath("rejection-reasons", id)}`);
    return data;
};

export const getApplicantSources = async (): Promise<ApplicantSource[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${cfgPath("applicant-sources")}`);
    return data?.sources ?? [];
};
export const createApplicantSource = async (payload: Partial<ApplicantSource> & { name: string }) => {
    const { data } = await axios.post(`${API_BASE_URL}/${cfgPath("applicant-sources")}`, payload);
    return data;
};
export const deleteApplicantSource = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${cfgByIdPath("applicant-sources", id)}`);
    return data;
};

// Edit support for the simple masters (create/delete already above).
export const updateRejectionReason = async (id: string, payload: Partial<RejectionReason> & { reason?: string }) => {
    const { data } = await axios.put(`${API_BASE_URL}/${cfgByIdPath("rejection-reasons", id)}`, payload);
    return data;
};
export const updateApplicantSource = async (id: string, payload: Partial<ApplicantSource> & { name?: string }) => {
    const { data } = await axios.put(`${API_BASE_URL}/${cfgByIdPath("applicant-sources", id)}`, payload);
    return data;
};

// Reorder any config master (type = requisition-stages | application-statuses | rejection-reasons | applicant-sources).
export const reorderConfig = async (type: string, orderedIds: string[]) => {
    const path = RECRUITMENT.CONFIG_REORDER.replace(":type", type);
    const { data } = await axios.patch(`${API_BASE_URL}/${path}`, { orderedIds });
    return data;
};

// ─── Tenant settings (scoring weights + automation rules) ────────────────────
export interface ScoringWeights { ctcFit: number; experience: number; noticePeriod: number; keywordMatch: number }
export interface AutoRules { autoAdvanceEnabled: boolean; autoRejectEnabled: boolean; aiScreeningEnabled: boolean }
export interface RecruitmentSettings { weights: ScoringWeights; autoRules: AutoRules }

export const getRecruitmentSettings = async (): Promise<RecruitmentSettings> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.SETTINGS}`);
    return data?.settings;
};
export const saveRecruitmentSettings = async (payload: Partial<RecruitmentSettings>): Promise<RecruitmentSettings> => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.SETTINGS}`, payload);
    return data?.settings;
};

// ─── Interviews + scorecards (Phase 4) ───────────────────────────────────────
export interface InterviewScorecard {
    id: string; interviewId: string; panelistId: string; overallRating: number; recommendation: string;
    /**
     * The vocabulary this card was scored under, frozen at submission. Read these
     * rather than the template's: the template can be edited afterwards, and a Good
     * on a three-point form must never be redisplayed as 3 out of 5.
     */
    ratingScale?: string | null; decisionSet?: string | null;
    factorScoresJson?: Record<string, number> | null; comments?: string | null; submittedAt: string;
}
export interface Interview {
    id: string; applicationId: string; round: number; type: string; mode: string;
    scheduledStart: string; scheduledEnd: string; meetingLink?: string | null; location?: string | null;
    panelistIds: string[]; status: string; reminderSentAt?: string | null; scorecards?: InterviewScorecard[];
}
export interface InterviewPayload {
    applicationId: string; round?: number; type?: string; mode?: string;
    scheduledStart: string; scheduledEnd: string; meetingLink?: string | null; location?: string | null; panelistIds: string[];
}


// ─── HR tracker import ───────────────────────────────────────────────────────
export type TrackerSheet = "candidates" | "requisitions";

export interface RowIssue { level: "error" | "warning"; field: string; message: string }

/** One row as the server resolved it, with everything it found wrong. */
export interface ImportRow {
    importable: boolean;
    issues: RowIssue[];
    mapped: {
        sourceRef?: string | null;
        applicant?: { firstName: string; lastName?: string | null; phone?: string | null };
        application?: { positionName?: string | null; statusName?: string | null };
        positionName?: string | null;
        headcount?: number;
    };
}

export interface ImportPreview {
    sheet: TrackerSheet;
    /** Which line the header was found on — a mis-read shows up here before anyone commits. */
    headerLine: number;
    headers: string[];
    preview: {
        total: number;
        importable: number;
        blocked: number;
        withWarnings?: number;
        rows: ImportRow[];
        questions?: {
            ambiguousNames: { name: string; employeeIds: string[]; employees: { id: string; label: string }[] }[];
            unmappedStatuses: { value: string; rowCount: number }[];
        };
    };
}

export interface ImportAnswers {
    nameOverrides?: Record<string, string>;
    statusAliases?: Record<string, string>;
}

/** Answers ride as a JSON field because the request is a file upload. */
const importForm = (file: File, answers?: ImportAnswers): FormData => {
    const form = new FormData();
    form.append("file", file);
    if (answers && (answers.nameOverrides || answers.statusAliases)) {
        form.append("answers", JSON.stringify(answers));
    }
    return form;
};

/** Reads the file and reports. Writes nothing. */
export const previewTrackerImport = async (sheet: TrackerSheet, file: File, answers?: ImportAnswers): Promise<ImportPreview> => {
    const { data } = await axios.post(
        `${API_BASE_URL}/${RECRUITMENT.IMPORT_PREVIEW.replace(":sheet", sheet)}`,
        importForm(file, answers),
    );
    return data;
};

export const executeTrackerImport = async (sheet: TrackerSheet, file: File, answers?: ImportAnswers) => {
    const { data } = await axios.post(
        `${API_BASE_URL}/${RECRUITMENT.IMPORT_EXECUTE.replace(":sheet", sheet)}`,
        importForm(file, answers),
    );
    return data?.result;
};
// ─── Scorecard templates (the interview rubric) ──────────────────────────────

/**
 * The rubric vocabularies. These SHAPES are declared here; the VALUES are never
 * authored on the client — every scale and decision set arrives from the API,
 * whose registry (utils/scorecardRubric.ts) is the only definition of what is
 * valid. A hardcoded list here would be a second source of truth, and the one
 * users see, so it would win arguments it should lose.
 */
export interface RatingLevel {
    value: number;
    label: string;
}
export interface RatingScale {
    id: string;
    label: string;
    min: number;
    max: number;
    /** Present when the scale is worded (Good / Average / Poor) rather than numeric. */
    levels?: RatingLevel[];
}
export type DecisionOutcome = "ADVANCE" | "HOLD" | "REJECT";
export interface DecisionOption {
    value: string;
    label: string;
    outcome: DecisionOutcome;
}
export interface DecisionSet {
    id: string;
    label: string;
    options: DecisionOption[];
}
/** What a scorecard dialog needs in order to render itself. */
export interface ResolvedRubric {
    template: ScorecardTemplate | null;
    scale: RatingScale;
    decisions: DecisionSet;
}
export interface ScorecardFactor {
    id: string;
    label: string;
    /** Relative weight; the panel score normalises by the sum, so these need not total anything. */
    weight: number | string;
    sortOrder: number;
}
export interface ScorecardTemplate {
    id: string;
    name: string;
    designationId?: string | null;
    isDefault: boolean;
    isActive: boolean;
    /** Registry ids. Null means the server default — not "no scale". */
    ratingScale?: string | null;
    decisionSet?: string | null;
    factors: ScorecardFactor[];
}
export interface ScorecardTemplatePayload {
    name?: string;
    designationId?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
    ratingScale?: string | null;
    decisionSet?: string | null;
    /** Sent whole — the API replaces the factor set rather than diffing it. */
    factors?: { label: string; weight?: number; sortOrder?: number }[];
}

export interface ScorecardTemplateList {
    templates: ScorecardTemplate[];
    /** The ids the API accepts, so the editor cannot offer one it would reject. */
    scales: RatingScale[];
    decisionSets: DecisionSet[];
}
export const getScorecardTemplates = async (): Promise<ScorecardTemplateList> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.SCORECARD_TEMPLATES}`);
    return {
        templates: data?.templates ?? [],
        scales: data?.rubricOptions?.scales ?? [],
        decisionSets: data?.rubricOptions?.decisionSets ?? [],
    };
};
export const createScorecardTemplate = async (payload: ScorecardTemplatePayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.SCORECARD_TEMPLATES}`, payload);
    return data;
};
export const updateScorecardTemplate = async (id: string, payload: ScorecardTemplatePayload) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.SCORECARD_TEMPLATE_BY_ID.replace(":id", id)}`, payload);
    return data;
};
export const deleteScorecardTemplate = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${RECRUITMENT.SCORECARD_TEMPLATE_BY_ID.replace(":id", id)}`);
    return data;
};

/**
 * The rubric to show for one interview: the criteria, and the vocabulary to score
 * them in. A null template is an ordinary answer, not an error — an interview with
 * no matching template still records an overall rating, and the server still says
 * which scale and decisions apply to it.
 */
export const getScorecardTemplateForInterview = async (interviewId: string): Promise<ResolvedRubric> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.SCORECARD_TEMPLATE_FOR_INTERVIEW.replace(":id", interviewId)}`);
    return { template: data?.template ?? null, scale: data?.rubric?.scale, decisions: data?.rubric?.decisions };
};
export interface ScorecardPayload {
    overallRating: number; recommendation: string; factorScores?: Record<string, number> | null; comments?: string | null;
}
export interface EvaluationAggregate {
    scorecardCount: number;
    /** In scale units. Null when the panel used more than one scale. */
    averageOverall: number | null;
    /** Which scale averageOverall is in, so it renders as "2/3" and not "2/5". */
    ratingScale: string | null;
    /** Mean position 0..1 within each card's own scale — always comparable. */
    averagePercent: number | null;
    /** The panel verdict by meaning, so it survives a vocabulary change. */
    verdict: "ADVANCE" | "HOLD" | "REJECT" | "MIXED" | null;
    byRecommendation: Record<string, number>;
}

export const getApplicationInterviews = async (applicationId: string): Promise<Interview[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_INTERVIEWS.replace(":id", applicationId)}`);
    return data?.interviews ?? [];
};
export const createInterview = async (payload: InterviewPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_INTERVIEW}`, payload);
    return data;
};
export const updateInterview = async (id: string, payload: Partial<InterviewPayload> & { status?: string }) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.UPDATE_INTERVIEW.replace(":id", id)}`, payload);
    return data;
};
export const submitScorecard = async (interviewId: string, payload: ScorecardPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.SUBMIT_SCORECARD.replace(":id", interviewId)}`, payload);
    return data;
};
export const getApplicationEvaluation = async (applicationId: string): Promise<EvaluationAggregate> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_EVALUATION.replace(":id", applicationId)}`);
    return data?.evaluation;
};

// ─── Offers (Phase 5) ────────────────────────────────────────────────────────
export interface Offer {
    id: string; prefix?: string | null; applicationId: string;
    offeredDesignationId?: string | null; offeredDepartmentId?: string | null; offeredBranchId?: string | null;
    offeredEmployeeTypeConfigId?: string | null; offeredCtcInLpa?: number | string | null; proposedJoiningDate?: string | null;
    status: number; acceptanceStatus: string; offerLetterUrl?: string | null; notes?: string | null;
    expiresAt?: string | null; revisionCount: number;
}
export interface OfferPayload {
    applicationId?: string;
    offeredDesignationId?: string | null; offeredDepartmentId?: string | null; offeredBranchId?: string | null;
    offeredEmployeeTypeConfigId?: string | null; offeredCtcInLpa?: number | null; proposedJoiningDate?: string | null;
    expiresAt?: string | null; notes?: string | null; expectedRevisionCount?: number;
}

export const getApplicationOffer = async (applicationId: string): Promise<Offer | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_APPLICATION_OFFER.replace(":id", applicationId)}`);
    return data?.offer ?? null;
};
export const createOffer = async (payload: OfferPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_OFFER}`, payload);
    return data;
};
export const updateOffer = async (id: string, payload: OfferPayload) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.UPDATE_OFFER.replace(":id", id)}`, payload);
    return data;
};
export const submitOfferApproval = async (id: string, approverIds?: string[]) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.SUBMIT_OFFER_APPROVAL.replace(":id", id)}`, approverIds && approverIds.length ? { approverIds } : {});
    return data;
};
export const respondToOffer = async (id: string, acceptanceStatus: "ACCEPTED" | "DECLINED") => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.RESPOND_OFFER.replace(":id", id)}`, { acceptanceStatus });
    return data;
};

// ─── Job postings (Phase 6, admin) ───────────────────────────────────────────
export interface JobPosting {
    id: string; requisitionId: string; publicSlug: string; title: string;
    descriptionHtml?: string | null; location?: string | null; isRemote: boolean;
    employmentType?: string | null; isPublished: boolean; publishedAt?: string | null; expiresAt?: string | null;
    /** Publish this role's CTC band publicly. Off by default; the server redacts the
     *  numbers entirely when it is false, so they never reach the careers site. */
    showSalary?: boolean;
    requisition?: { id: string; title: string; prefix?: string | null } | null;
}
export interface PostingPayload {
    requisitionId?: string; title?: string; descriptionHtml?: string | null; location?: string | null;
    isRemote?: boolean; employmentType?: string | null; expiresAt?: string | null; isPublished?: boolean; isActive?: boolean;
    showSalary?: boolean;
}

export const getPostings = async (companyId?: string): Promise<JobPosting[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_POSTINGS}${listQuery({ companyId })}`);
    return data?.postings ?? [];
};
export const createPosting = async (payload: PostingPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_POSTING}`, payload);
    return data;
};
export const updatePosting = async (id: string, payload: PostingPayload) => {
    const { data } = await axios.put(`${API_BASE_URL}/${RECRUITMENT.UPDATE_POSTING.replace(":id", id)}`, payload);
    return data;
};
export const deletePosting = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${RECRUITMENT.DELETE_POSTING.replace(":id", id)}`);
    return data;
};

// ─── Overview / analytics dashboard ──────────────────────────────────────────
export interface RecruitmentOverview {
    kpis: {
        openRequisitions: number;
        activeCandidates: number;
        interviewsScheduled: number;
        offersOutstanding: number;
        hires: number;
        totalApplications: number;
        publishedPostings: number;
        avgTimeToHireDays: number | null;
    };
    funnel: Array<{ id: string; name: string; color?: string | null; count: number; sortOrder: number; isHiredOutcome: boolean; isRejectedOutcome: boolean }>;
    /** Cumulative conversion against the top stage — not stage-to-stage, which flatters. */
    funnelConversion: Array<{ id: string; name: string; count: number; pctOfTop: number | null }>;
    /** Dwell time and current backlog per stage. openCount/oldestOpenDays are the bottleneck. */
    stageDurations: Array<{
        statusId: string; name: string; color?: string | null; sortOrder: number;
        avgDays: number | null; samples: number; openCount: number; oldestOpenDays: number | null;
    }>;
    timeToHire: { count: number; avgDays: number | null; medianDays: number | null; p90Days: number | null };
    requisitionsByStatus: { pending: number; approved: number; rejected: number };
    candidatesBySource: Array<{ id: string; name: string; color?: string | null; count: number; hires: number; hireRatePct: number | null }>;
    offersByAcceptance: Array<{ status: string; count: number }>;
    /** The window the server actually applied, echoed so the UI cannot mislabel it. */
    range: { from: string | null; to: string | null };
}

export const getRecruitmentOverview = async (range: { from?: string; to?: string } = {}, companyId?: string): Promise<RecruitmentOverview | null> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_OVERVIEW}${listQuery({ ...range, companyId })}`);
    return data?.overview ?? null;
};
