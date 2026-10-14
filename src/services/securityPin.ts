import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND;
const BASE = `${API_BASE_URL}/api/security-pin`;

/**
 * The protected tabs ("areas"). Keys are the access tree's tab keys (`<section>/<tab>`), so the
 * Advanced dialog shows each tab's PIN beside its switch. Mirrors SECURITY_AREAS on the backend.
 */
export const SECURITY_AREAS = {
    "finance.salary/my-salary": "My Salary",
    "finance.salary/employee-payrolls": "Employee Payrolls",
    "finance.salary/configure": "Salary Configure",
    "finance.increment/my-increment": "My Increment",
    "finance.increment/employee-increment": "Employee Increment",
    "app.roles-permissions": "Roles & Permissions",
} as const;
export type SecurityArea = keyof typeof SECURITY_AREAS;
export const ALL_AREAS = Object.keys(SECURITY_AREAS) as SecurityArea[];
export const isSecurityArea = (v: unknown): v is SecurityArea => typeof v === "string" && v in SECURITY_AREAS;

export type PinMode = "required" | "off";
export interface PinPolicy { mode: PinMode; lockMinutes: number }
export type PinPolicySource = { kind: "employee" } | { kind: "role"; roleName: string } | { kind: "default" };

export interface AreaStatus {
    required: boolean;
    lockMinutes: number;
    source: PinPolicySource;
    /** This browser's unlock is still fresh enough for this tab (always true for No PIN). */
    unlocked: boolean;
}

export interface SecurityPinStatus {
    hasPin: boolean;
    /** ISO end of this browser's unlock, or null when locked. */
    unlockedUntil: string | null;
    /** ISO end of the pause after too many wrong PINs. */
    lockedUntil: string | null;
    /** Masked login email the setup/reset code is sent to. */
    email: string | null;
    pinLength: number;
    /** The longest auto-lock among this person's protected tabs. */
    ttlMinutes?: number;
    /** False when EVERY protected tab is No PIN for this person. */
    required?: boolean;
    /** Per protected tab. */
    areas?: Partial<Record<SecurityArea, AreaStatus>>;
}

export interface RolePinPolicy {
    roleId: string;
    /** The role's own setting per tab; null = default. */
    areas: Record<SecurityArea, PinPolicy | null>;
    default: PinPolicy;
    editable: boolean;
}

export interface EmployeeAreaPolicy {
    policy: PinPolicy;
    source: PinPolicySource;
    /** Their own setting for this tab, or null when they follow their roles. */
    override: PinPolicy | null;
    /** What their roles alone would give for this tab. */
    fromRoles: { policy: PinPolicy; source: PinPolicySource };
}
export interface EmployeePinPolicy {
    employeeId: string;
    areas: Record<SecurityArea, EmployeeAreaPolicy>;
    hasPin?: boolean;
    lastUnlockAt?: string | null;
    editable?: boolean;
}

/** Body for a policy save: a policy, or `inherit` to clear it — always for one tab. */
export type PolicyBody = { area: SecurityArea } & (PinPolicy | { inherit: true });

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);

export const securityPinApi = {
    status: () => data<SecurityPinStatus>(axios.get(`${BASE}/status`)),
    sendCode: () => data<{ email: string; expiresAt: string }>(axios.post(`${BASE}/code`)),
    setPin: (code: string, pin: string) => data<{ unlockedUntil: string }>(axios.post(`${BASE}/pin`, { code, pin })),
    unlock: (pin: string) => data<{ unlockedUntil: string }>(axios.post(`${BASE}/unlock`, { pin })),
    lock: () => data<{ unlockedUntil: null }>(axios.post(`${BASE}/lock`)),

    // Admin: per role / per employee, per tab (Roles & Permissions → Advanced, employee Access tab).
    getRolePolicy: (roleId: string) => data<RolePinPolicy>(axios.get(`${BASE}/policy/roles/${roleId}`)),
    setRolePolicy: (roleId: string, body: PolicyBody) => data<RolePinPolicy>(axios.put(`${BASE}/policy/roles/${roleId}`, body)),
    getEmployeePolicy: (employeeId: string) => data<EmployeePinPolicy>(axios.get(`${BASE}/policy/employees/${employeeId}`)),
    setEmployeePolicy: (employeeId: string, body: PolicyBody) => data<EmployeePinPolicy>(axios.put(`${BASE}/policy/employees/${employeeId}`, body)),
    resetEmployeePin: (employeeId: string) => data<{ reset: boolean }>(axios.post(`${BASE}/policy/employees/${employeeId}/reset-pin`)),
};

/** "15 minutes", "1 hour", "8 hours", "1 day", "1 day 6 hours" — for labels and footnotes. */
export function formatLockTime(minutes: number): string {
    const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;
    const part = (n: number, unit: string) => (n ? `${n} ${unit}${n === 1 ? "" : "s"}` : "");
    return [part(d, "day"), part(h, "hour"), part(m, "minute")].filter(Boolean).slice(0, 2).join(" ") || "0 minutes";
}

/** "15 min", "4 h", "1 d" — for chips and compact selects. */
export const shortLockTime = (minutes: number): string =>
    formatLockTime(minutes).replace(/ minutes?/g, " min").replace(/ hours?/g, " h").replace(/ days?/g, " d");

/** The server's reason for a failed call, and its machine code, for the lock screen to show. */
export function lockError(err: unknown): { message: string; code?: string; meta?: Record<string, unknown> } {
    const body = (err as any)?.response?.data;
    return {
        message: body?.detail || body?.message || "Something went wrong. Try again.",
        code: body?.meta?.code,
        meta: body?.meta,
    };
}
