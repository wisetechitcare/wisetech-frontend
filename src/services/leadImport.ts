import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export interface ImportPreviewResult {
  validRows: any[];
  errors: { row: number; errors: string[]; solution?: string }[];
  detectedHeaders: string[];
  newEntities: {
    companies: string[];
    statuses: string[];
    projects: string[];
  };
}

/**
 * Preview lead import from CSV
 */
export const previewLeadImport = async (file: File): Promise<ImportPreviewResult> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = `${API_BASE_URL}/api/lead-import/preview`;
    const { data } = await axios.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  } catch (error: any) {
    console.error('Error previewing lead import:', error);
    throw error.response?.data || error;
  }
};

/**
 * Execute lead import
 */
export const executeLeadImport = async (rows: any[]): Promise<{ count: number }> => {
  try {
    const endpoint = `${API_BASE_URL}/api/lead-import/execute`;
    const { data } = await axios.post(endpoint, { rows });
    return data;
  } catch (error: any) {
    console.error('Error executing lead import:', error);
    throw error.response?.data || error;
  }
};
