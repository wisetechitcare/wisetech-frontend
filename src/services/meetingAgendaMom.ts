import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const meetingsRoot = `${API_BASE_URL}/api/employee/meetings`;
const base = (meetingId: string) => `${meetingsRoot}/${meetingId}`;

export const getMeetingsWorkspaceSummary = async () => {
  const { data } = await axios.get(`${meetingsRoot}/workspace-summary`);
  return data;
};

export const getMeetingsAgendaHub = async () => {
  const { data } = await axios.get(`${meetingsRoot}/agenda-hub`);
  return data;
};

export const getCompanyAgendaStatuses = async () => {
  const { data } = await axios.get(`${meetingsRoot}/agenda-statuses`);
  return data;
};

export const createCompanyAgendaStatus = async (payload: {
  name: string;
  color?: string;
  sortOrder?: number;
}) => {
  const { data } = await axios.post(`${meetingsRoot}/agenda-statuses`, payload);
  return data;
};

export const updateCompanyAgendaStatus = async (
  statusId: string,
  payload: { name?: string; color?: string; sortOrder?: number; isActive?: boolean },
) => {
  const { data } = await axios.patch(`${meetingsRoot}/agenda-statuses/${statusId}`, payload);
  return data;
};

export const deleteCompanyAgendaStatus = async (statusId: string) => {
  const { data } = await axios.delete(`${meetingsRoot}/agenda-statuses/${statusId}`);
  return data;
};

export const getCompanyMeetingPurposes = async () => {
  const { data } = await axios.get(`${meetingsRoot}/purposes`);
  return data;
};

export const createCompanyMeetingPurpose = async (payload: {
  name: string;
  sortOrder?: number;
  requiresOther?: boolean;
}) => {
  const { data } = await axios.post(`${meetingsRoot}/purposes`, payload);
  return data;
};

export const updateCompanyMeetingPurpose = async (
  purposeId: string,
  payload: { name?: string; sortOrder?: number; isActive?: boolean; requiresOther?: boolean },
) => {
  const { data } = await axios.patch(`${meetingsRoot}/purposes/${purposeId}`, payload);
  return data;
};

export const deleteCompanyMeetingPurpose = async (purposeId: string) => {
  const { data } = await axios.delete(`${meetingsRoot}/purposes/${purposeId}`);
  return data;
};

export const getMeetingDetail = async (meetingId: string) => {
  const { data } = await axios.get(`${base(meetingId)}/detail`);
  return data;
};

export const updateMeetingPurpose = async (
  meetingId: string,
  payload: { purposeCodes?: string[]; purposeOtherText?: string | null },
) => {
  const { data } = await axios.patch(`${base(meetingId)}/purpose`, payload);
  return data;
};

export const getAgendaItems = async (meetingId: string) => {
  const { data } = await axios.get(`${base(meetingId)}/agenda-items`);
  return data;
};

export const createAgendaItem = async (meetingId: string, payload: Record<string, unknown>) => {
  const { data } = await axios.post(`${base(meetingId)}/agenda-items`, payload);
  return data;
};

export const createAgendaItemsBulk = async (
  meetingId: string,
  items: Record<string, unknown>[],
) => {
  const { data } = await axios.post(`${base(meetingId)}/agenda-items/bulk`, { items });
  return data;
};

export const updateAgendaItem = async (
  meetingId: string,
  itemId: string,
  payload: Record<string, unknown>,
) => {
  const { data } = await axios.patch(`${base(meetingId)}/agenda-items/${itemId}`, payload);
  return data;
};

export const deleteAgendaItem = async (meetingId: string, itemId: string) => {
  const { data } = await axios.delete(`${base(meetingId)}/agenda-items/${itemId}`);
  return data;
};

/** Exactly these items end up in the MoM; every other agenda item is taken out. */
export const convertAgendaToMom = async (meetingId: string, itemIds: string[]) => {
  const { data } = await axios.post(`${base(meetingId)}/agenda-items/convert-to-mom`, { itemIds });
  return data;
};

/** Turn MoM lines into tasks for their assignees; omit `itemIds` for every ready line. */
export const assignMomTasks = async (meetingId: string, itemIds?: string[]) => {
  const { data } = await axios.post(`${base(meetingId)}/agenda-items/assign-tasks`, itemIds ? { itemIds } : {});
  return data;
};

export const getMeetingMinutes = async (meetingId: string) => {
  const { data } = await axios.get(`${base(meetingId)}/minutes`);
  return data;
};

export const createMeetingMinutesDraft = async (meetingId: string) => {
  const { data } = await axios.post(`${base(meetingId)}/minutes/draft`);
  return data;
};

export const updateMeetingMinutesDraft = async (
  meetingId: string,
  payload: Record<string, unknown>,
) => {
  const { data } = await axios.patch(`${base(meetingId)}/minutes`, payload);
  return data;
};

const messageFromBlobError = async (err: any): Promise<string | null> => {
  const blob = err?.response?.data;
  if (!(blob instanceof Blob)) return null;
  try {
    const parsed = JSON.parse(await blob.text());
    return parsed?.message || null;
  } catch {
    return null;
  }
};

export const downloadMeetingMinutesPdf = async (meetingId: string) => {
  try {
    const response = await axios.get(`${base(meetingId)}/minutes/pdf`, {
      responseType: 'blob',
    });
    const contentType = String(response.headers?.['content-type'] || '');
    if (contentType.includes('application/json')) {
      const text = await (response.data as Blob).text();
      let message = 'Could not download PDF';
      try {
        message = JSON.parse(text)?.message || message;
      } catch {
        /* keep default */
      }
      throw new Error(message);
    }
    return response;
  } catch (err: any) {
    const message = await messageFromBlobError(err);
    if (message) {
      const wrapped = new Error(message);
      (wrapped as any).response = { data: { message } };
      throw wrapped;
    }
    throw err;
  }
};
