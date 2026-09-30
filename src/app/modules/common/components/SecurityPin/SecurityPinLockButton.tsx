import { KTIcon } from '@metronic/helpers';
import { WtButton, WtTooltip } from '@app/modules/common/components/ui';
import { securityPinApi } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { useSecurityPin } from './useSecurityPin';

/**
 * "Lock" — for stepping away from the desk. Locks every protected page (salary, increment, roles
 * & permissions) at once, in every tab. Shown only while unlocked.
 *
 *   variant="bar"   white on the navy tab bar (MaterialHeaderTab `headerAction`), same grammar as
 *                   `SensitiveDataHeaderToggle` beside it; label hidden on phones.
 *   variant="light" a quiet inverted button for a light page header (`ListHeader` actions).
 *
 * The `!` utilities: Metronic's unlayered button rules outrank Tailwind's layer (kit README).
 */
export function SecurityPinLockButton({ variant = 'bar' }: { variant?: 'bar' | 'light' }) {
    const { unlocked } = useSecurityPin();
    if (!unlocked) return null;

    const lock = () => {
        securityPinBus.markLocked();
        securityPinApi.lock().catch(() => undefined);
    };

    if (variant === 'light') {
        return (
            <WtTooltip title="Lock sensitive pages now">
                <WtButton size="small" inverted onClick={lock} startIcon={<KTIcon iconName="lock-2" className="fs-4" />}>
                    Lock
                </WtButton>
            </WtTooltip>
        );
    }

    return (
        <WtTooltip title="Lock sensitive pages now">
            <button
                type="button"
                onClick={lock}
                aria-label="Lock sensitive pages"
                className="inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-lg! border-0! px-3.5 text-[13px] leading-none font-semibold outline-none! transition-colors motion-reduce:transition-none bg-white/8! text-white/90! hover:bg-white/14! active:bg-white/20! focus-visible:ring-2! focus-visible:ring-white/70! max-sm:w-11 max-sm:px-0 max-sm:rounded-[10px]! max-sm:bg-transparent!"
            >
                <KTIcon iconName="lock-2" className="fs-3 text-white" />
                <span className="max-sm:sr-only">Lock</span>
            </button>
        </WtTooltip>
    );
}

export default SecurityPinLockButton;
