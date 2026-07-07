/**
 * leadService.ts — single source of truth for all Lead-related API calls.
 *
 * Replaces the split lead.ts (config/analytics) + leads.ts (CRUD) files.
 * Both old files re-export from here for backwards compatibility.
 *
 * Uses the shared apiClient so auth headers and 401 handling are automatic.
 */

import { api } from '@/lib/apiClient';
import { LEAD_PROJECT_COMPANY, CLIENT_COMPANIES } from '@constants/api-endpoint';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadListParams {
    page?:         number;
    pageSize?:     number;
    search?:       string;
    statusId?:     string;
    assignedToId?: string;
    startDate?:    string;
    endDate?:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeads = (params?: LeadListParams) =>
    api.get(CLIENT_COMPANIES.GET_ALL_LEADS, {
        page:     params?.page     ?? 1,
        pageSize: params?.pageSize ?? 50,
        ...(params?.search       && { search:       params.search }),
        ...(params?.statusId     && { statusId:     params.statusId }),
        ...(params?.assignedToId && { assignedToId: params.assignedToId }),
        ...(params?.startDate    && { startDate:    params.startDate }),
        ...(params?.endDate      && { endDate:      params.endDate }),
    });

export const getLeadById = (id: string) =>
    api.get(CLIENT_COMPANIES.GET_LEAD_BY_ID.replace(':id', id));

export const createLead = (data: any) =>
    api.post(CLIENT_COMPANIES.CREATE_LEAD, data);

export const updateLead = (id: string, data: any) =>
    api.put(CLIENT_COMPANIES.UPDATE_LEAD.replace(':id', id), data);

/**
 * Section-scoped inline edit used by the Project cards on the Entity detail page.
 * `section` selects which field group to update; `data` carries only that
 * section's fields. `expectedRevisionCount` drives optimistic concurrency — the
 * backend returns 409 (rejected promise) if the loaded snapshot is stale.
 */
export type LeadSectionKey =
    | 'ownership'
    | 'financials'
    | 'timeline'
    | 'purchaseOrder'
    | 'handledBy'
    | 'internalTeam'
    | 'externalTeam'
    | 'executionTeam'
    | 'projectStatus';

export const updateLeadSection = (
    id: string,
    section: LeadSectionKey,
    data: any,
    expectedRevisionCount?: number | null,
) =>
    api.patch(CLIENT_COMPANIES.UPDATE_LEAD_SECTION.replace(':id', id), {
        section,
        data,
        expectedRevisionCount: expectedRevisionCount ?? null,
    });

export const deleteLead = (id: string) =>
    api.delete(CLIENT_COMPANIES.DELETE_LEAD.replace(':id', id));

// ─────────────────────────────────────────────────────────────────────────────
// Additional Details
// ─────────────────────────────────────────────────────────────────────────────

export const getAllAdditionalDetails = () =>
    api.get(CLIENT_COMPANIES.GET_ALL_ADDITIONAL_DETAILS);

export const getAdditionalDetailsById = (id: string) =>
    api.get(CLIENT_COMPANIES.GET_ADDITIONAL_DETAILS_BY_ID.replace(':id', id));

export const getAdditionalDetailsByLeadId = (leadId: string) =>
    api.get(CLIENT_COMPANIES.GET_ADDITIONAL_DETAILS_BY_LEAD_ID.replace(':leadId', leadId));

export const createAdditionalDetails = (data: any) =>
    api.post(CLIENT_COMPANIES.CREATE_ADDITIONAL_DETAILS, data);

export const updateAdditionalDetails = (id: string, data: any) =>
    api.put(CLIENT_COMPANIES.UPDATE_ADDITIONAL_DETAILS.replace(':id', id), data);

export const createAdditionalDetailsBulk = (data: { leadId: string; details: any[] }) =>
    api.post(CLIENT_COMPANIES.CREATE_ADDITIONAL_DETAILS_MANY, data);

export const updateAdditionalDetailsBulk = (leadId: string, data: { details: any[] }) =>
    api.put(CLIENT_COMPANIES.UPDATE_ADDITIONAL_DETAILS_MANY.replace(':leadId', leadId), data);

// ─────────────────────────────────────────────────────────────────────────────
// Lead Status (config)
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeadStatus = () =>
    api.get(LEAD_PROJECT_COMPANY.GET_ALL_LEAD_STATUSES);

export const getLeadStatusById = (id: string) =>
    api.get(`${LEAD_PROJECT_COMPANY.GET_LEAD_STATUS_BY_ID}?id=${id}`);

export const createLeadStatus = (data: any) =>
    api.post(LEAD_PROJECT_COMPANY.CREATE_LEAD_STATUS, data);

export const updateLeadStatus = (id: string, data: any) =>
    api.put(LEAD_PROJECT_COMPANY.UPDATE_LEAD_STATUS.replace(':id', id), data);

export const deleteLeadStatus = (id: string) =>
    api.delete(LEAD_PROJECT_COMPANY.DELETE_LEAD_STATUS.replace(':id', id));

// ─────────────────────────────────────────────────────────────────────────────
// Lead Cancellation Reasons
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeadCancellationReasons = () =>
    api.get(CLIENT_COMPANIES.GET_ALL_LEAD_CANCELLATION_REASONS);

export const getLeadCancellationReasonById = (id: string) =>
    api.get(CLIENT_COMPANIES.GET_LEAD_CANCELLATION_REASON_BY_ID.replace(':id', id));

export const createLeadCancellationReason = (data: any) =>
    api.post(CLIENT_COMPANIES.CREATE_LEAD_CANCELLATION_REASON, data);

export const updateLeadCancellationReason = (id: string, data: any) =>
    api.put(CLIENT_COMPANIES.UPDATE_LEAD_CANCELLATION_REASON.replace(':id', id), data);

export const deleteLeadCancellationReason = (id: string) =>
    api.delete(CLIENT_COMPANIES.DELETE_LEAD_CANCELLATION_REASON.replace(':id', id));

// ─────────────────────────────────────────────────────────────────────────────
// Lead Direct Source
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeadDirectSource = () =>
    api.get(LEAD_PROJECT_COMPANY.GET_ALL_LEAD_DIRECT_SOURCES);

export const getLeadDirectSourceById = (id: string) =>
    api.get(`${LEAD_PROJECT_COMPANY.GET_LEAD_DIRECT_SOURCE_BY_ID}?id=${id}`);

export const createLeadDirectSource = (data: any) =>
    api.post(LEAD_PROJECT_COMPANY.CREATE_LEAD_DIRECT_SOURCE, data);

export const updateLeadDirectSource = (id: string, data: any) =>
    api.put(LEAD_PROJECT_COMPANY.UPDATE_LEAD_DIRECT_SOURCE.replace(':id', id), data);

export const deleteLeadDirectSource = (id: string, targetId?: string) =>
    api.delete(LEAD_PROJECT_COMPANY.DELETE_LEAD_DIRECT_SOURCE.replace(':id', id), targetId ? { targetId } : undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Lead Referral Types
// ─────────────────────────────────────────────────────────────────────────────

export const getAllLeadReferralType = () =>
    api.get(LEAD_PROJECT_COMPANY.GET_ALL_LEAD_REFERRAL_TYPES);

export const getLeadReferralTypeById = (id: string) =>
    api.get(`${LEAD_PROJECT_COMPANY.GET_LEAD_REFERRAL_TYPE_BY_ID}?id=${id}`);

export const createLeadReferralType = (data: any) =>
    api.post(LEAD_PROJECT_COMPANY.CREATE_LEAD_REFERRAL_TYPE, data);

export const updateLeadReferralType = (id: string, data: any) =>
    api.put(LEAD_PROJECT_COMPANY.UPDATE_LEAD_REFERRAL_TYPE.replace(':id', id), data);

export const deleteLeadReferralType = (id: string) =>
    api.delete(LEAD_PROJECT_COMPANY.DELETE_LEAD_REFERRAL_TYPE.replace(':id', id));

// ─────────────────────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────────────────────

export const getAllClientBranches = () =>
    api.get(LEAD_PROJECT_COMPANY.GET_ALL_LEAD_BRANCHES, { pageSize: 9999 });

export const getClientBranchById = (id: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEAD_BRANCH_BY_ID.replace(':id', id));

export const getClientBranchesByCompanyId = (companyId: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEAD_BRANCHES_BY_COMPANY_ID.replace(':companyId', companyId));

export const createClientBranch = (data: any) =>
    api.post(LEAD_PROJECT_COMPANY.CREATE_LEAD_BRANCH, data);

export const updateClientBranch = (id: string, data: any) =>
    api.put(LEAD_PROJECT_COMPANY.UPDATE_LEAD_BRANCH.replace(':id', id), data);

export const deleteClientBranch = (id: string) =>
    api.delete(LEAD_PROJECT_COMPANY.DELETE_LEAD_BRANCH.replace(':id', id));

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

export const getLeadsByCompanyId = (companyId: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_COMPANY_ID.replace(':companyId', companyId));

export const getLeadsByStatusAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_STATUS_ANALYTICS, { startDate, endDate });

export const getLeadsByServiceAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_SERVICE_ANALYTICS, { startDate, endDate });

