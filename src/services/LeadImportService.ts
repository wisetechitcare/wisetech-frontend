import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export interface PreviewRow {
  title: string;
  prefix?: string | null;
  companyName?: string | null;
  statusName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  service?: string | null;
  assignedTo?: string | null;
  createdBy?: string | null;
  editedBy?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  area?: number | null;
  rate?: number | null;
  cost?: number | null;
  contactName?: string | null;
  contactPhone?: string | null;
  poNumber?: string | null;
  poStatus?: string | null;
  inquiryDate?: string | Date | null;
  importAction: string;
  isNewCompany: boolean;
  isNewStatus: boolean;
  isNewCategory: boolean;
  isNewSubCategory: boolean;
  isNewService: boolean;
  existing: {
    title?: string;
    companyName?: string;
    statusName?: string;
    assignedTo?: string;
    category?: string;
    subcategory?: string;
    country?: string;
    state?: string;
    city?: string;
    area?: number;
    rate?: number;
    cost?: number;
    poNumber?: string;
  } | null;
}

export interface ImportPreviewResult {
  validRows: PreviewRow[];
  errors: { row: number; errors: string[]; solution?: string }[];
  detectedHeaders: string[];
  newEntities: {
    companies: string[];
    statuses: string[];
    projects: string[];
    categories: string[];
    subCategories: string[];
    services: string[];
  };
  newEntitySummary: string[];
}

export interface ImportExecuteResult {
  count: number;
  created: number;
  updated: number;
}

export const previewLeadImport = async (file: File): Promise<ImportPreviewResult> => {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size exceeds 10MB limit.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/lead-import/preview`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'Failed to preview import';
      throw new Error(message);
    }
    throw error;
  }
};

export const executeLeadImport = async (rows: PreviewRow[]): Promise<ImportExecuteResult> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/lead-import/execute`, { rows });
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message || 'Failed to execute import';
      throw new Error(message);
    }
    throw error;
  }
};
