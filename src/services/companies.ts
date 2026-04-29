import axios from "axios";
import { CLIENT_COMPANIES, LEAD_PROJECT_COMPANY, COMPANY_SERVICES, COMPANY } from "@constants/api-endpoint";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// Get All Company Types
export const getAllCompanyTypes = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_COMPANY_TYPES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Company Type By Id
export const getCompanyTypeById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_COMPANY_TYPE_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Company Type
export const createCompanyType = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_COMPANY_TYPE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Company Type
export const updateCompanyType = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_COMPANY_TYPE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Company Type
export const deleteCompanyType = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_COMPANY_TYPE.replace(':id', id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Contact Role Types
export const getAllContactRoleTypes = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_CONTACT_ROLE_TYPES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Contact Role Type By Id
export const getContactRoleTypeById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_CONTACT_ROLE_TYPE_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Contact Role Type
export const createContactRoleType = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_CONTACT_ROLE_TYPE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Contact Role Type
export const updateContactRoleType = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_CONTACT_ROLE_TYPE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Contact Role Type
export const deleteContactRoleType = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_CONTACT_ROLE_TYPE.replace(':id', id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Client Company
export const createClientCompany = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_CLIENT_COMPANY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Client Company
export const updateClientCompany = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_CLIENT_COMPANY.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}


// Delete Client Company
export const deleteClientCompany = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_CLIENT_COMPANY.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Client Companies
export const getAllClientCompanies = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_CLIENT_COMPANIES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Client Company By Id
export const getClientCompanyById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_CLIENT_COMPANY_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Sub Companies
export const getAllSubCompanies = async () => {
    try {
        const finalEndpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_SUB_COMPANIES}`;
        const { data } = await axios.get(finalEndpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Client Contacts
export const getAllClientContacts = async (params: any = {}) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_CONTACTS}`;
        const { data } = await axios.get(endpoint, { params });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Client Contact By Id
export const getClientContactById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_CONTACT_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Client Contact
export const createClientContact = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_CONTACT}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Client Contact
export const updateClientContact = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_CONTACT.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Client Contact
export const deleteClientContact = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_CONTACT.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Client Contacts By Company Id
export const getClientContactsByCompanyId = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_CONTACTS_BY_COMPANY_ID.replace(':companyId', companyId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All rating factors
export const getAllRatingFactors = async (startDate?: string, endDate?: string) => {
    try {
        const endpoint = (startDate && endDate) ? `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_RATING_FACTORS}?startDate=${startDate}&endDate=${endDate}` : `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_RATING_FACTORS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Rating Factor By Id
export const getRatingFactorById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_RATING_FACTOR_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Rating Factor
export const createRatingFactor = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_RATING_FACTOR}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Rating Factor
export const updateRatingFactor = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_RATING_FACTOR.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Rating Factor
export const deleteRatingFactor = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_RATING_FACTOR.replace(':id', id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

export const getTopCompaniesByRatingFactor = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_TOP_COMPANIES_BY_RATING_FACTOR}`.replace(':id', id);
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getTopCompaniesByAllRatingFactors = async (startDate: string, endDate: string) => {
    try {
        const endpoint = (startDate && endDate) ? `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_TOP_COMPANIES_BY_ALL_RATING_FACTOR}?startDate=${startDate}&endDate=${endDate}` : `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_TOP_COMPANIES_BY_ALL_RATING_FACTOR}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// GET company count by type 
export const getCompanyCountByType = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_COMPANY_COUNT_BY_TYPE}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get contact count by roles
export const getContactCountByRoles = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_CONTACT_COUNT_BY_ROLES}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get company count by status
export const getCompanyCountByStatus = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_COMPANY_COUNT_BY_STATUS}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

export const getCompaniesByLocationAndStatus = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_COMPANY_COUNT_BY_LOCATION_AND_STATUS}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}

export const getUpcomingContactsBirthdays = async (startDate?: string, endDate?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_UPCOMING_CONTACTS_BIRTHDAYS}`;
        const { data } = await axios.get(endpoint, {
            params: {
                startDate,
                endDate
            }
        });
        return data;
    } catch (err) {
        throw err;
    }
}


// Get projects by contact id
export const getProjectsByContactId = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_PROJECTS_BY_CONTACT_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}


export const updateCompanyRating = async (data: {
    companyId: string;
    factorId: string;
    rating: number;
    ratedById?: string;
  }) => {
    const { companyId, ...body } = data; // remove companyId from body

    const response = await axios.put(
      `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_COMPANY_RATING_BY_COMPANY_ID.replace(":companyId", companyId)}`,
      body // body = { factorId, rating, ratedById }
    );
    return response.data;
  };

// Get All Contact Statuses
export const getAllContactStatuses = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_ALL_CONTACT_STATUSES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Contact Status By Id
export const getContactStatusById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.GET_CONTACT_STATUS_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Contact Status
export const createContactStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.CREATE_CONTACT_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Contact Status
export const updateContactStatus = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.UPDATE_CONTACT_STATUS.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Contact Status
export const deleteContactStatus = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_CONTACT_STATUS.replace(':id', id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Company Services
export const getAllCompanyServices = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY_SERVICES.GET_ALL}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

// Create Company Service
export const createCompanyService = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY_SERVICES.CREATE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

// Update Company Service
export const updateCompanyService = async (serviceId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY_SERVICES.UPDATE.replace(':id', serviceId)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

// Delete Company Service
export const deleteCompanyService = async (serviceId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY_SERVICES.DELETE.replace(':id', serviceId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}
