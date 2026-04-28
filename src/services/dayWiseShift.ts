import axios from "axios";
import { DAY_WISE_SHIFT } from "@constants/api-endpoint";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

/**
 * Fetches all dayWiseShifts.
 * @returns An array of dayWiseShifts.
 * @throws Throws an error if the request fails.
 * @api "api/dayWiseShifts"
 */
export const fetchDayWiseShifts = async () => {
    try {
    const endpoint = `${API_BASE_URL}/${DAY_WISE_SHIFT.GET_ALL_DAY_WISE_SHIFTS}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Retrieves a dayWiseShift by its ID.
 * @param dayWiseShiftId The ID of the dayWiseShift to retrieve.
 * @returns The retrieved dayWiseShift.
 * @throws Throws an error if the request fails.
 * @api "api/dayWiseShifts/:id"
 */
export const getDayWiseShiftById = async (dayWiseShiftId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${DAY_WISE_SHIFT.GET_DAY_WISE_SHIFT.replace(":id", dayWiseShiftId)}`;
        const { data } = await axios.get(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Creates a new dayWiseShift.
 * @param dayWiseShift The dayWiseShift to create.
 * @returns The created dayWiseShift.
 * @throws Throws an error if the request fails.
 * @api "api/dayWiseShifts"
 */
export const createDayWiseShift = async (dayWiseShift: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${DAY_WISE_SHIFT.CREATE_DAY_WISE_SHIFT}`;
        const { data } = await axios.post(endpoint, dayWiseShift);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Updates an existing dayWiseShift by its ID.
 * @param dayWiseShiftId The ID of the dayWiseShift to update.
 * @param dayWiseShift The updated dayWiseShift.
 * @returns The updated dayWiseShift.
 * @throws Throws an error if the request fails.
 * @api "api/dayWiseShifts/:id"
 */
export const updateDayWiseShiftById = async (dayWiseShiftId: string, dayWiseShift: any) => {
    try {
        const endpoint = `${API_BASE_URL}/${DAY_WISE_SHIFT.UPDATE_DAY_WISE_SHIFT.replace(":id", dayWiseShiftId)}`;
        const { data } = await axios.put(endpoint, dayWiseShift);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Deletes a dayWiseShift by its ID.
 * @param dayWiseShiftId The ID of the dayWiseShift to delete.
 * @returns The deleted dayWiseShift.
 * @throws Throws an error if the request fails.
 * @api "api/dayWiseShifts/:id"
 */
export const deleteDayWiseShiftById = async (dayWiseShiftId: string) => {
    try {
        const endpoint = `${API_BASE_URL}/${DAY_WISE_SHIFT.DELETE_DAY_WISE_SHIFT.replace(":id", dayWiseShiftId)}`;
        const { data } = await axios.delete(endpoint);
        return data;
    } catch (error) {
        throw error;
    }
}
