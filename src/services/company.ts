import axios from "axios";
import { COMPANY, OPTIONS } from "@constants/api-endpoint";
import { IAnnouncement, IAnnouncementCreate, ICompanyBranch, ICompanyBranchUpdate, ICompanyDepartment, ICompanyOverview, IConfiguration, IFaqs, IHoliday, IPublicHoliday } from "@models/company";
import dayjs, { Dayjs } from "dayjs";
const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const createPublicHoliday = async (payload: IPublicHoliday) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_PUBLIC_HOLIDAYS}`;
        const { data } = await axios.post(endpoint, { publicHolidays: [payload] });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchPublicHolidays = async (year: string, observedIn: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_PUBLIC_HOLIDAYS}?year=${year}&observedIn=${observedIn}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deletePublicHolidayById = async (id : string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_PUBLIC_HOLIDAY_BY_ID}?id=${id}`;
        const { data } = await axios.delete(endpoint);  
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchLeaveOptions = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_LEAVE_OPTIONS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateLeaveOptionsById = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_LEAVE_OPTION_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updatePublicHolidayById = async (id : string, payload: IPublicHoliday) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_PUBLIC_HOLIDAY_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchAllPublicHolidays = async (observedIn: string, companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_PUBLIC_HOLIDAYS_BY_COMPANY}?observedIn=${observedIn}&companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateHolidayOptionsById = async (id : string, payload: IHoliday) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_HOLIDAY_BY_ID}?id=${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const deleteHolidayById = async (id : string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_HOLIDAY_BY_ID}?id=${id}`;
        const { data } = await axios.delete(endpoint);  
        return data;
    } catch (error) {
        throw error;
    }
}


export const createHoliday = async (payload: IHoliday) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_HOLIDAY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchHolidays = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_HOLIDAYS}?companyId=${companyId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchCompanyLogo = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_LOGO}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createCompanyOverview = async (overview: ICompanyOverview) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_OVERVIEW}`;
        const { data } = await axios.post(endpoint, { ...overview });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateCompanyOverview = async (companyId: string, overview: Partial<ICompanyOverview>) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_OVERVIEW}?id=${companyId}`;
        const { data } = await axios.put(endpoint, { ...overview });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchCompanyOverview = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_OVERVIEW}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewBranch = async (branches: ICompanyBranch[]) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_BRANCHES}`;
        const { data } = await axios.post(endpoint, { branches });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllBranches = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_BRANCHES}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchBranchById = async (branchId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_BRANCH_BY_ID.replace(':branchId', branchId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateBranchById = async (branchId: string, payload: ICompanyBranchUpdate) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_BRANCH_BY_ID.replace(':branchId', branchId)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllDepartments = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_DEPARTMENTS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewDepartment = async (departments: ICompanyDepartment[]) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_DEPARTMENTS}`;
        const { data } = await axios.post(endpoint, { departments });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchDepartmentById = async (departmentId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_DEPARTMENT_BY_ID.replace(':departmentId', departmentId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateDepartmentById = async (departmentId: string, payload: ICompanyDepartment) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_DEPARTMENT_BY_ID.replace(':departmentId', departmentId)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchConfiguration = async (module: string, startDate?: string, endDate?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${COMPANY.GET_CONFIGURATION}?module=${module}`;
        
        // Add date parameters if both are provided
        if (startDate && endDate) {
            endpoint += `&startDate=${startDate}&endDate=${endDate}`;
        }
        
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateConfigurationById = async (configurationId: string, payload: IConfiguration) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.POST_CONFIGURATION}?id=${configurationId}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewConfiguration = async (payload: IConfiguration) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.POST_CONFIGURATION}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

