import axios from "axios";
import { STAGE_NUMBERING_FORMAT } from "@constants/api-endpoint";
import { cachedRequest, invalidateRequestCache } from "./_requestCache";
import type { StageNumberingFormat } from "@utils/stageNumbering";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const CACHE_KEY = "stageNumberingFormats";

/**
 * Stage numbering formats — how a payment plan's stages print their Sr No. Every mutation
 * also invalidates "paymentPlans": each plan carries its format inline, and deleting one
 * moves its plans back to the default.
 */

const invalidate = () => {
    invalidateRequestCache(CACHE_KEY);
    invalidateRequestCache("paymentPlans");
};

export const getAllStageNumberingFormats = async (): Promise<{ formats?: StageNumberingFormat[] }> =>
    cachedRequest(CACHE_KEY, async () => {
        const { data } = await axios.get(`${API_BASE_URL}/${STAGE_NUMBERING_FORMAT.GET_ALL}`);
        return data;
    });

export const createStageNumberingFormat = async (payload: Partial<StageNumberingFormat>) => {
    const { data } = await axios.post(`${API_BASE_URL}/${STAGE_NUMBERING_FORMAT.CREATE}`, payload);
    invalidate();
    return data;
};

export const updateStageNumberingFormat = async (id: string, payload: Partial<StageNumberingFormat>) => {
    const { data } = await axios.patch(`${API_BASE_URL}/${STAGE_NUMBERING_FORMAT.UPDATE.replace(":id", id)}`, payload);
    invalidate();
    return data;
};

export const deleteStageNumberingFormat = async (id: string) => {
    const { data } = await axios.delete(`${API_BASE_URL}/${STAGE_NUMBERING_FORMAT.DELETE.replace(":id", id)}`);
    invalidate();
    return data;
};
