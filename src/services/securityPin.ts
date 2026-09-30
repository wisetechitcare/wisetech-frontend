import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const BASE = `${API_BASE_URL}/api/security-pin`;

export interface SecurityPinStatus {
    hasPin: boolean;
    /** ISO end of this browser's unlock, or null when locked. */
    unlockedUntil: string | null;
    /** ISO end of the pause after too many wrong PINs. */
    lockedUntil: string | null;
    /** Masked login email the setup/reset code is sent to. */
    email: string | null;
    pinLength: number;
    ttlMinutes?: number;
}

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const securityPinApi = {
    status: () => data<SecurityPinStatus>(axios.get(`${BASE}/status`)),
    sendCode: () => data<{ email: string; expiresAt: string }>(axios.post(`${BASE}/code`)),
    setPin: (code: string, pin: string) => data<{ unlockedUntil: string }>(axios.post(`${BASE}/pin`, { code, pin })),
    unlock: (pin: string) => data<{ unlockedUntil: string }>(axios.post(`${BASE}/unlock`, { pin })),
    lock: () => data<{ unlockedUntil: null }>(axios.post(`${BASE}/lock`)),
};

/** The server's reason for a failed call, and its machine code, for the lock screen to show. */
export function lockError(err: unknown): { message: string; code?: string; meta?: Record<string, unknown> } {
    const body = (err as any)?.response?.data;
    return {
        message: body?.detail || body?.message || "Something went wrong. Try again.",
        code: body?.meta?.code,
        meta: body?.meta,
    };
}
