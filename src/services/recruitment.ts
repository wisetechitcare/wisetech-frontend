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
export const getRequisitions = async (): Promise<JobRequisition[]> => {
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_REQUISITIONS}`);
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
    isActive: boolean; revisionCount: number; createdAt: string;
}

export interface ApplicantPayload {
    firstName: string; lastName?: string | null; email: string; phone?: string | null;
    currentEmployer?: string | null; currentTitle?: string | null; totalExperienceMonths?: number | null;
    expectedCtcInLpa?: number | null; noticePeriodDays?: number | null; sourceId?: string | null;
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
export const getApplications = async (filters: { requisitionId?: string; statusId?: string; search?: string } = {}): Promise<Application[]> => {
    const params = new URLSearchParams();
    if (filters.requisitionId) params.set("requisitionId", filters.requisitionId);
    if (filters.statusId) params.set("statusId", filters.statusId);
    if (filters.search) params.set("search", filters.search);
    const qs = params.toString();
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_APPLICATIONS}${qs ? `?${qs}` : ""}`);
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

// ─── Applicants ──────────────────────────────────────────────────────────────
export const getApplicants = async (search?: string): Promise<Applicant[]> => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const { data } = await axios.get(`${API_BASE_URL}/${RECRUITMENT.GET_ALL_APPLICANTS}${qs}`);
    return data?.applicants ?? [];
};

export const createApplicant = async (payload: ApplicantPayload) => {
    const { data } = await axios.post(`${API_BASE_URL}/${RECRUITMENT.CREATE_APPLICANT}`, payload);
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
