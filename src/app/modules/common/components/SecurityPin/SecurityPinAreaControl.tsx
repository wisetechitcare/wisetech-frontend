import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import { WtField, WtButton, toast, TRIO } from '@app/modules/common/components/ui';
import { lockError, formatLockTime, shortLockTime, type PinPolicy, type PinPolicySource, type SecurityArea } from '@services/securityPin';
import { useSecurityPinPolicy, type SecurityPinSubject } from './useSecurityPinPolicy';

/**
 * One protected tab's security PIN for one role or employee: a single select —
 * Default / Follow roles, No PIN, a preset auto-lock time, or Custom (minutes / hours / days,
 * 1 minute to 7 days). Saves on change (Custom saves on its button), independently of the page's
 * checkbox Save, and every other control for the same role / person refreshes with it.
 *
 * Listed in the dialog the PIN chip opens on the Salary, Increment and Roles & Permissions rows.
 */

const PRESETS = [5, 15, 30, 60, 120, 240, 480, 720, 1440, 2880, 4320, 10080];
const UNITS = [{ value: '1', label: 'Minutes' }, { value: '60', label: 'Hours' }, { value: '1440', label: 'Days' }];
const MAX_MINUTES = 10080;

const describe = (p: PinPolicy) => (p.mode === 'off' ? 'No PIN' : shortLockTime(p.lockMinutes));
const fromText = (s: PinPolicySource) => (s.kind === 'role' ? `${s.roleName} role` : s.kind === 'employee' ? 'own setting' : 'default');

const valueOf = (p: PinPolicy | null): string => (!p ? 'inherit' : p.mode === 'off' ? 'off' : PRESETS.includes(p.lockMinutes) ? String(p.lockMinutes) : 'custom');

export function SecurityPinAreaControl({ subject, area, label = 'Security PIN', disabled }: {
    subject: SecurityPinSubject;
    area: SecurityArea;
    label?: string;
    disabled?: boolean;
}) {
    const { data, save } = useSecurityPinPolicy(subject);
    const isRole = subject.kind === 'role';

    const own: PinPolicy | null = !data ? null
        : data.kind === 'role' ? data.role.areas[area] : data.employee.areas[area]?.override ?? null;
    // `fromRoles` is filled by the server, but a missing area row must not throw on `.policy`.
    const inherited: { policy: PinPolicy; source: PinPolicySource } | null = !data ? null
        : data.kind === 'role' ? { policy: data.role.default, source: { kind: 'default' } }
        : data.employee.areas[area]?.fromRoles ?? null;
    const inheritedPolicy: PinPolicy = inherited?.policy ?? { mode: 'required', lockMinutes: 15 };
    const inheritedSource: PinPolicySource = inherited?.source ?? { kind: 'default' };
    const editable = !!data && (data.kind === 'role' ? data.role.editable : data.employee.editable !== false);

    const [choice, setChoice] = useState('inherit');
    const [amount, setAmount] = useState('1');
    const [unit, setUnit] = useState('1440');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const v = valueOf(own);
        setChoice(v);
        if (v === 'custom' && own) {
            const u = own.lockMinutes % 1440 === 0 ? 1440 : own.lockMinutes % 60 === 0 ? 60 : 1;
            setUnit(String(u)); setAmount(String(own.lockMinutes / u));
        }
    }, [own?.mode, own?.lockMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

    const persist = async (body: Parameters<typeof save>[0]) => {
        setBusy(true);
        try {
            await save(body);
            toast({ icon: 'success', title: 'Security PIN saved' });
        } catch (e) {
            toast({ icon: 'error', title: lockError(e).message });
            setChoice(valueOf(own));
        } finally { setBusy(false); }
    };

    const onChoose = (v: string) => {
        setChoice(v);
        if (v === 'custom') return; // saved from its own button
        if (v === 'inherit') void persist({ area, inherit: true });
        else if (v === 'off') void persist({ area, mode: 'off', lockMinutes: 0 });
        else void persist({ area, mode: 'required', lockMinutes: Number(v) });
    };

    if (!data) return <Skeleton variant="rounded" height={40} sx={{ width: '100%', maxWidth: 260 }} />;

    const customMinutes = Math.round(Number(amount) * Number(unit));
    const customError = !Number.isFinite(customMinutes) || customMinutes < 1 || customMinutes > MAX_MINUTES ? 'Between 1 minute and 7 days' : undefined;
    const effective: PinPolicy = own ?? inheritedPolicy;

    const options = [
        { value: 'inherit', label: isRole ? `Default · ${describe(inheritedPolicy)}` : `Follow roles · ${describe(inheritedPolicy)}` },
        { value: 'off', label: 'No PIN' },
        ...PRESETS.map((m) => ({ value: String(m), label: `Lock after ${formatLockTime(m)}` })),
        { value: 'custom', label: 'Custom time…' },
    ];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', minWidth: 0 }}>
            <WtField
                label={label}
                icon="lock-2"
                value={choice}
                onChange={onChoose}
                options={options}
                disabled={disabled || !editable || busy}
                hint={choice === 'inherit' && !isRole ? `From the ${fromText(inheritedSource)}.` : undefined}
                tone={effective.mode === 'off' ? TRIO.amber.c : undefined}
            />
            {choice === 'custom' && (
                <Box sx={{ display: 'grid', gap: 1, alignItems: 'start', gridTemplateColumns: { xs: '1fr 1fr', sm: 'minmax(0,1fr) minmax(0,1fr) auto' } }}>
                    <WtField label="Lock after" type="number" inputMode="numeric" min={1} value={amount} onChange={setAmount} error={customError} disabled={!editable || busy} />
                    <WtField label="Unit" value={unit} onChange={setUnit} options={UNITS} disabled={!editable || busy} />
                    <WtButton size="small" flat disabled={!!customError || busy || !editable} onClick={() => persist({ area, mode: 'required', lockMinutes: customMinutes })}
                        sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' }, alignSelf: 'center' }}>
                        Save
                    </WtButton>
                </Box>
            )}
            {effective.mode === 'off' && (
                <Typography sx={{ fontSize: 11.5, color: 'warning.main' }}>
                    No PIN: anyone at their unlocked computer can open this tab.
                </Typography>
            )}
        </Box>
    );
}

export default SecurityPinAreaControl;
