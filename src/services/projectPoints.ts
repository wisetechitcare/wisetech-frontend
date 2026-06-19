import axios from "axios";
import { LEAD_PROJECT_COMPANY } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export type ProjectPointFieldType =
    | "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "DROPDOWN" | "BOOLEAN";

export interface ProjectPointMaster {
    id: string;
    title: string;
    defaultHeading?: string | null;
    defaultDescription?: string | null;
    fieldType: ProjectPointFieldType;
    options?: any;
    isRequired: boolean;
    placeholder?: string | null;
    helpText?: string | null;
    defaultValue?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ProjectPointValue {
    id?: string;
    leadId?: string | null;
    projectId?: string | null;
    pointMasterId?: string | null;
    heading?: string | null;
    description?: string | null;
    sortOrder?: number;
    pointMaster?: ProjectPointMaster | null;
}

// ── Master templates (config) ────────────────────────────────────────────────
export const getAllProjectPointMasters = async () => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_PROJECT_POINT_MASTERS}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const getActiveProjectPointMasters = async () => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ACTIVE_PROJECT_POINT_MASTERS}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const createProjectPointMaster = async (payload: Partial<ProjectPointMaster>) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_PROJECT_POINT_MASTER}`;
    const { data } = await axios.post(endpoint, payload);
    return data;
};

export const updateProjectPointMaster = async (id: string, payload: Partial<ProjectPointMaster>) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_PROJECT_POINT_MASTER.replace(":id", id)}`;
    const { data } = await axios.put(endpoint, payload);
    return data;
};

export const deleteProjectPointMaster = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_PROJECT_POINT_MASTER.replace(":id", id)}`;
    const { data } = await axios.delete(endpoint);
    return data;
};

export const reorderProjectPointMasters = async (orderedIds: string[]) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.REORDER_PROJECT_POINT_MASTERS}`;
    const { data } = await axios.put(endpoint, { orderedIds });
    return data;
};

// ── Per-entity values (form) ─────────────────────────────────────────────────
export const getLeadProjectPoints = async (leadId: string) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_PROJECT_POINTS.replace(":leadId", leadId)}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const saveLeadProjectPoints = async (leadId: string, points: ProjectPointValue[]) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.SAVE_LEAD_PROJECT_POINTS.replace(":leadId", leadId)}`;
    const { data } = await axios.put(endpoint, { points });
    return data;
};

export const getProjectProjectPoints = async (projectId: string) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECT_PROJECT_POINTS.replace(":projectId", projectId)}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const saveProjectProjectPoints = async (projectId: string, points: ProjectPointValue[]) => {
    const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.SAVE_PROJECT_PROJECT_POINTS.replace(":projectId", projectId)}`;
    const { data } = await axios.put(endpoint, { points });
    return data;
};

/**
 * Build the initial form rows for a NEW lead/project from the active master templates.
 * Each becomes an editable instance row (pointMasterId set, heading/description prefilled).
 */
export const buildInitialPointRowsFromMasters = (masters: ProjectPointMaster[]): ProjectPointValue[] =>
    (masters || [])
        .filter((m) => m.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((m, idx) => ({
            pointMasterId: m.id,
            heading: m.defaultHeading ?? m.title ?? "",
            description: m.defaultDescription ?? "",
            sortOrder: idx,
        }));
