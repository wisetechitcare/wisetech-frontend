import axios from "axios";
import { FILE } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const uploadCompanyAsset = async (payload: FormData) => {
    try {
        const endpoint = `${API_BASE_URL}/${FILE.UPLOAD}`;
        const { data } = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return data;
    }
    catch (err) {
        throw err;
    }
}


/**
 * Lead PO document — store, replace or remove.
 *
 * Pass a `file` to store it (the backend keys it uniquely, so leads never collide)
 * and `previousUrl` so the object being replaced is deleted once the new one is
 * safely stored. Pass no file with a `previousUrl` to just delete it.
 * Returns the stored URL ('' after a removal).
 */
export const uploadLeadPoFile = async (file: File | null, previousUrl?: string): Promise<string> => {
    const form = new FormData();
    if (file) form.append("file", file);
    if (previousUrl) form.append("previousPath", previousUrl);
    const { data } = await axios.post(`${API_BASE_URL}/${FILE.LEAD_PO}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data?.data?.path || "";
}

export const uploadUserAsset = async (payload: FormData, userId: string, sectionName?: string, category?: string) => {
    try {
        let endpoint = `${API_BASE_URL}/${FILE.UPLOAD}?userId=${userId}`;
        if (sectionName) {
            endpoint += `&sectionName=${sectionName}`;
        }
        if (category) {
            endpoint += `&category=${category}`;
        }
        const { data } = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return data;
    }
    catch (err) {
        throw err;
    }
}