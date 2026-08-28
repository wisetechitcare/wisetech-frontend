import axios from "axios";
import { PAYMENT_PLAN } from "@constants/api-endpoint";
import { cachedRequest, invalidateRequestCache } from "./_requestCache";
import type { PaymentPlan, PaymentPlanStageDeliverable, DeliverablePayload } from "@models/leads";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const CACHE_KEY = "paymentPlans";

// Get all active payment plans (with ordered stages, and the project type each one bills).
// Short-lived cache dedupes the duplicate fetches on a single page load; every mutation
// invalidates it. The lead form filters this list against the lead's own categories.
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

// ─── Stage deliverables ──────────────────────────────────────────────────────
// Configuration only — used by the Payment Plan configuration screen. Not cached:
// the config modal is short-lived and always wants the current rows. These do NOT
// touch the plan cache, so nothing in the lead flow re-renders because of them.

export const getStageDeliverables = async (stageId: string): Promise<PaymentPlanStageDeliverable[]> => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.GET_STAGE_DELIVERABLES.replace(":stageId", stageId)}`;
    const { data } = await axios.get(endpoint);
    return data?.deliverables ?? [];
};

export const createStageDeliverable = async (stageId: string, payload: DeliverablePayload) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.CREATE_STAGE_DELIVERABLE.replace(":stageId", stageId)}`;
    const { data } = await axios.post(endpoint, payload);
    return data?.deliverable as PaymentPlanStageDeliverable;
};

export const updateDeliverable = async (deliverableId: string, payload: DeliverablePayload) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.UPDATE_DELIVERABLE.replace(":deliverableId", deliverableId)}`;
    const { data } = await axios.patch(endpoint, payload);
    return data?.deliverable as PaymentPlanStageDeliverable;
};

export const deleteDeliverable = async (deliverableId: string) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.DELETE_DELIVERABLE.replace(":deliverableId", deliverableId)}`;
    const { data } = await axios.delete(endpoint);
    return data;
};

export const reorderStageDeliverables = async (stageId: string, orderedIds: string[]) => {
    const endpoint = `${API_BASE_URL}/${PAYMENT_PLAN.REORDER_STAGE_DELIVERABLES.replace(":stageId", stageId)}`;
    const { data } = await axios.put(endpoint, { orderedIds });
    return (data?.deliverables ?? []) as PaymentPlanStageDeliverable[];
};
