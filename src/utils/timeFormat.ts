/**
 * ============================================================================
 * WiseTech time format (12-hour / 24-hour) — the single source of truth.
 * ============================================================================
 *
 * One question, asked in one place: **does this user read `2:30 PM` or `14:30`?**
 *
 * Before this file the answer was hardcoded three different ways at once —
 * `utils/date.ts` `formatTime()` forced 12h, `utils/dateFormats.ts`
 * `DISPLAY_TIME` declared 24h, and ~50 screens carried their own literal
 * `'h:mm A'` / `'HH:mm'`. A `showDateIn12HourFormat` column already existed on
 * both `Organization` and `Branches` and had a working admin toggle, but only a
 * single screen ever read it. This resolves all of that to one answer.
 *
 * ── The precedence chain ──────────────────────────────────────────────────
 *
 *   1. PERSONAL   what this user picked, in this browser   (`'12h' | '24h'`)
 *   2. BRANCH     `Branches.showDateIn12HourFormat`
 *   3. ORG        `Organization.showDateIn12HourFormat`
 *   4. DEFAULT    12-hour
 *
 * Each layer is consulted only when the one above it has nothing to say, so an
 * org can set a house standard, a branch in another region can override it, and
 * an individual can still choose for themselves. `'inherit'` is the personal
 * default precisely so that "I never touched this" and "I chose what the org
 * chose" stay distinguishable — an org later switching to 24h should carry the
 * first group with it and leave the second alone.
 *
 * ── DISPLAY ONLY. This never touches a computation. ───────────────────────
 *
 * A large amount of attendance and payroll code formats a time to a string and
 * later parses it back with a hardcoded `dayjs(x, 'h:mm A')` — the shift maths in
 * DashboardDailyAttendanceOverview, Overview and WorkingMethodOptions, and
 * `salaryCalculations.ts` on the server. If this preference ever reached those
 * strings, lateness and salary would silently change with a display toggle.
 *
 * So the rule is absolute: **this decides what a human READS. Every value that
 * is parsed, compared, summed or sent over the wire stays 24h/ISO.**
 * `formatTime24Hour()` in `utils/date.ts` and `DATE_FORMATS.WIRE*` exist for
 * that side and must never route through here.
 */
import { store } from "@redux/store";

/** The resolved answer. Only ever these two — `inherit` is resolved away. */
export type TimeFormat = "12h" | "24h";

/**
 * What a person can choose. `inherit` means "whatever my branch/org says",
 * and is deliberately distinct from picking the same value the org happens to
 * hold today — see the precedence note above.
 */
export type TimeFormatPreference = TimeFormat | "inherit";

/** Nobody has said otherwise → 12-hour. This is what the app already showed. */
export const DEFAULT_TIME_FORMAT: TimeFormat = "12h";

export const TIME_FORMAT_STORAGE_KEY = "wt-time-format";

/**
 * The dayjs tokens for each format, named for the SHAPE a caller wants rather
 * than for the tokens themselves — a caller asks for "time with seconds", not
 * for `h:mm:ss A`, so the 12/24h choice can never leak into a call site.
 */
export const TIME_TOKENS: Record<TimeFormat, {
    /** `2:30 PM` · `14:30` */
    TIME: string;
    /** `2:30:45 PM` · `14:30:45` */
    TIME_WITH_SECONDS: string;
    /** Company-standard date + time — `2025.12.03 2:30 PM` · `2025.12.03 14:30` */
    DATETIME: string;
    /** Long, spelled-out date + time — `3 December 2025, 2:30 PM` */
    DATETIME_LONG: string;
}> = {
    "12h": {
        TIME: "h:mm A",
        TIME_WITH_SECONDS: "h:mm:ss A",
        DATETIME: "YYYY.MM.DD h:mm A",
        DATETIME_LONG: "D MMMM YYYY, h:mm A",
    },
    "24h": {
        TIME: "HH:mm",
        TIME_WITH_SECONDS: "HH:mm:ss",
        DATETIME: "YYYY.MM.DD HH:mm",
        DATETIME_LONG: "D MMMM YYYY, HH:mm",
    },
};

/** The options a settings screen offers, declared once so two screens can't disagree. */
export const TIME_FORMAT_OPTIONS: ReadonlyArray<{ value: TimeFormatPreference; label: string }> = [
    { value: "inherit", label: "Organisation default" },
    { value: "12h", label: "12-hour" },
    { value: "24h", label: "24-hour" },
];

/**
 * Normalise one layer's stored flag to a real answer or "no opinion".
 *
 * The same setting arrives in three shapes depending on where it was read:
 * a Prisma `Boolean?` (branch, via the employee payload), the `'1'`/`'0'`
 * strings the company Formik forms round-trip through Redux, and `undefined`
 * before the profile has loaded. `null` out means "this layer has nothing to
 * say" — which is NOT the same as `false`, and conflating the two is what would
 * make an unset branch silently override its org.
 */
