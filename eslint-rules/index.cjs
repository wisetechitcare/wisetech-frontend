/* Local ESLint plugin: eslint-plugin-wisetech (linked from package.json). */
module.exports = {
  rules: {
    'no-legacy-icons': require('./no-legacy-icons.cjs'),
    'no-legacy-ui': require('./no-legacy-ui.cjs'),
  },
};
