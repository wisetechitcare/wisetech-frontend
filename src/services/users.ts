import axios from "axios";
import { USERS } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const fetchCurrentUser = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${USERS.FETCH_USER_BY_ID.replace(':userId', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const createNewUser = async (payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${USERS.CREATE_USER}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const updateUser = async (userId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${USERS.UPDATE_USER.replace(":userId", userId)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const archiveUser = async (userId: string, payload: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${USERS.ARCHIVE_USER.replace(":userId", userId)}`;
        const { data } = await axios.delete(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchAllUsers = async () => {
    try {
        const endpoint = `${API_BASE_URL}/${USERS.GET_ALL_USERS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}


// POST Or PUT: Save user table preferences
export const upsertUserTablePreferences = async (employeeId: string, tableName: string, preferences: any) => {
    try {
        const endpoint = `${API_BASE_URL}${USERS.SAVE_USER_TABLE_PREFERENCES}`;
        const { data } = await axios.post(endpoint, { employeeId, tableName, preferences });
        return data;
    } catch (error) {
        throw error;
    }
};

// GET: Fetch user table preferences
export const getUserTablePreferences = async (employeeId: string, tableName: string) => {
    try {
        const endpoint = `${API_BASE_URL}${USERS.GET_USER_TABLE_PREFERENCES.replace(':employeeId', employeeId).replace(':tableName', tableName)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
};
