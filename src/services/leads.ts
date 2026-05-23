import { CLIENT_COMPANIES } from "@constants/api-endpoint";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export const getAllLeads = async (params?: { page?: number; pageSize?: number })=> {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_LEADS}`;
    const response = await axios.get(endpoint);
    
    return response;
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
};

/**
 * Get lead by ID
 */
export const getLeadById = async (id: string) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_LEAD_BY_ID.replace(':id', id)}`;
    const response = await axios.get(endpoint);
    return response;
  } catch (error) {
    console.error(`Error fetching lead with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new lead
 */

export const createLead = async (leadData: any) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_LEAD}`;
    const {data} = await axios.post(endpoint, leadData);
    return data;
  } catch (error: any) {
    console.error('Error creating lead - status:', error?.response?.status);
    console.error('Error creating lead - data:', error?.response?.data);
    console.error('Error creating lead - message:', error?.response?.data?.message || error?.message);
    throw error.response?.data || error;
  }
};



/**
 * Update an existing lead
 */
export const updateLead = async (id: string, leadData: any) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_LEAD.replace(':id', id)}`;
    const response = await axios.put(endpoint, leadData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error: any) {
    console.error(`Error updating lead with ID ${id}:`, error);
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error status:', error.response.status);
      throw error.response.data;
    } else if (error.request) {
      console.error('No response received:', error.request);
      throw new Error('No response received from server');
    } else {
      console.error('Error setting up request:', error.message);
      throw error;
    }
  }
};

/**
 * Delete a lead
 */
export const deleteLead = async (id: string) => {
  try {
    // const endpoint = `${API_BASE_URL}/lead-project-companies/client-companies/leads/${id}`;
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_LEAD.replace(':id', id)}`;
    await axios.delete(endpoint);
  } catch (error) {
    console.error(`Error deleting lead with ID ${id}:`, error);
    throw error;
  }
};

// Additional Details Services

/**
 * Get all additional details
 */
export const getAllAdditionalDetails = async () => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_ADDITIONAL_DETAILS}`;
    const { data } = await axios.get(endpoint);
    return data;
  } catch (err) {
    console.error('Error fetching additional details:', err);
    throw err;
  }
};

/**
 * Get additional details by ID
 */
export const getAdditionalDetailsById = async (id: string) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ADDITIONAL_DETAILS_BY_ID.replace(':id', id)}`;
    const { data } = await axios.get(endpoint);
    return data;
  } catch (err) {
    console.error(`Error fetching additional details with ID ${id}:`, err);
    throw err;
  }
};

/**
 * Create a single additional detail
 */
export const createAdditionalDetails = async (payload: any) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_ADDITIONAL_DETAILS}`;
    const { data } = await axios.post(endpoint, payload);
    return data;
  } catch (err) {
    console.error('Error creating additional details:', err);
    throw err;
  }
};

/**
 * Update a single additional detail
 */
export const updateAdditionalDetails = async (id: string, payload: any) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_ADDITIONAL_DETAILS.replace(':id', id)}`;
    const { data } = await axios.put(endpoint, payload);
    return data;
  } catch (err) {
    console.error(`Error updating additional details with ID ${id}:`, err);
    throw err;
  }
};

/**
 * Get all additional details for a lead
 */
export const getAdditionalDetailsByLeadId = async (leadId: string) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ADDITIONAL_DETAILS_BY_LEAD_ID.replace(':leadId', leadId)}`;
    const { data } = await axios.get(endpoint);
    return data;
  } catch (err) {
    console.error(`Error fetching additional details for lead with ID ${leadId}:`, err);
    throw err;
  }
};

/**
 * Create multiple additional details for a lead
 */
export const createAdditionalDetailsBulk = async (payload: { leadId: string, details: any[] }) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_ADDITIONAL_DETAILS_MANY}`;
    const { data } = await axios.post(endpoint, payload);
    return data;
  } catch (err) {
    console.error('Error creating bulk additional details:', err);
    throw err;
  }
};

/**
 * Update multiple additional details for a lead
 */