export const getLeadsByProjectCategoryAnalytics = (startDate: string, endDate: string, statusId: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_PROJECT_CATEGORY_ANALYTICS, { startDate, endDate, statusId });

export const getLeadsBySubcategoryAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_SUBCATEGORY_ANALYTICS, { startDate, endDate });

export const getLeadsByDirectSourceAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_DIRECT_SOURCE_ANALYTICS, { startDate, endDate });

export const getLeadsByReferralSourceAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_REFERRAL_SOURCE_ANALYTICS, { startDate, endDate });

export const getLeadsBySourceAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_SOURCE_ANALYTICS, { startDate, endDate });

export const getLeadsByCompanyTypeAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_COMPANY_TYPE_ANALYTICS, { startDate, endDate });

export const getMonthlyTopLeads = (startDate: string, endDate: string, type: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_MONTHLY_TOP_LEADS, { startDate, endDate, type });

export const getMonthlyLeadAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_MONTHLY_LEAD_ANALYTICS, { startDate, endDate });

export const getLeadsByLocationAnalytics = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_BY_LOCATION_ANALYTICS, { startDate, endDate });

export const getMonthlyLeadsByReferralSources = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_MONTHLY_LEADS_BY_REFERRAL_SOURCES, { startDate, endDate });

export const getMonthlyLeadsByDirectSources = (startDate: string, endDate: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_MONTHLY_LEADS_BY_DIRECT_SOURCES, { startDate, endDate });

export const getMonthlyTargets = (year: number, type = 'inquiry') =>
    api.get(LEAD_PROJECT_COMPANY.GET_MONTHLY_TARGETS, { year, type }).then((d: any) => d?.data ?? d);

export const saveMonthlyTargets = (year: number, targets: any[], type = 'inquiry') =>
    api.post(LEAD_PROJECT_COMPANY.GET_MONTHLY_TARGETS, { year, targets, type });

export const getDailyMonthlyRunRate = (year: number, month: number) =>
    api.get(LEAD_PROJECT_COMPANY.GET_DAILY_MONTHLY_RUN_RATE, { year, month }).then((d: any) => d?.data ?? d);

export const getAllLeadsCountIncludingDeleted = () =>
    api.get(LEAD_PROJECT_COMPANY.GET_ALL_LEADS_COUNT_INCLUDING_DELETED);

export const getLeadsCountByFiscalYear = (formattedYear: string, prefixBase: string) =>
    api.get(LEAD_PROJECT_COMPANY.GET_LEADS_COUNT_BY_FISCAL_YEAR, {
        year:       encodeURIComponent(formattedYear),
        prefixBase: encodeURIComponent(prefixBase),
    });
