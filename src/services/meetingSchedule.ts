import axios from "axios";
import { MEETING_SCHEDULE } from "@constants/api-endpoint";
import { cachedRequest, invalidateRequestCache } from "./_requestCache";
import type { MeetingScheduleType } from "@models/leads";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;

const CACHE_KEY = "meetingSchedules";

// All active meeting-schedule types (with brackets + items). Short cache dedupes the
// duplicate fetches on a page load; mutations invalidate it.
export const getAllMeetingSchedules = async () => {
    return cachedRequest(CACHE_KEY, async () => {
        const endpoint = `${API_BASE_URL}/${MEETING_SCHEDULE.GET_ALL_MEETING_SCHEDULES}`;
        const { data } = await axios.get(endpoint);
        return data;
    });
};

export const getMeetingScheduleById = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${MEETING_SCHEDULE.GET_MEETING_SCHEDULE_BY_ID.replace(":id", id)}`;
    const { data } = await axios.get(endpoint);
    return data;
};

export const createMeetingSchedule = async (payload: MeetingScheduleType) => {
    const endpoint = `${API_BASE_URL}/${MEETING_SCHEDULE.CREATE_MEETING_SCHEDULE}`;
    const { data } = await axios.post(endpoint, payload);
    invalidateRequestCache(CACHE_KEY);
    return data;
};

export const updateMeetingSchedule = async (id: string, payload: MeetingScheduleType) => {
    const endpoint = `${API_BASE_URL}/${MEETING_SCHEDULE.UPDATE_MEETING_SCHEDULE.replace(":id", id)}`;
    const { data } = await axios.put(endpoint, payload);
    invalidateRequestCache(CACHE_KEY);
    return data;
};

export const deleteMeetingSchedule = async (id: string) => {
    const endpoint = `${API_BASE_URL}/${MEETING_SCHEDULE.DELETE_MEETING_SCHEDULE.replace(":id", id)}`;
    const { data } = await axios.delete(endpoint);
    invalidateRequestCache(CACHE_KEY);
    return data;
};