export const updateAdditionalDetailsBulk = async (leadId: string, payload: { details: any[] }) => {
  try {
    const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_ADDITIONAL_DETAILS_MANY.replace(':leadId', leadId)}`;
    const { data } = await axios.put(endpoint, payload);
    return data;
  } catch (err) {
    console.error(`Error updating bulk additional details for lead with ID ${leadId}:`, err);
    throw err;
  }
};

// Get All Lead Cancellation Reasons
export const getAllLeadCancellationReasons = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_LEAD_CANCELLATION_REASONS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Lead Cancellation Reason By Id
export const getLeadCancellationReasonById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_LEAD_CANCELLATION_REASON_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Lead Cancellation Reason
export const createLeadCancellationReason = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_LEAD_CANCELLATION_REASON}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Lead Cancellation Reason
export const updateLeadCancellationReason = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_LEAD_CANCELLATION_REASON.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

async function parseExportAxiosError(error: any): Promise<never> {
    const data = error?.response?.data;
    if (data instanceof Blob) {
        try {
            const text = await data.text();
            const json = JSON.parse(text);
            throw new Error(json.message || text || 'Export failed');
        } catch (parseErr: any) {
            if (parseErr?.message && parseErr.message !== 'Export failed') throw parseErr;
        }
    }
    throw new Error(
        error?.response?.data?.message ||
        error?.message ||
        'Export failed',
    );
}

export const exportLeadDocx = async (leadId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/docx`;
        const { data } = await axios.post(endpoint, {
            ...payload,
            lead_id: leadId,
            templateId: payload.proposalTemplateId || payload.templateId,
            templateBase64: payload.templateBase64 || payload.customTemplate,
            userId: payload.userId,
            edited_data: payload,
        }, { responseType: 'blob' });
        return data;
    } catch (error) {
        console.error('Error exporting lead as DOCX:', error);
        return parseExportAxiosError(error);
    }
}

/** Generate and store DOCX+PDF in S3/DMS without triggering a browser download. */
export const exportLeadDocxToCloud = async (leadId: string, payload: any) => {
    await exportLeadDocx(leadId, {
        ...payload,
        destination: 'cloud',
    });
}

export const exportLeadPdfToCloud = async (leadId: string, payload: any) => {
    await exportLeadPdf(leadId, {
        ...payload,
        destination: 'cloud',
        fileName: payload.fileName?.replace(/\.docx$/i, '.pdf'),
    });
}

/** One docx export generates both files; pdf pass ensures DMS has both URLs synced. */
export const exportLeadProposalToCloud = async (leadId: string, payload: any) => {
    const base = { ...payload, destination: 'cloud' };
    await exportLeadDocx(leadId, base);
    // exportLeadDocx generates BOTH PDF and DOCX in the backend and correctly populates 
    // the ProposalGeneratedDocument table with both URLs, so a second request is redundant.
}

export const exportLeadPdf = async (leadId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/pdf`;
        const { data } = await axios.post(endpoint, {
            ...payload,
            lead_id: leadId,
            templateId: payload.proposalTemplateId || payload.templateId,
            templateBase64: payload.templateBase64 || payload.customTemplate,
            userId: payload.userId,
            edited_data: payload,
        }, { responseType: 'blob' });
        return data;
    } catch (error) {
        console.error('Error exporting lead as PDF:', error);
        throw error;
    }
}

export const getProposalConfigurations = async () => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/configurations`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (error) {
        console.error('Error fetching proposal configurations:', error);
        throw error;
    }
}

export const getProposalRules = async (templateId: string, area: string | number) => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/rules?templateId=${templateId}&area=${area}`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (error) {
        console.error('Error fetching proposal rules:', error);
        throw error;
    }
}

export const getAvailableExportFields = async () => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/available-fields`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (error) {
        console.error('Error fetching available export fields:', error);
        throw error;
    }
}

export const saveProposalConfiguration = async (config: any, templateBase64?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/configurations`;
        const { data } = await axios.post(endpoint, { config, templateBase64 });
        return data;
    } catch (error) {
        console.error('Error saving proposal configuration:', error);
        throw error;
    }
}

export const deleteProposalConfiguration = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/api/leads/export/configurations/${id}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        console.error('Error deleting proposal configuration:', error);
        throw error;
    }
}
