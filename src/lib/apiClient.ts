import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND || '';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 30_000,
});

// ── Request: attach Bearer token ──────────────────────────────────────────────

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const raw = localStorage.getItem('authData');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                const token = parsed?.token ?? parsed?.accessToken ?? parsed;
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
        if (error.response?.status === 401) {
            localStorage.removeItem('authData');
            window.location.href = '/login';
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
