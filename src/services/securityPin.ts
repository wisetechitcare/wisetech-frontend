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
    "settings.developerMfa": "System PIN MFA",
} as const;
export type SecurityArea = keyof typeof SECURITY_AREAS;
export const ALL_AREAS = Object.keys(SECURITY_AREAS) as SecurityArea[];
export const isSecurityArea = (v: unknown): v is SecurityArea => typeof v === "string" && v in SECURITY_AREAS;

/** Tabs a System PIN support request may open. MFA settings are not requestable. */
export const SUPPORT_REQUESTABLE_AREAS: SecurityArea[] = [
    "finance.salary/my-salary",
    "finance.salary/employee-payrolls",
    "finance.salary/configure",
    "finance.increment/my-increment",
    "finance.increment/employee-increment",
    "app.roles-permissions",
];

/** Self tabs → employee twin (support is never about the developer's own My Salary / My Increment). */
export const SUPPORT_SELF_TO_EMPLOYEE: Partial<Record<SecurityArea, SecurityArea>> = {
    "finance.salary/my-salary": "finance.salary/employee-payrolls",
    "finance.increment/my-increment": "finance.increment/employee-increment",
};

export function supportLandingArea(area: SecurityArea): SecurityArea {
    return SUPPORT_SELF_TO_EMPLOYEE[area] ?? area;
}

/** Route to land on after activating a grant for this area. */
export const SECURITY_AREA_PATHS: Record<SecurityArea, string> = {
    "finance.salary/my-salary": "/finance/salary/my-salary",
    "finance.salary/employee-payrolls": "/finance/salary/employee-payrolls",
    "finance.salary/configure": "/finance/salary/configure",
    "finance.increment/my-increment": "/finance/increment/my-increment",
    "finance.increment/employee-increment": "/finance/increment/employee-increment",
    "app.roles-permissions": "/admin/roles-permissions",
    "settings.developerMfa": "/admin/app-settings?area=developer-mfa",
};

/**
 * Area to preselect from the page the lock screen is on.
 * Remaps My Salary / My Increment to the employee twin.
 * Returns null on pages that are not support destinations (e.g. System PIN MFA) —
 * never invent Employee Payrolls.
 */
export function defaultSupportAreaFromSource(source: SecurityArea | null | undefined): SecurityArea | null {
    if (source && SUPPORT_REQUESTABLE_AREAS.includes(source)) return supportLandingArea(source);
    return null;
}

export type PinMode = "required" | "off";
export interface PinPolicy { mode: PinMode; lockMinutes: number }
export type PinPolicySource = { kind: "employee" } | { kind: "role"; roleName: string } | { kind: "default" };

export interface AreaStatus {
    required: boolean;
    lockMinutes: number;
    source: PinPolicySource;
    /** This browser's unlock is still fresh enough for THIS tab (always true for No PIN). */
    unlocked: boolean;
    /** ISO end of this tab's unlock, or null when locked / No PIN. */
    unlockedUntil?: string | null;
}

export interface SecurityPinStatus {
    hasPin: boolean;
    /** ISO end of the longest open tab unlock, or null when every tab is locked. */
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
    /** True when the server kill-switch `SECURITY_PIN_DISABLED` is on — no unlock/setup UI. */
    disabled?: boolean;
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
    setPin: (code: string, pin: string, area?: SecurityArea | null) =>
        data<{ unlockedUntil: string; area: SecurityArea | null }>(
            axios.post(`${BASE}/pin`, { code, pin, ...(area ? { area } : {}) }),
        ),
    /** Unlock ONE protected tab — other tabs stay locked. */
    unlock: (pin: string, area: SecurityArea) =>
        data<{ unlockedUntil: string; area: SecurityArea }>(
            axios.post(`${BASE}/unlock`, { pin, area }),
        ),
    /** Lock one tab, or every tab when `area` is omitted. */
    lock: (area?: SecurityArea | null) =>
        data<{ unlockedUntil: null; area: SecurityArea | null }>(
            axios.post(`${BASE}/lock`, area ? { area } : {}),
        ),

