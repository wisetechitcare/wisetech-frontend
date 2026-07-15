import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuth, isSessionDeathResponse, endSessionAndRedirect } from '@/app/modules/auth/core/AuthHelpers';

const BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
    // Auth travels in the httpOnly cookie set at login (XSS-safe).
    withCredentials: true,
});

// ── Request: legacy Bearer-token fallback ─────────────────────────────────────
// New sessions authenticate via the httpOnly cookie. Sessions persisted by a
// pre-cookie release may still hold a token in localStorage — honor it until
// the user re-logs in.

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const raw = localStorage.getItem('wise_tech_login');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const token = parsed?.token;
                if (typeof token === 'string' && token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
            } catch {
                // malformed storage entry — skip
            }
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response: normalize errors + handle 401 ───────────────────────────────────

apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Same session policy as the global axios (AuthHelpers.setupAxios):
        // only a session-level 401 from OUR api — never an auth-endpoint 401
        // (wrong password) or a business 401 — ends the session, exactly once.
        if (isSessionDeathResponse(error) && getAuth()) {
            endSessionAndRedirect();
        }
        // Unwrap server error body so callers get a consistent shape
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
