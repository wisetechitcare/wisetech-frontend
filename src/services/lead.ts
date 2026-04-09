import axios from "axios";
import { LEAD_PROJECT_COMPANY, CLIENT_COMPANIES } from "@constants/api-endpoint";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// Get All Lead Status
export const getAllLeadStatus = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_LEAD_STATUSES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Lead Status By Id
export const getLeadStatusById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_STATUS_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Lead Status
export const createLeadStatus = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_LEAD_STATUS}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Lead Status
export const updateLeadStatus = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_LEAD_STATUS.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Lead Status
export const deleteLeadStatus = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_LEAD_STATUS.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Lead Referral Type
export const getAllLeadReferralType = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_LEAD_REFERRAL_TYPES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Lead Referral Type By Id
export const getLeadReferralTypeById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_REFERRAL_TYPE_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Lead Referral Type
export const createLeadReferralType = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_LEAD_REFERRAL_TYPE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Lead Referral Type
export const updateLeadReferralType = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_LEAD_REFERRAL_TYPE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Lead Referral Type
export const deleteLeadReferralType = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_LEAD_REFERRAL_TYPE.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Lead Direct Source
export const getAllLeadDirectSource = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_LEAD_DIRECT_SOURCES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Lead Direct Source By Id
export const getLeadDirectSourceById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_DIRECT_SOURCE_BY_ID}?id=${id}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Lead Direct Source
export const createLeadDirectSource = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_LEAD_DIRECT_SOURCE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Lead Direct Source
export const updateLeadDirectSource = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_LEAD_DIRECT_SOURCE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Lead Direct Source
export const deleteLeadDirectSource = async (id: string, targetId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_LEAD_DIRECT_SOURCE.replace(':id', id)}`;
        const payload = targetId ? { targetId } : {};
        const { data } = await axios.delete(endpoint, { data: payload });
        return data;
    } catch (err) {
        throw err;
    }
}

// Get All Branches
export const getAllClientBranches = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_LEAD_BRANCHES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Branch By Id
export const getClientBranchById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_BRANCH_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Create Branch
export const createClientBranch = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.CREATE_LEAD_BRANCH}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Update Branch
export const updateClientBranch = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.UPDATE_LEAD_BRANCH.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
}

// Delete Branch
export const deleteClientBranch = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.DELETE_LEAD_BRANCH.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Branches By Company Id
export const getClientBranchesByCompanyId = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEAD_BRANCHES_BY_COMPANY_ID.replace(':companyId', companyId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Company Id
export const getLeadsByCompanyId = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_COMPANY_ID.replace(':companyId', companyId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Status Analytics
export const getLeadsByStatusAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_STATUS_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Service Analytics
export const getLeadsByServiceAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_SERVICE_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Project Category Analytics
export const getLeadsByProjectCategoryAnalytics = async (startDate: string, endDate: string, statusId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_PROJECT_CATEGORY_ANALYTICS}?startDate=${startDate}&endDate=${endDate}&statusId=${statusId}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Subcategory Analytics
export const getLeadsBySubcategoryAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_SUBCATEGORY_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Direct Source Analytics
export const getLeadsByDirectSourceAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_DIRECT_SOURCE_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Referral Source Analytics
export const getLeadsByReferralSourceAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_REFERRAL_SOURCE_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Source Analytics
export const getLeadsBySourceAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_SOURCE_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}


// Get Leads By Company Type Analytics
export const getLeadsByCompanyTypeAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_COMPANY_TYPE_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Monthly Top Leads
export const getMonthlyTopLeads = async (startDate: string, endDate: string, type: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_TOP_LEADS}?startDate=${startDate}&endDate=${endDate}&type=${type}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Monthly Lead Analytics
export const getMonthlyLeadAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_LEAD_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getMonthlyTargets = async (year: number, type: string = "inquiry") => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_TARGETS}?year=${year}&type=${type}`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (err) {
        throw err;
    }
}

export const saveMonthlyTargets = async (year: number, targets: any[], type: string = "inquiry") => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_TARGETS}`;
        const { data } = await axios.post(endpoint, { year, targets, type });
        return data; 
    } catch (err) {
        throw err;
    }
}

export const getDailyMonthlyRunRate = async (year: number, month: number) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_DAILY_MONTHLY_RUN_RATE}?year=${year}&month=${month}`;
        const { data } = await axios.get(endpoint);
        return data.data;
    } catch (err) {
        throw err;
    }
}

// Get Monthly Leads By Referral Sources
export const getMonthlyLeadsByReferralSources = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_LEADS_BY_REFERRAL_SOURCES}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Monthly Leads By Direct Sources
export const getMonthlyLeadsByDirectSources = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_MONTHLY_LEADS_BY_DIRECT_SOURCES}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

// Get Leads By Location Analytics
export const getLeadsByLocationAnalytics = async (startDate: string, endDate: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_LEADS_BY_LOCATION_ANALYTICS}?startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
}

export const getAllLeadsCountIncludingDeleted = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${LEAD_PROJECT_COMPANY.GET_ALL_LEADS_COUNT_INCLUDING_DELETED}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
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
        console.error('Error calling getAllLeadCancellationReasons:', err);
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

export const deleteLeadCancellationReason = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CLIENT_COMPANIES.DELETE_LEAD_CANCELLATION_REASON.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};