    // Admin: per role / per employee, per tab (Roles & Permissions → Advanced, employee Access tab).
    getRolePolicy: (roleId: string) => data<RolePinPolicy>(axios.get(`${BASE}/policy/roles/${roleId}`)),
    setRolePolicy: (roleId: string, body: PolicyBody) => data<RolePinPolicy>(axios.put(`${BASE}/policy/roles/${roleId}`, body)),
    getEmployeePolicy: (employeeId: string) => data<EmployeePinPolicy>(axios.get(`${BASE}/policy/employees/${employeeId}`)),
    setEmployeePolicy: (employeeId: string, body: PolicyBody) => data<EmployeePinPolicy>(axios.put(`${BASE}/policy/employees/${employeeId}`, body)),
    resetEmployeePin: (employeeId: string) => data<{ reset: boolean }>(axios.post(`${BASE}/policy/employees/${employeeId}/reset-pin`)),

    // Developer TOTP MFA + temporary System PIN support grants (Super Admin / allow-listed).
    supportStatus: () => data<SystemPinSupportStatus>(axios.get(`${BASE}/support/status`)),
    mfaEnrollStart: () => data<MfaEnrollStart>(axios.post(`${BASE}/mfa/enroll/start`)),
    /** Stage 1 — verify first TOTP; returns `{ stage: 'awaiting_next' }`. */
    mfaEnrollConfirmFirst: (code: string) =>
        data<{ stage: 'awaiting_next'; enabled: false }>(
            axios.post(`${BASE}/mfa/enroll/confirm`, { code }),
        ),
    /** Stage 2 — verify next consecutive TOTP after stage 1; returns recovery codes. */
    mfaEnrollConfirmNext: (nextCode: string) =>
        data<{ recoveryCodes: string[]; enabled: true }>(
            axios.post(`${BASE}/mfa/enroll/confirm`, { nextCode }),
        ),
    mfaDisable: (code: string) => data<{ enabled: false }>(axios.post(`${BASE}/mfa/disable`, { code })),
    mfaRecovery: (code: string) => data<{ mfaDisabled: boolean; mustReenroll: boolean }>(axios.post(`${BASE}/mfa/recovery`, { code })),
    /** Super Admin: everyone who may use System PIN MFA + their status. */
    mfaRoster: () => data<MfaRosterRow[]>(axios.get(`${BASE}/mfa/roster`)),
    mfaForceDisable: (userId: string) => data<{ enabled: false }>(axios.post(`${BASE}/mfa/roster/${encodeURIComponent(userId)}/force-disable`)),
    mfaClearLockout: (userId: string) => data<{ cleared: true }>(axios.post(`${BASE}/mfa/roster/${encodeURIComponent(userId)}/clear-lockout`)),
    supportCreateRequest: (body: {
        targetEmployeeId: string;
        reason: string;
        ticketRef?: string;
        durationMinutes?: number;
        areas?: SecurityArea[];
        sourceArea?: SecurityArea | null;
        totpCode: string;
    }) => data<SupportRequestResult>(axios.post(`${BASE}/support/requests`, body)),
    supportListRequests: () => data<SupportRequestListItem[]>(axios.get(`${BASE}/support/requests`)),
    supportListApprovals: () => data<SupportApprovalItem[]>(axios.get(`${BASE}/support/approvals`)),
    supportDecide: (id: string, approve: boolean, note?: string) =>
        data<{ status: string; grantId?: string }>(axios.post(`${BASE}/support/requests/${id}/decide`, { approve, note })),
    supportActivate: (grantId: string, totpCode: string) =>
        data<SupportSessionGrant>(axios.post(`${BASE}/support/grants/${grantId}/activate`, { totpCode })),
    supportRevoke: (grantId: string) => data<{ revoked: boolean }>(axios.post(`${BASE}/support/grants/${grantId}/revoke`)),

    // RBAC: System PIN Support Access (duration + approval + approver roles).
    getRoleSupportPolicy: (roleId: string) =>
        data<RoleSupportPolicyDto>(axios.get(`${BASE}/support/policy/roles/${roleId}`)),
    setRoleSupportPolicy: (roleId: string, body: SupportPolicyBody) =>
        data<RoleSupportPolicyDto>(axios.put(`${BASE}/support/policy/roles/${roleId}`, body)),
    getEmployeeSupportPolicy: (employeeId: string) =>
        data<EmployeeSupportPolicyDto>(axios.get(`${BASE}/support/policy/employees/${employeeId}`)),
    setEmployeeSupportPolicy: (employeeId: string, body: SupportPolicyBody) =>
        data<EmployeeSupportPolicyDto>(axios.put(`${BASE}/support/policy/employees/${employeeId}`, body)),
};

