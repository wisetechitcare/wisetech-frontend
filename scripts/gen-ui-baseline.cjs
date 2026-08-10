/* Reads eslint JSON on stdin and writes .eslint-ui-baseline.cjs (the ratchet list). */
const fs = require('fs');
let d = '';
process.stdin.on('data', (c) => (d += c)).on('end', () => {
  const r = JSON.parse(d);
  const legacy = new Set();
  for (const f of r) {
    for (const m of f.messages) {
      if (m.ruleId !== 'no-restricted-syntax') continue;
      // Only the high-debt classes get baselined; the primitives stay hard errors everywhere.
      if (!/Bootstrap component classes|No <style> blocks|toLocaleDateString/.test(m.message)) continue;
      const p = f.filePath.split('\\').join('/');
      const i = p.lastIndexOf('/src/');
      legacy.add(i >= 0 ? p.slice(i + 1) : p);
    }
  }
  const list = [...legacy].sort();
  const out =
    '/* AUTO-GENERATED UI baseline — do not hand-edit; regenerate with `pnpm run lint:ui:baseline`.\n' +
    ' *\n' +
    ' * THE RATCHET: these files already contained banned Bootstrap component classes, <style>\n' +
    ' * blocks, or toLocaleDateString when the design-system rules landed. They are downgraded to\n' +
    ' * warnings so the build stays green — while ANY file NOT listed here fails hard on the same\n' +
    ' * violation. New code therefore cannot regress, and this list can only shrink.\n' +
    ' *\n' +
    ' * Burn-down: ' + list.length + ' files at baseline. Delete a path once its violations are fixed.\n' +
    ' */\n' +
    'module.exports = ' + JSON.stringify(list, null, 2) + ';\n';
  fs.writeFileSync('.eslint-ui-baseline.cjs', out);
  console.log('baseline files:', list.length);
});
