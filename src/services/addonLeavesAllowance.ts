import axios from "axios";
import { OPTIONS } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export interface IAddonLeavesAllowance {
    id: string;
    experienceInCompany: number;
    addonLeavesCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface IAddonLeavesAllowanceCreate {
    experienceInCompany: number;
    addonLeavesCount: number;
}

export interface IAddonLeavesAllowanceUpdate {
    experienceInCompany?: number;
    addonLeavesCount?: number;
}

/**
 * Get all addon leaves allowances
 */
export const fetchAllAddonLeavesAllowances = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_ALL_ADDON_LEAVES_ALLOWANCES}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Get addon leaves allowance by ID
 */
export const fetchAddonLeavesAllowanceById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.GET_ADDON_LEAVES_ALLOWANCE_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Create addon leaves allowance
 */
export const createAddonLeavesAllowance = async (payload: IAddonLeavesAllowanceCreate) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.CREATE_ADDON_LEAVES_ALLOWANCE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Update addon leaves allowance by ID
 */
export const updateAddonLeavesAllowance = async (id: string, payload: IAddonLeavesAllowanceUpdate) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.UPDATE_ADDON_LEAVES_ALLOWANCE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Delete addon leaves allowance by ID
 */
export const deleteAddonLeavesAllowance = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${OPTIONS.DELETE_ADDON_LEAVES_ALLOWANCE.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};

/**
 * Trigger a full leave balance recalculation for all active employees.
 * Calls the recompute-addon-leaves endpoint which now delegates to recalculateBalance
 * for every employee and every leave type, applying all rules (addon, probation, override).
 */
export const recomputeAllLeaveBalances = async (fiscalYear?: string) => {
    const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
    const { data } = await axios.post(`${API_BASE_URL}/api/employee/recompute-addon-leaves`, fiscalYear ? { fiscalYear } : {});
    return data;
};

/**
 * Upsert addon leaves allowances (bulk operation).
 * Fetches all existing records once, then creates or updates each tier in sequence.
 */
export const upsertAddonLeavesAllowances = async (allowances: IAddonLeavesAllowanceCreate[]) => {
    // One fetch for all existing records — avoids N+1 API calls inside the loop.
    const existingResponse = await fetchAllAddonLeavesAllowances();
    const existingAllowances: IAddonLeavesAllowance[] =
        existingResponse.data?.addonLeavesAllowances ?? [];

    const results = [];

    for (const allowance of allowances) {
        const existing = existingAllowances.find(
            (item) => item.experienceInCompany === allowance.experienceInCompany
        );

        try {
            if (existing) {
                const result = await updateAddonLeavesAllowance(existing.id, {
                    addonLeavesCount: allowance.addonLeavesCount,
                });
                results.push({ action: 'updated', data: result.data });
            } else {
                const result = await createAddonLeavesAllowance(allowance);
                results.push({ action: 'created', data: result.data });
            }
        } catch (error) {
            results.push({ action: 'error', error, data: allowance });
        }
    }

    return { success: true, data: results };
};
