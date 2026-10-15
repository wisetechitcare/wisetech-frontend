import { WtButton, WtTooltip, toast, confirmDialog } from '@app/modules/common/components/ui';
import { securityPinApi, lockError } from '@services/securityPin';
import { useSecurityPinPolicy, announcePolicyChange } from './useSecurityPinPolicy';

/**
 * Admin "Reset PIN" for one employee, shown only once they have set a PIN and the viewer may edit
 * them. The PIN settings themselves (No PIN / lock time per tab) live inside the access tree — on
 * the Advanced dialog's tab rows and the Roles & Permissions chip — so this is the one PIN action
 * that has no place there: it clears the person's PIN, it does not configure a tab.
 */
export function SecurityPinResetButton({ employeeId }: { employeeId: string }) {
    const { data } = useSecurityPinPolicy({ kind: 'employee', employeeId });
    const emp = data?.kind === 'employee' ? data.employee : null;
    if (!emp || !emp.hasPin || emp.editable === false) return null;

    const resetPin = async () => {
        const yes = await confirmDialog({
            title: 'Reset their security PIN?',
            text: 'Their current PIN stops working. Next time they open a protected tab they set a new one with a code sent to their email.',
            confirmText: 'Reset PIN', danger: true,
        });
        if (!yes) return;
        try {
            await securityPinApi.resetEmployeePin(employeeId);
            toast({ icon: 'success', title: 'PIN reset. They will set a new one with an email code.' });
            announcePolicyChange();
        } catch (e) { toast({ icon: 'error', title: lockError(e).message }); }
    };

    return (
        <WtTooltip title="They have set a PIN. Clear it so they choose a new one with an email code.">
            <span>
                <WtButton size="small" ghost onClick={resetPin}>Reset PIN</WtButton>
            </span>
        </WtTooltip>
    );
}

export default SecurityPinResetButton;