export const normalizeTimeFormatFlag = (value: unknown): boolean | null => {
    if (value === true || value === "1" || value === "true") return true;
    if (value === false || value === "0" || value === "false") return false;
    return null;
};

/**
 * The precedence chain, as a pure function — the whole policy in one place, so
 * it can be tested without a store, a browser or a logged-in user.
 */
export const resolveTimeFormat = (
    personal: TimeFormatPreference,
    branchFlag: unknown,
    orgFlag: unknown,
): TimeFormat => {
    if (personal === "12h" || personal === "24h") return personal;

    const branch = normalizeTimeFormatFlag(branchFlag);
    if (branch !== null) return branch ? "12h" : "24h";

    const org = normalizeTimeFormatFlag(orgFlag);
    if (org !== null) return org ? "12h" : "24h";

    return DEFAULT_TIME_FORMAT;
};

const isPreference = (v: unknown): v is TimeFormatPreference =>
    v === "12h" || v === "24h" || v === "inherit";

/**
 * The personal choice, cached in memory.
 *
 * `getSnapshot` for `useSyncExternalStore` is called on every render pass, and
 * `localStorage` is a synchronous main-thread read — so it is read once and then
 * only when something actually changes it (this tab, or another tab's `storage`
 * event). `undefined` means "not read yet", which is distinct from a stored
 * `'inherit'`.
 */
let cachedPreference: TimeFormatPreference | undefined;

/** The user's own choice, or `inherit` when they've never made one. */
export const readTimeFormatPreference = (): TimeFormatPreference => {
    if (cachedPreference !== undefined) return cachedPreference;
    let stored: string | null = null;
    try {
        stored = localStorage.getItem(TIME_FORMAT_STORAGE_KEY);
    } catch {
        /* private mode — the session still works, it just won't persist */
    }
    cachedPreference = isPreference(stored) ? stored : "inherit";
    return cachedPreference;
};

const TIME_FORMAT_EVENT = "wt-time-format-change";

/**
 * Persist the personal choice and tell every listener at once.
 *
 * Mirrors the appearance engine's surface broadcast: times are rendered by
 * plain functions deep inside table cells and `useMemo`'d column definitions,
 * not by a component that happens to sit under a provider, so a React context
 * would leave half the screen stale until something unrelated re-rendered it.
 * One event, `useSyncExternalStore` on the other end, and the whole app turns
 * over in the same frame.
 */
export const writeTimeFormatPreference = (next: TimeFormatPreference): void => {
    cachedPreference = next;
    try {
        localStorage.setItem(TIME_FORMAT_STORAGE_KEY, next);
    } catch {
        /* private mode — honoured for this session, just not remembered */
    }
    try {
        window.dispatchEvent(new CustomEvent(TIME_FORMAT_EVENT));
    } catch {
        /* non-DOM (tests, SSR) */
    }
};

/** Subscribe to personal-preference changes, in this tab and in any other. */
export const subscribeTimeFormatPreference = (onChange: () => void): (() => void) => {
    const onLocal = () => onChange();
    // Another tab wrote the key: drop the cache so the next read is truthful.
    // `key === null` is a whole-storage clear, which counts too.
    const onStorage = (e: StorageEvent) => {
        if (e.key !== null && e.key !== TIME_FORMAT_STORAGE_KEY) return;
        cachedPreference = undefined;
        onChange();
    };
    try {
        window.addEventListener(TIME_FORMAT_EVENT, onLocal);
        window.addEventListener("storage", onStorage);
    } catch {
        return () => { /* non-DOM */ };
    }
    return () => {
        window.removeEventListener(TIME_FORMAT_EVENT, onLocal);
        window.removeEventListener("storage", onStorage);
    };
};

/**
 * The resolved format for the current user, readable from anywhere.
 *
 * For plain functions — table cell formatters, `utils/date.ts`, an export
 * builder — that are not components and cannot call a hook. Components should
 * prefer `useTimeFormat()` so they re-render when the answer changes; this
 * reads the same three layers and returns the same result.
 */
export const getTimeFormat = (): TimeFormat => {
    let branchFlag: unknown;
    let orgFlag: unknown;
    try {
        const state: any = store.getState();
        branchFlag = state?.employee?.currentEmployee?.branches?.showDateIn12HourFormat;
        orgFlag = state?.company?.currentCompany?.showDateIn12HourFormat;
    } catch {
        /* store not ready (module init, tests) — fall through to the default */
    }
    return resolveTimeFormat(readTimeFormatPreference(), branchFlag, orgFlag);
};

/** The dayjs tokens for the current user's format. */
export const getTimeTokens = () => TIME_TOKENS[getTimeFormat()];
