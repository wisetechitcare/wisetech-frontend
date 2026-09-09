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
