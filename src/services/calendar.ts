import axios from "axios";
import { CALENDAR } from "@constants/api-endpoint";
import { ICalendarEvent } from "@models/calendar";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

export const createCalendarEvent = async (payload: ICalendarEvent) => {
    try {
        const endpoint = `${API_BASE_URL}/${CALENDAR.CREATE_EVENT}`;
        const { data } = await axios.post(endpoint, { ...payload });
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const fetchCalendarEvents = async (employeeId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CALENDAR.GET_ALL_EMPLOYEE_EVENTS}?employeeId=${employeeId}`;
        const { data } = await axios.get(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}

export const archiveEvent = async (eventName: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${CALENDAR.DELETE_EVENT}?name=${eventName}`;
        const { data } = await axios.delete(endpoint);
        return data;
    }
    catch (err) {
        throw err;
    }
}