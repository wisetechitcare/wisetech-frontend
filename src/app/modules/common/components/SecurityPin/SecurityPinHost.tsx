import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import { GlassDialog } from '@app/modules/common/components/ui';
import { securityPinApi, isSecurityArea, type SecurityArea } from '@services/securityPin';
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
 * 2. **Idle re-lock (per tab).** Each unlocked tab locks on its own timer after idle past that
 *    tab's auto-lock minutes — unlocking Salary does not keep Roles open.
 */
export function SecurityPinHost() {
    const { unlocked, pending, pendingArea, gates, required, unlockedAreas, areas } = useSecurityPin();
    const lastActivity = useRef(Date.now());

    // Keep support grant in sync so gates open after refresh without a PIN unlock.
    useEffect(() => {
        let alive = true;
        securityPinApi.supportStatus()
            .then((s) => { if (alive) securityPinBus.setSupportGrant(s.activeGrant); })
            .catch(() => { if (alive) securityPinBus.clearSupportGrant(); });
        return () => { alive = false; };
    }, []);

    useEffect(() => {
        if (!unlocked || !required) return;
        lastActivity.current = Date.now();
        let lastTouch = 0;
        const mark = () => {
            const now = Date.now();
            lastActivity.current = now;
            if (now - lastTouch > 5_000) { lastTouch = now; securityPinBus.touch(); }
        };
        ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, mark, { passive: true }));
        const timer = window.setInterval(() => {
            const snap = securityPinBus.getSnapshot();
            const now = Date.now();
            for (const key of Object.keys(snap.unlockedAreas)) {
                if (!isSecurityArea(key)) continue;
                const area = key as SecurityArea;
                const policy = snap.areas[area];
                if (!policy?.required) continue;
                const activityAt = snap.lastActivityByArea[area]
                    ?? snap.unlockedAreas[area]?.unlockedAt
                    ?? 0;
                if (now - activityAt >= policy.lockMinutes * 60_000) {
                    securityPinBus.markAreaLocked(area);
                    securityPinApi.lock(area).catch(() => undefined);
                }
            }
        }, 15_000);
        return () => {
            ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, mark));
            window.clearInterval(timer);
        };
    }, [unlocked, required, unlockedAreas, areas]);

    const open = pending && gates === 0;
    return (
        <GlassDialog open={open} onClose={() => securityPinBus.cancel()} maxWidth="xs" mobileFullScreen={false}>
            <Box
                sx={{
                    px: { xs: 1, sm: 2 },
                    py: { xs: 1, sm: 2 },
                    bgcolor: 'transparent',
                    width: '100%',
                    maxWidth: '100%',
                    minWidth: 0,
                    boxSizing: 'border-box',
                    overflowX: 'hidden',
                }}
            >
                {open && <SecurityPinPanel area={pendingArea} onCancel={() => securityPinBus.cancel()} />}
            </Box>
        </GlassDialog>
    );
}

export default SecurityPinHost;
