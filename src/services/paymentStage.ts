import axios from "axios";
import { PAYMENT_STAGE } from "@constants/api-endpoint";
import { cachedRequest, invalidateRequestCache } from "./_requestCache";
import type { PaymentStageGroup } from "@models/leads";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const CACHE_KEY = "paymentStageGroups";

/**
 * Payment stage NUMBERING GROUPS — "1,2,3", "a,b,c". A plan picks one; its stages take
 * their Sr No from the group's ordered labels by position.
 *
 * Every mutation also invalidates "paymentPlans", because each plan carries its group's
 * labels inline — reordering a group changes what every plan using it prints, and a stale
 * plan cache would keep showing the old numbering.
 */

const invalidate = () => {
    invalidateRequestCache(CACHE_KEY);
    invalidateRequestCache("paymentPlans");
};

export const getAllPaymentStageGroups = async () => {
    return cachedRequest(CACHE_KEY, async () => {
        const { data } = await axios.get(`${API_BASE_URL}/${PAYMENT_STAGE.GET_ALL_PAYMENT_STAGES}`);
        return data;
    });
};

export const createPaymentStageGroup = async (payload: Partial<PaymentStageGroup>) => {
    const { data } = await axios.post(`${API_BASE_URL}/${PAYMENT_STAGE.CREATE_PAYMENT_STAGE}`, payload);
    invalidate();
    return data;
};

/** Sending `labels` replaces the whole array — it is one ordered value. */
export const updatePaymentStageGroup = async (id: string, payload: Partial<PaymentStageGroup>) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_STAGE.UPDATE_PAYMENT_STAGE.replace(":id", id)}`;
    const { data } = await axios.patch(endpoint, payload);
    invalidate();
    return data;
};

export const deletePaymentStageGroup = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_STAGE.DELETE_PAYMENT_STAGE.replace(":id", id)}`;
    const { data } = await axios.delete(endpoint);
    invalidate();
    return data;
};

/** Reorders the GROUPS themselves, not their labels. */
export const reorderPaymentStageGroups = async (ids: string[]) => {
    const { data } = await axios.put(`${API_BASE_URL}/${PAYMENT_STAGE.REORDER_PAYMENT_STAGES}`, { ids });
    invalidate();
    return data;
};
