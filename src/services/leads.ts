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
    throw error.response.data;
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
