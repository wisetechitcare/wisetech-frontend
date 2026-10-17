/**
 * Security PIN — the client-side state, shared by every page gate, the global unlock dialog,
 * the axios interceptor and every other open tab. No React here, so AuthHelpers can import it
 * without a cycle; `useSecurityPin` wraps it for components.
 *
 * The SERVER is the lock (403 SECURITY_LOCKED on every protected route). This only decides what to
 * show, lets a request that hit the lock wait for the unlock and retry instead of failing, and
 * tells the server which protected tab is on screen (X-Security-Area) so each tab is judged by its
 * own PIN setting.
 *
 * Unlocks are PER TAB: unlocking Salary does not open Roles, and each tab has its own timer.
 */

import {
    isSecurityArea,
    SUPPORT_REQUESTABLE_AREAS,
    SUPPORT_SELF_TO_EMPLOYEE,
    supportLandingArea,
    type AreaStatus,
    type SecurityArea,
    type SupportSessionGrant,
} from '@services/securityPin';

type Listener = () => void;

export interface AreaUnlockState {
    /** ISO end of this tab's unlock window. */
    unlockedUntil: string | null;
    /** When this tab was unlocked / last renewed (ms). */
    unlockedAt: number;
}

export interface SecurityPinSnapshot {
    /**
     * True when at least one required tab is unlocked in this browser.
     * Prefer `isAreaUnlocked(area)` — global unlock no longer opens every tab.
     */
    unlocked: boolean;
    /** @deprecated Prefer per-area `unlockedAreas[area].unlockedUntil`. */
    unlockedUntil: string | null;
    /** Per-tab unlock sessions in this browser. */
    unlockedAreas: Partial<Record<SecurityArea, AreaUnlockState>>;
    /** A request hit the lock and is waiting for the PIN. */
    pending: boolean;
    /** The tab the waiting request was judged by (from the server's 403), for the prompt. */
    pendingArea: SecurityArea | null;
    /** Number of mounted page gates — when > 0 the page shows the prompt, not the dialog. */
    gates: number;
    /** Fallback idle ceiling (longest tab); each tab still uses its own lockMinutes. */
    ttlMinutes: number;
    /** False when every protected tab is No PIN for this person: nothing to lock. */
    required: boolean;
    /** Per-tab settings, once the status call has answered. */
    areas: Partial<Record<SecurityArea, AreaStatus>>;
    /** The protected tab on screen — sent to the server as X-Security-Area. */
    activeArea: SecurityArea | null;
    /** Last mouse / key / touch activity per unlocked tab (ms). */
    lastActivityByArea: Partial<Record<SecurityArea, number>>;
    /**
     * Active System PIN Support Access grant (developer MFA path).
     * Opens employee-scoped tabs without a PIN unlock; never My Salary / My Increment.
     */
    supportGrant: SupportSessionGrant | null;
    /** When set, Employee Payrolls / Increment should open this target's detail. */
    supportFocusEmployeeId: string | null;
}

let state: SecurityPinSnapshot = {
    unlocked: false,
    unlockedUntil: null,
    unlockedAreas: {},
    pending: false,
    pendingArea: null,
    gates: 0,
    ttlMinutes: 15,
    required: true,
    areas: {},
    activeArea: null,
    lastActivityByArea: {},
    supportGrant: null,
    supportFocusEmployeeId: null,
};

/** True when the active support grant includes this tab (or legacy grants with no area list). */
export function supportCoversArea(area: SecurityArea | null | undefined): boolean {
    if (!area || area === 'settings.developerMfa') return false;
    // My Salary / My Increment are always the developer's own record — support never opens them.
    if (area in SUPPORT_SELF_TO_EMPLOYEE) return false;
    const grant = state.supportGrant;
    if (!supportGrantFresh(grant)) return false;
    const listed = (grant.areas ?? [])
        .filter((a): a is SecurityArea => isSecurityArea(a) && SUPPORT_REQUESTABLE_AREAS.includes(a))
        .map(supportLandingArea);
    const needed = supportLandingArea(area);
    if (!listed.length) return SUPPORT_REQUESTABLE_AREAS.includes(needed) && !(needed in SUPPORT_SELF_TO_EMPLOYEE);
    return listed.includes(needed);
}

