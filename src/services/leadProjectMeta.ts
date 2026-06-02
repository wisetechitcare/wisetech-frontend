import axios from 'axios';

const BASE = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';
const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

// ── LeadProjectStatus ─────────────────────────────────────────────────────────

export const getAllLeadProjectStatuses = () =>
    axios.get(`${BASE}/lead-project-statuses`, auth()).then(r => r.data);

export const createLeadProjectStatus = (data: any) =>
    axios.post(`${BASE}/lead-project-statuses`, data, auth()).then(r => r.data);

export const updateLeadProjectStatus = (id: string, data: any) =>
    axios.put(`${BASE}/lead-project-statuses/${id}`, data, auth()).then(r => r.data);

export const deleteLeadProjectStatus = (id: string) =>
    axios.delete(`${BASE}/lead-project-statuses/${id}`, auth()).then(r => r.data);

// ── LeadProjectMeta ───────────────────────────────────────────────────────────

export const getLeadProjectMeta = (leadId: string) =>
    axios.get(`${BASE}/leads/${leadId}/project-meta`, auth()).then(r => r.data);

export const upsertLeadProjectMeta = (leadId: string, data: any) =>
    axios.put(`${BASE}/leads/${leadId}/project-meta`, data, auth()).then(r => r.data);

// ── LeadTask ──────────────────────────────────────────────────────────────────

export const getLeadTasks = (leadId: string) =>
    axios.get(`${BASE}/leads/${leadId}/tasks`, auth()).then(r => r.data);

export const createLeadTask = (leadId: string, data: any) =>
    axios.post(`${BASE}/leads/${leadId}/tasks`, data, auth()).then(r => r.data);

export const updateLeadTask = (id: string, data: any) =>
    axios.put(`${BASE}/lead-tasks/${id}`, data, auth()).then(r => r.data);

export const deleteLeadTask = (id: string) =>
    axios.delete(`${BASE}/lead-tasks/${id}`, auth()).then(r => r.data);

// ── LeadAddress ───────────────────────────────────────────────────────────────

export const getLeadAddresses = (leadId: string) =>
    axios.get(`${BASE}/leads/${leadId}/addresses`, auth()).then(r => r.data);

export const createLeadAddress = (leadId: string, data: any) =>
    axios.post(`${BASE}/leads/${leadId}/addresses`, data, auth()).then(r => r.data);

export const updateLeadAddress = (id: string, data: any) =>
    axios.put(`${BASE}/lead-addresses/${id}`, data, auth()).then(r => r.data);

export const deleteLeadAddress = (id: string) =>
    axios.delete(`${BASE}/lead-addresses/${id}`, auth()).then(r => r.data);
