/* Lints src/ with wisetech/no-legacy-icons and writes .eslint-icon-baseline.cjs (the icon ratchet list).
 * Runs eslint itself (no shell `;`/`>`/`rm`), so `pnpm run lint:icons:baseline` behaves the same under
 * cmd.exe, PowerShell and bash. Only ever re-run to SHRINK the list. */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
  if (!f.messages.some((m) => m.ruleId === 'wisetech/no-legacy-icons')) continue;
  const p = f.filePath.split(String.fromCharCode(92)).join('/');
  const i = p.lastIndexOf('/src/');
  legacy.add(i >= 0 ? p.slice(i + 1) : p);
}
const list = [...legacy].sort();
const out =
  '/* AUTO-GENERATED icon baseline — do not hand-edit; regenerate with `pnpm run lint:icons:baseline`.\n' +
  ' *\n' +
  ' * THE RATCHET: these files already used a legacy icon form (KTIcon, AppIcon, bi-/fa-/la-/ki-\n' +
  ' * classes, @mui/icons-material, other icon libraries) when `wisetech/no-legacy-icons` landed.\n' +
  ' * They warn; ANY file NOT listed here fails hard. New code cannot regress, and this list can\n' +
  ' * only shrink. Separate from .eslint-ui-baseline.cjs on purpose (that list carries unrelated bans).\n' +
  ' *\n' +
  ' * Burn-down: ' + list.length + ' files at baseline. Delete a path once its icons are converted.\n' +
  ' */\n' +
  'module.exports = ' + JSON.stringify(list.length ? list : ['src/__no-file-has-legacy-icons__.ts'], null, 2) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', '.eslint-icon-baseline.cjs'), out);
console.log('icon baseline files:', list.length);