function supportGrantFresh(grant: SupportSessionGrant | null | undefined): grant is SupportSessionGrant {
    if (!grant?.expiresAt || !grant.id) return false;
    return new Date(grant.expiresAt).getTime() > Date.now();
}

/** Activate used to return `grantId`; status returns `id`. Accept either. */
function normalizeSupportGrant(
    grant: SupportSessionGrant | null | undefined | (Partial<SupportSessionGrant> & { grantId?: string }),
): SupportSessionGrant | null {
    if (!grant || typeof grant !== 'object') return null;
    const id = (grant as SupportSessionGrant).id || (grant as { grantId?: string }).grantId;
    if (!id || !grant.expiresAt || !grant.targetEmployeeId) return null;
    const areas = Array.isArray(grant.areas)
        ? grant.areas.filter(isSecurityArea)
        : undefined;
    return {
        id: String(id),
        requestId: grant.requestId,
        targetEmployeeId: String(grant.targetEmployeeId),
        targetName: grant.targetName ?? null,
        expiresAt: String(grant.expiresAt),
        operations: String(grant.operations ?? 'read'),
        ...(areas?.length ? { areas } : {}),
        readOnly: true,
    };
}
const listeners = new Set<Listener>();
let waiters: Array<{ area: SecurityArea | null; resolve: () => void; reject: (e: unknown) => void }> = [];
/** Tabs the person walked away from — late 403s must not reopen their PIN dialog elsewhere. */
const leftAreas = new Set<SecurityArea>();

const CHANNEL = 'wt-security-pin';
const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

function set(patch: Partial<SecurityPinSnapshot>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
}

function deriveUnlocked(unlockedAreas: SecurityPinSnapshot['unlockedAreas']): {
    unlocked: boolean;
    unlockedUntil: string | null;
} {
    const entries = Object.values(unlockedAreas).filter(Boolean) as AreaUnlockState[];
    if (entries.length === 0) return { unlocked: false, unlockedUntil: null };
    let latest: string | null = null;
    for (const e of entries) {
        if (e.unlockedUntil && (!latest || e.unlockedUntil > latest)) latest = e.unlockedUntil;
    }
    return { unlocked: true, unlockedUntil: latest };
}

function releaseWaiters(area: SecurityArea | null) {
    const keep: typeof waiters = [];
    const done: typeof waiters = [];
    for (const w of waiters) {
        if (!w.area || !area || w.area === area) done.push(w);
        else keep.push(w);
    }
    waiters = keep;
    done.forEach((x) => x.resolve());
}

