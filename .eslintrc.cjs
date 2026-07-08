/* ESLint config — React 18 + TypeScript (Vite). Legacy eslintrc format (ESLint 8).
 *
 * Philosophy: this is a large, partly-vendored (Metronic) codebase. A maximalist
 * config drowns real bugs under thousands of stylistic complaints, so the noisy
 * style rules are turned OFF and only genuine-bug rules are kept as errors.
 * TypeScript (`tsc --noEmit`) is the type-safety gate; ESLint here catches the
 * classes of bug the type-checker can't see (bad hook usage, unsafe optional
 * chaining, leftover debuggers).
 */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'build',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'src/_metronic/**', // vendored Metronic theme — treat as third-party
  ],
  rules: {
    /* --- Real-bug rules: keep as ERROR (these are the point of linting here) --- */
    'react-hooks/rules-of-hooks': 'error',
    'no-unsafe-optional-chaining': 'error',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    'no-debugger': 'error',

    /* --- Useful signal, but non-blocking: WARN --- */
    'react-hooks/exhaustive-deps': 'warn',
    'prefer-const': 'warn',
    '@typescript-eslint/prefer-as-const': 'warn',

    /* --- Legacy/style noise across the existing codebase: OFF --- */
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    'no-useless-catch': 'off',
    'no-case-declarations': 'off',
    'no-extra-semi': 'off',
    'no-inner-declarations': 'off',
    'no-constant-condition': 'off',
    'no-useless-escape': 'off',
    'no-prototype-builtins': 'off',
    'no-empty': 'off',
    'no-fallthrough': 'off',
    'react-refresh/only-export-components': 'off',
  },
}
