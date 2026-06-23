import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuth } from '@/app/modules/auth/core/AuthHelpers';

const BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
});

// ── Request: attach Bearer token ──────────────────────────────────────────────

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        // Single source of truth: the app stores auth under 'wise_tech_login' as a JSON
        // object with a `.token` field (see AuthHelpers.setupAxios). apiClient is a
        // SEPARATE axios instance, so it does NOT inherit the global auth interceptor —
        // it must read the token itself via getAuth() to stay in lockstep.
        const auth = getAuth() as { token?: string } | undefined;
        const token = auth?.token;
        if (typeof token === 'string' && token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response: normalize errors + handle 401 ───────────────────────────────────

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Session-expiry handling (clearing 'wise_tech_login' + redirect) is owned by
        // the app's auth flow / route guards — not this client. Forcing a redirect here
        // on any 401 risked logout loops. We just surface the error to the caller.
        return Promise.reject(error.response?.data ?? error);
    },
);

// ── Typed helper wrappers ─────────────────────────────────────────────────────

export const api = {
    get: <T = any>(url: string, params?: Record<string, any>) =>
        apiClient.get<T>(url, { params }).then((r) => r.data),

    post: <T = any>(url: string, body?: any) =>
        apiClient.post<T>(url, body).then((r) => r.data),

    put: <T = any>(url: string, body?: any) =>
        apiClient.put<T>(url, body).then((r) => r.data),

    patch: <T = any>(url: string, body?: any) =>
        apiClient.patch<T>(url, body).then((r) => r.data),

    delete: <T = any>(url: string, body?: any) =>
        apiClient.delete<T>(url, { data: body }).then((r) => r.data),
};
