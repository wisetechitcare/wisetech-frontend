import { useState } from 'react';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtTooltip } from '@app/modules/common/components/ui';
import { formatLockTime, shortLockTime, SECURITY_AREAS, type PinPolicy, type SecurityArea } from '@services/securityPin';
import { SecurityPinAreaControl } from './SecurityPinAreaControl';
import { useSecurityPinPolicy, type SecurityPinSubject } from './useSecurityPinPolicy';

/**
 * Access-tree rows that are protected but have NO tabs, so no Advanced dialog to hold the PIN:
 * they carry this chip instead. (Salary and Increment set their PIN per tab, inside Advanced.)
 */
export const SECURITY_PIN_ROW_AREAS: Record<string, SecurityArea> = {
    'app.roles-permissions': 'app.roles-permissions',
};

/**
 * "PIN · 15 min" / "No PIN" beside a protected row; clicking opens that area's PIN setting.
 */
export function SecurityPinRowChip({ subject, area, compact }: { subject: SecurityPinSubject; area: SecurityArea; compact?: boolean }) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const { data } = useSecurityPinPolicy(subject);

    const policy: PinPolicy | null = !data ? null
        : data.kind === 'role' ? (data.role.areas[area] ?? data.role.default)
        : data.employee.areas[area].policy;
    const off = policy?.mode === 'off';
    const tone = off ? theme.palette.warning.main : theme.palette.secondary.main;
    const label = !policy ? 'PIN' : off ? 'No PIN' : `PIN · ${shortLockTime(policy.lockMinutes)}`;
    const tip = `Security PIN for ${SECURITY_AREAS[area]} — ${!policy ? 'loading' : off ? 'no PIN is asked' : `auto-locks after ${formatLockTime(policy.lockMinutes)}`}. Click to change.`;

    return (
        <>
            <WtTooltip title={tip}>
                <Box
                    component="button"
                    type="button"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen(true); }}
                    aria-label={`Security PIN: ${label}`}
                    sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5, height: compact ? 28 : 26,
                        px: compact ? 0.75 : 1, borderRadius: '8px', border: '1px solid',
                        borderColor: alpha(tone, 0.35), bgcolor: alpha(tone, 0.08), color: tone,
                        fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
                        transition: 'background-color .15s ease, border-color .15s ease',
                        '&:hover': { bgcolor: alpha(tone, 0.14), borderColor: alpha(tone, 0.55) },
                        '&:focus-visible': { outline: '2px solid', outlineColor: tone, outlineOffset: 2 },
                    }}
                >
                    <KTIcon iconName="lock-2" className="fs-6" />
                    {!compact && label}
                </Box>
            </WtTooltip>
            <GlassDialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="xs"
                fullWidth
                plain
                header={
                    <GlassHeader
                        title={`${SECURITY_AREAS[area]} PIN`}
                        subtitle="Whether a PIN is asked, and how long it stays unlocked."
                        icon={<KTIcon iconName="lock-2" className="fs-1 text-white" />}
                        onClose={() => setOpen(false)}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <SecurityPinAreaControl subject={subject} area={area} />
                </Box>
            </GlassDialog>
        </>
    );
}

export default SecurityPinRowChip;
