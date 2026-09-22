/// <reference types="vite/client" />

/**
 * Every build-time variable this app reads, declared once.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
 * Without this interface, `import.meta.env.ANYTHING` type-checks. Vite's own types
 * declare an index signature, so a misspelled variable is not an error — it is
 * `undefined`, silently inlined into the bundle, and discovered by a user.
 *
 * Declaring the names here makes the compiler the enforcement mechanism. All 63
 * existing read sites are checked against this list with no change to any of them,
 * and a new typo is a red tsc run rather than a white screen.
 *
 * ── REQUIRED vs OPTIONAL IS A TYPE, NOT A CONVENTION ──────────────────────────
 * A variable typed `string` is one the app cannot run without. One typed
 * `string | undefined` forces every call site to handle its absence — the compiler
 * will not let you concatenate it into a URL without deciding what happens when it
 * is missing.
 *
 * The classification is EVIDENCE-BASED, not inferred from reading code. A variable
 * is REQUIRED only where production has demonstrably failed without it. That
 * distinction matters: VITE_APP_API_URL was briefly asserted as required on the
 * strength of the code alone, and it blocked a build for a variable production has
 * never had set. Deployment history outranks what the source appears to imply.
 *
 * Keep in step with scripts/verify-build-env.mjs, which enforces the same list at
 * build time — that script is what fails the Amplify build, this file is what fails
 * the typecheck.
 */
/**
 * Turns OFF Vite's catch-all index signature — and this one line is what makes the
 * interface below actually enforce anything.
 *
 * vite/client declares `interface ImportMetaEnv extends Record<ImportMetaEnvFallbackKey, any>`,
 * where that key resolves to `string` by default. Because interfaces MERGE rather than
 * replace, simply declaring the names below leaves that `[key: string]: any` in place,
 * and `import.meta.env.VITE_TYPO` still type-checks as `any`. Verified: without this
 * declaration a deliberately misspelled variable produced no tsc error at all.
 *
 * Vite's own types opt out via `ViteTypeOptions` — declaring the key makes the fallback
 * `never`, `Record<never, any>` contributes nothing, and unknown names become errors.
 */
interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    /**
     * Base URL of the WiseTech API. The one variable the app genuinely cannot run
     * without: 55 read sites, and services/auth.ts builds every login, logout and
     * password endpoint from it. Typed `string` because a build without it produces
     * a bundle that loads and then fails every request.
     */
    readonly VITE_APP_WISE_TECH_BACKEND: string;

    /**
     * Metronic template auth (modules/auth/core/_requests.ts) — NOT the live login,
     * which is services/auth.ts. Unset in production for the life of the app, so it
     * is optional by evidence.
     */
    readonly VITE_APP_API_URL: string | undefined;

    /** Metronic user-management module. Unset in production. */
    readonly VITE_APP_THEME_API_URL: string | undefined;

    /** Google Maps key for the branch location picker. Map renders blank without it. */
    readonly VITE_APP_GOOGLE_MAP_KEY: string | undefined;

    /** Metronic changelog link target. Cosmetic. */
    readonly VITE_APP_PREVIEW_DOCS_URL: string | undefined;

    /** localStorage key for the persisted layout config. Has a fallback. */
    readonly VITE_APP_BASE_LAYOUT_CONFIG_KEY: string | undefined;

    /** localStorage key for the persisted language choice. Has a fallback. */
    readonly VITE_APP_I18N_CONFIG_KEY: string | undefined;

    /** Idle-logout window in minutes. Parsed with a fallback when absent or unparseable. */
    readonly VITE_APP_IDLE_TIMEOUT_MINUTES: string | undefined;

    /** Feature flag for the new My Team information architecture. Defaults to on. */
    readonly VITE_NEW_MY_TEAM_IA: string | undefined;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
