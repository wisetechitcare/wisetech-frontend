import { useEffect, useRef } from 'react';
import { getSocket } from '@utils/socketClient';

/**
 * Run something whenever an approval this user is party to changes.
 *
 * WHY A HOOK AND NOT ANOTHER `socket.on` BLOCK. The server emits three events around a decision —
 * `approval:updated` to the requester, `approval:cancelled` when a request is withdrawn, and
 * `approval:pending` to whoever it has just landed with — and a screen that cares about one almost
 * always cares about all three. Screens were each choosing their own subset by hand, and the
 * approval audit found one that listened to two of the three, so a withdrawn request stayed on
 * screen until a reload. Listing them here once removes that choice.
 *
 * The events carry no payload worth filtering on for a list: they say "something you can see has
 * changed", so the handler refetches rather than patching a row from the message. A socket message
 * is not a source of truth — the server is — and a list rebuilt from a refetch cannot drift from it.
 *
 * Attendance's own two listeners are deliberately left alone: they dispatch into redux rather than
 * invalidating a query, so folding them in here would mean rewriting their state flow, which is a
 * different change from wiring a screen that listens to nothing.
 */
export const useApprovalRealtime = (onApprovalChange: () => void) => {
    /**
     * The latest handler, held in a ref so the subscription is made ONCE.
     *
     * A caller almost always passes an inline arrow, so depending on it directly would tear down
     * and re-add three socket listeners on every render. Reading it through a ref keeps the
     * effect's dependency list genuinely empty instead of silencing the lint rule that says so.
     */
    const latest = useRef(onApprovalChange);
    latest.current = onApprovalChange;

    useEffect(() => {
        const socket = getSocket();
        const handler = () => latest.current();
        socket.on('approval:updated', handler);
        socket.on('approval:cancelled', handler);
        socket.on('approval:pending', handler);
        return () => {
            socket.off('approval:updated', handler);
            socket.off('approval:cancelled', handler);
            socket.off('approval:pending', handler);
        };
    }, []);
};
