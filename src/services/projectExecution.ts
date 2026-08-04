import axios from "axios";
import { PROJECT_EXECUTION } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Project Execution — stages and their deliverables.
 *
 * Lead-as-master: `projectId` is the LEAD id, matching every other project-scoped call.
 * Stages are read-only, so there is deliberately no create/rename/delete/reorder for them.
 */

/** A deliverable inside a project stage. `isCustom` distinguishes a row the team added
 *  from one snapshotted off the payment plan when the project was created. */
export interface ProjectDeliverable {
  id: string;
  projectStageId: string;
  paymentPlanStageDeliverableId?: string | null;
  name: string;
  description?: string | null;
  sortOrder: number;
  isCustom: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** A project stage. `amount` is derived server-side (percentage of the commercial total). */
export interface ProjectStage {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  sortOrder: number;
  paymentPlanStageId?: string | null;
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

export const reorderProjectDeliverables = async (
  stageId: string,
  orderedIds: string[],
): Promise<ProjectDeliverable[]> => {
  const endpoint = `${API_BASE_URL}/${PROJECT_EXECUTION.REORDER_STAGE_DELIVERABLES.replace(":stageId", stageId)}`;
  const { data } = await axios.put(endpoint, { orderedIds });
  return data?.deliverables ?? [];
};
