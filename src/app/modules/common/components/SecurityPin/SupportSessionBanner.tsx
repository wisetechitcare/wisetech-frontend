import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { WtButton } from '@app/modules/common/components/ui';
import { securityPinApi, SECURITY_AREAS, type SecurityArea } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { useSecurityPin } from './useSecurityPin';

function areasLabel(areas: SecurityArea[] | undefined): string {
    if (!areas?.length) return 'selected areas';
    if (areas.length === 1) return SECURITY_AREAS[areas[0]] ?? areas[0];
    return `${areas.length} areas`;
}

/** Persistent indicator while a developer support grant is active on this session. */
export function SupportSessionBanner() {
    const { supportGrant: grant } = useSecurityPin();
    const [left, setLeft] = useState('');

    useEffect(() => {
        let alive = true;
        const load = () => {
            securityPinApi.supportStatus()
                .then((s) => {
                    if (!alive) return;
                    securityPinBus.setSupportGrant(s.activeGrant);
                })
                .catch(() => {
                    if (alive) securityPinBus.clearSupportGrant();
                });
        };
        load();
        const t = setInterval(load, 30_000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    useEffect(() => {
        if (!grant) return;
        const tick = () => {
            const ms = new Date(grant.expiresAt).getTime() - Date.now();
            if (ms <= 0) {
                setLeft('expired');
                securityPinBus.clearSupportGrant();
                return;
            }
            const m = Math.floor(ms / 60_000);
            const s = Math.floor((ms % 60_000) / 1000);
            setLeft(`${m}:${String(s).padStart(2, '0')}`);
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, [grant]);

    if (!grant) return null;

    return (
        <Box
            role="status"
            sx={{
                mx: { xs: 1.5, sm: 2.5, lg: 4 },
                mt: 1.5,
                px: 1.75,
                py: 1.25,
                borderRadius: '10px',
                bgcolor: alpha('#B45309', 0.1),
                border: '1px solid',
                borderColor: alpha('#B45309', 0.4),
            }}
        >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                <Box>
                    <Typography sx={{ m: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>
                        Support session — {grant.targetName || grant.targetEmployeeId}
                    </Typography>
                    <Typography sx={{ m: 0, fontSize: 12, color: '#78350F' }}>
                        Viewing their screen (read-only) · {areasLabel(grant.areas)} · {left === 'expired' ? 'expired' : `${left} left`}
                    </Typography>
                </Box>
                <WtButton
                    size="small"
                    onClick={async () => {
                        await securityPinApi.supportRevoke(grant.id).catch(() => undefined);
                        securityPinBus.clearSupportGrant();
                        await securityPinApi.lock().catch(() => undefined);
                        securityPinBus.markLocked();
                    }}
                >
                    End session
                </WtButton>
            </Stack>
        </Box>
    );
}

export default SupportSessionBanner;
