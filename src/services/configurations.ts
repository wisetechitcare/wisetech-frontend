import axios from "axios";
import { ORGANIZATION_CONFIGURATION, EMPLOYEE_CONFIGURATION } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

// ============================================
// Organization Configuration Services
// ============================================

export const fetchAllOrganizationConfigurations = async (type?: string) => {
    try {
        let endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.GET_ALL}`;

        if (type) {
            endpoint += `?type=${type}`;
        }

        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchOrganizationConfigurationById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.GET_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchOrganizationConfigurationsByType = async (type: string) => {
    try {
        const endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.GET_BY_TYPE.replace(':type', type)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createOrganizationConfiguration = async (payload: { type: string; name: string }) => {
    try {
        const endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.CREATE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateOrganizationConfigurationById = async (id: string, payload: { name?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.UPDATE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteOrganizationConfigurationById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}${ORGANIZATION_CONFIGURATION.DELETE.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

// ============================================
// Employee Configuration Services
// ============================================

export const fetchAllEmployeeConfigurations = async (type?: string) => {
    try {
        let endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.GET_ALL}`;

        if (type) {
            endpoint += `?type=${type}`;
        }

        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchEmployeeConfigurationById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.GET_BY_ID.replace(':id', id)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const fetchEmployeeConfigurationsByType = async (type: string) => {
    try {
        const endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.GET_BY_TYPE.replace(':type', type)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};

export const createEmployeeConfiguration = async (payload: { type: string; name: string; color?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.CREATE}`;
        const { data } = await axios.post(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const updateEmployeeConfigurationById = async (id: string, payload: { name?: string; color?: string }) => {
    try {
        const endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.UPDATE.replace(':id', id)}`;
        const { data } = await axios.put(endpoint, payload);
        return data;
    } catch (err) {
        throw err;
    }
};

export const deleteEmployeeConfigurationById = async (id: string) => {
    try {
        const endpoint = `${API_BASE_URL}${EMPLOYEE_CONFIGURATION.DELETE.replace(':id', id)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (err) {
        throw err;
    }
};
