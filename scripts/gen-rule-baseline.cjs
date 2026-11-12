/* Generic ratchet-baseline generator.
 *
 *   node scripts/gen-rule-baseline.cjs <ruleId> <outFile> <title> [--script=<pnpm script>] [--what=<text>]
 *                                      [--note=<text>] [--fixed=<text>] [--slug=<name>]
 *
 * Lints src/ with the repo's ESLint config and writes <outFile> (relative to the repo root) listing every
 * file that reports <ruleId>. Runs eslint itself (no shell `;`/`>`/`rm`), so the pnpm scripts behave the
 * same under cmd.exe, PowerShell and bash. Only ever re-run to SHRINK the list.
 * Used by `lint:icons:baseline` (via gen-icon-baseline.cjs) and `lint:legacy-ui:baseline`.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const flags = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const i = a.indexOf('=');
    return [a.slice(2, i < 0 ? undefined : i), i < 0 ? '' : a.slice(i + 1)];
  }),
);
const [ruleId, outFile, title] = positional;
if (!ruleId || !outFile || !title) {
  console.error('usage: node scripts/gen-rule-baseline.cjs <ruleId> <outFile> <title> [--script= --what= --note= --fixed= --slug=]');
  process.exit(2);
}
const slug = flags.slug || ruleId.replace(/^.*\//, '').replace(/^no-/, '');
const script = flags.script || 'lint';
const what = flags.what || 'violated it';
const fixed = flags.fixed || 'its violations are fixed';

const eslintBin = path.join(path.dirname(require.resolve('eslint')), '..', 'bin', 'eslint.js');
const run = spawnSync(process.execPath, [eslintBin, 'src', '--ext', 'ts,tsx', '-f', 'json'], {
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 512,
});
if (!run.stdout) {
  console.error(run.stderr || 'eslint produced no output');
  process.exit(1);
}
const r = JSON.parse(run.stdout);
const legacy = new Set();
for (const f of r) {
  if (!f.messages.some((m) => m.ruleId === ruleId)) continue;
  const p = f.filePath.split(String.fromCharCode(92)).join('/');
  const i = p.lastIndexOf('/src/');
  legacy.add(i >= 0 ? p.slice(i + 1) : p);
}
const list = [...legacy].sort();
const out =
  '/* AUTO-GENERATED ' + title + ' baseline — do not hand-edit; regenerate with `pnpm run ' + script + '`.\n' +
  ' *\n' +
  ' * THE RATCHET: these files already ' + what + ' when `' + ruleId + '` landed.\n' +
  ' * They warn; ANY file NOT listed here fails hard. New code cannot regress, and this list can\n' +
  ' * only shrink.' + (flags.note ? ' ' + flags.note : '') + '\n' +
  ' *\n' +
  ' * Burn-down: ' + list.length + ' files at baseline. Delete a path once ' + fixed + '.\n' +
  ' */\n' +
  'module.exports = ' + JSON.stringify(list.length ? list : ['src/__no-file-has-' + slug + '__.ts'], null, 2) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', outFile), out);
console.log(title + ' baseline files:', list.length);
