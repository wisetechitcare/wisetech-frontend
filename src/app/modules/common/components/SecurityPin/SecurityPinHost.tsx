import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { GlassDialog } from '@app/modules/common/components/ui';
import { securityPinApi } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { useSecurityPin } from './useSecurityPin';
import { SecurityPinPanel } from './SecurityPinPanel';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;

/**
 * Mounted once, app-wide (App.tsx, signed-in only). Two jobs:
 *
 * 1. **The fallback prompt.** A protected endpoint called from a screen with no `SecurityPinGate`
 *    (a slip download, an increment dialog) is held by the axios interceptor; this opens the PIN
 *    prompt as a dialog so the request can continue instead of failing.
 * 2. **Idle re-lock.** After `ttlMinutes` (the longest of this person's tab times) with no mouse, key or touch activity while unlocked, it
 *    locks: the server cookie is cleared and every tab's protected content disappears. The server
 *    enforces the same window on its own (the cookie expires), so this is about the screen, not
 *    about trust.
 */
export function SecurityPinHost() {
    const { unlocked, pending, pendingArea, gates, ttlMinutes, required } = useSecurityPin();
    const lastActivity = useRef(Date.now());

    useEffect(() => {
        if (!unlocked || !required) return;
        lastActivity.current = Date.now();
        // Also feeds each tab's own idle clock (SecurityPinGate), throttled — mousemove is chatty.
        let lastTouch = 0;
        const mark = () => {
            const now = Date.now();
            lastActivity.current = now;
            if (now - lastTouch > 5_000) { lastTouch = now; securityPinBus.touch(); }
        };
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        const timer = window.setInterval(() => {
            if (Date.now() - lastActivity.current >= ttlMinutes * 60_000) {
                securityPinApi.lock().catch(() => undefined);
                securityPinBus.markLocked();
            }
        }, 15_000);
        return () => {
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
            window.clearInterval(timer);
        };
    }, [unlocked, ttlMinutes, required]);

    const open = pending && gates === 0;
    return (
        <GlassDialog open={open} onClose={() => securityPinBus.cancel()} maxWidth="xs" mobileFullScreen={false}>
            <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: { xs: 3, sm: 3.5 } }}>
                {open && <SecurityPinPanel area={pendingArea} onCancel={() => securityPinBus.cancel()} />}
            </Box>
        </GlassDialog>
    );
}

export default SecurityPinHost;
