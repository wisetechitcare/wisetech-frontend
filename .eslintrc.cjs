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

    /* --- DESIGN SYSTEM: banned primitives (see CLAUDE.md "UI standard") ---------------
     * These are ERRORS on purpose. The standard used to live only in prose, so violations
     * were caught by a human noticing a screenshot looked wrong — a raw <Switch> sat 30
     * lines from a WtSwitchField in the same file for weeks. Now the build catches them.
     * Each message names the replacement so the fix is obvious.
     * The kit itself is exempted in `overrides` below (it must use the raw primitives). */
    /* Import-level bans. Kept as a SEPARATE rule from `no-restricted-syntax` on purpose: the
     * ratchet below downgrades no-restricted-syntax to `warn` for 286 legacy files, which would
     * otherwise let a raw MUI Switch back into any of them. This rule has its own severity and is
     * only ever switched off for the kit, so these can never regress anywhere. */
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@mui/material',
            importNames: ['Switch'],
            message: 'Use WtSwitch / WtSwitchField from @app/modules/common/components/ui — not a raw MUI Switch. See CLAUDE.md → UI standard.',
          },
        ],
      },
    ],

    'no-restricted-syntax': [
      'error',
      {
        selector: "JSXOpeningElement[name.name='Switch']",
        message: 'Use WtSwitch / WtSwitchField from @app/modules/common/components/ui — not a raw MUI Switch. See CLAUDE.md → UI standard.',
      },
      /* Hardcoded background colours. A literal #fff paints the same pixel in both themes, so
       * the surface stays white on a dark page — the single most common way dark mode breaks
       * here, and it was shipping in 67 files when this rule was added. Covers gradients too,
       * since `linear-gradient(180deg, #ffffff …)` is the same bug wearing a hat.
       * `color:` is deliberately NOT covered: text on a tinted surface is a different problem
       * and banning it here would bury this signal under hundreds of unrelated warnings. */
      {
        selector: "Property[key.name=/^(background|backgroundColor|backgroundImage|bgcolor)$/] > Literal[value=/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/]",
        message: 'Hardcoded background colour — this stays the same in dark mode. Use a theme token (`background.paper`, `background.default`, `action.hover`) or `toneSurface(trio, dark)` for tinted surfaces. See CLAUDE.md → Styling rules.',
      },
      // Native `title` on an interactive element renders the BROWSER's tooltip — pale, OS-styled,
      // ~1s delay — which is why the app currently shows two different tooltip designs (79 MUI
      // Tooltips vs 624 raw titles). Use the kit: WtIconButton takes `title` as a prop and turns
      // it into a MUI Tooltip AND an aria-label, or wrap in <Tooltip> directly. `title` on
      // <Tooltip> itself is its API and is unaffected.
      {
        selector: "JSXOpeningElement[name.name='button'] > JSXAttribute[name.name='title']",
        message: 'Raw `title` renders the browser tooltip instead of the app style. Use WtIconButton (title prop) or wrap in MUI <Tooltip>. Keep aria-label for screen readers.',
      },
      {
        selector: "JSXOpeningElement[name.name='a'] > JSXAttribute[name.name='title']",
        message: 'Raw `title` renders the browser tooltip instead of the app style. Wrap in MUI <Tooltip>. Keep aria-label for screen readers.',
      },
      {
        selector: "JSXOpeningElement[name.name='IconButton'] > JSXAttribute[name.name='title']",
        message: 'MUI IconButton passes `title` to the DOM, giving the browser tooltip. Use WtIconButton, or wrap in <Tooltip>.',
      },
      {
        selector: "JSXAttribute[name.name='type'][value.value='date']",
        message: 'Use WtDateField from the ui kit. A native date input renders the browser picker: unstyleable, OS-locale formatted, and light-on-white in dark mode.',
      },
      {
        selector: "JSXAttribute[name.name='type'][value.value='datetime-local']",
        message: 'Use WtDateTimeField from the ui kit — not a native datetime-local input.',
      },
      {
        selector: "JSXAttribute[name.name='type'][value.value='time']",
        message: 'Use TimeWheelField from @app/modules/common/components — not a native time input.',
      },
      {
        selector: "JSXAttribute[name.name='type'][value.value='month']",
        message: 'Use a month picker from the ui kit — not a native month input.',
      },
      {
        selector: "JSXAttribute[name.name='className'] Literal[value=/(^|\\s)(form-switch|form-control|btn btn-|card-body|badge badge-)/]",
        message: 'Bootstrap component classes are banned. Use the ui kit (WtSwitch / TextField / WtButton / GlassCard / ToneChip). See CLAUDE.md → UI standard.',
      },
      {
        selector: "JSXOpeningElement[name.name='style']",
        message: 'No <style> blocks. Use Tailwind utilities or MUI sx; if a shared component only takes a className, pass Tailwind classes.',
      },
      {
        selector: "CallExpression[callee.property.name='toLocaleDateString']",
        message: 'Use formatDate() from @utils/dateFormats — the company standard is YYYY.MM.DD. toLocaleDateString renders in the OS locale.',
      },
    ],
  },
  overrides: [
    {
      /* The UI kit and shared inputs IMPLEMENT these primitives, so they must be able to use
       * them. This is the only place a raw Switch / native input / <style> is legitimate. */
      files: [
        'src/app/modules/common/components/ui/**',
        'src/app/modules/common/inputs/**',
        'src/app/modules/common/components/TimeWheelField.tsx',
      ],
      rules: { 'no-restricted-syntax': 'off', 'no-restricted-imports': 'off' },
    },
    {
      /* MIGRATION BACKLOG — files that still contain a banned *primitive* (native date/time
       * input). Downgraded to warn so the build stays green while they're converted.
       * Do NOT add files here; delete entries as they're fixed. Tracked in CLAUDE.md. */
      files: [
        'src/app/pages/employee/EditMeetingModal.tsx',
        'src/app/pages/employee/attendance/personal/views/my-leaves/MeetingsForm.tsx',
        'src/app/pages/employee/attendance/personal/views/overview/KPITestPanel.tsx',
        'src/app/pages/employee/attendance/personal/views/overview/AttendanceCalendar.tsx',
        'src/app/pages/employee/salary/admin/views/salary-configuration/DeductionMaster.tsx',
        'src/app/modules/common/components/Graphs.tsx',
        'src/app/modules/common/components/EmployeeSelectionDialog.tsx',
      ],
      rules: { 'no-restricted-syntax': 'warn' },
    },
    {
      /* THE RATCHET (see .eslint-ui-baseline.cjs).
       * Bootstrap component classes / <style> blocks / toLocaleDateString are 697+ violations
       * across 251 legacy files — too many to fix in one pass, and a permanently-red build is a
       * build everyone learns to ignore. So those 251 files warn, and every OTHER file errors.
       * Net effect: new code cannot regress, and the list can only shrink. */
      files: require('./.eslint-ui-baseline.cjs'),
      rules: { 'no-restricted-syntax': 'warn' },
    },
  ],
}
