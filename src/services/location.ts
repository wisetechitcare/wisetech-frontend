import { LOCATION } from "@constants/api-endpoint";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const fetchAddressDetails = async (lat: number, lng: number) => {
    try {
        const endpoint = `${API_BASE_URL}/${LOCATION.ADDRESS}?latitude=${lat}&longitude=${lng}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
};