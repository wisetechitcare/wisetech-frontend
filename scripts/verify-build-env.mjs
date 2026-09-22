/**
 * Fail the build when a required VITE_ variable is missing — BEFORE bundling.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────
 * Vite inlines `import.meta.env.VITE_*` at build time. A variable that is not set
 * does not throw and does not warn: it is substituted with `undefined` and the
 * build exits 0. The bundle ships, Amplify reports a green deploy, and the app
 * loads to a white screen with every API call going to "undefined/api/...".
 *
 * That failure has no error, no exit code and no log line — it looks exactly like
 * a successful deploy. This script is the only thing standing between a typo in
 * the Amplify console and a silent production outage.
 *
 * These variables live in Amplify → Hosting → Environment variables, NOT in
 * amplify.yml and NOT in the repo (.env is gitignored). Nothing in version
 * control records what they should be, which is why the list lives here.
 *
 * ── TIERS ─────────────────────────────────────────────────────────────────────
 * REQUIRED    the app is non-functional without it, so failing the build costs
 *             nothing that was not already lost.
 * RECOMMENDED a feature degrades but the app works. Warn; never block a deploy
 *             over a broken map widget.
 * OPTIONAL    read through a fallback (`??`/`||`) or a feature flag default, so
 *             absence is a supported state. Listed for completeness only.
 *
 * Usage:  node scripts/verify-build-env.mjs
 *         node scripts/verify-build-env.mjs --warn-only   (report, never exit 1)
 */

/** Verified against source on 2026-09-22 by grepping every import.meta.env use. */
const REQUIRED = [
    {
        name: 'VITE_APP_WISE_TECH_BACKEND',
        why: 'base URL for the API — 54 call sites, only 7 guard against absence',
    },
];

const RECOMMENDED = [
    // Was briefly listed as REQUIRED on the claim that "login breaks without it". That was
    // wrong, and the first Amplify build caught it: production has never set this variable
    // and login has always worked.
    //
    // The live login is services/auth.ts, which builds its endpoints from
    // VITE_APP_WISE_TECH_BACKEND. VITE_APP_API_URL only feeds
    // modules/auth/core/_requests.ts — Metronic template code, still carrying the comment
    // "IN OUR EXAMPLE IT'S API_TOKEN", whose one live caller (AuthInit in Auth.tsx) wraps
    // it in try/catch and carries on. Nothing a user does depends on it.
    //
    // The lesson is in the tiers, not the list: REQUIRED must mean "production has
    // demonstrably never run without this", not "reading the code suggests it matters".
    // A guard that blocks deploys on a guess is worse than no guard.
    { name: 'VITE_APP_API_URL', why: 'Metronic template auth — unused by the live login path' },
    { name: 'VITE_APP_THEME_API_URL', why: 'user-management requests' },
    { name: 'VITE_APP_GOOGLE_MAP_KEY', why: 'branch map picker renders blank' },
    { name: 'VITE_APP_PREVIEW_DOCS_URL', why: 'changelog link resolves to "undefined/changelog"' },
];

const OPTIONAL = [
    'VITE_APP_BASE_LAYOUT_CONFIG_KEY',
    'VITE_APP_I18N_CONFIG_KEY',
    'VITE_APP_IDLE_TIMEOUT_MINUTES',
    'VITE_NEW_MY_TEAM_IA',
];

/** Never print a key in a build log; confirming it is present is the whole job. */
const mask = (value) => {
    if (value.length <= 8) return '*'.repeat(value.length);
    return `${value.slice(0, 4)}…${value.slice(-2)} (${value.length} chars)`;
};

const isSet = (name) => {
    const raw = process.env[name];
    return typeof raw === 'string' && raw.trim() !== '';
};

const warnOnly = process.argv.includes('--warn-only');

console.log('🔎 Verifying build-time environment…');

const missingRequired = REQUIRED.filter((v) => !isSet(v.name));
const missingRecommended = RECOMMENDED.filter((v) => !isSet(v.name));

for (const { name } of REQUIRED) {
    if (isSet(name)) console.log(`   ✅ ${name} = ${mask(process.env[name].trim())}`);
}
for (const { name } of RECOMMENDED) {
    if (isSet(name)) console.log(`   ✅ ${name} = ${mask(process.env[name].trim())}`);
}
for (const name of OPTIONAL) {
    console.log(`   ${isSet(name) ? '✅' : '·'}  ${name}${isSet(name) ? '' : ' (unset — has a fallback)'}`);
}

if (missingRecommended.length > 0) {
    console.log('');
    for (const { name, why } of missingRecommended) {
        console.log(`   ⚠️  ${name} is not set — ${why}`);
    }
}

if (missingRequired.length > 0) {
    console.error('');
    console.error('❌ Build stopped: required environment variables are missing.');
    console.error('');
    for (const { name, why } of missingRequired) {
        console.error(`     ${name}`);
        console.error(`       ${why}`);
    }
    console.error('');
    console.error('   Set them in the Amplify console:');
    console.error('     Hosting → Environment variables → Manage variables');
    console.error('   then redeploy. Building without them produces a bundle that');
    console.error('   loads and then fails every request, which is worse than no deploy.');
    console.error('');
    if (!warnOnly) process.exit(1);
    console.error('   (--warn-only set: continuing anyway)');
}

if (missingRequired.length === 0) console.log('✅ Environment OK.');
