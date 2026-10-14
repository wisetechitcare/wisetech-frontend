/**
 * Security PIN — the client-side state, shared by every page gate, the global unlock dialog,
 * the axios interceptor and every other open tab. No React here, so AuthHelpers can import it
 * without a cycle; `useSecurityPin` wraps it for components.
 *
 * The SERVER is the lock (403 SECURITY_LOCKED on every protected route). This only decides what to
 * show, lets a request that hit the lock wait for the unlock and retry instead of failing, and
 * tells the server which protected tab is on screen (X-Security-Area) so each tab is judged by its
 * own PIN setting.
 */

import { isSecurityArea, type AreaStatus, type SecurityArea } from '@services/securityPin';

type Listener = () => void;

export interface SecurityPinSnapshot {
    /** Known unlocked (a successful unlock or status in this session). */
    unlocked: boolean;
    unlockedUntil: string | null;
    /** A request hit the lock and is waiting for the PIN. */
    pending: boolean;
    /** The tab the waiting request was judged by (from the server's 403), for the prompt. */
    pendingArea: SecurityArea | null;
    /** Number of mounted page gates — when > 0 the page shows the prompt, not the dialog. */
    gates: number;
    /** The longest auto-lock among this person's protected tabs (for the global idle re-lock). */
    ttlMinutes: number;
    /** False when every protected tab is No PIN for this person: nothing to lock. */
    required: boolean;
    /** Per-tab settings, once the status call has answered. */
    areas: Partial<Record<SecurityArea, AreaStatus>>;
    /** The protected tab on screen — sent to the server as X-Security-Area. */
    activeArea: SecurityArea | null;
    /** Last mouse / key / touch activity or unlock (ms). A tab locks when idle past its own time. */
    lastActivityAt: number;
}

let state: SecurityPinSnapshot = {
    unlocked: false, unlockedUntil: null, pending: false, pendingArea: null, gates: 0, ttlMinutes: 15, required: true,
    areas: {}, activeArea: null, lastActivityAt: Date.now(),
};
const listeners = new Set<Listener>();
let waiters: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const CHANNEL = 'wt-security-pin';
const channel: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL) : null;

function set(patch: Partial<SecurityPinSnapshot>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
}

export const securityPinBus = {
    getSnapshot: (): SecurityPinSnapshot => state,
    subscribe(l: Listener) {
        listeners.add(l);
        return () => { listeners.delete(l); };
    },

    /** The PIN was accepted (here or in another tab): release every waiting request. */
    markUnlocked(unlockedUntil: string | null, ttlMinutes?: number, broadcast = true) {
        set({ unlocked: true, unlockedUntil, pending: false, pendingArea: null, lastActivityAt: Date.now(), ...(ttlMinutes ? { ttlMinutes } : {}) });
        const w = waiters; waiters = [];
        w.forEach((x) => x.resolve());
        if (broadcast) channel?.postMessage({ type: 'unlocked', unlockedUntil, ttlMinutes });
    },

    /** Locked (button, idle, logout, expiry, or another tab). */
    markLocked(broadcast = true) {
        set({ unlocked: false, unlockedUntil: null });
        if (broadcast) channel?.postMessage({ type: 'locked' });
    },

    /** The person closed the prompt without unlocking: fail the waiting requests. */
    cancel() {
        set({ pending: false, pendingArea: null });
        const w = waiters; waiters = [];
        w.forEach((x) => x.reject(new Error('Unlock cancelled')));
    },

    /** Called by the interceptor on a 403 SECURITY_LOCKED: resolves once unlocked. */
    waitForUnlock(area?: unknown): Promise<void> {
        set({ unlocked: false, unlockedUntil: null, pending: true, pendingArea: isSecurityArea(area) ? area : state.pendingArea });
        return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },

    registerGate(): () => void {
        set({ gates: state.gates + 1 });
        return () => set({ gates: Math.max(0, state.gates - 1) });
    },

    /** From the status call: this person's per-tab settings. */
    setPolicy(required: boolean, ttlMinutes: number | undefined, areas: Partial<Record<SecurityArea, AreaStatus>> | undefined) {
        set({ required, ...(ttlMinutes ? { ttlMinutes } : {}), ...(areas ? { areas } : {}) });
    },

    /** A gate for `area` is on screen (null when it leaves). */
    setActiveArea(area: SecurityArea | null) {
        if (area !== state.activeArea) set({ activeArea: area });
    },

    /** Throttled by the caller; does not notify (gates re-check on their own clock). */
    touch() {
        state = { ...state, lastActivityAt: Date.now() };
    },
};

channel?.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type === 'unlocked') securityPinBus.markUnlocked(e.data.unlockedUntil ?? null, e.data.ttlMinutes, false);
    if (e.data?.type === 'locked') securityPinBus.markLocked(false);
});

export const SECURITY_LOCKED_CODE = 'SECURITY_LOCKED';
export const SECURITY_AREA_HEADER = 'X-Security-Area';

/** True for the server's "this area is locked" refusal. */
export const isSecurityLockedResponse = (error: any): boolean =>
    error?.response?.status === 403 && error?.response?.data?.meta?.code === SECURITY_LOCKED_CODE;
