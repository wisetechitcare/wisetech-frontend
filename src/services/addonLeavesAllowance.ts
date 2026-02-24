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
 * Upsert addon leaves allowances (bulk operation)
 */
export const upsertAddonLeavesAllowances = async (allowances: IAddonLeavesAllowanceCreate[]) => {
    try {
        const results = [];
        
        for (const allowance of allowances) {
            // First try to get existing allowance for this experience level
            try {
                const existingAllowances = await fetchAllAddonLeavesAllowances();
                const existingAllowance = existingAllowances.data?.addonLeavesAllowances?.find(
                    (item: IAddonLeavesAllowance) => item.experienceInCompany === allowance.experienceInCompany
                );
                
                if (existingAllowance) {
                    // Update existing
                    const result = await updateAddonLeavesAllowance(existingAllowance.id, {
                        addonLeavesCount: allowance.addonLeavesCount
                    });
                    results.push({ action: 'updated', data: result.data });
                } else {
                    // Create new
                    const result = await createAddonLeavesAllowance(allowance);
                    results.push({ action: 'created', data: result.data });
                }
            } catch (error) {
                // If error getting existing, try to create new
                try {
                    const result = await createAddonLeavesAllowance(allowance);
                    results.push({ action: 'created', data: result.data });
                } catch (createError) {
                    results.push({ action: 'error', error: createError, data: allowance });
                }
            }
        }
        
        return { success: true, data: results };
    } catch (error) {
        throw error;
    }
};
