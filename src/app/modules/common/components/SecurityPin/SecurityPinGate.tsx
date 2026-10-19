import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { securityPinBus, supportCoversArea } from '@utils/securityPinBus';
import type { SecurityArea } from '@services/securityPin';
import { useSecurityPin } from './useSecurityPin';
import { SecurityPinPanel } from './SecurityPinPanel';

/**
 * Wraps one protected TAB's body: renders it only while that tab is open for this person,
 * otherwise the lock screen in its place. Put it around each tab's BODY, not the page, so the tab
 * bar stays and the person can see where they are.
 *
 * `area` is the tab (e.g. 'finance.salary/employee-payrolls'). Its own setting (Roles & Permissions
 * → Advanced → PIN, per role / employee) decides: No PIN → always open; otherwise open only while
 * THIS tab is unlocked and not idle past its own auto-lock time. Unlocking another tab does not
 * open this one.
 *
 * Active System PIN Support Access also opens employee-scoped tabs (not My Salary / My Increment)
 * for the grant duration — without a PIN unlock cookie.
 */
export function SecurityPinGate({ area, children }: { area: SecurityArea; children: React.ReactNode }) {
    const snap = useSecurityPin();
    const [, setTick] = useState(0);

    useEffect(() => {
        const unregister = securityPinBus.registerGate(area);
        securityPinBus.setActiveArea(area);
        return () => {
            unregister();
            if (securityPinBus.getSnapshot().activeArea === area) securityPinBus.setActiveArea(null);
        };
    }, [area]);

    const policy = snap.areas[area];
    const supportOpen = !!securityPinBus.getSupportGrant() && supportCoversArea(area);
    const pinOpen = !!snap.unlockedAreas[area];
    const areaOpen = securityPinBus.isAreaUnlocked(area);
    useEffect(() => {
        if (!policy?.required || !areaOpen) return;
        const t = window.setInterval(() => setTick((n) => n + 1), 10_000);
        return () => window.clearInterval(t);
    }, [policy?.required, areaOpen, snap.supportGrant?.expiresAt]);

    // Kill-switch / all tabs No PIN — never show unlock or "Set Up Security PIN".
    if (!snap.required) return <>{children}</>;

    const activityAt = snap.lastActivityByArea[area] ?? snap.unlockedAreas[area]?.unlockedAt ?? 0;
    const idleMs = Date.now() - activityAt;
    const pinStillFresh = pinOpen && idleMs <= (policy?.lockMinutes ?? 15) * 60_000;
    const open = !!policy && (
        !policy.required
        || supportOpen
        || pinStillFresh
    );
    if (open) return <>{children}</>;

    return (
        <Box
            sx={{
                display: 'grid',
                placeItems: 'center',
                alignContent: 'center',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                minHeight: { xs: '52vh', md: '64vh' },
                px: { xs: 1.25, sm: 2 },
                py: { xs: 2, md: 4.5 },
                boxSizing: 'border-box',
                overflowX: 'hidden',
            }}
        >
            <Box sx={{ width: '100%', maxWidth: 420, minWidth: 0 }}>
                <SecurityPinPanel area={area} />
            </Box>
        </Box>
    );
}

export default SecurityPinGate;