export const securityPinBus = {
    getSnapshot: (): SecurityPinSnapshot => state,
    subscribe(l: Listener) {
        listeners.add(l);
        return () => { listeners.delete(l); };
    },

    /** True when this tab needs no PIN, has a live PIN unlock, or an active support grant covers it. */
    isAreaUnlocked(area: SecurityArea | null | undefined): boolean {
        if (!area) return state.unlocked || supportGrantFresh(state.supportGrant);
        const policy = state.areas[area];
        if (policy && !policy.required) return true;
        if (supportGrantFresh(state.supportGrant) && supportCoversArea(area)) return true;
        return !!state.unlockedAreas[area];
    },

    /** Active support grant, or null when expired / cleared. */
    getSupportGrant(): SupportSessionGrant | null {
        return supportGrantFresh(state.supportGrant) ? state.supportGrant : null;
    },

    /** After activate (or hydrate from /support/status). Does not PIN-unlock tabs. */
    setSupportGrant(grant: SupportSessionGrant | null | (Partial<SupportSessionGrant> & { grantId?: string }), broadcast = true) {
        const normalized = normalizeSupportGrant(grant);
        const next = supportGrantFresh(normalized) ? normalized : null;
        const isNewGrant = !!next && next.id !== state.supportGrant?.id;
        set({
            supportGrant: next,
            // Only queue focus when a *new* session starts — not on every status poll.
            supportFocusEmployeeId: next
                ? (isNewGrant ? next.targetEmployeeId : state.supportFocusEmployeeId)
                : null,
            pending: next ? false : state.pending,
            pendingArea: next ? null : state.pendingArea,
        });
        if (next) releaseWaiters(null);
        if (broadcast) channel?.postMessage({ type: 'support-grant', grant: next });
    },

    clearSupportGrant(broadcast = true) {
        set({ supportGrant: null, supportFocusEmployeeId: null });
        if (broadcast) channel?.postMessage({ type: 'support-grant', grant: null });
    },

    /** Queue Employee Payrolls to open this employee once (e.g. after redirect off My Salary). */
    queueSupportFocus(employeeId: string | null | undefined) {
        if (!employeeId) return;
        set({ supportFocusEmployeeId: employeeId });
    },

    /** Consume one-shot focus so Employee Payrolls opens the target once. */
    takeSupportFocusEmployeeId(): string | null {
        const id = state.supportFocusEmployeeId;
        if (id) set({ supportFocusEmployeeId: null });
        return id;
    },

    peekSupportFocusEmployeeId(): string | null {
        return state.supportFocusEmployeeId;
    },

    /**
     * The PIN was accepted for ONE tab (here or in another browser tab).
     * Other tabs stay locked until unlocked separately.
     */
    markAreaUnlocked(
        area: SecurityArea,
        unlockedUntil: string | null,
        lockMinutes?: number,
        broadcast = true,
    ) {
        const unlockedAt = Date.now();
        const unlockedAreas = {
            ...state.unlockedAreas,
            [area]: { unlockedUntil, unlockedAt },
        };
        const derived = deriveUnlocked(unlockedAreas);
        const lastActivityByArea = { ...state.lastActivityByArea, [area]: unlockedAt };
        const pendingDone = state.pendingArea === area || state.pendingArea == null;
        set({
            ...derived,
            unlockedAreas,
            lastActivityByArea,
            pending: pendingDone ? false : state.pending,
            pendingArea: pendingDone ? null : state.pendingArea,
            ...(lockMinutes ? { ttlMinutes: Math.max(state.ttlMinutes, lockMinutes) } : {}),
        });
        releaseWaiters(area);
        if (broadcast) {
            channel?.postMessage({ type: 'area-unlocked', area, unlockedUntil, lockMinutes });
        }
    },

    /** @deprecated Prefer markAreaUnlocked / setSupportGrant. Clears pending waiters only. */
    markUnlocked(_unlockedUntil: string | null, ttlMinutes?: number, broadcast = true) {
        set({
            pending: false,
            pendingArea: null,
            ...(ttlMinutes ? { ttlMinutes } : {}),
        });
        releaseWaiters(null);
        if (broadcast) channel?.postMessage({ type: 'support-unlocked', ttlMinutes });
    },

    /** Lock one tab, or every tab when `area` is omitted. */
    markAreaLocked(area?: SecurityArea | null, broadcast = true) {
        if (!area) {
            set({
                unlocked: false,
                unlockedUntil: null,
                unlockedAreas: {},
                lastActivityByArea: {},
            });
            if (broadcast) channel?.postMessage({ type: 'locked' });
            return;
        }
        const unlockedAreas = { ...state.unlockedAreas };
        delete unlockedAreas[area];
        const lastActivityByArea = { ...state.lastActivityByArea };
        delete lastActivityByArea[area];
        set({ ...deriveUnlocked(unlockedAreas), unlockedAreas, lastActivityByArea });
        if (broadcast) channel?.postMessage({ type: 'area-locked', area });
    },

    /** @deprecated Use markAreaLocked. */
    markLocked(broadcast = true) {
        securityPinBus.markAreaLocked(undefined, broadcast);
    },

    /** The person closed the prompt without unlocking: fail the waiting requests. */
    cancel() {
        set({ pending: false, pendingArea: null });
        const w = waiters; waiters = [];
        w.forEach((x) => x.reject(new Error('Unlock cancelled')));
    },

    /** Called by the interceptor on a 403 SECURITY_LOCKED: resolves once THAT tab is unlocked. */
    waitForUnlock(area?: unknown): Promise<void> {
        const a = isSecurityArea(area) ? area : state.pendingArea;
        // Person left this tab (e.g. Salary → Attendance). Fail the retry instead of
        // opening "My Salary is locked" on top of the next page.
        if (a && leftAreas.has(a)) {
            return Promise.reject(new Error('Unlock cancelled'));
        }
        set({ unlocked: state.unlocked, pending: true, pendingArea: a });
        if (a && securityPinBus.isAreaUnlocked(a)) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => waiters.push({ area: a, resolve, reject }));
    },

    /**
     * A page gate for `area` is on screen. Clears the "left this tab" mark so unlocks work again.
     * On leave: drop any pending unlock for this tab so the global dialog does not follow them.
     */
    registerGate(area?: SecurityArea | null): () => void {
        if (area) leftAreas.delete(area);
        set({ gates: state.gates + 1 });
        return () => {
            set({ gates: Math.max(0, state.gates - 1) });
            if (area) {
                leftAreas.add(area);
                if (state.pending && state.pendingArea === area) securityPinBus.cancel();
            }
        };
    },

    /** From the status call: this person's per-tab settings (+ which tabs are already unlocked). */
    setPolicy(
        required: boolean,
        ttlMinutes: number | undefined,
        areas: Partial<Record<SecurityArea, AreaStatus>> | undefined,
    ) {
        const unlockedAreas: SecurityPinSnapshot['unlockedAreas'] = { ...state.unlockedAreas };
        if (areas) {
            for (const [k, v] of Object.entries(areas)) {
                if (!isSecurityArea(k) || !v) continue;
                if (v.required && v.unlocked) {
                    unlockedAreas[k] = {
                        unlockedUntil: (v as AreaStatus & { unlockedUntil?: string | null }).unlockedUntil ?? null,
                        unlockedAt: unlockedAreas[k]?.unlockedAt ?? Date.now(),
                    };
                } else if (v.required && !v.unlocked) {
                    delete unlockedAreas[k];
                }
            }
        }
        set({
            required,
            ...(ttlMinutes ? { ttlMinutes } : {}),
            ...(areas ? { areas } : {}),
            unlockedAreas,
            ...deriveUnlocked(unlockedAreas),
        });
    },

    /** A gate for `area` is on screen (null when it leaves). */
    setActiveArea(area: SecurityArea | null) {
        if (area !== state.activeArea) set({ activeArea: area });
    },

    /** Throttled by the caller; bumps activity for the active (or given) unlocked tab. */
    touch(area?: SecurityArea | null) {
        const a = area ?? state.activeArea;
        if (!a || !state.unlockedAreas[a]) return;
        state = {
            ...state,
            lastActivityByArea: { ...state.lastActivityByArea, [a]: Date.now() },
        };
    },
};

channel?.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type === 'area-unlocked' && isSecurityArea(e.data.area)) {
        securityPinBus.markAreaUnlocked(e.data.area, e.data.unlockedUntil ?? null, e.data.lockMinutes, false);
    }
    if (e.data?.type === 'area-locked' && isSecurityArea(e.data.area)) {
        securityPinBus.markAreaLocked(e.data.area, false);
    }
    if (e.data?.type === 'locked') securityPinBus.markAreaLocked(undefined, false);
    if (e.data?.type === 'support-unlocked') {
        securityPinBus.markUnlocked(null, e.data.ttlMinutes, false);
    }
    if (e.data?.type === 'support-grant') {
        securityPinBus.setSupportGrant(e.data.grant ?? null, false);
    }
});

export const SECURITY_LOCKED_CODE = 'SECURITY_LOCKED';
export const SECURITY_AREA_HEADER = 'X-Security-Area';

/** True for the server's "this area is locked" refusal. */
export const isSecurityLockedResponse = (error: any): boolean =>
    error?.response?.status === 403 && error?.response?.data?.meta?.code === SECURITY_LOCKED_CODE;
