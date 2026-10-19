import { useRef } from 'react';
import { KTIcon } from '@metronic/helpers';
import { WtButton, WtTooltip } from '@app/modules/common/components/ui';
import { securityPinApi } from '@services/securityPin';
import { securityPinBus } from '@utils/securityPinBus';
import { useSecurityPin } from './useSecurityPin';

/**
 * "Lock" — for stepping away from the desk. Locks the tab you are on (and only that tab).
 * Other unlocked tabs stay open until their own timer or a lock there.
 *
 * During an active support session, Lock ends the support grant (PIN lock alone would leave
 * the gate open via the grant and look broken).
 *
 *   variant="bar"   white on the navy tab bar (MaterialHeaderTab `headerAction`), same grammar as
 *                   `SensitiveDataHeaderToggle` beside it; label hidden on phones.
 *   variant="light" a quiet inverted button for a light page header (`ListHeader` actions).
 *
 * The `!` utilities: Metronic's unlayered button rules outrank Tailwind's layer (kit README).
 */
export function SecurityPinLockButton({ variant = 'bar' }: { variant?: 'bar' | 'light' }) {
    const { required, activeArea } = useSecurityPin();
    const locking = useRef(false);
    const openHere = securityPinBus.isAreaUnlocked(activeArea);
    if (!openHere || !required) return null;

    const inSupport = !!securityPinBus.getSupportGrant();
    /**
     * Wait for the server before locking here. Locking locally first mounts the lock screen, which
     * asks the server for its status; if the server has not finished locking yet it still answers
     * "unlocked" and the page reopens — which is why a second tap was needed.
     */
    const lock = async () => {
        if (locking.current) return;
        locking.current = true;
        const area = securityPinBus.getSnapshot().activeArea;
        const grant = securityPinBus.getSupportGrant();
        try {
            await Promise.all([
                grant ? securityPinApi.supportRevoke(grant.id).catch(() => undefined) : undefined,
                securityPinApi.lock(area).catch(() => undefined),
            ]);
        } finally {
            if (grant) securityPinBus.clearSupportGrant();
            securityPinBus.markAreaLocked(area);
            locking.current = false;
        }
    };

    const title = inSupport ? 'End support session and lock' : 'Lock this page now';
    const label = inSupport ? 'End support' : 'Lock';

    if (variant === 'light') {
        return (
            <WtTooltip title={title}>
                <WtButton size="small" inverted onClick={lock} startIcon={<KTIcon iconName="lock-2" className="fs-4" />}>
                    {label}
                </WtButton>
            </WtTooltip>
        );
    }

    return (
        <WtTooltip title={title}>
            <button
                type="button"
                onClick={lock}
                aria-label={title}
                className="inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-lg! border-0! px-3.5 text-[13px] leading-none font-semibold outline-none! transition-colors motion-reduce:transition-none bg-white/8! text-white/90! hover:bg-white/14! active:bg-white/20! focus-visible:ring-2! focus-visible:ring-white/70! max-sm:h-9 max-sm:w-9 max-sm:px-0 max-sm:rounded-[10px]! max-sm:bg-white/10! max-sm:hover:bg-white/16! max-sm:active:bg-white/22!"
            >
                <KTIcon iconName="lock-2" className="fs-2 text-white" />
                <span className="max-sm:sr-only">{label}</span>
            </button>
        </WtTooltip>
    );
}

export default SecurityPinLockButton;
