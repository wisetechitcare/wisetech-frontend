import { useState } from 'react';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader, WtTooltip } from '@app/modules/common/components/ui';
import { formatLockTime, shortLockTime, SECURITY_AREAS, type PinPolicy, type SecurityArea } from '@services/securityPin';
import { SecurityPinAreaControl } from './SecurityPinAreaControl';
import { useSecurityPinPolicy, type SecurityPinSubject } from './useSecurityPinPolicy';

/**
 * Access-tree rows that carry a security PIN, and which protected tabs ("areas") each one covers.
 * The row shows ONE chip; clicking it opens one dialog with every one of its tabs' PIN timings.
 * Salary and Increment list their tabs; Roles & Permissions has just itself.
 */
export const SECURITY_PIN_ROW_AREAS: Record<string, SecurityArea[]> = {
    'finance.salary': ['finance.salary/my-salary', 'finance.salary/employee-payrolls', 'finance.salary/configure'],
    'finance.increment': ['finance.increment/my-increment', 'finance.increment/employee-increment'],
    'app.roles-permissions': ['app.roles-permissions'],
    'settings.developerMfa': ['settings.developerMfa'],
};

const describe = (p: PinPolicy) => (p.mode === 'off' ? 'No PIN' : formatLockTime(p.lockMinutes));

/**
 * "PIN · 15 min" / "No PIN" beside a protected row; clicking opens that row's PIN settings. When a
 * row's tabs differ the chip says "PIN · mixed" and the dialog shows each.
 */
export function SecurityPinRowChip({ subject, label: rowLabel, areas, compact }: { subject: SecurityPinSubject; label: string; areas: SecurityArea[]; compact?: boolean }) {
    const theme = useTheme();
    const [open, setOpen] = useState(false);
    const { data } = useSecurityPinPolicy(subject);

    const policyOf = (area: SecurityArea): PinPolicy | null => !data ? null
        : data.kind === 'role' ? (data.role.areas[area] ?? data.role.default)
        : data.employee.areas[area].policy;
    const policies = areas.map(policyOf);
    const loaded = policies.every((p): p is PinPolicy => !!p);
    const allOff = loaded && (policies as PinPolicy[]).every((p) => p.mode === 'off');
    const key = (p: PinPolicy) => (p.mode === 'off' ? 'off' : String(p.lockMinutes));
    const uniform = loaded && new Set((policies as PinPolicy[]).map(key)).size === 1;
    const first = loaded ? (policies[0] as PinPolicy) : null;

    // Amber when anything is unprotected, so a No PIN tab is never hidden behind a "mixed" chip.
    const anyOff = loaded && (policies as PinPolicy[]).some((p) => p.mode === 'off');
    const tone = anyOff ? theme.palette.warning.main : theme.palette.secondary.main;
    const label = !loaded ? 'PIN'
        : allOff ? 'No PIN'
        : uniform ? `PIN · ${shortLockTime(first!.lockMinutes)}`
        : 'PIN · mixed';
    const tip = !loaded ? `Security PIN for ${rowLabel} — loading. Click to change.`
        : `Security PIN for ${rowLabel} — ${areas.map((a, i) => `${SECURITY_AREAS[a]}: ${describe(policies[i] as PinPolicy)}`).join('; ')}. Click to change.`;

    return (
        <>
            <WtTooltip title={tip}>
                <Box
                    component="button"
                    type="button"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen(true); }}
                    aria-label={`Security PIN: ${rowLabel} — ${label}`}
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
                        title={`${rowLabel} PIN`}
                        subtitle="Whether a PIN is asked, and how long it stays unlocked."
                        icon={<KTIcon iconName="lock-2" className="fs-1 text-white" />}
                        onClose={() => setOpen(false)}
                    />
                }
            >
                <Box sx={{ p: { xs: 2, sm: 2.5 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {areas.map((area) => (
                        <SecurityPinAreaControl key={area} subject={subject} area={area} label={SECURITY_AREAS[area]} />
                    ))}
                </Box>
            </GlassDialog>
        </>
    );
}

export default SecurityPinRowChip;
