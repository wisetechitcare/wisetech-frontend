import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

/**
 * Every third-party module the v2 kit imports, read from `src/ds` itself — so it is never a second list
 * to keep in sync. Vite pre-bundles these at startup; without it, a module first seen mid-session (a new
 * Animate UI primitive, say) gets re-bundled while the browser still holds the old hash, and the story
 * fails with "Failed to fetch dynamically imported module" (Vite: 504 Outdated Optimize Dep).
 */
function kitDependencies(): string[] {
  const root = fileURLToPath(new URL('../src/ds', import.meta.url));
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
    );
  const deps = new Set<string>();
  for (const file of files(root)) {
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      // Bare package specifiers only: not relative, not the @/ alias, not Storybook's own virtual modules.
      if (/^(\.|@\/|node:|storybook|@storybook\/)/.test(spec)) continue;
      deps.add(spec);
    }
  }
  return [...deps].sort();
}

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp",
    "@storybook/addon-vitest",
    "storybook-addon-pseudo-states",
    "@chromatic-com/storybook"
  ],
  "framework": "@storybook/react-vite",
  // Storybook MCP docs toolset (docs-list / docs-show / docs-show-story) reads this manifest.
  "features": {
    "componentsManifest": true
  },
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { optimizeDeps: { include: kitDependencies() } }),
};
export default config;
