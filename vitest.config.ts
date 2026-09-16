import { defineConfig, mergeConfig, defaultExclude } from 'vitest/config'
import viteConfig from './vite.config'

// Vitest picks this file over vite.config.ts and inherits everything from it —
// plugins, aliases, the manualChunks build config — so the two stay in sync and
// vite.config.ts stays a pure build file. Adding a `test` key there instead would
// have pulled vitest's types into the config that Amplify builds production with.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      /**
       * 15s, not vitest's 5s.
       *
       * A render test that mounts the shared MaterialTable or a GlassDialog pays a one-off
       * jsdom layout cost of several seconds — the same components that make the app's tables
       * and dialogs consistent are heavy to mount without a browser. At 5s those tests passed
       * alone and timed out when the suite ran them in parallel, which is a flake, not a
       * finding. A genuinely hung test still fails; it just takes 15s to say so.
       */
      testTimeout: 15_000,
      exclude: [
        ...defaultExclude,
        '**/dist/**',
        '**/.task-tests/**',
        // Written against node:test, not vitest. Vitest imports it, the node:test
        // registrations run and print their own reporter output, then vitest finds
        // no suite it recognises and fails the file — while the assertions inside
        // it actually passed. It has its own runner: `pnpm test:tasks`, which CI
        // runs as a separate step. Excluded here rather than converted so that
        // 45 working assertions are not rewritten for a runner change.
        'src/app/pages/employee/tasks/__tests__/taskDomain.test.ts',
      ],
    },
  })
)