// Employee-specific chart settings functions
export const upsertEmployeeLPCChartSettings = async (employeeId: string, settings: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPSERT_EMPLOYEE_LPC_CHART_SETTINGS}`;
        const { data } = await axios.post(endpoint, { employeeId, settings });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchEmployeeLPCChartSettings = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_EMPLOYEE_LPC_CHART_SETTINGS}/${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchAllFaqs = async (companyId: string, type?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_FAQS}?companyId=${companyId}`;
        if (type) {
            endpoint += `&type=${type}`;
        }
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewFaq = async (faq: IFaqs | { question: string; answer: string; type: string; companyId: string }, type?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${COMPANY.POST_FAQ}`;
        // Support old pattern with type as query param
        if (type) {
            endpoint += `?type=${type}`;
        }
        const { data } = await axios.post(endpoint, faq);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateFaqById = async (faqId: string, payload: IFaqs | { question: string; answer: string }, type?: string) => {
    try {
        // Support both patterns: with :faqId param and with ?id= query param
        let endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_FAQ_BY_ID}`;
        if (endpoint.includes(':faqId')) {
            endpoint = endpoint.replace(':faqId', faqId);
        } else {
            endpoint += `?id=${faqId}`;
        }
        if (type) {
            endpoint += endpoint.includes('?') ? `&type=${type}` : `?type=${type}`;
        }
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteFaqById = async (faqId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_FAQ}${faqId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const getAllAnnouncements = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_ANNOUNCEMENTS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const createAnnouncement = async (announcement: IAnnouncementCreate) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_ANNOUNCEMENT}`;
        const { data } = await axios.post(endpoint, announcement);
        return data;
    } catch (error) {
        throw error;
    }
}

export const deleteAnnouncementById = async (announcementId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.ARCHIVE_ANNOUNCEMENT_BY_ID}?id=${announcementId}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const updateAnnouncementById = async (announcement: IAnnouncement, announcementId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_ANNOUNCEMENT_BY_ID}?id=${announcementId}`;
        const { data } = await axios.put(endpoint, announcement);
        return data;
    } catch (error) {
        throw error;
    }
}

export const getAllLoans = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_LOAN}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const getAllLoanSummary = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_LOAN_SUMMARY}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}
export const getAllLoanAnnouncement = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_LOAN_INSTALLMENT}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}
export const getAllLoanDetails = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_LOAN_DETAILS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

// services/loanInstallmentService.ts

export const fetchEmpMonthlyInstallmentsStatistics = async (month: dayjs.Dayjs) => {
    try {
      const formattedMonth = month.format('YYYYMM'); // E.g., 202504 for April 2025
  
      const endpoint = `${API_BASE_URL}/${COMPANY.GET_MONTHLY_INSTALLMENT_SUMMARY}`;
  
      const { data } = await axios.get(endpoint, {
        params: { month: formattedMonth },
      });
  
      return data?.data; 
    } catch (error) {
      console.error("Error fetching monthly installments:", error);
      throw error;
    }
  };

export const fetchSubCompanies = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_SUB_COMPANIES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSubCompanyById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SUB_COMPANY_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const createSubCompany = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_SUB_COMPANY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const updateSubCompany = async (id: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_SUB_COMPANY.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSubCompaniesByMainCompanyId = async (mainCompanyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SUB_COMPANIES_BY_MAIN_COMPANY_ID.replace(':mainCompanyId', mainCompanyId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSubCompaniesByCompanyId = async (companyId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SUB_COMPANIES_BY_COMPANY_ID.replace(':companyId', companyId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const deleteSubCompany = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_SUB_COMPANY.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

// Salary History API Functions
export const createSalaryHistory = async (payload: { employeeId: string; effectiveFrom: string; ctcInLpa: number; createdBy?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.CREATE_SALARY_HISTORY}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSalaryHistory = async (employeeId: string, effectiveFrom: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SALARY_HISTORY}?employeeId=${employeeId}&effectiveFrom=${effectiveFrom}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const updateSalaryHistory = async (id: string, payload: { employeeId?: string; effectiveFrom?: string; ctcInLpa?: number; updatedBy?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_SALARY_HISTORY}/${id}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSalaryDataForDateRangeMonthly = async (params: { employeeId: string; startDate: string; endDate: string }) => {
    try {
        const { employeeId, startDate, endDate } = params;
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SALARY_DATA_DATE_RANGE_MONTHLY}?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}
