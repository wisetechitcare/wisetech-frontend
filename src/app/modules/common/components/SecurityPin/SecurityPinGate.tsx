import { useEffect } from 'react';
import Box from '@mui/material/Box';
import { GlassSurface } from '@app/modules/common/components/ui';
import { securityPinBus } from '@utils/securityPinBus';
import { useSecurityPin } from './useSecurityPin';
import { SecurityPinPanel } from './SecurityPinPanel';

/**
 * Wraps protected content: renders it only while the security PIN is unlocked, otherwise the lock
 * screen in its place. Put it around each tab's BODY, not the page, so the tab bar stays and
 * the person can see where they are.
 *
 * Unmounting the children on lock is the point — figures already on screen disappear the moment
 * the lock engages (button, idle, another tab), not on the next request.
 */
export function SecurityPinGate({ children }: { children: React.ReactNode }) {
    const { unlocked } = useSecurityPin();
    // While a gate is on screen, a locked request is answered HERE rather than by the dialog.
    useEffect(() => securityPinBus.registerGate(), []);

    if (unlocked) return <>{children}</>;

    return (
        <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: '62vh', md: '66vh' }, px: 2, py: { xs: 3, md: 5 } }}>
            <GlassSurface variant="regular" sx={{ width: '100%', maxWidth: 460, px: { xs: 2.5, sm: 4 }, py: { xs: 3.5, sm: 4.5 } }}>
                <SecurityPinPanel />
            </GlassSurface>
        </Box>
    );
}

export default SecurityPinGate;
