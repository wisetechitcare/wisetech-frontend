import axios from "axios";
import { PROJECT_EXECUTION } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Project Execution — stages and their deliverables.
 *
 * Lead-as-master: `projectId` is the LEAD id, matching every other project-scoped call.
 * Stages are read-only, so there is deliberately no create/rename/delete/reorder for them.
 */

/** Execution state of a deliverable. A stage has no state of its own — it is derived
 *  from these, which is why the same three values describe both. */
export type DeliverableStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

/** A deliverable inside a project stage. `isCustom` distinguishes a row the team added
 *  from one snapshotted off the payment plan when the project was created.
 *
 *  `startedAt` / `completedAt` / `completedById` are DERIVED server-side from status
 *  changes — never send them; they are read-only here. */
export interface ProjectDeliverable {
  id: string;
  projectStageId: string;
  paymentPlanStageDeliverableId?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  isCustom: boolean;
  status: DeliverableStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  completedById?: string | null;
  /** Resolved display name of the completer, or null. */
  completedByName?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Stage rollup. Always computed from the deliverables — never stored, never posted. */
export interface StageProgress {
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  /** 0-100, 2dp. 0 for a stage with no deliverables. */
  completionPercentage: number;
  status: DeliverableStatus;
}

/** A project stage. `amount` is derived server-side (percentage of the commercial total). */
export interface ProjectStage {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  sortOrder: number;
  paymentPlanStageId?: string | null;
  progress: StageProgress;
  deliverables: ProjectDeliverable[];
}

export interface DeliverablePayload {
  name?: string;
  description?: string | null;
}

export const getProjectStages = async (projectId: string): Promise<ProjectStage[]> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.GET_PROJECT_STAGES.replace(":projectId", projectId)}`;
  const { data } = await axios.get(endpoint);
  return data?.stages ?? [];
};

export const createProjectDeliverable = async (
  projectId: string,
  stageId: string,
  payload: DeliverablePayload,
): Promise<ProjectDeliverable> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.CREATE_STAGE_DELIVERABLE
    .replace(":projectId", projectId)
    .replace(":stageId", stageId)}`;
  const { data } = await axios.post(endpoint, payload);
  return data?.deliverable;
};

export const updateProjectDeliverable = async (
  deliverableId: string,
  payload: DeliverablePayload,
): Promise<ProjectDeliverable> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.UPDATE_DELIVERABLE.replace(":deliverableId", deliverableId)}`;
  const { data } = await axios.patch(endpoint, payload);
  return data?.deliverable;
};

export const deleteProjectDeliverable = async (deliverableId: string) => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.DELETE_DELIVERABLE.replace(":deliverableId", deliverableId)}`;
  const { data } = await axios.delete(endpoint);
  return data;
};

/**
 * Move a deliverable to a new status. The body carries the status ONLY — startedAt,
 * completedAt and completedById are derived server-side from the transition, and the
 * completer comes from the session. Returns the stage's recomputed progress alongside,
 * so the caller repaints the bar without a second request.
 */
export const updateDeliverableStatus = async (
  deliverableId: string,
  status: DeliverableStatus,
): Promise<{ deliverable: ProjectDeliverable; progress: StageProgress }> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.UPDATE_DELIVERABLE_STATUS.replace(":deliverableId", deliverableId)}`;
  const { data } = await axios.patch(endpoint, { status });
  return { deliverable: data?.deliverable, progress: data?.progress };
};

export const updateDeliverableRemarks = async (
  deliverableId: string,
  remarks: string | null,
): Promise<ProjectDeliverable> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.UPDATE_DELIVERABLE_REMARKS.replace(":deliverableId", deliverableId)}`;
  const { data } = await axios.patch(endpoint, { remarks });
  return data?.deliverable;
};

/** Progress for a single stage. The stages list already embeds this — use it only when
 *  polling one stage in isolation. */
export const getStageProgress = async (projectId: string, stageId: string): Promise<StageProgress> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.GET_STAGE_PROGRESS
    .replace(":projectId", projectId)
    .replace(":stageId", stageId)}`;
  const { data } = await axios.get(endpoint);
  return data?.progress;
};

export const reorderProjectDeliverables = async (
  stageId: string,
  orderedIds: string[],
): Promise<ProjectDeliverable[]> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.REORDER_STAGE_DELIVERABLES.replace(":stageId", stageId)}`;
  const { data } = await axios.put(endpoint, { orderedIds });
  return data?.deliverables ?? [];
};
