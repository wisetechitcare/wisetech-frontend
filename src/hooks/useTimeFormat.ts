/**
 * The current user's time format, as a hook — 12-hour or 24-hour.
 *
 * The policy itself lives in `utils/timeFormat.ts`; this is the React binding
 * for it. Two different subscriptions, because the three layers live in two
 * different stores:
 *
 *   personal  →  localStorage, via `useSyncExternalStore` (+ a `storage`
 *                listener, so a change in another tab lands here too)
 *   branch/org → Redux, via `useSelector`, which already bails out on an
 *                unchanged primitive
 *
 * Doing it this way rather than subscribing the whole chain to `store.subscribe`
 * keeps the cost at two primitive comparisons per relevant change instead of a
 * re-check on every dispatch in the app.
 */
import { useSyncExternalStore } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@redux/store";
import {
    getTimeTokens,
    readTimeFormatPreference,
    resolveTimeFormat,
    subscribeTimeFormatPreference,
    writeTimeFormatPreference,
    TIME_TOKENS,
    type TimeFormat,
    type TimeFormatPreference,
} from "@utils/timeFormat";

/** Server snapshot — no browser storage, so nobody's choice exists yet. */
const serverPreference = (): TimeFormatPreference => "inherit";

/** Just the personal layer. For the settings screen, which edits it. */
export const useTimeFormatPreference = (): TimeFormatPreference =>
    useSyncExternalStore(subscribeTimeFormatPreference, readTimeFormatPreference, serverPreference);

/**
 * The resolved format — what this user actually reads.
 *
 * @example
 * const format = useTimeFormat();          // '12h' | '24h'
 * const tokens = useTimeTokens();          // { TIME: 'h:mm A', ... }
 * dayjs(checkIn).format(tokens.TIME);
 */
export const useTimeFormat = (): TimeFormat => {
    const personal = useTimeFormatPreference();
    const branchFlag = useSelector(
        (s: RootState) => (s as any)?.employee?.currentEmployee?.branches?.showDateIn12HourFormat,
    );
    const orgFlag = useSelector(
        (s: RootState) => (s as any)?.company?.currentCompany?.showDateIn12HourFormat,
    );
    return resolveTimeFormat(personal, branchFlag, orgFlag);
};

/** The dayjs tokens for the current format — the usual thing a screen wants. */
export const useTimeTokens = () => TIME_TOKENS[useTimeFormat()];

/**
 * Read + write, for the settings panel.
 *
 * `resolved` is included so the screen can show what `Organisation default`
 * currently resolves TO, which is the one thing that choice doesn't say by itself.
 */
export const useTimeFormatSetting = () => {
    const preference = useTimeFormatPreference();
    const resolved = useTimeFormat();
    return { preference, resolved, setPreference: writeTimeFormatPreference };
};

export { getTimeTokens };
