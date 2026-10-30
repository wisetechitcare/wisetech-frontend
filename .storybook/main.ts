import type { StorybookConfig } from '@storybook/react-vite';

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
  }
};
export default config;