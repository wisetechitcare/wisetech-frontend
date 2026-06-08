import axios from "axios";
import { AUTH } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const login = async (emailId: string, password: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${AUTH.LOGIN}`;
        const { data } = await axios.post(endpoint, { emailId, password });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const logout = async (token: string, userId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${AUTH.LOGOUT}`;
        const { data } = await axios.post(endpoint, { token, userId });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const forgotPassword = async (emailId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${AUTH.FORGOT_PASSWORD}`;
        const { data } = await axios.post(endpoint, { emailId });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const resetPassword = async (password: string, confirmPassword: string, resetToken: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${AUTH.RESET_PASSWORD.replace(':resetToken', resetToken)}`;
        const { data } = await axios.post(endpoint, { password, confirmPassword });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const changePassword = async (employeeId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${AUTH.CHANGE_PASSWORD}?employeeId=${employeeId}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}
