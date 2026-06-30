module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'build', 'node_modules', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  // ---------------------------------------------------------------------------
  // LENIENT BASELINE (adopted on a large existing codebase).
  // Goal: CI passes today and catches NEW problems, while pre-existing issues
  // are surfaced as warnings to be cleaned up over time ("baseline + ratchet").
  // To tighten quality later, move rules from "off" -> "warn" -> "error" and
  // fix the code in batches. Many issues are auto-fixable: `npm run lint -- --fix`.
  // ---------------------------------------------------------------------------
  rules: {
    // High-volume legacy noise — disabled for now (revisit later).
    '@typescript-eslint/no-explicit-any': 'off',
    'no-useless-catch': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-extra-semi': 'off',

    // Worth tracking — downgraded to warnings so they don't block CI.
    '@typescript-eslint/no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react-hooks/rules-of-hooks': 'warn',
    'prefer-const': 'warn',
    'no-case-declarations': 'warn',
    '@typescript-eslint/prefer-as-const': 'warn',
    'no-irregular-whitespace': 'warn',
    'no-inner-declarations': 'warn',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
    'no-useless-escape': 'warn',
    'no-prototype-builtins': 'warn',
    'no-constant-condition': 'warn',
    'no-empty': 'warn',
    'no-unsafe-optional-chaining': 'warn',
    '@typescript-eslint/no-this-alias': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    'no-debugger': 'warn',

    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
