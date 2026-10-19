import { lazy, Suspense, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtTooltip } from '@app/modules/common/components/ui';
import { shortLockTime } from '@services/securityPin';
import { useSupportAccessPolicy } from './useSupportAccessPolicy';
import type { SecurityPinSubject } from './useSecurityPinPolicy';

/** Lazy so Roles Access does not pull the policy form (WtField / MUI) until the dialog opens. */
const SupportAccessPolicyControl = lazy(() =>
    import('./SupportAccessPolicyControl').then((m) => ({ default: m.SupportAccessPolicyControl })),
);

/**
 * Chip on the System PIN MFA access-tree row — opens duration / approval / approver-role settings.
 */
export function SupportAccessPolicyChip({
    subject,
    compact,
}: {
    subject: SecurityPinSubject;
    compact?: boolean;
}) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const { data } = useSupportAccessPolicy(subject);

    const policy = !data ? null
        : data.kind === 'role' ? (data.role.policy ?? data.role.default)
        : data.employee.policy;

    const tone = theme.palette.info.main;
    const label = !policy ? 'Support'
        : `Support · ${shortLockTime(policy.durationMinutes)}`;

    return (
        <>
            <WtTooltip title="Support session rule">
                <Box
                    component="button"
                    type="button"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen(true); }}
                    aria-label={`System PIN Support Access: ${label}`}
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
                    <KTIcon iconName="shield-tick" className="fs-6" />
                    {!compact && label}
                </Box>
            </WtTooltip>
            <GlassDialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
                plain
                header={
                    <GlassHeader
                        title="Support Access"
                        subtitle="How developer PIN help sessions work."
                        icon={<KTIcon iconName="shield-tick" className="fs-1 text-white" />}
                        onClose={() => setOpen(false)}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                    {open && (
                        <Suspense fallback={<Typography sx={{ fontSize: 13, color: '#64748B' }}>Loading…</Typography>}>
                            <SupportAccessPolicyControl subject={subject} />
                        </Suspense>
                    )}
                </Box>
            </GlassDialog>
        </>
    );
}

export default SupportAccessPolicyChip;