export interface MfaStatusDto {
    configured: boolean;
    enabled: boolean;
    enrolledAt: string | null;
    pending: boolean;
    recoveryCodesRemaining: number;
    lockedUntil: string | null;
}

export interface SupportSessionGrant {
    id: string;
    requestId?: string;
    targetEmployeeId: string;
    targetName: string | null;
    expiresAt: string;
    operations: string;
    /** Tabs this grant may open. Empty / missing → all requestable tabs (legacy). */
    areas?: SecurityArea[];
    readOnly: true;
}

/** Two modes only: MFA alone, or MFA + a second person. */
export type SupportApprovalMode = 'required' | 'never';

export interface SupportAccessPolicy {
    durationMinutes: number;
    approvalMode: SupportApprovalMode;
    /** Roles whose members get the approval inbox item. Empty + no employees → Admin/Super Admin. */
    approverRoleIds: string[];
    /** Specific employees who also get the approval request. */
    approverEmployeeIds: string[];
}

export type SupportPolicySource =
    | { kind: 'default' }
    | { kind: 'role'; roleName: string }
    | { kind: 'employee' };

export interface SupportPolicySnapshot extends SupportAccessPolicy {
    requiresApproval: boolean;
    source: SupportPolicySource;
}

export interface SystemPinSupportStatus {
    eligible: boolean;
    canApprove: boolean;
    /** Super Admin: can open the org-wide MFA roster and force-disable / clear lockout. */
    canManageMfa?: boolean;
    mfa: MfaStatusDto;
    activeGrant: SupportSessionGrant | null;
    /** Effective RBAC policy for this session (duration + approval). */
    policy?: SupportPolicySnapshot;
}

export type SupportPolicyBody = SupportAccessPolicy | { inherit: true };

export interface RoleSupportPolicyDto {
    roleId: string;
    policy: SupportAccessPolicy | null;
    default: SupportAccessPolicy;
    durationPresets: number[];
    editable: boolean;
}

export interface EmployeeSupportPolicyDto {
    employeeId: string;
    policy: SupportAccessPolicy;
    source: SupportPolicySource;
    override: SupportAccessPolicy | null;
    fromRoles: { policy: SupportAccessPolicy; source: SupportPolicySource };
    default: SupportAccessPolicy;
    durationPresets: number[];
    editable?: boolean;
}

export interface SupportApprovalItem {
    id: string;
    targetEmployeeId: string;
    reason: string;
    ticketRef: string | null;
    durationMinutes: number;
    createdAt: string;
    developerUserId: string;
}

/** @deprecated Use SystemPinSupportStatus */
export type SalarySupportStatus = SystemPinSupportStatus;

export type MfaRosterStatus = 'enrolled' | 'pending' | 'not_enrolled' | 'disabled' | 'locked';

export interface MfaRosterRow {
    userId: string;
    employeeId: string | null;
    name: string;
    email: string | null;
    employeeCode: string | null;
    status: MfaRosterStatus;
    enrolledAt: string | null;
    disabledAt: string | null;
    lockedUntil: string | null;
    recoveryCodesRemaining: number;
    eligible: boolean;
}

export interface MfaEnrollStart {
    otpauthUrl: string;
    qrDataUrl: string;
    manualSecret: string;
    expiresAt: string;
}

export interface SupportRequestResult {
    requestId: string;
    status: string;
    targetEmployeeId: string;
    targetName: string;
    durationMinutes: number;
    areas?: SecurityArea[];
    grantId: string | null;
    requiresApproval: boolean;
    /** MFA-only policy: grant was activated with the same TOTP as the request. */
    activated?: boolean;
    activeGrant?: SupportSessionGrant | null;
    approvalMode?: SupportApprovalMode;
    maxDurationMinutes?: number;
}

export interface SupportRequestListItem {
    id: string;
    targetEmployeeId: string;
    reason: string;
    ticketRef: string | null;
    status: string;
    durationMinutes: number;
    createdAt: string;
    grantId: string | null;
    grantExpiresAt: string | null;
    grantActivatedAt: string | null;
    grantRevokedAt: string | null;
}

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
