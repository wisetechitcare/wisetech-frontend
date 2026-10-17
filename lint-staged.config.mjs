/**
 * lint-staged config — batched for Windows CreateProcess arg limit (~8191 chars).
 *
 * Passing 100+ staged paths to eslint/guard in one invocation fails with
 * "The command line is too long." Each returned command stays under the limit.
 */

/** @param {string[]} items @param {number} size */
function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

/** @param {string} path */
function q(path) {
  if (!/[\s"]/.test(path)) return path
  return `"${path.replace(/"/g, '\\"')}"`
}

/** Conservative batch size (long paths under Documents\… on Windows). */
const BATCH = 20

/** @type {import('lint-staged').Config} */
export default {
  '*': (files) =>
    chunk(files, BATCH).map(
      (batch) => `node scripts/hooks/guard.mjs ${batch.map(q).join(' ')}`,
    ),
  '*.{ts,tsx}': (files) =>
    chunk(files, BATCH).map(
      (batch) =>
        `node node_modules/eslint/bin/eslint.js --quiet --no-error-on-unmatched-pattern ${batch.map(q).join(' ')}`,
    ),
}
