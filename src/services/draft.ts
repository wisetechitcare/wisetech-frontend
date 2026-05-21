import axios from 'axios';

const API_BASE = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

export interface DraftPayload {
    entityType: 'lead' | 'project';
    entityId: string;
    currentStep?: number;
    completionPercentage?: number;
    formData?: Record<string, any>;
    uiState?: Record<string, any>;
}

export const draftApi = {
    save: (payload: DraftPayload) =>
        axios.post(`${API_BASE}/api/draft/save`, payload),

    get: (entityType: 'lead' | 'project', entityId: string) =>
        axios.get(`${API_BASE}/api/draft/${entityType}/${entityId}`),

    delete: (entityType: 'lead' | 'project', entityId: string) =>
        axios.delete(`${API_BASE}/api/draft/${entityType}/${entityId}`),
};
