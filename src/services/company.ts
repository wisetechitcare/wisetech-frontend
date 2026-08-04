import axios from "axios";
import { COMPANY, OPTIONS } from "@constants/api-endpoint";
import { IAnnouncement, IAnnouncementCreate, ICompanyBranch, ICompanyBranchUpdate, ICompanyDepartment, ICompanyOverview, IConfiguration, IFaqs, IHoliday, IPublicHoliday } from "@models/company";
import { store } from "@redux/store";
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

export const fetchPublicHolidays = async (year: string, observedIn: string, branchId?: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_PUBLIC_HOLIDAYS}?year=${year}&observedIn=${observedIn}${branchId ? `&branchId=${branchId}` : ''}`;
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

export const fetchLeaveOptions = async (branchId?: string) => {
    try {
        const params = branchId ? `?branchId=${encodeURIComponent(branchId)}` : '';
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_LEAVE_OPTIONS}${params}`;
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

export const fetchAllPublicHolidays = async (observedIn: string | undefined, companyId: string) => {
    try {
        // observedIn is optional. Omit it to fetch the full company holiday set the
        // server books against (mirrors the backend booking/balance path, which does
        // not filter by region) — used by the Apply preview to stay in lock-step.
        const observedInParam = observedIn ? `observedIn=${observedIn}&` : '';
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_PUBLIC_HOLIDAYS_BY_COMPANY}?${observedInParam}companyId=${companyId}`;
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

/**
 * Pre-fills one year's schedule from the master list's recurrence rules.
 * Safe to call repeatedly — holidays already dated in that year are left untouched.
 * Resolves to { created, skipped, needsDate, invalid }.
 */
export const generateHolidaysForYear = async (payload: {
    year: number;
    companyId: string;
    observedIn?: string;
    branchId?: string | null;
}) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GENERATE_HOLIDAYS_FOR_YEAR}`;
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

// ─── Multi-organization endpoints ──────────────────────────────────────────────

export const fetchOrganizationById = async (orgId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_OVERVIEW_BY_ID.replace(':id', orgId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchOrganizationTree = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ORGANIZATION_TREE}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchOrganizationStats = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ORGANIZATION_STATS}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteOrganizationById = async (orgId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_OVERVIEW_BY_ID.replace(':id', orgId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const deleteBranchById = async (branchId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_BRANCH_BY_ID.replace(':id', branchId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const promoteBranchToSubOrg = async (branchId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.PROMOTE_BRANCH_TO_SUBORG.replace(':id', branchId)}`;
        const { data } = await axios.post(endpoint, {});
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

export const fetchConfiguration = async (
    module: string,
    startDate?: string,
    endDate?: string,
    scope?: { companyId?: string; branchId?: string },
) => {
    try {
        let endpoint = `${API_BASE_URL}/${COMPANY.GET_CONFIGURATION}?module=${module}`;

        // Add date parameters if both are provided
        if (startDate && endDate) {
            endpoint += `&startDate=${startDate}&endDate=${endDate}`;
        }

        // The shift/attendance config ("leave management") is per-organization. When a caller
        // doesn't pass an explicit scope, default to the logged-in user's org so EVERY reader
        // (display totals, grace, lunch, late-marking) resolves the same per-org row the admin
        // edits — instead of the legacy global row. The backend resolves branch → org → global,
        // so when no scoped row exists this is identical to before. Only "leave management" is
        // defaulted; all other config modules are untouched.
        let effectiveScope = scope;
        if (!effectiveScope && module === 'leave management') {
            effectiveScope = {
                companyId: store.getState().employee?.currentEmployee?.companyId,
                branchId: store.getState().employee?.currentEmployee?.branchId,
            };
        }
        // Scope the config to an organization (default) or a specific branch override.
        if (effectiveScope?.companyId) endpoint += `&companyId=${effectiveScope.companyId}`;
        if (effectiveScope?.branchId) endpoint += `&branchId=${effectiveScope.branchId}`;

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

/**
 * FAQ transport. The API always answers with the full `{ sections }` shape —
 * every section present, empty ones included — so callers never branch on
 * "did this section come back".
 *
 * `companyId` is optional on every call: the backend derives the tenant from
 * the session and only honours an explicit id when it names a sub-org the
 * caller already belongs to. Passing it is a narrowing hint, never a
 * requirement, so no screen needs to fetch the company overview first.
 */
export const fetchAllFaqs = async (companyId?: string, type?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (type) params.set('type', type);
    const query = params.toString();
    const { data } = await axios.get(`${API_BASE_URL}/${COMPANY.GET_ALL_FAQS}${query ? `?${query}` : ''}`);
    return data;
}

/**
 * Create a FAQ. The section is identified by `categoryId`; `type` (the section
 * slug) is still accepted as a legacy alias, and the server resolves whichever
 * is present against that tenant's own sections. One of the two is required.
 */
export const createNewFaq = async (
    faq: IFaqs | { question: string; answer: string; companyId?: string } & ({ categoryId: string } | { type: string }),
) => {
    const { data } = await axios.post(`${API_BASE_URL}/${COMPANY.POST_FAQ}`, faq);
    return data;
}

export const updateFaqById = async (faqId: string, payload: { question?: string; answer?: string }) => {
    const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_FAQ_BY_ID}`.replace(':faqId', encodeURIComponent(faqId));
    const { data } = await axios.put(endpoint, payload);
    return data;
}

export const deleteFaqById = async (faqId: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${COMPANY.DELETE_FAQ}${encodeURIComponent(faqId)}`);
    return data;
}

/**
 * FAQ sections (categories) — admin-managed, so the section list is data rather
 * than a constant. Deleting a non-empty section answers 409 with the blocking
 * count; the caller surfaces that rather than treating it as a generic failure.
 */
export const fetchFaqCategories = async (includeInactive = false) => {
    const query = includeInactive ? '?includeInactive=true' : '';
    const { data } = await axios.get(`${API_BASE_URL}/${COMPANY.GET_FAQ_CATEGORIES}${query}`);
    return data;
}

export const createFaqCategory = async (payload: { name: string; icon?: string | null; tone?: string | null; description?: string | null }) => {
    const { data } = await axios.post(`${API_BASE_URL}/${COMPANY.POST_FAQ_CATEGORY}`, payload);
    return data;
}

export const updateFaqCategoryById = async (
    categoryId: string,
    payload: { name?: string; icon?: string | null; tone?: string | null; description?: string | null; isActive?: boolean },
) => {
    const endpoint = `${API_BASE_URL}/${COMPANY.UPDATE_FAQ_CATEGORY_BY_ID}`.replace(':categoryId', encodeURIComponent(categoryId));
    const { data } = await axios.put(endpoint, payload);
    return data;
}

export const deleteFaqCategoryById = async (categoryId: string) => {
    const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_FAQ_CATEGORY}`.replace(':categoryId', encodeURIComponent(categoryId));
    const { data } = await axios.delete(endpoint);
    return data;
}

export const reorderFaqCategories = async (orderedIds: string[]) => {
    const { data } = await axios.put(`${API_BASE_URL}/${COMPANY.REORDER_FAQ_CATEGORIES}`, { orderedIds });
    return data;
}

export const getAllAnnouncements = async (scope?: 'me') => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_ALL_ANNOUNCEMENTS}${scope ? `?scope=${scope}` : ''}`;
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
        if (!employeeId) {
            throw new Error('Employee ID is required');
        }
        if (!effectiveFrom) {
            throw new Error('Effective from date is required');
        }
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

export const deleteSalaryHistory = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${COMPANY.DELETE_SALARY_HISTORY}/${id}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSalaryDataForDateRangeMonthly = async (params: { employeeId: string; startDate: string; endDate: string }) => {
    try {
        const { employeeId, startDate, endDate } = params;
        if (!employeeId) {
            throw new Error('Employee ID is required');
        }
        if (!startDate || !endDate) {
            throw new Error('Start date and end date are required');
        }
        const endpoint = `${API_BASE_URL}/${COMPANY.GET_SALARY_DATA_DATE_RANGE_MONTHLY}?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

export const fetchSalaryPaymentHistory = async (salaryId: string) => {
    try {
        if (!salaryId) {
            throw new Error('Salary ID is required');
        }
        const endpoint = `${API_BASE_URL}/salary/payments/${salaryId}`;
        const { data } = await axios.get(endpoint);
        return data?.data || null;
    } catch (error) {
        console.warn('Failed to fetch salary payment history:', error);
        return null;
    }
}
