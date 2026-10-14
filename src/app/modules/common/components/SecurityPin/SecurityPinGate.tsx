import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { GlassSurface } from '@app/modules/common/components/ui';
import { securityPinBus } from '@utils/securityPinBus';
import type { SecurityArea } from '@services/securityPin';
import { useSecurityPin } from './useSecurityPin';
import { SecurityPinPanel } from './SecurityPinPanel';

/**
 * Wraps one protected TAB's body: renders it only while that tab is open for this person,
 * otherwise the lock screen in its place. Put it around each tab's BODY, not the page, so the tab
 * bar stays and the person can see where they are.
 *
 * `area` is the tab (e.g. 'finance.salary/employee-payrolls'). Its own setting (Roles & Permissions
 * → Advanced → PIN, per role / employee) decides: No PIN → always open; otherwise open while
 * unlocked and not idle for longer than the tab's auto-lock time. So a 15-minute tab locks by
 * itself while a 1-day tab beside it stays open.
 *
 * While mounted it is the "active area" the interceptor names to the server (X-Security-Area), and
 * unmounting the children on lock is the point — figures on screen disappear the moment it locks.
 */
export function SecurityPinGate({ area, children }: { area: SecurityArea; children: React.ReactNode }) {
    const snap = useSecurityPin();
    const [, setTick] = useState(0);

    useEffect(() => {
        const unregister = securityPinBus.registerGate();
        securityPinBus.setActiveArea(area);
        return () => {
            unregister();
            if (securityPinBus.getSnapshot().activeArea === area) securityPinBus.setActiveArea(null);
        };
    }, [area]);

    const policy = snap.areas[area];
    // Re-check the tab's idle clock while it is open on a timer.
    useEffect(() => {
        if (!policy?.required || !snap.unlocked) return;
        const t = window.setInterval(() => setTick((n) => n + 1), 10_000);
        return () => window.clearInterval(t);
    }, [policy?.required, snap.unlocked]);

    const idleMs = Date.now() - securityPinBus.getSnapshot().lastActivityAt;
    const open = !!policy && (!policy.required || (snap.unlocked && idleMs <= policy.lockMinutes * 60_000));
    if (open) return <>{children}</>;

    return (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: '62vh', md: '66vh' }, px: 2, py: { xs: 3, md: 5 } }}>
            <GlassSurface variant="regular" sx={{ width: '100%', maxWidth: 460, px: { xs: 2.5, sm: 4 }, py: { xs: 3.5, sm: 4.5 } }}>
                <SecurityPinPanel area={area} />
            </GlassSurface>
        </Box>
    );
}

export default SecurityPinGate;
