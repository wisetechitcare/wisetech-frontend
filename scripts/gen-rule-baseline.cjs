/* Generic ratchet-baseline generator.
 *
 *   node scripts/gen-rule-baseline.cjs <ruleId> <outFile> <title> [--script=<pnpm script>] [--what=<text>]
 *                                      [--note=<text>] [--fixed=<text>] [--slug=<name>] [--grow]
 *
 * Lints src/ with the repo's ESLint config and writes <outFile> (relative to the repo root) listing every
 * file that reports <ruleId>. Runs eslint itself (no shell `;`/`>`/`rm`), so the pnpm scripts behave the
 * same under cmd.exe, PowerShell and bash.
 *
 * SHRINK-ONLY: the fresh list is intersected with the existing <outFile>, so a re-run can only REMOVE files;
 * any file that now reports the rule but is not already listed is refused and printed. Pass `--grow` to
 * keep the old behaviour (write whatever the lint reports) when growth is genuinely intended.
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
const grow = 'grow' in flags;
const outPath = path.join(__dirname, '..', outFile);
let existing = null;
try {
  existing = new Set(require(outPath));
} catch {
  existing = null; // first generation: nothing to protect yet
}
const refused = grow || !existing ? [] : [...legacy].filter((p) => !existing.has(p)).sort();
const list = [...legacy].filter((p) => grow || !existing || existing.has(p)).sort();
if (refused.length) {
  console.error(
    'REFUSED to add ' + refused.length + ' file(s) to ' + outFile + ' (the baseline only shrinks; fix them or pass --grow):\n  ' +
      refused.join('\n  '),
  );
}
const out =
  '/* AUTO-GENERATED ' + title + ' baseline — do not hand-edit; regenerate with `pnpm run ' + script + '`.\n' +
  ' *\n' +
  ' * THE RATCHET: these files already ' + what + ' when `' + ruleId + '` landed.\n' +
  ' * They warn; ANY file NOT listed here fails hard. New code cannot regress, and this list can\n' +
  ' * only shrink: regenerating refuses to add a file (growth requires an explicit `--grow`).' + (flags.note ? ' ' + flags.note : '') + '\n' +
  ' *\n' +
  ' * Burn-down: ' + list.length + ' files at baseline. Delete a path once ' + fixed + '.\n' +
  ' */\n' +
  'module.exports = ' + JSON.stringify(list.length ? list : ['src/__no-file-has-' + slug + '__.ts'], null, 2) + ';\n';
fs.writeFileSync(outPath, out);
console.log(title + ' baseline files:', list.length);
if (refused.length) process.exitCode = 1;
