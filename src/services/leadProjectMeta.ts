import axios from 'axios';

const BASE = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';
// All lead-project-meta routes live under the lead-project-companies router
const API = `${BASE}/api/lead-project-companies`;
// Auth is handled globally by the axios interceptor in AuthHelpers.ts (wise_tech_login key)

// ── LeadProjectStatus ─────────────────────────────────────────────────────────

export const getAllLeadProjectStatuses = () =>
    axios.get(`${API}/lead-project-statuses`).then(r => r.data);

export const createLeadProjectStatus = (data: any) =>
    axios.post(`${API}/lead-project-statuses`, data).then(r => r.data);

export const updateLeadProjectStatus = (id: string, data: any) =>
    axios.put(`${API}/lead-project-statuses/${id}`, data).then(r => r.data);

export const deleteLeadProjectStatus = (id: string) =>
    axios.delete(`${API}/lead-project-statuses/${id}`).then(r => r.data);

// ── LeadProjectMeta ───────────────────────────────────────────────────────────

export const getLeadProjectMeta = (leadId: string) =>
    axios.get(`${API}/leads/${leadId}/project-meta`).then(r => r.data);

export const upsertLeadProjectMeta = (leadId: string, data: any) =>
    axios.put(`${API}/leads/${leadId}/project-meta`, data).then(r => r.data);

// ── LeadTask ──────────────────────────────────────────────────────────────────

export const getLeadTasks = (leadId: string) =>
    axios.get(`${API}/leads/${leadId}/tasks`).then(r => r.data);

export const createLeadTask = (leadId: string, data: any) =>
    axios.post(`${API}/leads/${leadId}/tasks`, data).then(r => r.data);

export const updateLeadTask = (id: string, data: any) =>
    axios.put(`${API}/lead-tasks/${id}`, data).then(r => r.data);

export const deleteLeadTask = (id: string) =>
    axios.delete(`${API}/lead-tasks/${id}`).then(r => r.data);

// ── LeadAddress ───────────────────────────────────────────────────────────────

export const getLeadAddresses = (leadId: string) =>
    axios.get(`${API}/leads/${leadId}/addresses`).then(r => r.data);

export const createLeadAddress = (leadId: string, data: any) =>
    axios.post(`${API}/leads/${leadId}/addresses`, data).then(r => r.data);

export const updateLeadAddress = (id: string, data: any) =>
    axios.put(`${API}/lead-addresses/${id}`, data).then(r => r.data);

export const deleteLeadAddress = (id: string) =>
    axios.delete(`${API}/lead-addresses/${id}`).then(r => r.data);
