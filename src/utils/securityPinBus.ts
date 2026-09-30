/**
 * Security PIN — the client-side state, shared by every page gate, the global unlock dialog,
 * the axios interceptor and every other open tab. No React here, so AuthHelpers can import it
 * without a cycle; `useSecurityPin` wraps it for components.
 *
 * The SERVER is the lock (403 SECURITY_LOCKED on every protected route). This only decides what to
 * show, and lets a request that hit the lock wait for the unlock and retry instead of failing.
 */

type Listener = () => void;

export interface SecurityPinSnapshot {
    /** Known unlocked (a successful unlock or status in this session). */
    unlocked: boolean;
    unlockedUntil: string | null;
    /** A request hit the lock and is waiting for the PIN. */
    pending: boolean;
    /** Number of mounted page gates — when > 0 the page shows the prompt, not the dialog. */
    gates: number;
    /** Minutes without activity before the unlock lapses (server-configured). */
    ttlMinutes: number;
}

let state: SecurityPinSnapshot = { unlocked: false, unlockedUntil: null, pending: false, gates: 0, ttlMinutes: 15 };
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
        set({ unlocked: true, unlockedUntil, pending: false, ...(ttlMinutes ? { ttlMinutes } : {}) });
        const w = waiters; waiters = [];
        w.forEach((x) => x.resolve());
        if (broadcast) channel?.postMessage({ type: 'unlocked', unlockedUntil, ttlMinutes });
    },

    setTtl(ttlMinutes: number) {
        if (ttlMinutes && ttlMinutes !== state.ttlMinutes) set({ ttlMinutes });
    },

    /** Locked (button, idle, logout, expiry, or another tab). */
    markLocked(broadcast = true) {
        set({ unlocked: false, unlockedUntil: null });
        if (broadcast) channel?.postMessage({ type: 'locked' });
    },

    /** The person closed the prompt without unlocking: fail the waiting requests. */
    cancel() {
        set({ pending: false });
        const w = waiters; waiters = [];
        w.forEach((x) => x.reject(new Error('Unlock cancelled')));
    },

    /** Called by the interceptor on a 403 SECURITY_LOCKED: resolves once unlocked. */
    waitForUnlock(): Promise<void> {
        set({ unlocked: false, unlockedUntil: null, pending: true });
        return new Promise((resolve, reject) => waiters.push({ resolve, reject }));
    },

    registerGate(): () => void {
        set({ gates: state.gates + 1 });
        return () => set({ gates: Math.max(0, state.gates - 1) });
    },
};

channel?.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.type === 'unlocked') securityPinBus.markUnlocked(e.data.unlockedUntil ?? null, e.data.ttlMinutes, false);
    if (e.data?.type === 'locked') securityPinBus.markLocked(false);
});

export const SECURITY_LOCKED_CODE = 'SECURITY_LOCKED';

/** True for the server's "this area is locked" refusal. */
export const isSecurityLockedResponse = (error: any): boolean =>
    error?.response?.status === 403 && error?.response?.data?.meta?.code === SECURITY_LOCKED_CODE;
