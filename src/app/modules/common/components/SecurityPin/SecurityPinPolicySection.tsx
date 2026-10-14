import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { SettingsSection, WtButton, InlineNotice, TRIO, toast, confirmDialog } from '@app/modules/common/components/ui';
import { securityPinApi, lockError, ALL_AREAS, SECURITY_AREAS } from '@services/securityPin';
import { SecurityPinAreaControl } from './SecurityPinAreaControl';
import { useSecurityPinPolicy, announcePolicyChange, type SecurityPinSubject } from './useSecurityPinPolicy';

export type { SecurityPinSubject } from './useSecurityPinPolicy';
export { SECURITY_PIN_POLICY_CHANGED } from './useSecurityPinPolicy';

/**
 * Security PIN for one ROLE or one EMPLOYEE — every protected tab in one place: My Salary,
 * Employee Payrolls, Salary Configure, My Increment, Employee Increment, Roles & Permissions. Each
 * is No PIN or an auto-lock time you choose (1 minute to 7 days). The same per-tab controls also
 * sit on each tab row of the access tree's Advanced dialog; they share data, so either place works.
 *
 * Precedence (server-side, per tab): the employee's own setting → the most relaxed of their
 * roles → the default. For an employee it also offers Reset PIN.
 */
export function SecurityPinPolicySection({ subject }: { subject: SecurityPinSubject }) {
    const isRole = subject.kind === 'role';
    const { data } = useSecurityPinPolicy(subject);
    const editable = !!data && (data.kind === 'role' ? data.role.editable : data.employee.editable !== false);
    const emp = data?.kind === 'employee' ? data.employee : null;

    const resetPin = async () => {
        if (subject.kind !== 'employee') return;
        const yes = await confirmDialog({
            title: 'Reset their security PIN?',
            text: 'Their current PIN stops working. Next time they open a protected tab they set a new one with a code sent to their email.',
            confirmText: 'Reset PIN', danger: true,
        });
        if (!yes) return;
        try {
            await securityPinApi.resetEmployeePin(subject.employeeId);
            toast({ icon: 'success', title: 'PIN reset. They will set a new one with an email code.' });
            announcePolicyChange();
        } catch (e) { toast({ icon: 'error', title: lockError(e).message }); }
    };

    return (
        <SettingsSection
            tone={TRIO.purple}
            icon="lock-2"
            title="Security PIN"
            description={isRole
                ? `Per tab: whether ${subject.roleName ? `people with the ${subject.roleName} role` : 'this role'} must enter their PIN, and how long it stays unlocked.`
                : 'Per tab, for this person only. Leave a tab on "Follow roles" to use their roles.'}
        >
            <Stack spacing={1.75}>
                {data && !editable && <InlineNotice trio={TRIO.slate} icon="lock">Only a Super Admin can change this.</InlineNotice>}
                {ALL_AREAS.map((area) => (
                    <SecurityPinAreaControl key={area} subject={subject} area={area} label={SECURITY_AREAS[area]} />
                ))}
                {emp && editable && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1, pt: 1.25, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                            {emp.hasPin ? 'They have set a PIN.' : 'They have not set a PIN yet.'}
                        </Typography>
                        {emp.hasPin && <WtButton size="small" ghost onClick={resetPin}>Reset PIN</WtButton>}
                    </Box>
                )}
            </Stack>
        </SettingsSection>
    );
}

export default SecurityPinPolicySection;
