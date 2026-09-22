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
          /* Raw SweetAlert is an XSS surface, not merely an inconsistent skin. Its `html`
           * option is assigned to the DOM as markup and, in its own typings, "SweetAlert2
           * does NOT sanitize this parameter". Three dialogs interpolated a user-entered
           * name straight into it — stored XSS: planted once, fired later in someone
           * else's browser.
           * The kit's toast / alertDialog / confirmDialog put every `html` through
           * DOMPurify, so going through them closes the hole for free. The 20 files that
           * already import Swal directly are downgraded to `warn` in the overrides — they
           * are not broken, and blocking a sprint to migrate them in one pass is how a
           * rule gets switched off instead of obeyed. */
          {
            name: 'sweetalert2',
            message: 'Use toast / alertDialog / confirmDialog from @app/modules/common/components/ui — they sanitise `html`; raw Swal does not. Build the string with safeHtml`…`. See ui/README.md → Toast / confirm.',
          },
        ],
      },
    ],

    'no-restricted-syntax': [
      'error',
      /* An `html:` built from a template literal with interpolations, untagged.
       *
       * This is the exact shape that shipped three stored-XSS holes: the natural thing to
       * type is `html: \`…${name}…\``, and the safe thing to type is longer. The rule makes
       * the natural thing fail, which is the only version of this that survives contact
       * with a deadline.
       *
       * safeHtml`…${name}…` is a TaggedTemplateExpression, NOT a TemplateLiteral child of
       * the property, so the fixed form does not match and needs no exemption. Two
       * selectors because a ternary (`html: blocked ? \`…\` : \`…\``) puts the literal one
       * level down; both are direct-child paths, so a tagged template in either position
       * still passes cleanly.
       *
       * A literal with NO interpolation is untouched — static markup carries no user data
       * and is not a hole. */
      {
        selector: "Property[key.name='html'] > TemplateLiteral[expressions.length>0]",
        message: 'Interpolating into `html` renders user data as markup. Use safeHtml`…` from @app/modules/common/components/ui — it escapes every ${…} while leaving your tags intact.',
      },
      {
        selector: "Property[key.name='html'] > ConditionalExpression > TemplateLiteral[expressions.length>0]",
        message: 'Interpolating into `html` renders user data as markup. Use safeHtml`…` from @app/modules/common/components/ui on BOTH arms of the ternary.',
      },
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
      /* Currency. The app bills per BRANCH: `Branches.currency`, falling back to the branch
       * country's currency, falling back to INR. A hardcoded rupee or an inline
       * `{ style: 'currency', currency: 'INR' }` silently mislabels every figure for a branch
       * that bills in anything else, and 186 of them had accumulated before this rule.
       * Use formatCurrency / formatCurrencyDecimal / formatCurrencyRounded / getCurrencySymbol
       * from @utils/currency, or <CurrencySymbol /> in a glyph slot. See hooks/useCurrency. */
      {
        selector: "Property[key.name='style'] > Literal[value='currency']",
        message: 'Do not build your own currency formatter. Use formatCurrency / formatCurrencyDecimal / formatCurrencyRounded from @utils/currency — they follow the branch. An inline Intl.NumberFormat hardcodes one currency forever.',
      },
      {
        selector: "Literal[value=/₹/]",
        message: 'Hardcoded currency symbol. Use getCurrencySymbol() from @utils/currency, or a formatCurrency* helper. The ONLY exception is a statutory amount fixed by law (e.g. professional-tax slabs), which belongs in a file listed in the override below.',
      },
      {
        selector: "TemplateElement[value.raw=/₹/]",
        message: 'Hardcoded currency symbol in a template literal. Interpolate ${getCurrencySymbol()} from @utils/currency instead.',
      },
      /* `raw` is the SOURCE text, so the rule above never saw a rupee written as the escape
       * `\u20B9` — and one was hiding in MeetingsList exactly that way. `cooked` is the
       * character the template actually produces, which is what matters. */
      {
        selector: "TemplateElement[value.cooked=/₹/]",
        message: 'Hardcoded currency symbol in a template literal (written as an escape). Interpolate ${getCurrencySymbol()} from @utils/currency instead.',
      },
      {
        selector: "JSXText[value=/₹/]",
        message: 'Hardcoded currency symbol in JSX. Use {getCurrencySymbol()} or <CurrencySymbol /> from the ui kit.',
      },
      {
        selector: "JSXAttribute[name.name=/^(icon|iconName)$/] > Literal[value='dollar']",
        message: 'The `dollar` keenicon is a currency-specific glyph. If it stands for an AMOUNT use <CurrencySymbol /> (IconBox and StatTile take a node); if it is a category icon use `wallet`.',
      },
      /* The same glyph, written as an object property in a config map rather than a JSX
       * attribute. The selector above never looked at these, which is how three of them sat
       * in the approval domain registry putting a $ on every offer and reimbursement card. */
      {
        selector: "Property[key.name=/^(icon|iconName)$/] > Literal[value='dollar']",
        message: 'The `dollar` keenicon is a currency-specific glyph. For a category icon use `wallet`; for an AMOUNT use <CurrencySymbol />.',
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
    {
      /* PLACED AFTER THE RATCHET ON PURPOSE. ESLint applies overrides in order and the last
       * match wins, so an `off` before the ratchet is re-enabled by it as a warning. */
      /* currency.ts IMPLEMENTS the formatters, so it is the one place an Intl currency
       * option and a literal rupee (the fallback for an unknown ISO code) are correct. */
      files: ['src/utils/currency.ts'],
      rules: { 'no-restricted-syntax': 'off' },
    },
    {
      /* THE KIT IS THE ONE PLACE SweetAlert MAY BE IMPORTED.
       * feedback.ts is the wrapper everything else is told to use — it is where the
       * DOMPurify call lives, so banning the import here would ban the fix. */
      files: ['src/app/modules/common/components/ui/feedback.ts'],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      /* SWEETALERT RATCHET — the 19 files that already imported Swal directly before the
       * kit became mandatory. They warn; every other file errors, so the list can only
       * shrink. Migrating all 19 in one pass would touch six people's modules mid-sprint
       * for no security gain: the kit sanitises, and these call sites are separately safe
       * once their interpolations use safeHtml (the three that carried user data now do).
       * Delete a line from this list when its file moves to the kit. */
      files: [
        'src/app/components/IdleLogoutGuard.tsx',
        'src/app/modules/accounts/components/settings/cards/ProfileDetails.tsx',
        'src/app/modules/projectPoints/ProjectPointsConfigModal.tsx',
        'src/app/modules/projectPoints/ProjectPointsConfigSection.tsx',
        'src/app/pages/company/Branches.tsx',
        'src/app/pages/company/organisation/OrganizationsPage.tsx',
        'src/app/pages/dashboard/DashboardTasks.tsx',
        'src/app/pages/dashboard/Todo.tsx',
        'src/app/pages/employee/MeetingAttendeesDialog.tsx',
        'src/app/pages/employee/billing/NewBillingRequestDialog.tsx',
        'src/app/pages/employee/calendar/views/Meetings.tsx',
        'src/app/pages/employee/entity/detail/sections/ProjectMeetings.tsx',
        'src/app/pages/employee/entity/detail/sections/TeamsSection.tsx',
        'src/app/pages/employee/leads/configuration/components/LeadsConfigForm.tsx',
        'src/app/pages/employee/projects/configure/components/ProjectConfigForm.tsx',
        'src/app/pages/employee/salary/admin/views/salary-configuration/DeductionMaster.tsx',
        'src/app/pages/my-team/Approvals/DomainApprovalQueue.tsx',
        'src/hooks/useDeleteConfirmation.tsx',
        'src/utils/modal.ts',
      ],
      rules: { 'no-restricted-imports': 'warn' },
    },
    {
      /* India's professional-tax slabs. These rupee amounts are set by statute — they do
       * not change because a Dubai branch is looking at them, so they must NOT follow the
       * active currency. The two files are duplicates of each other and worth collapsing,
       * but that is a separate job. */
      files: [
        'src/app/pages/company/organisationInfo/rule/mockData.ts',
        'src/app/pages/employee/personal-rules/components/SalarySection.tsx',
      ],
      rules: { 'no-restricted-syntax': 'off' },
    },
  ],
}
