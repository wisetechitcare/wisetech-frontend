import axios from "axios";
import { PAYMENT_PLAN } from "@constants/api-endpoint";
import { cachedRequest, invalidateRequestCache } from "./_requestCache";
import type { PaymentPlan } from "@models/leads";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const CACHE_KEY = "paymentPlans";

// Get all active payment plans (with ordered stages). Short-lived cache dedupes the
// duplicate fetches on a single page load; every mutation invalidates it.
export const getAllPaymentPlans = async () => {
    return cachedRequest(CACHE_KEY, async () => {
        const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.GET_ALL_PAYMENT_PLANS}`;
        const { data } = await axios.get(endpoint);
        return data;
    });
};

export const getPaymentPlanById = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.GET_PAYMENT_PLAN_BY_ID.replace(":id", id)}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const createPaymentPlan = async (payload: PaymentPlan) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.CREATE_PAYMENT_PLAN}`;
    const { data } = await axios.post(endpoint, payload);
    invalidateRequestCache(CACHE_KEY);
    return data;
};

export const updatePaymentPlan = async (id: string, payload: PaymentPlan) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.UPDATE_PAYMENT_PLAN.replace(":id", id)}`;
    const { data } = await axios.put(endpoint, payload);
    invalidateRequestCache(CACHE_KEY);
    return data;
};

export const deletePaymentPlan = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.DELETE_PAYMENT_PLAN.replace(":id", id)}`;
    const { data } = await axios.delete(endpoint);
    invalidateRequestCache(CACHE_KEY);
    return data;
};
