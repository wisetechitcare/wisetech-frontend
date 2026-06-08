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